/**
 * ============================================
 *  TEMP MAIL OTP BOT — 1SECMAIL API
 *  Platform: Cloudflare Workers
 *  Only OTP — No extra features
 * ============================================
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net'];
const userSessions = {};

// ============================================
//  GENERATE RANDOM USERNAME
// ============================================

function generateUser() {
  const names = ['alok', 'priya', 'rahul', 'sneha', 'amit', 'kavya', 'vikas', 'tanvi', 'rohit', 'neha'];
  const num = Math.floor(1000 + Math.random() * 9000);
  return names[Math.floor(Math.random() * names.length)] + num;
}

// ============================================
//  1SECMAIL API FUNCTIONS
// ============================================

async function createTempMail() {
  const user = generateUser();
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  return { email: `${user}@${domain}`, user, domain };
}

async function checkInbox(user, domain) {
  const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${user}&domain=${domain}`);
  return await res.json();
}

async function readMessage(user, domain, id) {
  const res = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${user}&domain=${domain}&id=${id}`);
  return await res.json();
}

// ============================================
//  OTP EXTRACTOR
// ============================================

function extractOTP(text) {
  if (!text) return null;
  const patterns = [
    /\b\d{6}\b/,
    /\b\d{4}\b/,
    /OTP[:\s]*(\d{4,6})/i,
    /code[:\s]*(\d{4,6})/i,
    /verification[:\s]*(\d{4,6})/i,
    /pin[:\s]*(\d{4,6})/i
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1] || match[0];
  }
  return null;
}

// ============================================
//  TELEGRAM HELPERS
// ============================================

async function send(chatId, text, kb = null) {
  const p = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  return fetch(`${TELEGRAM_API}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
}

async function edit(chatId, msgId, text, kb = null) {
  const p = { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  return fetch(`${TELEGRAM_API}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
}

// ============================================
//  MAIN FETCH HANDLER
// ============================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ OTP Bot Running!", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleUpdate(update));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ============================================
//  TELEGRAM UPDATE HANDLER
// ============================================

async function handleUpdate(update) {
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;
  const userId = String(msg?.from?.id || cb?.from?.id || "");

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  // ============================================
  //  /START COMMAND
  // ============================================

  if (text === "/start") {
    return send(chatId,
      `📬 <b>OTP BOT — TEMP MAIL</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔹 <b>/gen</b> — Generate temp mail\n` +
      `🔹 Then tap <b>Check OTP</b> to fetch code\n\n` +
      `✅ Works with: Instagram, Telegram, WhatsApp, Gmail`
    );
  }

  // ============================================
  //  /GEN — GENERATE TEMP MAIL
  // ============================================

  if (text === "/gen") {
    const mail = await createTempMail();
    userSessions[userId] = mail;

    return send(chatId,
      `📬 <b>TEMP MAIL GENERATED</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <code>${mail.email}</code>\n\n` +
      `⏳ Send OTP to this email, then tap "Check OTP".`,
      {
        inline_keyboard: [
          [{ text: "📩 Check OTP", callback_data: `chk_${mail.user}_${mail.domain}` }],
          [{ text: "🔄 New Mail", callback_data: "new" }]
        ]
      }
    );
  }

  // ============================================
  //  NEW MAIL
  // ============================================

  if (data === "new") {
    const mail = await createTempMail();
    userSessions[userId] = mail;

    return edit(chatId, messageId,
      `📬 <b>TEMP MAIL GENERATED</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <code>${mail.email}</code>\n\n` +
      `⏳ Send OTP to this email, then tap "Check OTP".`,
      {
        inline_keyboard: [
          [{ text: "📩 Check OTP", callback_data: `chk_${mail.user}_${mail.domain}` }],
          [{ text: "🔄 New Mail", callback_data: "new" }]
        ]
      }
    );
  }

  // ============================================
  //  CHECK OTP
  // ============================================

  if (data && data.startsWith('chk_')) {
    const [, user, domain] = data.split('_');

    // Show loading
    await send(chatId, "⏳ Checking inbox...");

    try {
      const messages = await checkInbox(user, domain);

      if (messages.length === 0) {
        return send(chatId,
          `📭 <b>No emails yet</b>\n\n` +
          `⏳ Waiting for OTP...\n` +
          `💡 Tap <b>Refresh</b> after 30-60 seconds.`,
          {
            inline_keyboard: [
              [{ text: "🔄 Refresh", callback_data: `chk_${user}_${domain}` }],
              [{ text: "🆕 New Mail", callback_data: "new" }]
            ]
          }
        );
      }

      // Read latest message
      const latest = messages[messages.length - 1];
      const mail = await readMessage(user, domain, latest.id);

      const otp = extractOTP(mail.body || mail.textBody || '');

      if (otp) {
        return send(chatId,
          `✅ <b>OTP FOUND!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🔑 <b>OTP:</b> <code>${otp}</code>\n` +
          `📩 <b>From:</b> ${mail.from || 'Unknown'}\n` +
          `📌 <b>Subject:</b> ${mail.subject || '(No subject)'}\n\n` +
          `📦 <i>Copy and use this OTP.</i>`,
          {
            inline_keyboard: [
              [{ text: `📋 Copy OTP: ${otp}`, callback_data: `copy_${otp}` }],
              [{ text: "🔄 New Mail", callback_data: "new" }]
            ]
          }
        );
      } else {
        return send(chatId,
          `📩 <b>New email received</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📩 <b>From:</b> ${mail.from || 'Unknown'}\n` +
          `📌 <b>Subject:</b> ${mail.subject || '(No subject)'}\n\n` +
          `❌ <b>No OTP detected</b>\n` +
          `📄 <i>Message preview:</i>\n<code>${(mail.body || '').substring(0, 150)}...</code>`,
          {
            inline_keyboard: [
              [{ text: "🔄 Refresh", callback_data: `chk_${user}_${domain}` }],
              [{ text: "🆕 New Mail", callback_data: "new" }]
            ]
          }
        );
      }
    } catch (error) {
      return send(chatId, `❌ Error: ${error.message}`);
    }
  }

  // ============================================
  //  COPY OTP (Dummy — user manually copies)
  // ============================================

  if (data && data.startsWith('copy_')) {
    const otp = data.replace('copy_', '');
    return send(chatId, `📋 <b>OTP:</b> <code>${otp}</code>\n\n<i>Copied! Use it now.</i>`);
  }

  // ============================================
  //  FALLBACK
  // ============================================

  if (text && !text.startsWith('/')) {
    return send(chatId, `❌ Command not recognized.\n\nUse <b>/start</b> to begin.`);
  }
}
