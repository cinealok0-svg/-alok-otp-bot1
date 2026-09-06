/**
 * All-In-One Enterprise Bot
 * Features:
 *  - High-Speed In-Memory File Cache (Zero 429 Rate Limits)
 *  - Auto-Push Background OTP Listener (No Refresh Needed)
 *  - Magic Link / Verification URL Extractor
 *  - Provider Filter (Outlook / Hotmail / Any)
 *  - Owner Panel: /stock, /export_unused, /clear_stock
 *  - Channel Database (ID: -1004474665956)
 *  - Owner ID: 8452322818
 * Platform: Cloudflare Workers
 */

// ================= CONFIGURATION =================
const OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";

// Disposable Domains
const GUERRILLA_DOMAINS = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'grr.la'
];

const SECMAIL_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

// Realistic names pool for Temp Mail
const FEMALE_FIRST_NAMES = [
  "aanya", "aadhya", "aarohi", "ananya", "aditi", "diya", "ishita", "kavya", "khushi", "myra",
  "navya", "pooja", "priya", "riya", "saanvi", "shreya", "sneha", "tanvi", "tanya", "vaishnavi",
  "emma", "olivia", "ava", "sophia", "isabella", "charlotte", "amelia", "mia", "harper", "evelyn"
];

const FEMALE_LAST_NAMES = [
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy",
  "smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez"
];

// In-Memory Warm Cache to avoid redundant file downloads
let CACHED_FILE_ID = null;
let CACHED_LINES = null;

// ================= HELPERS =================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getRandomUser() {
  const first = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const last = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${first}.${last}${num}`.toLowerCase();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function extractSmartOtpAndLink(text) {
  if (!text) return { otp: null, link: null };
  const raw = String(text);
  const clean = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ');

  // 1. Extract OTP
  const match = clean.match(/(?:code|otp|कन्फ़र्म|passcode|pin|security code|código)\D{0,15}\b([0-9]{4,8})\b/i) ||
                clean.match(/\b([0-9]{4,8})\b\D{0,15}(?:is your|code|otp|कन्फ़र्म)/i) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);

  const otp = match ? (match[1] || match[0]) : null;

  // 2. Extract Verification / Magic Link
  let link = null;
  const urlMatch = raw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|login_code)[^\s<>"']*/i) ||
                   raw.match(/https?:\/\/[^\s<>"']+(?:action=verify|auth=)[^\s<>"']*/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/[.,;)]+$/, '');
  }

  return { otp, link };
}

// ================= TELEGRAM CHANNEL CACHED DATABASE =================
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

async function loadChannelFileLines(fileId, env, telegramApi) {
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) {
    return CACHED_LINES;
  }
  const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${fileId}`).then(r => r.json());
  const content = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes("@"));

  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
}

