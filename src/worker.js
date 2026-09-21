/**
 * Telegram Meta Temp-Mail Bot (Auto-Parse Reconnect + Multi-Domain Engine)
 * Primary Domain: @guerrillamailblock.com (Supports any Guerrilla alias)
 * Platform: Cloudflare Workers
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DEFAULT_DOMAIN = "guerrillamailblock.com";

// Random Name Generation
const FIRST_NAMES = [
  "riley", "taylor", "alex", "jordan", "morgan", "charlie", "casey", "dakota",
  "skyler", "cameron", "avery", "reese", "quinn", "logan", "peyton", "harper",
  "rohit", "pooja", "neha", "amit", "vikas", "priya", "rahul", "anjali", "karan",
  "siddharth", "arjun", "sneha", "deepak", "kavita", "manish", "tanvi"
];

const LAST_NAMES = [
  "taylor", "smith", "johnson", "brown", "williams", "jones", "miller", "davis",
  "sharma", "verma", "patel", "singh", "kumar", "gupta", "das", "yadav", "mishra"
];

function generateRandomEmail() {
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${fn}${ln}${num}@${DEFAULT_DOMAIN}`.toLowerCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- TELEGRAM API CALLS ---
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

// --- ACCURATE META OTP EXTRACTION ---
function extractMetaOtp(rawContent) {
  if (!rawContent) return null;

  let clean = rawContent.replace(/<[^>]+>/g, " ");

  clean = clean
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\b(19\d\d|20\d\d)\b/g, " ")
    .replace(/\s+/g, " ");

  const metaRegex = /(?:fb|facebook|meta|security code|confirmation code|verification code|kod|code|código|otp)\D{0,25}\b([0-9]{5,8})\b/i;
  const p1 = clean.match(metaRegex);
  if (p1 && p1[1]) return p1[1];

  const p2 = clean.match(/\b([0-9]{6,8})\b/);
  if (p2 && p2[1]) return p2[1];

  return null;
}

// --- GUERRILLA MAIL RECONNECT & FETCH ENGINE ---
async function fetchGuerrillaOtp(emailAddress) {
  if (!emailAddress || !emailAddress.includes("@")) return { otp: null, error: "Invalid Email" };

  try {
    const parts = emailAddress.toLowerCase().trim().split("@");
    const userPart = parts[0].trim();
    const domainPart = parts[1].trim() || DEFAULT_DOMAIN;

    // Step 1: Bind/Switch to the exact user and domain
    const initUrl = `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(userPart)}&lang=en&site=${encodeURIComponent(domainPart)}`;
    const initRes = await fetch(initUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json"
      }
    });

    if (!initRes.ok) return { otp: null, error: "API Connection Failed" };

    const initData = await initRes.json();
    const sidToken = initData?.sid_token;
    if (!sidToken) return { otp: null, error: "Session token nahi mila" };

    // Step 2: Fetch mailbox list
    const listUrl = `https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${sidToken}`;
    const listRes = await fetch(listUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!listRes.ok) return { otp: null, error: "Mailbox read nahi ho paya" };

    const listData = await listRes.json();
    const emails = listData?.list || [];

    if (emails.length === 0) {
      return { otp: null, error: "Inbox bilkul khali hai" };
    }

    // Step 3: Scan each email from newest to oldest
    for (const item of emails) {
      if (item.mail_from && item.mail_from.includes("no-reply@guerrillamail.com")) {
        continue;
      }

      const previewText = `${item.mail_subject || ""} ${item.mail_excerpt || ""}`;
      let otp = extractMetaOtp(previewText);
      if (otp) return { otp, error: null };

      // Deep scan full mail body
      try {
        const fullUrl = `https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${item.mail_id}&sid_token=${sidToken}`;
        const fullRes = await fetch(fullUrl);
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          const fullContent = `${fullData?.mail_subject || ""} ${fullData?.mail_body || ""}`;
          otp = extractMetaOtp(fullContent);
          if (otp) return { otp, error: null };
        }
      } catch (err) {}
    }
  } catch (e) {
    return { otp: null, error: e.message };
  }

  return { otp: null, error: "OTP message me nahi mila" };
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
    workers: {},
    msgId: null
  };
}

async function saveLedgerState(state) {
  const cleanState = {
    admins: Array.from(new Set(state.admins || [PRIMARY_OWNER_ID])),
    price: state.price || 4,
    workers: state.workers || {}
  };

  const text = `🗄️ <b>MASTER SYSTEM LEDGER & DATABASE</b>\n━━━━━━━━━━━━━━━━━━\n👑 <b>Admins:</b> <code>${cleanState.admins.join(", ")}</code>\n💰 <b>Task Rate:</b> ₹${cleanState.price}\n👥 <b>Total Workers:</b> ${Object.keys(cleanState.workers).length}\n🌐 <b>Active Engine:</b> Guerrilla Reconnect Multi-Domain\n━━━━━━━━━━━━━━━━━━\n<code>MASTER_SYSTEM_CONFIG: ${JSON.stringify(cleanState)}</code>`;

  if (state.msgId) {
    await tg("editMessageText", { chat_id: DB_CHANNEL_ID, message_id: state.msgId, text, parse_mode: "HTML" });
  } else {
    const m = await send(DB_CHANNEL_ID, text);
    if (m?.result?.message_id) {
      await tg("pinChatMessage", { chat_id: DB_CHANNEL_ID, message_id: m.result.message_id, disable_notification: true });
    }
  }
}

// --- MAIN CONTROLLER ROUTER ---
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

  if (!ledger.workers[userId]) {
    ledger.workers[userId] = { username: userName, approved: 0, pending: 0, balance: 0 };
  } else {
    ledger.workers[userId].username = userName;
  }

  // ================= ADMIN CONTROLS =================
  if (isAdmin) {
    // 1. UNIVERSAL MANUAL OTP COMMAND
    if (text.startsWith("/getotp") || data?.startsWith("fetch_old_otp:")) {
      let targetMail = text.startsWith("/getotp") 
        ? text.split(" ")[1]?.trim().toLowerCase() 
        : data.replace("fetch_old_otp:", "").trim().toLowerCase();

      if (!targetMail || !targetMail.includes("@")) {
        return send(chatId, "⚠️ <b>Usage:</b> <code>/getotp anymail@guerrillamailblock.com</code>");
      }

      const wait = await send(chatId, `🔍 <i>Mailbox connect ho raha hai:</i> <code>${targetMail}</code>...`);
      const { otp, error } = await fetchGuerrillaOtp(targetMail);

      if (otp) {
        return edit(chatId, wait?.result?.message_id, `🔑 <b>LIVE META OTP:</b> <code>${otp}</code>\n📧 <b>Email:</b> <code>${targetMail}</code>`);
      } else {
        return edit(chatId, wait?.result?.message_id, `⏳ <b>OTP nahi mila.</b>\nStatus: <i>${error || "Inbox Empty"}</i>\n\n(Agar 60 min se purana hai toh Meta par "Resend Code" dabakar dobara check karein.)`);
      }
    }

    // 2. VIEW ALL WORKERS
    if (text === "/workers" || data === "adm_view_workers") {
      const uids = Object.keys(ledger.workers);
      if (uids.length === 0) return send(chatId, "📋 Abhi tak koi worker register nahi hua hai.");

      let report = `📊 <b>ALL WORKERS REAL-TIME LEDGER</b>\n━━━━━━━━━━━━━━━━━━\n\n`;
      let totalDue = 0;
      let count = 1;

      for (const uid of uids) {
        const w = ledger.workers[uid];
        if (w.approved > 0 || w.pending > 0 || w.balance > 0) {
          report += `${count}. <b>@${escapeHtml(w.username)}</b> (<code>${uid}</code>)\n   • Approved: <b>${w.approved}</b> | Pending: <b>${w.pending}</b>\n   • Payable Due: <b>₹${w.balance}</b>\n   • Pay Action: <code>/pay ${uid}</code>\n\n`;
          totalDue += w.balance;
          count++;
        }
      }

      report += `━━━━━━━━━━━━━━━━━━\n💰 <b>Total Payable Amount: ₹${totalDue}</b>`;
      if (cb) return edit(chatId, cb.message.message_id, report, { inline_keyboard: [[{ text: "🔙 Back", callback_data: "admin_panel" }]] });
      return send(chatId, report);
    }

    // 3. PAY WORKER
    if (text.startsWith("/pay")) {
      const targetId = text.split(" ")[1]?.trim();
      if (ledger.workers[targetId]) {
        const paidAmount = ledger.workers[targetId].balance;
        ledger.workers[targetId].balance = 0;
        await saveLedgerState(ledger);
        
        await send(targetId, `🎉 <b>Payment Cleared!</b>\nAdmin ne aapka <b>₹${paidAmount}</b> ka payout clear kar diya hai.`);
        return send(chatId, `✅ Worker <code>${targetId}</code> ka balance reset ho gaya (Paid: ₹${paidAmount}).`);
      } else {
        return send(chatId, "❌ Worker ID record me nahi mili.");
      }
    }

    // 4. SET TASK RATE
    if (text.startsWith("/setprice")) {
      const p = parseFloat(text.split(" ")[1]?.trim());
      if (!isNaN(p) && p > 0) {
        ledger.price = p;
        await saveLedgerState(ledger);
        return send(chatId, `✅ <b>Task Price Updated:</b> ₹${p} per account.`);
      }
    }

    // 5. ADMIN CONTROL PANEL
    if (data === "admin_panel") {
      const panelText = `⚙️ <b>ADMIN CONTROL PANEL</b>\n━━━━━━━━━━━━━━━━━━\n💰 Current Rate: <b>₹${ledger.price}</b>\n👑 Total Admins: <b>${ledger.admins.length}</b>\n🌐 Primary Domain: <b>@${DEFAULT_DOMAIN}</b>`;
      const admKb = {
        inline_keyboard: [
          [{ text: "👥 View Workers & Dues", callback_data: "adm_view_workers" }],
          [{ text: "🏠 User Menu", callback_data: "home" }]
        ]
      };
      return edit(chatId, cb.message.message_id, panelText, admKb);
    }
  }

  // ================= SMART AUTO-PARSE FEATURE (PASTE EMAIL DIRECTLY) =================
  // Agar user ya admin direct email paste kare, toh bot bina /getotp ke turant naam aur domain parse karke session activate karega
  if (msg && text.includes("@") && (text.includes("guerrilla") || text.includes("sharklasers") || text.includes("grr.la"))) {
    const targetEmail = text.trim().toLowerCase();
    const waitMsg = await send(chatId, `🔄 <i>Auto-detecting account & domain...</i>\nConnecting: <code>${targetEmail}</code>`);

    const { otp, error } = await fetchGuerrillaOtp(targetEmail);

    if (otp) {
      return edit(chatId, waitMsg?.result?.message_id, `🔑 <b>LIVE OTP MIL GAYA!</b>\n━━━━━━━━━━━━━━━━━━\nCode: <code>${otp}</code>\nEmail: <code>${targetEmail}</code>`);
    } else {
      const reconnectKb = {
        inline_keyboard: [
          [{ text: "🔄 Refresh / Fetch Again", callback_data: `get_temp_otp:${targetEmail}` }],
          [{ text: "✍️ Submit Password", callback_data: `submit_pass:${targetEmail}` }],
          [{ text: "🏠 Main Menu", callback_data: "home" }]
        ]
      };
      return edit(chatId, waitMsg?.result?.message_id, `⏳ <b>Session connect ho gaya hai, par koi naya OTP nahi mila.</b>\nReason: <i>${error || "Inbox Empty"}</i>\n\n💡 <b>Tip:</b> Agar email bheje huye 60 minute se zyada ho gaye hain, toh Meta par <b>"Resend Code"</b> dabayein aur turant Refresh karein.`, reconnectKb);
    }
  }

  // ================= WORKER PASSWORD SUBMISSION =================
  if (msg && msg.reply_to_message && msg.reply_to_message.text.includes("Meta AI Password yahan")) {
    const submittedPassword = text;
    const promptMsgId = msg.reply_to_message.message_id;
    const workerMsgId = msg.message_id;

    await deleteMsg(chatId, workerMsgId);
    await deleteMsg(chatId, promptMsgId);

    const emailMatch = msg.reply_to_message.text.match(/Email:\s*([^\s\n]+)/);
    const assignedEmail = emailMatch ? emailMatch[1] : "Unknown";

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

    return send(chatId, "✅ <b>Data Successfully Submitted!</b>\n\nAapka password secure tarike se submit ho gaya hai. Admin check karke approve karenge.", {
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
      return send(targetUser, `🎉 <b>Badhai ho!</b> Aapka Meta AI task approve ho gaya hai.\n💰 <b>₹${reward}</b> wallet me credit ho gaye!`);
    }

    if (data.startsWith("rj:")) {
      const [, targetUser] = data.split(":");
      if (ledger.workers[targetUser]) {
        ledger.workers[targetUser].pending = Math.max(0, ledger.workers[targetUser].pending - 1);
        await saveLedgerState(ledger);
      }

      await edit(chatId, cb.message.message_id, `${cb.message.text}\n\n❌ <b>REJECTED BY @${userName}</b>`);
      return send(targetUser, "⚠️ <b>Aapka task reject ho gaya hai.</b> Kripya sahi account credentials submit karein.");
    }
  }

  // ================= GENERATE NEW RANDOM EMAIL =================
  if (data === "claim_task" || data === "generate_new") {
    const randomEmail = generateRandomEmail();

    const taskText = `📋 <b>Aapka Naya Temp Email Ready Hai!</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Email:</b> <code>${randomEmail}</code>\n🌐 <b>Domain:</b> <code>@${DEFAULT_DOMAIN}</code>\n━━━━━━━━━━━━━━━━━━\n1. Meta / FB sign-up page par ye email dalein.\n2. Code bhejne ke baad <b>Get OTP</b> button dabayein.\n3. Account banne ke baad password submit karein.`;
    
    const taskKb = {
      inline_keyboard: [
        [{ text: "🔑 Get OTP", callback_data: `get_temp_otp:${randomEmail}` }],
        [{ text: "🔄 Generate Another Email", callback_data: "generate_new" }],
        [{ text: "✍️ Submit Password", callback_data: `submit_pass:${randomEmail}` }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    };

    if (cb) return edit(chatId, cb.message.message_id, taskText, taskKb);
    return send(chatId, taskText, taskKb);
  }

  // ================= WORKER GET OTP BUTTON =================
  if (data?.startsWith("get_temp_otp:")) {
    const targetEmail = data.replace("get_temp_otp:", "").trim();
    const waitMsg = await send(chatId, `🔍 <i>Live Meta OTP check kiya ja raha hai:</i> <code>${targetEmail}</code>...`);

    const { otp, error } = await fetchGuerrillaOtp(targetEmail);

    if (otp) {
      return edit(chatId, waitMsg?.result?.message_id, `🔑 <b>LIVE META OTP:</b> <code>${otp}</code>\n📧 <b>Email:</b> <code>${targetEmail}</code>\n\nAccount confirm karke niche <b>Submit Password</b> karein.`);
    } else {
      const retryKb = {
        inline_keyboard: [
          [{ text: "🔄 Try Again / Refresh", callback_data: `get_temp_otp:${targetEmail}` }],
          [{ text: "✍️ Submit Password", callback_data: `submit_pass:${targetEmail}` }]
        ]
      };
      return edit(chatId, waitMsg?.result?.message_id, `⏳ <b>Abhi tak OTP nahi mila.</b>\nStatus: <i>${error || "Inbox Empty"}</i>\n\nMeta se "Send Code" ya "Resend Code" dabane ke 10-15 second baad niche "Try Again" dabayein.`, retryKb);
    }
  }

  // ================= SUBMIT PASSWORD PROMPT =================
  if (data?.startsWith("submit_pass:")) {
    const email = data.replace("submit_pass:", "").trim();
    return send(chatId, `🔒 <b>Meta AI Password yahan bhejein:</b>\nEmail: <code>${email}</code>\n\n<i>(Kripya is message ko "Reply" karke apna password bhejein)</i>`, {
      force_reply: true
    });
  }

  // ================= MAIN USER MENU =================
  if (text === "/start" || data === "home") {
    const w = ledger.workers[userId];
    const homeText = `🤖 <b>Meta AI Temp-Mail Portal</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Task Rate:</b> ₹${ledger.price} per account\n💳 <b>Aapka Balance:</b> ₹${w.balance}\n✅ <b>Approved Tasks:</b> ${w.approved}\n⏳ <b>Pending Review:</b> ${w.pending}\n━━━━━━━━━━━━━━━━━━\n<i>Niche button par tap karke instant email lein ya purana email chat me paste karein:</i>`;
    
    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Generate Temp Email", callback_data: "claim_task" }],
        [{ text: "💳 Withdraw Earnings", callback_data: "withdraw" }]
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
    const wText = `💵 <b>PAYOUT WITHDRAWAL</b>\n━━━━━━━━━━━━━━━━━━\n💰 <b>Aapka Balance Due:</b> ₹${w.balance}\n\nApna payout transfer lene ke liye niche direct Admin ko message karein:`;
    return edit(chatId, cb.message.message_id, wText, {
      inline_keyboard: [
        [{ text: "💬 Contact Admin", url: `tg://user?id=${PRIMARY_OWNER_ID}` }],
        [{ text: "🔙 Back", callback_data: "home" }]
      ]
    });
  }
}

// --- WORKER ENTRYPOINT ---
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
