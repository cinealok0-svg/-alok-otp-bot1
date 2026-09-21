/**
 * Ultimate Meta & Instagram Mail Engine
 * Domain: vibepulsemedia.online
 * Features: Hardware-level Cache Deduplication, Auto Old Email Reader, Tap-to-Copy
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Storage
let ADMINS = new Set([PRIMARY_OWNER_ID]);
let USER_ACTIVE_EMAIL = new Map(); // chatId -> current active email
let EMAIL_OWNER = new Map();        // email -> chatId
let EMAIL_HISTORY = new Map();      // email -> { otp, link, time }

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
  // --- 1. TELEGRAM INTERACTIONS ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      // Inline Callback Buttons
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

      // Chat Messages & Commands
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();

        // Admin Management Commands
        if (text.startsWith("/addadmin")) {
          if (chatId !== PRIMARY_OWNER_ID) {
            await sendMsg(chatId, "⛔ Sirf Main Owner hi Admin add kar sakta hai.");
            return new Response("OK");
          }
          const parts = text.split(" ");
          if (parts[1]) {
            ADMINS.add(parts[1].trim());
            await sendMsg(chatId, `✅ Chat ID \`${parts[1].trim()}\` ko Admin banaya gaya.`);
          }
          return new Response("OK");
        }

        if (text.startsWith("/deladmin")) {
          if (chatId !== PRIMARY_OWNER_ID) {
            await sendMsg(chatId, "⛔ Sirf Main Owner hi Admin hata sakta hai.");
            return new Response("OK");
          }
          const parts = text.split(" ");
          if (parts[1] && parts[1].trim() !== PRIMARY_OWNER_ID) {
            ADMINS.delete(parts[1].trim());
            await sendMsg(chatId, `❌ Admin ID \`${parts[1].trim()}\` ko hata diya.`);
          }
          return new Response("OK");
        }

        // Standard Commands
        if (text === "/start") {
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }, { text: "🔑 Old Email Hub" }]
          ];

          await sendMsg(chatId, 
            "👋 *Meta AI & Instagram Mail Engine*\n\nNeeche buttons ka use karein ya kisi bhi puraane email ko chat me paste karein uska OTP dekhne ke liye:", 
            { keyboard: keyboard, resize_keyboard: true }
          );
        } 
        else if (text === "⚡ Generate Email" || text === "🔄 Change Email" || text === "/gen") {
          await generateNewEmail(chatId);
        } 
        else if (text === "📬 Check OTP" || text === "/otp") {
          await checkCurrentOtp(chatId);
        }
        else if (text === "🔑 Old Email Hub") {
          await sendMsg(chatId, "🔑 *Old Email OTP Hub*\n\nApna purana email address yahan chat me paste karein:\n\n`swati.sharma712@vibepulsemedia.online`");
        }
        // Direct Old Email Query: User directly pastes any email
        else if (text.includes(`@${DOMAIN}`)) {
          await fetchOldEmailOtp(chatId, text);
        }

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. EMAIL ROUTING (ANTI-SPAM DEDUPLICATION) ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Filter: Only Meta / Instagram / Facebook
      const isMeta = fromEmail.includes("meta") || 
                     fromEmail.includes("facebook") || 
                     fromEmail.includes("instagram");
      if (!isMeta) return;

      const raw = await new Response(message.raw).text();

      // Extract 6-8 digit OTP
      const otpMatch = raw.match(/(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6,8}\b)/i) || 
                       raw.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Extract Verification Link
      const linkMatch = raw.match(/https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*/i);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      if (!extractedOtp && !verifyLink) return;

      // 🛡️ HARDWARE CACHE LOCK (Stops exact duplicate delivery across Cloudflare edges)
      const dedupeKey = `email_lock_${toEmail}_${extractedOtp || "LINK"}`;
      const cache = caches.default;
      const cacheUrl = new Request(`https://cache.local/${encodeURIComponent(dedupeKey)}`);
      
      const alreadySent = await cache.match(cacheUrl);
      if (alreadySent) {
        return; // Exact duplicate email detected, drop silently
      }

      // Save lock for 180 seconds (3 Minutes)
      await cache.put(cacheUrl, new Response("1", {
        headers: { "Cache-Control": "public, max-age=180" }
      }));

      // Store in History Map for Old Email Hub
      EMAIL_HISTORY.set(toEmail, {
        otp: extractedOtp,
        link: verifyLink,
        time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
      });

      // Find user who currently holds this email
      let targetChatId = EMAIL_OWNER.get(toEmail);
      if (!targetChatId) {
        targetChatId = PRIMARY_OWNER_ID;
      }

      // Send 1 single clean box
      await deliverOtpBox(targetChatId, extractedOtp, toEmail, verifyLink);

      // Send log to DB Channel
      if (DB_CHANNEL_ID) {
        await sendMsg(DB_CHANNEL_ID, `🔔 *[LOG]*\nEmail: \`${toEmail}\`\nOTP: \`${extractedOtp || "Link"}\``);
      }
    } catch (err) {
      console.error("Email processing error:", err);
    }
  }
};

// --- EMAIL GENERATOR ---
async function generateNewEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  // Set new active email
  USER_ACTIVE_EMAIL.set(chatId, newEmail);
  EMAIL_OWNER.set(newEmail, chatId);

  const text = 
`✨ *Naya Temp Email Generate Hua:*

\`${newEmail}\`

_(Upar email par tap karein, copy ho jayega)_
━━━━━━━━━━━━━━━━━━━━
Ise Instagram me dalein. OTP aane par niche *Check OTP* dabayein.`;

  const inlineBtns = [
    [{ text: "📬 Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔄 Naya Email Banayein", callback_data: "btn_gen" }]
  ];

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- CHECK OTP FOR CURRENT EMAIL ---
async function checkCurrentOtp(chatId) {
  const currentEmail = USER_ACTIVE_EMAIL.get(chatId);

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle ek naya email banayein: *⚡ Generate Email*");
    return;
  }

  const record = EMAIL_HISTORY.get(currentEmail);

  if (record && record.otp) {
    await deliverOtpBox(chatId, record.otp, currentEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nInstagram par 'Resend Code' karein aur 5 second baad dobara *Check OTP* dabayein.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- FETCH OLD EMAIL OTP ---
async function fetchOldEmailOtp(chatId, inputEmail) {
  const cleanEmail = inputEmail.toLowerCase().trim();
  const record = EMAIL_HISTORY.get(cleanEmail);

  if (!record || !record.otp) {
    await sendMsg(
      chatId, 
      `❌ *Is Puraane Email Ka OTP Nahi Mila!*\n\nEmail: \`${cleanEmail}\`\n\nIs email par pichle 3 ghante me koi naya OTP nahi aaya hai ya Meta se deliver nahi hua.`
    );
    return;
  }

  const box = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *OLD EMAIL RECOVERED CODE*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${record.otp}\`

_(Tap code to copy)_
─────────────────────
📧 *Email:* \`${cleanEmail}\`
⏰ *Delivered:* ${record.time}`;

  let inlineBtns = [];
  if (record.link) inlineBtns.push([{ text: "🌐 Open Link", url: record.link }]);
  inlineBtns.push([{ text: "⚡ Generate Fresh Email", callback_data: "btn_gen" }]);

  await sendMsg(chatId, box, null, { inline_keyboard: inlineBtns });
}

// --- SINGLE BOX DELIVERER ---
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
  if (link) inlineBtns.push([{ text: "🌐 Open Link", url: link }]);
  inlineBtns.push([{ text: "⚡ Generate Email", callback_data: "btn_gen" }]);

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM CALLER ---
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
