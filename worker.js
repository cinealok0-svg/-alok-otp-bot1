/**
 * All-In-One Enterprise Bot (Custom Domain Temp Mail + Hotmail/Outlook OAuth2 & DongvanFB Suite)
 * Configured for Cloudflare Workers & Cloudflare Email Routing with wrangler.toml [vars]
 */

// ================= DYNAMIC ENV BINDINGS =================
let BOT_TOKEN = "";
let OWNER_ID = "";
let DB_CHANNEL_ID = "";
let DONGVAN_API_KEY = "";
let DEFAULT_DOMAIN = "vibepulsemedia.online";

const FEMALE_FIRST_NAMES = [
  "aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya",
  "sneha", "tanya", "ananya", "simran", "neha", "muskan", "roshni", "komal", "sakshi", "aditi"
];
const FEMALE_LAST_NAMES = [
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy", "yadav"
];

let CACHED_FILE_ID = null;
let CACHED_LINES = null;

// In-Memory Stores for Custom Domain Temp Mail
const EMAIL_TO_CHAT = new Map();
const TEMP_OTP_STORE = new Map();

// ================= UTILITIES =================
function initEnv(env) {
  BOT_TOKEN = env?.BOT_TOKEN || "";
  OWNER_ID = String(env?.OWNER_ID || "");
  DB_CHANNEL_ID = String(env?.DB_CHANNEL_ID || "");
  DONGVAN_API_KEY = env?.DONGVAN_KEY || "";
  DEFAULT_DOMAIN = (env?.DEFAULT_DOMAIN || "vibepulsemedia.online").toLowerCase().trim();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getRandomUser() {
  const f = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const l = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  return `${f}.${l}${Math.floor(10 + Math.random() * 90)}`.toLowerCase();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Service Detector
function detectService(rawText) {
  const lower = String(rawText || "").toLowerCase();
  if (lower.includes("facebook") || lower.includes("meta") || lower.includes("fb-")) {
    return { name: "Facebook / Meta", icon: "🌐" };
  }
  if (lower.includes("instagram") || lower.includes("ig-")) {
    return { name: "Instagram", icon: "📸" };
  }
  if (lower.includes("whatsapp")) {
    return { name: "WhatsApp", icon: "💬" };
  }
  if (lower.includes("telegram")) {
    return { name: "Telegram", icon: "✈️" };
  }
  if (lower.includes("google") || lower.includes("gmail") || lower.includes("youtube") || lower.includes("g-")) {
    return { name: "Google / YouTube", icon: "🔍" };
  }
  if (lower.includes("twitter") || lower.includes(" x ") || lower.includes("x corp")) {
    return { name: "Twitter / X", icon: "🐦" };
  }
  if (lower.includes("tiktok")) {
    return { name: "TikTok", icon: "🎵" };
  }
  if (lower.includes("microsoft") || lower.includes("outlook") || lower.includes("hotmail")) {
    return { name: "Microsoft", icon: "🪟" };
  }
  if (lower.includes("discord")) {
    return { name: "Discord", icon: "👾" };
  }
  return { name: "Online Service", icon: "📩" };
}

// 6-Digit Priority Smart Parser + Link Extractor
function extractSmartOtpAndLink(text, fallbackEmail = "") {
  const isCustomDomain = fallbackEmail.toLowerCase().endsWith(`@${DEFAULT_DOMAIN}`);
  const defaultFallbackLink = (!isCustomDomain && fallbackEmail)
    ? `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(fallbackEmail)}`
    : null;

  if (!text) return { otp: null, link: defaultFallbackLink, service: detectService("") };

  const raw = String(text);
  const clean = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ');

  // Priority 1: Clear 6-digit or 8-digit OTP (Standard Meta/Google/WA)
  let match = clean.match(/(?:code|otp|कन्फ़र्म|passcode|pin|security code|código)\D{0,15}\b([0-9]{6,8})\b/i) ||
              clean.match(/\b([0-9]{6,8})\b\D{0,15}(?:is your|code|otp|कन्फ़र्म)/i) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6})\b/) ||
              clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{8})\b/);

  // Priority 2: Fallback to 4 or 5-digit OTP only if 6/8 is not present
  if (!match) {
    match = clean.match(/(?:code|otp|passcode|pin)\D{0,15}\b([0-9]{4,5})\b/i) ||
            clean.match(/\b([0-9]{4,5})\b\D{0,15}(?:is your|code|otp)/i) ||
            clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);
  }

  const otp = match ? (match[1] || match[0]) : null;

  // Direct Verification Link Grabber
  let link = null;
  const urlMatch = raw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|login_code)[^\s<>"']*/i) ||
                   raw.match(/https?:\/\/[^\s<>"']+(?:action=verify|auth=)[^\s<>"']*/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/[.,;)]+$/, '');
  } else if (defaultFallbackLink) {
    link = defaultFallbackLink;
  }

  const service = detectService(clean);
  return { otp, link, service };
}

// MIME Decoder for Cloudflare Email Routing (Handles Subject, Quoted-Printable & Base64)
function parseRawMimeEmail(rawEmail) {
  if (!rawEmail) return "";
  let combined = rawEmail;

  // 1. Decode RFC 2047 Encoded Subject headers (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
  combined = combined.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, data) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return atob(data.replace(/\s+/g, ""));
      } else {
        return data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, hex) => String.fromCharCode(parseInt(hex, 16)));
      }
    } catch (e) {
      return data;
    }
  });

  // 2. Decode Quoted-Printable soft line breaks and hex sequences
  const qpDecoded = combined
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 3. Extract and decode any Base64 MIME body blocks
  let base64DecodedParts = "";
  const b64Regex = /Content-Transfer-Encoding:\s*base64\s*\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/gi;
  let bMatch;
  while ((bMatch = b64Regex.exec(rawEmail)) !== null) {
    try {
      const cleanB64 = bMatch[1].replace(/[^A-Za-z0-9+/=]/g, "");
      if (cleanB64.length > 10) {
        base64DecodedParts += " " + atob(cleanB64);
      }
    } catch (e) {}
  }

  return `${qpDecoded}\n${base64DecodedParts}`;
}

