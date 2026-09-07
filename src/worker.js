/**
 * Production Multi-Engine Bot (Complete Unified Edition)
 * - True Background Auto-Push (No manual refreshing needed)
 * - Dual Action: 1-Tap Copy OTP Button + Direct Webmail Link Button
 * - Smart Platform Identifier (Meta, WhatsApp, Google, IG, etc.)
 * - OTP Audit & History (/history)
 * - Global File Search for Old/Used Emails
 * - Accurate Strict Line Sanitizer (Exact Count)
 */

// ================= CONFIGURATION =================
const _d = (s) => atob(s);
const BOT_TOKEN = _d("ODk0MzA3NTcyMDpBQUU0VVJodW4wRFMweWMzOHpVc0hyMUoydEdPM0tpaDNjQQ==");
const OWNER_ID = _d("ODQ1MjMyMjgxOA==");
const DB_CHANNEL_ID = _d("LTEwMDQ0NzQ2NjU5NTY=");
const DONGVAN_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";

const GUERRILLA_DOMAINS = ['guerrillamailblock.com', 'sharklasers.com', 'guerrillamail.com', 'grr.la'];
const SECMAIL_DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net'];

const FIRST_NAMES = ["aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya", "tanya"];
const LAST_NAMES = ["sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor"];

let CACHED_FILE_ID = null;
let CACHED_LINES = null;
const OTP_HISTORY = [];

// ================= HELPERS =================
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getRandomUser() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f}.${l}${Math.floor(10 + Math.random() * 90)}`.toLowerCase();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function recordOtp(email, code, serviceName) {
  const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' });
  OTP_HISTORY.unshift({ email, code, serviceName, time });
  if (OTP_HISTORY.length > 25) OTP_HISTORY.pop();
}

function detectPlatform(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("facebook") || t.includes("meta") || t.includes("fb-")) return { name: "Facebook / Meta", icon: "🌐" };
  if (t.includes("instagram") || t.includes("ig-")) return { name: "Instagram", icon: "📸" };
  if (t.includes("whatsapp")) return { name: "WhatsApp", icon: "💬" };
  if (t.includes("telegram")) return { name: "Telegram", icon: "✈️" };
  if (t.includes("google") || t.includes("gmail") || t.includes("g-")) return { name: "Google", icon: "🔍" };
  if (t.includes("twitter") || t.includes(" x ") || t.includes("x corp")) return { name: "Twitter / X", icon: "🐦" };
  if (t.includes("tiktok")) return { name: "TikTok", icon: "🎵" };
  if (t.includes("microsoft") || t.includes("outlook") || t.includes("hotmail")) return { name: "Microsoft", icon: "🪟" };
  return { name: "Online Service", icon: "📩" };
}

function parseOtpAndLinks(text, email = "") {
  const webLink = email ? `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}` : null;
  if (!text) return { otp: null, link: webLink, service: detectPlatform("") };

  const raw = String(text);
  const clean = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ');

  let match = clean.match(/(?:code|otp|passcode|pin|security code|código)\D{0,15}\b([0-9]{6,8})\b/i) ||
              clean.match(/\b([0-9]{6,8})\b\D{0,15}(?:is your|code|otp)/i) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6})\b/) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{8})\b/);

  if (!match) {
    match = clean.match(/(?:code|otp|passcode|pin)\D{0,15}\b([0-9]{4,5})\b/i) ||
            clean.match(/\b([0-9]{4,5})\b\D{0,15}(?:is your|code|otp)/i) ||
            clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);
  }

  const otp = match ? (match[1] || match[0]) : null;

  let link = null;
  const linkMatch = raw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|auth=)[^\s<>"']*/i);
  if (linkMatch) {
    link = linkMatch[0].replace(/[.,;)]+$/, '');
  } else {
    link = webLink;
  }

  return { otp, link, service: detectPlatform(clean) };
}

function sanitizeLines(raw) {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const valid = [];
  const seen = new Set();

  for (let l of lines) {
    l = l.trim();
    if (l.length > 5 && l.includes("@") && (l.includes("|") || l.includes(":"))) {
      const email = l.split(/[|:]/)[0].trim().toLowerCase();
      if (!seen.has(email)) {
        seen.add(email);
        valid.push(l);
      }
    }
  }
  return valid;
}

// ================= LIVE OTP RETRIEVAL =================
async function fetchAccountOtp(line) {
  if (!line) return { otp: null, link: null, service: null };
  const parts = line.split(/[|:]/);
  const email = parts[0]?.trim();
  const refreshToken = parts[2]?.trim();
  const clientId = parts[3]?.trim() || "9e5f94bc-e8a4-4e73-b8be-63364c29d753";

  // 1. Direct Microsoft Graph Token Exchange
  if (refreshToken) {
    try {
      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'https://graph.microsoft.com/Mail.Read offline_access'
      });

      const tRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.access_token) {
          const mRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=3&$select=subject,bodyPreview,body', {
            headers: { 'Authorization': `Bearer ${tData.access_token}` }
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            for (const item of (mData.value || [])) {
              const content = `${item.subject || ""} ${item.bodyPreview || ""} ${item.body?.content || ""}`;
              const parsed = parseOtpAndLinks(content, email);
              if (parsed.otp) return parsed;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. DongvanFB Authenticated API
  try {
    const endpoints = [
      `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_KEY}&mail=${encodeURIComponent(line.trim())}`,
      `https://api.dongvanfb.com/api/get_code?apikey=${DONGVAN_KEY}&mail=${encodeURIComponent(email)}`,
      `https://dongvanfb.net/read_mail_box/api.php?apikey=${DONGVAN_KEY}&email=${encodeURIComponent(line.trim())}&type=oauth2`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch (e) {}

          const code = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
          if (code) {
            return {
              otp: String(code),
              link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`,
              service: detectPlatform(txt)
            };
          }

          const parsed = parseOtpAndLinks(txt, email);
          if (parsed.otp) return parsed;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null, link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`, service: detectPlatform("") };
}

