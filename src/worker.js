/**
 * Ultimate Temp Mail & OTP Engine (Meta & Instagram Exclusive)
 * Domain: vibepulsemedia.online
 */

// --- CONFIGURATION ---
const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
let PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Roles & Watchlist
let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);
let ADMIN_WATCHED_EMAILS = new Map(); // target_email -> admin_chat_id

// Strict Meta Ecosystem Whitelist
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

// Realistic Human Name Pool
const FIRST_NAMES = [
  "alok", "rohit", "vikram", "aman", "rahul", "aditya", "ankit", "deepak",
  "varun", "sachin", "manish", "sanjay", "kunal", "prateek", "sumit", "naveen",
  "arun", "karan", "mohit", "vijay", "ajay", "gourav", "harsh", "suraj", "vivek",
  "neeraj", "pankaj", "abhishek", "ritesh", "ashish", "mayank", "tarun", "shivam"
];

const LAST_NAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "bose",
  "shukla", "dubey", "tripathi", "saxena", "bhardwaj", "choudhary", "rawat"
];

export default {
  // --- TELEGRAM WEBHOOK INGESTION ---
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ Temp Mail Worker is Live & Protected!", { status: 200 });
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

  // --- EMAIL ROUTING INTERCEPTOR ---
  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // Strict Sender Filter: Reject unauthorized origins
      const isAllowed = ALLOWED_SENDERS.some(domain => fromEmail.endsWith(domain) || fromEmail.includes(domain));
      if (!isAllowed) {
        console.log(`[Security Alert] Blocked email from: ${fromEmail}`);
        return;
      }

      // Stream Reader
      const rawStream = message.raw;
      const reader = rawStream.getReader();
      let rawContent = "";
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawContent += decoder.decode(value, { stream: true });
      }

      // Subject extraction
      const subjectMatch = rawContent.match(/^Subject:\s*(.*?)(?:\r?\n(?![ \t]))/im);
      const subject = subjectMatch ? subjectMatch[1].replace(/\r?\n\s+/g, " ").trim() : "(No Subject)";

      // Body Cleaning
      const cleanBody = parseEmailContent(rawContent);

      // Deep 6-Digit Meta/Instagram OTP Detection
      const otpRegex = /(?:code|otp|pin|security|código|passcode)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Verification / Confirm Link Extractor
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // Routing Classifier
      const localPart = toEmail.split("@")[0];
      let targetChatId = null;
      let isSystemMail = false;

      // 1. Check if an Admin has explicitly locked onto this old email
      if (ADMIN_WATCHED_EMAILS.has(toEmail)) {
        targetChatId = ADMIN_WATCHED_EMAILS.get(toEmail);
        isSystemMail = true;
      }
      // 2. Format check: {chatId}x{name}@vibepulsemedia.online
      else if (localPart.includes("x")) {
        const potentialId = localPart.split("x")[0];
        if (/^\d+$/.test(potentialId)) {
          targetChatId = potentialId;
        }
      }

      // 3. Fallback: Purana fixed email address
      if (!targetChatId) {
        isSystemMail = true;
      }

      // Admin Broadcast for Purane Emails
      if (isSystemMail) {
        for (const adminId of ADMINS) {
          await sendOtpNotification(adminId, toEmail, fromEmail, subject, extractedOtp, verifyLink, true);
        }
      } else if (targetChatId) {
        await sendOtpNotification(targetChatId, toEmail, fromEmail, subject, extractedOtp, verifyLink, false);
      }

      // Realtime Logs to DB Channel
      if (DB_CHANNEL_ID) {
        const log = `📁 *[METAMAIL LOG]*\nMailbox: \`${toEmail}\`\nFrom: \`${fromEmail}\`\nOTP: \`${extractedOtp || "None"}\``;
        await sendTelegram(DB_CHANNEL_ID, log);
      }
    } catch (err) {
      console.error("Routing Error: " + err.message);
    }
  }
};

