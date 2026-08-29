/**
 * AlokMail Pro - All-in-One Cloudflare Worker Engine
 * Modules: Multi-Domain Temp Mail + Meta AI Creation Wizard & Vault + Instagram Vault + Admin Suite
 * Platform: Cloudflare Workers
 * Owner ID: 8452322818
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const OWNER_ID = "8452322818";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Dynamic Admin Store
const ADMIN_SET = new Set([OWNER_ID]);

// In-Memory Storage
const USER_STATE = new Map();
const INSTA_VAULT = { fresh: [], used: [] };
const META_VAULT = { fresh: [], used: [] };

// Identity & Name Pools
const NAMES_FIRST = [
  'Aakash', 'Rohit', 'Priya', 'Sneha', 'Vikas', 'Amit', 'Pooja', 'Arjun',
  'Kunal', 'Simran', 'Rahul', 'Divya', 'Aditi', 'Megha', 'Karan', 'Sahil'
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
      return new Response("⚡ AlokMail Pro Ultimate Cloudflare Engine is Live 24/7!", { status: 200 });
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
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "Aa1!";
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

// Mailbox Handlers
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

// Telegram Router
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

  // File Upload
  if (document) {
    if (!isAdmin) return send(chatId, "⛔ <b>Admin Access Only.</b>");

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
          return send(chatId, `🤖 <b>META ACCOUNTS LOADED!</b>\nAdded: <code>${accounts.length}</code>\nTotal Fresh: <code>${META_VAULT.fresh.length}</code>`, {
            inline_keyboard: [[{ text: "🤖 Meta AI Hub", callback_data: "meta_hub" }]]
          });
        } else {
          INSTA_VAULT.fresh = [...accounts, ...INSTA_VAULT.fresh];
          return send(chatId, `📸 <b>INSTAGRAM ACCOUNTS LOADED!</b>\nAdded: <code>${accounts.length}</code>\nTotal Fresh: <code>${INSTA_VAULT.fresh.length}</code>`, {
            inline_keyboard: [[{ text: "📸 Insta Vault", callback_data: "insta_vault" }]]
          });
        }
      } else {
        return send(chatId, "❌ <i>No valid accounts found in file.</i>");
      }
    } catch (e) {
      return send(chatId, `❌ <i>File error: ${e.message}</i>`);
    }
  }

  // Text Inputs
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

  // Main Home Menu
  if (text === "/start" || data === "home") {
    session.mode = null;
    USER_STATE.set(userId, session);

    let welcome = 
      `🛡️ <b>ALOKMAIL PRO — COMPLETE CONTROL CENTER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Temp Mail:</b> Free disposable mail generator & auto OTP fetcher.\n` +
      `• <b>Meta AI Wizard:</b> Live Account creation assistant with instant email swap.\n\n`;

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
        { text: "🤖 Meta AI Hub", callback_data: "meta_hub" },
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
      { text: "📖 Help & Guide", callback_data: "help" },
      { text: "🛡️ Server Telemetry", callback_data: "status" }
    ]);

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, welcome, kb) : send(chatId, welcome, kb);
  }

  // Meta AI Hub
  if (data === "meta_hub") {
    if (!isAdmin) return send(chatId, "⛔ Admin Only.");
    session.mode = null;
    USER_STATE.set(userId, session);

    const mText = 
      `🤖 <b>META AI (meta.ai) CREATION & VAULT HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Queue:</b> <code>${META_VAULT.fresh.length}</code>\n` +
      `• <b>Archived / Used IDs:</b> <code>${META_VAULT.used.length}</code>\n\n` +
      `🚀 <i>Use the Wizard below to get fresh credentials, fetch OTPs in seconds, and swap emails instantly if needed.</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Launch Meta AI Account Creator", callback_data: "meta_wizard_start" }],
        [{ text: "📦 Get 1 Fresh Saved Meta ID", callback_data: "meta_get" }],
        [
          { text: "💾 Save Accounts (Text)", callback_data: "meta_add_text" },
          { text: "📂 Upload CSV/TXT File", callback_data: "meta_add_file" }
        ],
        [
          { text: "📁 Export Used Meta IDs", callback_data: "meta_export" },
          { text: "🏠 Return to Home Menu", callback_data: "home" }
        ]
      ]
    };
    return edit(chatId, messageId, mText, kb);
  }

  // Meta AI Live Creator Wizard (Interactive Step-by-Step with 1-Click Email Swap)
  if (data === "meta_wizard_start" || data === "meta_wizard_swap") {
    if (!isAdmin) return;

    // Create fresh mailbox for Meta
    const mb = await createFastMailbox();
    const firstName = NAMES_FIRST[Math.floor(Math.random() * NAMES_FIRST.length)];
    const lastName = NAMES_LAST[Math.floor(Math.random() * NAMES_LAST.length)];
    const password = generateStrongPassword();
    const dobYear = Math.floor(1994 + Math.random() * 7); // 1994 - 2000 (Safe 18+)

    session.metaWizard = {
      mb,
      name: `${firstName} ${lastName}`,
      password,
      dob: `15 / 06 / ${dobYear}`,
      email: mb.email
    };
    USER_STATE.set(userId, session);

    const token = `${mb.type}_${mb.user}_${mb.domain}_${mb.sid}`;

    const wizardCard = 
      `🤖 <b>META AI ACCOUNT CREATOR WIZARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Name:</b> <code>${session.metaWizard.name}</code>\n` +
      `🎂 <b>DOB (18+ Safe):</b> <code>${session.metaWizard.dob}</code>\n` +
      `📧 <b>Email:</b> <i>(Tap to copy)</i>\n<code>${mb.email}</code>\n` +
      `🔑 <b>Password:</b> <code>${password}</code>\n\n` +
      `📝 <b>Workflow Instructions:</b>\n` +
      `1️⃣ Copy the Email & Password above into <b>meta.ai</b>.\n` +
      `2️⃣ Tap <b>'📩 Check Meta OTP'</b> below to get the code.\n` +
      `3️⃣ <i>Agar 10s me OTP na aaye, turant '🔄 Swap Email' dabayein!</i>\n` +
      `4️⃣ Account banne ke baad <b>'💾 Save Account to Vault'</b> dabayein.`;

    const kb = {
      inline_keyboard: [
        [{ text: "📩 Check Meta OTP", callback_data: `meta_wizard_chk_${token}` }],
        [
          { text: "🔄 OTP Nahi Aaya? Swap Email", callback_data: "meta_wizard_swap" },
          { text: "💾 Save to Vault", callback_data: "meta_wizard_save" }
        ],
        [{ text: "⚡ Next Fresh Account", callback_data: "meta_wizard_start" }],
        [{ text: "⬅️ Back to Meta Hub", callback_data: "meta_hub" }]
      ]
    };
    return edit(chatId, messageId, wizardCard, kb);
  }

  // Meta Wizard OTP Checker
  if (data && data.startsWith("meta_wizard_chk_")) {
    const [, type, user, domain, sid] = data.split("_");
    const activeEmail = `${user}@${domain}`;
    const token = `${type}_${user}_${domain}_${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `⏳ <b>WAITING FOR META OTP...</b>\n\n📧 <code>${activeEmail}</code>\n\n<i>No code received yet. If it takes more than 10 seconds, tap Swap Email below to retry with a fresh ID!</i>`, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox Now", callback_data: `meta_wizard_chk_${token}` }],
          [{ text: "🔄 OTP Nahi Aaya? Swap Email", callback_data: "meta_wizard_swap" }],
          [{ text: "⬅️ Back to Wizard", callback_data: "meta_wizard_start" }]
        ]
      });
    }

    let report = `✅ <b>META OTP RECEIVED!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${activeEmail}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 2); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);
      const fullText = (mailDetails.subject || "") + " " + (mailDetails.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `👤 <b>From:</b> <code>${escapeHtml(mailDetails.from)}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${escapeHtml(mailDetails.subject)}</i>\n`;
      if (otp) {
        report += `🔑 <b>META VERIFICATION CODE:</b> <code>${otp}</code>\n`;
      }
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [];
    if (detectedOtp) {
      kbRows.push([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }]);
    }
    kbRows.push([
      { text: "💾 Save Account to Vault", callback_data: "meta_wizard_save" },
      { text: "⚡ Next Fresh Account", callback_data: "meta_wizard_start" }
    ]);
    kbRows.push([{ text: "🤖 Meta Hub", callback_data: "meta_hub" }]);

    return edit(chatId, messageId, report, { inline_keyboard: kbRows });
  }

  // Save current wizard account directly to Meta Vault
  if (data === "meta_wizard_save") {
    if (!session.metaWizard) {
      return edit(chatId, messageId, "⚠️ <i>No active account wizard session found.</i>", {
        inline_keyboard: [[{ text: "🤖 Meta Hub", callback_data: "meta_hub" }]]
      });
    }

    const acc = {
      username: session.metaWizard.email,
      password: session.metaWizard.password,
      extra: session.metaWizard.name,
      raw: `${session.metaWizard.email}|${session.metaWizard.password}|${session.metaWizard.name}`
    };

    META_VAULT.fresh.unshift(acc);
    session.metaWizard = null;
    USER_STATE.set(userId, session);

    return edit(chatId, messageId, `✅ <b>ACCOUNT SAVED TO META VAULT!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${acc.username}</code>\n🔑 <code>${acc.password}</code>\n\n📦 <b>Total Fresh Stock in Vault:</b> <code>${META_VAULT.fresh.length}</code>`, {
      inline_keyboard: [
        [{ text: "⚡ Create Another Meta Account", callback_data: "meta_wizard_start" }],
        [{ text: "🤖 Meta Hub", callback_data: "meta_hub" }]
      ]
    });
  }

  // Fetch 1 Saved Meta Account
  if (data === "meta_get") {
    if (!isAdmin) return;
    if (META_VAULT.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>Meta Vault is Empty!</b>\nUse the creator wizard or upload accounts first.`, {
        inline_keyboard: [
          [{ text: "⚡ Launch Creator Wizard", callback_data: "meta_wizard_start" }],
          [{ text: "⬅️ Back to Meta Hub", callback_data: "meta_hub" }]
        ]
      });
    }

    const acc = META_VAULT.fresh.shift();
    META_VAULT.used.unshift(acc);

    const card = 
      `🤖 <b>FRESH META AI ACCOUNT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Email / Username:</b>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b>\n<code>${acc.password}</code>\n\n` +
      (acc.extra ? `ℹ️ <b>Info:</b> <code>${acc.extra}</code>\n\n` : '') +
      `📦 <i>Account moved to archive. Remaining in Vault: ${META_VAULT.fresh.length}</i>`;

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

  // Instagram Vault Hub
  if (data === "insta_vault") {
    if (!isAdmin) return send(chatId, "⛔ Admin Only.");
    const vText = 
      `📸 <b>INSTAGRAM VAULT CONTROL HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Stock:</b> <code>${INSTA_VAULT.fresh.length}</code>\n` +
      `• <b>Used / Archived:</b> <code>${INSTA_VAULT.used.length}</code>`;

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
    const list = INSTA_VAULT.used.map(a => a.raw).join("\n") || "No used accounts.";
    return sendDocument(chatId, list, "used_insta_accounts.txt", `📦 Used Insta Accounts (${INSTA_VAULT.used.length})`);
  }

  // Admin Control Panel
  if (text === "/admin" || data === "admin_panel") {
    if (!isAdmin) return send(chatId, "❌ Unauthorized.");
    const adminListStr = Array.from(ADMIN_SET).map(id => `• <code>${id}</code> ${id === OWNER_ID ? '(Owner)' : '(Sub-Admin)'}`).join("\n");
    const aText = 
      `👑 <b>ADMIN ENTERPRISE DASHBOARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Owner:</b> <code>${OWNER_ID}</code>\n` +
      `• <b>Meta Vault Stock:</b> <code>${META_VAULT.fresh.length}</code> Accounts\n` +
      `• <b>Insta Vault Stock:</b> <code>${INSTA_VAULT.fresh.length}</code> Accounts\n\n` +
      `👥 <b>Admins List:</b>\n${adminListStr}`;

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

  // Temp Mailbox Generation
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

    const token = `${mb.type}_${mb.user}_${mb.domain}_${mb.sid}`;
    return edit(chatId, messageId, out, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP / Check Inbox", callback_data: `chk_${token}` }],
        [
          { text: "🔄 Refresh", callback_data: `chk_${token}` },
          { text: "⚡ New Mail", callback_data: "gen" }
        ],
        [
          { text: "🌐 Switch Domain", callback_data: "domains" },
          { text: "🏠 Home Menu", callback_data: "home" }
        ]
      ]
    });
  }

  // Inbox Checker for General Temp Mail
  if (data && data.startsWith("chk_")) {
    const [, type, user, domain, sid] = data.split("_");
    const activeEmail = `${user}@${domain}`;
    const token = `${type}_${user}_${domain}_${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${activeEmail}</code>\n\n<i>No messages received yet. Tap Refresh below:</i>`, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: `chk_${token}` }],
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

    const kbRows = [[{ text: "🔄 Refresh Inbox", callback_data: `chk_${token}` }]];
    if (detectedOtp) {
      kbRows.unshift([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy" }]);
    }
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home Menu", callback_data: "home" }]);

    return edit(chatId, messageId, report, { inline_keyboard: kbRows });
  }

  // Domains Screen
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

  // History Screen
  if (data === "history") {
    const list = session.history || [];
    let hMsg = `📜 <b>Recent Inboxes:</b>\n\n` + (list.map((e, idx) => `${idx + 1}. <code>${e}</code>`).join('\n') || "None");
    return edit(chatId, messageId, hMsg, {
      inline_keyboard: [[{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home Menu", callback_data: "home" }]]
    });
  }

  // Help Screen
  if (data === "help") {
    const hText = 
      `📖 <b>HOW TO USE ALOKMAIL PRO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ <b>Temp Mail:</b> Generate instant temporary emails for general signups.\n` +
      `2️⃣ <b>Meta AI Hub:</b> Create Meta accounts step-by-step with live DOB, name generator, OTP listener, and instant email swapping.\n` +
      `3️⃣ <b>Instagram Vault:</b> Secure storage for created accounts.`;

    return edit(chatId, messageId, hText, {
      inline_keyboard: [[{ text: "🏠 Return to Home Menu", callback_data: "home" }]]
    });
  }

  // Status Screen
  if (data === "status") {
    const sText = 
      `🛡️ <b>SYSTEM TELEMETRY STATUS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Engine:</b> 🟢 Guerrilla & 1Sec Failover Active\n` +
      `• <b>Meta Wizard:</b> 🟢 Active & Ready\n` +
      `• <b>Platform:</b> Cloudflare Workers Global Edge\n` +
      `• <b>Latency:</b> < 15ms`;

    return edit(chatId, messageId, sText, {
      inline_keyboard: [[{ text: "🏠 Back", callback_data: "home" }]]
    });
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
