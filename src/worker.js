/**
 * Professional Meta AI & Instagram Temp Mail Engine (Fixed & Isolated)
 * Domain: vibepulsemedia.online
 * Fixes: 1-Time Clean Delivery, Anti-Duplicate Lock, Dedicated Old Email Hub
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Global Registries
let ADMINS = new Set([PRIMARY_OWNER_ID]);
let USER_LAST_EMAIL = new Map();  // chatId -> current active email
let EMAIL_TO_USER = new Map();    // email -> chatId (Dedicated Ownership)
let EMAIL_INBOX = new Map();      // email -> { otp, link, receivedAt, delivered: bool }
let USER_STATE = new Map();       // chatId -> current state
let PROCESSED_LOCK = new Map();   // deduplication hash -> timestamp

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

      // Handle Callback Buttons
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
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Handle Messages & Commands
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();

        // Admin Management: Add Admin
        if (text.startsWith("/addadmin")) {
          if (chatId !== PRIMARY_OWNER_ID) {
            await sendMsg(chatId, "⛔ Sirf Main Owner hi Admin add kar sakta hai.");
            return new Response("OK");
          }
          const parts = text.split(" ");
          if (parts[1]) {
            ADMINS.add(parts[1].trim());
            await sendMsg(chatId, `✅ Chat ID \`${parts[1].trim()}\` ko Admin bana diya gaya.`);
          } else {
            await sendMsg(chatId, "Usage: `/addadmin <chat_id>`");
          }
          return new Response("OK");
        }

        // Admin Management: Remove Admin
        if (text.startsWith("/deladmin")) {
          if (chatId !== PRIMARY_OWNER_ID) {
            await sendMsg(chatId, "⛔ Sirf Main Owner hi Admin hata sakta hai.");
            return new Response("OK");
          }
          const parts = text.split(" ");
          if (parts[1] && parts[1].trim() !== PRIMARY_OWNER_ID) {
            ADMINS.delete(parts[1].trim());
            await sendMsg(chatId, `❌ Admin ID \`${parts[1].trim()}\` ko hata diya gaya.`);
          }
          return new Response("OK");
        }

        // Admin List
        if (text === "/adminlist") {
          if (!ADMINS.has(chatId)) {
            await sendMsg(chatId, "⛔ Sirf Admins list dekh sakte hain.");
            return new Response("OK");
          }
          let list = Array.from(ADMINS).map(id => `• \`${id}\``).join("\n");
          await sendMsg(chatId, `👑 *Authorized Admins:*\n\n${list}`);
          return new Response("OK");
        }

        // Input Listener for Old Email Submission
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          await linkAndCheckOldEmail(chatId, text);
          return new Response("OK");
        }

        // Main Start Menu
        if (text === "/start") {
          USER_STATE.delete(chatId);
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }, { text: "🔑 Old Email Hub" }]
          ];

          await sendMsg(chatId, 
            "👋 *Instagram & Meta Temp Mail Hub*\n\nNaya email create karne ya purane email ka OTP track karne ke liye button chunein:", 
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
        else if (text.includes(`@${DOMAIN}`)) {
          // Agar direct email paste kiya chat me
          await linkAndCheckOldEmail(chatId, text);
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
      // Sanitize exact recipient email (removes quotes/brackets)
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

      // Extract Verification Link if available
      const linkMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*/i);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // --- STRICT DEDUPLICATION SHIELD (Prevents 2-3x duplicate delivery) ---
      const dedupeKey = `${toEmail}_${extractedOtp || "LINK"}`;
      const now = Date.now();
      
      if (PROCESSED_LOCK.has(dedupeKey)) {
        const lastSent = PROCESSED_LOCK.get(dedupeKey);
        if (now - lastSent < 300000) { // 5 minutes duplicate lock
          return;
        }
      }
      PROCESSED_LOCK.set(dedupeKey, now);

      // Clean old lock memory periodically
      if (PROCESSED_LOCK.size > 2000) {
        for (const [key, ts] of PROCESSED_LOCK.entries()) {
          if (now - ts > 300000) PROCESSED_LOCK.delete(key);
        }
      }

      // Store in Memory Inbox
      EMAIL_INBOX.set(toEmail, {
        otp: extractedOtp,
        link: verifyLink,
        receivedAt: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
        delivered: true
      });

      // Find bound user (Isolated Routing)
      const boundUser = EMAIL_TO_USER.get(toEmail);
      const targetChatId = boundUser || PRIMARY_OWNER_ID;

      // Deliver ONLY 1 time directly to user
      await deliverOtpBox(targetChatId, extractedOtp, toEmail, verifyLink);

      // Log to private DB Channel (Silent, does not disturb user)
      if (DB_CHANNEL_ID) {
        await sendMsg(
          DB_CHANNEL_ID, 
          `🔔 *[LOG]*\nRecipient: \`${toEmail}\`\nUser ID: \`${targetChatId}\`\nOTP: \`${extractedOtp || "Link Only"}\``
        );
      }
    } catch (err) {
      console.error("Email Error:", err);
    }
  }
};

