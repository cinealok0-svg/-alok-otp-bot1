/**
 * Production Enterprise Telegram Bot (Complete Working Edition)
 * - Engine 1: Hotmail / Outlook (Direct Microsoft Graph + DongvanFB OAuth2)
 * - Engine 2: TampMail Vercel API (Key: TM_7fK9xP2mQ8vL4nR6sA1zW5) + Mail.tm Fallback
 * - Universal OTP Parser: 4 to 8 Digits (Timestamps like 16:01 strictly blocked)
 * - Auto-Push Listener + Manual Refresh + Copy-to-Clipboard Buttons
 */

const _d = (s) => atob(s);
const BOT_TOKEN = _d("ODk0MzA3NTcyMDpBQUU0VVJodW4wRFMweWMzOHpVc0hyMUoydEdPM0tpaDNjQQ==");
const OWNER_ID = _d("ODQ1MjMyMjgxOA==");
const DB_CHANNEL_ID = _d("LTEwMDQ0NzQ2NjU5NTY=");
const DONGVAN_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";
const TAMPMAIL_KEY = "TM_7fK9xP2mQ8vL4nR6sA1zW5";

const FIRST_NAMES = ["aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya", "tanya"];
const LAST_NAMES = ["sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor"];

let CACHED_FILE_ID = null;
let CACHED_LINES = null;
const OTP_HISTORY = [];
const MAIL_TM_TOKENS = new Map();

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getRandomUser() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f}${l}${Math.floor(100 + Math.random() * 899)}`.toLowerCase();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function recordOtp(email, code, serviceName) {
  const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  OTP_HISTORY.unshift({ email, code, serviceName, time });
  if (OTP_HISTORY.length > 25) OTP_HISTORY.pop();
}

function detectPlatform(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("instagram") || t.includes("ig-")) return { name: "Instagram", icon: "📸" };
  if (t.includes("facebook") || t.includes("meta") || t.includes("fb-")) return { name: "Facebook / Meta", icon: "🌐" };
  if (t.includes("whatsapp")) return { name: "WhatsApp", icon: "💬" };
  if (t.includes("google") || t.includes("gmail") || t.includes("g-")) return { name: "Google", icon: "🔍" };
  if (t.includes("telegram")) return { name: "Telegram", icon: "✈️" };
  if (t.includes("twitter") || t.includes(" x ") || t.includes("x corp")) return { name: "Twitter / X", icon: "🐦" };
  if (t.includes("microsoft") || t.includes("outlook") || t.includes("hotmail")) return { name: "Microsoft", icon: "🪟" };
  return { name: "Online Service", icon: "📩" };
}

function extractUniversalOtpAndLinks(subject, bodyText, fallbackEmail = "") {
  const webLink = fallbackEmail ? `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(fallbackEmail)}` : null;
  const platform = detectPlatform(`${subject || ""} ${bodyText || ""}`);

  if (subject) {
    let s = String(subject).replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ");
    const sMatch = s.match(/(?:code|otp|pin|código|verification|passcode|is)\D{0,10}\b([0-9]{4,8})\b/i) ||
                   s.match(/\b([0-9]{4,8})\b\D{0,10}(?:is your|code|otp|pin)/i) ||
                   s.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,8})\b/);
    if (sMatch) return { otp: sMatch[1] || sMatch[0], link: webLink, service: platform };
  }

  if (!bodyText) return { otp: null, link: webLink, service: platform };

  let raw = String(bodyText)
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return ""; }
    })
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\b\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4}\b/g, " ");

  const clean = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");

  let match = clean.match(/(?:instagram code|facebook code|whatsapp code|verification code|security code|confirmation code|login code|code is|is your code|code:|otp:|pin:|código|passcode)\D{0,15}\b([0-9]{4,8})\b/i) ||
              clean.match(/\b([0-9]{4,8})\b\D{0,15}(?:is your (?:instagram|facebook|whatsapp|google|verification)?\s*(?:code|otp|pin))/i) ||
              clean.match(/(?:code|otp|pin|código|passcode)\D{0,10}\b([0-9]{4,8})\b/i) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);

  const otp = match ? (match[1] || match[0]) : null;

  let link = null;
  const linkMatch = raw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|auth=)[^\s<>"']*/i);
  if (linkMatch) link = linkMatch[0].replace(/[.,;)]+$/, "");
  else link = webLink;

  return { otp, link, service: platform };
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

// ================= OUTLOOK / OAUTH2 ENGINE =================
async function fetchAccountOtp(line) {
  if (!line) return { otp: null, link: null, service: null };
  const parts = line.split(/[|:]/);
  const email = parts[0]?.trim();
  const refreshToken = parts[2]?.trim();
  const clientId = parts[3]?.trim() || "9e5f94bc-e8a4-4e73-b8be-63364c29d753";

  if (refreshToken) {
    try {
      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "https://graph.microsoft.com/Mail.Read offline_access"
      });

      const tRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.access_token) {
          const mRes = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=3&$orderby=receivedDateTime desc&$select=subject,bodyPreview,body", {
            headers: { "Authorization": `Bearer ${tData.access_token}` }
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            for (const item of (mData.value || [])) {
              const fullBody = `${item.bodyPreview || ""} ${item.body?.content || ""}`;
              const parsed = extractUniversalOtpAndLinks(item.subject, fullBody, email);
              if (parsed.otp) return parsed;
            }
          }
        }
      }
    } catch (e) {}
  }

  try {
    const urls = [
      `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_KEY}&mail=${encodeURIComponent(line.trim())}`,
      `https://api.dongvanfb.com/api/get_code?apikey=${DONGVAN_KEY}&mail=${encodeURIComponent(email)}`,
      `https://dongvanfb.net/read_mail_box/api.php?apikey=${DONGVAN_KEY}&email=${encodeURIComponent(line.trim())}&type=oauth2`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch (e) {}

          const rawCode = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
          if (rawCode && String(rawCode).length >= 4) {
            return {
              otp: String(rawCode),
              link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`,
              service: detectPlatform(txt)
            };
          }

          const parsed = extractUniversalOtpAndLinks("", txt, email);
          if (parsed.otp) return parsed;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null, link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`, service: detectPlatform("") };
}

