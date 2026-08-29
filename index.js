/**
 * AlokMail Pro - Ultimate 24/7 Engine + Protected Instagram Vault & Admin System
 * Multi-Domain Relay | Smart OTP Capture | Admin-Only Instagram Vault | Sub-Admin Manager
 * Platform: Cloudflare Workers
 * Owner ID: 8452322818
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const OWNER_ID = "8452322818";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Dynamic Admin Storage (Owner is permanent)
const ADMIN_SET = new Set([OWNER_ID]);

// Global In-Memory Data Stores
const USER_STATE = new Map();
const INSTA_VAULT = {
  fresh: [],
  used: []
};

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
      return new Response("⚡ AlokMail Pro Enterprise Security Engine is Running 24/7!", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// Helper: Check Admin Status
function checkIsAdmin(userId) {
  return userId === OWNER_ID || ADMIN_SET.has(userId);
}

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

// Mailbox Creation & Fetching
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
  const document = msg?.document;

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  let session = USER_STATE.get(userId) || { history: [], mode: null };
  const isAdmin = checkIsAdmin(userId);
  const isOwner = userId === OWNER_ID;

  // 1. File Upload (Bulk Accounts Saver - ADMIN ONLY)
  if (document) {
    if (!isAdmin) {
      return send(chatId, "⛔ <b>Access Restricted:</b> Only designated Admins can upload account lists to the vault.");
    }

    try {
      const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${document.file_id}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
      const fileContent = await downloadRes.text();

      const lines = fileContent.split(/\r?\n/);
      const accounts = [];
      for (const line of lines) {
        const acc = parseAccountLine(line);
        if (acc) accounts.push(acc);
      }

      if (accounts.length > 0) {
        INSTA_VAULT.fresh = [...accounts, ...INSTA_VAULT.fresh];

        return send(chatId, `📂 <b>FILE PROCESSED SUCCESSFULLY!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n• <b>Imported:</b> <code>${accounts.length}</code> Accounts\n• <b>Total Fresh Queue:</b> <code>${INSTA_VAULT.fresh.length}</code> Accounts\n\n👇 <i>Choose an action below:</i>`, {
          inline_keyboard: [
            [{ text: "⚡ Get 1 Fresh Insta ID", callback_data: "insta_get" }],
            [{ text: "📸 Go to Vault Hub", callback_data: "insta_vault" }],
            [{ text: "🏠 Return to Home", callback_data: "home" }]
          ]
        });
      } else {
        return send(chatId, "❌ <b>Format Error:</b> No accounts identified. Ensure format is <code>username:password</code> or <code>username|password</code>.");
      }
    } catch (e) {
      return send(chatId, `❌ <b>File Error:</b> ${e.message}`);
    }
  }

  // 2. Interactive Input Handlers (Add Admin / Save Text IDs)
  if (text && session.mode === 'awaiting_add_admin' && isOwner) {
    session.mode = null;
    USER_STATE.set(userId, session);

    const targetId = text.replace(/[^0-9]/g, '');
    if (targetId && targetId.length > 5) {
      ADMIN_SET.add(targetId);
      return send(chatId, `✅ <b>ADMIN PROMOTED!</b>\n━━━━━━━━━━━━━━━━━━━━━━\nUser ID <code>${targetId}</code> is now an authorized Sub-Admin.`, {
        inline_keyboard: [
          [{ text: "👑 Admin Control Panel", callback_data: "admin_panel" }],
          [{ text: "🏠 Return to Home", callback_data: "home" }]
        ]
      });
    } else {
      return send(chatId, "❌ <i>Invalid Telegram User ID format. Please send numeric user ID.</i>", {
        inline_keyboard: [[{ text: "👑 Back to Panel", callback_data: "admin_panel" }]]
      });
    }
  }

  if (text && session.mode === 'awaiting_insta_save' && isAdmin) {
    session.mode = null;
    USER_STATE.set(userId, session);

    const lines = text.split(/\r?\n/);
    const added = [];
    for (const l of lines) {
      const acc = parseAccountLine(l);
      if (acc) added.push(acc);
    }

    if (added.length > 0) {
      INSTA_VAULT.fresh = [...added, ...INSTA_VAULT.fresh];

      return send(chatId, `✅ <b>SAVED ${added.length} ACCOUNT(S) TO VAULT!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n• <b>Total Fresh IDs:</b> <code>${INSTA_VAULT.fresh.length}</code>\n\n👇 <i>Quick Actions:</i>`, {
        inline_keyboard: [
          [{ text: "⚡ Get 1 Fresh Insta ID", callback_data: "insta_get" }],
          [{ text: "📸 Vault Management", callback_data: "insta_vault" }],
          [{ text: "🏠 Return to Home", callback_data: "home" }]
        ]
      });
    } else {
      return send(chatId, "❌ <i>Format not recognized. Use: <code>username:password</code> or <code>username|password</code></i>", {
        inline_keyboard: [[{ text: "📸 Back to Vault", callback_data: "insta_vault" }]]
      });
    }
  }

  // Quick Command Admin Add: /addadmin 12345678
  if (text && text.startsWith("/addadmin")) {
    if (!isOwner) return send(chatId, "❌ <i>Unauthorized. Owner Only.</i>");
    const parts = text.split(" ");
    const newAdmin = parts[1]?.trim();
    if (newAdmin) {
      ADMIN_SET.add(newAdmin);
      return send(chatId, `✅ <b>User <code>${newAdmin}</code> added to Sub-Admins list!</b>`);
    } else {
      return send(chatId, "💡 <i>Usage:</i> <code>/addadmin &lt;telegram_user_id&gt;</code>");
    }
  }

  // Custom Alias Setup
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

  // 3. Home Screen (Dynamic UI based on Admin Status)
  if (text === "/start" || data === "home") {
    session.mode = null;
    USER_STATE.set(userId, session);

    let welcome = 
      `🛡️ <b>ALOKMAIL PRO — ENTERPRISE INBOX & VAULT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `High-speed disposable email generator with instant verification OTP auto-detection.\n\n`;

    if (isAdmin) {
      welcome += `👑 <b>Admin Mode Active</b>\n• <b>Vault Fresh IDs:</b> <code>${INSTA_VAULT.fresh.length}</code>\n• <b>Vault Used IDs:</b> <code>${INSTA_VAULT.used.length}</code>\n\n`;
    }

    welcome += `👇 <i>Select an action below:</i>`;

    const rows = [
      [{ text: "⚡ Generate Fresh Temp Mail", callback_data: "gen" }]
    ];

    if (isAdmin) {
      rows.push([
        { text: "📸 Insta Vault (Admin)", callback_data: "insta_vault" },
        { text: "👑 Admin Panel", callback_data: "admin_panel" }
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

  // 4. Instagram ID Vault Hub (ADMIN ONLY)
  if (data === "insta_vault") {
    if (!isAdmin) {
      return send(chatId, "⛔ <b>Restricted:</b> Instagram Vault is exclusively for Administrators.");
    }

    session.mode = null;
    USER_STATE.set(userId, session);

    const vText = 
      `📸 <b>INSTAGRAM VAULT CONTROL HUB</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Fresh IDs in Queue:</b> <code>${INSTA_VAULT.fresh.length}</code>\n` +
      `• <b>Archived / Used IDs:</b> <code>${INSTA_VAULT.used.length}</code>\n\n` +
      `🔒 <i>Accounts delivered here are isolated and never exposed to general public users.</i>\n\n` +
      `👇 <i>Select vault operation:</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get 1 Fresh Insta ID", callback_data: "insta_get" }],
        [
          { text: "💾 Save / Add IDs (Text)", callback_data: "insta_add" },
          { text: "📂 Upload CSV / TXT File", callback_data: "insta_upload_guide" }
        ],
        [
          { text: "📁 Export Used Accounts", callback_data: "insta_export" },
          { text: "🏠 Return to Home", callback_data: "home" }
        ]
      ]
    };
    return edit(chatId, messageId, vText, kb);
  }

  // Instagram File Upload Guide
  if (data === "insta_upload_guide") {
    if (!isAdmin) return;
    const uText = 
      `📂 <b>BULK UPLOAD INSTAGRAM ACCOUNTS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Simply send your <code>.txt</code> or <code>.csv</code> file in this chat right now.\n\n` +
      `📝 <b>Supported Line Formats:</b>\n` +
      `• <code>username:password</code>\n` +
      `• <code>username|password</code>\n` +
      `• <code>email:username:password</code>\n\n` +
      `• <b>Current Vault Queue:</b> <code>${INSTA_VAULT.fresh.length}</code> fresh accounts.`;

    const kb = {
      inline_keyboard: [[{ text: "⬅️ Back to Vault", callback_data: "insta_vault" }]]
    };
    return edit(chatId, messageId, uText, kb);
  }

  // Save Text Prompt
  if (data === "insta_add") {
    if (!isAdmin) return;
    session.mode = 'awaiting_insta_save';
    USER_STATE.set(userId, session);

    const addText = 
      `💾 <b>MANUAL ACCOUNTS REGISTRATION</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Send your Instagram credentials in the chat now.\n\n` +
      `📝 <b>Format:</b>\n` +
      `<code>username:password</code>\n` +
      `<code>username|password</code>\n\n` +
      `<i>(You can paste multiple lines at once!)</i>`;

    const kb = {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "insta_vault" }]]
    };
    return edit(chatId, messageId, addText, kb);
  }

  // Fetch 1 Fresh Instagram Account (ADMIN ONLY)
  if (data === "insta_get") {
    if (!isAdmin) return;

    if (INSTA_VAULT.fresh.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>VAULT IS EMPTY!</b>\n\nNo fresh accounts remaining. Add more accounts via text or file upload.`, {
        inline_keyboard: [
          [{ text: "💾 Save / Add IDs", callback_data: "insta_add" }],
          [{ text: "⬅️ Back to Vault", callback_data: "insta_vault" }]
        ]
      });
    }

    const acc = INSTA_VAULT.fresh.shift();
    INSTA_VAULT.used.unshift(acc);

    const card = 
      `📸 <b>FRESH INSTAGRAM ACCOUNT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Username:</b> <i>(Tap to copy)</i>\n<code>${acc.username}</code>\n\n` +
      `🔑 <b>Password:</b> <i>(Tap to copy)</i>\n<code>${acc.password}</code>\n\n` +
      (acc.extra ? `ℹ️ <b>Extra Info:</b> <code>${acc.extra}</code>\n\n` : '') +
      `📦 <i>Account moved to archive to prevent duplicate distribution.\nRemaining in Vault: ${INSTA_VAULT.fresh.length}</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Get Next Fresh ID", callback_data: "insta_get" }],
        [
          { text: "💾 Add More IDs", callback_data: "insta_add" },
          { text: "📸 Vault Hub", callback_data: "insta_vault" }
        ],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, card, kb);
  }

  // Export Used Accounts Backup (ADMIN ONLY)
  if (data === "insta_export") {
    if (!isAdmin) return;
    const list = INSTA_VAULT.used.map(a => a.raw).join("\n") || "No used accounts in archive.";
    return sendDocument(chatId, list, "used_instagram_accounts.txt", `📦 <b>Used Accounts Archive Export</b>\nTotal: ${INSTA_VAULT.used.length}`);
  }

  // 5. Admin Control Panel (Owner & Sub-Admins)
  if (text === "/admin" || data === "admin_panel") {
    if (!isAdmin) {
      return send(chatId, "❌ <i>Access Denied. Owner & Authorized Admins Only.</i>");
    }

    session.mode = null;
    USER_STATE.set(userId, session);

    const adminListStr = Array.from(ADMIN_SET).map(id => `• <code>${id}</code> ${id === OWNER_ID ? '(Owner 👑)' : '(Sub-Admin 🛡️)'}`).join("\n");

    const aText = 
      `👑 <b>ENTERPRISE ADMIN MANAGEMENT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Your ID:</b> <code>${userId}</code>\n` +
      `• <b>Role:</b> ${isOwner ? '👑 Super Owner' : '🛡️ Authorized Sub-Admin'}\n` +
      `• <b>Active Vault Stock:</b> <code>${INSTA_VAULT.fresh.length}</code> Accounts\n` +
      `• <b>Archived Stock:</b> <code>${INSTA_VAULT.used.length}</code> Accounts\n\n` +
      `👥 <b>Authorized Admins List:</b>\n${adminListStr}\n\n` +
      `👇 <i>Administrative Actions:</i>`;

    const rows = [
      [{ text: "📸 Manage Instagram Vault", callback_data: "insta_vault" }]
    ];

    if (isOwner) {
      rows.push([
        { text: "➕ Add Sub-Admin", callback_data: "admin_add_prompt" },
        { text: "📁 Export Fresh IDs", callback_data: "admin_export_fresh" }
      ]);
      rows.push([
        { text: "🗑️ Clear Fresh Vault", callback_data: "admin_clear_fresh" }
      ]);
    }

    rows.push([{ text: "🏠 Return to Home Menu", callback_data: "home" }]);

    const kb = { inline_keyboard: rows };
    return messageId ? edit(chatId, messageId, aText, kb) : send(chatId, aText, kb);
  }

  // Add Sub-Admin Prompt (OWNER ONLY)
  if (data === "admin_add_prompt") {
    if (!isOwner) return send(chatId, "❌ <i>Only the Super Owner can add Sub-Admins.</i>");
    session.mode = 'awaiting_add_admin';
    USER_STATE.set(userId, session);

    const promptText = 
      `➕ <b>ADD NEW SUB-ADMIN</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Send the <b>Telegram User ID</b> of the user you want to authorize as Sub-Admin.\n\n` +
      `<i>They will get full access to the Instagram Vault and admin tools.</i>`;

    const kb = {
      inline_keyboard: [[{ text: "⬅️ Cancel", callback_data: "admin_panel" }]]
    };
    return edit(chatId, messageId, promptText, kb);
  }

  // Admin Export Fresh Stock (OWNER ONLY)
  if (data === "admin_export_fresh") {
    if (!isOwner) return;
    const list = INSTA_VAULT.fresh.map(a => a.raw).join("\n") || "No fresh accounts available.";
    return sendDocument(chatId, list, "fresh_vault_stock.txt", `📁 <b>Fresh Vault Accounts Backup</b>\nTotal: ${INSTA_VAULT.fresh.length}`);
  }

  // Admin Clear Fresh Vault (OWNER ONLY)
  if (data === "admin_clear_fresh") {
    if (!isOwner) return;
    INSTA_VAULT.fresh = [];
    return edit(chatId, messageId, "🗑️ <b>Fresh accounts vault has been wiped clean.</b>", {
      inline_keyboard: [[{ text: "👑 Back to Admin Panel", callback_data: "admin_panel" }]]
    });
  }

  // 6. Generate Temp Mailbox
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
        ],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, out, kb);
  }

  // 7. Check Temp Mail Inbox
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
        `⚠️ <i>No message received yet. Send code and wait 3-5 sec before refreshing!</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`;

      const kb = {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox Now", callback_data: `chk_${token}` }],
          [
            { text: "⚡ Generate New Mail", callback_data: "gen" },
            { text: "🌐 Switch Domain", callback_data: "domains" }
          ],
          [{ text: "🏠 Main Menu", callback_data: "home" }]
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
        ],
        [{ text: "🏠 Main Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, report, kb);
  }

  // 8. Domain Selection
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

  // 9. Recent History
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

  // 10. Help Guide
  if (data === "help") {
    const hText = 
      `📖 <b>HOW TO USE ALOKMAIL PRO</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ <b>Generate Fresh Mailbox:</b> Instant disposable email for signup verification.\n` +
      `2️⃣ <b>Fetch OTP:</b> Instant 4-8 digit verification code detection in 1 tap.\n` +
      `3️⃣ <b>Instagram Vault:</b> Admin-protected storage for managing account credentials.\n\n` +
      `💡 <i>Custom Alias Command:</i>\n<code>/set yourname sharklasers.com</code>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Mailbox Now", callback_data: "gen" }],
        [{ text: "⬅️ Back to Menu", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, hText, kb);
  }

  // 11. Server Status
  if (data === "status") {
    const sText = 
      `🛡️ <b>SYSTEM TELEMETRY STATUS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Engine:</b> 🟢 Guerrilla & 1Sec Failover Active\n` +
      `• <b>Vault System:</b> 🔒 Protected (Admin Only)\n` +
      `• <b>Platform:</b> Cloudflare Workers Global Edge\n` +
      `• <b>Latency:</b> < 15ms`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Fresh Mail", callback_data: "gen" }],
        [{ text: "⬅️ Back", callback_data: "home" }]
      ]
    };
    return edit(chatId, messageId, sText, kb);
  }

  // 12. QR Code
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

  return fetch(`${TELEGRAM_API}/sendDocument`, {
    method: "POST",
    body: formData
  });
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