// --- NOTIFICATION DISPATCHER ---

async function sendOtpNotification(chatId, toEmail, fromEmail, subject, otp, link, isAdminRoute) {
  let text = "";

  if (otp) {
    text += `🔐 *VERIFICATION CODE (OTP):*\n\n`;
    text += `\`${otp}\`\n\n`;
    text += `_(Tap above to copy code)_\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  } else {
    text += `📬 *New Meta Email Received*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  if (isAdminRoute) {
    text += `🛡️ *Mailbox Type:* \`Admin/Old Mail\`\n`;
  }
  text += `📨 *To:* \`${toEmail}\`\n`;
  text += `👤 *From:* \`${fromEmail}\`\n`;
  text += `📌 *Subject:* ${escapeMarkdown(subject)}\n`;

  let buttons = [];
  if (link) {
    buttons.push([{ text: "🌐 Open Verification Link", url: link }]);
  }
  buttons.push([{ text: "⚡ Generate New Email", callback_data: "generate_random" }]);

  await sendTelegram(chatId, text, buttons);
}

// --- TELEGRAM COMMAND HANDLER ---

async function handleMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  // 1. Transfer Master Ownership
  if (text.startsWith("/transferowner") && isOwner) {
    const newOwner = text.split(" ")[1];
    if (newOwner && /^\d+$/.test(newOwner)) {
      PRIMARY_OWNER_ID = newOwner.trim();
      ADMINS.add(newOwner.trim());
      await sendTelegram(chatId, `👑 Master Ownership transferred to: \`${newOwner}\``);
      await sendTelegram(newOwner, `👑 Aap ab is bot ke Master Owner ban gaye hain.`);
    } else {
      await sendTelegram(chatId, `Format: \`/transferowner <telegram_user_id>\``);
    }
    return;
  }

  // 2. Add New Admin
  if (text.startsWith("/addadmin") && isOwner) {
    const target = text.split(" ")[1];
    if (target && /^\d+$/.test(target)) {
      ADMINS.add(target.trim());
      await sendTelegram(chatId, `✅ Admin added successfully: \`${target}\``);
      await sendTelegram(target, `🎉 Aapko is bot par Admin access de diya gaya hai.`);
    } else {
      await sendTelegram(chatId, `Format: \`/addadmin <telegram_user_id>\``);
    }
    return;
  }

  // 3. Remove Admin
  if (text.startsWith("/removeadmin") && isOwner) {
    const target = text.split(" ")[1];
    if (target && ADMINS.has(target.trim())) {
      if (target.trim() === PRIMARY_OWNER_ID.toString()) {
        await sendTelegram(chatId, `⚠️ Master Owner ko remove nahi kiya ja sakta.`);
        return;
      }
      ADMINS.delete(target.trim());
      await sendTelegram(chatId, `🗑️ Admin privileges revoked for: \`${target}\``);
    }
    return;
  }

  // 4. Watch Old/Custom Email (Admin Feature)
  if (text.startsWith("/watch") && isAdmin) {
    const targetMail = text.split(" ")[1];
    if (targetMail && targetMail.includes("@")) {
      ADMIN_WATCHED_EMAILS.set(targetMail.toLowerCase().trim(), chatId);
      await sendTelegram(chatId, `🎯 *Listening Active!*\nAb \`${targetMail.toLowerCase().trim()}\` par aane wale Meta/IG ke OTPs direct aapko deliver honge.`);
    } else {
      await sendTelegram(chatId, `Format: \`/watch targetemail@${DOMAIN}\``);
    }
    return;
  }

  // 5. Default Start Menu
  if (text === "/start") {
    let welcome = 
      `*Meta & Instagram Mail Portal*\n\n` +
      `Generate instant disposable emails for Meta AI & Instagram signups.\n\n` +
      `Neeche diye button par tap karke instant email lein:`;

    let buttons = [
      [{ text: "⚡ Generate Email", callback_data: "generate_random" }]
    ];

    if (isAdmin) {
      buttons.push([{ text: "🔑 Old Email OTP Hub", callback_data: "admin_old_mails" }]);
      buttons.push([{ text: "⚙️ Admin Control Panel", callback_data: "admin_panel" }]);
    }

    await sendTelegram(chatId, welcome, buttons);
  }
  else if (text === "/gen") {
    await sendEmailMessage(chatId);
  }
  else if (text === "/id") {
    await sendTelegram(chatId, `Your ID: \`${chatId}\``);
  }
}

