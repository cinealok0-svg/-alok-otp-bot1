/**
 * All-In-One Enterprise Bot (Absolute Ultimate Complete Edition)
 * Features:
 *  - Full Robust Multi-API Hotmail/Outlook & Temp Mail OTP Engine
 *  - Compact UI Text with Full Functionality & Fast Refresh Buttons
 *  - Smart Multi-File Stock Merge, Deduplication & Auto-Purge of Used Accounts
 *  - 🔐 Built-In 2FA TOTP Code Generator & Aesthetic IG Username Generator
 *  - Secure Multi-Admin Access Control & Live Webmail Portal (/inbox)
 */

let BOT_TOKEN = "";
let OWNER_ID = "";
let DB_CHANNEL_ID = "";
let DONGVAN_API_KEY = "";
let DEFAULT_DOMAIN = "vibepulsemedia.online";
let WORKER_ORIGIN = "";

const ADMINS_LIST = new Set();

const REAL_GIRL_NAMES = [
  "aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya",
  "sneha", "tanya", "ananya", "simran", "neha", "muskan", "roshni", "komal", "sakshi", "aditi",
  "lavanya", "suhani", "kritika", "tanvi", "anushka", "dipti", "pallavi", "divya", "mehak", "shruthi",
  "alia", "deepika", "shraddha", "kiara", "shanaya", "palak", "mahira", "sana", "nisha", "esha"
];

const EMAIL_TO_CHAT = new Map();
const TEMP_MAIL_HISTORY = new Map();

function initEnv(env, requestUrl = "") {
  BOT_TOKEN = env?.BOT_TOKEN || "";
  OWNER_ID = String(env?.OWNER_ID || "").trim();
  DB_CHANNEL_ID = String(env?.DB_CHANNEL_ID || "").trim();
  DONGVAN_API_KEY = env?.DONGVAN_KEY || "";
  DEFAULT_DOMAIN = (env?.DEFAULT_DOMAIN || "vibepulsemedia.online").toLowerCase().trim();

  if (OWNER_ID) ADMINS_LIST.add(OWNER_ID);

  if (requestUrl) {
    try {
      WORKER_ORIGIN = new URL(requestUrl).origin;
    } catch (e) {
      WORKER_ORIGIN = `https://${DEFAULT_DOMAIN}`;
    }
  } else if (!WORKER_ORIGIN) {
    WORKER_ORIGIN = `https://${DEFAULT_DOMAIN}`;
  }
}

function isAdmin(userId) {
  return ADMINS_LIST.has(String(userId).trim());
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateInstagramUsernames() {
  const list = [];
  const shuffled = [...REAL_GIRL_NAMES].sort(() => 0.5 - Math.random());
  
  const patterns = [
    (name) => `${name}_${Math.floor(100 + Math.random() * 900)}`,
    (name) => `${name}.${Math.floor(10 + Math.random() * 90)}`,
    (name) => `${name}._${Math.floor(1000 + Math.random() * 9000)}`,
    (name) => `itz_${name}${Math.floor(1 + Math.random() * 9)}`,
    (name) => `${name}__official_${Math.floor(10 + Math.random() * 90)}`
  ];

  for (let i = 0; i < 5; i++) {
    const name = shuffled[i % shuffled.length];
    const patternFunc = patterns[Math.floor(Math.random() * patterns.length)];
    list.push(patternFunc(name));
  }
  return list;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getLiveInboxUrl(email) {
  const base = WORKER_ORIGIN || `https://${DEFAULT_DOMAIN}`;
  return `${base}/inbox?email=${encodeURIComponent(email.toLowerCase().trim())}`;
}

// 🔐 2FA TOTP GENERATOR
function base32ToUint8Array(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let cleaned = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  let output = [];

  for (let i = 0; i < cleaned.length; i++) {
    let idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xFF);
    }
  }
  return new Uint8Array(output);
}

async function generateTotpCode(secret) {
  try {
    const cleanSecret = secret.replace(/\s+/g, "").replace(/=/g, "");
    const keyBytes = base32ToUint8Array(cleanSecret);
    if (keyBytes.length === 0) return null;

    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, counter, false);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, buffer);
    const hmacResult = new Uint8Array(signature);

    const offset = hmacResult[hmacResult.length - 1] & 0x0F;
    const binary =
      ((hmacResult[offset] & 0x7F) << 24) |
      ((hmacResult[offset + 1] & 0xFF) << 16) |
      ((hmacResult[offset + 2] & 0xFF) << 8) |
      (hmacResult[offset + 3] & 0xFF);

    return String(binary % 1000000).padStart(6, "0");
  } catch (e) {
    return null;
  }
}

