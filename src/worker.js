/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// State Management
let USER_LAST_EMAIL = new Map();  // chatId -> email
let EMAIL_TO_USER = new Map();    // email -> chatId
let RECENT_DELIVERIES = new Map();// deduplication: `${email}_${otp}` -> timestamp
let EMAIL_INBOX = new Map();      // email -> { otp, link, receivedAt }

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
  // --- 1. TELEGRAM INTERACTION ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      // Inline Buttons
      if (update.callback_query) {
        const q = update.callback_query;
        const chatId = q.message.chat.id.toString();
        const data = q.data;

        if (data === "btn_gen") {
          await generateNewEmail(chatId);
        } else if (data === "btn_check_otp") {
          await checkCurrentOtp(chatId);
        }

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: q.id
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // Keyboard Commands
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();

        if (text === "/start") {
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }]
          ];

          await callTelegram("sendMessage", {
            chat_id: chatId,
            text: "👋 *Meta AI Temp Mail Service*\n\nNeeche diye gaye buttons se fresh email banayein ya OTP check karein:",
            parse_mode: "Markdown",
            reply_markup: {
              keyboard: keyboard,
              resize_keyboard: true
            }
          });
        } 
        else if (text === "⚡ Generate Email" || text === "🔄 Change Email" || text === "/gen") {
          await generateNewEmail(chatId);
        } 
        else if (text === "📬 Check OTP" || text === "/otp") {
          await checkCurrentOtp(chatId);
        }

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. EMAIL RECEIVER & DE-DUPLICATION ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Filter: Meta, Facebook, Instagram only
      const isMeta = fromEmail.includes("meta") || 
                     fromEmail.includes("facebook") || 
                     fromEmail.includes("instagram");

      if (!isMeta) {
        return; // Ignore unwanted spam
      }

      const raw = await new Response(message.raw).text();

      // Deep 6-8 digit OTP regex
      const otpMatch = raw.match(/(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6,8}\b)/i) || 
                       raw.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Verification Link
      const linkMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*/i);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // 🛡️ ANTI-DUPLICATE SHIELD: Rokta hai 5-6 baar aane wale messages ko
      const dedupeKey = `${toEmail}_${extractedOtp || "NO_OTP"}`;
      const now = Date.now();
      if (RECENT_DELIVERIES.has(dedupeKey)) {
        const lastSent = RECENT_DELIVERIES.get(dedupeKey);
        if (now - lastSent < 120000) { // 2 minute ke andar same OTP dubara nahi bhejega
          return;
        }
      }
      RECENT_DELIVERIES.set(dedupeKey, now);

      // Save to memory for 'Check OTP' button
      EMAIL_INBOX.set(toEmail, {
        otp: extractedOtp,
        link: verifyLink,
        time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
      });

      // Target User Find
      let targetChatId = EMAIL_TO_USER.get(toEmail);
      if (!targetChatId) {
        targetChatId = PRIMARY_OWNER_ID;
      }

      // Deliver 1 Clean Box Message
      await deliverOtpBox(targetChatId, extractedOtp, toEmail, verifyLink);

      // Log to DB Channel (Only Once)
      if (DB_CHANNEL_ID) {
        await callTelegram("sendMessage", {
          chat_id: DB_CHANNEL_ID,
          text: `🔔 *[NEW OTP RECEIVED]*\nTo: \`${toEmail}\`\nOTP: \`${extractedOtp || "Link Only"}\``,
          parse_mode: "Markdown"
        });
      }
    } catch (err) {
      console.error("Email processor error:", err);
    }
  }
};

// --- HELPER: GENERATE CLEAN EMAIL ---
async function generateNewEmail(chatId) {
  // Clear old session
  const oldEmail = USER_LAST_EMAIL.get(chatId);
  if (oldEmail) {
    EMAIL_TO_USER.delete(oldEmail);
    EMAIL_INBOX.delete(oldEmail);
  }

  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  // Bind new session
  USER_LAST_EMAIL.set(chatId, newEmail);
  EMAIL_TO_USER.set(newEmail, chatId);

  const messageText = 
`✨ *Aapka Temp Email Taiyar Hai:*

\`${newEmail}\`

_(Upar email par tap karein, copy ho jayega)_
━━━━━━━━━━━━━━━━━━━━
Meta AI / Instagram me yeh email dalein, fir niche *Check OTP* dabayein.`;

  const inlineBtns = [
    [{ text: "📬 Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔄 Naya Email Banayein", callback_data: "btn_gen" }]
  ];

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: messageText,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: inlineBtns }
  });
}

// --- HELPER: CHECK OTP ON DEMAND ---
async function checkCurrentOtp(chatId) {
  const currentEmail = USER_LAST_EMAIL.get(chatId);

  if (!currentEmail) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚠️ Pehle ek email banayein: *⚡ Generate Email*",
      parse_mode: "Markdown"
    });
    return;
  }

  const data = EMAIL_INBOX.get(currentEmail);

  if (data && data.otp) {
    await deliverOtpBox(chatId, data.otp, currentEmail, data.link);
  } else {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `⏳ *Waiting for Code...*\n\nEmail: \`${currentEmail}\`\n\nAbhi tak Meta se code nahi aaya hai. Resend Code karke 5 second baad dobara *Check OTP* dabayein.`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }]
        ]
      }
    });
  }
}

// --- HELPER: CLEAN PROFESSIONAL OTP CARD ---
async function deliverOtpBox(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *META VERIFICATION CODE*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${otp}\`

_(Code par tap karke direct copy karein)_
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
  inlineBtns.push([{ text: "⚡ Generate New Email", callback_data: "btn_gen" }]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: inlineBtns }
  });
}

// --- TELEGRAM API CALL ---
async function callTelegram(method, payload) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}