async function fetchTempMailOtp(email) {
  if (!email) return { otp: null, link: null, service: null };
  const [login, domain] = email.toLowerCase().split('@');

  // Guerrilla
  if (GUERRILLA_DOMAINS.includes(domain)) {
    try {
      const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
      const sid = init.sid_token || '';
      await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(login)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`);
      const list = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
      const mails = (list.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com');
      if (mails.length > 0) {
        const d = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mails[0].mail_id}&sid_token=${sid}`).then(r => r.json());
        const full = `${d.mail_subject || ""} ${d.mail_body || ""}`;
        return parseOtpAndLinks(full, "");
      }
    } catch (e) {}
  }

  // 1secmail
  if (SECMAIL_DOMAINS.includes(domain)) {
    try {
      const s = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`).then(r => r.json());
      if (s && s[0]) {
        const msg = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${s[0].id}`).then(r => r.json());
        const full = `${msg.subject || ""} ${msg.textBody || msg.body || ""}`;
        return parseOtpAndLinks(full, "");
      }
    } catch (e) {}
  }

  return { otp: null, link: null, service: null };
}

// ================= BACKGROUND LISTENERS =================
async function startAutoPushWatcher(chatId, accountData, telegramApi) {
  const email = accountData.split(/[|:]/)[0]?.trim();

  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const { otp, link, service } = await fetchAccountOtp(accountData);

    if (otp) {
      recordOtp(email, otp, service?.name || "Service");

      const alertMsg =
        `🔔 <b>${service?.icon || "🔑"} ${service?.name?.toUpperCase() || "SERVICE"} OTP RECEIVED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche direct button se OTP copy karein ya webmail kholein:</i>`;

      const kb = [
        [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]
      ];
      if (link) kb.push([{ text: "🌐 🔗 Open Webmail / Full Mailbox", url: link }]);
      kb.push([
        { text: "📋 Copy Email", copy_text: { text: email } },
        { text: "🔥 Next Account", callback_data: "get_stock" }
      ]);
      kb.push([{ text: "🏠 Home", callback_data: "home" }]);

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kb });
      break;
    }
  }
}

async function startTempMailWatcher(chatId, email, telegramApi) {
  for (let i = 0; i < 15; i++) {
    await sleep(2500);
    const { otp, link, service } = await fetchTempMailOtp(email);

    if (otp) {
      recordOtp(email, otp, service?.name || "Temp Mail");

      const alertMsg =
        `🔔 <b>${service?.icon || "⚡"} TEMP MAIL OTP RECEIVED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Temp Mail:</b> <code>${escapeHtml(email)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche button se direct copy karein:</i>`;

      const kb = [
        [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]
      ];
      if (link) kb.push([{ text: "🔗 Open Verification Link", url: link }]);
      kb.push([
        { text: "📋 Copy Email", copy_text: { text: email } },
        { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }
      ]);
      kb.push([{ text: "🏠 Home", callback_data: "home" }]);

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kb });
      break;
    }
  }
}

