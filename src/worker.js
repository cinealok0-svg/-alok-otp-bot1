/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Storage Engine: Telegram Channel Pinned Message DB
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Fallback & Short-lived state
let USER_STATE = new Map(); // chatId -> "awaiting_old_email"
let MEMORY_LOCK = new Set(); // Instant millisecond deduplication shield

const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha"
];

const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey", "reddy", "bose", "saxena"
];

export default {
  // --- 1. TELEGRAM WEBHOOK HANDLER ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      // Inline Buttons Callback
      if (update.callback_query) {
        const q = update.callback_query;
        const chatId = q.message.chat.id.toString();
        const data = q.data;

        if (data === "btn_gen") {
          await generateNewEmail(chatId);
        } else if (data === "btn_check_otp") {
          await checkCurrentOtp(chatId);
        } else if (data === "btn_old_hub") {
          await handleOldHubPrompt(chatId);
        }

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: q.id
        }), { headers: { "Content-Type": "application/json" } });
      }

      // Incoming Chat Messages
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();

        // Check if user is typing an Old Email after clicking Old Email Hub
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          await linkAndCheckOldEmail(chatId, text);
          return new Response("OK");
        }

        // Direct Email Paste handling
        if (text.includes(`@${DOMAIN}`)) {
          await linkAndCheckOldEmail(chatId, text);
          return new Response("OK");
        }

        // Main Menu Controls
        if (text === "/start") {
          USER_STATE.delete(chatId);
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }, { text: "🔑 Old Email Hub" }]
          ];

          await sendMsg(chatId, 
            "👋 *Instagram & Meta Temp Mail Hub*\n\nNaya email create karne ya kisi bhi purane email ka OTP track karne ke liye option chunein:", 
            { keyboard: keyboard, resize_keyboard: true }
          );
        } 
        else if (text === "⚡ Generate Email" || text === "🔄 Change Email" || text === "/gen") {
          USER_STATE.delete(chatId);
          await generateNewEmail(chatId);
        } 
        else if (text === "📬 Check OTP" || text === "/otp") {
          USER_STATE.delete(chatId);
          await checkCurrentOtp(chatId);
        }
        else if (text === "🔑 Old Email Hub" || text === "/old") {
          await handleOldHubPrompt(chatId);
        }

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. CLOUDFLARE EMAIL ROUTING RECEIVER ---
  async email(message, env, ctx) {
    try {
      const rawFrom = (message.from || "").toLowerCase();
      const rawTo = message.to || "";
      const emailMatch = rawTo.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      const toEmail = (emailMatch ? emailMatch[0] : rawTo).toLowerCase().trim();

      // Filter: Meta, Facebook, Instagram only
      const isMeta = rawFrom.includes("meta") || 
                     rawFrom.includes("facebook") || 
                     rawFrom.includes("instagram");

      if (!isMeta) return;

      const raw = await new Response(message.raw).text();

      // Extract 6 to 8 digit OTP strictly
      const otpMatch = raw.match(/(?:code|otp|pin|passcode|código)[\s:=–-]{1,8}(\b\d{6,8}\b)/i) || 
                       raw.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Extract Verification Link
      const linkMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*/i);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      if (!extractedOtp && !verifyLink) return;

      // --- DEDUPLICATION SHIELD 1: In-Memory Instant Lock ---
      const dedupeKey = `${toEmail}_${extractedOtp || verifyLink}`;
      if (MEMORY_LOCK.has(dedupeKey)) return;
      MEMORY_LOCK.add(dedupeKey);

      // --- DEDUPLICATION SHIELD 2: Read Telegram Channel DB ---
      const { messageId, db } = await getChannelDb();

      // Agar is email par ye OTP pehle hi deliver ho chuka hai toh dobara mat bhejo
      if (db.inboxes && db.inboxes[toEmail] && db.inboxes[toEmail].otp === extractedOtp && db.inboxes[toEmail].delivered) {
        return;
      }

      // Store in Channel DB
      if (!db.inboxes) db.inboxes = {};
      db.inboxes[toEmail] = {
        otp: extractedOtp,
        link: verifyLink,
        time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
        delivered: true
      };

      // Determine bound owner
      const boundUser = (db.emails && db.emails[toEmail]) ? db.emails[toEmail] : PRIMARY_OWNER_ID;

      // Update Channel DB Message
      await saveChannelDb(messageId, db);

      // Deliver 1-Time directly to User
      await deliverOtpBox(boundUser, extractedOtp, toEmail, verifyLink);

      // Post Visual Log in DB Channel
      await sendMsg(
        DB_CHANNEL_ID, 
        `🔔 *[NEW OTP RECEIVED]*\n📧 Email: \`${toEmail}\`\n👤 User ID: \`${boundUser}\`\n🔑 OTP: \`${extractedOtp || "Link Only"}\``
      );

    } catch (err) {
      console.error("Email Error:", err);
    }
  }
};

// --- TELEGRAM CHANNEL DATABASE ENGINE (PINNED MESSAGE) ---

