/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Features:
 * - Custom Email Username Selection
 * - Admin-Only Old Email Hub (Strict Privacy Protection)
 * - Last 3 OTPs History per Email
 * - Full HTML Email Web Viewer (/view endpoint)
 * - Anti-Spam Rate Limiter (Cooldown Engine)
 * - Anti-Crash Compact Database with Auto-Pruning
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818"; // Sirf ye ID purana email bind kar sakti hai
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// In-Memory Runtime State
let USER_STATE = new Map();
let USER_COOLDOWN = new Map();
let HTML_PREVIEWS = new Map(); // Recent 50 HTML emails for web view

const FEMALE_NAMES = [
  "priya", "ananya", "sneha", "pooja", "neha", "riya", "simran", "kajal",
  "khushi", "aditi", "shreya", "tanvi", "mansi", "divya", "muskan", "aarushi",
  "ishika", "sakshi", "pallavi", "swati", "anjali", "kriti", "megha", "komal",
  "sonam", "preeti", "jyoti", "rekha", "payal", "varsha", "shikha", "nisha"
];

const SURNAMES = [
  "sharma", "verma", "singh", "patel", "kumar", "yadav", "gupta", "mishra",
  "tiwari", "pandey", "chauhan", "joshi", "jha", "mehta", "das", "dubey", "reddy", "bose", "saxena"
];

