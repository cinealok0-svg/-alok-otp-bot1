/**
 * Production Enterprise Meta AI Bot (Multi-Worker + Multi-Admin Architecture)
 * Engine: Outlook / Graph / Dongvan
 * Storage: Private Telegram Channel as Persistent Ledger
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DONGVAN_KEY = "2Vwu7ROX0jNK7J00kbo5fnhxw";

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

// --- TELEGRAM HTTP CALLS ---
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

// --- META OTP EXTRACTION ---
function extractMetaOtp(subject, bodyText) {
  const combined = `${subject || ""} ${bodyText || ""}`;
  let clean = combined
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\s+/g, " ");

  const match = clean.match(/(?:meta|facebook|fb|code|verification|otp|security)\D{0,15}\b([0-9]{6,8})\b/i) ||
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

// --- CHANNEL MASTER DATABASE LEDGER ---
async function getLedgerState() {
  try {
    const res = await tg("getChat", { chat_id: DB_CHANNEL_ID });
    const pinned = res?.result?.pinned_message?.text || "";
    if (pinned.includes("MASTER_SYSTEM_CONFIG:")) {
      const match = pinned.match(/MASTER_SYSTEM_CONFIG:\s*(\{.*\})/s);
      if (match) {
        const cfg = JSON.parse(match[1]);
        return { ...cfg, msgId: res.result.pinned_message.message_id };
      }
    }
  } catch (e) {}

  return {
    admins: [PRIMARY_OWNER_ID],
    price: 4,
    fileIds: [],
    currentIndex: 0,
    totalCount: 0,
    usedMap: {},     // email -> full line
    workers: {},     // userId -> { username, approved, pending, balance }
    msgId: null
  };
}

async function saveLedgerState(state) {
  const cleanState = {
    admins: Array.from(new Set(state.admins || [PRIMARY_OWNER_ID])),
    price: state.price || 4,
    fileIds: state.fileIds || [],
    currentIndex: state.currentIndex || 0,
    totalCount: state.totalCount || 0,
    usedMap: state.usedMap || {},
    workers: state.workers || {}
  };

  const remaining = Math.max(0, cleanState.totalCount - cleanState.currentIndex);
  const activeWorkersCount = Object.keys(cleanState.workers).length;

  const text = `🗄️ <b>MASTER SYSTEM LEDGER & DATABASE</b>\n━━━━━━━━━━━━━━━━━━\n👑 <b>Admins:</b> <code>${cleanState.admins.join(", ")}</code>\n💰 <b>Task Rate:</b> ₹${cleanState.price}\n📦 <b>Total Stock:</b> ${cleanState.totalCount}\n📤 <b>Given Out:</b> ${cleanState.currentIndex}\n✅ <b>Fresh Stock Left:</b> ${remaining}\n👥 <b>Total Workers:</b> ${activeWorkersCount}\n📁 <b>Files Loaded:</b> ${cleanState.fileIds.length}\n━━━━━━━━━━━━━━━━━━\n<code>MASTER_SYSTEM_CONFIG: ${JSON.stringify(cleanState)}</code>`;

  if (state.msgId) {
    await tg("editMessageText", { chat_id: DB_CHANNEL_ID, message_id: state.msgId, text, parse_mode: "HTML" });
  } else {
    const m = await send(DB_CHANNEL_ID, text);
    if (m?.result?.message_id) {
      await tg("pinChatMessage", { chat_id: DB_CHANNEL_ID, message_id: m.result.message_id, disable_notification: true });
    }
  }
}

async function loadAllStockLines(fileIds) {
  let allLines = [];
  for (const fid of fileIds) {
    try {
      const fileInfo = await tg("getFile", { file_id: fid });
      if (fileInfo?.result?.file_path) {
        const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
        const lines = sanitizeLines(content);
        allLines = allLines.concat(lines);
      }
    } catch (e) {}
  }
  return allLines;
}

// --- WORKER ENTRY ---
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

// --- CONTROLLER ROUTER ---
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
  const isAdmin = ledger.admins.includes(userId) || (userId === PRIMARY_OWNER_ID);

  // Auto-init worker profile if not present
  if (!ledger.workers[userId]) {
    ledger.workers[userId] = { username: userName, approved: 0, pending: 0, balance: 0 };
  } else {
    ledger.workers[userId].username = userName; // keep username fresh
  }

  // ================= ADMIN CONTROLS =================
  if (isAdmin) {
    // 1. FILE UPLOADER (Supports multiple files, appends seamlessly)
    if (msg?.document) {
      if (!msg.document.file_name?.endsWith(".txt")) {
        return send(chatId, "⚠️ <i>Kewal .txt file bhejein!</i>");
      }
      const wait = await send(chatId, "⏳ <i>File read ki ja rahi hai...</i>");
      const waitId = wait?.result?.message_id;

      try {
        const fRes = await tg("sendDocument", {
          chat_id: DB_CHANNEL_ID,
          document: msg.document.file_id,
          caption: `📁 File #${ledger.fileIds.length + 1} added by @${userName}`
        });
        const finalFileId = fRes?.result?.document?.file_id || msg.document.file_id;

        const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${(await tg("getFile", { file_id: finalFileId })).result.file_path}`).then(r => r.text());
        const newLines = sanitizeLines(content);

        ledger.fileIds.push(finalFileId);
        ledger.totalCount += newLines.length;
        await saveLedgerState(ledger);

        const remaining = Math.max(0, ledger.totalCount - ledger.currentIndex);
        return edit(chatId, waitId, `✅ <b>File #${ledger.fileIds.length} Jud Gayi Hai!</b>\n━━━━━━━━━━━━━━━━━━\n➕ Is file me accounts: <code>${newLines.length}</code>\n📦 Master Total Stock: <code>${ledger.totalCount}</code>\n✅ Fresh Remaining: <code>${remaining}</code>`);
      } catch (e) {
        return edit(chatId, waitId, "❌ File add karne me error aaya.");
      }
    }

    // 2. LIVE SEARCH OTP (FOR ANY OLD / NEW EMAIL)
    if (text.startsWith("/getotp") || data?.startsWith("fetch_old_otp:")) {
      let targetMail = "";
      if (text.startsWith("/getotp")) {
        targetMail = text.split(" ")[1]?.trim().toLowerCase();
      } else {
        targetMail = data.replace("fetch_old_otp:", "").trim().toLowerCase();
      }

      if (!targetMail) return send(chatId, "⚠️ Format: <code>/getotp email@outlook.com</code>");

      const wait = await send(chatId, `🔍 <i>Live Meta OTP dhundha ja raha hai: <code>${targetMail}</code>...</i>`);
      
      let accountLine = ledger.usedMap[targetMail];
      if (!accountLine) {
        const allLines = await loadAllStockLines(ledger.fileIds);
        accountLine = allLines.find(l => l.toLowerCase().startsWith(targetMail));
      }

      if (!accountLine) {
        return edit(chatId, wait?.result?.message_id, `❌ Email <code>${targetMail}</code> stock record me nahi mila.`);
      }

      const { otp } = await fetchAccountOtp(accountLine);
      if (otp) {
        return edit(chatId, wait?.result?.message_id, `🔑 <b>LIVE META OTP:</b> <code>${otp}</code>\n📧 <b>Email:</b> <code>${targetMail}</code>`);
      } else {
        return edit(chatId, wait?.result?.message_id, `⏳ <b>Koi naya OTP nahi mila.</b> Thodi der baad check karein.`);
      }
    }

    // 3. VIEW ALL WORKERS LIST (Individual Accounts & Due Payouts)
    if (text === "/workers" || data === "adm_view_workers") {
      const uids = Object.keys(ledger.workers);
      if (uids.length === 0) return send(chatId, "📋 Abhi tak koi worker register nahi hua hai.");

      let report = `📊 <b>ALL WORKERS REAL-TIME LEDGER</b>\n━━━━━━━━━━━━━━━━━━\n\n`;
      let totalDue = 0;
      let count = 1;

      for (const uid of uids) {
        const w = ledger.workers[uid];
        if (w.approved > 0 || w.pending > 0 || w.balance > 0) {
          report += `${count}. <b>@${escapeHtml(w.username)}</b> (<code>${uid}</code>)\n   • Approved: <b>${w.approved}</b> | Pending: <b>${w.pending}</b>\n   • Payable Due: <b>₹${w.balance}</b>\n   • Action: <code>/pay ${uid}</code>\n\n`;
          totalDue += w.balance;
          count++;
        }
      }

      report += `━━━━━━━━━━━━━━━━━━\n💰 <b>Total Payable Amount: ₹${totalDue}</b>`;
      if (cb) return edit(chatId, cb.message.message_id, report, { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] });
      return send(chatId, report);
    }

    // 4. SEARCH INDIVIDUAL WORKER DETAILS
    if (text.startsWith("/user")) {
      const targetId = text.split(" ")[1]?.trim();
      const w = ledger.workers[targetId];
      if (!w) return send(chatId, `❌ Worker ID <code>${targetId}</code> nahi mili.`);

      const uCard = `👤 <b>WORKER PROFILE RECORD</b>\n━━━━━━━━━━━━━━━━━━\n🆔 <b>User ID:</b> <code>${targetId}</code>\n👤 <b>Username:</b> @${escapeHtml(w.username)}\n✅ <b>Approved Tasks:</b> ${w.approved}\n⏳ <b>Pending Review:</b> ${w.pending}\n💰 <b>Balance Due:</b> ₹${w.balance}\n━━━━━━━━━━━━━━━━━━\n<i>Paisa transfer karne ke baad likhein:</i> <code>/pay ${targetId}</code>`;
      return send(chatId, uCard);
    }

    // 5. MARK AS PAID / RESET BALANCE FOR WORKER
    if (text.startsWith("/pay")) {
      const targetId = text.split(" ")[1]?.trim();
      if (ledger.workers[targetId]) {
        const paidAmount = ledger.workers[targetId].balance;
        ledger.workers[targetId].balance = 0;
        await saveLedgerState(ledger);
        
        await send(targetId, `🎉 <b>Payment Cleared!</b>\nAdmin ne aapka <b>₹${paidAmount}</b> ka payout complete kar diya hai.`);
        return send(chatId, `✅ Worker <code>${targetId}</code> ko ₹${paidAmount} paid mark kar diya gaya hai (Balance reset to 0).`);
      } else {
        return send(chatId, `❌ User ID galat hai ya exist nahi karti.`);
      }
    }

    // 6. ADMIN MANAGEMENT COMMANDS
    if (text.startsWith("/addadmin")) {
      const newAdmin = text.split(" ")[1]?.trim();
      if (newAdmin && !ledger.admins.includes(newAdmin)) {
        ledger.admins.push(newAdmin);
        await saveLedgerState(ledger);
        return send(chatId, `✅ <code>${newAdmin}</code> successfully <b>Admin</b> ban gaya!`);
      }
    }

    if (text.startsWith("/deladmin")) {
      const remAdmin = text.split(" ")[1]?.trim();
      if (remAdmin && remAdmin !== PRIMARY_OWNER_ID) {
        ledger.admins = ledger.admins.filter(a => a !== remAdmin);
        await saveLedgerState(ledger);
        return send(chatId, `✅ Admin <code>${remAdmin}</code> removed.`);
      }
    }

    // 7. SET PRICE
    if (text.startsWith("/setprice")) {
      const p = parseFloat(text.split(" ")[1]?.trim());
      if (!isNaN(p) && p > 0) {
        ledger.price = p;
        await saveLedgerState(ledger);
        return send(chatId, `✅ <b>Task Price Updated:</b> ₹${p} per account.`);
      }
    }
  }

  // ================= WORKER PASSWORD SUBMISSION (AUTO-DELETE) =================
  if (msg && msg.reply_to_message && msg.reply_to_message.text.includes("Meta AI Password yahan")) {
    const submittedPassword = text;
    const promptMsgId = msg.reply_to_message.message_id;
    const workerMsgId = msg.message_id;

    // Wipe sensitive data from worker chat instantly
    await deleteMsg(chatId, workerMsgId);
    await deleteMsg(chatId, promptMsgId);

    const emailMatch = msg.reply_to_message.text.match(/Email:\s*([^\s\n]+)/);
    const assignedEmail = emailMatch ? emailMatch[1] : "Unknown";

    // Track pending in worker ledger
    ledger.workers[userId].pending += 1;
    await saveLedgerState(ledger);

    const submissionCard = `📥 <b>NEW SUBMISSION REVIEW</b>\n━━━━━━━━━━━━━━━━━━\n👤 <b>Worker:</b> @${userName} (ID: <code>${userId}</code>)\n📧 <b>Meta Email:</b> <code>${assignedEmail}</code>\n🔑 <b>Password:</b> <code>${escapeHtml(submittedPassword)}</code>\n💰 <b>Reward:</b> ₹${ledger.price}\n━━━━━━━━━━━━━━━━━━`;
    
    const reviewKb = {
      inline_keyboard: [
        [
          { text: "✅ Approve Task", callback_data: `ap:${userId}:${ledger.price}` },
          { text: "❌ Reject", callback_data: `rj:${userId}` }
        ],
        [
          { text: "📩 Fetch OTP Again", callback_data: `fetch_old_otp:${assignedEmail}` }
        ]
      ]
    };
    await send(DB_CHANNEL_ID, submissionCard, reviewKb);

    return send(chatId, "✅ <b>Data Successfully Submitted!</b>\n\nAapka password chat se auto-delete ho gaya hai. Admin check karke ise approve karenge.", {
      inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "home" }]]
    });
  }

  // ================= ADMIN CHANNEL APPROVAL / REJECTION =================
  if (data?.startsWith("ap:") || data?.startsWith("rj:")) {
    if (!isAdmin) return;

    if (data.startsWith("ap:")) {
      const [, targetUser, rew] = data.split(":");
      const reward = parseFloat(rew);

      if (ledger.workers[targetUser]) {
        ledger.workers[targetUser].approved += 1;
        ledger.workers[targetUser].pending = Math.max(0, ledger.workers[targetUser].pending - 1);
        ledger.workers[targetUser].balance += reward;
        await saveLedgerState(ledger);
      }

      await edit(chatId, cb.message.message_id, `${cb.message.text}\n\n✅ <b>APPROVED BY @${userName} (+₹${reward})</b>`);
      return send(targetUser, `🎉 <b>Badhai ho!</b> Aapka Meta AI task approve ho gaya hai.\n💰 <b>₹${reward}</b> wallet me jud gaye!`);
    }

    if (data.startsWith("rj:")) {
      const [, targetUser] = data.split(":");
      if (ledger.workers[targetUser]) {
        ledger.workers[targetUser].pending = Math.max(0, ledger.workers[targetUser].pending - 1);
        await saveLedgerState(ledger);
      }

      await edit(chatId, cb.message.message_id, `${cb.message.text}\n\n❌ <b>REJECTED BY @${userName}</b>`);
      return send(targetUser, "⚠️ <b>Aapka task reject ho gaya hai.</b> Kripya sahi details dubara banayein.");
    }
  }

  // ================= MAIN USER MENU =================
  if (text === "/start" || data === "home") {
    const w = ledger.workers[userId];
    const remaining = Math.max(0, ledger.totalCount - ledger.currentIndex);

    const homeText = `🤖 <b>Meta AI Account Creation Portal</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Task Rate:</b> ₹${ledger.price} per account\n💳 <b>Aapka Balance:</b> ₹${w.balance}\n✅ <b>Approved Tasks:</b> ${w.approved}\n⏳ <b>Pending:</b> ${w.pending}\n━━━━━━━━━━━━━━━━━━\n<i>Niche diye gaye button par tap karke naya email lein:</i>`;
    
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Start Meta Task", callback_data: "claim_task" }],
        [{ text: "💳 Withdraw Earnings", callback_data: "withdraw" }],
        [{ text: "📺 How to Complete Task", url: "https://t.me/" }]
      ]
    };

    if (isAdmin) {
      kb.inline_keyboard.push([{ text: "⚙️ Admin Control Center", callback_data: "admin_panel" }]);
    }

    if (cb) return edit(chatId, cb.message.message_id, homeText, kb);
    return send(chatId, homeText, kb);
  }

  // ================= WITHDRAWAL FLOW =================
  if (data === "withdraw") {
    const w = ledger.workers[userId];
    const wText = `💵 <b>PAYOUT WITHDRAWAL</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Aapka Total Due:</b> ₹${w.balance}\n\nApna payment lene ke liye niche direct Admin ko message karein:`;
    return edit(chatId, cb.message.message_id, wText, {
      inline_keyboard: [
        [{ text: "💬 Contact Admin", url: `tg://user?id=${PRIMARY_OWNER_ID}` }],
        [{ text: "🔙 Back", callback_data: "home" }]
      ]
    });
  }

  // ================= ADMIN CONTROL PANEL =================
  if (data === "admin_panel" && isAdmin) {
    const remaining = Math.max(0, ledger.totalCount - ledger.currentIndex);
    const admText = `⚙️ <b>ADMIN MANAGEMENT CONSOLE</b>\n━━━━━━━━━━━━━━━━━━\n👑 <b>Admins:</b> ${ledger.admins.length}\n💰 <b>Rate:</b> ₹${ledger.price}\n📦 <b>Total Stock:</b> ${ledger.totalCount}\n📤 <b>Given:</b> ${ledger.currentIndex}\n✅ <b>Remaining Fresh:</b> ${remaining}\n📁 <b>Active Files:</b> ${ledger.fileIds.length}\n━━━━━━━━━━━━━━━━━━\n<b>Admin Shortcuts:</b>\n• Sabhi workers ka hisab: <code>/workers</code>\n• Ek worker check karein: <code>/user USER_ID</code>\n• Payment complete karein: <code>/pay USER_ID</code>\n• Live OTP nikaalein: <code>/getotp email</code>\n• Naya admin jodein: <code>/addadmin ID</code>\n• Rate badle: <code>/setprice 5</code>`;

    return edit(chatId, cb.message.message_id, admText, {
      inline_keyboard: [
        [{ text: "👥 View All Workers Data", callback_data: "adm_view_workers" }],
        [{ text: "📁 Upload More Stock (.txt)", callback_data: "adm_help_txt" }],
        [{ text: "🔙 Back", callback_data: "home" }]
      ]
    });
  }

  if (data === "adm_help_txt" && isAdmin) {
    return send(chatId, "📁 <b>Multiple Files Upload Support:</b>\n\nSeedhe <code>.txt</code> file is chat me bhejein.\nBot use pichle bache hue stock ke aage append kar dega. Kuch bhi overwrite nahi hoga!");
  }

  // ================= WORKER CLAIM SINGLE-USE TASK =================
  if (data === "claim_task") {
    if (ledger.fileIds.length === 0 || ledger.currentIndex >= ledger.totalCount) {
      for (const adm of ledger.admins) {
        send(adm, "🚨 <b>ALERT: Stock pura khatam ho gaya hai!</b> Kripya nayi .txt file upload karein.");
      }
      return edit(chatId, cb.message.message_id, "❌ <b>Stock Khatam Ho Chuka Hai!</b>\nAdmin ko alert bhej diya gaya hai. Thodi der baad check karein.", {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    const allLines = await loadAllStockLines(ledger.fileIds);
    const assignedIndex = ledger.currentIndex;
    const assignedLine = allLines[assignedIndex];
    const email = assignedLine.split(/[|:]/)[0].trim().toLowerCase();

    // Lock email & index permanently
    ledger.currentIndex += 1;
    ledger.usedMap[email] = assignedLine;
    await saveLedgerState(ledger);

    const taskText = `📋 <b>META AI TASK STARTED</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Assigned Email:</b> <code>${email}</code>\n\n1️⃣ Is email se Meta AI account register karein.\n2️⃣ <b>Get OTP</b> dabakar verification code lein.\n3️⃣ Complete hote hi <b>Submit Password</b> dabayein.\n━━━━━━━━━━━━━━━━━━`;
    
    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: email } }],
        [{ text: "📩 Get OTP", callback_data: `task_otp:${encodeURIComponent(email)}` }],
        [{ text: "🔑 Submit Password", callback_data: `ask_pass:${encodeURIComponent(email)}` }]
      ]
    };
    return edit(chatId, cb.message.message_id, taskText, kb);
  }

  // ================= WORKER OTP / REFRESH =================
  if (data?.startsWith("task_otp:") || data?.startsWith("task_ref:")) {
    const encodedMail = data.startsWith("task_otp:") ? data.replace("task_otp:", "") : data.replace("task_ref:", "");
    const email = decodeURIComponent(encodedMail);
    const accountLine = ledger.usedMap[email];

    if (!accountLine) return send(chatId, "❌ Session expired.");

    const wait = await send(chatId, "🔍 <i>Checking inbox for Meta AI OTP...</i>");
    const { otp } = await fetchAccountOtp(accountLine);

    if (otp) {
      await deleteMsg(chatId, wait?.result?.message_id);
      return send(chatId, `🔑 <b>META AI OTP CODE:</b> <code>${otp}</code>\n\nAccount verify karein aur fir <b>Submit Password</b> dabayein.`, {
        inline_keyboard: [
          [{ text: `📋 Copy OTP: ${otp}`, copy_text: { text: otp } }],
          [{ text: "🔑 Submit Password", callback_data: `ask_pass:${encodeURIComponent(email)}` }]
        ]
      });
    } else {
      await deleteMsg(chatId, wait?.result?.message_id);
      return send(chatId, "⏳ <i>OTP nahi mila. 10 second ruk kar Refresh dabayein.</i>", {
        inline_keyboard: [
          [{ text: "🔄 Refresh OTP", callback_data: `task_ref:${encodeURIComponent(email)}` }],
          [{ text: "🔑 Submit Password", callback_data: `ask_pass:${encodeURIComponent(email)}` }]
        ]
      });
    }
  }

  // ================= ASK PASSWORD (FORCE REPLY) =================
  if (data?.startsWith("ask_pass:")) {
    const email = decodeURIComponent(data.replace("ask_pass:", ""));
    return send(chatId, `🔑 <b>Meta AI Password yahan Reply karein:</b>\nEmail: <code>${email}</code>\n\n<i>(Is message par reply karke Meta ka banaya hua password bhejein. Data chat se turant delete ho jayega)</i>`, {
      force_reply: true
    });
  }
}