async function getChannelDb() {
  const defaultDb = { users: {}, emails: {}, inboxes: {} };

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${DB_CHANNEL_ID}`);
    const data = await res.json();

    if (data.ok && data.result.pinned_message) {
      try {
        const parsed = JSON.parse(data.result.pinned_message.text);
        return { messageId: data.result.pinned_message.message_id, db: parsed };
      } catch (err) {
        // Pinned message was not valid JSON, create a fresh one below
      }
    }

    // Agar channel me abhi tak koi DB message nahi hai, toh naya bana kar pin karein
    const initRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DB_CHANNEL_ID,
        text: JSON.stringify(defaultDb)
      })
    });
    const initData = await initRes.json();

    if (initData.ok) {
      const newMsgId = initData.result.message_id;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/pinChatMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: DB_CHANNEL_ID,
          message_id: newMsgId,
          disable_notification: true
        })
      });
      return { messageId: newMsgId, db: defaultDb };
    }
  } catch (e) {
    console.error("DB Fetch Error:", e);
  }

  return { messageId: null, db: defaultDb };
}

async function saveChannelDb(messageId, db) {
  if (!messageId) return;

  // Auto-prune old records to stay safely under Telegram's 4096 character limit
  const emailKeys = Object.keys(db.inboxes || {});
  if (emailKeys.length > 25) {
    const oldestKeys = emailKeys.slice(0, emailKeys.length - 25);
    for (const k of oldestKeys) {
      delete db.inboxes[k];
      delete db.emails[k];
    }
  }

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DB_CHANNEL_ID,
        message_id: messageId,
        text: JSON.stringify(db)
      })
    });
  } catch (e) {
    console.error("DB Save Error:", e);
  }
}

// --- HELPER: GENERATE NEW EMAIL ---
async function generateNewEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  // Save to Telegram Channel DB
  const { messageId, db } = await getChannelDb();
  if (!db.users) db.users = {};
  if (!db.emails) db.emails = {};

  db.users[chatId] = newEmail;
  db.emails[newEmail] = chatId;
  await saveChannelDb(messageId, db);

  const messageText = 
`✨ *Aapka Naya Temp Email Taiyar Hai:*

\`${newEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Yeh email Instagram / Meta me dalein. OTP aate hi yahan **turant ek bar** deliver ho jayega.`;

  const inlineBtns = [
    [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔑 Link Old Email", callback_data: "btn_old_hub" }]
  ];

  await sendMsg(chatId, messageText, null, { inline_keyboard: inlineBtns });
}

// --- HELPER: CHECK OTP / REFRESH BUTTON ---
async function checkCurrentOtp(chatId) {
  const { db } = await getChannelDb();
  const currentEmail = db.users ? db.users[chatId] : null;

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle ek naya email banayein ya *🔑 Old Email Hub* se purana email link karein.");
    return;
  }

  const record = db.inboxes ? db.inboxes[currentEmail] : null;

  if (record && (record.otp || record.link)) {
    await deliverOtpBox(chatId, record.otp, currentEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nInstagram / Meta se OTP send karein. Aate hi turant yahan mil jayega.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh Status", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- HELPER: OLD EMAIL HUB PROMPT ---
async function handleOldHubPrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_old_email");
  await sendMsg(
    chatId, 
    "🔑 *Old Email Hub*\n\nApna purana email address yahan chat me paste karein:\n\n_Example:_\n`anjali.saxena842@vibepulsemedia.online`\n\nIs email ka purana OTP ya aane wala naya OTP seedhe aapke chat par aayega."
  );
}

// --- HELPER: LINK OLD EMAIL EXCLUSIVELY ---
async function linkAndCheckOldEmail(chatId, inputEmail) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Invalid Domain! Email \`@${DOMAIN}\` par hi khatam hona chahiye.`);
    return;
  }

  const { messageId, db } = await getChannelDb();
  if (!db.users) db.users = {};
  if (!db.emails) db.emails = {};

  // Email ko is user ke sath lock kar dein
  db.users[chatId] = cleanEmail;
  db.emails[cleanEmail] = chatId;
  await saveChannelDb(messageId, db);

  const record = db.inboxes ? db.inboxes[cleanEmail] : null;

  // Agar is email ka OTP pehle se channel me maujood hai
  if (record && (record.otp || record.link)) {
    await sendMsg(chatId, `✅ *Email Successfully Linked!*\nIs email ka latest OTP mil gaya hai:`);
    await deliverOtpBox(chatId, record.otp, cleanEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `✅ *Email Successfully Linked!*\n\nTarget Email: \`${cleanEmail}\`\n\n📡 *Status:* Yeh email aapke account se link ho gaya hai. Ab aap Instagram me 'Resend OTP' karein, OTP seedhe yahan aayega.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Check / Refresh OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- HELPER: CLEAN 1-TAP COPY CARD ---
async function deliverOtpBox(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *META VERIFICATION OTP*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${otp}\`

_(Tap code to copy)_
─────────────────────
📧 *Email:* \`${toEmail}\``;
  } else {
    text = 
`📩 *Verification Link Received:*
─────────────────────
📧 *Email:* \`${toEmail}\``;
  }

  let inlineBtns = [];
  if (link) {
    inlineBtns.push([{ text: "🌐 Open Verification Link", url: link }]);
  }
  inlineBtns.push([
    { text: "🔄 Refresh Status", callback_data: "btn_check_otp" },
    { text: "⚡ Generate New", callback_data: "btn_gen" }
  ]);
  inlineBtns.push([
    { text: "🔑 Link Another Email", callback_data: "btn_old_hub" }
  ]);

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM SENDER ---
async function sendMsg(chatId, text, replyKeyboard = null, inlineKeyboard = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };

  if (replyKeyboard) payload.reply_markup = replyKeyboard;
  if (inlineKeyboard) payload.reply_markup = inlineKeyboard;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}
