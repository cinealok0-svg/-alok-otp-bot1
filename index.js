/**
 * AlokMail Pro — 100% Fixed Ultra-Fast Edition
 * Platform: Cloudflare Workers
 * Storage: ALOK_KV
 */

const CONFIG = {
  BOT_TOKEN: "8759442095:AAEgYEEvhaXf3fMt4Vxa7Kobk07UeWFszuk",
  OWNER_ID: "8452322818"
};

const DOMAIN_LIST = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.net',
  'spam4.me',
  'mail.cx',
  'uqu.me',
  'tempmail.cx'
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ AlokMail Pro is Running 24/7.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= STORAGE ENGINE =================
let RAM_VAULT = { fresh: [], used: [] };
let RAM_STATE = new Map();

async function getVault(env) {
  if (env.ALOK_KV) {
    const raw = await env.ALOK_KV.get("ALOK_VAULT_PRO_FINAL");
    return raw ? JSON.parse(raw) : { fresh: [], used: [] };
  }
  return RAM_VAULT;
}

async function saveVault(env, vault) {
  if (env.ALOK_KV) {
    await env.ALOK_KV.put("ALOK_VAULT_PRO_FINAL", JSON.stringify(vault));
  }
  RAM_VAULT = vault;
}

async function getUserState(env, userId) {
  if (env.ALOK_KV) {
    return await env.ALOK_KV.get(`STATE_${userId}`) || null;
  }
  return RAM_STATE.get(userId) || null;
}

async function setUserState(env, userId, state) {
  if (env.ALOK_KV) {
    if (state) await env.ALOK_KV.put(`STATE_${userId}`, state, { expirationTtl: 300 });
    else await env.ALOK_KV.delete(`STATE_${userId}`);
  } else {
    if (state) RAM_STATE.set(userId, state);
    else RAM_STATE.delete(userId);
  }
}

// ================= HELPERS =================
function getRandomUser() {
  const chars = 'abcdefghjkmnpqrstuvwxyz';
  let name = '';
  for (let i = 0; i < 5; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return `${name}${Math.floor(1000 + Math.random() * 9000)}`;
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const match = clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) || clean.match(/\b\d{6,8}\b/) || clean.match(/\b\d{4}\b/);
  return match ? (match[1] || match[0]) : null;
}

function parseAccountLine(line) {
  line = line.trim();
  if (!line) return null;
  let sep = '|';
  if (!line.includes('|')) {
    if (line.includes(':')) sep = ':';
    else if (line.includes(',')) sep = ',';
  }
  const parts = line.split(sep).map(p => p.trim());
  if (parts.length >= 2) {
    return { username: parts[0], password: parts[1], extra: parts[2] || '', raw: line };
  }
  return null;
}

// ================= FAST MAIL DISPATCHER =================
async function createMailbox(domainChoice = null) {
  const user = getRandomUser();
  const domain = domainChoice || DOMAIN_LIST[Math.floor(Math.random() * DOMAIN_LIST.length)];
  const isMailcx = domain.includes('mail.cx') || domain.includes('uqu.me') || domain.includes('tempmail.cx');

  if (isMailcx) {
    return { isCx: '1', email: `${user}@${domain}`, sid: '0' };
  } else {
    try {
      const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
      const sid = init.sid_token || '';
      const setRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`).then(r => r.json());
      return { isCx: '0', email: (setRes.email_addr || `${user}@${domain}`).toLowerCase(), sid };
    } catch (e) {
      return { isCx: '1', email: `${user}@mail.cx`, sid: '0' };
    }
  }
}

async function fetchMessages(isCx, email, sid) {
  if (isCx === '1') {
    try {
      const res = await fetch(`https://api.mail.cx/v1/inbox/${encodeURIComponent(email)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.emails || []).map(m => ({ id: m.id || m.uid }));
    } catch (e) { return []; }
  } else {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
      return (res.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com').map(m => ({ id: m.mail_id }));
    } catch (e) { return []; }
  }
}

