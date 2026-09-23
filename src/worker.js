/**
 * Professional Meta AI & Instagram Temp Mail Engine
 * Features:
 * - Anti-Ghost OTP Fix (Strict 6-digit Meta pattern, ignores internal tracking IDs)
 * - Multi-Admin Management System (/addadmin, /deladmin, /admins)
 * - Strict Domain Filter: Meta, Facebook, Instagram only
 * - Role-Based Access: Old Email Hub strictly for Owner & Admins
 * - Cloudflare R2 Storage for Full HTML Email Viewer
 * - Anti-Crash Compact Storage Engine
 */

const BOT_TOKEN = "8943075720:AAE4URhun0DS0yc38zUsHr1J2tGO3Kih3cA";
const PRIMARY_OWNER_ID = "8452322818"; // Super Owner ID
const DB_CHANNEL_ID = "-1004474665956";
const DOMAIN = "vibepulsemedia.online";

// Official Whitelist Senders (Strict Filter)
const ALLOWED_SENDERS = [
  "facebookmail.com",
  "instagram.com",
  "mail.instagram.com",
  "meta.com",
  "support.facebook.com"
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
  // --- 1. HTTP REQUEST / TELEGRAM WEBHOOK & R2 VIEWER ---
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

      // --- INLINE CALLBACK BUTTONS ---
      if (update.callback_query) {
        const q = update.callback_query;
        const chatId = q.message.chat.id.toString();
        const data = q.data;
        const userIsAdmin = checkIsAdmin(chatId, db);

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
            await sendMsg(chatId, "⛔ *Access Denied:* Purana email access karne ki anumati sirf Admins ko hai.");
          }
        }

        return new Response(JSON.stringify({
          method: "answerCallbackQuery",
          callback_query_id: q.id
        }), { headers: { "Content-Type": "application/json" } });
      }

      // --- CHAT MESSAGES & ADMIN COMMANDS ---
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = (msg.text || "").trim();
        const isOwner = (chatId === PRIMARY_OWNER_ID);
        const userIsAdmin = checkIsAdmin(chatId, db);

        // State 1: Awaiting Custom Email Username
        if (USER_STATE.get(chatId) === "awaiting_custom_name") {
          USER_STATE.delete(chatId);
          await processCustomEmailCreation(chatId, text, workerOrigin, db, messageId);
          return new Response("OK");
        }

        // State 2: Awaiting Old Email (Only Owner/Admins)
        if (USER_STATE.get(chatId) === "awaiting_old_email") {
          USER_STATE.delete(chatId);
          if (userIsAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin, db, messageId);
          } else {
            await sendMsg(chatId, "⛔ *Access Denied:* Aap purane emails bind nahi kar sakte.");
          }
          return new Response("OK");
        }

        // Direct Email Paste Validation
        if (text.toLowerCase().includes(`@${DOMAIN}`)) {
          if (userIsAdmin) {
            await linkAndCheckOldEmail(chatId, text, workerOrigin, db, messageId);
          } else {
            await sendMsg(chatId, "⚠️ Aap purana email yahan link nahi kar sakte. Naya email lene ke liye *⚡ Random Email* ya *✏️ Custom Email* chunein.");
          }
          return new Response("OK");
        }

        // --- ADMIN COMMAND: /addadmin <chat_id> ---
        if (text.startsWith("/addadmin")) {
          if (!isOwner) {
            await sendMsg(chatId, "⛔ Sirf Main Owner naye Admins add kar sakta hai.");
            return new Response("OK");
          }
          const targetId = text.split(" ")[1]?.trim();
          if (!targetId || isNaN(targetId)) {
            await sendMsg(chatId, "⚠️ Format galat hai. Aise likhein:\n`/addadmin 123456789`");
            return new Response("OK");
          }
          if (!db.admins) db.admins = [];
          if (!db.admins.includes(targetId)) {
            db.admins.push(targetId);
            await saveChannelDb(messageId, db);
            await sendMsg(chatId, `✅ Chat ID \`${targetId}\` ko Admin bana diya gaya hai.`);
            await sendMsg(targetId, "🎉 *Aapko is bot ka Admin bana diya gaya hai!* Ab aap purane emails ka OTP access kar sakte hain.");
          } else {
            await sendMsg(chatId, `⚠️ Chat ID \`${targetId}\` pehle se Admin hai.`);
          }
          return new Response("OK");
        }

        // --- ADMIN COMMAND: /deladmin <chat_id> ---
        if (text.startsWith("/deladmin")) {
          if (!isOwner) {
            await sendMsg(chatId, "⛔ Sirf Main Owner hi Admin hata sakta hai.");
            return new Response("OK");
          }
          const targetId = text.split(" ")[1]?.trim();
          if (!targetId) {
            await sendMsg(chatId, "⚠️ Format galat hai. Aise likhein:\n`/deladmin 123456789`");
            return new Response("OK");
          }
          if (db.admins && db.admins.includes(targetId)) {
            db.admins = db.admins.filter(id => id !== targetId);
            await saveChannelDb(messageId, db);
            await sendMsg(chatId, `❌ Chat ID \`${targetId}\` ko Admin se hata diya gaya.`);
          } else {
            await sendMsg(chatId, "⚠️ Yeh ID Admin list me nahi mili.");
          }
          return new Response("OK");
        }

        // --- ADMIN COMMAND: /admins ---
        if (text === "/admins" || text === "/adminlist") {
          if (!userIsAdmin) {
            await sendMsg(chatId, "⛔ Permission Denied.");
            return new Response("OK");
          }
          const list = (db.admins || []).map((id, i) => `${i + 1}. \`${id}\``).join("\n") || "Koi sub-admin nahi hai.";
          await sendMsg(chatId, `👑 *Owner:* \`${PRIMARY_OWNER_ID}\`\n\n🛡️ *Authorized Admins:*\n${list}`);
          return new Response("OK");
        }

        // --- MAIN MENU NAVIGATION ---
        if (text === "/start") {
          USER_STATE.delete(chatId);

          let keyboard = [
            [{ text: "⚡ Random Email" }, { text: "✏️ Custom Email" }],
            [{ text: "📬 Check OTP" }]
          ];

          if (userIsAdmin) {
            keyboard[1].push({ text: "🔑 Old Email Hub" });
          }

          const roleBadge = isOwner ? "👑 *Owner Mode*" : (userIsAdmin ? "🛡️ *Admin Mode*" : "👤 *User Mode*");

          await sendMsg(chatId, 
            `👋 *Meta AI & Instagram Temp Mail Engine*\n\nStatus: ${roleBadge}\n\nMeta AI aur Instagram ke genuine OTPs yahan turant deliver honge. Apna email generate karein:`, 
            { keyboard: keyboard, resize_keyboard: true }
          );
        } 
        else if (text === "⚡ Random Email" || text === "/gen") {
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
            await sendMsg(chatId, "⛔ *Access Denied:* Purana email access sirf Admins ke liye reserve hai.");
          }
        }

        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // --- 2. CLOUDFLARE EMAIL RECEIVER ---
  async email(message, env, ctx) {
    try {
      const rawFrom = (message.from || "").toLowerCase();
      const rawTo = (message.to || "").toLowerCase();
      const emailMatch = rawTo.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      const toEmail = emailMatch ? emailMatch[0].trim() : rawTo.trim();

      // 1. Strict Sender Verification (Only Meta/Facebook/Instagram Allowed)
      const isAllowedSender = ALLOWED_SENDERS.some(senderDomain => {
        return rawFrom.endsWith(`@${senderDomain}`) || rawFrom.includes(`@${senderDomain}>`) || rawFrom.includes(senderDomain);
      });

      if (!isAllowedSender) {
        return; // Non-Meta mails ko direct drop karein (Spam/Other services rejected)
      }

      const raw = await new Response(message.raw).text();
      const subject = message.headers.get("subject") || "";

      // 2. Strict Meta AI / Instagram OTP Extraction (Strict 6 Digits)
      const extractedOtp = extractMetaAiOtp(subject, raw);
      const verifyLink = extractGenuineVerificationLink(raw);

      // Agar genuine OTP ya Action link nahi hai to message drop
      if (!extractedOtp && !verifyLink) return;

      const { messageId, db } = await getChannelDb();
      const boundUser = db.emails ? db.emails[toEmail] : null;

      // 3. Strict Deduplication: Duplicate triggers stop
      const currentToken = extractedOtp || verifyLink;
      const prevRecord = db.inboxes ? db.inboxes[toEmail] : null;
      const now = Date.now();

      if (prevRecord && prevRecord.tok === currentToken && (now - (prevRecord.ts || 0) < 300000)) {
        return;
      }

      // 4. Update History (Last 3 Real OTPs)
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

      // 6. Compact DB Save
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

      // 7. Deliver to Bound User ONLY
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
      console.error("Email Ingestion Error:", err);
    }
  }
};