// ================= DATABASE LEDGER =================
async function getLedgerState(telegramApi) {
  try {
    const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
    const pinned = res?.result?.pinned_message?.text || "";

    if (pinned.includes("DB_STORE:")) {
      const matchFile = pinned.match(/FILE:([a-zA-Z0-9_-]+)/);
      const matchIdx = pinned.match(/IDX:(\d+)/);
      const matchTotal = pinned.match(/TOTAL:(\d+)/);

      return {
        fileId: matchFile ? matchFile[1] : null,
        index: matchIdx ? parseInt(matchIdx[1], 10) : 0,
        total: matchTotal ? parseInt(matchTotal[1], 10) : 0,
        msgId: res.result.pinned_message.message_id
      };
    }
  } catch (e) {}
  return { fileId: null, index: 0, total: 0, msgId: null };
}

async function loadStockLines(fileId, telegramApi) {
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) {
    return CACHED_LINES;
  }
  const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${fileId}`).then(r => r.json());
  const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
  const lines = sanitizeLines(content);

  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
}

async function updateLedger(fileId, newIndex, total, msgId, telegramApi) {
  const remaining = Math.max(0, total - newIndex);
  const dbText =
    `🗄️ <b>MASTER STOCK DATABASE (LEDGER)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Total Valid Accounts: <code>${total}</code>\n` +
    `📤 Dispensed / Used: <code>${newIndex}</code>\n` +
    `✅ Fresh Baaki: <code>${remaining}</code>\n\n` +
    `<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;

  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    }).catch(() => {});
  }
}

