/**
 * 100% Working Meta AI & Instagram Temp Mail Engine
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let ADMIN_WATCHED_EMAILS = new Map();

// Expanded Meta & Instagram Whitelist
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "facebook.com",
  "meta.com",
  "meta.ai",
  "support.facebook.com"
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

      if (update.callback_query) {
        const query = update.callback_query;
        const chatId = query.message.chat.id.toString();
        const data = query.data;

        ctx.waitUntil(handleAction(chatId, data));

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: query.id
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (update.message) {
        ctx.waitUntil(handleIncomingMessage(update.message));
        return new Response("OK", { status: 200 });
      }

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

      // Check Meta/Instagram/Facebook Senders
      const isAllowed = ALLOWED_SENDERS.some(d => fromEmail.includes(d));
      if (!isAllowed) {
        console.log("Blocked non-meta sender:", fromEmail);
        return;
      }

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

      // Deep 6-digit & 8-digit OTP Parser
      const otpRegex = /(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6,8}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Link Extractor
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // ROUTING FIX: Agar kisi ko deliver na ho sake, direct PRIMARY_OWNER_ID ko bhejo!
      let targetChatId = null;

      if (ADMIN_WATCHED_EMAILS.has(toEmail)) {
        targetChatId = ADMIN_WATCHED_EMAILS.get(toEmail);
      } else if (toEmail.includes("x")) {
        const id = toEmail.split("@")[0].split("x")[0];
        if (/^\d+$/.test(id)) targetChatId = id;
      }

      // FALLBACK TO OWNER (Agar routing fail ho rahi thi toh ab miss nahi hoga)
      if (!targetChatId) {
        targetChatId = PRIMARY_OWNER_ID;
      }

      await deliverOtpMessage(targetChatId, extractedOtp, toEmail, verifyLink);

      // Backup: DB Channel Par Send Karo
      if (DB_CHANNEL_ID) {
        await callTelegram("sendMessage", {
          chat_id: DB_CHANNEL_ID,
          text: `🔔 *[META EMAIL]*\nTo: \`${toEmail}\`\nFrom: \`${fromEmail}\`\nCode: \`${extractedOtp || "None"}\``,
          parse_mode: "Markdown"
        });
      }
    } catch (e) {
      console.error("Email Error: " + e.message);
    }
  }
};

// --- SINGLE-TAP COPY OTP MESSAGE ---
async function deliverOtpMessage(chatId, otp, toEmail, link) {
  let text = "";
  if (otp) {
    text = `🔐 *META CODE (OTP):*\n\n\`${otp}\`\n\n_(Tap code to copy)_\n──────────────────\n📧 \`${toEmail}\``;
  } else {
    text = `📩 *New Meta Verification Email*\n──────────────────\n📧 \`${toEmail}\``;
  }

  let inlineButtons = [];
  if (link) {
    inlineButtons.push([{ text: "🌐 Open Verification Link", url: link }]);
  }

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: inlineButtons.length > 0 ? { inline_keyboard: inlineButtons } : undefined
  });
}

// --- MESSAGE HANDLER ---
async function handleIncomingMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  if (text === "/start") {
    let mainKeyboard = [
      [{ text: "⚡ Generate Email" }],
      [{ text: "🔄 Change Email" }]
    ];
    if (isAdmin) {
      mainKeyboard.push([{ text: "🔑 Old Email Hub" }]);
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⚡ *Meta AI & Instagram Mail Portal*\n\nNeeche button par tap karein:",
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: mainKeyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
    return;
  }

  if (text === "⚡ Generate Email" || text === "🔄 Change Email" || text === "/gen" || text === "/new") {
    await sendPureEmail(chatId);
    return;
  }

  if (text === "🔑 Old Email Hub" && isAdmin) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Old Mail Monitor Active for domain: \`${DOMAIN}\`\n\nKisi email ko direct watch karne ke liye:\n\`/watch email@${DOMAIN}\``,
      parse_mode: "Markdown"
    });
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
}

async function handleAction(chatId, data) {
  if (data === "cmd_generate") {
    await sendPureEmail(chatId);
  }
}

// Clean Email Delivery (Pure text - tap to copy)
async function sendPureEmail(chatId) {
  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const email = `${first}.${last}${num}@${DOMAIN}`;

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `\`${email}\``,
    parse_mode: "Markdown"
  });
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
