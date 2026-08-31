/**
 * Simple Temp Mail Bot — Personal Use Only
 * Platform: Cloudflare Workers
 *
 * Features:
 *  - Generate a disposable email address
 *  - Check inbox / auto-detect OTP
 *  - Switch between two providers (Guerrilla Mail + mail.cx)
 *
 * No storage, no account vault, no bulk generation.
 * Set BOT_TOKEN as an environment variable / secret before deploying —
 * do not hardcode it in source.
 */

// mail.cx system domains are NOT fixed — they must be fetched from /v1/config.
// We cache them for a short time so we don't call /v1/config on every request.
let MAILCX_DOMAIN_CACHE = { domains: [], fetchedAt: 0 };

async function getMailcxDomains() {
  const now = Date.now();
  if (MAILCX_DOMAIN_CACHE.domains.length && (now - MAILCX_DOMAIN_CACHE.fetchedAt) < 10 * 60 * 1000) {
    return MAILCX_DOMAIN_CACHE.domains;
  }
  try {
    const res = await fetch('https://api.mail.cx/v1/config');
    const data = await res.json();
    // The public config exposes the usable system domains; fall back if shape differs.
    const domains = data.domains || data.system_domains || [];
    if (domains.length) {
      MAILCX_DOMAIN_CACHE = { domains, fetchedAt: now };
      return domains;
    }
  } catch (e) {}
  // Safe fallback if /v1/config is unreachable
  return MAILCX_DOMAIN_CACHE.domains.length ? MAILCX_DOMAIN_CACHE.domains : ['mailcx.pro'];
}

// Combined list shown in the "Switch Domain" menu.
// mail.cx domains are resolved lazily at generation time, so here we only
// need a stable label to route on.
const DOMAIN_LIST = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'mailcx-auto'   // special marker: "pick a live mail.cx system domain"
];

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

// ================= MAIL PROVIDERS =================
async function createMailbox(domainChoice = null) {
  const user = getRandomUser();
  const domain = domainChoice || DOMAIN_LIST[Math.floor(Math.random() * DOMAIN_LIST.length)];
  const isCx = domain === 'mailcx-auto';

  if (isCx) {
    // mail.cx has no "create mailbox" step — any address on one of its live
    // system domains starts receiving mail immediately. We just need a
    // currently-valid domain, fetched from /v1/config.
    const domains = await getMailcxDomains();
    const cxDomain = domains[Math.floor(Math.random() * domains.length)];
    return { isCx: '1', email: `${user}@${cxDomain}`, sid: '0' };
  }

  try {
    const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
    const sid = init.sid_token || '';
    const setRes = await fetch(
      `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`
    ).then(r => r.json());
    return { isCx: '0', email: (setRes.email_addr || `${user}@${domain}`).toLowerCase(), sid };
  } catch (e) {
    return { isCx: '1', email: `${user}@mail.cx`, sid: '0' };
  }
}

async function fetchMessages(isCx, email, sid) {
  if (isCx === '1') {
    try {
      // GET /v1/inbox/{address} is a long-poll: it holds the connection open
      // (server-side, up to ~25s) and returns as soon as mail arrives, or
      // 204 if the window elapses with nothing new. No auth token needed
      // for anonymous/low-volume use (just a lower per-IP rate limit).
      const res = await fetch(`https://api.mail.cx/v1/inbox/${encodeURIComponent(email)}`);
      if (res.status === 204) return []; // no new mail within the poll window
      if (!res.ok) return [];
      const data = await res.json();
      return (data.emails || []).map(m => ({
        id: m.id,
        from: m.from_email,
        subject: m.subject
      }));
    } catch (e) { return []; }
  } else {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
      return (res.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com').map(m => ({ id: m.mail_id }));
    } catch (e) { return []; }
  }
}

async function fetchDetail(isCx, email, sid, mailId) {
  if (isCx === '1') {
    try {
      const res = await fetch(`https://api.mail.cx/v1/email/${mailId}`);
      if (!res.ok) return { from: 'Unknown', subject: '', body: '' };
      const data = await res.json();
      return {
        from: data.from_email || 'Unknown',
        subject: data.subject || '(No Subject)',
        // full parsed body: prefer plain text, fall back to html, then preview
        body: data.text || data.html || data.preview_text || ''
      };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  } else {
    try {
      const data = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sid}`).then(r => r.json());
      return {
        from: data.mail_from || 'Unknown',
        subject: data.mail_subject || '(No Subject)',
        body: data.mail_body || ''
      };
    } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
  }
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
    const token = `t:${mb.isCx}:${mb.email}:${mb.sid}`;
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
    const isCx = parts[1];
    const email = parts[2];
    const sid = parts[3] || '0';

    const list = await fetchMessages(isCx, email, sid);

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
      // For mail.cx the inbox list already includes from/subject; only fetch
      // the full body (needed for OTP extraction) via /v1/email/{id}.
      const detail = await fetchDetail(isCx, email, sid, list[i].id);
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
    const labelFor = (d) => d === 'mailcx-auto' ? '@mail.cx (auto)' : `@${d}`;
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: labelFor(DOMAIN_LIST[i]), callback_data: `dgen_${DOMAIN_LIST[i]}` }];
      if (DOMAIN_LIST[i + 1]) row.push({ text: labelFor(DOMAIN_LIST[i + 1]), callback_data: `dgen_${DOMAIN_LIST[i + 1]}` });
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