function detectService(rawText) {
  const lower = String(rawText || "").toLowerCase();
  if (lower.includes("instagram") || lower.includes("ig-")) return { name: "Instagram", icon: "📸" };
  if (lower.includes("facebook") || lower.includes("meta") || lower.includes("fb-")) return { name: "Facebook / Meta", icon: "🌐" };
  if (lower.includes("whatsapp")) return { name: "WhatsApp", icon: "💬" };
  if (lower.includes("telegram")) return { name: "Telegram", icon: "✈️" };
  if (lower.includes("google") || lower.includes("gmail")) return { name: "Google / YouTube", icon: "🔍" };
  if (lower.includes("microsoft") || lower.includes("outlook") || lower.includes("hotmail")) return { name: "Microsoft", icon: "🪟" };
  return { name: "Online Service", icon: "📩" };
}

function htmlToCleanText(rawHtml) {
  if (!rawHtml) return "";
  return String(rawHtml)
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function extractSmartOtpAndLink(rawText, subjectText = "", fallbackEmail = "") {
  const combinedRaw = `${subjectText || ""}\n${rawText || ""}`;
  const cleanBody = htmlToCleanText(rawText || "");
  const cleanSubject = htmlToCleanText(subjectText || "");
  const fullClean = `${cleanSubject}\n${cleanBody}`.trim();

  const textWithoutUrls = fullClean.replace(/https?:\/\/[^\s]+/gi, " ").replace(/\b[0-9a-fA-F]{12,}\b/g, " ");
  let otp = null;

  const subjMatch =
    cleanSubject.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{8})\b/) ||
    cleanSubject.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6})\b/) ||
    cleanSubject.match(/(?:code|otp|pin|passcode|código)\D{0,12}\b([0-9]{4,8})\b/i);

  if (subjMatch) otp = subjMatch[1] || subjMatch[0];

  if (!otp) {
    const kwMatch =
      textWithoutUrls.match(/(?:code|otp|pin|passcode|confirmation|verification|authenticate|security|código)\D{0,30}\b([0-9]{8})\b/i) ||
      textWithoutUrls.match(/(?:code|otp|pin|passcode|confirmation|verification|authenticate|security|código)\D{0,30}\b([0-9]{6})\b/i);
    if (kwMatch) otp = kwMatch[1];
  }

  if (!otp) {
    const anyNum =
      textWithoutUrls.match(/\b(?!(?:00000000|11111111|19\d\d|20\d\d)\b)([0-9]{8})\b/) ||
      textWithoutUrls.match(/\b(?!(?:000000|111111|123456|999999|19\d\d|20\d\d)\b)([0-9]{6})\b/) ||
      textWithoutUrls.match(/\b([0-9]{4,5})\b/);
    if (anyNum) otp = anyNum[1] || anyNum[0];
  }

  let link = null;
  const urlMatch = combinedRaw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|login_code|checkpoint)[^\s<>"']*/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/&amp;/g, "&").replace(/['\");]+$/, "");
  } else if (fallbackEmail) {
    link = getLiveInboxUrl(fallbackEmail);
  }

  const snippet = cleanBody.split("\n").map(l => l.trim()).filter(l => l.length > 2).slice(0, 3).join(" ").slice(0, 160);
  const service = detectService(`${cleanSubject} ${cleanBody.slice(0, 400)}`);
  return { otp, link, service, subject: cleanSubject || "New Mail", snippet };
}

function parseRawMimeEmail(rawEmail) {
  if (!rawEmail) return { subject: "", from: "", bodyText: "", bodyHtml: "" };
  const headerEndIdx = rawEmail.search(/\r?\n\r?\n/);
  const rawHeaders = headerEndIdx !== -1 ? rawEmail.slice(0, headerEndIdx) : rawEmail;
  const rawBody = headerEndIdx !== -1 ? rawEmail.slice(headerEndIdx + 2) : "";

  const decodeHeader = (str) => {
    if (!str) return "";
    return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, enc, data) => {
      try {
        if (enc.toUpperCase() === "B") {
          return decodeURIComponent(escape(atob(data.replace(/\s+/g, ""))));
        } else {
          return decodeURIComponent(escape(data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, h) => String.fromCharCode(parseInt(h, 16)))));
        }
      } catch (e) { return data; }
    });
  };

  const subjMatch = rawHeaders.match(/^Subject:\s*(.+?(?:\r?\n[ \t].+?)*)$/im);
  const fromMatch = rawHeaders.match(/^From:\s*(.+?(?:\r?\n[ \t].+?)*)$/im);
  const subject = decodeHeader(subjMatch ? subjMatch[1].replace(/\r?\n[ \t]+/g, " ").trim() : "");
  const from = decodeHeader(fromMatch ? fromMatch[1].replace(/\r?\n[ \t]+/g, " ").trim() : "");

  let decodedChunks = [];
  const b64Regex = /Content-Transfer-Encoding:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/gi;
  let bMatch;
  while ((bMatch = b64Regex.exec(rawEmail)) !== null) {
    try {
      const cleanB64 = bMatch[1].replace(/[^A-Za-z0-9+/=]/g, "");
      if (cleanB64.length > 8) decodedChunks.push(atob(cleanB64));
    } catch (e) {}
  }
  decodedChunks.push(rawBody.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  const fullDecoded = decodedChunks.join("\n");
  return { subject, from, bodyText: htmlToCleanText(fullDecoded), bodyHtml: fullDecoded };
}

