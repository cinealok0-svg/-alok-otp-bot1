/**
 * Production-Grade Hotmail/Outlook Stock Dispenser & Auto-OTP Engine
 * Supports: .txt and .csv uploads (Email|Password|RefreshToken|ClientID)
 * Engine: Native Microsoft Graph API + Dongvan Fallback
 */

let PROCESSING_LOCK = false;

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Telegram API Helper
async function tg(method, body, env) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(() => null);
}

async function send(chatId, text, env, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tg("sendMessage", payload, env);
}

async function edit(chatId, messageId, text, env, replyMarkup = null) {
  const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tg("editMessageText", payload, env);
}

async function deleteMsg(chatId, messageId, env) {
  return tg("deleteMessage", { chat_id: chatId, message_id: messageId }, env);
}

// Universal OTP Parser
function extractOtp(subject, bodyText) {
  const combined = `${subject || ""} ${bodyText || ""}`;
  let clean = combined
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\s+/g, " ");

  const match = clean.match(/(?:code|otp|verification|pin|password|meta|facebook)\D{0,15}\b([0-9]{4,8})\b/i) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);

  return match ? (match[1] || match[0]) : null;
}

// Parse lines from TXT and CSV formats
function sanitizeLines(raw) {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const valid = [];
  const seen = new Set();
  
  for (let l of lines) {
    l = l.trim();
    if (l.length > 5 && l.includes("@")) {
      // Split by pipe '|', comma ',', or colon ':'
      const parts = l.includes("|") ? l.split("|") : (l.includes(",") ? l.split(",") : l.split(":"));
      const email = parts[0]?.trim().toLowerCase();
      if (email && email.includes("@") && !seen.has(email)) {
        seen.add(email);
        // Normalize line format as Email|Pass|RefreshToken|ClientID
        valid.push(parts.map(p => p.trim()).join("|"));
      }
    }
  }
  return valid;
}

