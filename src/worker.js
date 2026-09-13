/**
 * Production Enterprise Meta AI Task Manager
 * Platform: Cloudflare Worker / Serverless V8
 * Architecture: Telegram Channel as Persistent Ledger (Zero Data Loss)
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DONGVAN_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";

// --- PERSISTENCE IN PINNED LEDGER ---
let CACHED_FILE_ID = null;
let CACHED_LINES = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      if (!seen.has(email)) { seen.add(email); valid.push(l); }
    }
  }
  return valid;
}

// --- TELEGRAM CALLS ---
async function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(() => null);
}

async function send(chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tg("sendMessage", payload);
}

async function edit(chatId, messageId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tg("editMessageText", payload);
}

async function deleteMsg(chatId, messageId) {
  return tg("deleteMessage", { chat_id: chatId, message_id: messageId });
}

// --- META OTP PARSER ---
function extractMetaOtp(subject, bodyText) {
  const combined = `${subject || ""} ${bodyText || ""}`;
  let clean = combined
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\s+/g, " ");

  const match = clean.match(/(?:meta|facebook|fb|code|verification|otp)\D{0,15}\b([0-9]{6,8})\b/i) ||
                clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/);

  return match ? (match[1] || match[0]) : null;
}

// --- OUTLOOK / GRAPH ENGINE ---
async function fetchAccountOtp(line) {
  if (!line) return { otp: null };
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
              const code = extractMetaOtp(item.subject, fullBody);
              if (code) return { otp: code };
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
          if (rawCode && String(rawCode).length >= 4) return { otp: String(rawCode) };
          const code = extractMetaOtp("", txt);
          if (code) return { otp: code };
        }
      } catch (e) {}
    }
  } catch (e) {}

  return { otp: null };
}

// --- PERSISTENT CHANNEL LEDGER ---
async function getLedgerState() {
  try {
    const res = await tg("getChat", { chat_id: DB_CHANNEL_ID });
    const pinned = res?.result?.pinned_message?.text || "";
    if (pinned.includes("DB_STORE:")) {
      const matchFile = pinned.match(/FILE:([a-zA-Z0-9_-]+)/);
      const matchIdx = pinned.match(/IDX:(\d+)/);
      const matchTotal = pinned.match(/TOTAL:(\d+)/);
      const matchPrice = pinned.match(/PRICE:(\d+(\.\d+)?)/);
      return {
        fileId: matchFile ? matchFile[1] : null,
        index: matchIdx ? parseInt(matchIdx[1], 10) : 0,
        total: matchTotal ? parseInt(matchTotal[1], 10) : 0,
        price: matchPrice ? parseFloat(matchPrice[1]) : 4,
        msgId: res.result.pinned_message.message_id
      };
    }
  } catch (e) {}
  return { fileId: null, index: 0, total: 0, price: 4, msgId: null };
}

async function loadStockLines(fileId) {
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) return CACHED_LINES;
  const fileInfo = await tg("getFile", { file_id: fileId });
  const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
  const lines = sanitizeLines(content);
  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
}

async function updateLedger(fileId, newIndex, total, price, msgId) {
  const remaining = Math.max(0, total - newIndex);
  const dbText = `🗄️ <b>MASTER SYSTEM LEDGER</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total Accounts: <code>${total}</code>\n📤 Used / Given: <code>${newIndex}</code>\n✅ Fresh Remaining: <code>${remaining}</code>\n💰 Task Price: <b>₹${price}</b>\n━━━━━━━━━━━━━━━━━━\n<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total} PRICE:${price}</code>`;
  if (msgId) {
    await tg("editMessageText", { chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" });
  }
}

// --- WORKER ROUTER ---
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Bot Core Active", { status: 200 });
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// --- UPDATE HANDLER ---
async function handleTelegramUpdate(update, ctx) {
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  const userName = msg?.from?.username || cb?.from?.username || msg?.from?.first_name || "Worker";
  let text = msg?.text?.trim() || "";
  const data = cb?.data;

  if (!chatId) return;
  text = text.replace(/@\w+bot/i, "").trim();

  if (cb?.id) tg("answerCallbackQuery", { callback_query_id: cb.id });

  const ledger = await getLedgerState();
  const isAdmin = (userId === PRIMARY_OWNER_ID);

  // 1. STOCK UPLOAD (.txt)
  if (msg?.document && isAdmin) {
    if (!msg.document.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Kewal .txt file upload karein!</i>");
    const wait = await send(chatId, "⏳ <i>File verify ho rahi hai...</i>");
    const waitId = wait?.result?.message_id;

    try {
      const fRes = await tg("sendDocument", {
        chat_id: DB_CHANNEL_ID,
        document: msg.document.file_id,
        caption: `📁 Master Stock Uploaded`
      });
      const finalFileId = fRes?.result?.document?.file_id || msg.document.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadStockLines(finalFileId);

      const dbText = `🗄️ <b>MASTER SYSTEM LEDGER</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total Accounts: <code>${lines.length}</code>\n📤 Used / Given: <code>0</code>\n✅ Fresh Remaining: <code>${lines.length}</code>\n💰 Task Price: <b>₹${ledger.price}</b>\n━━━━━━━━━━━━━━━━━━\n<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length} PRICE:${ledger.price}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText);
      if (dbMsg?.result?.message_id) {
        await tg("pinChatMessage", { chat_id: DB_CHANNEL_ID, message_id: dbMsg.result.message_id, disable_notification: true });
      }
      return edit(chatId, waitId, `✅ <b>${lines.length} Fresh Emails Ready!</b>\nWorkers ab bina kisi rukawat ke task kar sakte hain.`);
    } catch (e) {
      return edit(chatId, waitId, "❌ Error saving stock.");
    }
  }

  // 2. LIVE RE-OTP FOR ANY OLD EMAIL (Admin Tool)
  if (isAdmin && (text.startsWith("/getotp") || data?.startsWith("get_old_otp:"))) {
    let targetEmail = "";
    if (text.startsWith("/getotp")) {
      targetEmail = text.split(" ")[1]?.trim().toLowerCase();
    } else {
      targetEmail = data.replace("get_old_otp:", "").trim().toLowerCase();
    }

    if (!targetEmail) return send(chatId, "⚠️ Command format: <code>/getotp email@outlook.com</code>");

    const wait = await send(chatId, `🔍 <i>Fetching live OTP for <code>${targetEmail}</code>...</i>`);
    const lines = await loadStockLines(ledger.fileId);
    const matchedLine = lines.find(l => l.toLowerCase().startsWith(targetEmail));

    if (!matchedLine) {
      return edit(chatId, wait?.result?.message_id, `❌ Email <code>${targetEmail}</code> stock record me nahi mila.`);
    }

    const { otp } = await fetchAccountOtp(matchedLine);
    if (otp) {
      return edit(chatId, wait?.result?.message_id, `🔑 <b>LIVE META OTP:</b> <code>${otp}</code>\n📧 <b>Email:</b> <code>${targetEmail}</code>`);
    } else {
      return edit(chatId, wait?.result?.message_id, `❌ Koi naya OTP nahi mila. Dubara try karein.`);
    }
  }

  // 3. SET TASK PRICE
  if (isAdmin && text.startsWith("/setprice")) {
    const newPrice = parseFloat(text.split(" ")[1]?.trim());
    if (!isNaN(newPrice)) {
      await updateLedger(ledger.fileId, ledger.index, ledger.total, newPrice, ledger.msgId);
      return send(chatId, `✅ <b>Task Price Updated:</b> ₹${newPrice} per account`);
    }
  }

  // 4. PASSWORD SUBMISSION WITH AUTO-DELETE
  if (msg && msg.reply_to_message && msg.reply_to_message.text.includes("Meta AI Password yahan")) {
    const submittedPassword = text;
    const promptMsgId = msg.reply_to_message.message_id;
    const workerMsgId = msg.message_id;

    // Secure Auto-Delete: Wipe credentials immediately from worker chat
    await deleteMsg(chatId, workerMsgId);
    await deleteMsg(chatId, promptMsgId);

    const emailMatch = msg.reply_to_message.text.match(/Email:\s*([^\s\n]+)/);
    const assignedEmail = emailMatch ? emailMatch[1] : "Unknown";

    const submissionText = `📥 <b>NEW META ACCOUNT SUBMISSION</b>\n━━━━━━━━━━━━━━━━━━\n👤 <b>Worker:</b> @${userName} (ID: <code>${userId}</code>)\n📧 <b>Email:</b> <code>${assignedEmail}</code>\n🔑 <b>Password:</b> <code>${escapeHtml(submittedPassword)}</code>\n💰 <b>Rate:</b> ₹${ledger.price}\n━━━━━━━━━━━━━━━━━━`;
    const reviewKb = {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `ap:${userId}:${ledger.price}` },
          { text: "❌ Reject", callback_data: `rj:${userId}` }
        ],
        [
          { text: "📩 Fetch OTP Again", callback_data: `get_old_otp:${assignedEmail}` }
        ]
      ]
    };
    await send(DB_CHANNEL_ID, submissionText, reviewKb);

    return send(chatId, "✅ <b>Data Submitted Successfully!</b>\n\nAapka password chat se delete kar diya gaya hai. Admin check karke ise approve karenge.", {
      inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "home" }]]
    });
  }

  // 5. CHANNEL APPROVAL / REJECTION BUTTONS
  if (data?.startsWith("ap:") || data?.startsWith("rj:")) {
    if (!isAdmin) return;

    if (data.startsWith("ap:")) {
      const [, targetUser, rew] = data.split(":");
      await edit(chatId, cb.message.message_id, `${cb.message.text}\n\n✅ <b>APPROVED BY ADMIN (+₹${rew})</b>`);
      return send(targetUser, `🎉 <b>Task Approved!</b>\n💰 ₹${rew} aapke account me jud gaye hain.`);
    }

    if (data.startsWith("rj:")) {
      const [, targetUser] = data.split(":");
      await edit(chatId, cb.message.message_id, `${cb.message.text}\n\n❌ <b>REJECTED BY ADMIN</b>`);
      return send(targetUser, "⚠️ <b>Aapka task reject ho gaya hai.</b> Kripya sahi account details submit karein.");
    }
  }

  // 6. MAIN MENU / NAVIGATION
  if (text === "/start" || data === "home") {
    const homeText = `🤖 <b>Meta AI Work Portal</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Current Rate:</b> ₹${ledger.price} per account\n\nEk email sirf ek hi worker ko milta hai. Niche button dabakar task shuru karein:`;
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Start Meta Task", callback_data: "claim_task" }],
        [{ text: "💳 Withdraw Earnings", callback_data: "withdraw" }],
        [{ text: "📺 How to Complete Task", url: "https://t.me/" }]
      ]
    };
    if (isAdmin) {
      kb.inline_keyboard.push([{ text: "⚙️ Admin Controls", callback_data: "admin_panel" }]);
    }
    if (cb) return edit(chatId, cb.message.message_id, homeText, kb);
    return send(chatId, homeText, kb);
  }

  // 7. WITHDRAW FLOW
  if (data === "withdraw") {
    const wText = `💵 <b>PAYOUT SYSTEM</b>\n━━━━━━━━━━━━━━━━━━\nApna payment lene ke liye niche direct Admin se sampark karein:`;
    return edit(chatId, cb.message.message_id, wText, {
      inline_keyboard: [
        [{ text: "💬 Contact Admin", url: `tg://user?id=${PRIMARY_OWNER_ID}` }],
        [{ text: "🔙 Back", callback_data: "home" }]
      ]
    });
  }

  // 8. ADMIN PANEL
  if (data === "admin_panel" && isAdmin) {
    const remaining = Math.max(0, ledger.total - ledger.index);
    const admText = `⚙️ <b>ADMIN MANAGEMENT PANEL</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Rate:</b> ₹${ledger.price}\n📦 <b>Total Stock:</b> ${ledger.total}\n📤 <b>Given:</b> ${ledger.index}\n✅ <b>Remaining:</b> ${remaining}\n━━━━━━━━━━━━━━━━━━\n<i>Naya stock upload karne ke liye seedhe .txt file yahan bhejein.</i>`;
    return edit(chatId, cb.message.message_id, admText, {
      inline_keyboard: [
        [{ text: "✏️ Set Task Price", callback_data: "adm_price_info" }],
        [{ text: "🔙 Back", callback_data: "home" }]
      ]
    });
  }

  if (data === "adm_price_info" && isAdmin) {
    return send(chatId, "Price change karne ke liye command bhejein:\n<code>/setprice 5</code>");
  }

  // 9. CLAIM UNIQUE TASK
  if (data === "claim_task") {
    if (!ledger.fileId || ledger.index >= ledger.total) {
      await send(PRIMARY_OWNER_ID, "🚨 <b>ALERT: Stock khatam ho chuka hai!</b> Kripya nayi .txt file upload karein.");
      return edit(chatId, cb.message.message_id, "❌ <b>Stock Khatam Hai!</b>\nAdmin ko notice bhej diya gaya hai. Thodi der baad check karein.", {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    const lines = await loadStockLines(ledger.fileId);
    const assignedIndex = ledger.index;
    const assignedLine = lines[assignedIndex];
    const email = assignedLine.split(/[|:]/)[0].trim().toLowerCase();

    // Advance single-use index permanently
    await updateLedger(ledger.fileId, assignedIndex + 1, ledger.total, ledger.price, ledger.msgId);

    const taskText = `📋 <b>META AI TASK ASSIGNED</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Assigned Email:</b> <code>${email}</code>\n\n1️⃣ Upar diye gaye email se Meta AI account banayein.\n2️⃣ <b>Get OTP</b> dabakar code lein.\n3️⃣ Account bante hi <b>Submit Password</b> dabayein.\n━━━━━━━━━━━━━━━━━━`;
    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: email } }],
        [{ text: "📩 Get OTP", callback_data: `get_task_otp:${assignedIndex}` }],
        [{ text: "🔑 Submit Password", callback_data: `submit_pass:${assignedIndex}` }]
      ]
    };
    return edit(chatId, cb.message.message_id, taskText, kb);
  }

  // 10. FETCH OTP / REFRESH
  if (data?.startsWith("get_task_otp:") || data?.startsWith("ref_task_otp:")) {
    const idx = parseInt(data.split(":")[1], 10);
    const lines = await loadStockLines(ledger.fileId);
    const accountLine = lines[idx];

    const wait = await send(chatId, "🔍 <i>Checking inbox for Meta AI OTP...</i>");
    const { otp } = await fetchAccountOtp(accountLine);

    if (otp) {
      await deleteMsg(chatId, wait?.result?.message_id);
      return send(chatId, `🔑 <b>META AI OTP:</b> <code>${otp}</code>\n\nAccount verify karke niche <b>Submit Password</b> dabayein.`, {
        inline_keyboard: [
          [{ text: `📋 Copy OTP: ${otp}`, copy_text: { text: otp } }],
          [{ text: "🔑 Submit Password", callback_data: `submit_pass:${idx}` }]
        ]
      });
    } else {
      await deleteMsg(chatId, wait?.result?.message_id);
      return send(chatId, "⏳ <i>OTP nahi mila. 10 second ruk kar Refresh dabayein.</i>", {
        inline_keyboard: [
          [{ text: "🔄 Refresh OTP", callback_data: `ref_task_otp:${idx}` }],
          [{ text: "🔑 Submit Password", callback_data: `submit_pass:${idx}` }]
        ]
      });
    }
  }

  // 11. SUBMIT PASSWORD TRIGGER
  if (data?.startsWith("submit_pass:")) {
    const idx = parseInt(data.split(":")[1], 10);
    const lines = await loadStockLines(ledger.fileId);
    const email = lines[idx]?.split(/[|:]/)[0].trim().toLowerCase() || "Account";

    return send(chatId, `🔑 <b>Meta AI Password yahan Reply karein:</b>\nEmail: <code>${email}</code>\n\n<i>(Is message par reply karke apna banaya hua password bhejein. Data turant auto-delete ho jayega)</i>`, {
      force_reply: true
    });
  }
}
