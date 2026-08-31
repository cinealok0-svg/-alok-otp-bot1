/**
 * Simple Temp Mail Bot — Personal Use Only
 * Platform: Cloudflare Workers
 *
 * Features:
 *  - Generate a disposable email address
 *  - Check inbox / auto-detect OTP
 *  - Two providers: Guerrilla Mail + 1secmail (both free, no signup, no token)
 *
 * No storage, no account vault, no bulk generation.
 * Set BOT_TOKEN as an environment variable / secret before deploying —
 * do not hardcode it in source.
 */

// Guerrilla Mail domains (this API only accepts these specific domains)
const GUERRILLA_DOMAINS = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la'
];

// 1secmail domains (this API only accepts these specific domains)
const SECMAIL_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

// Combined menu list. Each entry knows which provider it belongs to.
const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Temp Mail Bot is running.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= HELPERS =================
function getRandomUser() {
  const chars = 'abcdefghjkmnpqrstuvwxyz';
  let name = '';
  for (let i = 0; i < 5; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return `${name}${Math.floor(1000 + Math.random() * 9000)}`;
}

function escapeHtml(str) {
  return (str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const match =
    clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) ||
    clean.match(/\b\d{6,8}\b/) ||
    clean.match(/\b\d{4}\b/);
  return match ? (match[1] || match[0]) : null;
}

// ================= PROVIDER: GUERRILLA MAIL =================
// f=1 marker used in the callback token
async function createGuerrillaMailbox(domain) {
  const user = getRandomUser();
  const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
  const sid = init.sid_token || '';
  const setRes = await fetch(
    `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`
  ).then(r => r.json());
  return { provider: 'g', email: (setRes.email_addr || `${user}@${domain}`).toLowerCase(), sid };
}

async function fetchGuerrillaMessages(sid) {
  try {
    const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
    return (res.list || [])
      .filter(m => m.mail_from !== 'no-reply@guerrillamail.com')
      .map(m => ({ id: m.mail_id, from: m.mail_from, subject: m.mail_subject }));
  } catch (e) { return []; }
}

async function fetchGuerrillaDetail(sid, mailId) {
  try {
    const data = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sid}`).then(r => r.json());
    return {
      from: data.mail_from || 'Unknown',
      subject: data.mail_subject || '(No Subject)',
      body: data.mail_body || ''
    };
  } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
}

// ================= PROVIDER: 1SECMAIL =================
// Simple, well-documented, no auth needed at all.
// Docs pattern: https://www.1secmail.com/api/v1/?action=...
async function createSecmailMailbox(domain) {
  const user = getRandomUser();
  // 1secmail needs no creation step — any login@domain on their domains is
  // implicitly a valid inbox the moment mail is sent to it.
  return { provider: 's', email: `${user}@${domain}`, login: user, domain };
}

async function fetchSecmailMessages(login, domain) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
    );
    if (!res.ok) return [];
    const list = await res.json();
    return (list || []).map(m => ({ id: m.id, from: m.from, subject: m.subject }));
  } catch (e) { return []; }
}

async function fetchSecmailDetail(login, domain, mailId) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${mailId}`
    );
    if (!res.ok) return { from: 'Unknown', subject: '', body: '' };
    const data = await res.json();
    return {
      from: data.from || 'Unknown',
      subject: data.subject || '(No Subject)',
      body: data.textBody || data.htmlBody || data.body || ''
    };
  } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
}

// ================= DISPATCH =================
async function createMailbox(domainChoice = null) {
  const domain = domainChoice || DOMAIN_LIST[Math.floor(Math.random() * DOMAIN_LIST.length)];
  if (SECMAIL_DOMAINS.includes(domain)) {
    return createSecmailMailbox(domain);
  }
  try {
    return await createGuerrillaMailbox(domain);
  } catch (e) {
    // fall back to 1secmail if Guerrilla Mail's API is briefly down
    return createSecmailMailbox(SECMAIL_DOMAINS[0]);
  }
}

async function fetchMessages(provider, login, domain, sid) {
  return provider === 's' ? fetchSecmailMessages(login, domain) : fetchGuerrillaMessages(sid);
}

async function fetchDetail(provider, login, domain, sid, mailId) {
  return provider === 's' ? fetchSecmailDetail(login, domain, mailId) : fetchGuerrillaDetail(sid, mailId);
}

// ================= TELEGRAM ROUTER =================
async function handleTelegramUpdate(update, env) {
  const telegramApi = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  // Home / Start
  if (text === "/start" || data === "home") {
    const card =
      `📬 <b>TEMP MAIL BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Generate a disposable email and check its inbox.`;
    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }]
      ]
    };
    return messageId ? edit(chatId, messageId, card, telegramApi, kb) : send(chatId, card, telegramApi, kb);
  }

  // Generate mailbox
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createMailbox(domainChoice);
    // Token format: t:provider:login:domain:sid
    const token = `t:${mb.provider}:${mb.provider === 's' ? mb.login : ''}:${mb.email}:${mb.provider === 'g' ? mb.sid : ''}`;
    const domainName = mb.email.split('@')[1];

    const out =
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${mb.email}</code>\n\n` +
      `📡 <b>Server:</b> <code>${domainName}</code>\n` +
      `⏳ <i>Tap below to check inbox.</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🌐 Switch Domain", callback_data: "domains" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // Check inbox
  if (data && data.startsWith("t:")) {
    const parts = data.split(":");
    const provider = parts[1];
    const login = parts[2];
    const email = parts[3];
    const sid = parts[4] || '';
    const domain = email.split('@')[1];

    const list = await fetchMessages(provider, login, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId,
        `📭 <b>No messages yet</b>\n\n📧 <code>${email}</code>\n\n<i>Tap refresh to check again.</i>`,
        telegramApi,
        {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: data }],
            [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home", callback_data: "home" }]
          ]
        });
    }

    let report = `📬 <b>INBOX (${list.length})</b>\n━━━━━━━━━━━━━━━━━━\n📧 <code>${email}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const detail = await fetchDetail(provider, login, domain, sid, list[i].id);
      const mail = {
        from: detail.from !== 'Unknown' ? detail.from : (list[i].from || 'Unknown'),
        subject: detail.subject || list[i].subject || '(No Subject)',
        body: detail.body
      };
      const fullText = (mail.subject || "") + " " + (mail.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 <b>From:</b> <code>${escapeHtml(mail.from)}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${escapeHtml(mail.subject)}</i>\n`;
      if (otp) report += `🔑 <b>OTP:</b> <code>${otp}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [[{ text: "🔄 Refresh", callback_data: data }]];
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // Domain switcher
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: `@${DOMAIN_LIST[i]}`, callback_data: `dgen_${DOMAIN_LIST[i]}` }];
      if (DOMAIN_LIST[i + 1]) row.push({ text: `@${DOMAIN_LIST[i + 1]}`, callback_data: `dgen_${DOMAIN_LIST[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain:</b>`, telegramApi, { inline_keyboard: rows });
  }
}

// ================= TELEGRAM SEND HELPERS =================
async function send(chatId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return send(chatId, text, telegramApi, kb);
  return res;
}