// Strict Stock Sanitizer
function parseStrictStockLines(rawContent) {
  if (!rawContent) return [];
  const lines = rawContent.split(/\r?\n/);
  const valid = [];
  const seen = new Set();

  for (let l of lines) {
    l = l.trim();
    if (l.length > 5 && l.includes("@") && (l.includes("|") || l.includes(":"))) {
      const emailPart = l.split(/[|:]/)[0].trim().toLowerCase();
      if (!seen.has(emailPart)) {
        seen.add(emailPart);
        valid.push(l);
      }
    }
  }
  return valid;
}

// ================= HOTMAIL / OUTLOOK LIVE OTP RESOLVER =================
async function getOAuth2MailboxOtp(accountLine) {
  if (!accountLine) return { otp: null, link: null, service: null };
  const parts = accountLine.split(/[|:]/);
  const email = parts[0]?.trim();
  const refreshToken = parts[2]?.trim();
  const clientId = parts[3]?.trim() || "9e5f94bc-e8a4-4e73-b8be-63364c29d753";

  // 1. Direct Microsoft Graph Token Exchange
  if (refreshToken) {
    try {
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'https://graph.microsoft.com/Mail.Read offline_access'
      });

      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json();
        const accessToken = tokenJson.access_token;
        if (accessToken) {
          const mailRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=3&$select=subject,bodyPreview,body', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (mailRes.ok) {
            const mailData = await mailRes.json();
            for (const m of (mailData.value || [])) {
              const full = `${m.subject || ""} ${m.bodyPreview || ""} ${m.body?.content || ""}`;
              const parsed = extractSmartOtpAndLink(full, email);
              // Fixed: Return only when an actual OTP is found so DongvanFB fallback runs if needed
              if (parsed.otp) return parsed;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. DongvanFB API Fallback (3 Endpoints)
  try {
    const urls = [
      `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(accountLine.trim())}`,
      `https://api.dongvanfb.com/api/get_code?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(email)}`,
      `https://dongvanfb.net/read_mail_box/api.php?apikey=${DONGVAN_API_KEY}&email=${encodeURIComponent(accountLine.trim())}&type=oauth2`
    ];

    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch (e) {}

          const direct = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
          if (direct) {
            return {
              otp: String(direct),
              link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`,
              service: detectService(txt)
            };
          }

          const parsed = extractSmartOtpAndLink(txt, email);
          if (parsed.otp) return parsed;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null, link: `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`, service: detectService("") };
}

// ================= CUSTOM DOMAIN TEMP MAIL RESOLVER =================
async function saveTempMailState(email, chatId, otpData = null, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  if (chatId) EMAIL_TO_CHAT.set(cleanEmail, String(chatId));
  if (otpData) TEMP_OTP_STORE.set(cleanEmail, otpData);

  // Sync latest mapping/OTP in DB_CHANNEL_ID description so all Cloudflare isolates share state without touching Stock Pinned Message
  try {
    const userPart = cleanEmail.split("@")[0];
    let desc = "";
    if (otpData?.otp) {
      desc = `OTP|${userPart}|${otpData.otp}|${otpData.service?.name || "Online Service"}|${chatId || ""}`;
    } else if (chatId) {
      desc = `MAP|${userPart}|${chatId}`;
    }
    if (desc && DB_CHANNEL_ID) {
      await fetch(`${telegramApi}/setChatDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, description: desc.slice(0, 250) })
      }).catch(() => {});
    }
  } catch (e) {}
}

