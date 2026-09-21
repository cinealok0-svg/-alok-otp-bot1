/**
 * Enterprise Meta/Instagram Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

// --- CORE SYSTEM SETTINGS ---
const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Storage
let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let ADMIN_WATCHED_EMAILS = new Map(); // target_email -> admin_chat_id

// Strict Meta Ecosystem Whitelist (Zero external legal risks)
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

// Curated Authentic Female Names
const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha",
  "tanya", "deepika", "radhika", "monika", "garima", "ekta", "kavita", "saloni",
  "alisha", "anushka", "diya", "prachi", "natasha", "rashmi", "bhavna"
];

// Curated Indian Surnames
const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey",
  "sen", "bose", "roy", "nair", "reddy", "kashyap", "bhardwaj", "saxena",
  "choudhary", "rawat", "malhotra", "kapoor", "shukla", "tripathi"
];

export default {
  // --- 1. TELEGRAM WEBHOOK ENGINE ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ Meta Worker Running", { status: 200 });
    }

    try {
      const update = await request.json();

      if (update.message) {
        await handleMessage(update.message);
      } else if (update.callback_query) {
        await handleCallback(update.callback_query);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  },

  // --- 2. CLOUDFLARE EMAIL PIPELINE ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Strict Sender Filter: Block unauthorized external traffic
      const isAllowed = ALLOWED_SENDERS.some(d => fromEmail.endsWith(d) || fromEmail.includes(d));
      if (!isAllowed) {
        return; // Auto drop
      }

      // Stream Parser
      const rawStream = message.raw;
      const reader = rawStream.getReader();
      let rawContent = "";
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawContent += decoder.decode(value, { stream: true });
      }

      // Extract Clean Body Text
      const cleanBody = parseEmailContent(rawContent);

      // Deep 6-Digit Code Extractor (Meta/Instagram Standard)
      const otpRegex = /(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Extract Action Links
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // Routing Architecture
      const localPart = toEmail.split("@")[0];
      let targetChatId = null;
      let isSystemMail = false;

      // Check Admin Targeted Watchlist
      if (ADMIN_WATCHED_EMAILS.has(toEmail)) {
        targetChatId = ADMIN_WATCHED_EMAILS.get(toEmail);
        isSystemMail = true;
      } 
      // Parse User Session format: {chatId}x{name}@domain
      else if (localPart.includes("x")) {
        const potentialId = localPart.split("x")[0];
        if (/^\d+$/.test(potentialId)) {
          targetChatId = potentialId;
        }
      }

      // Old/System Address Fallback
      if (!targetChatId) {
        isSystemMail = true;
      }

      // Deliveries
      if (isSystemMail) {
        for (const adminId of ADMINS) {
          await sendOtpCard(adminId, toEmail, extractedOtp, verifyLink, true);
        }
      } else if (targetChatId) {
        await sendOtpCard(targetChatId, toEmail, extractedOtp, verifyLink, false);
      }

      // Channel Audit Log
      if (DB_CHANNEL_ID) {
        await callTelegram("sendMessage", {
          chat_id: DB_CHANNEL_ID,
          text: `Log: \`${toEmail}\` | Code: \`${extractedOtp || "Link"}\``,
          parse_mode: "Markdown"
        });
      }
    } catch (e) {
      console.error("Email Ingestion Error: " + e.message);
    }
  }
};

// --- CARD BUILDERS & NOTIFIERS ---

async function sendOtpCard(chatId, toEmail, otp, link, isAdminRoute) {
  let text = "";

  if (otp) {
    text += `🔐 *YOUR VERIFICATION CODE:*\n\n`;
    text += `\`${otp}\`\n\n`;
    text += `_(Tap to copy code)_\n`;
    text += `──────────────────\n`;
  } else {
    text += `📩 *New Meta Email Received*\n`;
    text += `──────────────────\n`;
  }

  if (isAdminRoute) {
    text += `🛡️ *Mailbox:* Admin/Old Address\n`;
  }
  text += `📧 *Mail:* \`${toEmail}\``;

  let buttons = [];
  if (link) {
    buttons.push([{ text: "🌐 Open Verification Link", url: link }]);
  }
  buttons.push([{ text: "🔄 Next Email", callback_data: "action_next" }]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// --- COMMAND & MESSAGE LOGIC ---

async function handleMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // Master Authority Transfer
  if (text.startsWith("/transferowner") && isOwner) {
    const target = text.split(" ")[1];
    if (target && /^\d+$/.test(target)) {
      PRIMARY_OWNER_ID = target.trim();
      ADMINS.add(target.trim());
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `👑 Master Owner set to: \`${target}\``,
        parse_mode: "Markdown"
      });
    }
    return;
  }

  // Add Admin
  if (text.startsWith("/addadmin") && isOwner) {
    const target = text.split(" ")[1];
    if (target && /^\d+$/.test(target)) {
      ADMINS.add(target.trim());
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ Admin added: \`${target}\``,
        parse_mode: "Markdown"
      });
    }
    return;
  }

  // Admin Watch Specific Address
  if (text.startsWith("/watch") && isAdmin) {
    const targetEmail = text.split(" ")[1];
    if (targetEmail && targetEmail.includes("@")) {
      ADMIN_WATCHED_EMAILS.set(targetEmail.toLowerCase().trim(), chatId);
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🎯 Listening to: \`${targetEmail.toLowerCase().trim()}\``,
        parse_mode: "Markdown"
      });
    }
    return;
  }

  // Instant Email on /start or /gen
  if (text === "/start" || text === "/gen") {
    await deliverEmailInterface(chatId, false, null, isAdmin);
  } else if (text === "/id") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Your Telegram ID: \`${chatId}\``,
      parse_mode: "Markdown"
    });
  }
}

// --- INLINE CALLBACK LOGIC ---

async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const data = query.data;
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data === "action_next") {
    await deliverEmailInterface(chatId, true, messageId, isAdmin);
  } else if (data === "admin_old_mails" && isAdmin) {
    const panel = 
      `🔑 *Old & Root Mailbox Hub*\n\n` +
      `System addresses ke verification codes admins ko real-time broadcast hote hain.\n\n` +
      `Specific address monitor karne ke liye:\n` +
      `\`/watch name@${DOMAIN}\``;

    const btns = [[{ text: "🔙 Back", callback_data: "action_next" }]];

    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: panel,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: btns }
    });
  }
}

// --- UI GENERATOR ---

async function deliverEmailInterface(chatId, isEdit = false, messageId = null, isAdmin = false) {
  const email = generateRandomFemaleEmail(chatId);
  const text = 
    `*Your Temporary Email:*\n\n` +
    `\`${email}\`\n\n` +
    `_(Tap the email to copy)_`;

  let buttons = [
    [{ text: "🔄 Next Email", callback_data: "action_next" }]
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

// --- HELPER UTILITIES ---

function generateRandomFemaleEmail(chatId) {
  const first = FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const sep = Math.random() > 0.5 ? "." : "";
  const identity = `${first}${sep}${last}${num}`;
  return `${chatId}x${identity}@${DOMAIN}`;
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