function parseStrictStockLines(rawContent) {
  if (!rawContent) return [];
  const lines = rawContent.split(/\r?\n/);
  const valid = [];
  const seen = new Set();
  for (let l of lines) {
    l = l.trim();
    if (l.length > 5 && l.includes("@") && (l.includes("|") || l.includes(":"))) {
      const emailPart = l.split(/[|:]/)[0].trim().toLowerCase();
      if (!seen.has(emailPart)) {
        seen.add(emailPart);
        valid.push(l);
      }
    }
  }
  return valid;
}

// ROBUST OUTLOOK / HOTMAIL RESOLVER WITH MULTI-API FALLBACK
async function getOAuth2MailboxMessages(accountLine) {
  if (!accountLine) return [];
  const rawLine = accountLine.trim();
  const parts = rawLine.split(/[|:]/);
  const email = (parts[0] || "").trim();
  let clientId = "9e5f94bc-e8a4-4e73-b8be-63364c29d753";
  let refreshToken = "";

  if (rawLine.includes("|")) {
    const pipeParts = rawLine.split("|");
    refreshToken = (pipeParts[2] || "").trim();
    if (pipeParts[3]?.trim()) clientId = pipeParts[3].trim();
  } else {
    refreshToken = (parts[2] || "").trim();
    if (parts[3]?.trim()) clientId = parts[3].trim();
  }

  const messages = [];

  if (refreshToken) {
    try {
      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, grant_type: "refresh_token", refresh_token: refreshToken }).toString()
      });
      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json();
        const accessToken = tokenJson.access_token;
        if (accessToken) {
          const mailRes = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=id,subject,from,receivedDateTime,bodyPreview,body", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (mailRes.ok) {
            const mailData = await mailRes.json();
            for (const m of (mailData.value || [])) {
              const subj = m.subject || "";
              const bodyContent = m.body?.content || m.bodyPreview || "";
              const parsed = extractSmartOtpAndLink(bodyContent, subj, email);
              messages.push({
                id: m.id || String(Math.random()),
                subject: subj || parsed.subject,
                from: m.from?.emailAddress?.address || "Microsoft",
                snippet: parsed.snippet,
                html: bodyContent,
                otp: parsed.otp,
                link: parsed.link,
                service: parsed.service,
                time: m.receivedDateTime || new Date().toISOString()
              });
            }
            if (messages.length > 0) return messages;
          }
        }
      }
    } catch (e) {}

    try {
      const dvPostRes = await fetch("https://tools.dongvanfb.net/api/graph_messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ email, refresh_token: refreshToken, client_id: clientId })
      });
      if (dvPostRes.ok) {
        const dvJson = await dvPostRes.json();
        const dvList = dvJson.messages || dvJson.data || [];
        for (const m of dvList.slice(0, 10)) {
          const subj = m.subject || "";
          const bodyContent = m.body?.content || m.bodyPreview || "";
          const parsed = extractSmartOtpAndLink(bodyContent, subj, email);
          messages.push({
            id: m.id || String(Math.random()),
            subject: subj || parsed.subject,
            from: "Inbox",
            snippet: parsed.snippet,
            html: bodyContent,
            otp: parsed.otp,
            link: parsed.link,
            service: parsed.service,
            time: m.receivedDateTime || new Date().toISOString()
          });
        }
        if (messages.length > 0) return messages;
      }
    } catch (e) {}
  }

  try {
    const dvUrl = DONGVAN_API_KEY 
      ? `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(rawLine)}`
      : `https://tools.dongvanfb.net/api/get_code?mail=${encodeURIComponent(rawLine)}`;
    
    const res = await fetch(dvUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch (e) {}
      
      const directCode = json?.code || json?.otp || json?.data?.code || json?.message;
      const parsed = extractSmartOtpAndLink(txt, json?.subject || json?.title || "", email);
      
      if (directCode || parsed.otp) {
        messages.push({
          id: String(Date.now()),
          subject: json?.subject || parsed.subject,
          from: "Hotmail",
          snippet: parsed.snippet,
          html: txt,
          otp: String(directCode || parsed.otp),
          link: getLiveInboxUrl(email),
          service: detectService(txt),
          time: new Date().toISOString()
        });
        return messages;
      }
    }
  } catch (e) {}

  return messages;
}

async function getOAuth2MailboxOtp(accountLine) {
  const email = (accountLine || "").split(/[|:]/)[0]?.trim() || "";
  const msgs = await getOAuth2MailboxMessages(accountLine);
  if (msgs.length > 0) {
    TEMP_MAIL_HISTORY.set(email.toLowerCase(), msgs);
    const withOtp = msgs.find(m => m.otp) || msgs[0];
    return { otp: withOtp?.otp || null, link: withOtp?.link || getLiveInboxUrl(email), service: withOtp?.service || detectService(""), subject: withOtp?.subject || null, snippet: withOtp?.snippet || null, allMessages: msgs };
  }
  return { otp: null, link: getLiveInboxUrl(email), service: detectService(""), subject: null, snippet: null, allMessages: [] };
}