export default {
  // --- 1. HTTP REQUEST / WEBHOOK & WEB VIEWER ROUTER ---
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // [FEATURE: Web View Endpoint for Full HTML]
    if (url.pathname === "/view") {
      const emailParam = (url.searchParams.get("mail") || "").toLowerCase();
      const token = url.searchParams.get("token") || "";

      const record = HTML_PREVIEWS.get(emailParam);
      if (!record || record.token !== token) {
        return new Response("<h3>⚠️ Email preview expired or invalid link.</h3>", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      return new Response(record.html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    if (request.method !== "POST") return new Response("Bot Engine OK", { status: 200 });

    try {
      const update = await request.json();
      const workerOrigin = `${url.protocol}//${url.host}`;

      // --- INLINE CALLBACK BUTTONS ---
      if (update.callback_query) {
        const q = update.callback_query;
        const chatId = q.message.chat.id.toString();
        const data = q.data;

        if (data === "btn_gen") {
          await handleEmailGenRequest(chatId, workerOrigin);
        } else if (data === "btn_custom") {
          await handleCustomNamePrompt(chatId);
        } else if (data === "btn_check_otp") {
          await checkCurrentOtp(chatId, workerOrigin);
        } else if (data === "btn_old_hub") {
          if (chatId === PRIMARY_OWNER_ID) {
            await handleOldHubPrompt(chatId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Purana email access karne ki permission sirf Owner ke paas hai.");
          }
        }

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: q.id
        }), { headers: { "Content-Type": "application/json" } });
      }

      // --- INCOMING CHAT MESSAGES ---
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();
        const isAdmin = (chatId === PRIMARY_OWNER_ID);

        // State: Awaiting Custom Email Username
        if (USER_STATE.get(chatId) === "awaiting_custom_name") {
          USER_STATE.delete(chatId);
          await processCustomEmailCreation(chatId, text, workerOrigin);
          return new Response("OK");
        }

        // State: Awaiting Old Email (Strictly Owner Only)
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          if (isAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin);
          } else {
            await sendMsg(chatId, "⛔ *Security Alert:* Purana email restore karne ki anumati aapko nahi hai.");
          }
          return new Response("OK");
        }

        // Direct Email Paste Check
        if (text.toLowerCase().includes(`@${DOMAIN}`)) {
          if (isAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin);
          } else {
            await sendMsg(chatId, "⚠️ Dusre ka email yahan paste karke OTP nahi le sakte. Naya email lene ke liye *⚡ Random Email* ya *✏️ Custom Email* chunein.");
          }
          return new Response("OK");
        }

        // Commands & Main Menu
        if (text === "/start") {
          USER_STATE.delete(chatId);

          let keyboard = [
            [{ text: "⚡ Random Email" }, { text: "✏️ Custom Email" }],
            [{ text: "📬 Check OTP" }]
          ];

          if (isAdmin) {
            keyboard[1].push({ text: "🔑 Old Email Hub (Owner)" });
          }

          await sendMsg(chatId, 
            `👋 *Meta AI & Instagram Temp Mail Hub*\n\nNaya email banayein ya apna custom username chunein. Meta AI / Instagram ka OTP turant instant deliver hoga!\n\n_Security: Aapka email aur OTP 100% private hai._`, 
            { keyboard: keyboard, resize_keyboard: true }
          );
        } 
        else if (text === "⚡ Random Email" || text === "/gen") {
          await handleEmailGenRequest(chatId, workerOrigin);
        }
        else if (text === "✏️ Custom Email" || text === "/custom") {
          await handleCustomNamePrompt(chatId);
        }
        else if (text === "📬 Check OTP" || text === "/otp") {
          await checkCurrentOtp(chatId, workerOrigin);
        }
        else if (text.includes("Old Email Hub") || text === "/old") {
          if (isAdmin) {
            await handleOldHubPrompt(chatId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Yeh command sirf Bot Owner ke liye hai.");
          }
        }

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. CLOUDFLARE EMAIL ROUTING RECEIVER ---
  async email(message, env, ctx) {
    try {
      const rawFrom = (message.from || "").toLowerCase();
      const rawTo = (message.to || "").toLowerCase();
      const emailMatch = rawTo.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      const toEmail = emailMatch ? emailMatch[0].trim() : rawTo.trim();

      // Meta, Facebook, Instagram Source Check
      const isMetaSource = rawFrom.includes("facebookmail.com") ||
                           rawFrom.includes("instagram.com") ||
                           rawFrom.includes("meta.com") ||
                           rawFrom.includes("facebook.com");

      if (!isMetaSource) return; // Non-Meta emails ko ignore karein

      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";

      const extractedOtp = extractMetaAiOtp(subject, raw);
      const verifyLink = extractGenuineVerificationLink(raw);

      if (!extractedOtp && !verifyLink) return;

      const { messageId, db } = await getChannelDb();
      const boundUser = db.emails ? db.emails[toEmail] : null;

      // Deduplication: 5 min ke andar same code bar bar na bhejein
      const currentToken = extractedOtp || verifyLink;
      const prevRecord = db.inboxes ? db.inboxes[toEmail] : null;
      const now = Date.now();

      if (prevRecord && prevRecord.tok === currentToken && (now - (prevRecord.ts || 0) < 300000)) {
        return;
      }

      // History maintain karein (Last 3 OTPs)
      let history = (prevRecord && Array.isArray(prevRecord.hist)) ? prevRecord.hist : [];
      if (extractedOtp) {
        history.unshift({
          otp: extractedOtp,
          time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' })
        });
        if (history.length > 3) history = history.slice(0, 3);
      }

      // Save to Web Preview Memory (50 items max)
      const previewToken = Math.random().toString(36).substring(2, 10);
      HTML_PREVIEWS.set(toEmail, { html: raw, token: previewToken });
      if (HTML_PREVIEWS.size > 50) {
        const oldestKey = HTML_PREVIEWS.keys().next().value;
        HTML_PREVIEWS.delete(oldestKey);
      }

      // Compact Database Entry
      if (!db.inboxes) db.inboxes = {};
      db.inboxes[toEmail] = {
        otp: extractedOtp,
        lnk: verifyLink,
        tok: currentToken,
        ts: now,
        hist: history,
        ptok: previewToken
      };

      await saveChannelDb(messageId, db);

      // Deliver to user directly if bound
      if (boundUser) {
        const workerOrigin = `https://${DOMAIN}`; // Fallback origin for web view button
        await deliverOtpBox(boundUser, extractedOtp, toEmail, verifyLink, history, previewToken, workerOrigin);
      }

      // DB Channel Log (Audit trail)
      if (DB_CHANNEL_ID) {
        await sendMsg(
          DB_CHANNEL_ID, 
          `🔔 *[NEW META EMAIL]*\n📧 Email: \`${toEmail}\`\n👤 Linked User: \`${boundUser || "None"}\`\n🔑 OTP: \`${extractedOtp || "Link"}\``
        );
      }

    } catch (err) {
      console.error("Email Routing Error:", err);
    }
  }
};

// --- OTP & LINK PARSERS ---
function extractMetaAiOtp(subject, rawBody) {
  let body = rawBody
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  if (subject) {
    const subjMatch = subject.match(/\b(\d{3})\s?(\d{3})\b/) || subject.match(/\b(\d{6,8})\b/);
    if (subjMatch) {
      const code = subjMatch[0].replace(/\s+/g, "");
      if (code.length >= 6 && code.length <= 8) return code;
    }
  }

  let cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/#[0-9a-fA-F]{6}\b/g, " ")
    .replace(/#[0-9a-fA-F]{3}\b/g, " ");

  const tagMatches = [...cleanBody.matchAll(/>\s*([0-9]{3}\s?[0-9]{3}|[0-9]{6,8})\s*</g)];
  for (const m of tagMatches) {
    const code = m[1].replace(/\s+/g, "");
    if (code.length >= 6 && code.length <= 8 && !code.startsWith("000000")) {
      return code;
    }
  }

  let plain = cleanBody.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
  const patterns = [
    /(?:code|otp|pin|passcode|confirmation code)[\s:=–-]{1,25}(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)/i,
    /(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)\s*(?:is your|to verify|aapka code)/i,
    /enter\s*(?:the|this)?\s*code\s*[:\s-]{1,25}(\b\d{3}\s?\d{3}\b|\b\d{6,8}\b)/i
  ];

  for (const pat of patterns) {
    const match = plain.match(pat);
    if (match) {
      const code = (match[1] || match[0]).replace(/\D/g, "");
      if (code.length >= 6 && code.length <= 8) return code;
    }
  }

  return null;
}

function extractGenuineVerificationLink(raw) {
  const urls = raw.match(/https?:\/\/[^\s<>"{}|\\^`']+/gi) || [];

  for (let u of urls) {
    let cleanUrl = u.replace(/&amp;/g, "&");
    if (/meta\.com|instagram\.com|facebook\.com/i.test(cleanUrl)) {
      if (/collect|pixel|beacon|logging|tr\?|1x1|static|fbcdn|cdn|help\.|terms/i.test(cleanUrl)) {
        continue;
      }
      if (/confirm|verify|action|checkpoint|\/c\/|token=/i.test(cleanUrl)) {
        return cleanUrl;
      }
    }
  }
  return null;
}

// --- DATABASE WITH TELEGRAM 4096 CHAR PROTECTION ---
async function getChannelDb() {
  const defaultDb = { users: {}, emails: {}, inboxes: {} };

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${DB_CHANNEL_ID}`);
    const data = await res.json();

    if (data.ok && data.result.pinned_message) {
      try {
        const parsed = JSON.parse(data.result.pinned_message.text);
        return { 
          messageId: data.result.pinned_message.message_id, 
          db: { users: parsed.users || {}, emails: parsed.emails || {}, inboxes: parsed.inboxes || {} } 
        };
      } catch (err) {}
    }

    const initRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, text: JSON.stringify(defaultDb) })
    });
    const initData = await initRes.json();

    if (initData.ok) {
      const newMsgId = initData.result.message_id;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/pinChatMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: newMsgId, disable_notification: true })
      });
      return { messageId: newMsgId, db: defaultDb };
    }
  } catch (e) {}

  return { messageId: null, db: defaultDb };
}

async function saveChannelDb(messageId, db) {
  if (!messageId) return;

  // Telegram character limit protection (Prune oldest logs to keep size tiny)
  const inboxKeys = Object.keys(db.inboxes || {});
  if (inboxKeys.length > 20) {
    const removeCount = inboxKeys.length - 20;
    for (let i = 0; i < removeCount; i++) delete db.inboxes[inboxKeys[i]];
  }

  const emailKeys = Object.keys(db.emails || {});
  if (emailKeys.length > 35) {
    const removeCount = emailKeys.length - 35;
    for (let i = 0; i < removeCount; i++) delete db.emails[emailKeys[i]];
  }

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DB_CHANNEL_ID,
        message_id: messageId,
        text: JSON.stringify(db)
      })
    });
  } catch (e) {}
}

// --- USER ACTIONS & HANDLERS ---

// 1. Random Email Generator with Anti-Spam Cooldown
async function handleEmailGenRequest(chatId, workerOrigin) {
  const lastCall = USER_COOLDOWN.get(chatId) || 0;
  const now = Date.now();
  if (now - lastCall < 15000) {
    const remaining = Math.ceil((15000 - (now - lastCall)) / 1000);
    await sendMsg(chatId, `⏳ *Cooldown Active:* Kripya *${remaining} second* baad naya email banayein.`);
    return;
  }
  USER_COOLDOWN.set(chatId, now);

  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  const { messageId, db } = await getChannelDb();

  db.users[chatId] = newEmail;
  db.emails[newEmail] = chatId;
  await saveChannelDb(messageId, db);

  const msgText = 
`✨ *Aapka Naya Temp Email:*

\`${newEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Ise Meta AI ya Instagram me enter karein. OTP aate hi bot yahan **instant deliver** karega.`;

  const inlineBtns = [
    [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }],
    [{ text: "✏️ Custom Username", callback_data: "btn_custom" }]
  ];

  await sendMsg(chatId, msgText, null, { inline_keyboard: inlineBtns });
}

// 2. Custom Username Flow
async function handleCustomNamePrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_custom_name");
  await sendMsg(
    chatId, 
    `✏️ *Custom Email Username*\n\nApna pasandida username chat me type karke bhejein:\n\n_Udaharan:_ \`raj.sharma88\` ya \`angel_priya\`\n\n*(Sirf a-z, 0-9, dot, underscore allowed hain)*`
  );
}

async function processCustomEmailCreation(chatId, inputName, workerOrigin) {
  const cleanPrefix = inputName.replace(/@.*$/, "").toLowerCase().trim();

  // Validate characters
  if (!/^[a-z0-9._-]{3,30}$/.test(cleanPrefix)) {
    await sendMsg(chatId, "⚠️ *Invalid Format:* Username 3 se 30 characters ka hona chahiye aur sirf letters, numbers, dot, ya hyphen use karein.");
    return;
  }

  const customEmail = `${cleanPrefix}@${DOMAIN}`;
  const { messageId, db } = await getChannelDb();

  // Security Check: Kya ye email pehle se kisi aur ke paas hai?
  if (db.emails && db.emails[customEmail] && db.emails[customEmail] !== chatId) {
    await sendMsg(chatId, `⛔ *Already Claimed:* \`${customEmail}\` pehle se kisi aur user ke pass registered hai. Kripya koi dusra naam try karein.`);
    return;
  }

  db.users[chatId] = customEmail;
  db.emails[customEmail] = chatId;
  await saveChannelDb(messageId, db);

  const msgText = 
`🎯 *Custom Email Activated!*

\`${customEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Ab is email ko Meta AI / Instagram me dalein aur yahan OTP receive karein.`;

  const inlineBtns = [
    [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }]
  ];

  await sendMsg(chatId, msgText, null, { inline_keyboard: inlineBtns });
}

// 3. Check Current OTP
async function checkCurrentOtp(chatId, workerOrigin) {
  const { db } = await getChannelDb();
  const currentEmail = db.users ? db.users[chatId] : null;

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Aapke paas koi active email nahi hai. *⚡ Random Email* ya *✏️ Custom Email* par click karein.");
    return;
  }

  const record = db.inboxes ? db.inboxes[currentEmail] : null;

  if (record && (record.otp || record.lnk)) {
    await deliverOtpBox(chatId, record.otp, currentEmail, record.lnk, record.hist || [], record.ptok, workerOrigin);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nMeta/Instagram app me jaakar code send karein, fir yahan refresh karein.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh Status", callback_data: "btn_check_otp" }]] }
    );
  }
}

