/**
 * ============================================
 *  ALOKMAIL PRO X — LONGVAN OTP INTEGRATION
 *  Temp Mail + Outlook Queue + LongVan OTP + Web Dashboard
 *  Platform: Cloudflare Workers
 *  Owner ID: 8452322818
 * ============================================
 */

const BOT_TOKEN = "8759442095:AAGCsqImU2IssXIvPIs-2Mdc1vZcdw92UDI";
const OWNER_ID = "8452322818";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ============================================
//  LONGVAN SDK CONFIG
// ============================================

const LONGVAN_CONFIG = {
  apiKey: "2Vwu7ROX0jNK7J00kbo5fnhxw",
  baseUrl: "https://api.longvan.com/v1", // Replace with actual base URL
};

// ============================================
//  GLOBAL STORES
// ============================================

const USER_STATE = new Map();
const OUTLOOK_STORE = {
  active: [],
  expired: [],
  current: null
};

const STATS = {
  totalEmails: 0,
  totalOTPs: 0,
  activeUsers: 0,
  startTime: Date.now()
};

// ============================================
//  LONGVAN OTP FUNCTIONS
// ============================================

async function sendLongVanOTP(phone) {
  try {
    const response = await fetch(`${LONGVAN_CONFIG.baseUrl}/auth/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LONGVAN_CONFIG.apiKey
      },
      body: JSON.stringify({ phone })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function validateLongVanOTP(phone, code) {
  try {
    const response = await fetch(`${LONGVAN_CONFIG.baseUrl}/auth/otp/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LONGVAN_CONFIG.apiKey
      },
      body: JSON.stringify({ phone, code })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getLongVanTokenByOTP(phone, code) {
  try {
    const response = await fetch(`${LONGVAN_CONFIG.baseUrl}/auth/token/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LONGVAN_CONFIG.apiKey
      },
      body: JSON.stringify({ phone, code })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ============================================
//  OUTLOOK OTP FUNCTIONS (with token refresh)
// ============================================

async function fetchOutlookOtp(email, password, token) {
  // Try with existing token
  let result = await callOutlookAPI(email, token);
  
  // If token expired, refresh it
  if (result.error && result.error.includes("expired")) {
    const newToken = await refreshOutlookToken(email, password);
    if (newToken) {
      if (OUTLOOK_STORE.current) {
        OUTLOOK_STORE.current.token = newToken;
      }
      result = await callOutlookAPI(email, newToken);
    }
  }
  return result;
}

async function callOutlookAPI(email, token) {
  try {
    const res = await fetch(`https://outlook.office365.com/api/v2.0/me/messages`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return { error: "Token expired or invalid auth", otp: null };
    const data = await res.json();
    const messages = data.value || [];
    if (messages.length === 0) return { otp: null, subject: "No messages found" };

    const latest = messages[0];
    const fullContent = (latest.Subject || "") + " " + (latest.BodyPreview || "");
    const otp = extractSmartOtp(fullContent);
    if (otp) STATS.totalOTPs++;
    return { otp, subject: latest.Subject, from: latest.From?.EmailAddress?.Address || "Outlook Service" };
  } catch (e) {
    return { error: "Network error", otp: null };
  }
}

async function refreshOutlookToken(email, password) {
  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'YOUR_CLIENT_ID',
        client_secret: 'YOUR_CLIENT_SECRET',
        grant_type: 'password',
        username: email,
        password: password,
        scope: 'https://graph.microsoft.com/Mail.Read'
      })
    });
    const data = await res.json();
    return data.access_token || null;
  } catch (e) {
    return null;
  }
}