async function saveTempMailState(email, chatId, newMsgRecord = null, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  if (chatId) EMAIL_TO_CHAT.set(cleanEmail, String(chatId));

  if (newMsgRecord) {
    const existing = TEMP_MAIL_HISTORY.get(cleanEmail) || [];
    TEMP_MAIL_HISTORY.set(cleanEmail, [newMsgRecord, ...existing.filter(m => m.id !== newMsgRecord.id)].slice(0, 10));
  }

  try {
    const userPart = cleanEmail.split("@")[0];
    let desc = "";
    if (newMsgRecord) {
      const safeSubj = (newMsgRecord.subject || "Mail").replace(/[|\r\n]/g, " ").slice(0, 30);
      desc = `MSG|${userPart}|${newMsgRecord.otp || "NONE"}|${newMsgRecord.service?.name || "Service"}|${chatId || ""}|${newMsgRecord.id}|${safeSubj}`;
    } else if (chatId) {
      desc = `MAP|${userPart}|${chatId}`;
    }
    if (desc && DB_CHANNEL_ID && telegramApi) {
      await fetch(`${telegramApi}/setChatDescription`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, description: desc.slice(0, 250) })
      }).catch(() => {});
    }
  } catch (e) {}
}

async function getTempMailMessages(email, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  const localList = TEMP_MAIL_HISTORY.get(cleanEmail) || [];
  try {
    if (DB_CHANNEL_ID && telegramApi) {
      const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
      const desc = res?.result?.description || "";
      const userPart = cleanEmail.split("@")[0];
      if (desc.startsWith(`MSG|${userPart}|`)) {
        const parts = desc.split("|");
        const otp = parts[2] !== "NONE" ? parts[2] : null;
        const sName = parts[3] || "Service";
        const msgId = parts[5] || "sync_1";
        const subj = parts[6] || "Mail";
        if (!localList.some(m => m.id === msgId)) {
          localList.unshift({
            id: msgId, subject: subj, from: sName, snippet: subj, html: subj, otp, link: getLiveInboxUrl(cleanEmail), service: detectService(sName), time: "Just now", pushed: true
          });
          TEMP_MAIL_HISTORY.set(cleanEmail, localList.slice(0, 10));
        }
      }
    }
  } catch (e) {}
  return localList;
}

async function resolveTargetChatForEmail(email, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  if (EMAIL_TO_CHAT.has(cleanEmail)) return EMAIL_TO_CHAT.get(cleanEmail);
  try {
    if (DB_CHANNEL_ID && telegramApi) {
      const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
      const desc = res?.result?.description || "";
      const userPart = cleanEmail.split("@")[0];
      if (desc.startsWith(`MAP|${userPart}|`)) return desc.split("|")[2];
      if (desc.startsWith(`MSG|${userPart}|`)) return desc.split("|")[4];
    }
  } catch (e) {}
  return OWNER_ID || null;
}

function buildShortMailAlert(email, msgObj) {
  const sName = msgObj.service?.name || "Online Service";
  const sIcon = msgObj.service?.icon || "📩";
  const otp = msgObj.otp;
  const liveInboxUrl = getLiveInboxUrl(email);

  let text = `🔔 <b>${sIcon} ${escapeHtml(sName.toUpperCase())} OTP RECEIVED!</b>\n`;
  if (otp) {
    text += `🔑 <b>OTP:</b> <code>${escapeHtml(otp)}</code>\n`;
  }
  text += `📧 <code>${escapeHtml(email)}</code>`;

  const kbRows = [];
  if (otp) {
    kbRows.push([{ text: `📋 COPY OTP: ${otp}`, copy_text: { text: String(otp) } }]);
  }
  kbRows.push([
    { text: "🔄 Get OTP / Refresh", callback_data: `chk_mail:${email}` },
    { text: "🌐 Live Inbox", url: liveInboxUrl }
  ]);
  kbRows.push([
    { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" },
    { text: "🏠 Home", callback_data: "home" }
  ]);

  return { text, reply_markup: { inline_keyboard: kbRows } };
}

async function startOAuthAutoPush(chatId, accountData, telegramApi) {
  const email = accountData.split(/[|:]/)[0]?.trim();
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const res = await getOAuth2MailboxOtp(accountData);
    if (res.otp || (res.allMessages && res.allMessages.length > 0)) {
      const latestMsg = res.allMessages[0] || { otp: res.otp, subject: res.subject, snippet: res.snippet, service: res.service };
      const alert = buildShortMailAlert(email, latestMsg);
      await send(chatId, alert.text, telegramApi, alert.reply_markup);
      break;
    }
  }
}

async function startTempMailAutoPush(chatId, email, telegramApi, baselineTopId = null) {
  const cleanEmail = email.toLowerCase().trim();
  for (let i = 0; i < 15; i++) {
    await sleep(2500);
    const list = await getTempMailMessages(cleanEmail, telegramApi);
    if (list.length > 0) {
      const newest = list[0];
      if (baselineTopId && newest.id === baselineTopId) continue;
      if (newest.pushed) break;
      newest.pushed = true;
      TEMP_MAIL_HISTORY.set(cleanEmail, list);

      const alert = buildShortMailAlert(cleanEmail, newest);
      await send(chatId, alert.text, telegramApi, alert.reply_markup);
      break;
    }
  }
}