// --- CALLBACK ENGINE ---

async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  const data = query.data;
  const isOwner = (chatId === PRIMARY_OWNER_ID.toString());
  const isAdmin = ADMINS.has(chatId) || isOwner;

  if (data === "generate_random") {
    await sendEmailMessage(chatId);
  } 
  else if (data === "admin_old_mails") {
    if (!isAdmin) return;
    const info = 
      `🔑 *Old & Custom Domain Mail Hub*\n\n` +
      `Purane kisi bhi system email address par aane wale Meta OTPs automatically admins ko deliver ho rahe hain.\n\n` +
      `🔹 Kisi specific purane mail ko track karne ke liye command dein:\n` +
      `\`/watch purana_email@${DOMAIN}\`\n\n` +
      `Status: 🟢 *Active & Secure*`;

    const btns = [[{ text: "🔙 Back", callback_data: "back_to_main" }]];
    await sendTelegram(chatId, info, btns);
  }
  else if (data === "admin_panel") {
    if (!isAdmin) return;
    let panelText = 
      `⚙️ *ADMIN CONTROL PANEL*\n\n` +
      `👑 *Primary Owner:* \`${PRIMARY_OWNER_ID}\`\n` +
      `👥 *Admin List:* \`${Array.from(ADMINS).join(", ")}\`\n\n` +
      `*Management Commands:*\n` +
      `🔸 \`/transferowner <id>\` — Full master ownership shift\n` +
      `🔸 \`/addadmin <id>\` — Whitelist new admin\n` +
      `🔸 \`/removeadmin <id>\` — Revoke admin access\n` +
      `🔸 \`/watch <email>\` — Track custom old email`;

    const btns = [[{ text: "🔙 Back", callback_data: "back_to_main" }]];
    await sendTelegram(chatId, panelText, btns);
  }
  else if (data === "back_to_main") {
    let welcome = `*Meta & Instagram Mail Portal*`;
    let buttons = [[{ text: "⚡ Generate Email", callback_data: "generate_random" }]];
    if (isAdmin) {
      buttons.push([{ text: "🔑 Old Email OTP Hub", callback_data: "admin_old_mails" }]);
      buttons.push([{ text: "⚙️ Admin Control Panel", callback_data: "admin_panel" }]);
    }
    await sendTelegram(chatId, welcome, buttons);
  }
}

// Delivery with Clean Tap-to-Copy Mono Text
async function sendEmailMessage(chatId) {
  const email = generateRandomAddress(chatId);
  const reply = 
    `*Your Temporary Email:*\n\n` +
    `\`${email}\`\n\n` +
    `_(Tap the email to copy)_`;

  const buttons = [
    [{ text: "🔄 Change / New Email", callback_data: "generate_random" }]
  ];
  await sendTelegram(chatId, reply, buttons);
}

// --- UTILITIES ---

function generateRandomAddress(chatId) {
  const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const sep = Math.random() > 0.5 ? "." : "";
  const randomUser = `${fName}${sep}${lName}${num}`;
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

function escapeMarkdown(text) {
  return (text || "").replace(/([_*\[\]()~`>#+=|{}.!-])/g, "\\$1");
}

async function sendTelegram(chatId, text, buttons = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };
  if (buttons) {
    body.reply_markup = { inline_keyboard: buttons };
  }
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