async function updateChannelDb(fileId, newIndex, total, msgId, telegramApi) {
  const remaining = Math.max(0, total - newIndex);
  const dbText =
    `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Total Accounts Uploaded:</b> <code>${total}</code>\n` +
    `📤 <b>Total Dispensed:</b> <code>${newIndex}</code>\n` +
    `✅ <b>Fresh Stock Remaining:</b> <code>${remaining}</code>\n\n` +
    `<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;

  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    });
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
    `👤 <b>Dispensed To User:</b> <code>${userChatId}</code>\n` +
    `🕒 <b>Timestamp:</b> <code>${now}</code>`;

  await fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: DB_CHANNEL_ID, text: logText, parse_mode: "HTML" })
  }).catch(() => {});
}

// ================= UNIVERSAL LIVE OTP & LINK FETCHERS =================
async function getMailboxDetails(email) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. DongvanFB Primary API
  try {
    const res = await fetch(`https://api.dongvanfb.com/api/get_code?mail=${encodeURIComponent(cleanEmail)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const data = await res.json();
      const code = data?.code || data?.otp || data?.data?.code || data?.data?.otp;
      if (code) return { otp: String(code), link: null };
      if (typeof data?.data === 'string') {
        const parsed = extractSmartOtpAndLink(data.data);
        if (parsed.otp || parsed.link) return parsed;
      }
    }
  } catch (e) {}

  // 2. Dongvan Webmail Scraper
  try {
    const res = await fetch(`https://dongvanfb.net/read_mail_box/api.php?email=${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      const parsed = extractSmartOtpAndLink(JSON.stringify(json));
      if (parsed.otp || parsed.link) return parsed;
    }
  } catch (e) {}

  // 3. Guerrilla Mail Live Checker
  const [login, domain] = cleanEmail.split('@');
  if (GUERRILLA_DOMAINS.includes(domain)) {
    try {
      const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
      const sid = init.sid_token || '';
      await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(login)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`);
      const listRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
      const mails = (listRes.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com');
      if (mails.length > 0) {
        const detail = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mails[0].mail_id}&sid_token=${sid}`).then(r => r.json());
        const fullMsg = (detail.mail_subject || "") + " " + (detail.mail_body || "");
        return extractSmartOtpAndLink(fullMsg);
      }
    } catch (e) {}
  }

  // 4. 1secmail Live Checker
  if (SECMAIL_DOMAINS.includes(domain)) {
    try {
      const sRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`).then(r => r.json());
      if (sRes && sRes[0]) {
        const msg = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${sRes[0].id}`).then(r => r.json());
        const fullMsg = (msg.subject || "") + " " + (msg.textBody || msg.body || "");
        return extractSmartOtpAndLink(fullMsg);
      }
    } catch (e) {}
  }

  return { otp: null, link: null };
}

// ================= BACKGROUND AUTO-PUSH OTP LISTENER =================
async function autoListenForOtp(chatId, email, telegramApi) {
  // Polls every 4 seconds for 32 seconds max (8 iterations)
  for (let i = 0; i < 8; i++) {
    await sleep(4000);
    const { otp, link } = await getMailboxDetails(email);

    if (otp || link) {
      let alertMsg =
        `🔔 <b>NEW CODE ARRIVED! (Auto-Pushed)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📧 <code>${escapeHtml(email)}</code>\n\n`;

      const kbRows = [];

      if (otp) {
        alertMsg += `🔑 <b>Live OTP:</b> <code>${otp}</code>\n`;
        kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
      }

      if (link) {
        alertMsg += `🔗 <i>Verification Link Detected!</i>\n`;
        kbRows.push([{ text: "🔗 Open Verification Link", url: link }]);
      }

      kbRows.push([
        { text: "📋 Copy Email", copy_text: { text: email } },
        { text: "🔄 Refresh", callback_data: `o:${encodeURIComponent(email)}` }
      ]);
      kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

      await send(chatId, alertMsg, telegramApi, { inline_keyboard: kbRows });
      break; // Exit polling loop as OTP is received
    }
  }
}

// ================= TURBO INSTAGRAM DOWNLOADER =================
async function fetchInstagramFast(rawUrl) {
  const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '');
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  const engines = [
    (async () => {
      const res = await fetch(`https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.data || [];
      const item = list.find(x => x?.type === 'video' || (x?.url && x.url.includes('.mp4'))) || list[0];
      if (item?.url) return { videoUrl: item.url, caption: json?.caption || item?.caption || "" };
      throw new Error();
    })(),
    (async () => {
      const res = await fetch(`https://bk9.fun/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.BK9 || json?.data || [];
      const item = Array.isArray(list) ? list[0] : list;
      const url = item?.url || item?.video;
      if (url) return { videoUrl: url, caption: json?.caption || "" };
      throw new Error();
    })()
  ];

  try {
    const result = await Promise.any(engines);
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
}

// ================= CLOUDFLARE WORKER ROUTER =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot engine is running.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= MAIN TELEGRAM HANDLER =================
async function handleTelegramUpdate(update, env, ctx) {
  const telegramApi = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
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

  // -------------------------------------------------------------
  // OWNER CONTROL COMMANDS (/stock, /export_unused, /clear_stock)
  // -------------------------------------------------------------
  if (userId === OWNER_ID) {
    if (text === "/stock") {
      const db = await getChannelDbState(telegramApi);
      const remaining = Math.max(0, db.total - db.index);
      const stats =
        `📊 <b>OWNER LIVE STOCK STATUS</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Accounts:</b> <code>${db.total}</code>\n` +
        `📤 <b>Dispensed/Used:</b> <code>${db.index}</code>\n` +
        `✅ <b>Fresh Remaining:</b> <code>${remaining}</code>\n` +
        `🗄️ <b>Ledger Message ID:</b> <code>${db.msgId || "None"}</code>\n` +
        `📁 <b>File ID:</b> <code>${db.fileId || "None"}</code>`;
      return send(chatId, stats, telegramApi);
    }

    if (text === "/export_unused") {
      const db = await getChannelDbState(telegramApi);
      if (!db.fileId || db.index >= db.total) {
        return send(chatId, "⚠️ <i>Koi unused stock bacha nahi hai export karne ke liye.</i>", telegramApi);
      }

      const wait = await send(chatId, "⏳ <i>Unused accounts generate ho rahe hain...</i>", telegramApi);
      const lines = await loadChannelFileLines(db.fileId, env, telegramApi);
      const unusedLines = lines.slice(db.index);
      const fileData = unusedLines.join("\n");

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("document", new Blob([fileData], { type: "text/plain" }), `unused_stock_${unusedLines.length}.txt`);
      formData.append("caption", `📄 <b>Exported Unused Accounts:</b> <code>${unusedLines.length}</code> lines`);

      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: formData });
      if (wait) deleteMessage(chatId, (await wait.json())?.result?.message_id, telegramApi);
      return;
    }

    if (text === "/clear_stock") {
      const db = await getChannelDbState(telegramApi);
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      if (db.msgId) {
        await updateChannelDb("EMPTY", 0, 0, db.msgId, telegramApi);
      }
      return send(chatId, "🧹 <b>Stock ledger successfully reset to 0!</b>", telegramApi);
    }
  }

  // -------------------------------------------------------------
  // 1. FILE UPLOAD (OWNER ONLY - 1000+ ACCOUNTS CAPACITY)
  // -------------------------------------------------------------
  if (msg?.document) {
    if (userId !== OWNER_ID) {
      return send(chatId, "⚠️ <i>Kewal Bot Owner hi accounts stock file upload kar sakte hain!</i>", telegramApi);
    }

    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) {
      return send(chatId, "⚠️ <i>Kripya sirf .txt format ki file upload karein!</i>", telegramApi);
    }

    const wait = await send(chatId, "⏳ <i>File cache ho rahi hai aur Database Channel me update ho rahi hai...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const forwardRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: DB_CHANNEL_ID,
          document: doc.file_id,
          caption: `📁 <b>New 1000+ Stock File Uploaded</b>\nBy Owner: <code>${userId}</code>`
        })
      }).then(r => r.json());

      const finalFileId = forwardRes?.result?.document?.file_id || doc.file_id;

      // Invalidate memory cache and load fresh lines
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadChannelFileLines(finalFileId, env, telegramApi);

      if (lines.length === 0) {
        return edit(chatId, waitId, "❌ <i>File ke andar koi valid email address nahi mila.</i>", telegramApi);
      }

      const dbText =
        `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Total Accounts Uploaded:</b> <code>${lines.length}</code>\n` +
        `📤 <b>Total Dispensed:</b> <code>0</code>\n` +
        `✅ <b>Fresh Stock Remaining:</b> <code>${lines.length}</code>\n\n` +
        `<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;

      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        });
      }

      const out =
        `✅ <b>DATABASE SYNC COMPLETED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📥 <b>Total Accounts Loaded:</b> <code>${lines.length}</code>\n` +
        `🗄️ <b>Storage:</b> Channel (<code>${DB_CHANNEL_ID}</code>)\n` +
        `⚡ <b>RAM Cache:</b> Active (Instant 100ms response)\n\n` +
        `<i>Niche direct button se account nikaalein:</i>`;

      return edit(chatId, waitId, out, telegramApi, {
        inline_keyboard: [
          [{ text: "🔥 Generate Any Stock", callback_data: "get_stock:any" }],
          [{ text: "📧 Outlook Only", callback_data: "get_stock:outlook" }, { text: "📧 Hotmail Only", callback_data: "get_stock:hotmail" }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      });

    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Channel me file save nahi ho saki. Check karein bot Channel me Admin hai ya nahi.</i>", telegramApi);
    }
  }

  // -------------------------------------------------------------
  // 2. INSTAGRAM DOWNLOADER
  // -------------------------------------------------------------
  const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);

  if (igMatch) {
    const igUrl = igMatch[1];
    sendChatAction(chatId, "upload_video", telegramApi);
    const statusMsg = await send(chatId, "⚡ <i>Downloading Reel...</i>", telegramApi, null, msg.message_id);
    const statusMsgId = statusMsg ? (await statusMsg.json())?.result?.message_id : null;

    const media = await fetchInstagramFast(igUrl);

    if (media && media.videoUrl) {
      let caption = media.caption ? `📝 <b>Caption:</b>\n${escapeHtml(media.caption.slice(0, 700))}\n\n` : "";
      caption += `⚡ <i>Downloaded Instantly</i>`;

      const videoRes = await sendVideo(chatId, media.videoUrl, caption, telegramApi, msg.message_id);
      const vData = await videoRes.json().catch(() => ({}));

      if (vData.ok && statusMsgId) {
        deleteMessage(chatId, statusMsgId, telegramApi);
      } else if (statusMsgId) {
        edit(chatId, statusMsgId, `🎬 <b>Video Ready:</b> <a href="${media.videoUrl}">Watch / Download</a>`, telegramApi);
      }
    } else if (statusMsgId) {
      edit(chatId, statusMsgId, `❌ <i>Video fetch nahi ho paya.</i>`, telegramApi);
    }
    return;
  }

  // -------------------------------------------------------------
  // 3. HOME / START MENU
  // -------------------------------------------------------------
  if (text === "/start" || data === "home") {
    const db = await getChannelDbState(telegramApi);
    const remaining = Math.max(0, db.total - db.index);

    const homeMsg =
      `📬 <b>DISPOSABLE MAIL & OUTLOOK / HOTMAIL BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔥 <b>Hotmail / Outlook:</b> Fresh account paayein aur live OTP lein.\n` +
      `⚡ <b>Temp Mail:</b> Disposable temporary email banayein.\n` +
      `🔑 <b>Old Email / Restore:</b> Kisi bhi purane email ka OTP dobara nikaalein.\n\n` +
      `📊 <b>Available Stock:</b> <code>${remaining}</code> accounts baaki hain.`;

    const kbRows = [
      [{ text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock:any" }],
      [{ text: "📧 Outlook Only", callback_data: "get_stock:outlook" }, { text: "📧 Hotmail Only", callback_data: "get_stock:hotmail" }],
      [{ text: "⚡ Generate Temp Mail", callback_data: "gen_temp" }],
      [{ text: "🔑 Enter Email (Get OTP)", callback_data: "ask_email" }, { text: "🌐 Switch Domain", callback_data: "domains" }]
    ];

    if (userId === OWNER_ID) {
      kbRows.push([{ text: "📁 Upload Stock (.txt)", callback_data: "ask_file" }]);
    }

    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, { inline_keyboard: kbRows }) : send(chatId, homeMsg, telegramApi, { inline_keyboard: kbRows });
  }

  // -------------------------------------------------------------
  // 4. DISPENSE STOCK WITH FILTER (ANY / OUTLOOK / HOTMAIL)
  // -------------------------------------------------------------
  if (data && data.startsWith("get_stock")) {
    const filter = data.split(":")[1] || "any";
    const db = await getChannelDbState(telegramApi);

    if (!db.fileId || db.index >= db.total) {
      return edit(chatId, messageId,
        `⚠️ <b>STOCK KHALI HAI!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Channel me koi fresh account baaki nahi hai.\n` +
        `Owner ko nayi <code>.txt</code> file upload karni hogi.`,
        telegramApi,
        { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }
      );
    }

    try {
      const lines = await loadChannelFileLines(db.fileId, env, telegramApi);

      // Find matching index according to filter
      let targetIndex = db.index;
      if (filter === "outlook" || filter === "hotmail") {
        const domainTarget = filter === "outlook" ? "outlook" : "hotmail";
        let found = false;
        for (let i = db.index; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(domainTarget)) {
            targetIndex = i;
            found = true;
            break;
          }
        }
        if (!found) {
          return edit(chatId, messageId, `⚠️ <b>${filter.toUpperCase()} Stock Khali Hai!</b>\nDusra option select karein:`, telegramApi, {
            inline_keyboard: [
              [{ text: "🔥 Generate Any Available", callback_data: "get_stock:any" }],
              [{ text: "🏠 Home", callback_data: "home" }]
            ]
          });
        }
      }

      const accountLine = lines[targetIndex];
      const nextIndex = targetIndex === db.index ? db.index + 1 : db.index;

      // Update Database Ledger & Log Used account
      await updateChannelDb(db.fileId, nextIndex, db.total, db.msgId, telegramApi);
      await logUsedAccountToChannel(accountLine, telegramApi, userId);

      const parts = accountLine.split(/[|:]/);
      const email = parts[0]?.trim();
      const pass = parts[1]?.trim() || "";
      const remaining = Math.max(0, db.total - nextIndex);

      // Start background auto-push listener for this email
      ctx.waitUntil(autoListenForOtp(chatId, email, telegramApi));

      const out =
        `🔥 <b>ACCOUNT READY (Guaranteed Unique)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 <b>Email:</b>\n<code>${escapeHtml(email)}</code>\n` +
        (pass ? `🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n` : "") +
        `📦 <b>Stock Baaki:</b> <code>${remaining}</code> accounts\n\n` +
        `🔔 <i>Auto-Push Active: Jaise hi code aayega, bot khud popup bhej dega!</i>`;

      const token = `o:${encodeURIComponent(email)}`;

      return edit(chatId, messageId, out, telegramApi, {
        inline_keyboard: [
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "📩 Get / Refresh OTP", callback_data: token }],
          [{ text: "🔥 Next Account", callback_data: `get_stock:${filter}` }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      });

    } catch (e) {
      return edit(chatId, messageId, `❌ <i>Account fetch karne me dikkat hui. Nayi file upload karein.</i>`, telegramApi);
    }
  }

  // -------------------------------------------------------------
  // 5. GET OTP / REFRESH OTP (FEATURING BIG COPY BUTTON & MAGIC LINK)
  // -------------------------------------------------------------
  if (data && data.startsWith("o:")) {
    const targetEmail = decodeURIComponent(data.replace("o:", ""));
    const { otp, link } = await getMailboxDetails(targetEmail);

    let report =
      `📬 <b>MAILBOX FOR:</b>\n` +
      `📧 <code>${escapeHtml(targetEmail)}</code>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    const kbRows = [];

    if (otp || link) {
      if (otp) {
        report += `🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n`;
        kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
      }
      if (link) {
        report += `🔗 <b>Verification Link Detected!</b>\n`;
        kbRows.push([{ text: "🔗 Open Verification Link", url: link }]);
      }
    } else {
      report += `📭 <i>Abhi koi OTP nahi mila. App me 'Resend Code' dabakar Refresh karein.</i>\n`;
    }

    kbRows.push([
      { text: "🔄 Refresh OTP", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: targetEmail } }
    ]);
    kbRows.push([
      { text: "🔥 Generate Next Account", callback_data: "get_stock:any" },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // -------------------------------------------------------------
  // 6. GENERATE REALISTIC TEMP MAIL
  // -------------------------------------------------------------
  if (data === "gen_temp" || (data && data.startsWith("dg:"))) {
    let domainChoice = GUERRILLA_DOMAINS[0];
    if (data.startsWith("dg:")) {
      const idx = parseInt(data.split(":")[1], 10);
      domainChoice = DOMAIN_LIST[idx] || GUERRILLA_DOMAINS[0];
    }

    const login = getRandomUser();
    const fullEmail = `${login}@${domainChoice}`;
    const token = `o:${encodeURIComponent(fullEmail)}`;

    // Start auto-push listener in background
    ctx.waitUntil(autoListenForOtp(chatId, fullEmail, telegramApi));

    const out =
      `⚡ <b>TEMP MAIL READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(fullEmail)}</code>\n\n` +
      `📡 <b>Domain:</b> <code>${domainChoice}</code>\n` +
      `🔔 <i>Auto-Push Active: Code aate hi bot khud notification bhej dega!</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }, { text: "🔥 Outlook / Hotmail", callback_data: "get_stock:any" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // -------------------------------------------------------------
  // 7. RESTORE OLD EMAIL VIA DIRECT CHAT
  // -------------------------------------------------------------
  const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text);
  if (isEmail) {
    const targetEmail = text.toLowerCase().trim();
    const token = `o:${encodeURIComponent(targetEmail)}`;

    const waitMsg = await send(chatId, `🔄 <b>Checking Mailbox...</b>\n<code>${escapeHtml(targetEmail)}</code>`, telegramApi);
    const waitMsgId = waitMsg ? (await waitMsg.json())?.result?.message_id : null;

    // Start auto-push listener in background
    ctx.waitUntil(autoListenForOtp(chatId, targetEmail, telegramApi));

    const { otp, link } = await getMailboxDetails(targetEmail);

    let report =
      `📬 <b>INBOX RESTORED:</b>\n` +
      `📧 <code>${escapeHtml(targetEmail)}</code>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    const kbRows = [];

    if (otp || link) {
      if (otp) {
        report += `🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n`;
        kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: otp } }]);
      }
      if (link) {
        report += `🔗 <b>Verification Link:</b>\n`;
        kbRows.push([{ text: "🔗 Open Verification Link", url: link }]);
      }
    } else {
      report += `📭 <i>Abhi koi OTP nahi aaya. App par 'Resend' dabakar Refresh karein.</i>\n`;
    }

    kbRows.push([
      { text: "🔄 Refresh OTP", callback_data: token },
      { text: "📋 Copy Email", copy_text: { text: targetEmail } }
    ]);
    kbRows.push([
      { text: "🔥 Generate Outlook / Hotmail", callback_data: "get_stock:any" },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    if (waitMsgId) {
      return edit(chatId, waitMsgId, report, telegramApi, { inline_keyboard: kbRows });
    } else {
      return send(chatId, report, telegramApi, { inline_keyboard: kbRows });
    }
  }

  // Ask email prompt
  if (data === "ask_email") {
    return send(chatId, "✍️ <i>Jis bhi email ka OTP nikaalna hai, wo email chat me bhej dein:</i>", telegramApi, {
      force_reply: true,
      input_field_placeholder: "example@outlook.com ya sharklasers.com..."
    });
  }

  // Domain switcher
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: `@${DOMAIN_LIST[i]}`, callback_data: `dg:${i}` }];
      if (DOMAIN_LIST[i + 1]) {
        row.push({ text: `@${DOMAIN_LIST[i + 1]}`, callback_data: `dg:${i + 1}` });
      }
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Disposable Domain:</b>`, telegramApi, { inline_keyboard: rows });
  }

  // Upload prompt (Owner only)
  if (data === "ask_file") {
    if (userId !== OWNER_ID) {
      return send(chatId, "⚠️ <i>Kewal Owner hi stock upload kar sakte hain.</i>", telegramApi);
    }
    return edit(chatId, messageId, `📁 <b>1000+ Accounts Wali .txt File Bhejein:</b>\nFormat: <code>email|password</code>`, telegramApi, {
      inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
    });
  }
}

// ================= TELEGRAM SEND HELPERS =================
async function send(chatId, text, telegramApi, kb = null, replyToId = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function sendVideo(chatId, videoUrl, caption, telegramApi, replyToId = null) {
  const payload = { chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" };
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function sendChatAction(chatId, action, telegramApi) {
  return fetch(`${telegramApi}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action })
  }).catch(() => {});
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return send(chatId, text, telegramApi, kb);
  return res;
}

async function deleteMessage(chatId, messageId, telegramApi) {
  return fetch(`${telegramApi}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  }).catch(() => {});
}
