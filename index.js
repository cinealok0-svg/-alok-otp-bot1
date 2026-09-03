/**
 * Ultra-Fast All-In-One Bot: Temp Mail + 1-Sec Instagram Downloader
 * Platform: Cloudflare Workers
 */

// ================= CONFIGURATION & DOMAINS =================
const GUERRILLA_DOMAINS = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la'
];

const SECMAIL_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

// Realistic names pool
const FEMALE_FIRST_NAMES = [
  "emma", "olivia", "ava", "sophia", "isabella", "charlotte", "amelia", "mia", "harper", "evelyn",
  "abigail", "emily", "ella", "elizabeth", "camila", "luna", "sofia", "avery", "mila", "aria",
  "scarlett", "penelope", "layla", "chloe", "victoria", "madison", "eleanor", "grace", "nora", "riley",
  "zoey", "hannah", "hazel", "lily", "ellie", "violet", "lillian", "zoe", "stella", "aurora",
  "natalie", "emilia", "everly", "leah", "aubrey", "willow", "addison", "lucy", "audrey", "bella",
  "aanya", "aadhya", "aarohi", "ananya", "aditi", "diya", "ishita", "kavya", "khushi", "myra",
  "navya", "pooja", "priya", "riya", "saanvi", "shreya", "sneha", "tanvi", "tanya", "vaishnavi"
];

const FEMALE_LAST_NAMES = [
  "smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez", "martinez",
  "hernandez", "lopez", "gonzalez", "wilson", "anderson", "thomas", "taylor", "moore", "jackson", "martin",
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy"
];

// ================= HELPERS =================
function getRandomUser() {
  const first = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const last = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  const num2 = Math.floor(10 + Math.random() * 90);
  const birthYear = Math.floor(1995 + Math.random() * 11);

  const formats = [
    `${first}.${last}${num2}`,
    `${first}.${last}${birthYear}`,
    `${first}_${last}${num2}`,
    `${first}${last}${num2}`,
    `${first}.${last}`,
    `${first}${birthYear}`
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
    .replace(/\s+/g, ' ');

  const postMatch = clean.match(/(?:otp|code|verification(?:\s*code)?|passcode|pin|security\s*code|c[oó]digo|pin\s*code)\s*(?:is|:|-|=|\s)\s*([0-9]{4,8})\b/i);
  if (postMatch) return postMatch[1];

  const preMatch = clean.match(/\b([0-9]{4,8})\b\s*(?:is\s+(?:your\s+)?)?(?:otp|code|verification|passcode|pin|security\s*code)/i);
  if (preMatch) return preMatch[1];

  const nearbyMatch = clean.match(/(?:otp|code|verification|passcode|c[oó]digo)\D{1,15}\b([0-9]{4,8})\b/i);
  if (nearbyMatch) return nearbyMatch[1];

  const sixDigit = clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6,8})\b/);
  if (sixDigit) return sixDigit[1];

  const fourDigit = clean.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,5})\b/);
  return fourDigit ? fourDigit[1] : null;
}