// ================= WORKER ENTRY =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Bot Running OK.", { status: 200 });
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= MAIN UPDATE ROUTER =================
async function handleTelegramUpdate(update, ctx) {
  const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  const messageId = cb?.message?.message_id;
  let text = msg?.text?.trim() || "";
  const data = cb?.data;

  if (!chatId) return;
  text = text.replace(/@\w+bot/i, '').trim();

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  // ================= OWNER COMMANDS =================
  if (userId === OWNER_ID) {
    if (text === "/history") {
      if (OTP_HISTORY.length === 0) {
        return send(chatId, "📋 <i>Abhi tak koi naya OTP record nahi hua hai.</i>", telegramApi);
      }
      let historyText = `📋 <b>RECENT OTP AUDIT LOG (Last ${OTP_HISTORY.length})</b>\n━━━━━━━━━━━━━━━━━━\n\n`;
      for (const item of OTP_HISTORY) {
        historyText += `🕒 <code>${item.time}</code> | <b>${escapeHtml(item.serviceName)}</b>\n`;
        historyText += `📧 <code>${escapeHtml(item.email)}</code>\n🔑 <b>Code:</b> <code>${item.code}</code>\n\n`;
      }
      return send(chatId, historyText, telegramApi);
    }

    if (text === "/export_unused" || data === "admin_export") {
      const db = await getLedgerState(telegramApi);
      if (!db.fileId || db.index >= db.total) {
        return send(chatId, "⚠️ <i>Koi unused stock bacha nahi hai.</i>", telegramApi);
      }
      const wait = await send(chatId, "⏳ <i>File download ho rahi hai...</i>", telegramApi);
      const lines = await loadStockLines(db.fileId, telegramApi);
      const unused = lines.slice(db.index);

      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("document", new Blob([unused.join("\n")], { type: "text/plain" }), `fresh_stock_${unused.length}.txt`);
      form.append("caption", `📄 <b>Exported Unused Accounts:</b> <code>${unused.length}</code>`);

      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: form });
      if (wait) deleteMessage(chatId, (await wait.json())?.result?.message_id, telegramApi);
      return;
    }

    if (text === "/clear_stock" || data === "admin_clear") {
      const db = await getLedgerState(telegramApi);
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      if (db.msgId) await updateLedger("EMPTY", 0, 0, db.msgId, telegramApi);
      return send(chatId, "🧹 <b>Stock ledger successfully reset to 0!</b>", telegramApi);
    }

    if (text === "/stock" || data === "admin_status") {
      const db = await getLedgerState(telegramApi);
      const remaining = Math.max(0, db.total - db.index);
      const rep =
        `📊 <b>LIVE STOCK STATUS</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Valid Lines:</b> <code>${db.total}</code>\n` +
        `📤 <b>Dispensed / Used:</b> <code>${db.index}</code>\n` +
        `✅ <b>Fresh Baaki:</b> <code>${remaining}</code>`;

      const kb = [
        [{ text: "📥 Export Unused Stock (.txt)", callback_data: "admin_export" }],
        [{ text: "🗑️ Clear / Reset Ledger", callback_data: "admin_clear" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
      return messageId ? edit(chatId, messageId, rep, telegramApi, { inline_keyboard: kb }) : send(chatId, rep, telegramApi, { inline_keyboard: kb });
    }
  }

  // ================= FILE UPLOAD =================
  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Kewal Bot Owner stock upload kar sakte hain!</i>", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Sirf .txt file upload karein!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>File read karke duplicates sanitize kiye ja rahe hain...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const fRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, document: doc.file_id, caption: `📁 Stock File` })
      }).then(r => r.json());

      const finalFileId = fRes?.result?.document?.file_id || doc.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadStockLines(finalFileId, telegramApi);

      if (lines.length === 0) return edit(chatId, waitId, "❌ <i>File ke andar koi valid email line nahi mili.</i>", telegramApi);

      const dbText = `🗄️ <b>MASTER STOCK DATABASE (LEDGER)</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total: <code>${lines.length}</code> | 📤 Dispensed: <code>0</code> | ✅ Fresh: <code>${lines.length}</code>\n\n<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        }).catch(() => {});
      }

      return edit(chatId, waitId, `✅ <b>${lines.length} Valid Accounts Loaded!</b>\nStrict counter & Auto-push ready.`, telegramApi, {
        inline_keyboard: [[{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }]]
      });
    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Error saving file to Channel.</i>", telegramApi);
    }
  }

  // ================= HOME MENU =================
  if (text === "/start" || data === "home") {
    let remaining = 0;
    try {
      const db = await getLedgerState(telegramApi);
      remaining = Math.max(0, db.total - db.index);
    } catch (e) {}

    const homeMsg =
      `📬 <b>AUTO-PUSH OTP DISPENSER</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔥 <b>Hotmail / Outlook:</b> Fresh account (Live Auto-Push OTP + Webmail Button).\n` +
      `⚡ <b>Temp Mail:</b> Instant realistic email (Live Auto-Push OTP).\n` +
      `🔍 <b>Search Email:</b> Kisi bhi puraane email ka code direct nikaalein.\n\n` +
      `📊 <b>Stock Baaki:</b> <code>${remaining}</code> accounts`;

    const kbRows = [
      [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }],
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen_temp" }],
      [{ text: "🔑 Enter Email / Old Account (Search)", callback_data: "ask_email" }]
    ];
    if (userId === OWNER_ID) {
      kbRows.push([
        { text: "📁 Upload Stock (.txt)", callback_data: "ask_file" },
        { text: "⚙️ Owner Suite", callback_data: "admin_status" }
      ]);
    }

    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, { inline_keyboard: kbRows }) : send(chatId, homeMsg, telegramApi, { inline_keyboard: kbRows });
  }

  // ================= DISPENSE ACCOUNT =================
  if (data === "get_stock") {
    const db = await getLedgerState(telegramApi);
    if (!db.fileId || db.index >= db.total) {
      return edit(chatId, messageId, "⚠️ <b>Stock Khali Hai!</b> Nayi file upload karein.", telegramApi, {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    try {
      const lines = await loadStockLines(db.fileId, telegramApi);
      const fullLine = lines[db.index];
      const nextIndex = db.index + 1;

      await updateLedger(db.fileId, nextIndex, db.total, db.msgId, telegramApi);

      const parts = fullLine.split(/[|:]/);
      const email = parts[0]?.trim();
      const pass = parts[1]?.trim() || "";
      const remaining = Math.max(0, db.total - nextIndex);

      ctx.waitUntil(startAutoPushWatcher(chatId, fullLine, telegramApi));

      const webmailLink = `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`;
      const out =
        `🔥 <b>ACCOUNT READY</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 <b>Email:</b>\n<code>${escapeHtml(email)}</code>\n` +
        (pass ? `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` : "") +
        `📦 <b>Stock Baaki:</b> <code>${remaining}</code> accounts\n\n` +
        `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
        `<i>App par code bhejein. Bot background me check kar raha hai, code aate hi <b>automatic popup</b> mil jayega!</i>`;

      return edit(chatId, messageId, out, telegramApi, {
        inline_keyboard: [
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "🌐 🔗 Open Webmail / Full Mailbox", url: webmailLink }],
          [{ text: "🔄 Manual Check", callback_data: `o:idx:${db.index}` }],
          [{ text: "🔥 Next Account", callback_data: "get_stock" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      });
    } catch (e) {
      return edit(chatId, messageId, "❌ <i>Error fetching account from database.</i>", telegramApi);
    }
  }

  // ================= MANUAL CHECK =================
  if (data && data.startsWith("o:idx:")) {
    const idx = parseInt(data.replace("o:idx:", ""), 10);
    const db = await getLedgerState(telegramApi);
    const lines = await loadStockLines(db.fileId, telegramApi);
    const fullLine = lines[idx] || "";
    const email = fullLine.split(/[|:]/)[0]?.trim();

    const { otp, link, service } = await fetchAccountOtp(fullLine);
    let report = `📬 <b>MAILBOX FOR:</b>\n📧 <code>${escapeHtml(email)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kb = [];

    if (otp) {
      recordOtp(email, otp, service?.name || "Service");
      report += `🌐 <b>Service:</b> ${service?.icon || "🔑"} <b>${service?.name || "Online Service"}</b>\n🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n✅ <i>OTP mil chuka hai!</i>\n`;
      kb.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Inbox me code nahi mila. Resend Code dabayein (Bot auto-listening kar raha hai).</i>\n`;
    }

    if (link) kb.push([{ text: "🌐 🔗 Open Webmail / Full Mailbox", url: link }]);
    kb.push([
      { text: "🔄 Check Again", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: email } }
    ]);
    kb.push([{ text: "🔥 Next Account", callback_data: "get_stock" }, { text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kb });
  }

  // ================= GLOBAL SEARCH (OLD / USED EMAILS) =================
  if (text.includes("@")) {
    const targetEmail = (text.includes("|") ? text.split(/[|:]/)[0] : text).trim().toLowerCase();
    let accountDataToUse = text;

    const waitMsg = await send(chatId, `🔍 <b>Searching Database for:</b>\n<code>${escapeHtml(targetEmail)}</code>...`, telegramApi);
    const waitId = waitMsg ? (await waitMsg.json())?.result?.message_id : null;

    if (!text.includes("|")) {
      try {
        const db = await getLedgerState(telegramApi);
        if (db.fileId) {
          const allLines = await loadStockLines(db.fileId, telegramApi);
          const found = allLines.find(l => l.toLowerCase().startsWith(targetEmail));
          if (found) accountDataToUse = found;
        }
      } catch (e) {}
    }

    const { otp, link, service } = await (accountDataToUse.includes("|")
      ? fetchAccountOtp(accountDataToUse)
      : fetchTempMailOtp(targetEmail));

    let report = `📬 <b>SEARCH RESULT:</b>\n📧 <code>${escapeHtml(targetEmail)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kb = [];

    if (otp) {
      recordOtp(targetEmail, otp, service?.name || "Service");
      report += `🌐 <b>Service:</b> ${service?.icon || "🔑"} <b>${service?.name || "Online Service"}</b>\n🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n\n`;
      kb.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Abhi koi naya OTP nahi mila. App me 'Resend' dabayein (Bot background me check kar raha hai).</i>\n\n`;
    }

    if (link) kb.push([{ text: "🌐 🔗 Open Webmail / Full Mailbox", url: link }]);
    kb.push([
      { text: "📋 Copy Email", copy_text: { text: targetEmail } },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    if (accountDataToUse.includes("|")) {
      ctx.waitUntil(startAutoPushWatcher(chatId, accountDataToUse, telegramApi));
    } else {
      ctx.waitUntil(startTempMailWatcher(chatId, targetEmail, telegramApi));
    }

    return edit(chatId, waitId, report, telegramApi, { inline_keyboard: kb });
  }

  // ================= TEMP MAIL =================
  if (data === "gen_temp") {
    const fullEmail = `${getRandomUser()}@${GUERRILLA_DOMAINS[0]}`;
    ctx.waitUntil(startTempMailWatcher(chatId, fullEmail, telegramApi));

    const out =
      `⚡ <b>TEMP MAIL READY (Live Auto-Push)</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(fullEmail)}</code>\n\n` +
      `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
      `<i>Code aate hi bot <b>khud-ba-khud notification aur copy button bhej dega!</b></i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  if (data === "ask_email") {
    return send(chatId, "✍️ <i>Jis bhi email ka OTP nikaalna hai, chat me bhej dein:</i>", telegramApi, { force_reply: true });
  }

  if (data === "ask_file") {
    return edit(chatId, messageId, "📁 <i>Apni stock .txt file chat me direct bhej dein:</i>", telegramApi);
  }
}

// ================= TELEGRAM DISPATCHERS =================
async function send(chatId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  return fetch(`${telegramApi}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) return send(chatId, text, telegramApi, kb);
  return res;
}

async function deleteMessage(chatId, messageId, telegramApi) {
  return fetch(`${telegramApi}/deleteMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: messageId }) }).catch(() => {});
}
