/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Domain: vibepulsemedia.online
 * Features: Multi-Admin, Old Email Hub, Tap-to-Copy, Anti-Spam
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Storage & State
let ADMINS = new Set([PRIMARY_OWNER_ID]);
let USER_LAST_EMAIL = new Map();  // chatId -> current active email
let EMAIL_TO_USER = new Map();    // email -> chatId
let RECENT_DELIVERIES = new Map();// deduplication: `${email}_${otp}` -> timestamp
let EMAIL_INBOX = new Map();      // email -> { otp, link, receivedAt, used }
let USER_STATE = new Map();       // chatId -> current input state

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

      // Handle Inline Buttons
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

        // Admin Management: Add Admin (Owner Only)
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

        // Admin Management: Remove Admin (Owner Only)
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
            await sendMsg(chatId, "⛔ Sirf Admins hi list dekh sakte hain.");
            return new Response("OK");
          }
          let list = Array.from(ADMINS).map(id => `• \`${id}\``).join("\n");
          await sendMsg(chatId, `👑 *Authorized Admins List:*\n\n${list}`);
          return new Response("OK");
        }

        // Check if user is in "Waiting for Old Email" state
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          await processOldEmailSearch(chatId, text);
          return new Response("OK");
        }

        // Main Menu / Start Command
        if (text === "/start") {
          USER_STATE.delete(chatId);
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }, { text: "🔑 Old Email Hub" }]
          ];

          await sendMsg(chatId, 
            "👋 *Meta AI & Instagram Mail Portal*\n\nNeeche button par tap karein naya email banane ya purana OTP retrieve karne ke liye:", 
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
        // Direct email input agar user direct paste kare
        else if (text.includes(`@${DOMAIN}`)) {
          if (ADMINS.has(chatId)) {
            await processOldEmailSearch(chatId, text);
          } else {
            await sendMsg(chatId, "⚠️ Purana email check karne ka access sirf authorized admins ke paas hai.");
          }
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
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Filter: Meta, Facebook, Instagram only
      const isMeta = fromEmail.includes("meta") || 
                     fromEmail.includes("facebook") || 
                     fromEmail.includes("instagram");

      if (!isMeta) {
        return; // Ignore unwanted external emails
      }

      const raw = await new Response(message.raw).text();

      // Extract 6-8 digit OTP
      const otpMatch = raw.match(/(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6,8}\b)/i) || 
                       raw.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Extract Verification Link
      const linkMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*/i);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // Anti-Spam Shield: Rokta hai 5-10 baar repeat delivery ko
      const dedupeKey = `${toEmail}_${extractedOtp || "NO_OTP"}`;
      const now = Date.now();
      if (RECENT_DELIVERIES.has(dedupeKey)) {
        const lastSent = RECENT_DELIVERIES.get(dedupeKey);
        if (now - lastSent < 180000) { // 3 minute tak same OTP repeat nahi karega
          return;
        }
      }
      RECENT_DELIVERIES.set(dedupeKey, now);

      // Store in Permanent Inbox Registry
      EMAIL_INBOX.set(toEmail, {
        otp: extractedOtp,
        link: verifyLink,
        receivedAt: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
        used: false
      });

      // Target active user find
      let targetChatId = EMAIL_TO_USER.get(toEmail);
      if (!targetChatId) {
        targetChatId = PRIMARY_OWNER_ID;
      }

      // Deliver 1 Clean OTP Box
      await deliverOtpBox(targetChatId, extractedOtp, toEmail, verifyLink);

      // Send to DB Channel
      if (DB_CHANNEL_ID) {
        await sendMsg(DB_CHANNEL_ID, `🔔 *[LOGGED OTP]*\nEmail: \`${toEmail}\`\nOTP: \`${extractedOtp || "Link Only"}\``);
      }
    } catch (err) {
      console.error("Email processing error:", err);
    }
  }
};

// --- HELPER: GENERATE NEW EMAIL ---
async function generateNewEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  // Bind active session
  USER_LAST_EMAIL.set(chatId, newEmail);
  EMAIL_TO_USER.set(newEmail, chatId);

  const messageText = 