// ============================================
//  UTILITY FUNCTIONS
// ============================================

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
    if (line.includes(';')) delimiter = ';';
    else if (line.includes(',')) delimiter = ',';
    else if (line.includes(':')) delimiter = ':';
    else if (line.includes('\t')) delimiter = '\t';
  }
  const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
  if (parts.length >= 2) {
    return {
      email: parts[0],
      password: parts[1],
      token: parts[3] || parts[2] || "",
      raw: line
    };
  }
  return null;
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getRandomUser() {
  const names = ['priya', 'sneha', 'pooja', 'ananya', 'riya', 'kavya', 'tanvi', 'shreya', 'alok', 'rahul', 'rohit', 'amit', 'vikas', 'arjun', 'varun', 'karan', 'sahil', 'manish', 'aakash', 'dev', 'ayush', 'yash', 'nikhil', 'harsh'];
  const adj = ['swift', 'cool', 'smart', 'bold', 'shiny', 'quiet', 'brave', 'lucky', 'royal', 'urban', 'silent', 'rapid', 'prime', 'sunny', 'noble', 'crisp', 'vivid', 'chill', 'sharp', 'fresh', 'stellar', 'lively', 'breezy', 'golden'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = names[Math.floor(Math.random() * names.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${a}${n.charAt(0).toUpperCase() + n.slice(1)}${num}`.toLowerCase();
}

const DOMAINS = ['sharklasers.com', 'guerrillamail.com', 'guerrillamailblock.com', 'spam4.me', 'pokemail.net', '1secmail.com', '1secmail.org', '1secmail.net'];

async function createFastMailbox(domainChoice = null) {
  const user = getRandomUser();
  const domain = domainChoice || DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  STATS.totalEmails++;
  return { type: 's', email: `${user}@${domain}`, user, domain, sid: '0' };
}

async function fetchFastMessages(type, user, domain, sid) {
  try {
    const res = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`);
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function fetchFastDetail(type, user, domain, sid, id) {
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

// ============================================
//  WEB DASHBOARD
// ============================================

async function handleWebDashboard(request) {
  const url = new URL(request.url);
  if (url.pathname === "/dashboard") {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlokMail Pro — Dashboard</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif}body{background:#0f0f1a;color:#e0e0e0;padding:20px}.container{max-width:1200px;margin:0 auto}h1{font-size:2rem;color:#6C63FF;margin-bottom:20px}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:30px}.stat-card{background:#1a1a2e;border:1px solid #2a2a4e;border-radius:12px;padding:20px;text-align:center}.stat-card h3{font-size:2rem;color:#6C63FF}.stat-card p{color:#888;font-size:0.85rem;margin-top:4px}.badge{display:inline-block;background:#6C63FF;color:#fff;padding:2px 12px;border-radius:20px;font-size:0.7rem;margin-left:8px}.online{color:#4CAF50}.footer{margin-top:30px;text-align:center;color:#555;font-size:0.8rem}
    </style></head>
    <body><div class="container">
    <h1>🛡️ AlokMail Pro <span class="badge">Enterprise</span></h1>
    <div class="stats-grid">
    <div class="stat-card"><h3>${STATS.totalEmails}</h3><p>Total Emails</p></div>
    <div class="stat-card"><h3>${STATS.totalOTPs}</h3><p>Total OTPs</p></div>
    <div class="stat-card"><h3>${USER_STATE.size}</h3><p>Active Users</p></div>
    <div class="stat-card"><h3>${OUTLOOK_STORE.active.length}</h3><p>Outlook Queue</p></div>
    <div class="stat-card"><h3>${Math.floor((Date.now() - STATS.startTime) / 86400000)}d</h3><p>Uptime</p></div>
    </div>
    <div class="footer">AlokMail Pro X — Powered by Cloudflare Workers • LongVan OTP + Outlook</div>
    </div></body></html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
  return null;
}

// ============================================
//  MAIN FETCH HANDLER
// ============================================

export default {
  async fetch(request, env, ctx) {
    const dashboardResponse = await handleWebDashboard(request);
    if (dashboardResponse) return dashboardResponse;

    if (request.method !== "POST") {
      return new Response("⚡ AlokMail Pro X — Enterprise Engine Running 24/7!", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ============================================
//  TELEGRAM HANDLER
// ============================================

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

  let session = USER_STATE.get(userId) || { history: [] };

  // ============================================
  //  DOCUMENT UPLOAD
  // ============================================

  if (document) {
    try {
      const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${document.file_id}`);
      const fileData = await fileRes.json();
      const filePath = fileData.result.file_path;
      const downloadRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
      const fileContent = await downloadRes.text();

      const lines = fileContent.split(/\r?\n/);
      const parsedAccounts = [];
      for (let line of lines) {
        const acc = parseAccountLine(line);
        if (acc) parsedAccounts.push(acc);
      }

      if (parsedAccounts.length > 0) {
        OUTLOOK_STORE.active = [...parsedAccounts, ...OUTLOOK_STORE.active];
        const uploadText = `📂 <b>ACCOUNTS LOADED!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n• <b>Added:</b> <code>${parsedAccounts.length}</code>\n• <b>Total Queue:</b> <code>${OUTLOOK_STORE.active.length}</code>`;
        return send(chatId, uploadText, {
          inline_keyboard: [
            [{ text: "⚡ Generate Outlook OTP", callback_data: "outlook_gen" }],
            [{ text: "📱 LongVan OTP", callback_data: "longvan" }],
            [{ text: "🏠 Home Menu", callback_data: "home" }]
          ]
        });
      } else {
        return send(chatId, "❌ No valid accounts found. Format: <code>email|password|token</code>");
      }
    } catch (err) {
      return send(chatId, `❌ Error: ${err.message}`);
    }
  }

  // ============================================
  //  HOME MENU
  // ============================================

  if (text === "/start" || data === "home") {
    const welcome = 
      `🛡️ <b>ALOKMAIL PRO X — ENTERPRISE HUB</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 Temp Mail + Outlook OTP + LongVan OTP\n\n` +
      `• <b>Outlook Queue:</b> <code>${OUTLOOK_STORE.active.length}</code>\n` +
      `• <b>Total OTPs:</b> <code>${STATS.totalOTPs}</code>\n\n` +
      `👇 <i>Select an option:</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
        [{ text: "📥 Outlook OTP", callback_data: "outlook_gen" }],
        [{ text: "📱 LongVan OTP", callback_data: "longvan" }],
        [{ text: "📂 Upload Accounts", callback_data: "upload_guide" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }],
        [{ text: "📊 Web Dashboard", callback_data: "web_dashboard" }],
        [{ text: "👑 Admin Panel", callback_data: "admin_panel" }],
        [{ text: "📖 Help", callback_data: "help" }]
      ]
    };
    return messageId ? edit(chatId, messageId, welcome, kb) : send(chatId, welcome, kb);
  }

  // ============================================
  //  LONGVAN OTP HANDLER
  // ============================================

  if (data === "longvan") {
    return edit(chatId, messageId,
      `📱 <b>LONGVAN OTP SERVICE</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Enter phone number with country code (without +):\n` +
      `<i>Example: 84123456789</i>`,
      {
        inline_keyboard: [
          [{ text: "🔙 Back to Home", callback_data: "home" }]
        ]
      }
    );
  }

  // Handle LongVan phone input (text message)
  if (text && text.match(/^\d{9,15}$/)) {
    const phone = text;
    const result = await sendLongVanOTP(phone);
    if (result.success) {
      return send(chatId,
        `✅ <b>OTP SENT!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 Phone: <code>${phone}</code>\n` +
        `⏳ Please enter the OTP code you received.`,
        {
          inline_keyboard: [
            [{ text: "📋 Enter OTP Code", callback_data: `longvan_validate_${phone}` }],
            [{ text: "🔙 Back to Home", callback_data: "home" }]
          ]
        }
      );
    } else {
      return send(chatId, `❌ Failed to send OTP: ${result.message}`);
    }
  }

  // Handle LongVan OTP validation (callback)
  if (data && data.startsWith("longvan_validate_")) {
    const phone = data.replace("longvan_validate_", "");
    return edit(chatId, messageId,
      `📱 <b>ENTER OTP CODE</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Phone: <code>${phone}</code>\n\n` +
      `<i>Send the OTP code as a message.</i>`,
      {
        inline_keyboard: [
          [{ text: "🔙 Back to Home", callback_data: "home" }]
        ]
      }
    );
  }

  // Handle LongVan OTP code input (text message)  
  if (text && text.match(/^\d{4,8}$/)) {
    // Check if we have a pending phone number
    const phone = USER_STATE.get(userId)?.pendingPhone || null;
    if (phone) {
      const result = await validateLongVanOTP(phone, text);
      if (result.success) {
        // Get token from OTP
        const tokenResult = await getLongVanTokenByOTP(phone, text);
        return send(chatId,
          `✅ <b>OTP VALIDATED!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📱 Phone: <code>${phone}</code>\n` +
          `🔑 <b>Access Token:</b> <code>${tokenResult.accessToken || 'Generated'}</code>`,
          { inline_keyboard: [[{ text: "🏠 Home Menu", callback_data: "home" }]] }
        );
      } else {
        return send(chatId, `❌ Invalid OTP: ${result.message}`);
      }
    }
  }

  // ============================================
  //  OUTLOOK GENERATE
  // ============================================

  if (data === "outlook_gen") {
    if (OUTLOOK_STORE.active.length === 0) {
      return edit(chatId, messageId, `⚠️ <b>OUTLOOK QUEUE EMPTY!</b>\n\nUpload a CSV file first.`, {
        inline_keyboard: [[{ text: "📂 Upload Guide", callback_data: "upload_guide" }], [{ text: "🏠 Home Menu", callback_data: "home" }]]
      });
    }

    const acc = OUTLOOK_STORE.active.shift();
    OUTLOOK_STORE.current = acc;

    const outText = 
      `📬 <b>OUTLOOK ACCOUNT READY</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b> <code>${acc.email}</code>\n` +
      `🔑 <b>Password:</b> <code>${acc.password}</code>\n\n` +
      `📦 <b>Remaining:</b> <code>${OUTLOOK_STORE.active.length}</code>\n\n` +
      `👇 <i>Press 'Fetch OTP' to check inbox.</i>`;

    return edit(chatId, messageId, outText, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP", callback_data: "outlook_chk" }],
        [{ text: "⏭️ Next Account", callback_data: "outlook_gen" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    });
  }

  // ============================================
  //  OUTLOOK CHECK OTP
  // ============================================

  if (data === "outlook_chk") {
    const acc = OUTLOOK_STORE.current;
    if (!acc) {
      return edit(chatId, messageId, `⚠️ No active account.`, {
        inline_keyboard: [[{ text: "⚡ Generate Outlook OTP", callback_data: "outlook_gen" }], [{ text: "🏠 Home Menu", callback_data: "home" }]]
      });
    }

    await send(chatId, "⏳ <i>Checking inbox for OTP...</i>");

    const result = await fetchOutlookOtp(acc.email, acc.password, acc.token);

    if (result.otp) {
      OUTLOOK_STORE.expired.unshift(acc);
      const successReport = 
        `✅ <b>OTP RETRIEVED!</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${acc.email}</code>\n` +
        `🔑 <b>OTP:</b> <code>${result.otp}</code>\n` +
        `📝 <b>Subject:</b> <i>${escapeHtml(result.subject)}</i>\n` +
        `📦 <i>Archived. Remaining: ${OUTLOOK_STORE.active.length}</i>`;

      return edit(chatId, messageId, successReport, {
        inline_keyboard: [
          [{ text: `📋 Copy OTP: ${result.otp}`, callback_data: "dummy_otp" }],
          [{ text: "⏭️ Next Account", callback_data: "outlook_gen" }],
          [{ text: "🏠 Home Menu", callback_data: "home" }]
        ]
      });
    } else {
      const errInfo = result.error ? `\n⚠️ <b>Status:</b> <code>${result.error}</code>` : "";
      const report = 
        `⏳ <b>WAITING FOR OTP...</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 <b>Email:</b> <code>${acc.email}</code>\n${errInfo}\n\n` +
        `<i>Send verification code, wait 5s, tap refresh.</i>`;

      return edit(chatId, messageId, report, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: "outlook_chk" }],
          [{ text: "⏭️ Skip to Next", callback_data: "outlook_gen" }],
          [{ text: "🏠 Home Menu", callback_data: "home" }]
        ]
      });
    }
  }

  // ============================================
  //  TEMP MAIL GENERATE
  // ============================================

  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createFastMailbox(domainChoice);

    session.active = mb;
    session.history = [mb.email, ...(session.history || []).filter(e => e !== mb.email)].slice(0, 5);
    USER_STATE.set(userId, session);

    const out = 
      `📬 <b>TEMP MAIL READY</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b> <code>${mb.email}</code>\n` +
      `📡 <b>Relay:</b> <code>${mb.domain}</code>\n\n` +
      `👇 <i>Press 'Fetch OTP' to check inbox.</i>`;

    const token = `${mb.type}_${mb.user}_${mb.domain}_${mb.sid}`;
    return edit(chatId, messageId, out, {
      inline_keyboard: [
        [{ text: "📩 Fetch OTP", callback_data: `chk_${token}` }],
        [{ text: "🔄 Refresh", callback_data: `chk_${token}` }],
        [{ text: "⚡ New Mail", callback_data: "gen" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    });
  }

  // ============================================
  //  CHECK TEMP MAIL INBOX
  // ============================================

  if (data && data.startsWith("chk_")) {
    const [, type, user, domain, sid] = data.split("_");
    const activeEmail = `${user}@${domain}`;
    const token = `${type}_${user}_${domain}_${sid}`;

    const list = await fetchFastMessages(type, user, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId, `📭 <b>WAITING FOR OTP...</b>\n\n📧 <code>${activeEmail}</code>\n\n<i>No messages yet.</i>`, {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: `chk_${token}` }],
          [{ text: "⚡ New Mail", callback_data: "gen" }],
          [{ text: "🏠 Home Menu", callback_data: "home" }]
        ]
      });
    }

    let report = `📬 <b>INBOX — ${list.length} MESSAGE(S)</b>\n━━━━━━━━━━━━━━━━━━━━━━\n📧 <code>${activeEmail}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const m = list[i];
      const mailDetails = await fetchFastDetail(type, user, domain, sid, m.id);
      const fullText = (mailDetails.subject || "") + " " + (mailDetails.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 #${i+1} | 👤 <code>${escapeHtml(mailDetails.from)}</code>\n`;
      report += `📝 ${escapeHtml(mailDetails.subject)}\n`;
      if (otp) report += `🔑 <b>OTP:</b> <code>${otp}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [];
    if (detectedOtp) {
      kbRows.push([{ text: `📋 Copy OTP: ${detectedOtp}`, callback_data: "dummy_otp" }]);
    }
    kbRows.push([{ text: "🔄 Refresh Inbox", callback_data: `chk_${token}` }]);
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }]);
    kbRows.push([{ text: "🏠 Home Menu", callback_data: "home" }]);

    return edit(chatId, messageId, report, { inline_keyboard: kbRows });
  }

  // ============================================
  //  DOMAINS
  // ============================================

  if (data === "domains") {
    const dMsg = `🌐 <b>SELECT DOMAIN</b>\n━━━━━━━━━━━━━━━━━━━━━━\nPick a domain for your mailbox:`;
    const rows = [];
    for (let i = 0; i < DOMAINS.length; i += 2) {
      const row = [{ text: `@${DOMAINS[i]}`, callback_data: `dgen_${DOMAINS[i]}` }];
      if (DOMAINS[i + 1]) row.push({ text: `@${DOMAINS[i + 1]}`, callback_data: `dgen_${DOMAINS[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home Menu", callback_data: "home" }]);
    return edit(chatId, messageId, dMsg, { inline_keyboard: rows });
  }

  // ============================================
  //  UPLOAD GUIDE
  // ============================================

  if (data === "upload_guide") {
    const uText = 
      `📂 <b>UPLOAD OUTLOOK / HOTMAIL ACCOUNTS</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Send <code>.csv</code> or <code>.txt</code> file.\n\n` +
      `📝 Format: <code>email|password|token</code>\n` +
      `• Current Queue: <code>${OUTLOOK_STORE.active.length}</code>`;
    return edit(chatId, messageId, uText, {
      inline_keyboard: [
        [{ text: "⚡ Generate Outlook OTP", callback_data: "outlook_gen" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    });
  }

  // ============================================
  //  WEB DASHBOARD LINK
  // ============================================

  if (data === "web_dashboard") {
    const url = `https://${new URL(request.url).host}/dashboard`;
    return edit(chatId, messageId,
      `🌐 <b>WEB DASHBOARD</b>\n\n📊 Access real-time stats:\n<code>${url}</code>`,
      { inline_keyboard: [[{ text: "🔗 Open Dashboard", url: url }], [{ text: "🏠 Home Menu", callback_data: "home" }]] }
    );
  }

  // ============================================
  //  ADMIN PANEL
  // ============================================

  if (text === "/admin" || data === "admin_panel") {
    if (userId !== OWNER_ID) return send(chatId, "❌ Access Denied.");

    const aText = 
      `👑 <b>ADMIN DASHBOARD</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• Active Queue: <code>${OUTLOOK_STORE.active.length}</code>\n` +
      `• Archived: <code>${OUTLOOK_STORE.expired.length}</code>\n` +
      `• Total OTPs: <code>${STATS.totalOTPs}</code>\n` +
      `• Users: <code>${USER_STATE.size}</code>`;

    const kb = {
      inline_keyboard: [
        [{ text: "📁 Export Active", callback_data: "export_active" }],
        [{ text: "📦 Export Used", callback_data: "export_used" }],
        [{ text: "🗑️ Clear Queue", callback_data: "clear_queue" }],
        [{ text: "🏠 Home Menu", callback_data: "home" }]
      ]
    };
    return messageId ? edit(chatId, messageId, aText, kb) : send(chatId, aText, kb);
  }

  // ============================================
  //  ADMIN EXPORTS
  // ============================================

  if (data === "export_active" && userId === OWNER_ID) {
    const textData = OUTLOOK_STORE.active.map(a => a.raw).join("\n") || "No active accounts.";
    return sendDocument(chatId, textData, "active_accounts.txt", "📁 Active Accounts");
  }

  if (data === "export_used" && userId === OWNER_ID) {
    const textData = OUTLOOK_STORE.expired.map(a => a.raw).join("\n") || "No used accounts.";
    return sendDocument(chatId, textData, "used_accounts.txt", "📦 Used Accounts");
  }

  if (data === "clear_queue" && userId === OWNER_ID) {
    OUTLOOK_STORE.active = [];
    return edit(chatId, messageId, "🗑️ Queue cleared.", {
      inline_keyboard: [[{ text: "👑 Admin Panel", callback_data: "admin_panel" }]]
    });
  }

  // ============================================
  //  HELP
  // ============================================

  if (data === "help") {
    const hText = 
      `📖 <b>HOW TO USE</b>\n━━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ <b>Temp Mail:</b> Tap 'Generate Temp Mail'\n` +
      `2️⃣ <b>Outlook OTP:</b> Upload CSV → Generate → Fetch\n` +
      `3️⃣ <b>LongVan OTP:</b> Tap 'LongVan OTP' → Enter phone → Enter OTP\n` +
      `4️⃣ <b>Web Dashboard:</b> Tap 'Web Dashboard' for stats`;
    return edit(chatId, messageId, hText, {
      inline_keyboard: [[{ text: "🏠 Home Menu", callback_data: "home" }]]
    });
  }

  // ============================================
  //  FALLBACK
  // ============================================

  if (data) {
    return edit(chatId, messageId, "⚠️ Action not recognized.", {
      inline_keyboard: [[{ text: "🏠 Home Menu", callback_data: "home" }]]
    });
  }
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
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.description?.includes("message is not modified")) return res;
    return send(chatId, text, kb);
  }
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
