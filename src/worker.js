/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Fixes: Meta AI HTML OTP Parser + Anti-Pixel/Tracking Black Screen Filter
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let USER_STATE = new Map();
let MEMORY_LOCK = new Map();
let MEMORY_INBOX = new Map();
let MEMORY_USERS = new Map();

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

      // Inline Callback Buttons
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

        // Old email hub listener
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          await linkAndCheckOldEmail(chatId, text);
          return new Response("OK");
        }

        // Direct email paste
        if (text.includes(`@${DOMAIN}`)) {
          await linkAndCheckOldEmail(chatId, text);
          return new Response("OK");
        }

        // Main Menu
        if (text === "/start") {
          USER_STATE.delete(chatId);
          const keyboard = [
            [{ text: "⚡ Generate Email" }, { text: "📬 Check OTP" }],
            [{ text: "🔄 Change Email" }, { text: "🔑 Old Email Hub" }]
          ];

          await sendMsg(chatId, 
            "👋 *Meta AI & Instagram Temp Mail Hub*\n\nNaya email create karein ya kisi bhi purane email ka real OTP check karein:", 
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

      // Meta, Instagram, Facebook filters
      const isMeta = rawFrom.includes("meta") || 
                     rawFrom.includes("facebook") || 
                     rawFrom.includes("instagram");

      if (!isMeta) return;

      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";

      // 1. Accurate Meta AI OTP Extraction
      const extractedOtp = extractMetaAiOtp(subject, raw);

      // 2. Strict Link Extraction (Filters out 1x1 black screen pixels)
      const verifyLink = extractGenuineVerificationLink(raw);

      // OTP aur Link dono nahi mile toh message mat bhejo
      if (!extractedOtp && !verifyLink) return;

      // 3. Strict Deduplication (Prevents 2x-3x delivery)
      const dedupeKey = `${toEmail}_${extractedOtp || verifyLink}`;
      const now = Date.now();
      if (MEMORY_LOCK.has(dedupeKey)) {
        if (now - MEMORY_LOCK.get(dedupeKey) < 180000) return; // 3 min lock
      }
      MEMORY_LOCK.set(dedupeKey, now);

      // 4. Save to DB Channel
      const { messageId, db } = await getChannelDb();

      if (!db.inboxes) db.inboxes = {};
      db.inboxes[toEmail] = {
        otp: extractedOtp,
        link: verifyLink,
        time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
      };

      MEMORY_INBOX.set(toEmail, db.inboxes[toEmail]);

      const boundUser = (db.emails && db.emails[toEmail]) 
        ? db.emails[toEmail] 
        : (MEMORY_USERS.get(toEmail) || PRIMARY_OWNER_ID);

      await saveChannelDb(messageId, db);

      // 5. Deliver directly to user
      await deliverOtpBox(boundUser, extractedOtp, toEmail, verifyLink);

      // 6. DB Channel Log
      if (DB_CHANNEL_ID) {
        await sendMsg(
          DB_CHANNEL_ID, 
          `🔔 *[META OTP CAPTURED]*\n📧 Email: \`${toEmail}\`\n👤 User: \`${boundUser}\`\n🔑 OTP: \`${extractedOtp || "Link Only"}\``
        );
      }

    } catch (err) {
      console.error("Email Parsing Error:", err);
    }
  }
};