async function fetchDetail(isCx, email, sid, mailId) {
  if (isCx === '1') {
    try {
      const res = await fetch(`https://api.mail.cx/v1/email/${mailId}`);
      if (!res.ok) return { from: 'Unknown', subject: '', body: '' };
      const data = await res.json();
      return {
        from: data.from_email || data.from || 'Unknown',
        subject: data.subject || '(No Subject)',
        body: data.text || data.html || data.preview_text || ''
      };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  } else {
    try {
      const data = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sid}`).then(r => r.json());
      return {
        from: data.mail_from || 'Unknown',
        subject: data.mail_subject || '(No Subject)',
        body: data.mail_body || ''
      };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  }
}

// ================= TELEGRAM ROUTER =================
async function handleTelegramUpdate(update, env) {
  const telegramApi = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;
  const userId = String(msg?.from?.id || cb?.from?.id || "");

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id }) }).catch(() => {});
  }

  const isAdmin = userId === CONFIG.OWNER_ID;
  const userState = await getUserState(env, userId);

  // 1. Text Save Accounts
  if (text && userState === 'awaiting_save' && isAdmin) {
    await setUserState(env, userId, null);
    const lines = text.split(/\r?\n/);
    const added = lines.map(parseAccountLine).filter(Boolean);

    if (added.length > 0) {
      let vault = await getVault(env);
      vault.fresh = [...added, ...vault.fresh];
      await saveVault(env, vault);
      return send(chatId, `✅ <b>Success!</b> <code>${added.length}</code> Accounts saved to Fresh Vault.`, telegramApi, {
        inline_keyboard: [[{ text: "📦 Open Vault", callback_data: "vault_hub" }]]
      });
    } else {
      return send(chatId, `❌ <i>Invalid format. Please use Email:Password</i>`, telegramApi);
    }
  }

  // 2. Main Dashboard
  if (text === "/start" || data === "home") {
    await setUserState(env, userId, null);

    let card = 
      `🛡️ <b>ALOKMAIL PRO — DASHBOARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Ultra-fast disposable email generator & permanent account storage.\n\n`;

    const rows = [
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
      [{ text: "🌐 Switch Domain", callback_data: "domains" }]
    ];

    if (isAdmin) {
      const vault = await getVault(env);
      card += 
        `👑 <b>Vault Status:</b>\n` +
        `• Database: 🟢 <b>ALOK_KV Connected</b>\n` +
        `• 🟢 Fresh Stock: <code>${vault.fresh.length}</code> IDs\n` +
        `• 📁 Used Archive: <code>${vault.used.length}</code> IDs\n\n`;
      rows.push([{ text: "📦 Secure Account Vault & Manager", callback_data: "vault_hub" }]);
    }

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, card, telegramApi, kb) : send(chatId, card, telegramApi, kb);
  }

  // 3. Vault Hub
  if (data === "vault_hub" && isAdmin) {
    const vault = await getVault(env);
    const vText = 
      `📦 <b>SECURE ACCOUNT VAULT MANAGER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• 🟢 <b>Fresh Stock:</b> <code>${vault.fresh.length}</code> IDs\n` +
      `• 📁 <b>Used Archive:</b> <code>${vault.used.length}</code> IDs\n\n` +
      `<i>Extracted accounts automatically move to the archive so they are never reused.</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get 1 Fresh Account", callback_data: "vault_get" }],
        [{ text: "➕ Add New Accounts", callback_data: "vault_add" }],
        [{ text: "📁 Download Used IDs (.txt)", callback_data: "vault_export" }],
        [{ text: "🏠 Return to Dashboard", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, vText, telegramApi, kb);
  }

  if (data === "vault_add" && isAdmin) {
    await setUserState(env, userId, 'awaiting_save');
    return edit(chatId, messageId, `💾 <b>Send credentials in this format:</b>\n\n<code>email@domain.com:password123</code>\n\n<i>You can send multiple accounts on separate lines.</i>`, telegramApi, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "vault_hub" }]]
    });
  }

  if (data === "vault_get" && isAdmin) {
    let vault = await getVault(env);
    if (vault.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Vault is Empty!</b>\nPlease add fresh accounts first.`, telegramApi, {
        inline_keyboard: [
          [{ text: "➕ Add Accounts", callback_data: "vault_add" }],
          [{ text: "📦 Vault Hub", callback_data: "vault_hub" }]
        ]
      });
    }

    const acc = vault.fresh.shift();
    vault.used.unshift(acc);
    await saveVault(env, vault);

    const card = 
      `🪪 <b>EXTRACTED FRESH ACCOUNT</b>\n` +
      `┌──────────────────────────\n` +
      `📧 <b>Email:</b> <i>(Tap to copy)</i>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b> <i>(Tap to copy)</i>\n<code>${acc.password}</code>\n` +
      (acc.extra ? `\nℹ️ <b>Details:</b> <code>${acc.extra}</code>\n` : '') +
      `└──────────────────────────\n` +
      `📉 <i>Remaining Fresh: ${vault.fresh.length} | Archived Used: ${vault.used.length}</i>`;

    return edit(chatId, messageId, card, telegramApi, {
      inline_keyboard: [
        [{ text: "⚡ Get Next Fresh ID", callback_data: "vault_get" }],
        [{ text: "📦 Return to Vault Hub", callback_data: "vault_hub" }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    });
  }

  if (data === "vault_export" && isAdmin) {
    const vault = await getVault(env);
    if (vault.used.length === 0) {
      return edit(chatId, messageId, `⚠️ <i>No used accounts in archive to download.</i>`, telegramApi, {
        inline_keyboard: [[{ text: "📦 Back to Vault", callback_data: "vault_hub" }]]
      });
    }
    const fileContent = vault.used.map(a => a.raw || `${a.username}:${a.password}`).join("\n");
    return sendDocument(chatId, fileContent, "used_accounts_archive.txt", `📁 Used Accounts Archive (${vault.used.length} IDs)`, telegramApi);
  }

  // 4. Generate Temp Mail
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createMailbox(domainChoice);

    // Ultra-compact callback token format: `t:isCx:email:sid`
    const token = `t:${mb.isCx}:${mb.email}:${mb.sid}`;
    const domainName = mb.email.split('@')[1];

    const out = 
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n` +
      `<code>${mb.email}</code>\n\n` +
      `📡 <b>Active Server:</b> <code>${domainName}</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening for OTPs...</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: token }],
        [{ text: "🔄 Refresh", callback_data: token }, { text: "⚡ New Mail", callback_data: "gen" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }, { text: "🏠 Dashboard", callback_data: "home" }]
      ]
    });
  }

  // 5. Check Inbox
  if (data && data.startsWith("t:")) {
    const parts = data.split(":");
    const isCx = parts[1];
    const email = parts[2];
    const sid = parts[3] || '0';

    const list = await fetchMessages(isCx, email, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${email}</code>\n\n<i>No messages received yet. Tap Refresh below:</i>`, telegramApi, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: data }],
          [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Dashboard", callback_data: "home" }]
        ]
      });
    }

    let report = `📬 <b>INBOX RECEIVED (${list.length})</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${email}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mail = await fetchDetail(isCx, email, sid, m.id);
      const fullText = (mail.subject || "") + " " + (mail.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 <b>From:</b> <code>${(mail.from || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${(mail.subject || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</i>\n`;
      if (otp) report += `🔑 <b>DETECTED OTP:</b> <code>${otp}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [[{ text: "🔄 Refresh Inbox", callback_data: data }]];
    if (detectedOtp) kbRows.unshift([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }]);
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Dashboard", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // 6. Domains Menu
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: `@${DOMAIN_LIST[i]}`, callback_data: `dgen_${DOMAIN_LIST[i]}` }];
      if (DOMAIN_LIST[i + 1]) row.push({ text: `@${DOMAIN_LIST[i + 1]}`, callback_data: `dgen_${DOMAIN_LIST[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Return to Dashboard", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain:</b>`, telegramApi, { inline_keyboard: rows });
  }
}

async function send(chatId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  return fetch(`${telegramApi}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, message_id: msgId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) return send(chatId, text, telegramApi, kb);
  return res;
}

async function sendDocument(chatId, content, filename, caption, telegramApi) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");
  formData.append("document", new Blob([content], { type: "text/plain" }), filename);
  return fetch(`${telegramApi}/sendDocument`, { method: "POST", body: formData });
}
