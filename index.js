/**
 * AlokMail Pro — Enterprise Production Engine (Cloudflare Worker)
 * Modules: Multi-Domain Temp Mail + Professional Meta AI Wizard + Protected Vaults + Admin Suite
 * Platform: Cloudflare Workers
 * Owner ID: 8452322818
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const OWNER_ID = "8452322818";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Dynamic Admin Storage
const ADMIN_SET = new Set([OWNER_ID]);

// Global In-Memory Stores
const USER_STATE = new Map();
const INSTA_VAULT = { fresh: [], used: [] };
const META_VAULT = { fresh: [], used: [] };

// Identity Pools
const NAMES_FIRST = [
  'Aakash', 'Rohit', 'Priya', 'Sneha', 'Vikas', 'Amit', 'Pooja', 'Arjun',
  'Kunal', 'Simran', 'Rahul', 'Divya', 'Aditi', 'Megha', 'Karan', 'Sahil',
  'Anjali', 'Deepika', 'Manish', 'Naveen', 'Harsh', 'Tanvi', 'Riya', 'Gaurav'
];

const NAMES_LAST = [
  'Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Yadav', 'Chauhan', 'Mishra', 'Mehta'
];

const ADJECTIVE_POOL = [
  'swift', 'cool', 'smart', 'bold', 'shiny', 'quiet', 'brave', 'lucky',
  'royal', 'urban', 'silent', 'rapid', 'prime', 'sunny', 'noble', 'crisp'
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
      return new Response("⚡ AlokMail Pro Enterprise Engine Active 24/7", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

function checkIsAdmin(userId) {
  return userId === OWNER_ID || ADMIN_SET.has(userId);
}

function getRandomUser() {
  const adj = ADJECTIVE_POOL[Math.floor(Math.random() * ADJECTIVE_POOL.length)];
  const name = NAMES_FIRST[Math.floor(Math.random() * NAMES_FIRST.length)].toLowerCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${name}${num}`;
}

function generateStrongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 9; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "Meta#9";
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ');
  const match = clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) || clean.match(/\b\d{4,8}\b/);
  return match ? (match[1] || match[0]) : null;
}

function parseAccountLine(line) {
  line = line.trim();
  if (!line) return null;
  let delimiter = '|';
  if (!line.includes('|')) {
    if (line.includes(':')) delimiter = ':';
    else if (line.includes(',')) delimiter = ',';
    else if (line.includes(';')) delimiter = ';';
    else if (line.includes('\t')) delimiter = '\t';
  }
  const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
  if (parts.length >= 2) {
    return {
      username: parts[0],
      password: parts[1],
      extra: parts[2] || '',
      raw: line
    };
  }
  return null;
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

// Telegram Message Router
async function handleTelegramUpdate(update) {
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  const document = msg?.document;

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  let session = USER_STATE.get(userId) || { history: [], mode: null, metaWizard: null };
  const isAdmin = checkIsAdmin(userId);
  const isOwner = userId === OWNER_ID;

  // File Upload Handlers
  if (document) {
    if (!isAdmin) return send(chatId, "⛔ <b>Admin Access Restricted.</b>");

    try {
      const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${document.file_id}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
      const fileContent = await downloadRes.text();

      const lines = fileContent.split(/\r?\n/);
      const accounts = lines.map(parseAccountLine).filter(Boolean);

      if (accounts.length > 0) {
        if (session.mode === 'upload_meta') {
          META_VAULT.fresh = [...accounts, ...META_VAULT.fresh];
          return send(chatId, `🤖 <b>META ACCOUNTS LOADED!</b>\n• Added: <code>${accounts.length}</code>\n• Total Fresh Stock: <code>${META_VAULT.fresh.length}</code>`, {
            inline_keyboard: [[{ text: "🤖 Meta AI Hub", callback_data: "meta_hub" }]]
          });
        } else {
          INSTA_VAULT.fresh = [...accounts, ...INSTA_VAULT.fresh];
          return send(chatId, `📸 <b>INSTAGRAM ACCOUNTS LOADED!</b>\n• Added: <code>${accounts.length}</code>\n• Total Fresh Stock: <code>${INSTA_VAULT.fresh.length}</code>`, {
            inline_keyboard: [[{ text: "📸 Insta Vault", callback_data: "insta_vault" }]]
          });
        }
      } else {
        return send(chatId, "❌ <i>No valid accounts found in file.</i>");
      }
    } catch (e) {
      return send(chatId, `❌ <i>File Error: ${e.message}</i>`);
    }
  }

  // Text Handlers for Admin Commands
  if (text && session.mode === 'awaiting_add_admin' && isOwner) {
    session.mode = null;
    USER_STATE.set(userId, session);
    const targetId = text.replace(/[^0-9]/g, '');
    if (targetId.length > 5) {
      ADMIN_SET.add(targetId);
      return send(chatId, `✅ <b>Sub-Admin Promoted:</b> <code>${targetId}</code>`, {
        inline_keyboard: [[{ text: "👑 Admin Panel", callback_data: "admin_panel" }]]
      });
    }
  }

  if (text && session.mode === 'awaiting_meta_save' && isAdmin) {
    session.mode = null;
    USER_STATE.set(userId, session);
    const lines = text.split(/\r?\n/);
    const added = lines.map(parseAccountLine).filter(Boolean);
    if (added.length > 0) {
      META_VAULT.fresh = [...added, ...META_VAULT.fresh];
      return send(chatId, `✅ <b>Saved ${added.length} Meta Accounts!</b>`, {
        inline_keyboard: [[{ text: "🤖 Meta AI Hub", callback_data: "meta_hub" }]]
      });
    }
  }

  if (text && session.mode === 'awaiting_insta_save' && isAdmin) {
    session.mode = null;
    USER_STATE.set(userId, session);
    const lines = text.split(/\r?\n/);
    const added = lines.map(parseAccountLine).filter(Boolean);
    if (added.length > 0) {
      INSTA_VAULT.fresh = [...added, ...INSTA_VAULT.fresh];
      return send(chatId, `✅ <b>Saved ${added.length} Insta Accounts!</b>`, {
        inline_keyboard: [[{ text: "📸 Insta Vault", callback_data: "insta_vault" }]]
      });
    }
  }

  // 1. Home Dashboard
  if (text === "/start" || data === "home") {
    session.mode = null;
    USER_STATE.set(userId, session);

    let welcome = 
      `🛡️ <b>ALOKMAIL PRO — ENTERPRISE INBOX & ACCOUNTS HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Temp Mail:</b> High-speed disposable mail with live OTP detector.\n` +
      `• <b>Meta AI Wizard:</b> Step-by-step account creator with clean session tracking and instant email swapping.\n\n`;

    if (isAdmin) {
      welcome += 
        `👑 <b>Admin Storage Status:</b>\n` +
        `• 🤖 Meta Vault: <code>${META_VAULT.fresh.length}</code> Fresh IDs\n` +
        `• 📸 Insta Vault: <code>${INSTA_VAULT.fresh.length}</code> Fresh IDs\n\n`;
    }

    welcome += `👇 <i>Select an option from the menu below:</i>`;

    const rows = [
      [{ text: "⚡ Generate Free Temp Mail", callback_data: "gen" }]
    ];

    if (isAdmin) {
      rows.push([
        { text: "🤖 Meta AI Wizard & Hub", callback_data: "meta_hub" },
        { text: "📸 Instagram Vault", callback_data: "insta_vault" }
      ]);
      rows.push([
        { text: "👑 Admin Control Panel", callback_data: "admin_panel" }
      ]);
    }

    rows.push([
      { text: "🌐 Switch Domain", callback_data: "domains" },
      { text: "📜 Recent Inboxes", callback_data: "history" }
    ]);

    rows.push([
      { text: "📖 User Guide", callback_data: "help" },
      { text: "🛡️ Server Status", callback_data: "status" }
    ]);

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, welcome, kb) : send(chatId, welcome, kb);
  }

  // 2. Meta AI Hub
  if (data === "meta_hub") {
    if (!isAdmin) return send(chatId, "⛔ Admin Only.");
    session.mode = null;
    USER_STATE.set(userId, session);

    const mText = 
      `🤖 <b>META AI (meta.ai) CREATION & VAULT HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Stock:</b> <code>${META_VAULT.fresh.length}</code>\n` +
      `• <b>Used / Archived IDs:</b> <code>${META_VAULT.used.length}</code>\n\n` +
      `⚡ <i>The Wizard generates full credentials, monitors OTP in real-time on a single screen without spamming messages, and allows 1-click email swapping if needed.</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "🚀 Launch Step-by-Step Meta Wizard", callback_data: "mw_start" }],
        [{ text: "📦 Get 1 Fresh Saved Meta ID", callback_data: "meta_get" }],
        [
          { text: "💾 Save Accounts (Text)", callback_data: "meta_add_text" },
          { text: "📂 Upload CSV/TXT File", callback_data: "meta_add_file" }
        ],
        [
          { text: "📁 Export Used Accounts", callback_data: "meta_export" },
          { text: "🏠 Return to Home Menu", callback_data: "home" }
        ]
      ]
    };
    return edit(chatId, messageId, mText, kb);
  }

  // 3. Meta AI Step-by-Step Wizard Engine (Clean Single-Message State Tracker)
  if (data === "mw_start" || data === "mw_swap") {
    if (!isAdmin) return;

    // Create fresh dedicated mailbox for Meta session
    const mb = await createFastMailbox();
    const firstName = NAMES_FIRST[Math.floor(Math.random() * NAMES_FIRST.length)];
    const lastName = NAMES_LAST[Math.floor(Math.random() * NAMES_LAST.length)];
    const password = generateStrongPassword();
    const dobDay = Math.floor(1 + Math.random() * 28);
    const dobMonth = Math.floor(1 + Math.random() * 12);
    const dobYear = Math.floor(1994 + Math.random() * 7); // 1994 - 2000 (Safe 18+)

    session.metaWizard = {
      mb,
      name: `${firstName} ${lastName}`,
      password,
      dob: `${String(dobDay).padStart(2, '0')} / ${String(dobMonth).padStart(2, '0')} / ${dobYear}`,
      email: mb.email,
      otp: null,
      statusMessage: "🟢 Ready. Paste email on meta.ai & click Next."
    };
    USER_STATE.set(userId, session);

    const isSwapped = data === "mw_swap";
    const swapAlert = isSwapped ? `🔄 <b>NEW EMAIL GENERATED & SWAPPED:</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` : '';

    const wizardCard = 
      `${swapAlert}🤖 <b>META AI ACCOUNT CREATOR WIZARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 <b>Status:</b> ${session.metaWizard.statusMessage}\n\n` +
      `👤 <b>Full Name:</b> <code>${session.metaWizard.name}</code>\n` +
      `🎂 <b>DOB (18+ Safe):</b> <code>${session.metaWizard.dob}</code>\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n<code>${session.metaWizard.email}</code>\n` +
      `🔑 <b>Password:</b> <code>${password}</code>\n\n` +
      `📋 <b>Step-by-Step Instructions:</b>\n` +
      `1️⃣ Paste Email on <code>meta.ai</code> & click Continue.\n` +
      `2️⃣ Enter Name, DOB & Password.\n` +
      `3️⃣ Click <b>'📩 Check Meta OTP'</b> below once OTP is sent.`;

    const token = `${mb.type}:${mb.user}:${mb.domain}:${mb.sid}`;
    const kb = {
      inline_keyboard: [
        [{ text: "📩 Check Meta OTP", callback_data: `mw_check_${token}` }],
        [
          { text: "🔄 Swap Email (New ID)", callback_data: "mw_swap" },
          { text: "💾 Save to Vault", callback_data: "mw_save" }
        ],
        [{ text: "🏠 Return to Meta Hub", callback_data: "meta_hub" }]
      ]
    };
    return edit(chatId, messageId, wizardCard, kb);
  }

  // Meta Wizard Live OTP Checker (Updates the same message cleanly)
  if (data && data.startsWith("mw_check_")) {
    const tokenPart = data.replace("mw_check_", "");
    const [type, user, domain, sid] = tokenPart.split(":");
    const activeEmail = `${user}@${domain}`;

    if (!session.metaWizard) {
      return edit(chatId, messageId, "⚠️ <i>Wizard session expired. Please restart.</i>", {
        inline_keyboard: [[{ text: "🚀 Launch Wizard", callback_data: "mw_start" }]]
      });
    }

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      const waitCard = 
        `⏳ <b>WAITING FOR META OTP...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 <b>Status:</b> 🟡 Polling inbox for code... (No mail yet)\n\n` +
        `📧 <b>Target Email:</b>\n<code>${activeEmail}</code>\n\n` +
        `⚠️ <i>If OTP doesn't arrive within 10 seconds, tap '🔄 Swap Email' to instantly switch to a fresh email address!</i>`;

      const kb = {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox Now", callback_data: `mw_check_${tokenPart}` }],
          [{ text: "🔄 Swap Email (New ID)", callback_data: "mw_swap" }, { text: "💾 Save to Vault", callback_data: "mw_save" }],
          [{ text: "⬅️ Back to Wizard Card", callback_data: "mw_card" }]
        ]
      };
      return edit(chatId, messageId, waitCard, kb);
    }

    let detectedOtp = null;
    let senderName = "Meta AI";

    for (let i = 0; i < Math.min(list.length, 2); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);
      const fullText = (mailDetails.subject || "") + " " + (mailDetails.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) {
        detectedOtp = otp;
        senderName = mailDetails.from || senderName;
      }
    }

    if (detectedOtp) {
      session.metaWizard.otp = detectedOtp;
      USER_STATE.set(userId, session);

      const successCard = 
        `✅ <b>META VERIFICATION CODE DETECTED!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 <b>Status:</b> 🟢 OTP Successfully Extracted!\n\n` +
        `📧 <b>Email:</b> <code>${activeEmail}</code>\n` +
        `🔑 <b>OTP CODE:</b> <code>${detectedOtp}</code> <i>(Tap to copy)</i>\n` +
        `👤 <b>From:</b> <code>${escapeHtml(senderName)}</code>\n\n` +
        `📝 <b>Final Steps:</b>\n` +
        `• Enter OTP on Meta.ai screen.\n` +
        `• Skip Profile Picture selection.\n` +
        `• Solve Captcha if prompted.\n` +
        `• Once logged in, tap <b>'💾 Save Account to Vault'</b> below!`;

      const kb = {
        inline_keyboard: [
          [{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }],
          [{ text: "💾 Save Account to Vault", callback_data: "mw_save" }],
          [{ text: "⚡ Next Fresh Account", callback_data: "mw_start" }],
          [{ text: "🤖 Meta Hub", callback_data: "meta_hub" }]
        ]
      };
      return edit(chatId, messageId, successCard, kb);
    } else {
      const unparsedCard = 
        `📬 <b>EMAIL RECEIVED, PARSING CODE...</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${activeEmail}</code>\n\n` +
        `<i>An email arrived from Meta, but the 6-digit code is being parsed. Tap Refresh below:</i>`;

      const kb = {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox Now", callback_data: `mw_check_${tokenPart}` }],
          [{ text: "⬅️ Back to Wizard Card", callback_data: "mw_card" }]
        ]
      };
      return edit(chatId, messageId, unparsedCard, kb);
    }
  }

  // Meta Wizard Card View
  if (data === "mw_card") {
    if (!session.metaWizard) {
      return edit(chatId, messageId, "⚠️ <i>No active wizard. Launch new:</i>", {
        inline_keyboard: [[{ text: "🚀 Launch Wizard", callback_data: "mw_start" }]]
      });
    }

    const { mb, name, dob, email, password, otp } = session.metaWizard;
    const wizardCard = 
      `🤖 <b>META AI ACCOUNT CREATOR WIZARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Full Name:</b> <code>${name}</code>\n` +
      `🎂 <b>DOB (18+ Safe):</b> <code>${dob}</code>\n` +
      `📧 <b>Email Address:</b> <i>(Tap to copy)</i>\n<code>${email}</code>\n` +
      `🔑 <b>Password:</b> <code>${password}</code>\n\n` +
      (otp ? `🔑 <b>Detected OTP:</b> <code>${otp}</code>\n\n` : '') +
      `👇 <i>Choose an action below:</i>`;

    const token = `${mb.type}:${mb.user}:${mb.domain}:${mb.sid}`;
    return edit(chatId, messageId, wizardCard, {
      inline_keyboard: [
        [{ text: "📩 Check Meta OTP", callback_data: `mw_check_${token}` }],
        [
          { text: "🔄 Swap Email (New ID)", callback_data: "mw_swap" },
          { text: "💾 Save to Vault", callback_data: "mw_save" }
        ],
        [{ text: "⚡ Next Fresh Account", callback_data: "mw_start" }],
        [{ text: "⬅️ Back to Meta Hub", callback_data: "meta_hub" }]
      ]
    });
  }

  // Save Wizard Account to Vault
  if (data === "mw_save") {
    if (!session.metaWizard) {
      return edit(chatId, messageId, "⚠️ <i>No active wizard session to save.</i>", {
        inline_keyboard: [[{ text: "🤖 Meta Hub", callback_data: "meta_hub" }]]
      });
    }

    const acc = {
      username: session.metaWizard.email,
      password: session.metaWizard.password,
      extra: `${session.metaWizard.name} | DOB: ${session.metaWizard.dob}`,
      raw: `${session.metaWizard.email}|${session.metaWizard.password}|${session.metaWizard.name}|${session.metaWizard.dob}`
    };

    META_VAULT.fresh.unshift(acc);
    session.metaWizard = null;
    USER_STATE.set(userId, session);

    return edit(chatId, messageId, `✅ <b>ACCOUNT STORED IN META VAULT!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${acc.username}</code>\n🔑 <code>${acc.password}</code>\n👤 <code>${acc.extra}</code>\n\n📦 <b>Total Fresh Meta Stock:</b> <code>${META_VAULT.fresh.length}</code>`, {
      inline_keyboard: [
        [{ text: "🚀 Create Next Meta Account", callback_data: "mw_start" }],
        [{ text: "🤖 Return to Meta Hub", callback_data: "meta_hub" }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    });
  }

  // Fetch 1 Saved Meta Account
  if (data === "meta_get") {
    if (!isAdmin) return;
    if (META_VAULT.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Meta Vault is Empty!</b>\nUse the creator wizard or upload accounts first.`, {
        inline_keyboard: [
          [{ text: "🚀 Launch Creator Wizard", callback_data: "mw_start" }],
          [{ text: "⬅️ Back to Meta Hub", callback_data: "meta_hub" }]
        ]
      });
    }

    const acc = META_VAULT.fresh.shift();
    META_VAULT.used.unshift(acc);

    const card = 
      `🤖 <b>FRESH META AI ACCOUNT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Email:</b> <i>(Tap to copy)</i>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b> <i>(Tap to copy)</i>\n<code>${acc.password}</code>\n\n` +
      (acc.extra ? `ℹ️ <b>Details:</b> <code>${acc.extra}</code>\n\n` : '') +
      `📦 <i>Account moved to Used Archive.\nRemaining in Vault: ${META_VAULT.fresh.length}</i>`;

    return edit(chatId, messageId, card, {
      inline_keyboard: [
        [{ text: "⚡ Get Next Meta ID", callback_data: "meta_get" }],
        [{ text: "🤖 Meta Hub", callback_data: "meta_hub" }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    });
  }

  if (data === "meta_add_text") {
    if (!isAdmin) return;
    session.mode = 'awaiting_meta_save';
    USER_STATE.set(userId, session);
    return edit(chatId, messageId, `💾 <b>Send Meta credentials now:</b>\n<code>email:password</code> or <code>email|password</code>`, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "meta_hub" }]]
    });
  }

  if (data === "meta_add_file") {
    if (!isAdmin) return;
    session.mode = 'upload_meta';
    USER_STATE.set(userId, session);
    return edit(chatId, messageId, `📂 <b>Upload your .txt/.csv file for Meta Vault.</b>`, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "meta_hub" }]]
    });
  }

  if (data === "meta_export") {
    if (!isAdmin) return;
    const list = META_VAULT.used.map(a => a.raw).join("\n") || "No used accounts.";
    return sendDocument(chatId, list, "used_meta_accounts.txt", `📦 Used Meta Accounts Archive (${META_VAULT.used.length})`);
  }

  // 4. Instagram Vault Hub
  if (data === "insta_vault") {
    if (!isAdmin) return send(chatId, "⛔ Admin Only.");
    const vText = 
      `📸 <b>INSTAGRAM VAULT CONTROL HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Stock:</b> <code>${INSTA_VAULT.fresh.length}</code>\n` +
      `• <b>Used / Archived IDs:</b> <code>${INSTA_VAULT.used.length}</code>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get 1 Fresh Insta ID", callback_data: "insta_get" }],
        [
          { text: "💾 Save IDs (Text)", callback_data: "insta_add" },
          { text: "📁 Export Used IDs", callback_data: "insta_export" }
        ],
        [{ text: "🏠 Return to Home Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, vText, kb);
  }

  if (data === "insta_get") {
    if (!isAdmin) return;
    if (INSTA_VAULT.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Insta Vault is Empty!</b>`, {
        inline_keyboard: [[{ text: "📸 Back to Vault", callback_data: "insta_vault" }]]
      });
    }
    const acc = INSTA_VAULT.fresh.shift();
    INSTA_VAULT.used.unshift(acc);

    const card = 
      `📸 <b>FRESH INSTAGRAM ACCOUNT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Username:</b> <code>${acc.username}</code>\n` +
      `🔑 <b>Password:</b> <code>${acc.password}</code>\n\n` +
      `📦 <i>Remaining in Vault: ${INSTA_VAULT.fresh.length}</i>`;

    return edit(chatId, messageId, card, {
      inline_keyboard: [
        [{ text: "⚡ Get Next Insta ID", callback_data: "insta_get" }],
        [{ text: "📸 Vault Hub", callback_data: "insta_vault" }],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    });
  }

  if (data === "insta_add") {
    if (!isAdmin) return;
    session.mode = 'awaiting_insta_save';
    USER_STATE.set(userId, session);
    return edit(chatId, messageId, `💾 <b>Send Instagram credentials now:</b>\n<code>username:password</code>`, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "insta_vault" }]]
    });
  }

  if (data === "insta_export") {
    if (!isAdmin) return;
    const list = INSTA_VAULT.used.map(a => a.raw).join("\n") || "No accounts.";
    return sendDocument(chatId, list, "used_insta_accounts.txt", `📦 Used Insta Accounts (${INSTA_VAULT.used.length})`);
  }

  // 5. Admin Control Panel
  if (text === "/admin" || data === "admin_panel") {
    if (!isAdmin) return send(chatId, "❌ Unauthorized.");
    const adminListStr = Array.from(ADMIN_SET).map(id => `• <code>${id}</code> ${id === OWNER_ID ? '(Owner 👑)' : '(Sub-Admin 🛡️)'}`).join("\n");
    const aText = 
      `👑 <b>ENTERPRISE ADMIN MANAGEMENT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Owner ID:</b> <code>${OWNER_ID}</code>\n` +
      `• <b>Meta Vault Stock:</b> <code>${META_VAULT.fresh.length}</code> Accounts\n` +
      `• <b>Insta Vault Stock:</b> <code>${INSTA_VAULT.fresh.length}</code> Accounts\n\n` +
      `👥 <b>Authorized Admins:</b>\n${adminListStr}`;

    const rows = [
      [{ text: "🤖 Meta AI Hub", callback_data: "meta_hub" }, { text: "📸 Insta Vault", callback_data: "insta_vault" }]
    ];
    if (isOwner) {
      rows.push([{ text: "➕ Add Sub-Admin", callback_data: "admin_add_prompt" }]);
    }
    rows.push([{ text: "🏠 Return to Home Menu", callback_data: "home" }]);

    return messageId ? edit(chatId, messageId, aText, { inline_keyboard: rows }) : send(chatId, aText, { inline_keyboard: rows });
  }

  if (data === "admin_add_prompt" && isOwner) {
    session.mode = 'awaiting_add_admin';
    USER_STATE.set(userId, session);
    return edit(chatId, messageId, `➕ <b>Send Telegram User ID to authorize as Sub-Admin:</b>`, {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "admin_panel" }]]
    });
  }

  // 6. Temp Mail Generation
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
      `📡 <b>Relay:</b> <code>${mb.domain}</code>\n` +
      `⏳ <b>Status:</b> 🟢 <i>Listening for OTPs...</i>`;

    const token = `${mb.type}:${mb.user}:${mb.domain}:${mb.sid}`;
    return edit(chatId, messageId, out, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk:${token}` }],
        [
          { text: "🔄 Refresh", callback_data: `chk:${token}` },
          { text: "⚡ New Mail", callback_data: "gen" }
        ],
        [
          { text: "🌐 Switch Domain", callback_data: "domains" },
          { text: "🏠 Home Menu", callback_data: "home" }
        ]
      ]
    });
  }

  // 7. General Temp Mail Inbox Checker
  if (data && data.startsWith("chk:")) {
    const parts = data.split(":");
    const type = parts[1];
    const user = parts[2];
    const domain = parts[3];
    const sid = parts[4];
    const activeEmail = `${user}@${domain}`;
    const token = `${type}:${user}:${domain}:${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${activeEmail}</code>\n\n<i>No messages received yet. Tap Refresh below:</i>`, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: `chk:${token}` }],
          [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home Menu", callback_data: "home" }]
        ]
      });
    }

    let report = `📬 <b>INBOX RECEIVED (${list.length})</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${activeEmail}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);
      const fullText = (mailDetails.subject || "") + " " + (mailDetails.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 <b>From:</b> <code>${escapeHtml(mailDetails.from)}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${escapeHtml(mailDetails.subject)}</i>\n`;
      if (otp) {
        report += `🔑 <b>DETECTED OTP:</b> <code>${otp}</code>\n`;
      }
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [[{ text: "🔄 Refresh Inbox", callback_data: `chk:${token}` }]];
    if (detectedOtp) {
      kbRows.unshift([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }]);
    }
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home Menu", callback_data: "home" }]);

    return edit(chatId, messageId, report, { inline_keyboard: kbRows });
  }

  // 8. Domains Menu
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAINS.length; i += 2) {
      const row = [{ text: `@${DOMAINS[i]}`, callback_data: `dgen_${DOMAINS[i]}` }];
      if (DOMAINS[i + 1]) row.push({ text: `@${DOMAINS[i + 1]}`, callback_data: `dgen_${DOMAINS[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home Menu", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain:</b>`, { inline_keyboard: rows });
  }

  // 9. History Menu
  if (data === "history") {
    const list = session.history || [];
    let hMsg = `📜 <b>Recent Inboxes:</b>\n\n` + (list.map((e, idx) => `${idx + 1}. <code>${e}</code>`).join('\n') || "None");
    return edit(chatId, messageId, hMsg, {
      inline_keyboard: [[{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home Menu", callback_data: "home" }]]
    });
  }

  // 10. Help Menu
  if (data === "help") {
    const hText = 
      `📖 <b>HOW TO USE ALOKMAIL PRO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ <b>Temp Mail:</b> Generate instant disposable emails for any signup.\n` +
      `2️⃣ <b>Meta AI Wizard:</b> Step-by-step account creator card with live DOB, password generator, non-spamming OTP tracker, and 1-click email swapping.\n` +
      `3️⃣ <b>Instagram & Meta Vault:</b> Secure administrative stock management.`;

    return edit(chatId, messageId, hText, {
      inline_keyboard: [[{ text: "🏠 Return to Home Menu", callback_data: "home" }]]
    });
  }

  // 11. Status Menu
  if (data === "status") {
    const sText = 
      `🛡️ <b>SYSTEM TELEMETRY STATUS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Engine:</b> 🟢 Guerrilla & 1Sec Failover Active\n` +
      `• <b>Meta Wizard:</b> 🟢 Single-Message Interactive Flow Active\n` +
      `• <b>Platform:</b> Cloudflare Workers Global Edge\n` +
      `• <b>Latency:</b> < 15ms`;

    return edit(chatId, messageId, sText, {
      inline_keyboard: [[{ text: "🏠 Back", callback_data: "home" }]]
    });
  }
}

// Global API Helpers
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

async function sendDocument(chatId, content, filename, caption) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");
  formData.append("document", new Blob([content], { type: "text/plain" }), filename);
  return fetch(`${TELEGRAM_API}/sendDocument`, { method: "POST", body: formData });
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
