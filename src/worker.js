/**
 * Enterprise Production Multi-Utility Bot
 * - Smart Service Detection (Meta, WhatsApp, Google, IG, etc.)
 * - Strict Stock Sanitizer & Exact Counter
 * - Direct Microsoft Graph & DongvanFB OAuth2 Engine
 * - Auto-Push Listeners for both Outlook and Temp Mail
 * - Owner Stock Suite (/stock, /export_unused, /clear_stock)
 * - Instagram Turbo Video Downloader
 */

// ================= INTERNAL ENCRYPTED CONFIG =================
const _b = (s) => atob(s);
const BOT_TOKEN = _b("ODk0MzA3NTcyMDpBQUU0VVJodW4wRFMweWMzOHpVc0hyMUoydEdPM0tpaDNjQQ==");
const OWNER_ID = _b("ODQ1MjMyMjgxOA==");
const DB_CHANNEL_ID = _b("LTEwMDQ0NzQ2NjU5NTY=");
const DONGVAN_API_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";

const GUERRILLA_DOMAINS = ['guerrillamailblock.com', 'sharklasers.com', 'guerrillamail.com', 'grr.la'];
const SECMAIL_DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net'];

const FEMALE_FIRST_NAMES = [
  "aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya",
  "sneha", "tanya", "ananya", "simran", "neha", "muskan", "roshni", "komal", "sakshi", "aditi"
];
const FEMALE_LAST_NAMES = [
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy", "yadav"
];

let CACHED_FILE_ID = null;
let CACHED_LINES = null;

// ================= UTILITIES =================
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

// Smart Service Detector
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
  if (lower.includes("google") || lower.includes("gmail") || lower.includes("g-")) {
    return { name: "Google", icon: "🔍" };
  }
  if (lower.includes("twitter") || lower.includes(" x ") || lower.includes("x corp")) {
    return { name: "Twitter / X", icon: "🐦" };
  }
  if (lower.includes("tiktok")) {
    return { name: "TikTok", icon: "🎵" };
  }
  if (lower.includes("microsoft") || lower.includes("outlook") || lower.includes("hotmail")) {
    return { name: "Microsoft Security", icon: "🪟" };
  }
  if (lower.includes("discord")) {
    return { name: "Discord", icon: "👾" };
  }
  if (lower.includes("amazon")) {
    return { name: "Amazon", icon: "📦" };
  }
  return { name: "Online Service", icon: "📩" };
}

function extractSmartOtpAndService(text) {
  if (!text) return { otp: null, service: detectService("") };
  const clean = String(text)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ');

  const match = clean.match(/(?:code|otp|कन्फ़र्म|passcode|pin|security code|código)\D{0,15}\b([0-9]{4,8})\b/i) ||
                clean.match(/\b([0-9]{4,8})\b\D{0,15}(?:is your|code|otp|कन्फ़र्म)/i) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);

  const otp = match ? (match[1] || match[0]) : null;
  const service = detectService(clean);
  return { otp, service };
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

// ================= LIVE OTP RESOLVERS =================
async function getOAuth2MailboxOtp(accountLine) {
  if (!accountLine) return { otp: null, service: null };
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
              const { otp, service } = extractSmartOtpAndService(full);
              if (otp) return { otp, service };
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. DongvanFB API Fallback
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
          if (direct) return { otp: String(direct), service: detectService(txt) };

          const { otp, service } = extractSmartOtpAndService(txt);
          if (otp) return { otp, service };
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null, service: null };
}

// Temp Mail OTP Resolver
async function getTempMailOtp(email) {
  if (!email) return { otp: null, service: null };
  const [login, domain] = email.toLowerCase().split('@');

  // Guerrilla Mail
  if (GUERRILLA_DOMAINS.includes(domain)) {
    try {
      const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
      const sid = init.sid_token || '';
      await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(login)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`);
      const listRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
      const mails = (listRes.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com');
      if (mails.length > 0) {
        const detail = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mails[0].mail_id}&sid_token=${sid}`).then(r => r.json());
        const full = `${detail.mail_subject || ""} ${detail.mail_body || ""}`;
        return extractSmartOtpAndService(full);
      }
    } catch (e) {}
  }

  // 1secmail
  if (SECMAIL_DOMAINS.includes(domain)) {
    try {
      const sRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`).then(r => r.json());
      if (sRes && sRes[0]) {
        const msg = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${sRes[0].id}`).then(r => r.json());
        const full = `${msg.subject || ""} ${msg.textBody || msg.body || ""}`;
        return extractSmartOtpAndService(full);
      }
    } catch (e) {}
  }

  return { otp: null, service: null };
}

