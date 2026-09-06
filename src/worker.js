/**
 * All-In-One Enterprise Bot (Automatic Non-Stop Auto-Push Engine)
 * Features:
 *  - Real-Time Background Live Listener (Auto-Pushes OTP instantly)
 *  - Dual Resolver (Direct Microsoft Graph + DongvanFB API Key)
 *  - Zero Duplicate Channel Database Ledger
 *  - 1-Tap Big Copy Buttons
 */

// ================= INTERNAL ENCRYPTED CONFIGURATION =================
const _b = (s) => atob(s);
const BOT_TOKEN = _b("ODk0MzA3NTcyMDpBQUU0VVJodW4wRFMweWMzOHpVc0hyMUoydEdPM0tpaDNjQQ==");
const OWNER_ID = _b("ODQ1MjMyMjgxOA==");
const DB_CHANNEL_ID = _b("LTEwMDQ0NzQ2NjU5NTY=");
const DONGVAN_API_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";

const GUERRILLA_DOMAINS = ['guerrillamailblock.com', 'sharklasers.com', 'guerrillamail.com', 'grr.la'];
const SECMAIL_DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net'];
const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

const FEMALE_FIRST_NAMES = ["aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya", "sneha", "tanya"];
const FEMALE_LAST_NAMES = ["sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor"];

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

function extractSmartOtp(text) {
  if (!text) return null;
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

  return match ? (match[1] || match[0]) : null;
}

// ================= DUAL ENGINE: MICROSOFT GRAPH + DONGVANFB =================
async function getLiveOtp(accountLine) {
  if (!accountLine) return null;

  const parts = accountLine.split(/[|:]/);
  const email = parts[0]?.trim();
  const refreshToken = parts[2]?.trim();
  const clientId = parts[3]?.trim() || "9e5f94bc-e8a4-4e73-b8be-63364c29d753";

  // 1. Direct Microsoft Graph OAuth2 Extraction
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
              const fullContent = (m.subject || "") + " " + (m.bodyPreview || "") + " " + (m.body?.content || "");
              const otp = extractSmartOtp(fullContent);
              if (otp) return otp;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. DongvanFB API Authenticated Scraper Fallback
  try {
    const endpoints = [
      `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(accountLine.trim())}`,
      `https://api.dongvanfb.com/api/get_code?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(email)}`,
      `https://dongvanfb.net/read_mail_box/api.php?apikey=${DONGVAN_API_KEY}&email=${encodeURIComponent(accountLine.trim())}&type=oauth2`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch (e) {}

          const code = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
          if (code) return String(code);

          const parsed = extractSmartOtp(txt);
          if (parsed) return parsed;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return null;
}

// ================= AUTOMATIC NON-STOP BACKGROUND LISTENER =================
async function startAutoPushWatcher(chatId, accountData, telegramApi) {
  const parts = accountData.split(/[|:]/);
  const email = parts[0]?.trim();

  // Polls automatically 15 times (Every 3 seconds = ~45 seconds non-stop scanning)
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const otp = await getLiveOtp(accountData);

    if (otp) {
      const alertMsg =
        `🔔 <b>LIVE OTP AUTOMATICALLY RECEIVED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `🔑 <b>OTP Code:</b> <code>${otp}</code>\n\n` +
        `<i>Niche direct button par tap karke copy karein:</i>`;

      const kbRows = [
        [{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }],
        [{ text: "📋 Copy Email", copy_text: { text: email } }],
        [{ text: "🔥 Generate Next Account", callback_data: "get_stock" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kbRows });
      break; // Stop listening once OTP is caught and sent
    }
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
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes("@"));

  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
}

async function updateChannelDb(fileId, newIndex, total, msgId, telegramApi) {
  const remaining = Math.max(0, total - newIndex);
  const dbText =
    `🗄️ <b>MASTER STOCK DATABASE (AUTO-PUSH ENGINE)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Total: <code>${total}</code> | 📤 Used: <code>${newIndex}</code> | ✅ Remaining: <code>${remaining}</code>\n\n` +
    `<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;

  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    }).catch(() => {});
  }
}