async function getChannelDbState(telegramApi) {
  try {
    const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
    const pinned = res?.result?.pinned_message?.text || "";
    if (pinned.includes("DB_STORE:")) {
      return {
        fileId: pinned.match(/FILE:([a-zA-Z0-9_-]+)/)?.[1] || null,
        index: parseInt(pinned.match(/IDX:(\d+)/)?.[1] || "0", 10),
        total: parseInt(pinned.match(/TOTAL:(\d+)/)?.[1] || "0", 10),
        msgId: res.result.pinned_message.message_id
      };
    }
  } catch (e) {}
  return { fileId: null, index: 0, total: 0, msgId: null };
}

async function loadChannelFileLines(fileId, telegramApi) {
  try {
    const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${fileId}`).then(r => r.json());
    const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
    return parseStrictStockLines(content);
  } catch (e) {
    return [];
  }
}

async function findAccountLineByEmail(queryEmail, telegramApi) {
  const clean = queryEmail.toLowerCase().trim();
  const db = await getChannelDbState(telegramApi);
  if (db.fileId) {
    const allLines = await loadChannelFileLines(db.fileId, telegramApi);
    const matched = allLines.find(l => l.split(/[|:]/)[0].trim().toLowerCase() === clean);
    if (matched) return matched;
  }
  return clean;
}

async function updateChannelDb(fileId, newIndex, total, msgId, telegramApi) {
  const remaining = Math.max(0, total - newIndex);
  const dbText = `🗄️ <b>STOCK LEDGER</b>\n📦 Total: <code>${total}</code> | Out: <code>${newIndex}</code> | Left: <code>${remaining}</code>\n\n<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;
  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    }).catch(() => {});
  }
}

async function send(chatId, text, telegramApi, reply_markup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
}

async function edit(chatId, messageId, text, telegramApi, reply_markup = null) {
  if (!messageId) return send(chatId, text, telegramApi, reply_markup);
  const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
}