// --- HELPER: GENERATE NEW EMAIL ---
async function generateNewEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  // Bind session exclusively
  USER_LAST_EMAIL.set(chatId, newEmail);
  EMAIL_TO_USER.set(newEmail, chatId);

  const messageText = 
`✨ *Aapka Temp Email Taiyar Hai:*

\`${newEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Yeh email Instagram / Meta me dalein. OTP aate hi yahan **turant ek bar** bhej diya jayega.`;

  const inlineBtns = [
    [{ text: "📬 Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔄 Naya Email Banayein", callback_data: "btn_gen" }]
  ];

  await sendMsg(chatId, messageText, null, { inline_keyboard: inlineBtns });
}

// --- HELPER: CHECK OTP MANUAL REFRESH ---
async function checkCurrentOtp(chatId) {
  const currentEmail = USER_LAST_EMAIL.get(chatId);

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle ek email banayein ya purana email link karein.");
    return;
  }

  const record = EMAIL_INBOX.get(currentEmail);

  if (record && (record.otp || record.link)) {
    await deliverOtpBox(chatId, record.otp, currentEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nMeta/Instagram se OTP send karein, aate hi automatically deliver ho jayega.`,
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
    "🔑 *Old Email Hub (Isolated Listener)*\n\nApna purana email address yahan chat me paste karein:\n\n_Example:_\n`anjali.saxena842@vibepulsemedia.online`\n\nIs email ka naya/purana OTP sirf aapke chat par aayega."
  );
}

// --- HELPER: LINK OLD EMAIL EXCLUSIVELY ---
async function linkAndCheckOldEmail(chatId, inputEmail) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Invalid Domain! Email \`@${DOMAIN}\` par khatam hona chahiye.`);
    return;
  }

  // 1. User ke sath is email ko lock karein taaki OTP kisi aur ko na jaye
  USER_LAST_EMAIL.set(chatId, cleanEmail);
  EMAIL_TO_USER.set(cleanEmail, chatId);

  const record = EMAIL_INBOX.get(cleanEmail);

  // Agar pehle se koi OTP inbox me moujood hai
  if (record && (record.otp || record.link)) {
    await sendMsg(chatId, `✅ *Email Successfully Linked!*\n\nPurana OTP mil gaya hai:`);
    await deliverOtpBox(chatId, record.otp, cleanEmail, record.link);
  } else {
    // Agar OTP abhi tak nahi aaya hai toh listener activate kar de
    await sendMsg(
      chatId, 
      `✅ *Email Successfully Linked!*\n\nTarget Email: \`${cleanEmail}\`\n\n📡 *Active Status:* Is email par jaise hi Meta/Instagram se naya OTP aayega, direct aapko receive hoga.\n\nAap abhi Instagram me 'Resend OTP' kar sakte hain.`,
      null,
      { inline_keyboard: [[{ text: "📬 Check OTP Now", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- HELPER: CLEAN 1-TAP TO COPY OTP CARD ---
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
    { text: "⚡ Generate New", callback_data: "btn_gen" },
    { text: "🔑 Link Old Email", callback_data: "btn_old_hub" }
  ]);

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM CALLER WRAPPER ---
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