async function logUsedAccountToChannel(accountLine, telegramApi, userChatId) {
  const parts = accountLine.split(/[|:]/);
  const email = parts[0]?.trim();
  const pass = parts[1]?.trim() || "No Password";
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  const logText =
    `📕 <b>[USED ACCOUNT SEPARATED]</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
    `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` +
    `👤 <b>User:</b> <code>${userChatId}</code>\n` +
    `🕒 <b>Time:</b> <code>${now}</code>`;

  await fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: DB_CHANNEL_ID, text: logText, parse_mode: "HTML" })
  }).catch(() => {});
}

// ================= WORKER ENTRY =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Auto-Push Bot Running.", { status: 200 });
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

  // Stock upload by Owner
  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Owner only!</i>", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Only .txt file!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>Reading & Saving file...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const forwardRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, document: doc.file_id, caption: `📁 Stock File` })
      }).then(r => r.json());

      const finalFileId = forwardRes?.result?.document?.file_id || doc.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadChannelFileLines(finalFileId, telegramApi);

      const dbText = `🗄️ <b>MASTER STOCK DATABASE</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total: <code>${lines.length}</code> | 📤 Used: <code>0</code> | ✅ Remaining: <code>${lines.length}</code>\n\n<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        }).catch(() => {});
      }

      return edit(chatId, waitId, `✅ <b>${lines.length} Accounts Loaded!</b>\nAuto-Push Active hai. Ab accounts nikaalein:`, telegramApi, {
        inline_keyboard: [[{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }]]
      });
    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Error saving file. Check Channel Admin permissions.</i>", telegramApi);
    }
  }

  // Home / Start
  if (text === "/start" || data === "home") {
    let remaining = 0;
    try {
      const db = await getChannelDbState(telegramApi);
      remaining = Math.max(0, db.total - db.index);
    } catch (e) {}

    const homeMsg =
      `📬 <b>AUTO-PUSH OTP DISPENSER BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔥 <b>Hotmail / Outlook:</b> Fresh account generate karein.\n` +
      `⚡ <b>Auto-Push:</b> Jaise hi app par OTP send karenge, bot <b>khud code bhej dega</b> bina refresh dabaye!\n\n` +
      `📊 <b>Stock Remaining:</b> <code>${remaining}</code> accounts baaki hain.`;

    const kbRows = [
      [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock" }],
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen_temp" }],
      [{ text: "🔑 Enter Email / OAuth2 String", callback_data: "ask_email" }]
    ];
    if (userId === OWNER_ID) kbRows.push([{ text: "📁 Upload Stock (.txt)", callback_data: "ask_file" }]);

    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, { inline_keyboard: kbRows }) : send(chatId, homeMsg, telegramApi, { inline_keyboard: kbRows });
  }

  // Dispense Account + Start Auto Push
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
      await logUsedAccountToChannel(fullLine, telegramApi, userId);

      const parts = fullLine.split(/[|:]/);
      const email = parts[0]?.trim();
      const pass = parts[1]?.trim() || "";
      const remaining = Math.max(0, db.total - nextIndex);

      // START BACKGROUND AUTO-PUSH LISTENER
      ctx.waitUntil(startAutoPushWatcher(chatId, fullLine, telegramApi));

      const out =
        `🔥 <b>ACCOUNT READY</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 <b>Email:</b>\n<code>${escapeHtml(email)}</code>\n` +
        (pass ? `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` : "") +
        `📦 <b>Stock Remaining:</b> <code>${remaining}</code> accounts\n\n` +
        `⚡ <b>AUTO-PUSH ACTIVE:</b>\n` +
        `<i>App par code bhejein. Bot background me check kar raha hai, code aate hi <b>automatic popup</b> bhej dega!</i>`;

      return edit(chatId, messageId, out, telegramApi, {
        inline_keyboard: [
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "🔄 Manual Refresh (If needed)", callback_data: `o:idx:${db.index}` }],
          [{ text: "🔥 Next Account", callback_data: "get_stock" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      });
    } catch (e) {
      return edit(chatId, messageId, "❌ <i>Error fetching account.</i>", telegramApi);
    }
  }

  // Manual Refresh OTP
  if (data && data.startsWith("o:idx:")) {
    const idx = parseInt(data.replace("o:idx:", ""), 10);
    const db = await getChannelDbState(telegramApi);
    const lines = await loadChannelFileLines(db.fileId, telegramApi);
    const fullLine = lines[idx] || "";
    const email = fullLine.split(/[|:]/)[0]?.trim();

    const otp = await getLiveOtp(fullLine);
    let report = `📬 <b>MAILBOX FOR:</b>\n📧 <code>${escapeHtml(email)}</code>\n━━━━━━━━━━━━━━━━━━\n\n`;
    const kbRows = [];

    if (otp) {
      report += `🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n✅ <i>OTP mil chuka hai!</i>\n`;
      kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
    } else {
      report += `📭 <i>Abhi tak inbox me code nahi aaya. App par 'Resend Code' dabayein (Bot background me check kar raha hai).</i>\n`;
    }

    kbRows.push([
      { text: "🔄 Check Again", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: email } }
    ]);
    kbRows.push([{ text: "🔥 Next Account", callback_data: "get_stock" }, { text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // Direct String Paste + Auto Push
  if (text.includes("@") && text.includes("|")) {
    const email = text.split(/[|:]/)[0]?.trim();
    await send(chatId, `🔄 <b>Auto-Push Started for:</b>\n<code>${escapeHtml(email)}</code>\n<i>Jaise hi code aayega, bot popup bhej dega...</i>`, telegramApi);

    ctx.waitUntil(startAutoPushWatcher(chatId, text, telegramApi));
    return;
  }

  // Temp Mail
  if (data === "gen_temp") {
    const fullEmail = `${getRandomUser()}@${GUERRILLA_DOMAINS[0]}`;
    return edit(chatId, messageId, `⚡ <b>TEMP MAIL READY:</b>\n\n<code>${fullEmail}</code>`, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  if (data === "ask_email") {
    return send(chatId, "✍️ <i>Apni full account line chat me bhejein:</i>", telegramApi, { force_reply: true });
  }

  if (data === "ask_file") {
    return edit(chatId, messageId, "📁 <i>Apni stock .txt file chat me direct send karein:</i>", telegramApi);
  }
}

// Helpers
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
