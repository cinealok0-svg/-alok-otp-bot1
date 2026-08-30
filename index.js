/**
 * AlokMail Pro — Minimal Temp Mail & Persistent Vault
 * Platform: Cloudflare Workers
 * Requirement: Bind a KV Namespace named "ALOK_KV" for permanent storage.
 */

const DOMAINS = [
  'sharklasers.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'spam4.me',
  'pokemail.net',
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

export default {
  async fetch(request, env, ctx) {
    if (!env.BOT_TOKEN || !env.OWNER_ID) {
      return new Response("Error: BOT_TOKEN or OWNER_ID not set.", { status: 500 });
    }
    if (request.method !== "POST") {
      return new Response("⚡ AlokMail Pro Minimal Engine Running.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= PERMANENT KV STORAGE LOGIC =================
// If KV is not bound, it falls back to temporary memory (which resets).
let MEMORY_VAULT = [];
let MEMORY_STATE = new Map();

async function getVault(env) {
  if (env.ALOK_KV) {
    const data = await env.ALOK_KV.get("SAVED_ACCOUNTS");
    return data ? JSON.parse(data) : [];
  }
  return MEMORY_VAULT;
}

async function saveVault(env, vaultData) {
  if (env.ALOK_KV) {
    await env.ALOK_KV.put("SAVED_ACCOUNTS", JSON.stringify(vaultData));
  }
  MEMORY_VAULT = vaultData;
}

async function getUserState(env, userId) {
  if (env.ALOK_KV) {
    const state = await env.ALOK_KV.get(`STATE_${userId}`);
    return state || null;
  }
  return MEMORY_STATE.get(userId) || null;
}

async function setUserState(env, userId, state) {
  if (env.ALOK_KV) {
    if (state) {
      await env.ALOK_KV.put(`STATE_${userId}`, state, { expirationTtl: 300 }); // Expires in 5 mins
    } else {
      await env.ALOK_KV.delete(`STATE_${userId}`);
    }
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
    return { username: parts[0], password: parts[1], extra: parts[2] || '' };
  }
  return null;
}

// ================= MAIL ENGINE =================
async function createFastMailbox(domainChoice = null) {
  const user = getRandomUser();
  const domain = domainChoice || DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const isGuerrilla = !domain.includes('1secmail');

  if (isGuerrilla) {
    try {
      const initRes = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
      const initData = await initRes.json();
      const sid = initData.sid_token;
      const setRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`);
      const setData = await setRes.json();
      return { type: 'g', email: (setData.email_addr || `${user}@${domain}`).toLowerCase(), user, domain, sid };
    } catch (e) {
      return { type: 's', email: `${user}@1secmail.com`, user, domain: '1secmail.com', sid: '0' };
    }
  } else {
    return { type: 's', email: `${user}@${domain}`, user, domain, sid: '0' };
  }
}

async function fetchFastMessages(type, user, domain, sid) {
  if (type === 'g' && sid !== '0') {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`);
      const data = await res.json();
      return (data.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com').map(m => ({ id: m.mail_id }));
    } catch (e) { return []; }
  } else {
    try {
      const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      return await res.json();
    } catch (e) { return []; }
  }
}

async function fetchFastDetail(type, user, domain, sid, id) {
  if (type === 'g' && sid !== '0') {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${sid}`);
      const mail = await res.json();
      return { from: mail.mail_from || 'Unknown', subject: mail.mail_subject || '', body: mail.mail_body || '' };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  } else {
    try {
      const res = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(id)}`);
      const mail = await res.json();
      return { from: mail.from || 'Unknown', subject: mail.subject || '', body: mail.textBody || mail.htmlBody || '' };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  }
}

// ================= TELEGRAM ROUTER =================
async function handleTelegramUpdate(update, env) {
  const telegramApi = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
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

  const isAdmin = userId === env.OWNER_ID;
  const userState = await getUserState(env, userId);

  // 1. Save Text Accounts (Admin)
  if (text && userState === 'awaiting_save' && isAdmin) {
    await setUserState(env, userId, null);
    const lines = text.split(/\r?\n/);
    const added = lines.map(parseAccountLine).filter(Boolean);
    
    if (added.length > 0) {
      let currentVault = await getVault(env);
      currentVault = [...added, ...currentVault];
      await saveVault(env, currentVault);
      return send(chatId, `✅ <b>Success!</b> <code>${added.length}</code> Accounts saved to Vault.`, telegramApi, {
        inline_keyboard: [[{ text: "📦 Open Vault", callback_data: "vault_hub" }]]
      });
    } else {
      return send(chatId, `❌ <i>Invalid format. Please use Email:Password</i>`, telegramApi);
    }
  }

  // 2. Main Menu
  if (text === "/start" || data === "home") {
    await setUserState(env, userId, null);

    let welcome = 
      `🛡️ <b>ALOKMAIL PRO — TEMP MAIL & VAULT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Generate unlimited temporary emails, bypass OTP verifications, and securely store your accounts.\n\n`;

    const rows = [
      [{ text: "⚡ Generate Free Temp Mail", callback_data: "gen" }],
      [{ text: "🌐 Switch Domain", callback_data: "domains" }]
    ];

    if (isAdmin) {
      const vaultData = await getVault(env);
      const storageWarning = env.ALOK_KV ? "🟢 Persistent (KV)" : "🔴 Memory Only (Will Reset)";
      welcome += `👑 <b>Admin Stats:</b>\n• Total Saved IDs: <code>${vaultData.length}</code>\n• Storage Status: ${storageWarning}\n\n`;
      rows.push([{ text: "📦 Secure Account Vault", callback_data: "vault_hub" }]);
    }

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, welcome, telegramApi, kb) : send(chatId, welcome, telegramApi, kb);
  }

  // 3. Vault Hub
  if (data === "vault_hub" && isAdmin) {
    const vaultData = await getVault(env);
    const vText = 
      `📦 <b>SECURE ACCOUNT VAULT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Stock:</b> <code>${vaultData.length}</code>\n\n` +
      `<i>Your accounts are safely stored here. Extract them whenever needed.</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get 1 Fresh Account", callback_data: "vault_get" }],
        [{ text: "➕ Add New Accounts", callback_data: "vault_add" }],
        [{ text: "🏠 Return to Menu", callback_data: "home" }]
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
    let vaultData = await getVault(env);
    if (vaultData.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Vault is Empty!</b>\nPlease add accounts first.`, telegramApi, {
        inline_keyboard: [[{ text: "➕ Add Accounts", callback_data: "vault_add" }, { text: "🏠 Back", callback_data: "home" }]]
      });
    }

    const acc = vaultData.shift();
    await saveVault(env, vaultData); // Update vault after removing the extracted account

    const card = 
      `🪪 <b>EXTRACTED ACCOUNT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 <b>Email/User:</b>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b>\n<code>${acc.password}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      (acc.extra ? `ℹ️ <b>Extra Details:</b> <code>${acc.extra}</code>\n\n` : '') +
      `📉 <i>Remaining in Vault: ${vaultData.length}</i>`;

    return edit(chatId, messageId, card, telegramApi, {
      inline_keyboard: [
        [{ text: "⚡ Get Next Account", callback_data: "vault_get" }],
        [{ text: "📦 Return to Vault", callback_data: "vault_hub" }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    });
  }

  // 4. Temp Mail Generation
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createFastMailbox(domainChoice);

    const out = 
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n` +
      `<code>${mb.email}</code>\n\n` +
      `📡 <b>Server:</b> <code>${mb.domain}</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening for OTPs...</i>`;

    const token = `${mb.type}:${mb.user}:${mb.domain}:${mb.sid}`;
    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk:${token}` }],
        [{ text: "🔄 Refresh", callback_data: `chk:${token}` }, { text: "⚡ New Mail", callback_data: "gen" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    });
  }

  // 5. Temp Mail Inbox Checker
  if (data && data.startsWith("chk:")) {
    const parts = data.split(":");
    const type = parts[1], user = parts[2], domain = parts[3], sid = parts[4];
    const activeEmail = `${user}@${domain}`;
    const token = `${type}:${user}:${domain}:${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${activeEmail}</code>\n\n<i>No messages received yet. Tap Refresh below:</i>`, telegramApi, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: `chk:${token}` }],
          [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Menu", callback_data: "home" }]
        ]
      });
    }

    let report = `📬 <b>INBOX RECEIVED (${list.length})</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${activeEmail}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);
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
    for (let i = 0; i < DOMAINS.length; i += 2) {
      const row = [{ text: `@${DOMAINS[i]}`, callback_data: `dgen_${DOMAINS[i]}` }];
      if (DOMAINS[i + 1]) row.push({ text: `@${DOMAINS[i + 1]}`, callback_data: `dgen_${DOMAINS[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home Menu", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain:</b>`, telegramApi, { inline_keyboard: rows });
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