// ================= TAMPMAIL VERCEL API + FALLBACK =================
async function createTampMailAccount() {
  const baseUrls = ["https://tampmailapp.vercel.app", "https://tampmailapp-docs.vercel.app"];
  const eps = [
    `/api/gen?apikey=${TAMPMAIL_KEY}`,
    `/api/generate?key=${TAMPMAIL_KEY}`
  ];

  for (const b of baseUrls) {
    for (const ep of eps) {
      try {
        const res = await fetch(`${b}${ep}`, {
          headers: { "User-Agent": "Mozilla/5.0", "x-api-key": TAMPMAIL_KEY }
        });
        if (res.ok) {
          const data = await res.json();
          const email = data?.email || data?.mail || data?.data?.email || data?.address;
          if (email && email.includes("@")) return { email, base: b };
        }
      } catch (e) {}
    }
  }

  // Fallback: Mail.tm Engine
  try {
    const dRes = await fetch("https://api.mail.tm/domains");
    if (dRes.ok) {
      const dJson = await dRes.json();
      const dom = dJson["hydra:member"]?.[0]?.domain;
      if (dom) {
        const username = getRandomUser();
        const email = `${username}@${dom}`;
        const password = `Pass@${username}!26`;
        const reg = await fetch("https://api.mail.tm/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: email, password })
        });
        if (reg.ok || reg.status === 201) {
          const tRes = await fetch("https://api.mail.tm/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: email, password })
          });
          if (tRes.ok) {
            const tJson = await tRes.json();
            MAIL_TM_TOKENS.set(email, tJson.token);
            return { email, base: "mailtm" };
          }
        }
      }
    }
  } catch (e) {}

  return null;
}