async function getTempMailOtp(email, telegramApi) {
  if (!email) return { otp: null, link: null, service: null, pushed: false };
  const cleanEmail = email.toLowerCase().trim();

  // 1. Check In-Memory Store
  if (TEMP_OTP_STORE.has(cleanEmail)) {
    return TEMP_OTP_STORE.get(cleanEmail);
  }

  // 2. Check Cross-Isolate Channel Description Sync
  try {
    if (DB_CHANNEL_ID && telegramApi) {
      const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
      const desc = res?.result?.description || "";
      const userPart = cleanEmail.split("@")[0];
      if (desc.startsWith(`OTP|${userPart}|`)) {
        const parts = desc.split("|");
        const otp = parts[2] || null;
        const sName = parts[3] || "Online Service";
        if (otp) {
          const data = { otp, link: null, service: detectService(sName), pushed: true };
          TEMP_OTP_STORE.set(cleanEmail, data);
          return data;
        }
      }
    }
  } catch (e) {}

  return { otp: null, link: null, service: null, pushed: false };
}

async function resolveTargetChatForEmail(email, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  if (EMAIL_TO_CHAT.has(cleanEmail)) {
    return EMAIL_TO_CHAT.get(cleanEmail);
  }
  try {
    if (DB_CHANNEL_ID && telegramApi) {
      const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
      const desc = res?.result?.description || "";
      const userPart = cleanEmail.split("@")[0];
      if (desc.startsWith(`MAP|${userPart}|`)) {
        const parts = desc.split("|");
        if (parts[2]) return parts[2];
      }
      if (desc.startsWith(`OTP|${userPart}|`)) {
        const parts = desc.split("|");
        if (parts[4]) return parts[4];
      }
    }
  } catch (e) {}
  return OWNER_ID || null;
}

// ================= BACKGROUND LISTENERS =================
async function startOAuthAutoPush(chatId, accountData, telegramApi) {
  const email = accountData.split(/[|:]/)[0]?.trim();
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const { otp, link, service } = await getOAuth2MailboxOtp(accountData);
    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "🔑";

      let alertMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP DETECTED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `🌐 <b>Platform:</b> <b>${sName}</b>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche button se OTP copy karein ya link direct open karein:</i>`;

      const kbRows = [
        [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]
      ];
      if (link) {
        kbRows.push([{ text: "🌐 🔗 Open Webmail / Full Message", url: link }]);
      }
      kbRows.push([
        { text: "📋 Copy Email", copy_text: { text: email } },
        { text: "🔥 Next Account", callback_data: "get_stock" }
      ]);
      kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kbRows });
      break;
    }
  }
}