`✨ *Aapka Temp Email Taiyar Hai:*

\`${newEmail}\`

_(Email par tap karein, copy ho jayega)_
━━━━━━━━━━━━━━━━━━━━
Yeh email Instagram / Meta AI me dalein, phir niche *Check OTP* dabayein.`;

  const inlineBtns = [
    [{ text: "📬 Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔄 Naya Email Banayein", callback_data: "btn_gen" }]
  ];

  await sendMsg(chatId, messageText, null, { inline_keyboard: inlineBtns });
}

// --- HELPER: CHECK OTP FOR CURRENT SESSION ---
async function checkCurrentOtp(chatId) {
  const currentEmail = USER_LAST_EMAIL.get(chatId);

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle ek naya email banayein: *⚡ Generate Email*");
    return;
  }

  const data = EMAIL_INBOX.get(currentEmail);

  if (data && data.otp) {
    await deliverOtpBox(chatId, data.otp, currentEmail, data.link);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nAbhi tak code deliver nahi hua hai. Meta par 'Resend Code' karein aur 5 second baad dobara *Check OTP* dabayein.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- HELPER: OLD EMAIL HUB PROMPT ---
async function handleOldHubPrompt(chatId) {
  if (!ADMINS.has(chatId)) {
    await sendMsg(chatId, "⛔ *Access Denied!*\n\nPurane Gmail ka record check karne ka access sirf authorized admins ke liye hai.");
    return;
  }

  USER_STATE.set(chatId, "awaiting_old_email");
  await sendMsg(
    chatId, 
    "🔑 *Old Email OTP Hub*\n\nApna purana email address yahan chat me paste karein jiska OTP aapko check karna hai:\n\n_Example:_\n`anjali.saxena842@vibepulsemedia.online`"
  );
}

// --- HELPER: SEARCH OLD EMAIL IN INBOX ---
async function processOldEmailSearch(chatId, inputEmail) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Kripya valid domain email dalein: \`...@${DOMAIN}\``);
    return;
  }

  const record = EMAIL_INBOX.get(cleanEmail);

  if (!record || !record.otp) {
    await sendMsg(
      chatId, 
      `❌ *Koi OTP Record Nahi Mila!*\n\nEmail: \`${cleanEmail}\`\n\nIs email par abhi tak koi naya OTP nahi aaya hai ya session delete ho gaya hai.`
    );
    return;
  }

  const boxMessage = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *OLD EMAIL RECOVERED OTP*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${record.otp}\`

_(Tap code to copy directly)_
─────────────────────
📧 *Target Email:* \`${cleanEmail}\`
⏰ *Received At:* ${record.receivedAt}
Status: *Delivered*`;

  let inlineBtns = [];
  if (record.link) {
    inlineBtns.push([{ text: "🌐 Open Verification Link", url: record.link }]);
  }
  inlineBtns.push([{ text: "⚡ Generate Fresh Email", callback_data: "btn_gen" }]);

  await sendMsg(chatId, boxMessage, null, { inline_keyboard: inlineBtns });
}

// --- HELPER: CLEAN TAP-TO-COPY OTP BOX ---
async function deliverOtpBox(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *META CODE (OTP):*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${otp}\`

_(Tap code to copy)_
─────────────────────
📧 \`${toEmail}\``;
  } else {
    text = 
`📩 *Verification Link Received:*
─────────────────────
📧 \`${toEmail}\``;
  }

  let inlineBtns = [];
  if (link) {
    inlineBtns.push([{ text: "🌐 Open Link", url: link }]);
  }
  inlineBtns.push([{ text: "⚡ Generate Email", callback_data: "btn_gen" }]);

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM CALLER WRAPPER ---
async function sendMsg(chatId, text, replyKeyboard = null, inlineKeyboard = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };

  if (replyKeyboard) {
    payload.reply_markup = replyKeyboard;
  } else if (inlineKeyboard) {
    payload.reply_markup = inlineKeyboard;
  }

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
