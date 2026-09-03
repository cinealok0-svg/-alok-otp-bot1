/**
 * All-In-One Bot: Temp Mail + Instant Custom Email OTP Reader + Fast Insta DL
 * Platform: Cloudflare Workers
 */

// ================= CONFIGURATION & DOMAINS =================
const GUERRILLA_DOMAINS = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'grr.la',
  'pokemail.net',
  'spam4.me'
];

const SECMAIL_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

// Realistic names pool
const FEMALE_FIRST_NAMES = [
  "aanya", "aadhya", "aarohi", "ananya", "aditi", "diya", "ishita", "kavya", "khushi", "myra",
  "navya", "pooja", "priya", "riya", "saanvi", "shreya", "sneha", "tanvi", "tanya", "vaishnavi",
  "emma", "olivia", "ava", "sophia", "isabella", "charlotte", "amelia", "mia", "harper", "evelyn",
  "abigail", "emily", "ella", "elizabeth", "camila", "luna", "sofia", "avery", "mila", "aria"
];

const FEMALE_LAST_NAMES = [
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy",
  "smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez"
];

// ================= HELPERS =================
function getRandomUser() {
  const first = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const last = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  const num2 = Math.floor(10 + Math.random() * 90);
  const birthYear = Math.floor(1996 + Math.random() * 9);

  const formats = [
    `${first}.${last}${num2}`,
    `${first}.${last}${birthYear}`,
    `${first}_${last}${num2}`,
    `${first}${last}${num2}`,
    `${first}.${last}`
  ];

  return formats[Math.floor(Math.random() * formats.length)].toLowerCase();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = String(text)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ');

  // 1. Keyword match (Hindi / English / Meta format)
  const postMatch = clean.match(/(?:otp|code|verification|passcode|pin|कन्फ़र्म|कोड|security\s*code)\D{0,15}\b([0-9]{4,8})\b/i);
  if (postMatch) return postMatch[1];

  // 2. Number before keyword
  const preMatch = clean.match(/\b([0-9]{4,8})\b\D{0,15}(?:otp|code|verification|passcode|pin|कन्फ़र्म)/i);
  if (preMatch) return preMatch[1];

  // 3. Standalone 6-8 digits
  const sixDigit = clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/);
  if (sixDigit) return sixDigit[1];

  // 4. Standalone 4-5 digits
  const fourDigit = clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);
  return fourDigit ? fourDigit[1] : null;
}

// ================= PERMANENT PROVIDER LOGIC =================
// Guerrilla Mail
async function fetchGuerrillaInbox(login, domain) {
  try {
    const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
    const sid = init.sid_token || '';

    await fetch(
      `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(login)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`
    ).then(r => r.json());

    const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
    const list = (res.list || [])
      .filter(m => m.mail_from !== 'no-reply@guerrillamail.com')
      .map(m => ({ id: m.mail_id, from: m.mail_from, subject: m.mail_subject }));

    return { list, sid, email: `${login}@${domain}`.toLowerCase() };
  } catch (e) {
    return { list: [], sid: '', email: `${login}@${domain}`.toLowerCase() };
  }
}