// 4. Admin Only: Old Email Hub
async function handleOldHubPrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_old_email");
  await sendMsg(
    chatId, 
    `🔑 *Owner Hub - Purana Email Access*\n\nJis purane email ka OTP dekhna hai, woh yahan bhejein:\n\n_Example:_\n\`priya.sharma123@${DOMAIN}\``
  );
}

async function linkAndCheckOldEmail(chatId, inputEmail, workerOrigin) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Invalid Domain! Email \`@${DOMAIN}\` par hi hona chahiye.`);
    return;
  }

  const { messageId, db } = await getChannelDb();

  db.users[chatId] = cleanEmail;
  db.emails[cleanEmail] = chatId;
  await saveChannelDb(messageId, db);

  const record = db.inboxes ? db.inboxes[cleanEmail] : null;

  if (record && (record.otp || record.lnk)) {
    await sendMsg(chatId, `✅ *Owner Verified:* Purana email link ho gaya! Active OTP card:`);
    await deliverOtpBox(chatId, record.otp, cleanEmail, record.lnk, record.hist || [], record.ptok, workerOrigin);
  } else {
    await sendMsg(
      chatId, 
      `✅ *Owner Connected:* \`${cleanEmail}\` bind ho gaya hai.\n\nAb app me 'Resend OTP' karein, OTP seedhe aapko milega.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// 5. Deliver OTP Card with History & Web Preview
async function deliverOtpBox(chatId, otp, toEmail, link, history = [], previewToken = "", workerOrigin = "") {
  let historySection = "";
  if (history.length > 1) {
    historySection = `\n📜 *Pichle OTPs:*\n` + history.map(h => `• \`${h.otp}\` _(${h.time})_`).join("\n");
  }

  let text = "";
  if (otp) {
    text = 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *META VERIFICATION OTP*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${otp}\`

_(Tap code to copy)_
─────────────────────
📧 *Email:* \`${toEmail}\`${historySection}`;
  } else {
    text = 
`📩 *Verification Link Received!*
─────────────────────
📧 *Email:* \`${toEmail}\``;
  }

  let inlineBtns = [];
  if (link) {
    inlineBtns.push([{ text: "🌐 Open Verification Link", url: link }]);
  }

  // Full HTML Web Preview Button
  if (previewToken && workerOrigin) {
    const viewUrl = `${workerOrigin}/view?mail=${encodeURIComponent(toEmail)}&token=${previewToken}`;
    inlineBtns.push([{ text: "📄 View Full HTML Email", url: viewUrl }]);
  }

  inlineBtns.push([
    { text: "🔄 Refresh Status", callback_data: "btn_check_otp" },
    { text: "⚡ New Random", callback_data: "btn_gen" }
  ]);

  if (chatId === PRIMARY_OWNER_ID) {
    inlineBtns.push([{ text: "🔑 Link Another Old Email", callback_data: "btn_old_hub" }]);
  }

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM SENDER UTILITY ---
async function sendMsg(chatId, text, replyKeyboard = null, inlineKeyboard = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };

  if (replyKeyboard) payload.reply_markup = replyKeyboard;
  if (inlineKeyboard) payload.reply_markup = inlineKeyboard;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}