// --- META AI & INSTAGRAM OTP EXTRACTOR ---
function extractMetaAiOtp(subject, rawBody) {
  // 1. Decode Quoted-Printable Email content
  let body = rawBody
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 2. Priority Check: Subject Line (Sabse accurate)
  if (subject) {
    const subjMatch = subject.match(/\b(\d{3})\s?(\d{3})\b/) || 
                      subject.match(/\b(\d{6,8})\b/);
    if (subjMatch) {
      const code = subjMatch[0].replace(/\s+/g, "");
      if (code.length >= 6 && code.length <= 8) return code;
    }
  }

  // 3. Body Pre-Clean: Strip Head, Styles, and CSS Hex Colors (#141823 etc.)
  let cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/#[0-9a-fA-F]{6}\b/g, " ")
    .replace(/#[0-9a-fA-F]{3}\b/g, " ");

  // 4. Meta AI HTML Tag search (Meta AI codes are placed in <div>, <span>, or <td>)
  const tagMatches = [...cleanBody.matchAll(/>\s*([0-9]{3}\s?[0-9]{3}|[0-9]{6,8})\s*</g)];
  for (const m of tagMatches) {
    const code = m[1].replace(/\s+/g, "");
    if (code.length >= 6 && code.length <= 8 && !code.startsWith("000000")) {
      return code;
    }
  }

  // 5. Clean to Plain Text
  let plain = cleanBody
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");

  // 6. Context Patterns for Meta AI & Instagram
  const patterns = [
    /(?:code|otp|pin|passcode|código|security code|confirmation code)[\s:=–-]{1,30}(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)/i,
    /(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)\s*(?:is your|was requested|to verify|aapka code|to log in)/i,
    /enter\s*(?:the|this)?\s*code\s*[:\s-]{1,30}(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)/i
  ];

  for (const pat of patterns) {
    const match = plain.match(pat);
    if (match) {
      const code = (match[1] || match[0]).replace(/\D/g, "");
      if (code.length >= 6 && code.length <= 8) return code;
    }
  }

  // 7. General Fallback for 6-digit standalone code
  const allNumbers = plain.match(/\b\d{6,8}\b/g);
  if (allNumbers && allNumbers.length > 0) {
    for (const n of allNumbers) {
      if (!n.startsWith("202") && !n.startsWith("17")) { // Exclude year or epoch
        return n;
      }
    }
  }

  return null;
}

// --- STRICT VERIFICATION LINK FILTER (BLOCKS 1x1 PIXELS) ---
function extractGenuineVerificationLink(raw) {
  const urls = raw.match(/https?:\/\/[^\s<>"{}|\\^`']+/gi) || [];

  for (let u of urls) {
    let cleanUrl = u.replace(/&amp;/g, "&");

    // Domain check
    if (/meta\.com|instagram\.com|facebook\.com/i.test(cleanUrl)) {
      // 100% Reject tracking pixels and static assets
      if (/collect|pixel|beacon|logging|tr\?|1x1|static|fbcdn|cdn|help\.|privacy|terms|unsubscribe/i.test(cleanUrl)) {
        continue;
      }

      // Must be an actual confirmation or action link
      if (/confirm|verify|action|checkpoint|\/c\/|token=/i.test(cleanUrl)) {
        return cleanUrl;
      }
    }
  }

  return null;
}

// --- TELEGRAM CHANNEL DB ENGINE ---
async function getChannelDb() {
  const defaultDb = { users: {}, emails: {}, inboxes: {} };

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${DB_CHANNEL_ID}`);
    const data = await res.json();

    if (data.ok && data.result.pinned_message) {
      try {
        const parsed = JSON.parse(data.result.pinned_message.text);
        return { messageId: data.result.pinned_message.message_id, db: parsed };
      } catch (err) {}
    }

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
  } catch (e) {}

  return { messageId: null, db: defaultDb };
}

async function saveChannelDb(messageId, db) {
  if (!messageId) return;

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
  } catch (e) {}
}

// --- GENERATE NEW EMAIL ---
async function generateNewEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  const { messageId, db } = await getChannelDb();
  if (!db.users) db.users = {};
  if (!db.emails) db.emails = {};

  db.users[chatId] = newEmail;
  db.emails[newEmail] = chatId;
  await saveChannelDb(messageId, db);

  MEMORY_USERS.set(newEmail, chatId);

  const messageText = 
`✨ *Aapka Naya Temp Email Taiyar Hai:*

\`${newEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Yeh email Meta AI / Instagram me dalein. OTP aate hi yahan **turant ek bar** deliver ho jayega.`;

  const inlineBtns = [
    [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "🔑 Link Old Email", callback_data: "btn_old_hub" }]
  ];

  await sendMsg(chatId, messageText, null, { inline_keyboard: inlineBtns });
}

// --- CHECK OTP MANUAL REFRESH ---
async function checkCurrentOtp(chatId) {
  const { db } = await getChannelDb();
  const currentEmail = db.users ? db.users[chatId] : null;

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle ek naya email banayein ya *🔑 Old Email Hub* se purana email link karein.");
    return;
  }

  const record = (db.inboxes && db.inboxes[currentEmail]) ? db.inboxes[currentEmail] : MEMORY_INBOX.get(currentEmail);

  if (record && (record.otp || record.link)) {
    await deliverOtpBox(chatId, record.otp, currentEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nMeta AI ya Instagram se OTP send karein. Aate hi yahan show ho jayega.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh Status", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- OLD EMAIL HUB PROMPT ---
async function handleOldHubPrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_old_email");
  await sendMsg(
    chatId, 
    "🔑 *Old Email Hub*\n\nApna purana email address yahan chat me bhejein:\n\n_Example:_\n`anjali.saxena842@vibepulsemedia.online`\n\nIs email ka OTP direct aapko receive hoga."
  );
}

// --- LINK OLD EMAIL ---
async function linkAndCheckOldEmail(chatId, inputEmail) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Invalid Domain! Email \`@${DOMAIN}\` par khatam hona chahiye.`);
    return;
  }

  const { messageId, db } = await getChannelDb();
  if (!db.users) db.users = {};
  if (!db.emails) db.emails = {};

  db.users[chatId] = cleanEmail;
  db.emails[cleanEmail] = chatId;
  await saveChannelDb(messageId, db);

  MEMORY_USERS.set(cleanEmail, chatId);

  const record = (db.inboxes && db.inboxes[cleanEmail]) ? db.inboxes[cleanEmail] : MEMORY_INBOX.get(cleanEmail);

  if (record && (record.otp || record.link)) {
    await sendMsg(chatId, `✅ *Email Linked!*\nIs email ka latest OTP:`);
    await deliverOtpBox(chatId, record.otp, cleanEmail, record.link);
  } else {
    await sendMsg(
      chatId, 
      `✅ *Email Successfully Linked!*\n\nTarget Email: \`${cleanEmail}\`\n\n📡 *Status:* Yeh email aapke bot se link ho gaya hai. Ab aap Meta AI me jakar 'Resend Code' karein, OTP turant yahan aayega.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Check / Refresh OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- DELIVER OTP CARD ---
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
