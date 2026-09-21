/**
 * Strict Filter: Sirf Instagram & Meta / Meta AI ke OTPs allow honge
 * Domain: vibepulsemedia.online
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

let ADMINS = new Set([PRIMARY_OWNER_ID.toString()]);

// Allowed Senders List (Sirf Instagram aur Meta ecosystem)
const ALLOWED_SENDERS = [
  "instagram.com",
  "mail.instagram.com",
  "facebookmail.com",
  "meta.com",
  "support.facebook.com",
  "meta.ai"
];

// Realistic Random Names Pool
const FIRST_NAMES = [
  "alok", "rohit", "vikram", "aman", "rahul", "aditya", "ankit", "deepak",
  "varun", "sachin", "manish", "sanjay", "kunal", "prateek", "sumit", "naveen",
  "arun", "karan", "mohit", "vijay", "ajay", "gourav", "harsh", "suraj"
];

const LAST_NAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "bose"
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ Meta/Instagram OTP Worker Running!", { status: 200 });
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
      return new Response("Internal Error: " + err.message, { status: 500 });
    }
  },

  async email(message, env, ctx) {
    try {
      const fromEmail = (message.from || "").toLowerCase().trim();
      const toEmail = (message.to || "").toLowerCase().trim();

      // --- STRICT FILTER: Check if Sender is from Instagram or Meta ---
      const isAllowed = ALLOWED_SENDERS.some(domain => fromEmail.endsWith(domain) || fromEmail.includes(domain));
      
      if (!isAllowed) {
        console.log(`Blocked email from unauthorized sender: ${fromEmail}`);
        return; // Non-Meta emails ko yahin drop kar dega
      }

      // Read RAW stream
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

      // Clean plain body parser
      const cleanBody = parseEmailContent(rawContent);

      // Deep OTP Detector (Meta / Instagram standard 6-digit codes)
      const otpRegex = /(?:code|otp|pin|security)[\s:=–-]{1,6}(\b\d{6}\b)/i;
      const otpMatch = cleanBody.match(otpRegex) || cleanBody.match(/\b\d{6}\b/);
      const extractedOtp = otpMatch ? (otpMatch[1] || otpMatch[0]) : null;

      // Verification link grabber
      const linkRegex = /(https?:\/\/[^\s<>"{}|\\^`]+(?:instagram\.com|facebook\.com|meta\.com)[^\s<>"{}|\\^`]*)/i;
      const linkMatch = cleanBody.match(linkRegex);
      const verifyLink = linkMatch ? linkMatch[0] : null;

      // Target chat extraction
      const localPart = toEmail.split("@")[0];
      let targetChatId = null;
      let isSystemRootMail = false;

      if (localPart.includes("x")) {
        const potentialId = localPart.split("x")[0];
        if (/^\d+$/.test(potentialId)) {
          targetChatId = potentialId;
        }
      }

      if (!targetChatId) {
        targetChatId = PRIMARY_OWNER_ID;
        isSystemRootMail = true;
      }

      if (isSystemRootMail && !ADMINS.has(targetChatId.toString())) {
        return;
      }

      // Telegram Message Formatting
      let alertMsg = `📸 *META / INSTAGRAM VERIFICATION*\n`;
      alertMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      alertMsg += `📧 *Mailbox:* \`${toEmail}\`\n`;
      alertMsg += `👤 *From:* \`${fromEmail}\`\n`;
      alertMsg += `📌 *Subject:* ${escapeMarkdown(subject)}\n`;
      alertMsg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      let actionButtons = [];

      if (extractedOtp) {
        alertMsg += `🔐 *CONFIRMATION CODE (OTP):*\n`;
        alertMsg += `👉 \`${extractedOtp}\` 👈 _(Tap to copy)_\n\n`;
      }

      if (verifyLink) {
        alertMsg += `🔗 *Verification Link Detect Hui*\n\n`;
        actionButtons.push([{ text: "🌐 Open Instagram / Meta Link", url: verifyLink }]);
      }

      const snippet = cleanBody.length > 350 ? cleanBody.substring(0, 350) + "..." : cleanBody;
      alertMsg += `📝 *Content:*\n_${escapeMarkdown(snippet || "No text")}_`;

      actionButtons.push([{ text: "🔄 Naya Random Email", callback_data: "generate_random" }]);

      if (targetChatId) {
        await sendTelegram(targetChatId, alertMsg, actionButtons);
      }

      // Log Channel
      if (DB_CHANNEL_ID) {
        const logText = `📁 *[META LOG]* To: \`${toEmail}\` | OTP: \`${extractedOtp || "None"}\``;
        await sendTelegram(DB_CHANNEL_ID, logText);
      }
    } catch (err) {
      console.error("Email Routing Error: " + err.message);
    }
  }
};

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

async function handleMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || "").trim();

  if (text.startsWith("/addadmin") && chatId === PRIMARY_OWNER_ID.toString()) {
    const newAdmin = text.split(" ")[1];
    if (newAdmin) {
      ADMINS.add(newAdmin.trim());
      await sendTelegram(chatId, `✅ User \`${newAdmin}\` ko admin list me jod diya gaya.`);
    }
    return;
  }

  if (text === "/start") {
    const welcome = 
      `⚡ *Meta & Instagram Temp Mail Engine*\n\n` +
      `Is bot ke zariye sirf Instagram aur Meta AI/Facebook ke verification codes receive honge.\n\n` +
      `🔹 \`/gen\` — Fresh random email banayein\n` +
      `🔹 \`/id\` — Apni Telegram User ID dekhein\n\n` +
      `🛡️ *Protection:* Kisi anya service (bank, google, external apps) ke emails automatically reject kar diye jayenge.`;

    const buttons = [
      [{ text: "⚡ Generate Random Email", callback_data: "generate_random" }]
    ];
    await sendTelegram(chatId, welcome, buttons);
  } 
  else if (text === "/gen") {
    const email = generateRandomAddress(chatId);
    const reply = 
      `✨ *Aapka Temp Email (For Instagram/Meta):*\n\n` +
      `📧 \`${email}\`\n\n` +
      `_(Tap karke copy karein)_\n` +
      `⚡ Instagram ya Meta par daalein, OTP turant yahan mil jayega.`;

    const buttons = [
      [{ text: "🔄 Naya Random Email", callback_data: "generate_random" }]
    ];
    await sendTelegram(chatId, reply, buttons);
  }
  else if (text === "/id") {
    await sendTelegram(chatId, `🆔 *Aapka Chat ID:* \`${chatId}\``);
  }
}

async function handleCallback(query) {
  const chatId = query.message.chat.id.toString();
  if (query.data === "generate_random") {
    const email = generateRandomAddress(chatId);
    const reply = 
      `✨ *Aapka Naya Random Email:*\n\n` +
      `📧 \`${email}\`\n\n` +
      `_(Tap to copy)_`;

    const buttons = [
      [{ text: "🔄 Naya Random Email", callback_data: "generate_random" }]
    ];
    await sendTelegram(chatId, reply, buttons);
  }
}
