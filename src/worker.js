/**
 * Professional Real Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let USER_SESSIONS = new Map(); // email -> chatId
let ADMIN_WATCHED_EMAILS = new Map(); // email -> adminChatId

// Allowed Meta/Instagram Senders
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

// Clean Indian Female Names
const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha",
  "tanya", "deepika", "radhika", "monika", "garima", "ekta", "kavita", "saloni",
  "alisha", "anushka", "diya", "prachi", "natasha", "rashmi", "bhavna"
];

const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey",
  "sen", "bose", "roy", "nair", "reddy", "kashyap", "bhardwaj", "saxena",
  "choudhary", "rawat", "malhotra", "kapoor", "shukla", "tripathi"
];

export default {
  // --- TELEGRAM WEBHOOK INGESTION ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      if (update.callback_query) {
        // Fast Instant Response to Telegram
        await handleCallback(update.callback_query);
      } else if (update.message) {
        await handleMessage(update.message);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  },

  // --- CLOUDFLARE EMAIL PROCESSOR ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Only Meta and Instagram
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

      // Deep 6-digit OTP Parser
      const otpRegex = /(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Link Extractor
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // Routing: Dynamic User Match ya Old Mail
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

      // Pure Isolated Delivery
      if (isOldMail) {
        for (const adminId of ADMINS) {
          await deliverPureOtpCard(adminId, extractedOtp, toEmail, verifyLink, true);
        }
      } else if (targetChatId) {
        await deliverPureOtpCard(targetChatId, extractedOtp, toEmail, verifyLink, false);
      }

      // Log Channel
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

// --- PURE OTP CARD (TAP TO COPY ONLY) ---
async function deliverPureOtpCard(chatId, otp, toEmail, link, isAdmin) {
  let text = "";
  if (otp) {
    text = `\`${otp}\`\n\n_${toEmail}_`;
  } else {
    text = `Link Received\n_${toEmail}_`;
  }

  let buttons = [];
  if (link) {
    buttons.push([{ text: "🌐 Open Link", url: link }]);
  }
  buttons.push([{ text: "🔄 Change Email", callback_data: "btn_generate" }]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// --- COMMANDS ---
async function handleMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

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

  // /start par clean starter panel
  if (text === "/start") {
    let buttons = [
      [{ text: "⚡ Generate Email", callback_data: "btn_generate" }]
    ];
    if (isAdmin) {
      buttons.push([{ text: "🔑 Old Email Hub", callback_data: "btn_admin_hub" }]);
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚡ *Temp Mail Portal*\n\nNiche button par tap karein:",
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  } 
  else if (text === "/gen") {
    await renderPureEmail(chatId, false, null, isAdmin);
  }
}

// --- CALLBACK ENGINE (ULTRA FAST) ---
async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const data = query.data;
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // Immediate Telegram handshake response taaki button freeze na ho
  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data === "btn_generate") {
    await renderPureEmail(chatId, true, messageId, isAdmin);
  } 
  else if (data === "btn_admin_hub" && isAdmin) {
    const hubText = `Old Mail Monitor:\n\`/watch name@${DOMAIN}\``;
    const btns = [[{ text: "🔙 Back", callback_data: "btn_generate" }]];
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: hubText,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: btns }
    });
  }
}

// --- PURE REAL EMAIL DISPLAY ---
async function renderPureEmail(chatId, isEdit = false, messageId = null, isAdmin = false) {
  // Pure realistic name bina kisi ID ya extra number ke
  const email = createPureFemaleAddress(chatId);
  const text = `\`${email}\``;

  let buttons = [
    [{ text: "🔄 Change Email", callback_data: "btn_generate" }]
  ];

  if (isAdmin) {
    buttons.push([{ text: "🔑 Old Email Hub", callback_data: "btn_admin_hub" }]);
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

// Real Human-like Email Generator (No ChatID in Address)
function createPureFemaleAddress(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const sep = Math.random() > 0.5 ? "." : "";
  const email = `${first}${sep}${last}${num}@${DOMAIN}`;

  // Session Map me link taaki aane wala email iss chatId ko deliver ho
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
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
