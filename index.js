/**
 * AlokMail Pro — Professional Edition with mail.cx API & Permanent KV Storage
 * Requirement: KV Namespace bound as "ALOK_KV"
 */

// ================= HARDCODED CONFIGURATION =================
const CONFIG = {
  BOT_TOKEN: "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI",
  OWNER_ID: "8452322818"
};
// ===========================================================

// mail.cx system domains & popular aliases
const MAIL_DOMAINS = [
  'uqu.me',
  'mail.cx',
  'tempmail.cx'
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ AlokMail Pro (mail.cx Engine) Running.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= PERMANENT KV STORAGE LOGIC =================
let MEMORY_VAULT = { fresh: [], used: [] };
let MEMORY_STATE = new Map();

async function getVault(env) {
  if (env.ALOK_KV) {
    const data = await env.ALOK_KV.get("ALOK_VAULT_MAILCX");
    return data ? JSON.parse(data) : { fresh: [], used: [] };
  }
  return MEMORY_VAULT;
}

async function saveVault(env, vaultData) {
  if (env.ALOK_KV) {
    await env.ALOK_KV.put("ALOK_VAULT_MAILCX", JSON.stringify(vaultData));
  }
  MEMORY_VAULT = vaultData;
}

async function getUserState(env, userId) {
  if (env.ALOK_KV) {
    return await env.ALOK_KV.get(`STATE_${userId}`) || null;
  }
  return MEMORY_STATE.get(userId) || null;
}

async function setUserState(env, userId, state) {
  if (env.ALOK_KV) {
    if (state) await env.ALOK_KV.put(`STATE_${userId}`, state, { expirationTtl: 300 });
    else await env.ALOK_KV.delete(`STATE_${userId}`);
  } else {
    if (state) MEMORY_STATE.set(userId, state);
    else MEMORY_STATE.delete(userId);
  }
}

// ================= HELPER FUNCTIONS =================
function getRandomUser() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let name = '';
  for(let i=0; i<6; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return `${name}${Math.floor(1000 + Math.random() * 9000)}`;
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ');
  const match = clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) || clean.match(/\b\d{4,8}\b/);
  return match ? (match[1] || match[0]) : null;
}

function parseAccountLine(line) {
  line = line.trim();
  if (!line) return null;
  let delimiter = '|';
  if (!line.includes('|')) {
    if (line.includes(':')) delimiter = ':';
    else if (line.includes(',')) delimiter = ',';
  }
  const parts = line.split(delimiter).map(p => p.trim());
  if (parts.length >= 2) {
    return { username: parts[0], password: parts[1], extra: parts[2] || '', raw: line };
  }
  return null;
}

// ================= MAIL.CX API ENGINE =================
async function createMailcxBox(domainChoice = null) {
  const user = getRandomUser();
  const domain = domainChoice || MAIL_DOMAINS[Math.floor(Math.random() * MAIL_DOMAINS.length)];
  const email = `${user}@${domain}`;
  return { email, user, domain };
}