// --- STRICT 6-DIGIT META/INSTAGRAM OTP EXTRACTOR ---
function extractMetaAiOtp(subject, rawBody) {
  let body = rawBody
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Priority 1: Check Subject Line (Meta hamesha subject me 6-digit code deta hai)
  if (subject) {
    const subjMatch = subject.match(/\b(\d{3})\s?(\d{3})\b/) || subject.match(/\b(\d{6})\b/);
    if (subjMatch) {
      const code = subjMatch[0].replace(/\s+/g, "");
      if (code.length === 6 && !code.startsWith("000000")) return code;
    }
  }

  // Pre-Clean: Head, Scripts, Styles and Hex CSS Colors (#ffffff, #141823)
  let cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/#[0-9a-fA-F]{6}\b/g, " ")
    .replace(/#[0-9a-fA-F]{3}\b/g, " ");

  // Priority 2: HTML Containers (<div/span/font/td> 123456 </td>)
  const tagMatches = [...cleanBody.matchAll(/>\s*([0-9]{3}\s?[0-9]{3}|[0-9]{6})\s*</g)];
  for (const m of tagMatches) {
    const code = m[1].replace(/\s+/g, "");
    if (code.length === 6 && !code.startsWith("000000")) {
      return code;
    }
  }

  // Priority 3: Plaintext with Strict Context Patterns
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

  // NOTE: Random 8-digit numbers ko strictly ignore kiya gaya hai taaki tracking ID leak na ho
  return null;
}

// --- VERIFICATION LINK EXTRACTOR ---
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

// --- ADMIN PERMISSION CHECKER ---
function checkIsAdmin(chatId, db) {
  if (chatId === PRIMARY_OWNER_ID) return true;
  if (db && Array.isArray(db.admins) && db.admins.includes(chatId)) return true;
  return false;
}

// --- COMPACT TELEGRAM CHANNEL DATABASE ---
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

  // Auto-Prune Engine: Keeps pinned message size strictly below 3800 bytes
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

// --- USER ACTIONS ---
async function handleEmailGenRequest(chatId, workerOrigin, db, messageId) {
  const lastCall = USER_COOLDOWN.get(chatId) || 0;
  const now = Date.now();
  if (now - lastCall < 15000) {
    const remaining = Math.ceil((15000 - (now - lastCall)) / 1000);
    await sendMsg(chatId, `⏳ *Rate Limit:* Kripya *${remaining} second* rukiye.`);
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
    `✏️ *Custom Email Username*\n\nApna pasandida username chat me likhkar bhejein:\n\n_Example:_ \`karan.raj99\` ya \`sneha_vip\`\n\n*(Sirf a-z, 0-9, dot, underscore allowed hain)*`
  );
}

async function processCustomEmailCreation(chatId, inputName, workerOrigin, db, messageId) {
  const cleanPrefix = inputName.replace(/@.*$/, "").toLowerCase().trim();

  if (!/^[a-z0-9._-]{3,30}$/.test(cleanPrefix)) {
    await sendMsg(chatId, "⚠️ *Invalid Format:* Username 3-30 letters ka hona chahiye aur special characters allowed nahi hain.");
    return;
  }

  const customEmail = `${cleanPrefix}@${DOMAIN}`;

  // Privacy Check: Ensure no other user is hijacked
  if (db.emails && db.emails[customEmail] && db.emails[customEmail] !== chatId) {
    await sendMsg(chatId, `⛔ *Already Taken:* \`${customEmail}\` kisi aur user ke pass registered hai. Kripya koi dusra naam chunein.`);
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
    await sendMsg(chatId, "⚠️ Aapka koi active email nahi mila. Pehle *⚡ Random Email* par click karein.");
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
    await sendMsg(chatId, `✅ *Email Linked (Admin Authorized)!* Active OTP Card:`);
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

  // Security: "Link Another Email" button sirf Admins aur Owner ko dikhega
  if (isAdmin) {
    inlineBtns.push([{ text: "🔑 Link Another Email (Admin)", callback_data: "btn_old_hub" }]);
  }

  await sendMsg(chatId, text, null, { inline_keyboard: inlineBtns });
}

// --- TELEGRAM SENDER ---
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
