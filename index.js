/**
 * AlokMail Pro - Ultimate 24/7 Engine
 * Multi-Domain Relay | Smart OTP Capture | QR Code | Custom Alias | Recent History
 * Platform: Cloudflare Workers
 * Owner ID: 8452322818
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const OWNER_ID = "8452322818";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// State Storage (Per Edge Container)
const USER_STATE = new Map();

// Authentic Identity Pool
const NAME_POOL = [
  'priya', 'sneha', 'pooja', 'ananya', 'riya', 'kavya', 'tanvi', 'shreya',
  'divya', 'aditi', 'simran', 'megha', 'ishita', 'muskan', 'radhika', 'neha',
  'kritika', 'anjali', 'bhavna', 'chahat', 'deepika', 'esha', 'falguni', 'gauri',
  'hina', 'isha', 'jiya', 'kiran', 'lavanya', 'mahi', 'nandini', 'oviya',
  'palak', 'qandeel', 'ritika', 'sanya', 'trisha', 'urvi', 'vidhi', 'yashika',
  'alok', 'rahul', 'rohit', 'amit', 'vikas', 'arjun', 'varun', 'karan',
  'sahil', 'manish', 'aakash', 'dev', 'ayush', 'yash', 'nikhil', 'harsh',
  'aditya', 'bhavesh', 'chirag', 'dhruv', 'eshan', 'faisal', 'gaurav', 'himanshu',
  'ishaan', 'jatin', 'kunal', 'lakshay', 'mohit', 'naveen', 'omkar', 'pranav',
  'qasim', 'rajat', 'suraj', 'tanmay', 'utkarsh', 'vivek', 'wasim', 'zubin'
];

const ADJECTIVE_POOL = [
  'swift', 'cool', 'smart', 'bold', 'shiny', 'quiet', 'brave', 'lucky',
  'royal', 'urban', 'silent', 'rapid', 'prime', 'sunny', 'noble', 'crisp',
  'vivid', 'chill', 'sharp', 'fresh', 'stellar', 'lively', 'breezy', 'golden'
];

const DOMAINS = [
  'sharklasers.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'spam4.me',
  'pokemail.net',
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("⚡ AlokMail Pro Ultimate Engine is Running 24/7!", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// Utilities
function getRandomUser() {
  const adj = ADJECTIVE_POOL[Math.floor(Math.random() * ADJECTIVE_POOL.length)];
  const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${name.charAt(0).toUpperCase() + name.slice(1)}${num}`.toLowerCase();
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ');
  const match = clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) || clean.match(/\b\d{4,8}\b/);
  return match ? (match[1] || match[0]) : null;
}

// Ultra-Fast Mailbox Creation
async function createFastMailbox(domainChoice = null, customUser = null) {
  const user = customUser || getRandomUser();
  const domain = domainChoice || DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const isGuerrilla = !domain.includes('1secmail');

  if (isGuerrilla) {
    try {
      const initRes = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
      const initData = await initRes.json();
      const sid = initData.sid_token;

      const setRes = await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`);
      const setData = await setRes.json();
      const email = (setData.email_addr || `${user}@${domain}`).toLowerCase();
      return { type: 'g', email, user, domain, sid };
    } catch (e) {
      return { type: 's', email: `${user}@1secmail.com`, user, domain: '1secmail.com', sid: '0' };
    }
  } else {
    return { type: 's', email: `${user}@${domain}`, user, domain, sid: '0' };
  }
}

async function fetchFastMessages(type, user, domain, sid) {
  if (type === 'g' && sid !== '0') {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`);
      const data = await res.json();
      return (data.list || []).filter(m => m.mail_from !== 'no-reply@guerrillamail.com').map(m => ({
        id: m.mail_id,
        from: m.mail_from,
        subject: m.mail_subject || '(No Subject)'
      }));
    } catch (e) {
      return [];
    }
  } else {
    try {
      const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
      return await res.json();
    } catch (e) {
      return [];
    }
  }
}

async function fetchFastDetail(type, user, domain, sid, id) {
  if (type === 'g' && sid !== '0') {
    try {
      const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${sid}`);
      const mail = await res.json();
      return {
        from: mail.mail_from || 'Unknown',
        subject: mail.mail_subject || '(No Subject)',
        body: mail.mail_body || mail.mail_excerpt || ''
      };
    } catch (e) {
      return { from: 'Unknown', subject: '', body: '' };
    }
  } else {
    try {
      const res = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(id)}`);
      const mail = await res.json();
      return {
        from: mail.from || 'Unknown',
        subject: mail.subject || '(No Subject)',
        body: mail.textBody || mail.htmlBody || ''
      };
    } catch (e) {
      return { from: 'Unknown', subject: '', body: '' };
    }
  }
}

// Router
async function handleTelegramUpdate(update) {
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;
  const userId = String(msg?.from?.id || cb?.from?.id || "");

  if (!chatId) return;

  if (cb?.id) {
    fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    });
  }

  let session = USER_STATE.get(userId) || { history: [] };

  // Owner Command
  if (text === "/admin") {
    if (userId !== OWNER_ID) return send(chatId, "❌ <i>Unauthorized. Owner Only.</i>");
    return send(chatId, `👑 <b>OWNER DASHBOARD</b>\n━━━━━━━━━━━━━━━━━━━━\n• <b>Owner ID:</b> <code>${OWNER_ID}</code>\n• <b>Speed:</b> Ultra Edge (<15ms)\n• <b>Relay:</b> Multi-Engine Active`);
  }

  // Custom Alias: /set myname domain.com
  if (text && text.startsWith("/set")) {
    const parts = text.split(" ");
    const userAlias = parts[1] || getRandomUser();
    const domainAlias = parts[2] || DOMAINS[0];

    const mb = await createFastMailbox(domainAlias, userAlias);
    session.active = mb;
    session.history = [mb.email, ...(session.history || []).filter(e => e !== mb.email)].slice(0, 5);
    USER_STATE.set(userId, session);

    const out = 
      `📬 <b>CUSTOM ALIAS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b> <code>${mb.email}</code>\n` +
      `<i>(Tap above to copy)</i>\n\n` +
      `📡 <b>Relay:</b> <code>Direct Edge Bridge</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening for OTPs...</i>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;

    const token = `${mb.type}_${mb.user}_${mb.domain}_${mb.sid}`;
    const kb = {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk_${token}` }],
        [
          { text: "🔄 Refresh", callback_data: `chk_${token}` },
          { text: "⚡ New Mail", callback_data: "gen" }
        ],
        [
          { text: "📷 Get QR Code", callback_data: `qr_${mb.email}` },
          { text: "🌐 Switch Domain", callback_data: "domains" }
        ]
      ]
    };
    return send(chatId, out, kb);
  }

  // Start Screen
  if (text === "/start" || data === "home") {
    const welcome = 
      `🛡️ <b>ALOKMAIL PRO — ENTERPRISE DISPOSABLE INBOX</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Ultra-fast disposable email generator with real-time OTP capture and multi-domain selection.\n\n` +
      `✨ <b>Quick Features:</b>\n` +
      `• ⚡ Instant 1-Click Generation\n` +
      `• 🔑 Live 4-8 Digit Auto OTP Detection\n` +
      `• 🌐 8+ Verified Anti-Spam Domains\n` +
      `• 📷 One-Tap QR Code Access\n\n` +
      `👇 <i>Choose an action below:</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Fresh Mailbox", callback_data: "gen" }],
        [
          { text: "🌐 Switch Domain", callback_data: "domains" },
          { text: "📜 Recent Inboxes", callback_data: "history" }
        ],
        [
          { text: "📖 User Guide", callback_data: "help" },
          { text: "🛡️ Server Status", callback_data: "status" }
        ]
      ]
    };
    return messageId ? edit(chatId, messageId, welcome, kb) : send(chatId, welcome, kb);
  }

  // Domain Selection Screen
  if (data === "domains") {
    const dMsg = `🌐 <b>SELECT PREFERRED DOMAIN</b>\n━━━━━━━━━━━━━━━━━━━━━━\nPick an active domain for your new mailbox:`;
    const rows = [];
    for (let i = 0; i < DOMAINS.length; i += 2) {
      const row = [{ text: `@${DOMAINS[i]}`, callback_data: `dgen_${DOMAINS[i]}` }];
      if (DOMAINS[i + 1]) row.push({ text: `@${DOMAINS[i + 1]}`, callback_data: `dgen_${DOMAINS[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "⬅️ Back to Menu", callback_data: "home" }]);
    return edit(chatId, messageId, dMsg, { inline_keyboard: rows });
  }

  // Recent History Screen
  if (data === "history") {
    const list = session.history || [];
    let hMsg = `📜 <b>RECENT ACTIVE MAILBOXES</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (list.length === 0) {
      hMsg += `<i>No recent inboxes found. Generate one first!</i>`;
    } else {
      list.forEach((e, idx) => {
        hMsg += `${idx + 1}. <code>${e}</code>\n`;
      });
    }
    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Fresh Mail", callback_data: "gen" }],
        [{ text: "⬅️ Back to Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, hMsg, kb);
  }

  // Guide
  if (data === "help") {
    const hText = 
      `📖 <b>HOW TO USE ALOKMAIL PRO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ <b>Generate Fresh Mailbox</b> par click karein.\n` +
      `2️⃣ Mile huye email par tap karke copy karein.\n` +
      `3️⃣ App/Website me signup verification ke liye dalein.\n` +
      `4️⃣ <b>📩 Fetch OTP</b> dabakar verification code copy karein!\n\n` +
      `💡 <i>Custom ID ke liye type karein:</i>\n<code>/set yourname sharklasers.com</code>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Mailbox Now", callback_data: "gen" }],
        [{ text: "⬅️ Back to Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, hText, kb);
  }

  // Telemetry
  if (data === "status") {
    const sText = 
      `🛡️ <b>SYSTEM TELEMETRY STATUS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Engine:</b> 🟢 Guerrilla & 1Sec Failover Active\n` +
      `• <b>Platform:</b> Cloudflare Workers Global Edge\n` +
      `• <b>Latency:</b> < 15ms\n` +
      `• <b>Identity Combinations:</b> > 1.5 Million`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Fresh Mail", callback_data: "gen" }],
        [{ text: "⬅️ Back", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, sText, kb);
  }

  // QR Code Sender
  if (data && data.startsWith("qr_")) {
    const qrEmail = data.replace("qr_", "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrEmail)}`;
    
    return fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: qrUrl,
        caption: `📷 <b>QR Code for:</b> <code>${qrEmail}</code>\n<i>(Scan to copy address)</i>`,
        parse_mode: "HTML"
      })
    });
  }

  // Generate Email (Instant)
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createFastMailbox(domainChoice);

    session.active = mb;
    session.history = [mb.email, ...(session.history || []).filter(e => e !== mb.email)].slice(0, 5);
    USER_STATE.set(userId, session);

    const out = 
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n` +
      `<code>${mb.email}</code>\n\n` +
      `📡 <b>Relay:</b> <code>${mb.domain} (Ultra-Fast)</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening for incoming OTPs...</i>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;

    const token = `${mb.type}_${mb.user}_${mb.domain}_${mb.sid}`;
    const kb = {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk_${token}` }],
        [
          { text: "🔄 Refresh", callback_data: `chk_${token}` },
          { text: "⚡ New Mail", callback_data: "gen" }
        ],
        [
          { text: "📷 Get QR Code", callback_data: `qr_${mb.email}` },
          { text: "🌐 Switch Domain", callback_data: "domains" }
        ]
      ]
    };
    return edit(chatId, messageId, out, kb);
  }

  // Check Inbox & Deep OTP Parser
  if (data && data.startsWith("chk_")) {
    const [, type, user, domain, sid] = data.split("_");
    const activeEmail = `${user}@${domain}`;
    const token = `${type}_${user}_${domain}_${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      const empty = 
        `📭 <b>INBOX STATUS: WAITING FOR OTP...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 <b>Address:</b> <code>${activeEmail}</code>\n\n` +
        `⚠️ <i>Abhi tak koi message nahi aaya. Code bhejne ke baad 3-5 sec ruk kar Refresh dabayein!</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`;

      const kb = {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox Now", callback_data: `chk_${token}` }],
          [
            { text: "⚡ Generate New Mail", callback_data: "gen" },
            { text: "🌐 Switch Domain", callback_data: "domains" }
          ]
        ]
      };
      return edit(chatId, messageId, empty, kb);
    }

    let report = 
      `📬 <b>INBOX — (${list.length}) MESSAGE(S) RECEIVED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 <b>Mailbox:</b> <code>${activeEmail}</code>\n\n`;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);

      const sender = escapeHtml(mailDetails.from || m.from || "Unknown");
      const subject = escapeHtml(mailDetails.subject || m.subject || "No Subject");
      const fullText = subject + " " + (mailDetails.body || "");
      
      const otp = extractSmartOtp(fullText);

      report += `📩 <b>Message #${i + 1}</b>\n`;
      report += `👤 <b>From:</b> <code>${sender}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${subject}</i>\n`;

      if (otp) {
        report += `\n🔑 <b>DETECTED OTP:</b> <code>${otp}</code> <i>(Tap code to copy)</i>\n`;
      } else {
        const snippet = escapeHtml((mailDetails.body || "").replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 100));
        if (snippet) report += `📄 <b>Content:</b> <code>${snippet}...</code>\n`;
      }
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kb = {
      inline_keyboard: [
        [{ text: "🔄 Refresh Inbox", callback_data: `chk_${token}` }],
        [
          { text: "⚡ New Mail", callback_data: "gen" },
          { text: "🌐 Switch Domain", callback_data: "domains" }
        ]
      ]
    };
    return edit(chatId, messageId, report, kb);
  }
}

// Helpers
async function send(chatId, text, kb = null) {
  const p = { chat_id: chatId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  return fetch(`${TELEGRAM_API}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
}

async function edit(chatId, msgId, text, kb = null) {
  const p = { chat_id: chatId, message_id: msgId, text: text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  if (!res.ok) return send(chatId, text, kb);
  return res;
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