async function fetchGuerrillaDetail(sid, mailId) {
  try {
    const data = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sid}`).then(r => r.json());
    return {
      from: data.mail_from || 'Unknown',
      subject: data.mail_subject || '(No Subject)',
      body: data.mail_body || ''
    };
  } catch (e) {
    return { from: 'Unknown', subject: '', body: '' };
  }
}

// 1secmail
async function fetchSecmailInbox(login, domain) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
    );
    if (!res.ok) return { list: [], email: `${login}@${domain}`.toLowerCase() };
    const list = await res.json();
    return {
      list: (list || []).map(m => ({ id: m.id, from: m.from, subject: m.subject })),
      email: `${login}@${domain}`.toLowerCase()
    };
  } catch (e) {
    return { list: [], email: `${login}@${domain}`.toLowerCase() };
  }
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
  } catch (e) {
    return { from: 'Unknown', subject: '', body: '' };
  }
}

// Token Handling
function getProvider(domain) {
  return SECMAIL_DOMAINS.includes(domain.toLowerCase()) ? 's' : 'g';
}

function encodeToken(provider, domain, login) {
  let dIdx = DOMAIN_LIST.indexOf(domain.toLowerCase());
  if (dIdx === -1) dIdx = 0;
  return `c:${provider}:${dIdx}:${login}`;
}

function decodeToken(tokenStr) {
  const parts = tokenStr.split(':');
  return {
    provider: parts[1],
    domain: DOMAIN_LIST[parseInt(parts[2], 10)] || DOMAIN_LIST[0],
    login: parts[3]
  };
}

// ================= PARALLEL INSTAGRAM DOWNLOADER =================
async function fetchInstagramFast(rawUrl) {
  const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '');
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  const engines = [
    (async () => {
      const res = await fetch(`https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.data || [];
      const item = list.find(x => x?.type === 'video' || (x?.url && x.url.includes('.mp4'))) || list[0];
      if (item?.url) return { videoUrl: item.url, caption: json?.caption || item?.caption || "" };
      throw new Error();
    })(),
    (async () => {
      const res = await fetch(`https://bk9.fun/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.BK9 || json?.data || [];
      const item = Array.isArray(list) ? list[0] : list;
      const url = item?.url || item?.video;
      if (url) return { videoUrl: url, caption: json?.caption || "" };
      throw new Error();
    })(),
    (async () => {
      const res = await fetch(`https://api.vkrdownloader.com/server?v=${encodeURIComponent(cleanUrl)}`, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const json = await res.json();
      if (json?.data?.downloadUrl) return { videoUrl: json.data.downloadUrl, caption: json.data.title || "" };
      throw new Error();
    })(),
    (async () => {
      const match = cleanUrl.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
      if (!match) throw new Error();
      const embedRes = await fetch(`https://www.instagram.com/p/${match[1]}/embed/captioned/`, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await embedRes.text();
      const vidMatch = html.match(/"video_url":"([^"]+)"/);
      if (!vidMatch) throw new Error();
      const capMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/);
      const caption = capMatch ? capMatch[1].replace(/<[^>]+>/g, '').trim() : "";
      return { videoUrl: JSON.parse(`"${vidMatch[1]}"`), caption };
    })()
  ];

  try {
    const result = await Promise.any(engines);
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
}