async function startTempMailAutoPush(chatId, email, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  for (let i = 0; i < 15; i++) {
    await sleep(2500);
    const data = await getTempMailOtp(cleanEmail, telegramApi);
    if (data?.otp) {
      // If Cloudflare Email Worker already pushed it directly, stop polling to avoid duplicate message
      if (data.pushed) break;

      data.pushed = true;
      TEMP_OTP_STORE.set(cleanEmail, data);

      const sName = data.service?.name || "Online Service";
      const sIcon = data.service?.icon || "⚡";

      let alertMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP DETECTED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Temp Mail:</b> <code>${escapeHtml(cleanEmail)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${data.otp}</code>\n\n` +
        `<i>Niche button se direct copy karein:</i>`;

      const kbRows = [
        [{ text: `📋 TAP TO COPY OTP: ${data.otp}`, copy_text: { text: data.otp } }]
      ];
      if (data.link) {
        kbRows.push([{ text: "🔗 Open Verification Link", url: data.link }]);
      }
      kbRows.push([
        { text: "📋 Copy Email", copy_text: { text: cleanEmail } },
        { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }
      ]);
      kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kbRows });
      break;
    }
  }
}

// ================= DATABASE HELPERS =================
async function getChannelDbState(telegramApi) {
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

async function loadChannelFileLines(fileId, telegramApi) {
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) {
    return CACHED_LINES;
  }
  const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${fileId}`).then(r => r.json());
  const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
  const lines = parseStrictStockLines(content);

  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
}

async function updateChannelDb(fileId, newIndex, total, msgId, telegramApi) {
  const remaining = Math.max(0, total - newIndex);
  const dbText =
    `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Total Valid Stock: <code>${total}</code>\n` +
    `📤 Total Dispensed: <code>${newIndex}</code>\n` +
    `✅ Fresh Stock Baaki: <code>${remaining}</code>\n\n` +
    `<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;

  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    }).catch(() => {});
  }
}

// ================= TELEGRAM API HELPERS =================
async function send(chatId, text, telegramApi, reply_markup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => null);
}

async function edit(chatId, messageId, text, telegramApi, reply_markup = null) {
  if (!messageId) return send(chatId, text, telegramApi, reply_markup);
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => null);
}

async function deleteMessage(chatId, messageId, telegramApi) {
  if (!messageId) return;
  return fetch(`${telegramApi}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  }).catch(() => null);
}