// ================= TURBO PARALLEL INSTAGRAM ENGINE =================
async function fetchInstagramFast(rawUrl) {
  const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '');
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s hard cutoff

  const engines = [
    // Engine 1: Delirius Turbo API
    (async () => {
      const res = await fetch(`https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.data || [];
      const item = list.find(x => x?.type === 'video' || (x?.url && x.url.includes('.mp4'))) || list[0];
      if (item?.url) return { videoUrl: item.url, caption: json?.caption || item?.caption || "" };
      throw new Error();
    })(),

    // Engine 2: BK9 API
    (async () => {
      const res = await fetch(`https://bk9.fun/download/instagram?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.BK9 || json?.data || [];
      const item = Array.isArray(list) ? list[0] : list;
      const url = item?.url || item?.video;
      if (url) return { videoUrl: url, caption: json?.caption || "" };
      throw new Error();
    })(),

    // Engine 3: VKR Ultra API
    (async () => {
      const res = await fetch(`https://api.vkrdownloader.com/server?v=${encodeURIComponent(cleanUrl)}`, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const json = await res.json();
      if (json?.data?.downloadUrl) {
        return { videoUrl: json.data.downloadUrl, caption: json.data.title || json.data.description || "" };
      }
      throw new Error();
    })(),

    // Engine 4: Siputzx DL
    (async () => {
      const res = await fetch(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(cleanUrl)}`, { signal });
      const json = await res.json();
      const list = json?.data || [];
      const item = Array.isArray(list) ? list.find(v => v.url && v.url.includes('.mp4')) || list[0] : list;
      if (item?.url) return { videoUrl: item.url, caption: json?.caption || "" };
      throw new Error();
    })(),

    // Engine 5: Direct Instagram Embed Extraction
    (async () => {
      const match = cleanUrl.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
      if (!match) throw new Error();
      const embedRes = await fetch(`https://www.instagram.com/p/${match[1]}/embed/captioned/`, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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
    // Whichever server responds first wins immediately
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

// ================= PROVIDER: GUERRILLA MAIL =================
async function createGuerrillaMailbox(domain, customUser = null) {
  const user = customUser || getRandomUser();
  try {
    const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
    const sid = init.sid_token || '';
    const setRes = await fetch(
      `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`
    ).then(r => r.json());
    return { provider: 'g', email: (setRes.email_addr || `${user}@${domain}`).toLowerCase(), sid, domain };
  } catch (e) {
    return createSecmailMailbox(SECMAIL_DOMAINS[0], user);
  }
}

async function fetchGuerrillaMessages(sid) {
  try {
    const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
    const email = (res.email_addr || '').toLowerCase();
    const list = (res.list || [])
      .filter(m => m.mail_from !== 'no-reply@guerrillamail.com')
      .map(m => ({ id: m.mail_id, from: m.mail_from, subject: m.mail_subject }));
    return { list, email };
  } catch (e) {
    return { list: [], email: '' };
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

// ================= PROVIDER: 1SECMAIL =================
async function createSecmailMailbox(domain, customUser = null) {
  const user = (customUser || getRandomUser()).toLowerCase();
  return { provider: 's', email: `${user}@${domain}`.toLowerCase(), login: user, domain };
}

async function fetchSecmailMessages(login, domain) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
    );
    if (!res.ok) return { list: [], email: `${login}@${domain}` };
    const list = await res.json();
    return {
      list: (list || []).map(m => ({ id: m.id, from: m.from, subject: m.subject })),
      email: `${login}@${domain}`
    };
  } catch (e) {
    return { list: [], email: `${login}@${domain}` };
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

// ================= DISPATCH & RESTORE =================
async function createMailbox(domainChoice = null) {
  const domain = domainChoice || DOMAIN_LIST[Math.floor(Math.random() * DOMAIN_LIST.length)];
  return SECMAIL_DOMAINS.includes(domain) ? createSecmailMailbox(domain) : createGuerrillaMailbox(domain);
}

async function restoreMailbox(fullEmail) {
  const clean = fullEmail.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return null;
  const login = parts[0];
  const domain = parts[1];

  if (SECMAIL_DOMAINS.includes(domain)) return createSecmailMailbox(domain, login);
  if (GUERRILLA_DOMAINS.includes(domain)) return createGuerrillaMailbox(domain, login);
  return createSecmailMailbox(SECMAIL_DOMAINS[0], login);
}

function encodeToken(provider, domain, extra) {
  let dIdx = DOMAIN_LIST.indexOf(domain);
  if (dIdx === -1) dIdx = 0;
  return `c:${provider}:${dIdx}:${extra}`;
}

function decodeToken(tokenStr) {
  const parts = tokenStr.split(':');
  return {
    provider: parts[1],
    domain: DOMAIN_LIST[parseInt(parts[2], 10)] || DOMAIN_LIST[0],
    extra: parts[3]
  };
}

// ================= HISTORY (KV) =================
async function recordMailboxHistory(env, chatId, email, token) {
  if (!env?.TEMP_MAIL_KV) return;
  try {
    const key = `h_${chatId}`;
    const raw = await env.TEMP_MAIL_KV.get(key);
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter(item => item.email !== email);
    list.unshift({ email, token, time: Date.now() });
    await env.TEMP_MAIL_KV.put(key, JSON.stringify(list.slice(0, 5)), { expirationTtl: 604800 });
  } catch (e) {}
}

async function getMailboxHistory(env, chatId) {
  if (!env?.TEMP_MAIL_KV) return [];
  try {
    const raw = await env.TEMP_MAIL_KV.get(`h_${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ================= MAIN TELEGRAM ROUTER =================
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

  // -------------------------------------------------------------
  // 1. TURBO INSTAGRAM REEL / VIDEO DOWNLOADER
  // -------------------------------------------------------------
  const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);

  if (igMatch) {
    const igUrl = igMatch[1];
    sendChatAction(chatId, "upload_video", telegramApi);

    // Initial downloading status
    const statusMsg = await send(chatId, "⚡ <i>Downloading Reel...</i>", telegramApi, null, msg.message_id);
    const statusMsgId = statusMsg ? (await statusMsg.json())?.result?.message_id : null;

    // Fast parallel race
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
      } else {
        // Fallback if video is too large for Telegram URL fetch
        if (statusMsgId) {
          await edit(chatId, statusMsgId, `🎬 <b>Video Ready</b>\n\n${formattedCaption}`, telegramApi, {
            inline_keyboard: [[{ text: "▶️ Watch / Save Video", url: media.videoUrl }]]
          });
        }
      }
    } else {
      if (statusMsgId) {
        await edit(chatId, statusMsgId, `❌ <i>Link expire ho gaya ya reel private hai. Kripya dusra link try karein.</i>`, telegramApi);
      }
    }
    return;
  }

  // -------------------------------------------------------------
  // 2. TEMP MAIL & OTP EXTRACTOR
  // -------------------------------------------------------------
  if (text === "/start" || data === "home") {
    const homeMsg =
      `📬 <b>ALL-IN-ONE BOT READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Temp Mail:</b> Button dabayein aur turant naya email aur OTP lein.\n` +
      `• <b>Instagram Downloader:</b> Kisi bhi Reel ka link bhejein, 1-2 second me video aur hashtags mil jayenge!\n\n` +
      `💡 <b>Restore Email:</b> Purana address yahan direct paste kar dein.`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
        [{ text: "📜 My History", callback_data: "history" }, { text: "🌐 Switch Domain", callback_data: "domains" }]
      ]
    };
    return messageId ? edit(chatId, messageId, homeMsg, telegramApi, kb) : send(chatId, homeMsg, telegramApi, kb);
  }

  // Restore mailbox
  const isEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text);
  const isRestoreCmd = text.startsWith("/restore ") || text.startsWith("/load ");

  if (isEmailPattern || isRestoreCmd) {
    const targetEmail = isRestoreCmd ? text.split(/\s+/)[1] : text;
    const mb = await restoreMailbox(targetEmail);
    if (!mb) {
      return send(chatId, `⚠️ <b>Invalid Email Format</b>\nExample: <code>name@sharklasers.com</code>`, telegramApi);
    }

    const token = encodeToken(mb.provider, mb.domain, mb.provider === 's' ? mb.login : mb.sid);
    await recordMailboxHistory(env, chatId, mb.email, token);

    const out =
      `🔄 <b>MAILBOX RESTORED</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(mb.email)}</code>\n\n` +
      `📡 <b>Status:</b> Ready\n` +
      `⏳ <i>OTP aane ke baad Check Inbox dabayein:</i>`;

    return send(chatId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: mb.email } }],
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "📜 My History", callback_data: "history" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // History list
  if (data === "history") {
    const history = await getMailboxHistory(env, chatId);
    if (!history || history.length === 0) {
      return edit(chatId, messageId,
        `📜 <b>RECENT MAILBOXES</b>\n━━━━━━━━━━━━━━━━━━\nKoi saved address nahi mila.\n\n💡 <i>Purana email chat me bhej kar restore karein.</i>`,
        telegramApi,
        {
          inline_keyboard: [
            [{ text: "⚡ Generate New Mail", callback_data: "gen" }],
            [{ text: "🏠 Home", callback_data: "home" }]
          ]
        }
      );
    }

    const kbRows = history.map(item => [{ text: `📧 ${item.email}`, callback_data: item.token }]);
    kbRows.push([{ text: "⚡ Generate New Mail", callback_data: "gen" }, { text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId,
      `📜 <b>RECENT MAILBOXES (Tap to open)</b>\n━━━━━━━━━━━━━━━━━━\nInbox check karne ke liye email select karein:`,
      telegramApi,
      { inline_keyboard: kbRows }
    );
  }

  // Generate new email
  if (data === "gen" || (data && data.startsWith("dg:"))) {
    let domainChoice = null;
    if (data.startsWith("dg:")) {
      const idx = parseInt(data.split(":")[1], 10);
      domainChoice = DOMAIN_LIST[idx] || null;
    }

    const mb = await createMailbox(domainChoice);
    const token = encodeToken(mb.provider, mb.domain, mb.provider === 's' ? mb.login : mb.sid);
    await recordMailboxHistory(env, chatId, mb.email, token);

    const out =
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${escapeHtml(mb.email)}</code>\n\n` +
      `📡 <b>Server:</b> <code>${escapeHtml(mb.domain)}</code>\n` +
      `⏳ <i>OTP aane ke baad Check Inbox par tap karein.</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: mb.email } }],
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "📜 History", callback_data: "history" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // Check inbox
  if (data && data.startsWith("c:")) {
    const { provider, domain, extra } = decodeToken(data);

    let messages = [];
    let mailboxEmail = "";

    if (provider === 's') {
      const res = await fetchSecmailMessages(extra, domain);
      messages = res.list;
      mailboxEmail = res.email;
    } else {
      const res = await fetchGuerrillaMessages(extra);
      messages = res.list;
      mailboxEmail = res.email || `address@${domain}`;
    }

    if (!messages || messages.length === 0) {
      return edit(chatId, messageId,
        `📭 <b>No messages yet</b>\n\n📧 <code>${escapeHtml(mailboxEmail)}</code>\n\n<i>Thoda wait karke Refresh dabayein.</i>`,
        telegramApi,
        {
          inline_keyboard: [
            [{ text: "📋 Copy Email", copy_text: { text: mailboxEmail } }],
            [{ text: "🔄 Refresh Inbox", callback_data: data }],
            [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "📜 History", callback_data: "history" }],
            [{ text: "🏠 Home", callback_data: "home" }]
          ]
        });
    }

    let report = `📬 <b>INBOX (${messages.length})</b>\n━━━━━━━━━━━━━━━━━━\n📧 <code>${escapeHtml(mailboxEmail)}</code>\n\n`;
    const foundOtps = [];

    for (let i = 0; i < Math.min(messages.length, 3); i++) {
      const detail = provider === 's'
        ? await fetchSecmailDetail(extra, domain, messages[i].id)
        : await fetchGuerrillaDetail(extra, messages[i].id);

      const sender = detail.from !== 'Unknown' ? detail.from : (messages[i].from || 'Unknown');
      const subject = detail.subject || messages[i].subject || '(No Subject)';
      const fullText = subject + " " + (detail.body || "");

      const otp = extractSmartOtp(fullText);
      if (otp && !foundOtps.includes(otp)) {
        foundOtps.push(otp);
      }

      report += `📩 <b>From:</b> <code>${escapeHtml(sender.slice(0, 45))}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${escapeHtml(subject.slice(0, 80))}</i>\n`;
      if (otp) report += `🔑 <b>OTP:</b> <code>${escapeHtml(otp)}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [];

    for (const code of foundOtps) {
      kbRows.push([{ text: `📋 Copy OTP: ${code}`, copy_text: { text: code } }]);
    }

    kbRows.push([
      { text: "🔄 Refresh", callback_data: data },
      { text: "📋 Copy Email", copy_text: { text: mailboxEmail } }
    ]);
    kbRows.push([
      { text: "⚡ New Mail", callback_data: "gen" },
      { text: "📜 History", callback_data: "history" }
    ]);
    kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // Switch domain
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

// ================= DISPATCH METHODS =================
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
