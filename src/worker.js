/**
 * Professional Meta AI & Instagram Temp Mail Engine (100% Button-Driven)
 * Features:
 * - Touch-Based Admin Dashboard (Add/Del Admin, List, Broadcast via Buttons)
 * - Strict 6-Digit Meta/Instagram OTP Filter (No more tracking ID bugs)
 * - R2 Storage Integration for Full HTML Email Viewer
 * - Strict Role Protection (Old Email Hub only for Owner/Admins)
 * - Last 3 OTPs History & Anti-Spam Cooldown
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818"; // Main Super Owner
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// Strict Whitelist Senders (Sirf Meta Platforms)
const ALLOWED_SENDERS = [
  "facebookmail.com",
  "instagram.com",
  "mail.instagram.com",
  "meta.com"
];

let USER_STATE = new Map();
let USER_COOLDOWN = new Map();

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

    // [R2 Storage HTML Web Viewer]
    if (url.pathname === "/view") {
      const emailKey = (url.searchParams.get("id") || "").toLowerCase().trim();
      if (!emailKey || !env.MAIL_BUCKET) {
        return new Response("<h3>⚠️ Preview expired or storage not found.</h3>", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      try {
        const object = await env.MAIL_BUCKET.get(`html_${emailKey}`);
        if (!object) {
          return new Response("<h3>⚠️ Email content expired or removed.</h3>", {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
        const html = await object.text();
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      } catch (e) {
        return new Response("<h3>Server Error loading preview.</h3>", { status: 500 });
      }
    }

    if (request.method !== "POST") return new Response("Worker Running OK", { status: 200 });

    try {
      const update = await request.json();
      const workerOrigin = `${url.protocol}//${url.host}`;
      const { messageId, db } = await getChannelDb();

      // ========================================================
      // --- INLINE BUTTON CALLBACK HANDLER ---
      // ========================================================
      if (update.callback_query) {
        const q = update.callback_query;
        const chatId = q.message.chat.id.toString();
        const msgId = q.message.message_id;
        const data = q.data;
        const isOwner = (chatId === PRIMARY_OWNER_ID);
        const userIsAdmin = checkIsAdmin(chatId, db);

        // --- Standard Feature Buttons ---
        if (data === "btn_gen") {
          await handleEmailGenRequest(chatId, workerOrigin, db, messageId);
        } else if (data === "btn_custom") {
          await handleCustomNamePrompt(chatId);
        } else if (data === "btn_check_otp") {
          await checkCurrentOtp(chatId, workerOrigin, db);
        } else if (data === "btn_old_hub") {
          if (userIsAdmin) {
            await handleOldHubPrompt(chatId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Purana email access sirf Admins ke liye hai.");
          }
        }

        // --- Admin Dashboard Buttons ---
        else if (data === "adm_menu") {
          if (userIsAdmin) {
            await openAdminDashboard(chatId, msgId, isOwner, db);
          }
        } else if (data === "adm_add") {
          if (isOwner) {
            USER_STATE.set(chatId, "awaiting_add_admin");
            await editMsg(chatId, msgId, "➕ *Add Admin:*\n\nApne dost ki Telegram *Chat ID* chat me bhejein:\n\n_(Dost bot ko /id bhejkar apni ID jaan sakta hai)_", [
              [{ text: "🔙 Cancel", callback_data: "adm_menu" }]
            ]);
          } else {
            await sendMsg(chatId, "⛔ Sirf Main Owner naye Admin add kar sakta hai.");
          }
        } else if (data === "adm_del_list") {
          if (isOwner) {
            await showRemoveAdminButtons(chatId, msgId, db);
          } else {
            await sendMsg(chatId, "⛔ Sirf Main Owner Admin remove kar sakta hai.");
          }
        } else if (data.startsWith("adm_remove_")) {
          if (isOwner) {
            const targetId = data.replace("adm_remove_", "");
            db.admins = (db.admins || []).filter(id => id !== targetId);
            await saveChannelDb(messageId, db);
            await sendMsg(chatId, `❌ Chat ID \`${targetId}\` ko Admin se hata diya gaya.`);
            await openAdminDashboard(chatId, msgId, isOwner, db);
          }
        } else if (data === "adm_list") {
          if (userIsAdmin) {
            const list = (db.admins && db.admins.length > 0)
              ? db.admins.map((id, i) => `${i + 1}. \`${id}\``).join("\n")
              : "_Koi Sub-Admin nahi hai._";
            await editMsg(chatId, msgId, `🛡️ *Authorized Admins List:*\n\n👑 *Owner:* \`${PRIMARY_OWNER_ID}\`\n\n${list}`, [
              [{ text: "🔙 Back to Dashboard", callback_data: "adm_menu" }]
            ]);
          }
        } else if (data === "adm_stats") {
          if (userIsAdmin) {
            const userCount = Object.keys(db.users || {}).length;
            const inboxCount = Object.keys(db.inboxes || {}).length;
            const adminCount = (db.admins || []).length;
            await editMsg(chatId, msgId, `📊 *Live System Stats:*\n\n👥 Total Linked Users: *${userCount}*\n📬 Active Inboxes Cached: *${inboxCount}*\n🛡️ Total Sub-Admins: *${adminCount}*\n🌐 Active Domain: \`${DOMAIN}\``, [
              [{ text: "🔙 Back to Dashboard", callback_data: "adm_menu" }]
            ]);
          }
        } else if (data === "adm_broadcast") {
          if (isOwner) {
            USER_STATE.set(chatId, "awaiting_broadcast_text");
            await editMsg(chatId, msgId, "📢 *Broadcast Message:*\n\nJo message sabhi bot users ko bhejni hai, use yahan chat me type karke send karein:", [
              [{ text: "🔙 Cancel", callback_data: "adm_menu" }]
            ]);
          }
        } else if (data === "adm_close") {
          await deleteMsg(chatId, msgId);
        }

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: q.id
        }), { headers: { "Content-Type": "application/json" } });
      }

      // ========================================================
      // --- CHAT MESSAGES & BUTTON ACTIONS ---
      // ========================================================
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();
        const isOwner = (chatId === PRIMARY_OWNER_ID);
        const userIsAdmin = checkIsAdmin(chatId, db);

        // Fast Action: /id ya "🆔 My Chat ID" button
        if (text === "/id" || text === "🆔 My Chat ID") {
          await sendMsg(chatId, `👤 *Aapki Telegram Chat ID Hai:*\n\n\`${chatId}\`\n\n_(Tap karke copy karein)_`);
          return new Response("OK");
        }

        // State 1: Adding Admin via Button
        if (USER_STATE.get(chatId) === "awaiting_add_admin") {
          USER_STATE.delete(chatId);
          const targetId = text.trim();
          if (!/^\d+$/.test(targetId)) {
            await sendMsg(chatId, "⚠️ Galat ID format! Sirf numbers hone chahiye.");
            return new Response("OK");
          }
          if (!db.admins) db.admins = [];
          if (!db.admins.includes(targetId)) {
            db.admins.push(targetId);
            await saveChannelDb(messageId, db);
            await sendMsg(chatId, `✅ Chat ID \`${targetId}\` ko Admin bana diya gaya!`);
            await sendMsg(targetId, "🎉 *Badhaai Ho!* Aapko is bot ka Admin bana diya gaya hai.");
          } else {
            await sendMsg(chatId, `⚠️ Yeh ID \`${targetId}\` pehle se Admin hai.`);
          }
          return new Response("OK");
        }

        // State 2: Broadcast via Button
        if (USER_STATE.get(chatId) === "awaiting_broadcast_text") {
          USER_STATE.delete(chatId);
          const usersList = Object.keys(db.users || {});
          let sentCount = 0;
          await sendMsg(chatId, `⏳ Broadcast shuru ho raha hai (*${usersList.length} users* ko)...`);
          for (const uid of usersList) {
            try {
              await sendMsg(uid, `📢 *Announcement:*\n\n${text}`);
              sentCount++;
            } catch (e) {}
          }
          await sendMsg(chatId, `✅ Broadcast complete! Total *${sentCount}* users ko message deliver hua.`);
          return new Response("OK");
        }

        // State 3: Custom Username Creation
        if (USER_STATE.get(chatId) === "awaiting_custom_name") {
          USER_STATE.delete(chatId);
          await processCustomEmailCreation(chatId, text, workerOrigin, db, messageId);
          return new Response("OK");
        }

        // State 4: Old Email Binding (Only Admin)
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          if (userIsAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin, db, messageId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Purana email access karne ki anumati aapko nahi hai.");
          }
          return new Response("OK");
        }

        // Direct Email Paste Check
        if (text.toLowerCase().includes(`@${DOMAIN}`)) {
          if (userIsAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin, db, messageId);
          } else {
            await sendMsg(chatId, "⚠️ Aap purana email yahan link nahi kar sakte. Naya email lene ke liye *⚡ Random Email* ya *✏️ Custom Email* button dabayein.");
          }
          return new Response("OK");
        }

        // --- Bottom Keyboard Menu Actions ---
        if (text === "/start") {
          USER_STATE.delete(chatId);
          const replyKeyboard = getReplyKeyboard(userIsAdmin);
          const roleBadge = isOwner ? "👑 *Owner Mode*" : (userIsAdmin ? "🛡️ *Admin Mode*" : "👤 *User Mode*");

          await sendMsg(chatId, 
            `👋 *Meta AI & Instagram Temp Mail Engine*\n\nStatus: ${roleBadge}\n\nNiche diye gaye buttons se instant email banayein ya OTP check karein:`, 
            replyKeyboard
          );
        }
        else if (text === "⚡ Random Email" || text === "⚡ Generate Email" || text === "/gen") {
          await handleEmailGenRequest(chatId, workerOrigin, db, messageId);
        }
        else if (text === "✏️ Custom Email" || text === "/custom") {
          await handleCustomNamePrompt(chatId);
        }
        else if (text === "📬 Check OTP" || text === "/otp") {
          await checkCurrentOtp(chatId, workerOrigin, db);
        }
        else if (text === "🔑 Old Email Hub" || text === "/old") {
          if (userIsAdmin) {
            await handleOldHubPrompt(chatId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Yeh button sirf Authorized Admins ke liye hai.");
          }
        }
        else if (text === "⚙️ Admin Dashboard" || text === "/admin") {
          if (userIsAdmin) {
            await openAdminDashboard(chatId, null, isOwner, db);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied.*");
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

      // 1. Strict Sender Verification (Only Meta Platforms Allowed)
      const isAllowedSender = ALLOWED_SENDERS.some(senderDomain => {
        return rawFrom.endsWith(`@${senderDomain}`) || rawFrom.includes(`@${senderDomain}>`) || rawFrom.includes(senderDomain);
      });

      if (!isAllowedSender) return; // Non-Meta mails dropped immediately

      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";

      // 2. Strict 6-Digit OTP Extraction
      const extractedOtp = extractMetaAiOtp(subject, raw);
      const verifyLink = extractGenuineVerificationLink(raw);

      if (!extractedOtp && !verifyLink) return;

      const { messageId, db } = await getChannelDb();
      const boundUser = db.emails ? db.emails[toEmail] : null;

      // 3. Strict Deduplication Lock
      const currentToken = extractedOtp || verifyLink;
      const prevRecord = db.inboxes ? db.inboxes[toEmail] : null;
      const now = Date.now();

      if (prevRecord && prevRecord.tok === currentToken && (now - (prevRecord.ts || 0) < 300000)) {
        return;
      }

      // 4. Update History (Last 3 OTPs)
      let history = (prevRecord && Array.isArray(prevRecord.hist)) ? prevRecord.hist : [];
      if (extractedOtp) {
        history.unshift({
          otp: extractedOtp,
          time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit' })
        });
        if (history.length > 3) history = history.slice(0, 3);
      }

      // 5. Store Full HTML in R2 Storage
      const previewKey = `${toEmail.replace(/[^a-z0-9]/g, "_")}`;
      if (env.MAIL_BUCKET) {
        await env.MAIL_BUCKET.put(`html_${previewKey}`, raw, {
          httpMetadata: { contentType: "text/html; charset=utf-8" }
        });
      }

      // 6. Compact DB Record Save
      if (!db.inboxes) db.inboxes = {};
      db.inboxes[toEmail] = {
        otp: extractedOtp,
        lnk: verifyLink,
        tok: currentToken,
        ts: now,
        hist: history,
        hasHtml: true
      };

      await saveChannelDb(messageId, db);

      // 7. Deliver directly to Bound User
      if (boundUser) {
        const workerOrigin = `https://${DOMAIN}`;
        const userIsAdmin = checkIsAdmin(boundUser, db);
        await deliverOtpBox(boundUser, extractedOtp, toEmail, verifyLink, history, previewKey, workerOrigin, userIsAdmin);
      }

      // 8. DB Channel Audit Notification
      if (DB_CHANNEL_ID) {
        await sendMsg(
          DB_CHANNEL_ID, 
          `🔔 *[META OTP CAPTURED]*\n📧 Email: \`${toEmail}\`\n👤 Recipient: \`${boundUser || "Unbound"}\`\n🔑 OTP: \`${extractedOtp || "Link Only"}\``
        );
      }

    } catch (err) {
      console.error("Email Parsing Error:", err);
    }
  }
};

// --- OTP & LINK EXTRACTORS ---
function extractMetaAiOtp(subject, rawBody) {
  let body = rawBody
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Subject line check (Highest accuracy for 6 digits)
  if (subject) {
    const subjMatch = subject.match(/\b(\d{3})\s?(\d{3})\b/) || subject.match(/\b(\d{6})\b/);
    if (subjMatch) {
      const code = subjMatch[0].replace(/\s+/g, "");
      if (code.length === 6 && !code.startsWith("000000")) return code;
    }
  }

  // Pre-Clean Styles, Hex codes
  let cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/#[0-9a-fA-F]{6}\b/g, " ")
    .replace(/#[0-9a-fA-F]{3}\b/g, " ");

  // HTML container tags
  const tagMatches = [...cleanBody.matchAll(/>\s*([0-9]{3}\s?[0-9]{3}|[0-9]{6})\s*</g)];
  for (const m of tagMatches) {
    const code = m[1].replace(/\s+/g, "");
    if (code.length === 6 && !code.startsWith("000000")) return code;
  }

  // Contextual pattern match
  let plain = cleanBody.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
  const patterns = [
    /(?:security code|confirmation code|código|verification code|login code)[\s:=–\-#]{1,25}(\b\d{3}\s?\d{3}\b|\b\d{6}\b)/i,
    /(\b\d{3}\s?\d{3}\b|\b\d{6}\b)\s*(?:is your|was requested|to verify your|aapka code)/i,
    /enter\s*(?:the|this)?\s*code\s*[:\s-]{1,25}(\b\d{3}\s?\d{3}\b|\b\d{6}\b)/i
  ];

  for (const pat of patterns) {
    const match = plain.match(pat);
    if (match) {
      const code = (match[1] || match[0]).replace(/\D/g, "");
      if (code.length === 6 && !code.startsWith("000000")) return code;
    }
  }

  return null;
}

function extractGenuineVerificationLink(raw) {
  const urls = raw.match(/https?:\/\/[^\s<>"{}|\\^`']+/gi) || [];
  for (let u of urls) {
    let cleanUrl = u.replace(/&amp;/g, "&");
    if (/meta\.com|instagram\.com|facebook\.com/i.test(cleanUrl)) {
      if (/collect|pixel|beacon|logging|tr\?|1x1|static|fbcdn|cdn|help\.|terms/i.test(cleanUrl)) continue;
      if (/confirm|verify|action|checkpoint|\/c\/|token=/i.test(cleanUrl)) return cleanUrl;
    }
  }
  return null;
}

// --- PERMISSIONS HELPER ---
function checkIsAdmin(chatId, db) {
  if (chatId === PRIMARY_OWNER_ID) return true;
  if (db && Array.isArray(db.admins) && db.admins.includes(chatId)) return true;
  return false;
}

function getReplyKeyboard(isAdmin) {
  if (isAdmin) {
    return {
      keyboard: [
        [{ text: "⚡ Random Email" }, { text: "✏️ Custom Email" }],
        [{ text: "📬 Check OTP" }, { text: "🔑 Old Email Hub" }],
        [{ text: "⚙️ Admin Dashboard" }, { text: "🆔 My Chat ID" }]
      ],
      resize_keyboard: true
    };
  }
  return {
    keyboard: [
      [{ text: "⚡ Random Email" }, { text: "✏️ Custom Email" }],
      [{ text: "📬 Check OTP" }, { text: "🆔 My Chat ID" }]
    ],
    resize_keyboard: true
  };
}

// --- TELEGRAM CHANNEL COMPACT DATABASE ---
async function getChannelDb() {
  const defaultDb = { admins: [], users: {}, emails: {}, inboxes: {} };

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${DB_CHANNEL_ID}`);
    const data = await res.json();

    if (data.ok && data.result.pinned_message) {
      try {
        const parsed = JSON.parse(data.result.pinned_message.text);
        return { 
          messageId: data.result.pinned_message.message_id, 
          db: { 
            admins: parsed.admins || [], 
            users: parsed.users || {}, 
            emails: parsed.emails || {}, 
            inboxes: parsed.inboxes || {} 
          } 
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

  const inboxKeys = Object.keys(db.inboxes || {});
  if (inboxKeys.length > 15) {
    const removeCount = inboxKeys.length - 15;
    for (let i = 0; i < removeCount; i++) delete db.inboxes[inboxKeys[i]];
  }

  const emailKeys = Object.keys(db.emails || {});
  if (emailKeys.length > 30) {
    const removeCount = emailKeys.length - 30;
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

// --- ADMIN DASHBOARD UI CONTROLLER ---
async function openAdminDashboard(chatId, msgId = null, isOwner = false, db = {}) {
  let inlineBtns = [];

  if (isOwner) {
    inlineBtns.push([
      { text: "➕ Add Admin", callback_data: "adm_add" },
      { text: "➖ Remove Admin", callback_data: "adm_del_list" }
    ]);
    inlineBtns.push([
      { text: "📢 Send Broadcast", callback_data: "adm_broadcast" }
    ]);
  }

  inlineBtns.push([
    { text: "📋 View Admins", callback_data: "adm_list" },
    { text: "📊 Bot Stats", callback_data: "adm_stats" }
  ]);
  inlineBtns.push([
    { text: "❌ Close Panel", callback_data: "adm_close" }
  ]);

  const panelText = `⚙️ *Admin Control Dashboard*\n\nOwner: \`${PRIMARY_OWNER_ID}\`\n\nNiche diye gaye buttons se bot manage karein:`;

  if (msgId) {
    await editMsg(chatId, msgId, panelText, inlineBtns);
  } else {
    await sendMsg(chatId, panelText, null, { inline_keyboard: inlineBtns });
  }
}

async function showRemoveAdminButtons(chatId, msgId, db) {
  const admins = db.admins || [];
  if (admins.length === 0) {
    await editMsg(chatId, msgId, "⚠️ Koi sub-admin add nahi hai jise remove kiya ja sake.", [
      [{ text: "🔙 Back", callback_data: "adm_menu" }]
    ]);
    return;
  }

  let buttons = admins.map(id => ([{ text: `❌ Remove ${id}`, callback_data: `adm_remove_${id}` }]));
  buttons.push([{ text: "🔙 Cancel", callback_data: "adm_menu" }]);

  await editMsg(chatId, msgId, "🗑️ *Kis Admin Ko Remove Karna Hai?*\nNiche ID par click karein:", buttons);
}

// --- USER GENERATION & OTP HANDLERS ---
async function handleEmailGenRequest(chatId, workerOrigin, db, messageId) {
  const lastCall = USER_COOLDOWN.get(chatId) || 0;
  const now = Date.now();
  if (now - lastCall < 15000) {
    const remaining = Math.ceil((15000 - (now - lastCall)) / 1000);
    await sendMsg(chatId, `⏳ *Cooldown:* Kripya *${remaining} second* rukiye.`);
    return;
  }
  USER_COOLDOWN.set(chatId, now);

  const first = FEMALE_NAMES[(Math.random() * FEMALE_NAMES.length) | 0];
  const last = SURNAMES[(Math.random() * SURNAMES.length) | 0];
  const num = ((Math.random() * 900) | 0) + 100;
  const newEmail = `${first}.${last}${num}@${DOMAIN}`.toLowerCase();

  db.users[chatId] = newEmail;
  db.emails[newEmail] = chatId;
  await saveChannelDb(messageId, db);

  const userIsAdmin = checkIsAdmin(chatId, db);
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

  if (userIsAdmin) {
    inlineBtns.push([{ text: "🔑 Link Old Email (Admin)", callback_data: "btn_old_hub" }]);
  }

  await sendMsg(chatId, msgText, null, { inline_keyboard: inlineBtns });
}

async function handleCustomNamePrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_custom_name");
  await sendMsg(
    chatId, 
    `✏️ *Custom Email Username*\n\nApna username chat me likhkar bhejein:\n\n_Example:_ \`karan.raj99\` ya \`sneha_vip\`\n\n*(Sirf a-z, 0-9, dot, underscore allowed hain)*`
  );
}

async function processCustomEmailCreation(chatId, inputName, workerOrigin, db, messageId) {
  const cleanPrefix = inputName.replace(/@.*$/, "").toLowerCase().trim();

  if (!/^[a-z0-9._-]{3,30}$/.test(cleanPrefix)) {
    await sendMsg(chatId, "⚠️ *Invalid Format:* Username 3-30 letters ka hona chahiye aur special characters allowed nahi hain.");
    return;
  }

  const customEmail = `${cleanPrefix}@${DOMAIN}`;

  if (db.emails && db.emails[customEmail] && db.emails[customEmail] !== chatId) {
    await sendMsg(chatId, `⛔ *Already Taken:* \`${customEmail}\` kisi aur user ke pass registered hai. Koi dusra naam chunein.`);
    return;
  }

  db.users[chatId] = customEmail;
  db.emails[customEmail] = chatId;
  await saveChannelDb(messageId, db);

  const userIsAdmin = checkIsAdmin(chatId, db);
  const msgText = 
`🎯 *Custom Email Activated!*

\`${customEmail}\`

_(Tap karke copy karein)_
━━━━━━━━━━━━━━━━━━━━
Ab is email ko Meta AI ya Instagram me enter karein.`;

  const inlineBtns = [
    [{ text: "🔄 Refresh / Check OTP", callback_data: "btn_check_otp" }]
  ];

  if (userIsAdmin) {
    inlineBtns.push([{ text: "🔑 Link Old Email (Admin)", callback_data: "btn_old_hub" }]);
  }

  await sendMsg(chatId, msgText, null, { inline_keyboard: inlineBtns });
}

async function checkCurrentOtp(chatId, workerOrigin, db) {
  const currentEmail = db.users ? db.users[chatId] : null;

  if (!currentEmail) {
    await sendMsg(chatId, "⚠️ Pehle *⚡ Random Email* ya *✏️ Custom Email* button dabayein.");
    return;
  }

  const record = db.inboxes ? db.inboxes[currentEmail] : null;
  const userIsAdmin = checkIsAdmin(chatId, db);

  if (record && (record.otp || record.lnk)) {
    const previewKey = currentEmail.replace(/[^a-z0-9]/g, "_");
    await deliverOtpBox(chatId, record.otp, currentEmail, record.lnk, record.hist || [], previewKey, workerOrigin, userIsAdmin);
  } else {
    await sendMsg(
      chatId, 
      `⏳ *OTP Ka Intezaar Hai...*\n\nActive Email: \`${currentEmail}\`\n\nMeta/Instagram app se OTP send karein, fir yahan refresh karein.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Refresh Status", callback_data: "btn_check_otp" }]] }
    );
  }
}

async function handleOldHubPrompt(chatId) {
  USER_STATE.set(chatId, "awaiting_old_email");
  await sendMsg(
    chatId, 
    `🔑 *Admin Recovery Hub*\n\nJis purane email ka OTP dekhna hai, woh address yahan bhejein:\n\n_Example:_ \`muskan.sharma991@${DOMAIN}\``
  );
}

async function linkAndCheckOldEmail(chatId, inputEmail, workerOrigin, db, messageId) {
  const cleanEmail = inputEmail.toLowerCase().trim();

  if (!cleanEmail.endsWith(`@${DOMAIN}`)) {
    await sendMsg(chatId, `⚠️ Invalid Domain! Email \`@${DOMAIN}\` par khatam hona chahiye.`);
    return;
  }

  db.users[chatId] = cleanEmail;
  db.emails[cleanEmail] = chatId;
  await saveChannelDb(messageId, db);

  const record = db.inboxes ? db.inboxes[cleanEmail] : null;
  const userIsAdmin = checkIsAdmin(chatId, db);

  if (record && (record.otp || record.lnk)) {
    const previewKey = cleanEmail.replace(/[^a-z0-9]/g, "_");
    await sendMsg(chatId, `✅ *Email Re-Linked (Admin Verified)!* Active OTP:`);
    await deliverOtpBox(chatId, record.otp, cleanEmail, record.lnk, record.hist || [], previewKey, workerOrigin, userIsAdmin);
  } else {
    await sendMsg(
      chatId, 
      `✅ *Email Successfully Bound!*\n\nTarget Email: \`${cleanEmail}\`\n\nAb app me jakar 'Resend OTP' karein, OTP turant yahan receive hoga.`,
      null,
      { inline_keyboard: [[{ text: "🔄 Check OTP", callback_data: "btn_check_otp" }]] }
    );
  }
}

// --- SECURE OTP DELIVERY CARD ---
async function deliverOtpBox(chatId, otp, toEmail, link, history = [], previewKey = "", workerOrigin = "", isAdmin = false) {
  let historySection = "";
  if (history.length > 1) {
    historySection = `\n📜 *Pichle OTPs:*\n` + history.map(h => `• \`${h.otp}\` _(${h.time})_`).join("\n");
  }

  let text = otp ? 
`┏━━━━━━━━━━━━━━━━━━━━━┓
  🔐 *META VERIFICATION OTP*
┗━━━━━━━━━━━━━━━━━━━━━┛

\`${otp}\`

_(Tap code to copy)_
─────────────────────
📧 *Email:* \`${toEmail}\`${historySection}` : 
`📩 *Verification Link Received!*
─────────────────────
📧 *Email:* \`${toEmail}\``;

  let inlineBtns = [];
  if (link) {
    inlineBtns.push([{ text: "🌐 Open Verification Link", url: link }]);
  }

  if (previewKey && workerOrigin) {
    const viewUrl = `${workerOrigin}/view?id=${previewKey}`;
    inlineBtns.push([{ text: "📄 View Full HTML Email", url: viewUrl }]);
  }

  inlineBtns.push([
    { text: "🔄 Refresh Status", callback_data: "btn_check_otp" },
    { text: "⚡ Generate New", callback_data: "btn_gen" }
  ]);

  if (isAdmin) {
    inlineBtns.push([{ text: "🔑 Link Another Email (Admin)", callback_data: "btn_old_hub" }]);
  }

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM SENDER UTILITIES ---
async function sendMsg(chatId, text, replyKeyboard = null, inlineKeyboard = null) {
  const payload = { chat_id: chatId, text: text, parse_mode: "Markdown" };
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

async function editMsg(chatId, messageId, text, inlineKeyboard) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: inlineKeyboard }
      })
    });
  } catch (e) {}
}

async function deleteMsg(chatId, messageId) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
  } catch (e) {}
}