// ================= WORKER ENTRY (TELEGRAM WEBHOOK + CLOUDFLARE EMAIL ROUTING) =================
export default {
  // 1. Telegram Bot Webhook Handler
  async fetch(request, env, ctx) {
    initEnv(env);
    if (request.method !== "POST") {
      return new Response(`AlokMail Bot Engine Running OK. Custom Domain: @${DEFAULT_DOMAIN}`, { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  },

  // 2. Cloudflare Email Routing Handler (Reads incoming OTP mails for @vibepulsemedia.online)
  async email(message, env, ctx) {
    initEnv(env);
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;

    try {
      const toEmail = String(message.to || "").toLowerCase().trim();
      const rawEmail = await new Response(message.raw).text();
      const decodedText = parseRawMimeEmail(rawEmail);

      const { otp, link, service } = extractSmartOtpAndLink(decodedText, toEmail);
      if (!otp && !link) return;

      const targetChatId = await resolveTargetChatForEmail(toEmail, telegramApi);
      const otpRecord = { otp, link, service, pushed: Boolean(targetChatId) };
      await saveTempMailState(toEmail, targetChatId, otpRecord, telegramApi);

      if (targetChatId) {
        const sName = service?.name || "Online Service";
        const sIcon = service?.icon || "⚡";

        let alertMsg =
          `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP DETECTED!</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📧 <b>Temp Mail:</b> <code>${escapeHtml(toEmail)}</code>\n` +
          `🌐 <b>Platform:</b> <b>${sName}</b>\n` +
          (otp ? `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` : `\n`) +
          `<i>Niche button se direct copy karein:</i>`;

        const kbRows = [];
        if (otp) {
          kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
        }
        if (link) {
          kbRows.push([{ text: "🔗 Open Verification Link", url: link }]);
        }
        kbRows.push([
          { text: "📋 Copy Email", copy_text: { text: toEmail } },
          { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }
        ]);
        kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

        await send(targetChatId, alertMsg, telegramApi, { inline_keyboard: kbRows });
      }
    } catch (e) {}
  }
};

// ================= MAIN TELEGRAM ROUTER =================
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

  // 1. Owner Commands
  if (userId === OWNER_ID) {
    if (text === "/export_unused" || data === "admin_export") {
      const db = await getChannelDbState(telegramApi);
      if (!db.fileId || db.index >= db.total) {
        return send(chatId, "⚠️ <i>Koi unused stock baaki nahi hai.</i>", telegramApi);
      }
      const wait = await send(chatId, "⏳ <i>File download ho rahi hai...</i>", telegramApi);
      const lines = await loadChannelFileLines(db.fileId, telegramApi);
      const unusedLines = lines.slice(db.index);

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("document", new Blob([unusedLines.join("\n")], { type: "text/plain" }), `fresh_stock_${unusedLines.length}.txt`);
      formData.append("caption", `📄 <b>Exported Remaining Accounts:</b> <code>${unusedLines.length}</code>`);

      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: formData });
      if (wait) deleteMessage(chatId, (await wait.json())?.result?.message_id, telegramApi);
      return;
    }

    if (text === "/clear_stock" || data === "admin_clear") {
      const db = await getChannelDbState(telegramApi);
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      if (db.msgId) await updateChannelDb("EMPTY", 0, 0, db.msgId, telegramApi);
      return messageId
        ? edit(chatId, messageId, "🧹 <b>Stock ledger successfully reset to 0!</b>", telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] })
        : send(chatId, "🧹 <b>Stock ledger reset to 0!</b>", telegramApi);
    }

    if (text === "/stock" || data === "admin_status") {
      const db = await getChannelDbState(telegramApi);
      const remaining = Math.max(0, db.total - db.index);
      const rep =
        `📊 <b>OWNER LIVE STOCK STATUS</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Valid Lines:</b> <code>${db.total}</code>\n` +
        `📤 <b>Dispensed:</b> <code>${db.index}</code>\n` +
        `✅ <b>Fresh Baaki:</b> <code>${remaining}</code>`;

      const kb = {
        inline_keyboard: [
          [{ text: "📥 Export Unused Stock (.txt)", callback_data: "admin_export" }],
          [{ text: "🗑️ Clear / Reset Ledger", callback_data: "admin_clear" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      };
      return messageId ? edit(chatId, messageId, rep, telegramApi, kb) : send(chatId, rep, telegramApi, kb);
    }
  }

  // 2. Stock File Upload (.txt for Hotmail / Outlook)
  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Kewal Bot Owner stock upload kar sakte hain!</i>", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Sirf .txt file upload karein!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>File read karke duplicates hataye ja rahe hain...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const forwardRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, document: doc.file_id, caption: `📁 Stock File Uploaded` })
      }).then(r => r.json());

      const finalFileId = forwardRes?.result?.document?.file_id || doc.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadChannelFileLines(finalFileId, telegramApi);

      if (lines.length === 0) return edit(chatId, waitId, "❌ <i>File ke andar koi valid email line nahi mili.</i>", telegramApi);

      const dbText =
        `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 Total Valid Stock: <code>${lines.length}</code>\n` +
        `📤 Total Dispensed: <code>0</code>\n` +
        `✅ Fresh Stock Baaki: <code>${lines.length}</code>\n\n` +
        `<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;

      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        }).catch(() => {});
      }

      return edit(
        chatId,
        waitId,
        `✅ <b>Stock Successfully Uploaded & Pinned!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Valid Unique Accounts:</b> <code>${lines.length}</code>`,
        telegramApi,
        { inline_keyboard: [[{ text: "📊 View Stock Status", callback_data: "admin_status" }], [{ text: "🏠 Home", callback_data: "home" }]] }
      );
    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Stock upload karne me error aaya. Channel permissions check karein.</i>", telegramApi);
    }
  }

  // 3. Home / Start Menu
  if (text === "/start" || data === "home") {
    const db = await getChannelDbState(telegramApi);
    const remaining = Math.max(0, db.total - db.index);

    const welcomeMsg =
      `🤖 <b>ALL-IN-ONE ENTERPRISE MAIL & OTP BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Hotmail/Outlook Stock:</b> <code>${remaining}</code>\n` +
      `🌐 <b>Custom Temp Domain:</b> <code>@${escapeHtml(DEFAULT_DOMAIN)}</code>\n` +
      `⚡ <b>Auto-Push OTP:</b> <code>Active (Graph + Dongvan + Custom Domain)</code>\n\n` +
      `💡 <i>Kisi bhi purane ya naye account ka OTP nikalne ke liye seedha Email ya Full Line chat me bhejein!</i>`;

    const rows = [
      [{ text: "🔥 Get Fresh Mail Account", callback_data: "get_stock" }],
      [{ text: `⚡ Generate Instant Temp Mail (@${DEFAULT_DOMAIN})`, callback_data: "gen_temp" }]
    ];
    if (userId === OWNER_ID) {
      rows.push([{ text: "📊 Owner Stock Panel", callback_data: "admin_status" }]);
    }

    return messageId ? edit(chatId, messageId, welcomeMsg, telegramApi, { inline_keyboard: rows }) : send(chatId, welcomeMsg, telegramApi, { inline_keyboard: rows });
  }

  // 4. Dispense Fresh Hotmail/Outlook Account from Stock
  if (data === "get_stock" || text === "/get") {
    const db = await getChannelDbState(telegramApi);
    if (!db.fileId || db.index >= db.total) {
      const emptyMsg = "⚠️ <b>Out of Stock!</b>\n<i>Abhi koi fresh Hotmail/Outlook account uplabdh nahi hai.</i>";
      return messageId ? edit(chatId, messageId, emptyMsg, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }) : send(chatId, emptyMsg, telegramApi);
    }

    const lines = await loadChannelFileLines(db.fileId, telegramApi);
    const accountLine = lines[db.index];
    if (!accountLine) {
      return send(chatId, "⚠️ <i>Stock read karne me error aaya.</i>", telegramApi);
    }

    await updateChannelDb(db.fileId, db.index + 1, lines.length, db.msgId, telegramApi);

    const parts = accountLine.split(/[|:]/);
    const email = parts[0]?.trim() || "";
    const pass = parts[1]?.trim() || "N/A";
    const webmailUrl = `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(email)}`;

    const msgText =
      `✅ <b>FRESH ACCOUNT DISPENSED</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
      `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` +
      `⏳ <b>OTP Listener:</b> <i>Waiting for incoming code (Auto-Push)...</i>`;

    const kb = {
      inline_keyboard: [
        [
          { text: "📋 Copy Email", copy_text: { text: email } },
          { text: "🔑 Copy Pass", copy_text: { text: pass } }
        ],
        [{ text: "🔄 Check OTP Now", callback_data: `chk_mail:${email}` }],
        [{ text: "🌐 Open Webmail", url: webmailUrl }],
        [
          { text: "🔥 Next Account", callback_data: "get_stock" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    };

    await (messageId ? edit(chatId, messageId, msgText, telegramApi, kb) : send(chatId, msgText, telegramApi, kb));
    ctx.waitUntil(startOAuthAutoPush(chatId, accountLine, telegramApi));
    return;
  }

  // 5. Generate Custom Domain Temp Mail (@vibepulsemedia.online)
  if (data === "gen_temp" || text === "/temp") {
    const email = `${getRandomUser()}@${DEFAULT_DOMAIN}`;
    TEMP_OTP_STORE.delete(email);
    await saveTempMailState(email, chatId, null, telegramApi);

    const tempMsg =
      `⚡ <b>CUSTOM DOMAIN TEMP MAIL GENERATED</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
      `🌐 <b>Domain:</b> <code>@${escapeHtml(DEFAULT_DOMAIN)}</code>\n` +
      `⏳ <b>Status:</b> <i>Auto-listening for incoming OTP...</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Temp Mail", copy_text: { text: email } }],
        [{ text: "🔄 Check OTP Now", callback_data: `chk_temp:${email}` }],
        [
          { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    };

    await (messageId ? edit(chatId, messageId, tempMsg, telegramApi, kb) : send(chatId, tempMsg, telegramApi, kb));
    ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi));
    return;
  }

  // 6. Manual Check Custom Domain Temp Mail OTP
  if (data?.startsWith("chk_temp:")) {
    const email = data.replace("chk_temp:", "").trim().toLowerCase();
    await saveTempMailState(email, chatId, null, telegramApi);
    const { otp, link, service } = await getTempMailOtp(email, telegramApi);

    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "⚡";
      const foundMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP FOUND!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Temp Mail:</b> <code>${escapeHtml(email)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>`;

      const rows = [[{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]];
      if (link) rows.push([{ text: "🔗 Open Verification Link", url: link }]);
      rows.push([{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }, { text: "🏠 Home", callback_data: "home" }]);

      return edit(chatId, messageId, foundMsg, telegramApi, { inline_keyboard: rows });
    } else {
      ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi));
      return send(chatId, `⏳ <code>${escapeHtml(email)}</code> par abhi koi naya OTP nahi aaya hai. Jaise hi mail aayega, aapko auto-push mil jayega!`, telegramApi);
    }
  }

  // 7. Global Search & Manual OTP Check (Supports both Custom Domain & Hotmail/Outlook)
  if (data?.startsWith("chk_mail:") || text.includes("@")) {
    const rawQuery = data?.startsWith("chk_mail:") ? data.replace("chk_mail:", "").trim() : text.trim();
    const queryEmail = rawQuery.split(/[|:]/)[0].trim().toLowerCase();
    const domain = queryEmail.split("@")[1] || "";

    // Check if it's our Custom Domain (@vibepulsemedia.online)
    if (domain === DEFAULT_DOMAIN) {
      await saveTempMailState(queryEmail, chatId, null, telegramApi);
      const { otp, link, service } = await getTempMailOtp(queryEmail, telegramApi);
      if (otp) {
        const kbRows = [[{ text: `📋 COPY OTP: ${otp}`, copy_text: { text: otp } }]];
        if (link) kbRows.push([{ text: "🔗 Open Verification Link", url: link }]);
        kbRows.push([{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }, { text: "🏠 Home", callback_data: "home" }]);

        return send(chatId, `🔔 <b>${service?.name || "Temp Mail"} OTP Found!</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Email:</b> <code>${escapeHtml(queryEmail)}</code>\n🔑 <b>OTP Code:</b> <code>${otp}</code>`, telegramApi, {
          inline_keyboard: kbRows
        });
      }
      ctx.waitUntil(startTempMailAutoPush(chatId, queryEmail, telegramApi));
      return send(
        chatId,
        `🔍 <b>Custom Temp Mail Active:</b> <code>${escapeHtml(queryEmail)}</code>\n⏳ <i>Is email ke liye auto-push listener chalu kar diya gaya hai. OTP aate hi screen par aa jayega!</i>`,
        telegramApi,
        { inline_keyboard: [[{ text: "🔄 Check OTP Now", callback_data: `chk_temp:${queryEmail}` }], [{ text: "🏠 Home", callback_data: "home" }]] }
      );
    }

    // Otherwise, Search in Global Channel Database (Fresh + Dispensed Hotmail/Outlook)
    let targetAccountLine = rawQuery;
    if (!rawQuery.includes("|") && !rawQuery.includes(":")) {
      const db = await getChannelDbState(telegramApi);
      if (db.fileId) {
        const allLines = await loadChannelFileLines(db.fileId, telegramApi);
        const matchedLine = allLines.find(l => l.split(/[|:]/)[0].trim().toLowerCase() === queryEmail);
        if (matchedLine) targetAccountLine = matchedLine;
      }
    }

    const waitMsg = await send(chatId, `🔍 <code>${escapeHtml(queryEmail)}</code> <i>ka mailbox check kiya ja raha hai...</i>`, telegramApi);
    const waitId = waitMsg ? (await waitMsg.json())?.result?.message_id : null;

    const { otp, link, service } = await getOAuth2MailboxOtp(targetAccountLine);
    const webmailUrl = link || `https://dongvanfb.net/read_mail_box/?email=${encodeURIComponent(queryEmail)}`;

    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "🔑";
      const resMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP FOUND!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(queryEmail)}</code>\n` +
        `🌐 <b>Platform:</b> <b>${sName}</b>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>`;

      const kb = {
        inline_keyboard: [
          [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }],
          [{ text: "🌐 Open Webmail / Link", url: webmailUrl }],
          [{ text: "🔄 Refresh OTP", callback_data: `chk_mail:${queryEmail}` }, { text: "🏠 Home", callback_data: "home" }]
        ]
      };
      return edit(chatId, waitId, resMsg, telegramApi, kb);
    } else {
      ctx.waitUntil(startOAuthAutoPush(chatId, targetAccountLine, telegramApi));
      const noOtpMsg =
        `📭 <b>Abhi Koi Naya OTP Nahi Mila</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(queryEmail)}</code>\n` +
        `⏳ <i>Background listener chalu hai, OTP aate hi aapko auto-push mil jayega!</i>`;

      const kb = {
        inline_keyboard: [
          [{ text: "🔄 Check Again", callback_data: `chk_mail:${queryEmail}` }],
          [{ text: "🌐 Open Webmail", url: webmailUrl }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      };
      return edit(chatId, waitId, noOtpMsg, telegramApi, kb);
    }
  }
}