// ================= BACKGROUND AUTO-PUSH LISTENERS =================
async function startOAuthAutoPush(chatId, accountData, telegramApi) {
  const email = accountData.split(/[|:]/)[0]?.trim();
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const { otp, service } = await getOAuth2MailboxOtp(accountData);
    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "🔑";

      const alertMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP DETECTED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Account:</b> <code>${escapeHtml(email)}</code>\n` +
        `🌐 <b>Platform:</b> <b>${sName}</b>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche direct tap karke copy karein:</i>`;

      const kb = {
        inline_keyboard: [
          [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }],
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "🔥 Generate Next Account", callback_data: "get_stock" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      };
      await send(chatId, alertMsg, telegramApi, kb);
      break;
    }
  }
}

async function startTempMailAutoPush(chatId, email, telegramApi) {
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const { otp, service } = await getTempMailOtp(email);
    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "⚡";

      const alertMsg =
        `🔔 <b>${sIcon} ${sName.toUpperCase()} OTP DETECTED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Temp Mail:</b> <code>${escapeHtml(email)}</code>\n` +
        `🌐 <b>Platform:</b> <b>${sName}</b>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>`;

      const kb = {
        inline_keyboard: [
          [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }],
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      };
      await send(chatId, alertMsg, telegramApi, kb);
      break;
    }
  }
}

// ================= TURBO INSTAGRAM DOWNLOADER =================
async function fetchInstagramFast(rawUrl) {
  const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  const engines = [
    (async () => {
      const res = await fetch(`https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal: controller.signal });
      const json = await res.json();
      const list = json?.data || [];
      const item = list.find(x => x?.type === 'video' || (x?.url && x.url.includes('.mp4'))) || list[0];
      if (item?.url) return { videoUrl: item.url, caption: json?.caption || item?.caption || "" };
      throw new Error();
    })(),
    (async () => {
      const res = await fetch(`https://bk9.fun/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal: controller.signal });
      const json = await res.json();
      const list = json?.BK9 || json?.data || [];
      const item = Array.isArray(list) ? list[0] : list;
      const url = item?.url || item?.video;
      if (url) return { videoUrl: url, caption: json?.caption || "" };
      throw new Error();
    })()
  ];

  try {
    const res = await Promise.any(engines);
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
}

// ================= TELEGRAM CHANNEL DB =================
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

  // Low stock alert to Owner (When below 10)
  if (remaining <= 10 && remaining > 0) {
    await send(OWNER_ID, `⚠️ <b>LOW STOCK ALERT!</b>\nSirf <code>${remaining}</code> accounts bache hain. Nayi .txt file upload karein.`, telegramApi);
  }
}

// ================= WORKER ENTRY =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Enterprise Multi-Bot Live.", { status: 200 });
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= MAIN HANDLER =================
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

  // ================= OWNER SUITE COMMANDS =================
  if (userId === OWNER_ID) {
    if (text === "/export_unused" || data === "admin_export") {
      const db = await getChannelDbState(telegramApi);
      if (!db.fileId || db.index >= db.total) {
        return send(chatId, "⚠️ <i>Koi unused stock baaki nahi hai.</i>", telegramApi);
      }
      const wait = await send(chatId, "⏳ <i>Unused accounts file taiyar ho rahi hai...</i>", telegramApi);
      const lines = await loadChannelFileLines(db.fileId, telegramApi);
      const unusedLines = lines.slice(db.index);
      const fileData = unusedLines.join("\n");

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("document", new Blob([fileData], { type: "text/plain" }), `fresh_stock_remaining_${unusedLines.length}.txt`);
      formData.append("caption", `📄 <b>Exported Remaining Accounts:</b> <code>${unusedLines.length}</code>`);

      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: formData });
      if (wait) deleteMessage(chatId, (await wait.json())?.result?.message_id, telegramApi);
      return;
    }

    if (text === "/clear_stock" || data === "admin_clear") {
      const db = await getChannelDbState(telegramApi);
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      if (db.msgId) {
        await updateChannelDb("EMPTY", 0, 0, db.msgId, telegramApi);
      }
      const reply = "🧹 <b>Stock ledger reset to 0!</b> Purana counter saaf ho gaya.";
      return messageId ? edit(chatId, messageId, reply, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }) : send(chatId, reply, telegramApi);
    }

    if (text === "/stock" || data === "admin_status") {
      const db = await getChannelDbState(telegramApi);
      const remaining = Math.max(0, db.total - db.index);
      const rep =
        `📊 <b>OWNER LIVE STOCK STATUS</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Valid Accounts:</b> <code>${db.total}</code>\n` +
        `📤 <b>Dispensed / Used:</b> <code>${db.index}</code>\n` +
        `✅ <b>Fresh Stock Baaki:</b> <code>${remaining}</code>\n` +
        `🗄️ <b>Ledger Message ID:</b> <code>${db.msgId || "None"}</code>`;

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

  // ================= FILE UPLOAD WITH STRICT SANITIZER =================
  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Kewal Bot Owner stock upload kar sakte hain!</i>", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Sirf .txt file upload karein!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>File verify aur clean ki ja rahi hai...</i>", telegramApi);
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

      if (lines.length === 0) {
        return edit(chatId, waitId, "❌ <i>File ke andar koi valid email line nahi mili. Format: email|password</i>", telegramApi);
      }

      const dbText =
        `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Valid Accounts:</b> <code>${lines.length}</code>\n` +
        `📤 <b>Dispensed:</b> <code>0</code>\n` +
        `✅ <b>Fresh Baaki:</b> <code>${lines.length}</code>\n\n` +
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

      const reply =
        `✅ <b>STOCK SYNC SUCCESSFUL!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📥 <b>Total Valid Accounts Loaded:</b> <code>${lines.length}</code>\n` +
        `⚡ <b>Sanitization:</b> Corrupt & duplicate lines removed.\n` +
        `🔔 <b>Smart Detection:</b> Active\n\n` +
        `<i>Niche direct account dispense karein:</i>`;

      return edit(chatId, waitId, reply, telegramApi, {
        inline_keyboard: [
          [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }],
          [{ text: "⚙️ Owner Suite", callback_data: "admin_status" }]
        ]
      });
    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Error saving file. Check bot channel admin rights.</i>", telegramApi);
    }
  }

  // ================= INSTAGRAM DOWNLOADER =================
  const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);
  if (igMatch) {
    const igUrl = igMatch[1];
    sendChatAction(chatId, "upload_video", telegramApi);
    const statusMsg = await send(chatId, "⚡ <i>Downloading Instagram Reel...</i>", telegramApi, null, msg.message_id);
    const statusMsgId = statusMsg ? (await statusMsg.json())?.result?.message_id : null;

    const media = await fetchInstagramFast(igUrl);
    if (media && media.videoUrl) {
      let caption = media.caption ? `📝 <b>Caption:</b>\n${escapeHtml(media.caption.slice(0, 500))}\n\n` : "";
      caption += `⚡ <i>Downloaded Instantly</i>`;

      const videoRes = await sendVideo(chatId, media.videoUrl, caption, telegramApi, msg.message_id);
      const vData = await videoRes.json().catch(() => ({}));
      if (vData.ok && statusMsgId) {
        deleteMessage(chatId, statusMsgId, telegramApi);
      } else if (statusMsgId) {
        edit(chatId, statusMsgId, `🎬 <b>Video Ready:</b> <a href="${media.videoUrl}">Direct Download</a>`, telegramApi);
      }
    } else if (statusMsgId) {
      edit(chatId, statusMsgId, `❌ <i>Video fetch nahi ho saka. Make sure account public ho.</i>`, telegramApi);
    }
    return;
  }

  // ================= HOME / START MENU =================
  if (text === "/start" || data === "home") {
    let remaining = 0;
    try {
      const db = await getChannelDbState(telegramApi);
      remaining = Math.max(0, db.total - db.index);
    } catch (e) {}

    const homeMsg =
      `📬 <b>AUTO-PUSH ENTERPRISE DISPENSER</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔥 <b>Hotmail / Outlook:</b> Fresh stock accounts (Auto-Push Live OTP).\n` +
      `⚡ <b>Temp Mail:</b> Instant realistic inbox (Auto-Push Live OTP).\n` +
      `🔍 <b>Smart Service:</b> Code aate hi brand logo aur name auto-detect hoga.\n\n` +
      `📊 <b>Stock Baaki:</b> <code>${remaining}</code> accounts`;

    const kbRows = [
      [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }],
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen_temp" }],
      [{ text: "🔑 Enter Email / OAuth2 String", callback_data: "ask_email" }]
    ];

    if (userId === OWNER_ID) {
      kbRows.push([
        { text: "📁 Upload Stock (.txt)", callback_data: "ask_file" },
        { text: "⚙️ Owner Suite", callback_data: "admin_status" }
      ]);
    }

    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, { inline_keyboard: kbRows }) : send(chatId, homeMsg, telegramApi, { inline_keyboard: kbRows });
  }

  // ================= DISPENSE ACCOUNT (OAUTH2) =================
  if (data === "get_stock") {
    const db = await getChannelDbState(telegramApi);
    if (!db.fileId || db.index >= db.total) {
      return edit(chatId, messageId, "⚠️ <b>Stock Khali Hai!</b> Nayi file upload karein.", telegramApi, {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    try {
      const lines = await loadChannelFileLines(db.fileId, telegramApi);
      const fullLine = lines[db.index];
      const nextIndex = db.index + 1;

      await updateChannelDb(db.fileId, nextIndex, db.total, db.msgId, telegramApi);

      const parts = fullLine.split(/[|:]/);
      const email = parts[0]?.trim();
      const pass = parts[1]?.trim() || "";
      const remaining = Math.max(0, db.total - nextIndex);

      ctx.waitUntil(startOAuthAutoPush(chatId, fullLine, telegramApi));

      const out =
        `🔥 <b>ACCOUNT READY</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 <b>Email:</b>\n<code>${escapeHtml(email)}</code>\n` +
        (pass ? `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` : "") +
        `📦 <b>Stock Baaki:</b> <code>${remaining}</code> accounts\n\n` +
        `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
        `<i>App par code bhejein. Bot scan kar raha hai, code aate hi <b>brand name ke sath automatic popup dega!</b></i>`;

      return edit(chatId, messageId, out, telegramApi, {
        inline_keyboard: [
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "🔄 Manual Check", callback_data: `o:idx:${db.index}` }],
          [{ text: "🔥 Next Account", callback_data: "get_stock" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      });
    } catch (e) {
      return edit(chatId, messageId, "❌ <i>Error fetching account.</i>", telegramApi);
    }
  }

  // ================= MANUAL REFRESH =================
  if (data && data.startsWith("o:idx:")) {
    const idx = parseInt(data.replace("o:idx:", ""), 10);
    const db = await getChannelDbState(telegramApi);
    const lines = await loadChannelFileLines(db.fileId, telegramApi);
    const fullLine = lines[idx] || "";
    const email = fullLine.split(/[|:]/)[0]?.trim();

    const { otp, service } = await getOAuth2MailboxOtp(fullLine);
    let report = `📬 <b>MAILBOX FOR:</b>\n📧 <code>${escapeHtml(email)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kbRows = [];

    if (otp) {
      const sName = service?.name || "Online Service";
      const sIcon = service?.icon || "🔑";
      report += `🌐 <b>Service:</b> ${sIcon} <b>${sName}</b>\n🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n✅ <i>OTP mil chuka hai!</i>\n`;
      kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Abhi tak code nahi aaya. Resend code dabayein (Bot background me check kar raha hai).</i>\n`;
    }

    kbRows.push([
      { text: "🔄 Check Again", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: email } }
    ]);
    kbRows.push([{ text: "🔥 Next Account", callback_data: "get_stock" }, { text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // ================= GENERATE REALISTIC TEMP MAIL =================
  if (data === "gen_temp") {
    const fullEmail = `${getRandomUser()}@${GUERRILLA_DOMAINS[0]}`;
    ctx.waitUntil(startTempMailAutoPush(chatId, fullEmail, telegramApi));

    const out =
      `⚡ <b>TEMP MAIL READY (Live Auto-Push)</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(fullEmail)}</code>\n\n` +
      `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
      `<i>Code aate hi bot automatic notification bhej dega!</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // ================= DIRECT STRING OR EMAIL PASTE =================
  if (text.includes("@")) {
    const email = text.split(/[|:]/)[0]?.trim();
    await send(chatId, `🔄 <b>Auto-Push Active for:</b>\n<code>${escapeHtml(email)}</code>\n<i>Jaise hi code aayega, popup bhej diya jayega...</i>`, telegramApi);

    if (text.includes("|")) {
      ctx.waitUntil(startOAuthAutoPush(chatId, text, telegramApi));
    } else {
      ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi));
    }
    return;
  }

  if (data === "ask_email") {
    return send(chatId, "✍️ <i>Apni email ya Full line chat me bhejein:</i>", telegramApi, { force_reply: true });
  }

  if (data === "ask_file") {
    return edit(chatId, messageId, "📁 <i>Apni stock .txt file direct chat me bhej dein:</i>", telegramApi);
  }
}

// ================= DISPATCH HELPERS =================
async function send(chatId, text, telegramApi, kb = null, replyToId = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

async function sendVideo(chatId, videoUrl, caption, telegramApi, replyToId = null) {
  const payload = { chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" };
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendVideo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

async function sendChatAction(chatId, action, telegramApi) {
  return fetch(`${telegramApi}/sendChatAction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, action }) }).catch(() => {});
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