async function fetchMailcxMessages(email) {
  try {
    // Using mail.cx public inbox endpoint (free, unlimited)
    const res = await fetch(`https://api.mail.cx/v1/inbox/${email}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.emails || [];
  } catch (e) {
    return [];
  }
}

async function fetchMailcxDetail(email, emailId) {
  try {
    const res = await fetch(`https://api.mail.cx/v1/email/${emailId}`);
    if (!res.ok) return { from: 'Unknown', subject: '', body: '' };
    const mail = await res.json();
    return {
      from: mail.from_email || mail.from || 'Unknown',
      subject: mail.subject || '(No Subject)',
      body: mail.text || mail.html || mail.preview_text || ''
    };
  } catch (e) {
    return { from: 'Unknown', subject: '', body: '' };
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

  // 1. Save Text Accounts (Admin)
  if (text && userState === 'awaiting_save' && isAdmin) {
    await setUserState(env, userId, null);
    const lines = text.split(/\r?\n/);
    const added = lines.map(parseAccountLine).filter(Boolean);
    
    if (added.length > 0) {
      let vault = await getVault(env);
      vault.fresh = [...added, ...vault.fresh];
      await saveVault(env, vault);
      return send(chatId, `✅ <b>Success!</b> <code>${added.length}</code> accounts securely stored in Fresh Vault.`, telegramApi, {
        inline_keyboard: [[{ text: "📦 Open Account Vault", callback_data: "vault_hub" }]]
      });
    } else {
      return send(chatId, `❌ <i>Invalid format. Please use Email:Password</i>`, telegramApi);
    }
  }

  // 2. Main Menu
  if (text === "/start" || data === "home") {
    await setUserState(env, userId, null);
    
    let welcome = 
      `🛡️ <b>ALOKMAIL PRO — mail.cx EDITION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `High-speed temporary email generator (Powered by mail.cx) & permanent secure vault.\n\n`;

    const rows = [
      [{ text: "⚡ Generate mail.cx Temp Mail", callback_data: "gen" }],
      [{ text: "🌐 Switch Domain", callback_data: "domains" }]
    ];

    if (isAdmin) {
      const vault = await getVault(env);
      welcome += 
        `👑 <b>Vault Status:</b>\n` +
        `• Database: 🟢 <b>Permanent KV Online</b>\n` +
        `• 🟢 Fresh Stock: <code>${vault.fresh.length}</code> IDs\n` +
        `• 📁 Used Archive: <code>${vault.used.length}</code> IDs\n\n`;
      rows.push([{ text: "📦 Secure Account Vault & Manager", callback_data: "vault_hub" }]);
    }

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, welcome, telegramApi, kb) : send(chatId, welcome, telegramApi, kb);
  }

  // 3. Vault Hub
  if (data === "vault_hub" && isAdmin) {
    const vault = await getVault(env);
    const vText = 
      `📦 <b>SECURE ACCOUNT VAULT MANAGER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• 🟢 <b>Fresh Ready Stock:</b> <code>${vault.fresh.length}</code> IDs\n` +
      `• 📁 <b>Used / Extracted Archive:</b> <code>${vault.used.length}</code> IDs\n\n` +
      `<i>Fresh IDs are safe. Once extracted, they automatically move to the Used section so they are never repeated.</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get 1 Fresh Account", callback_data: "vault_get" }],
        [{ text: "➕ Add New Accounts", callback_data: "vault_add" }],
        [{ text: "📁 Download Used IDs (.txt)", callback_data: "vault_export" }],
        [{ text: "🏠 Return to Home Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, vText, telegramApi, kb);
  }

  if (data === "vault_add" && isAdmin) {
    await setUserState(env, userId, 'awaiting_save');
    return edit(chatId, messageId, `💾 <b>Send credentials in this format:</b>\n\n<code>email@domain.com:password123</code>\n\n<i>You can send multiple accounts by putting each on a new line.</i>`, telegramApi, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "vault_hub" }]]
    });
  }

  if (data === "vault_get" && isAdmin) {
    let vault = await getVault(env);
    if (vault.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Fresh Vault is Empty!</b>\nPlease add new accounts first.`, telegramApi, {
        inline_keyboard: [
          [{ text: "➕ Add Accounts", callback_data: "vault_add" }],
          [{ text: "📦 Vault Hub", callback_data: "vault_hub" }]
        ]
      });
    }

    const acc = vault.fresh.shift(); // Pull from fresh
    vault.used.unshift(acc);         // Push to used archive
    await saveVault(env, vault);

    const card = 
      `🪪 <b>EXTRACTED FRESH ACCOUNT</b>\n` +
      `┌──────────────────────────\n` +
      `📧 <b>Email:</b>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b>\n<code>${acc.password}</code>\n` +
      (acc.extra ? `ℹ️ <b>Details:</b> <code>${acc.extra}</code>\n` : '') +
      `└──────────────────────────\n` +
      `📉 <i>Fresh Remaining: ${vault.fresh.length} | Archived Used: ${vault.used.length}</i>`;

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

  // 4. Temp Mail Generation (mail.cx)
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createMailcxBox(domainChoice);

    const out = 
      `📬 <b>mail.cx TEMPORARY EMAIL</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n` +
      `<code>${mb.email}</code>\n\n` +
      `📡 <b>Active Domain:</b> <code>${mb.domain}</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening via mail.cx API...</i>`;

    const token = encodeURIComponent(mb.email);
    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk:${token}` }],
        [{ text: "🔄 Refresh", callback_data: `chk:${token}` }, { text: "⚡ New Mail", callback_data: "gen" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    });
  }

  // 5. Temp Mail Inbox Checker (mail.cx)
  if (data && data.startsWith("chk:")) {
    const email = decodeURIComponent(data.replace("chk:", ""));
    const token = encodeURIComponent(email);

    const list = await fetchMailcxMessages(email);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${email}</code>\n\n<i>No messages received yet. Tap Refresh below:</i>`, telegramApi, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: `chk:${token}` }],
          [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Menu", callback_data: "home" }]
        ]
      });
    }

    let report = `📬 <b>INBOX RECEIVED (${list.length})</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${email}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mailDetails = await fetchMailcxDetail(email, m.id || m.uid);
      const fullText = (mailDetails.subject || "") + " " + (mailDetails.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 <b>From:</b> <code>${(mailDetails.from || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${(mailDetails.subject || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</i>\n`;
      if (otp) report += `🔑 <b>DETECTED OTP:</b> <code>${otp}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [[{ text: "🔄 Refresh Inbox", callback_data: `chk:${token}` }]];
    if (detectedOtp) kbRows.unshift([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }]);
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Menu", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // 6. Domains Menu
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < MAIL_DOMAINS.length; i += 2) {
      const row = [{ text: `@${MAIL_DOMAINS[i]}`, callback_data: `dgen_${MAIL_DOMAINS[i]}` }];
      if (MAIL_DOMAINS[i + 1]) row.push({ text: `@${MAIL_DOMAINS[i + 1]}`, callback_data: `dgen_${MAIL_DOMAINS[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home Menu", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select mail.cx Domain:</b>`, telegramApi, { inline_keyboard: rows });
  }
}

async function send(chatId, text, telegramApi, kb = null) {
  const p = { chat_id: chatId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  return fetch(`${telegramApi}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const p = { chat_id: chatId, message_id: msgId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
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