async function fetchUnifiedTempOtp(email) {
  if (!email) return { otp: null, link: null, service: null };

  const baseUrls = ["https://tampmailapp.vercel.app", "https://tampmailapp-docs.vercel.app"];
  const eps = [
    `/api/inbox?email=${encodeURIComponent(email)}&apikey=${TAMPMAIL_KEY}`,
    `/api/get-messages?email=${encodeURIComponent(email)}&key=${TAMPMAIL_KEY}`
  ];

  for (const b of baseUrls) {
    for (const ep of eps) {
      try {
        const res = await fetch(`${b}${ep}`, {
          headers: { "User-Agent": "Mozilla/5.0", "x-api-key": TAMPMAIL_KEY }
        });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch(e) {}

          const direct = json?.otp || json?.code || json?.data?.otp || json?.data?.code;
          if (direct) {
            return { otp: String(direct), link: b, service: detectPlatform(txt) };
          }
          const parsed = extractUniversalOtpAndLinks("", txt, "");
          if (parsed.otp) return { otp: parsed.otp, link: parsed.link || b, service: parsed.service };
        }
      } catch (e) {}
    }
  }

  // Check Mail.tm Fallback
  let token = MAIL_TM_TOKENS.get(email);
  if (token) {
    try {
      const mRes = await fetch("https://api.mail.tm/messages", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (mRes.ok) {
        const mData = await mRes.json();
        const list = mData["hydra:member"] || [];
        if (list.length > 0) {
          const detailRes = await fetch(`https://api.mail.tm/messages/${list[0].id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const fullText = `${detail.subject || ""} ${detail.intro || ""} ${detail.text || ""}`;
            const parsed = extractUniversalOtpAndLinks(detail.subject, fullText, "");
            if (parsed.otp) return { otp: parsed.otp, link: "https://mail.tm", service: parsed.service };
          }
        }
      }
    } catch (e) {}
  }

  return { otp: null, link: null, service: detectPlatform("") };
}

// ================= BACKGROUND WORKERS =================
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
        `<i>Niche direct button se copy karein:</i>`;

      const kb = [[{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]];
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
    await sleep(3000);
    const { otp, link, service } = await fetchUnifiedTempOtp(email);

    if (otp) {
      recordOtp(email, otp, service?.name || "Temp Mail");

      const alertMsg =
        `🔔 <b>${service?.icon || "⚡"} ${service?.name?.toUpperCase() || "TEMP MAIL"} OTP RECEIVED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Temp Mail:</b> <code>${escapeHtml(email)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche button par tap karke copy karein:</i>`;

      const manualCb = `ut:${email}`;
      const kb = [[{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]];
      if (link) kb.push([{ text: "🌐 🔗 Open Verification Link", url: link }]);
      kb.push([
        { text: "🔄 Check Inbox / Refresh", callback_data: manualCb },
        { text: "📋 Copy Email", copy_text: { text: email } }
      ]);
      kb.push([
        { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" },
        { text: "🏠 Home", callback_data: "home" }
      ]);

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
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) return CACHED_LINES;
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
    `🗄️ <b>MASTER STOCK DATABASE (OUTLOOK + TEMP API)</b>\n` +
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
    if (request.method !== "POST") return new Response("Bot Core Running.", { status: 200 });
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
  text = text.replace(/@\w+bot/i, "").trim();

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
      if (OTP_HISTORY.length === 0) return send(chatId, "📋 <i>Abhi tak koi naya OTP record nahi hua hai.</i>", telegramApi);
      let historyText = `📋 <b>RECENT OTP AUDIT LOG (Last ${OTP_HISTORY.length})</b>\n━━━━━━━━━━━━━━━━━━\n\n`;
      for (const item of OTP_HISTORY) {
        historyText += `🕒 <code>${item.time}</code> | <b>${escapeHtml(item.serviceName)}</b>\n`;
        historyText += `📧 <code>${escapeHtml(item.email)}</code>\n🔑 <b>Code:</b> <code>${item.code}</code>\n\n`;
      }
      return send(chatId, historyText, telegramApi);
    }

    if (text === "/export_unused" || data === "admin_export") {
      const db = await getLedgerState(telegramApi);
      if (!db.fileId || db.index >= db.total) return send(chatId, "⚠️ <i>Koi unused stock bacha nahi hai.</i>", telegramApi);
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
        [{ text: "📥 Export Unused Stock", callback_data: "admin_export" }],
        [{ text: "🗑️ Clear / Reset Ledger", callback_data: "admin_clear" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
      return messageId ? edit(chatId, messageId, rep, telegramApi, { inline_keyboard: kb }) : send(chatId, rep, telegramApi, { inline_keyboard: kb });
    }
  }

  // ================= UPLOAD STOCK =================
  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Kewal Bot Owner stock upload kar sakte hain!</i>", telegramApi);
    if (!msg.document.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Sirf .txt file upload karein!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>File read karke sanitize ki ja rahi hai...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const fRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, document: msg.document.file_id, caption: `📁 Stock File` })
      }).then(r => r.json());

      const finalFileId = fRes?.result?.document?.file_id || msg.document.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadStockLines(finalFileId, telegramApi);

      if (lines.length === 0) return edit(chatId, waitId, "❌ <i>File ke andar koi valid email line nahi mili.</i>", telegramApi);

      const dbText = `🗄️ <b>MASTER STOCK DATABASE (OUTLOOK + TEMP API)</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total: <code>${lines.length}</code> | 📤 Dispensed: <code>0</code> | ✅ Fresh: <code>${lines.length}</code>\n\n<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        }).catch(() => {});
      }

      return edit(chatId, waitId, `✅ <b>${lines.length} Valid Accounts Loaded!</b>\nUniversal parsers & Temp API ready.`, telegramApi, {
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
      `📬 <b>OUTLOOK & TAMPMAIL DISPENSER</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔥 <b>Hotmail / Outlook:</b> Fresh stock accounts (Live Auto-Push OTP).\n` +
      `⚡ <b>Temp Mail:</b> TampMailApp Vercel API + Mail.tm Hybrid (Guaranteed OTP).\n` +
      `🔍 <b>Search Email:</b> Kisi bhi puraane email ka direct OTP dhoondhein.\n\n` +
      `📊 <b>Stock Baaki:</b> <code>${remaining}</code> accounts`;

    const kbRows = [
      [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }],
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen_temp" }],
      [{ text: "🔑 Enter Email / Search Old Account", callback_data: "ask_email" }]
    ];
    if (userId === OWNER_ID) {
      kbRows.push([
        { text: "📁 Upload Stock (.txt)", callback_data: "ask_file" },
        { text: "⚙️ Owner Suite", callback_data: "admin_status" }
      ]);
    }

    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, { inline_keyboard: kbRows }) : send(chatId, homeMsg, telegramApi, { inline_keyboard: kbRows });
  }

  // ================= DISPENSE OUTLOOK =================
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
        `<i>App par code send karein, code aate hi <b>automatic popup</b> mil jayega!</i>`;

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

  // ================= MANUAL CHECK OUTLOOK =================
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
      report += `📭 <i>Abhi tak code nahi aaya. Resend Code dabayein.</i>\n`;
    }

    if (link) kb.push([{ text: "🌐 🔗 Open Webmail / Full Mailbox", url: link }]);
    kb.push([
      { text: "🔄 Check Again", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: email } }
    ]);
    kb.push([{ text: "🔥 Next Account", callback_data: "get_stock" }, { text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kb });
  }

  // ================= MANUAL CHECK TEMP MAIL =================
  if (data && data.startsWith("ut:")) {
    const tempEmail = data.replace("ut:", "");
    const { otp, link, service } = await fetchUnifiedTempOtp(tempEmail);

    let report = `📬 <b>TEMP MAILBOX FOR:</b>\n📧 <code>${escapeHtml(tempEmail)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kb = [];

    if (otp) {
      recordOtp(tempEmail, otp, service?.name || "Temp Mail");
      report += `🌐 <b>Service:</b> ${service?.icon || "⚡"} <b>${service?.name || "Online Service"}</b>\n🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n✅ <i>OTP mil chuka hai!</i>\n`;
      kb.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Abhi tak inbox me code nahi aaya. 'Check Inbox / Refresh' dabayein.</i>\n`;
    }

    if (link) kb.push([{ text: "🌐 🔗 Open Verification Link", url: link }]);
    kb.push([
      { text: "🔄 Check Inbox / Refresh", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: tempEmail } }
    ]);
    kb.push([
      { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kb });
  }

  // ================= GLOBAL SEARCH =================
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
      : fetchUnifiedTempOtp(targetEmail));

    let report = `📬 <b>SEARCH RESULT:</b>\n📧 <code>${escapeHtml(targetEmail)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kb = [];

    if (otp) {
      recordOtp(targetEmail, otp, service?.name || "Service");
      report += `🌐 <b>Service:</b> ${service?.icon || "🔑"} <b>${service?.name || "Online Service"}</b>\n🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n\n`;
      kb.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Abhi koi naya OTP nahi mila. Resend dabayein.</i>\n\n`;
    }

    if (link) kb.push([{ text: "🌐 🔗 Open Webmail", url: link }]);
    kb.push([
      { text: "📋 Copy Email", copy_text: { text: targetEmail } },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    if (accountDataToUse.includes("|")) ctx.waitUntil(startAutoPushWatcher(chatId, accountDataToUse, telegramApi));
    else ctx.waitUntil(startTempMailWatcher(chatId, targetEmail, telegramApi));

    return edit(chatId, waitId, report, telegramApi, { inline_keyboard: kb });
  }

  // ================= GENERATE TEMP MAIL =================
  if (data === "gen_temp") {
    const acc = await createTampMailAccount();

    if (!acc) {
      return edit(chatId, messageId, "⚠️ <i>Temp Mail server busy hai. Kripya thodi der baad try karein.</i>", telegramApi, {
        inline_keyboard: [[{ text: "🔄 Retry", callback_data: "gen_temp" }], [{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    const fullEmail = acc.email;
    ctx.waitUntil(startTempMailWatcher(chatId, fullEmail, telegramApi));
    const manualCb = `ut:${fullEmail}`;

    const out =
      `⚡ <b>TEMP MAIL READY (TampMailApp API Engine)</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(fullEmail)}</code>\n\n` +
      `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
      `<i>Code aate hi bot automatic notification bhej dega!</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "🔄 Check Inbox / Refresh", callback_data: manualCb }],
        [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  if (data === "ask_email") return send(chatId, "✍️ <i>Jis bhi email ka OTP nikaalna hai, chat me bhej dein:</i>", telegramApi, { force_reply: true });
  if (data === "ask_file") return edit(chatId, messageId, "📁 <i>Apni stock .txt file chat me direct bhej dein:</i>", telegramApi);
}

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