// Microsoft Graph API & Dongvan Engine
async function fetchAccountOtp(line, env) {
  if (!line) return { otp: null };
  const parts = line.split("|");
  const email = parts[0]?.trim();
  const refreshToken = parts[2]?.trim();
  const clientId = parts[3]?.trim() || "9e5f94bc-e8a4-4e73-b8be-63364c29d753";
  const dongvanKey = env.DONGVAN_KEY || "2Vwu7ROX0jNK7J00kbo5fnhxw";

  // 1. Primary: Direct Microsoft OAuth2 Refresh & Graph Fetch
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
          const mRes = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=5&$orderby=receivedDateTime desc&$select=subject,bodyPreview,body", {
            headers: { "Authorization": `Bearer ${tData.access_token}` }
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            for (const item of (mData.value || [])) {
              const fullBody = `${item.bodyPreview || ""} ${item.body?.content || ""}`;
              const code = extractOtp(item.subject, fullBody);
              if (code) return { otp: code };
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. Secondary: Dongvan Endpoints Fallback
  try {
    const urls = [
      `https://api.dongvanfb.com/user/get_code_oauth?apikey=${dongvanKey}&mail=${encodeURIComponent(line.trim())}`,
      `https://api.dongvanfb.com/api/get_code?apikey=${dongvanKey}&mail=${encodeURIComponent(email)}`,
      `https://dongvanfb.net/read_mail_box/api.php?apikey=${dongvanKey}&email=${encodeURIComponent(line.trim())}&type=oauth2`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.ok) {
          const txt = await res.text();
          let json = null;
          try { json = JSON.parse(txt); } catch (e) {}
          const rawCode = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
          if (rawCode && String(rawCode).length >= 4) return { otp: String(rawCode) };
          const code = extractOtp("", txt);
          if (code) return { otp: code };
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null };
}

// Master Channel Ledger
async function getLedgerState(env) {
  try {
    const res = await tg("getChat", { chat_id: env.DB_CHANNEL_ID }, env);
    const pinned = res?.result?.pinned_message?.text || "";
    if (pinned.includes("ZERO_DUP_LEDGER:")) {
      const match = pinned.match(/ZERO_DUP_LEDGER:\s*(\{.*\})/s);
      if (match) {
        return { ...JSON.parse(match[1]), msgId: res.result.pinned_message.message_id };
      }
    }
  } catch (e) {}

  return { fileIds: [], currentIndex: 0, totalCount: 0, usedRegistry: {}, activeWorkers: {}, msgId: null };
}

async function saveLedgerState(state, env) {
  const remaining = Math.max(0, state.totalCount - state.currentIndex);
  const text = `🗄️ <b>MASTER STOCK DATABASE (ZERO-DUP ACTIVE)</b>\n━━━━━━━━━━━━━━━━━━\n📦 <b>Total Accounts:</b> <code>${state.totalCount}</code>\n📤 <b>Dispensed:</b> <code>${state.currentIndex}</code>\n✅ <b>Fresh Untouched:</b> <code>${remaining}</code>\n📁 <b>Files Connected:</b> <code>${state.fileIds.length}</code>\n━━━━━━━━━━━━━━━━━━\n<code>ZERO_DUP_LEDGER: ${JSON.stringify({
    fileIds: state.fileIds,
    currentIndex: state.currentIndex,
    totalCount: state.totalCount,
    usedRegistry: state.usedRegistry,
    activeWorkers: state.activeWorkers
  })}</code>`;

  if (state.msgId) {
    await tg("editMessageText", { chat_id: env.DB_CHANNEL_ID, message_id: state.msgId, text, parse_mode: "HTML" }, env);
  } else {
    const m = await send(env.DB_CHANNEL_ID, text, env);
    if (m?.result?.message_id) {
      await tg("pinChatMessage", { chat_id: env.DB_CHANNEL_ID, message_id: m.result.message_id, disable_notification: true }, env);
    }
  }
}

async function loadAllStockLines(fileIds, env) {
  let allLines = [];
  for (const fid of fileIds) {
    try {
      const fileInfo = await tg("getFile", { file_id: fid }, env);
      if (fileInfo?.result?.file_path) {
        const content = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
        allLines = allLines.concat(sanitizeLines(content));
      }
    } catch (e) {}
  }
  return allLines;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Bot Online & Configured via wrangler.toml", { status: 200 });
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

async function handleTelegramUpdate(update, env) {
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  let text = msg?.text?.trim() || "";
  const data = cb?.data;

  if (!chatId) return;
  text = text.replace(/@\w+bot/i, "").trim();

  if (cb?.id) tg("answerCallbackQuery", { callback_query_id: cb.id }, env);

  const ledger = await getLedgerState(env);
  const isOwner = (userId === String(env.OWNER_ID));

  // 1. FILE UPLOAD (.TXT & .CSV SUPPORT)
  if (msg?.document && isOwner) {
    const fileName = msg.document.file_name?.toLowerCase() || "";
    if (!fileName.endsWith(".txt") && !fileName.endsWith(".csv")) {
      return send(chatId, "⚠️ <i>Kripya sirf .txt ya .csv file upload karein!</i>", env);
    }

    const wait = await send(chatId, "⏳ <i>File read ki ja rahi hai aur duplicate filtering chal rahi hai...</i>", env);
    try {
      const fRes = await tg("sendDocument", {
        chat_id: env.DB_CHANNEL_ID,
        document: msg.document.file_id,
        caption: `📁 Stock File Uploaded: ${fileName}`
      }, env);
      const finalFileId = fRes?.result?.document?.file_id || msg.document.file_id;

      const fileInfo = await tg("getFile", { file_id: finalFileId }, env);
      const content = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
      const newValidLines = sanitizeLines(content);

      const existingAccounts = new Set(Object.keys(ledger.usedRegistry || {}));
      const allPrev = await loadAllStockLines(ledger.fileIds, env);
      allPrev.forEach(l => existingAccounts.add(l.split("|")[0].trim().toLowerCase()));

      let validNewCount = 0;
      let duplicateCount = 0;

      for (let l of newValidLines) {
        const email = l.split("|")[0].trim().toLowerCase();
        if (existingAccounts.has(email)) {
          duplicateCount++;
        } else {
          existingAccounts.add(email);
          validNewCount++;
        }
      }

      ledger.fileIds.push(finalFileId);
      ledger.totalCount += validNewCount;
      await saveLedgerState(ledger, env);

      const remaining = Math.max(0, ledger.totalCount - ledger.currentIndex);
      return edit(chatId, wait.result.message_id, `✅ <b>File Stock Me Safalta Se Add Ho Gayi!</b>\n━━━━━━━━━━━━━━━━━━\n📁 Format: <code>${fileName.endsWith('.csv') ? 'CSV' : 'TXT'}</code>\n➕ Naye Unique Accounts: <code>${validNewCount}</code>\n🚫 Duplicate (Skipped): <code>${duplicateCount}</code>\n📦 Total Stock: <code>${ledger.totalCount}</code>\n✅ Fresh Baaki: <code>${remaining}</code>`, env);
    } catch (e) {
      return edit(chatId, wait.result.message_id, "❌ File add karne me error aaya.", env);
    }
  }

  // 2. ADMIN DIRECT LIVE RE-OTP
  if (isOwner && text.startsWith("/getotp")) {
    const targetMail = text.split(" ")[1]?.trim().toLowerCase();
    if (!targetMail) return send(chatId, "⚠️ Format: <code>/getotp email@hotmail.com</code>", env);

    let accountLine = ledger.usedRegistry[targetMail];
    if (!accountLine) {
      const allLines = await loadAllStockLines(ledger.fileIds, env);
      accountLine = allLines.find(l => l.toLowerCase().startsWith(targetMail));
    }

    if (!accountLine) return send(chatId, `❌ Email <code>${targetMail}</code> stock record me nahi mila.`, env);

    const wait = await send(chatId, `🔍 <i>Live OTP nikaala ja raha hai: <code>${targetMail}</code>...</i>`, env);
    const { otp } = await fetchAccountOtp(accountLine, env);

    if (otp) {
      return edit(chatId, wait.result.message_id, `🔑 <b>LIVE OTP:</b> <code>${otp}</code>\n📧 <b>Email:</b> <code>${targetMail}</code>`, env, {
        inline_keyboard: [[{ text: `📋 Copy OTP: ${otp}`, copy_text: { text: otp } }]]
      });
    } else {
      return edit(chatId, wait.result.message_id, `⏳ <i>Koi OTP nahi mila. Dubara try karein.</i>`, env);
    }
  }

  // 3. ADMIN STOCK RESET / CLEAR
  if (isOwner && (text === "/clearstock" || data === "confirm_clear_stock")) {
    ledger.fileIds = [];
    ledger.currentIndex = 0;
    ledger.totalCount = 0;
    ledger.usedRegistry = {};
    ledger.activeWorkers = {};
    await saveLedgerState(ledger, env);
    
    const clearedMsg = "🧹 <b>Stock Successfully Cleared!</b>\nPura purana stock reset ho chuka hai. Ab aap naye सिरे se `.txt` ya `.csv` file upload kar sakte hain.";
    if (cb) return edit(chatId, cb.message.message_id, clearedMsg, env, { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "home" }]] });
    return send(chatId, clearedMsg, env);
  }

  // 4. MAIN MENU / START
  if (text === "/start" || data === "home") {
    const remaining = Math.max(0, ledger.totalCount - ledger.currentIndex);
    const welcome = `👋 <b>Hotmail / Outlook One-by-One Engine</b>\n━━━━━━━━━━━━━━━━━━\n📦 <b>Available Fresh Stock:</b> <code>${remaining}</code> Accounts\n🔒 <b>Duplicate Protection:</b> 100% Active\n━━━━━━━━━━━━━━━━━━\nNiche <b>Get Start</b> par tap karein, aapko ek single unique email milega:`;
    
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Get Start (Get Unique Email)", callback_data: "dispense_email" }]
      ]
    };

    if (isOwner) {
      kb.inline_keyboard.push([{ text: "📁 Upload Stock (.csv / .txt)", callback_data: "guide_upload" }]);
      kb.inline_keyboard.push([{ text: "🧹 Clear Old Stock (Reset All)", callback_data: "confirm_clear_stock" }]);
    }

    if (cb) return edit(chatId, cb.message.message_id, welcome, env, kb);
    return send(chatId, welcome, env, kb);
  }

  if (data === "guide_upload" && isOwner) {
    return send(chatId, "📁 <b>File Upload Instruction:</b>\nSeedhe <code>.txt</code> ya <code>.csv</code> file is chat me bhejein.\nFormat: <code>Email|Password|RefreshToken|ClientID</code>\nBot duplicates ko skip karke fresh stock update kar dega.", env);
  }

  // 5. ATOMIC DISPENSER
  if (data === "dispense_email") {
    if (ledger.activeWorkers && ledger.activeWorkers[userId]) {
      const activeMail = ledger.activeWorkers[userId];
      const activeCard = `⚠️ <b>Aapke Paas Pehle Se Ek Active Email Hai:</b>\n━━━━━━━━━━━━━━━━━━\n📬 <b>Email:</b> <code>${activeMail}</code>\n━━━━━━━━━━━━━━━━━━\n<i>Pehle iska OTP lein. Naya lene ke liye Cancel dabayein:</i>`;
      return edit(chatId, cb.message.message_id, activeCard, env, {
        inline_keyboard: [
          [{ text: "📩 Get OTP", callback_data: `read_otp:${encodeURIComponent(activeMail)}` }],
          [{ text: "🔄 Cancel & Get New Email", callback_data: `force_new_email` }]
        ]
      });
    }

    if (PROCESSING_LOCK) {
      return edit(chatId, cb.message.message_id, "⏳ <i>Server busy hai. 1 second baad dubara dabayein.</i>", env, {
        inline_keyboard: [[{ text: "🚀 Retry Now", callback_data: "dispense_email" }]]
      });
    }

    PROCESSING_LOCK = true;

    try {
      if (ledger.fileIds.length === 0 || ledger.currentIndex >= ledger.totalCount) {
        if (isOwner) send(env.OWNER_ID, "🚨 <b>ALERT: Stock pura khatam ho chuka hai!</b> Nayi file dalein.", env);
        PROCESSING_LOCK = false;
        return edit(chatId, cb.message.message_id, "❌ <b>Stock Khatam Ho Chuka Hai!</b>\nAdmin ko alert bhej diya gaya hai.", env, {
          inline_keyboard: [[{ text: "🏠 Refresh Menu", callback_data: "home" }]]
        });
      }

      const allLines = await loadAllStockLines(ledger.fileIds, env);
      const assignedIndex = ledger.currentIndex;
      const assignedLine = allLines[assignedIndex];
      const email = assignedLine.split("|")[0].trim().toLowerCase();

      ledger.currentIndex += 1;
      ledger.usedRegistry[email] = assignedLine;
      if (!ledger.activeWorkers) ledger.activeWorkers = {};
      ledger.activeWorkers[userId] = email;
      await saveLedgerState(ledger, env);

      PROCESSING_LOCK = false;

      const emailCard = `📧 <b>AAPKA EMAIL TAIYAR HAI:</b>\n━━━━━━━━━━━━━━━━━━\n📬 <b>Email:</b> <code>${email}</code>\n━━━━━━━━━━━━━━━━━━\n\n1️⃣ Email ko copy karke jahan verify karna hai wahan dalein.\n2️⃣ Wahan se OTP request bhejne ke baad <b>Get OTP</b> dabayein.`;

      const kb = {
        inline_keyboard: [
          [{ text: "📋 Copy Email", copy_text: { text: email } }],
          [{ text: "📩 Get OTP", callback_data: `read_otp:${encodeURIComponent(email)}` }],
          [{ text: "➡️ Agla Naya Email Chahiye", callback_data: "force_new_email" }]
        ]
      };
      return edit(chatId, cb.message.message_id, emailCard, env, kb);
    } catch (e) {
      PROCESSING_LOCK = false;
      return edit(chatId, cb.message.message_id, "❌ Technical issue aaya. Dubara koshish karein.", env, {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      });
    }
  }

  // Force Cancel & Get New
  if (data === "force_new_email") {
    if (ledger.activeWorkers && ledger.activeWorkers[userId]) {
      delete ledger.activeWorkers[userId];
      await saveLedgerState(ledger, env);
    }
    return handleTelegramUpdate({
      callback_query: { id: cb.id, message: cb.message, data: "dispense_email", from: cb.from }
    }, env);
  }

  // 6. READ OTP & ONE-TAP COPY
  if (data?.startsWith("read_otp:") || data?.startsWith("ref_otp:")) {
    const rawMail = data.startsWith("read_otp:") ? data.replace("read_otp:", "") : data.replace("ref_otp:", "");
    const email = decodeURIComponent(rawMail);
    const accountLine = ledger.usedRegistry[email];

    if (!accountLine) return send(chatId, "❌ Email session expire ho gaya.", env);

    const wait = await send(chatId, "🔍 <i>Checking inbox for OTP via Microsoft Graph API...</i>", env);
    const { otp } = await fetchAccountOtp(accountLine, env);

    if (otp) {
      await deleteMsg(chatId, wait?.result?.message_id, env);
      
      if (ledger.activeWorkers && ledger.activeWorkers[userId]) {
        delete ledger.activeWorkers[userId];
        await saveLedgerState(ledger, env);
      }

      const resMsg = `🔔 <b>OTP AA GAYA HAI!</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Email:</b> <code>${email}</code>\n🔑 <b>OTP Code:</b> <code>${otp}</code>\n━━━━━━━━━━━━━━━━━━\n<i>Niche diye button par tap karke copy karein:</i>`;
      return send(chatId, resMsg, env, {
        inline_keyboard: [
          [{ text: `📋 TAP TO COPY: ${otp}`, copy_text: { text: otp } }],
          [{ text: "➡️ Agla Naya Email Le", callback_data: "dispense_email" }],
          [{ text: "🏠 Main Menu", callback_data: "home" }]
        ]
      });
    } else {
      await deleteMsg(chatId, wait?.result?.message_id, env);
      return send(chatId, `⏳ <b>Abhi tak OTP nahi mila!</b>\nEmail: <code>${email}</code>\n\nKripya 10-15 second ruk kar Refresh dabayein:`, env, {
        inline_keyboard: [
          [{ text: "🔄 Refresh OTP", callback_data: `ref_otp:${encodeURIComponent(email)}` }],
          [{ text: "➡️ Naya Email Le", callback_data: "force_new_email" }]
        ]
      });
    }
  }
}