async function deleteMessage(chatId, messageId, telegramApi) {
  if (!messageId) return;
  return fetch(`${telegramApi}/deleteMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, message_id: messageId }) }).catch(() => null);
}

async function renderLiveWebmailPage(emailQuery, telegramApi) {
  const cleanEmail = (emailQuery || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes("@")) return new Response("Invalid Email", { status: 400 });

  const domain = cleanEmail.split("@")[1] || "";
  let messages = domain === DEFAULT_DOMAIN ? await getTempMailMessages(cleanEmail, telegramApi) : await getOAuth2MailboxMessages(await findAccountLineByEmail(cleanEmail, telegramApi));

  const cardsHtml = messages.length === 0
    ? `<div style="text-align:center;padding:40px;color:#94a3b8;">📭 Abhi koi message nahi aaya hai. (Auto-refresh: 6s)</div>`
    : messages.map((m, idx) => `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="font-size:12px;color:#38bdf8;margin-bottom:6px;">#${idx + 1} ${escapeHtml(m.service?.name || "Mail")}</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${escapeHtml(m.subject || "No Subject")}</div>
          ${m.otp ? `<div style="background:#065f46;color:#ecfdf5;padding:8px;border-radius:8px;font-weight:bold;margin-bottom:8px;cursor:pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(m.otp)}');this.innerText='✅ COPIED: ${escapeHtml(m.otp)}'">🔑 OTP: ${escapeHtml(m.otp)} (Tap to Copy)</div>` : ""}
          <div style="font-size:13px;color:#cbd5e1;white-space:pre-wrap;">${escapeHtml(m.snippet || m.html || "")}</div>
        </div>`).join("");

  return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="6"><title>Inbox - ${escapeHtml(cleanEmail)}</title><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:16px;margin:0;}</style></head><body><div style="max-width:600px;margin:0 auto;"><div style="background:#1e293b;padding:14px;border-radius:12px;margin-bottom:14px;"><div style="font-size:11px;color:#94a3b8;">LIVE INBOX</div><div style="font-size:14px;font-weight:bold;color:#38bdf8;word-break:break-all;">${escapeHtml(cleanEmail)}</div></div>${cardsHtml}</div></body></html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request, env, ctx) {
    initEnv(env, request.url);
    const url = new URL(request.url);
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;

    if (url.pathname === "/inbox") return renderLiveWebmailPage(url.searchParams.get("email") || "", telegramApi);
    if (request.method !== "POST") return new Response("Bot Engine OK", { status: 200 });

    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, ctx));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  },

  async email(message, env, ctx) {
    initEnv(env);
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;
    try {
      const toEmail = String(message.to || "").toLowerCase().trim();
      const rawEmail = await new Response(message.raw).text();
      const mime = parseRawMimeEmail(rawEmail);
      const parsed = extractSmartOtpAndLink(mime.bodyHtml || mime.bodyText, mime.subject, toEmail);
      const targetChatId = await resolveTargetChatForEmail(toEmail, telegramApi);

      const msgRecord = {
        id: `${Date.now()}_${Math.floor(100 + Math.random() * 899)}`,
        subject: mime.subject || parsed.subject,
        snippet: parsed.snippet || mime.bodyText.slice(0, 200),
        html: mime.bodyHtml || mime.bodyText,
        otp: parsed.otp,
        link: parsed.link,
        service: parsed.service,
        time: new Date().toLocaleTimeString(),
        pushed: Boolean(targetChatId)
      };

      await saveTempMailState(toEmail, targetChatId, msgRecord, telegramApi);
      if (targetChatId) {
        const alert = buildShortMailAlert(toEmail, msgRecord);
        await send(targetChatId, alert.text, telegramApi, alert.reply_markup);
      }
    } catch (e) {}
  }
};

async function handleTelegramUpdate(update, ctx) {
  const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const userId = String(msg?.from?.id || cb?.from?.id || "");
  const messageId = cb?.message?.message_id;
  let text = msg?.text?.trim() || "";
  const data = cb?.data;

  if (!chatId) return;
  text = text.replace(/@\w+bot/i, "").trim();

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id }) }).catch(() => {});
  }

  const userIsAdmin = isAdmin(userId);

  if (userIsAdmin) {
    if (text === "/export_unused" || data === "admin_export") {
      const db = await getChannelDbState(telegramApi);
      if (!db.fileId || db.index >= db.total) return send(chatId, "⚠️ Koi unused stock nahi hai.", telegramApi);
      const lines = await loadChannelFileLines(db.fileId, telegramApi);
      const unused = lines.slice(db.index);
      const fd = new FormData();
      fd.append("chat_id", chatId);
      fd.append("document", new Blob([unused.join("\n")], { type: "text/plain" }), `stock_${unused.length}.txt`);
      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: fd });
      return;
    }
    if (text === "/clear_stock" || data === "admin_clear") {
      const db = await getChannelDbState(telegramApi);
      if (db.msgId) await updateChannelDb("EMPTY", 0, 0, db.msgId, telegramApi);
      return messageId ? edit(chatId, messageId, "🧹 Stock reset ho gaya!", telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }) : send(chatId, "🧹 Stock reset!", telegramApi);
    }
    if (text === "/stock" || data === "admin_status") {
      const db = await getChannelDbState(telegramApi);
      const rep = `📊 <b>ADMIN STOCK STATUS</b>\n📦 Total: ${db.total} | Out: ${db.index} | Left: ${Math.max(0, db.total - db.index)}`;
      const kb = { inline_keyboard: [[{ text: "📥 Export Unused", callback_data: "admin_export" }], [{ text: "🗑️ Clear Stock", callback_data: "admin_clear" }], [{ text: "🏠 Home", callback_data: "home" }]] };
      return messageId ? edit(chatId, messageId, rep, telegramApi, kb) : send(chatId, rep, telegramApi, kb);
    }
  }

  if (msg?.document) {
    if (!userIsAdmin) return send(chatId, "⚠️ Access Denied! Kewal authorized admins stock upload kar sakte hain.", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt") && !doc.file_name?.endsWith(".csv")) return send(chatId, "⚠️ Sirf .txt ya .csv file upload karein!", telegramApi);
    
    const wait = await send(chatId, "⏳ Stock merge aur deduplicate ho raha hai...", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${doc.file_id}`).then(r => r.json());
      const newFileContent = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
      const newLines = parseStrictStockLines(newFileContent);

      const currentDb = await getChannelDbState(telegramApi);
      let combinedLines = [...newLines];

      if (currentDb.fileId && currentDb.fileId !== "EMPTY") {
        const oldLines = await loadChannelFileLines(currentDb.fileId, telegramApi);
        const unusedOldLines = oldLines.slice(currentDb.index);
        const seenEmails = new Set();
        const mergedSet = [];
        
        for (const l of [...unusedOldLines, ...newLines]) {
          const emailPart = l.split(/[|:]/)[0].trim().toLowerCase();
          if (!seenEmails.has(emailPart)) {
            seenEmails.add(emailPart);
            mergedSet.push(l);
          }
        }
        combinedLines = mergedSet;
      }

      const fd = new FormData();
      fd.append("chat_id", DB_CHANNEL_ID);
      fd.append("document", new Blob([combinedLines.join("\n")], { type: "text/plain" }), `master_stock_${combinedLines.length}.txt`);
      fd.append("caption", "Master Merged Stock Database");
      
      const uploadRes = await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: fd }).then(r => r.json());
      const newFileId = uploadRes?.result?.document?.file_id;

      if (!newFileId) throw new Error("Upload failed");

      const dbText = `🗄️ <b>MASTER STOCK DATABASE</b>\n📦 Total: ${combinedLines.length} | Out: 0 | Left: ${combinedLines.length}\n\n<code>DB_STORE: FILE:${newFileId} IDX:0 TOTAL:${combinedLines.length}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;
      
      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId }) }).catch(() => {});
      }

      if (currentDb.msgId) {
        await deleteMessage(DB_CHANNEL_ID, currentDb.msgId, telegramApi);
      }

      return edit(chatId, waitId, `✅ Stock Successfully Merged & Cleaned!\n📥 Added: ${newLines.length} accounts\n📦 Total Active Stock: <b>${combinedLines.length}</b>`, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] });
    } catch (e) {
      return edit(chatId, waitId, "❌ Stock merge error. Kripya dobara koshish karein.", telegramApi);
    }
  }

  if (text === "/start" || data === "home") {
    const db = await getChannelDbState(telegramApi);
    const left = Math.max(0, db.total - db.index);

    const welcomeMsg =
      `🤖 <b>VIBEPULSE ENTERPRISE SUITE</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📦 Outlook Stock: <code>${left}</code>\n` +
      `🌐 Domain: <code>@${escapeHtml(DEFAULT_DOMAIN)}</code>\n` +
      `⚡ Systems: <code>Full Engine Active</code>\n\n` +
      `👇 <i>Apni zaroorat ke hisab se niche option select karein:</i>`;

    const rows = [
      [{ text: "🔥 Get Fresh Hotmail/Outlook", callback_data: "get_stock" }],
      [{ text: `⚡ Generate Temp Mail (@${DEFAULT_DOMAIN})`, callback_data: "gen_temp" }],
      [{ text: "⚡ Generate IG Usernames", callback_data: "gen_usernames" }],
      [{ text: "🔐 2FA Code Generator", callback_data: "menu_2fa" }]
    ];
    if (userIsAdmin) rows.push([{ text: "📊 Admin Control Panel", callback_data: "admin_status" }]);

    return messageId ? edit(chatId, messageId, welcomeMsg, telegramApi, { inline_keyboard: rows }) : send(chatId, welcomeMsg, telegramApi, { inline_keyboard: rows });
  }

  if (data === "menu_2fa" || text === "/2fa") {
    const tMsg = `🔐 <b>2FA TOTP CODE GENERATOR</b>\n━━━━━━━━━━━━━━━━━━\nAapka Instagram ya kisi bhi service ka 2FA Secret Key (jaise <code>JBSWY3DPEHPK3PXP</code>) yahan bhejें ya niche button dabayein. Bot turant live 6-digit code de dega!`;
    const kb = {
      inline_keyboard: [
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    };
    return messageId ? edit(chatId, messageId, tMsg, telegramApi, kb) : send(chatId, tMsg, telegramApi, kb);
  }

  if (text.length >= 10 && !text.includes("@") && !text.startsWith("/")) {
    const cleanSecret = text.replace(/\s+/g, "").toUpperCase();
    const totpCode = await generateTotpCode(cleanSecret);
    if (totpCode) {
      const respText = `🔐 <b>LIVE 2FA TOTP CODE</b>\n━━━━━━━━━━━━━━━━━━\n🔑 Code: <code>${totpCode}</code>\n⏳ <i>Valid for current 30s window</i>`;
      const kb = {
        inline_keyboard: [
          [{ text: `📋 Copy Code: ${totpCode}`, copy_text: { text: totpCode } }],
          [{ text: "🔐 Gen Another", callback_data: "menu_2fa" }, { text: "🏠 Home", callback_data: "home" }]
        ]
      };
      return send(chatId, respText, telegramApi, kb);
    } else {
      return send(chatId, `❌ Invalid 2FA Secret Key! Kripya sahi Base32 secret key enter karein.`, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] });
    }
  }

  if (data === "gen_usernames" || text === "/usernames") {
    const names = generateInstagramUsernames();
    let textOut = `⚡ <b>INSTANT IG USERNAMES GENERATED</b>\n━━━━━━━━━━━━━━━━━━\n`;
    const kbRows = [];
    names.forEach((u, i) => {
      textOut += `${i + 1}. <code>${u}</code>\n`;
      kbRows.push([{ text: `📋 Copy: ${u}`, copy_text: { text: u } }]);
    });
    kbRows.push([
      { text: "🔄 Generate More", callback_data: "gen_usernames" },
      { text: "🏠 Home", callback_data: "home" }
    ]);

    return messageId
      ? edit(chatId, messageId, textOut, telegramApi, { inline_keyboard: kbRows })
      : send(chatId, textOut, telegramApi, { inline_keyboard: kbRows });
  }

  if (data === "get_stock" || text === "/get") {
    const db = await getChannelDbState(telegramApi);
    if (!db.fileId || db.index >= db.total) {
      const em = "⚠️ <b>Out of Stock!</b>\n<i>Abhi koi fresh account uplabdh nahi hai. Nayi file upload karein.</i>";
      return messageId ? edit(chatId, messageId, em, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }) : send(chatId, em, telegramApi);
    }
    const lines = await loadChannelFileLines(db.fileId, telegramApi);
    const acc = lines[db.index];
    
    await updateChannelDb(db.fileId, db.index + 1, lines.length, db.msgId, telegramApi);

    const parts = acc.split(/[|:]/);
    const email = parts[0]?.trim() || "";
    const pass = parts[1]?.trim() || "";
    const inboxUrl = getLiveInboxUrl(email);

    const msgText = `✅ <b>OUTLOOK ACCOUNT DISPENSED</b>\n📧 <code>${escapeHtml(email)}</code>\n🔑 <code>${escapeHtml(pass)}</code>`;
    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: email } }, { text: "🔑 Copy Pass", copy_text: { text: pass } }],
        [
          { text: "🔄 Get OTP / Refresh", callback_data: `chk_mail:${email}` },
          { text: "🌐 Live Inbox", url: inboxUrl }
        ],
        [
          { text: "🔥 Next", callback_data: "get_stock" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    };

    await (messageId ? edit(chatId, messageId, msgText, telegramApi, kb) : send(chatId, msgText, telegramApi, kb));
    ctx.waitUntil(startOAuthAutoPush(chatId, acc, telegramApi));
    return;
  }

  if (data === "gen_temp" || text === "/temp") {
    const email = `${getRandomUser()}@${DEFAULT_DOMAIN}`;
    await saveTempMailState(email, chatId, null, telegramApi);
    const inboxUrl = getLiveInboxUrl(email);

    const tempMsg = `⚡ <b>TEMP MAIL CREATED</b>\n📧 <code>${escapeHtml(email)}</code>\n⏳ <i>Listening for OTP...</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: email } }],
        [
          { text: "🔄 Check OTP / Refresh", callback_data: `chk_mail:${email}` },
          { text: "🌐 Live Inbox", url: inboxUrl }
        ],
        [
          { text: "⚡ Naya", callback_data: "gen_temp" },
          { text: "🏠 Home", callback_data: "home" }
        ]
      ]
    };

    await (messageId ? edit(chatId, messageId, tempMsg, telegramApi, kb) : send(chatId, tempMsg, telegramApi, kb));
    ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi, null));
    return;
  }

  if (data?.startsWith("chk_temp:")) {
    const email = data.replace("chk_temp:", "").trim().toLowerCase();
    const list = await getTempMailMessages(email, telegramApi);
    if (list.length > 0) {
      const alert = buildShortMailAlert(email, list[0]);
      return messageId ? edit(chatId, messageId, alert.text, telegramApi, alert.reply_markup) : send(chatId, alert.text, telegramApi, alert.reply_markup);
    }
    return send(chatId, `⏳ <code>${escapeHtml(email)}</code> par abhi koi mail nahi aaya hai.`, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] });
  }

  if (data?.startsWith("chk_mail:") || text.includes("@")) {
    const rawQuery = data?.startsWith("chk_mail:") ? data.replace("chk_mail:", "").trim() : text.trim();
    const queryEmail = rawQuery.split(/[|:]/)[0].trim().toLowerCase();
    const domain = queryEmail.split("@")[1] || "";
    const inboxUrl = getLiveInboxUrl(queryEmail);

    if (domain === DEFAULT_DOMAIN) {
      await saveTempMailState(queryEmail, chatId, null, telegramApi);
      const list = await getTempMailMessages(queryEmail, telegramApi);
      ctx.waitUntil(startTempMailAutoPush(chatId, queryEmail, telegramApi, list[0]?.id || null));
      if (list.length > 0) {
        const alert = buildShortMailAlert(queryEmail, list[0]);
        return send(chatId, `♻️ <b>RE-ACTIVATED</b>\n\n` + alert.text, telegramApi, alert.reply_markup);
      }
      return send(chatId, `♻️ Active: <code>${escapeHtml(queryEmail)}</code>\n⏳ OTP aate hi push ho jayega.`, telegramApi, { inline_keyboard: [[{ text: "🌐 Live Inbox", url: inboxUrl }], [{ text: "🏠 Home", callback_data: "home" }]] });
    }

    let targetLine = rawQuery;
    if (!rawQuery.includes("|") && !rawQuery.includes(":")) {
      targetLine = await findAccountLineByEmail(queryEmail, telegramApi);
    }

    const wait = await send(chatId, `🔍 Purane messages scan kiye ja rahe hain...`, telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;
    const res = await getOAuth2MailboxOtp(targetLine);

    if (res.otp || (res.allMessages && res.allMessages.length > 0)) {
      const alert = buildShortMailAlert(queryEmail, res.allMessages[0] || res);
      return edit(chatId, waitId, alert.text, telegramApi, alert.reply_markup);
    } else {
      ctx.waitUntil(startOAuthAutoPush(chatId, targetLine, telegramApi));
      return edit(chatId, waitId, `📭 Is inbox me koi naya OTP nahi mila.\n📧 <code>${escapeHtml(queryEmail)}</code>`, telegramApi, { inline_keyboard: [[{ text: "🌐 Live Inbox", url: inboxUrl }], [{ text: "🏠 Home", callback_data: "home" }]] });
    }
  }
}