// ================= WORKER ENTRY =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Bot is active.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= TELEGRAM HANDLER =================
async function handleTelegramUpdate(update, env) {
  const telegramApi = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  let text = msg?.text?.trim() || "";
  const data = cb?.data;

  if (!chatId) return;

  text = text.replace(/@\w+bot/i, '').trim();

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  // 1. INSTAGRAM REEL DOWNLOADER
  const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);

  if (igMatch) {
    const igUrl = igMatch[1];
    sendChatAction(chatId, "upload_video", telegramApi);
    const statusMsg = await send(chatId, "⚡ <i>Downloading Reel...</i>", telegramApi, null, msg.message_id);
    const statusMsgId = statusMsg ? (await statusMsg.json())?.result?.message_id : null;

    const media = await fetchInstagramFast(igUrl);

    if (media && media.videoUrl) {
      let formattedCaption = "";
      if (media.caption) {
        let cleanCap = media.caption.length > 700 ? media.caption.slice(0, 700) + "..." : media.caption;
        formattedCaption = `📝 <b>Caption & Tags:</b>\n${escapeHtml(cleanCap)}\n\n`;
      }
      formattedCaption += `⚡ <i>Downloaded Instantly</i>`;

      const videoRes = await sendVideo(chatId, media.videoUrl, formattedCaption, telegramApi, msg.message_id);
      const vData = await videoRes.json().catch(() => ({}));

      if (vData.ok) {
        if (statusMsgId) await deleteMessage(chatId, statusMsgId, telegramApi);
      } else if (statusMsgId) {
        await edit(chatId, statusMsgId, `🎬 <b>Video Ready</b>\n\n${formattedCaption}`, telegramApi, {
          inline_keyboard: [[{ text: "▶️ Watch / Save Video", url: media.videoUrl }]]
        });
      }
    } else if (statusMsgId) {
      await edit(chatId, statusMsgId, `❌ <i>Video fetch nahi ho paya. Kripya public link try karein.</i>`, telegramApi);
    }
    return;
  }

  // 2. /start or Home Menu
  if (text === "/start" || data === "home") {
    const homeMsg =
      `📬 <b>TEMP MAIL & OTP SYSTEM</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <b>Naya Email:</b> Naya disposable address banayein.\n` +
      `🔑 <b>Old Email / Enter Email:</b> Apna purana email daal kar uska naya OTP turant lein!`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
        [{ text: "🔑 Enter Email to Get OTP", callback_data: "ask_email" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }]
      ]
    };
    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, kb) : send(chatId, homeMsg, telegramApi, kb);
  }

  // 3. Button Click: "Enter Email to Get OTP" -> Trigger Telegram ForceReply Input Box
  if (data === "ask_email") {
    const promptText =
      `✍️ <b>APNA EMAIL ADDRESS BHEJEIN:</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Jis bhi email ka OTP lena hai, use niche likhkar message send karein:\n\n` +
      `<i>Example:</i> <code>aanya.sharma@guerrillamailblock.com</code>\n\n` +
      `👇 <i>Niche message box me apna email type karein:</i>`;

    const forceReplyMarkup = {
      force_reply: true,
      input_field_placeholder: "yahan email address paste karein..."
    };

    return send(chatId, promptText, telegramApi, forceReplyMarkup);
  }

  // 4. USER ENTERS ANY EMAIL IN CHAT -> IMMEDIATELY FETCH INBOX & OTP!
  const isEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text);
  const isRestoreCmd = text.startsWith("/restore ") || text.startsWith("/load ");

  if (isEmailPattern || isRestoreCmd) {
    const targetEmail = (isRestoreCmd ? text.split(/\s+/)[1] : text).toLowerCase().trim();
    const [login, domain] = targetEmail.split('@');
    const provider = getProvider(domain);
    const token = encodeToken(provider, domain, login);

    // Show connecting status
    const waitMsg = await send(chatId, `🔄 <b>Connecting to:</b>\n<code>${escapeHtml(targetEmail)}</code>\n<i>Fetching inbox...</i>`, telegramApi);
    const waitMsgId = waitMsg ? (await waitMsg.json())?.result?.message_id : null;

    // Immediately fetch inbox for this email
    let messages = [];
    let sid = "";

    if (provider === 's') {
      const res = await fetchSecmailInbox(login, domain);
      messages = res.list;
    } else {
      const res = await fetchGuerrillaInbox(login, domain);
      messages = res.list;
      sid = res.sid;
    }

    // Build the Inbox Report
    let report =
      `📬 <b>INBOX FOR:</b>\n` +
      `📧 <code>${escapeHtml(targetEmail)}</code>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    const foundOtps = [];

    if (!messages || messages.length === 0) {
      report += `📭 <i>No messages yet. Resend OTP dabakar niche Refresh karein.</i>`;
    } else {
      for (let i = 0; i < Math.min(messages.length, 3); i++) {
        const detail = provider === 's'
          ? await fetchSecmailDetail(login, domain, messages[i].id)
          : await fetchGuerrillaDetail(sid, messages[i].id);

        const sender = detail.from !== 'Unknown' ? detail.from : (messages[i].from || 'Unknown');
        const subject = detail.subject || messages[i].subject || '(No Subject)';
        const fullText = subject + " " + (detail.body || "");

        const otp = extractSmartOtp(fullText);
        if (otp && !foundOtps.includes(otp)) {
          foundOtps.push(otp);
        }

        report += `📩 <b>From:</b> <code>${escapeHtml(sender)}</code>\n`;
        report += `📝 <b>Subject:</b> <i>${escapeHtml(subject)}</i>\n`;
        if (otp) {
          report += `🔑 <b>OTP:</b> <code>${escapeHtml(otp)}</code>\n`;
        }
        report += `━━━━━━━━━━━━━━━━━━\n`;
      }
    }

    const kbRows = [];
    for (const code of foundOtps) {
      kbRows.push([{ text: `📋 Copy OTP: ${code}`, copy_text: { text: code } }]);
    }

    kbRows.push([
      { text: "🔄 Refresh Inbox", callback_data: token },
      { text: "📋 Copy Email", copy_text: { text: targetEmail } }
    ]);
    kbRows.push([
      { text: "🔑 Enter Other Email", callback_data: "ask_email" },
      { text: "⚡ New Mail", callback_data: "gen" }
    ]);
    kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

    if (waitMsgId) {
      return edit(chatId, waitMsgId, report, telegramApi, { inline_keyboard: kbRows });
    } else {
      return send(chatId, report, telegramApi, { inline_keyboard: kbRows });
    }
  }

  // 5. Generate New Mailbox
  if (data === "gen" || (data && data.startsWith("dg:"))) {
    let domainChoice = DOMAIN_LIST[0];
    if (data.startsWith("dg:")) {
      const idx = parseInt(data.split(":")[1], 10);
      domainChoice = DOMAIN_LIST[idx] || DOMAIN_LIST[0];
    }

    const login = getRandomUser();
    const provider = getProvider(domainChoice);
    const fullEmail = `${login}@${domainChoice}`.toLowerCase();
    const token = encodeToken(provider, domainChoice, login);

    const out =
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email Address:</b>\n<code>${escapeHtml(fullEmail)}</code>\n\n` +
      `📡 <b>Domain:</b> <code>${escapeHtml(domainChoice)}</code>\n` +
      `⏳ <i>OTP aane ke baad "Check Inbox" par tap karein.</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: fullEmail } }],
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "🔑 Enter Other Email", callback_data: "ask_email" }, { text: "⚡ New Mail", callback_data: "gen" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // 6. Check/Refresh Inbox Callback
  if (data && data.startsWith("c:")) {
    const { provider, domain, login } = decodeToken(data);
    const currentEmail = `${login}@${domain}`.toLowerCase();

    let messages = [];
    let sid = "";

    if (provider === 's') {
      const res = await fetchSecmailInbox(login, domain);
      messages = res.list;
    } else {
      const res = await fetchGuerrillaInbox(login, domain);
      messages = res.list;
      sid = res.sid;
    }

    let report =
      `📬 <b>INBOX FOR:</b>\n` +
      `📧 <code>${escapeHtml(currentEmail)}</code>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n`;

    const foundOtps = [];

    if (!messages || messages.length === 0) {
      report += `📭 <i>No messages yet. Resend OTP dabakar niche Refresh karein.</i>`;
    } else {
      for (let i = 0; i < Math.min(messages.length, 3); i++) {
        const detail = provider === 's'
          ? await fetchSecmailDetail(login, domain, messages[i].id)
          : await fetchGuerrillaDetail(sid, messages[i].id);

        const sender = detail.from !== 'Unknown' ? detail.from : (messages[i].from || 'Unknown');
        const subject = detail.subject || messages[i].subject || '(No Subject)';
        const fullText = subject + " " + (detail.body || "");

        const otp = extractSmartOtp(fullText);
        if (otp && !foundOtps.includes(otp)) {
          foundOtps.push(otp);
        }

        report += `📩 <b>From:</b> <code>${escapeHtml(sender)}</code>\n`;
        report += `📝 <b>Subject:</b> <i>${escapeHtml(subject)}</i>\n`;
        if (otp) {
          report += `🔑 <b>OTP:</b> <code>${escapeHtml(otp)}</code>\n`;
        }
        report += `━━━━━━━━━━━━━━━━━━\n`;
      }
    }

    const kbRows = [];
    for (const code of foundOtps) {
      kbRows.push([{ text: `📋 Copy OTP: ${code}`, copy_text: { text: code } }]);
    }

    kbRows.push([
      { text: "🔄 Refresh Inbox", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: currentEmail } }
    ]);
    kbRows.push([
      { text: "🔑 Enter Other Email", callback_data: "ask_email" },
      { text: "⚡ New Mail", callback_data: "gen" }
    ]);
    kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // 7. Domain Switcher
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: `@${DOMAIN_LIST[i]}`, callback_data: `dg:${i}` }];
      if (DOMAIN_LIST[i + 1]) {
        row.push({ text: `@${DOMAIN_LIST[i + 1]}`, callback_data: `dg:${i + 1}` });
      }
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain Server:</b>`, telegramApi, { inline_keyboard: rows });
  }
}

// ================= TELEGRAM DISPATCH METHODS =================
async function send(chatId, text, telegramApi, kb = null, replyToId = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function sendVideo(chatId, videoUrl, caption, telegramApi, replyToId = null) {
  const payload = {
    chat_id: chatId,
    video: videoUrl,
    caption: caption,
    parse_mode: "HTML"
  };
  if (replyToId) payload.reply_to_message_id = replyToId;
  return fetch(`${telegramApi}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function sendChatAction(chatId, action, telegramApi) {
  return fetch(`${telegramApi}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action })
  }).catch(() => {});
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

async function deleteMessage(chatId, messageId, telegramApi) {
  return fetch(`${telegramApi}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  }).catch(() => {});
}
