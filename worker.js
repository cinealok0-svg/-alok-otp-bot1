/**
 * All-In-One Enterprise Bot (Pro Edition - Universal 4, 6, 8 Digit OTP + Old Email Re-Activation)
 * Configured for Cloudflare Workers & Email Routing
 */

// ================= DYNAMIC ENV BINDINGS =================
let BOT_TOKEN = "";
let OWNER_ID = "";
let DB_CHANNEL_ID = "";
let DONGVAN_API_KEY = "";
let DEFAULT_DOMAIN = "vibepulsemedia.online";
let WORKER_ORIGIN = "";

const FEMALE_FIRST_NAMES = [
  "aanya", "diya", "ishita", "kavya", "khushi", "myra", "pooja", "priya", "riya", "shreya",
  "sneha", "tanya", "ananya", "simran", "neha", "muskan", "roshni", "komal", "sakshi", "aditi"
];
const FEMALE_LAST_NAMES = [
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy", "yadav"
];

let CACHED_FILE_ID = null;
let CACHED_LINES = null;

const EMAIL_TO_CHAT = new Map();
const TEMP_MAIL_HISTORY = new Map();

// ================= UTILITIES =================
function initEnv(env, requestUrl = "") {
  BOT_TOKEN = env?.BOT_TOKEN || "";
  OWNER_ID = String(env?.OWNER_ID || "");
  DB_CHANNEL_ID = String(env?.DB_CHANNEL_ID || "");
  DONGVAN_API_KEY = env?.DONGVAN_KEY || "";
  DEFAULT_DOMAIN = (env?.DEFAULT_DOMAIN || "vibepulsemedia.online").toLowerCase().trim();
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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRandomUser() {
  const f = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const l = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  return `${f}.${l}${Math.floor(10 + Math.random() * 90)}`.toLowerCase();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getLiveInboxUrl(email) {
  const base = WORKER_ORIGIN || `https://${DEFAULT_DOMAIN}`;
  return `${base}/inbox?email=${encodeURIComponent(email.toLowerCase().trim())}`;
}

// Service Detector
function detectService(rawText) {
  const lower = String(rawText || "").toLowerCase();
  if (lower.includes("instagram") || lower.includes("ig-")) {
    return { name: "Instagram", icon: "📸" };
  }
  if (lower.includes("facebook") || lower.includes("meta") || lower.includes("fb-") || lower.includes("authenticate your profile")) {
    return { name: "Facebook / Meta", icon: "🌐" };
  }
  if (lower.includes("whatsapp")) {
    return { name: "WhatsApp", icon: "💬" };
  }
  if (lower.includes("telegram")) {
    return { name: "Telegram", icon: "✈️" };
  }
  if (lower.includes("google") || lower.includes("gmail") || lower.includes("youtube")) {
    return { name: "Google / YouTube", icon: "🔍" };
  }
  if (lower.includes("twitter") || lower.includes(" x ") || lower.includes("x corp")) {
    return { name: "Twitter / X", icon: "🐦" };
  }
  if (lower.includes("tiktok")) {
    return { name: "TikTok", icon: "🎵" };
  }
  if (lower.includes("microsoft") || lower.includes("outlook") || lower.includes("hotmail")) {
    return { name: "Microsoft", icon: "🪟" };
  }
  if (lower.includes("discord")) {
    return { name: "Discord", icon: "👾" };
  }
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
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#[0-9]+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// Universal 4, 6, 8 Digit OTP Parser
function extractSmartOtpAndLink(rawText, subjectText = "", fallbackEmail = "") {
  const combinedRaw = `${subjectText || ""}\n${rawText || ""}`;
  const cleanBody = htmlToCleanText(rawText || "");
  const cleanSubject = htmlToCleanText(subjectText || "");
  const fullClean = `${cleanSubject}\n${cleanBody}`.trim();

  const textWithoutUrls = fullClean
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/\b[0-9a-fA-F]{12,}\b/g, " ");

  let otp = null;

  const subjMatch =
    cleanSubject.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{8})\b/) ||
    cleanSubject.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{6})\b/) ||
    cleanSubject.match(/(?:code|otp|pin|passcode|código)\D{0,12}\b([0-9]{4,8})\b/i) ||
    cleanSubject.match(/\b([0-9]{4,8})\b\D{0,12}(?:is your|confirmation|verification|code)/i);

  if (subjMatch) {
    otp = subjMatch[1] || subjMatch[0];
  }

  if (!otp) {
    const kwMatch =
      textWithoutUrls.match(/(?:code|otp|pin|passcode|confirmation|verification|authenticate|security|código)\D{0,30}\b([0-9]{8})\b/i) ||
      textWithoutUrls.match(/(?:code|otp|pin|passcode|confirmation|verification|authenticate|security|código)\D{0,30}\b([0-9]{6})\b/i) ||
      textWithoutUrls.match(/\b([0-9]{8})\b\D{0,30}(?:is your|code|otp|confirmation|verification|authenticate)/i) ||
      textWithoutUrls.match(/\b([0-9]{6})\b\D{0,30}(?:is your|code|otp|confirmation|verification|authenticate)/i);
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
  const urlMatch =
    combinedRaw.match(/https?:\/\/[^\s<>"']+(?:verify|confirm|activate|token|validation|login_code|checkpoint|recover)[^\s<>"']*/i) ||
    combinedRaw.match(/https?:\/\/[^\s<>"']+(?:action=verify|auth=|code=)[^\s<>"']*/i);

  if (urlMatch) {
    link = urlMatch[0].replace(/&amp;/g, "&").replace(/[.,;)"'>]+$/, "");
  } else if (fallbackEmail) {
    link = getLiveInboxUrl(fallbackEmail);
  }

  const snippetLines = cleanBody
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 2 && !l.toLowerCase().startsWith("unsubscribe"));
  const snippet = snippetLines.slice(0, 6).join("\n").slice(0, 320);

  const service = detectService(`${cleanSubject} ${cleanBody.slice(0, 600)}`);
  return { otp, link, service, subject: cleanSubject || "New Incoming Mail", snippet: snippet || cleanSubject };
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
          const bin = atob(data.replace(/\s+/g, ""));
          return decodeURIComponent(escape(bin));
        } else {
          const qp = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (__, h) => String.fromCharCode(parseInt(h, 16)));
          return decodeURIComponent(escape(qp));
        }
      } catch (e) {
        return data;
      }
    });
  };

  const subjMatch = rawHeaders.match(/^Subject:\s*(.+?(?:\r?\n[ \t].+?)*)$/im);
  const fromMatch = rawHeaders.match(/^From:\s*(.+?(?:\r?\n[ \t].+?)*)$/im);
  const subject = decodeHeader(subjMatch ? subjMatch[1].replace(/\r?\n[ \t]+/g, " ").trim() : "");
  const from = decodeHeader(fromMatch ? fromMatch[1].replace(/\r?\n[ \t]+/g, " ").trim() : "");

  const decodeQP = (str) =>
    str
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  let decodedChunks = [];
  const b64Regex = /Content-Transfer-Encoding:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/gi;
  let bMatch;
  while ((bMatch = b64Regex.exec(rawEmail)) !== null) {
    try {
      const cleanB64 = bMatch[1].replace(/[^A-Za-z0-9+/=]/g, "");
      if (cleanB64.length > 8) {
        const bin = atob(cleanB64);
        try {
          decodedChunks.push(decodeURIComponent(escape(bin)));
        } catch (e) {
          decodedChunks.push(bin);
        }
      }
    } catch (e) {}
  }

  decodedChunks.push(decodeQP(rawBody));
  const fullDecoded = decodedChunks.join("\n");
  return {
    subject,
    from,
    bodyText: htmlToCleanText(fullDecoded),
    bodyHtml: fullDecoded
  };
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

// ================= HOTMAIL / OUTLOOK RESOLVER =================
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
    const tokenEndpoints = [
      {
        url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        body: new URLSearchParams({ client_id: clientId, grant_type: "refresh_token", refresh_token: refreshToken })
      },
      {
        url: "https://login.live.com/oauth20_token.srf",
        body: new URLSearchParams({ client_id: clientId, grant_type: "refresh_token", refresh_token: refreshToken })
      }
    ];

    for (const ep of tokenEndpoints) {
      try {
        const tokenRes = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: ep.body.toString()
        });

        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          const accessToken = tokenJson.access_token;
          if (accessToken) {
            const mailApis = [
              "https://graph.microsoft.com/v1.0/me/messages?$top=5&$select=id,subject,from,receivedDateTime,bodyPreview,body",
              "https://outlook.office.com/api/v2.0/me/messages?$top=5&$select=Id,Subject,From,ReceivedDateTime,BodyPreview,Body"
            ];

            for (const apiUrl of mailApis) {
              try {
                const mailRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (mailRes.ok) {
                  const mailData = await mailRes.json();
                  const list = mailData.value || [];
                  if (list.length > 0) {
                    for (const m of list) {
                      const subj = m.subject || m.Subject || "";
                      const bodyContent = m.body?.content || m.Body?.Content || m.bodyPreview || m.BodyPreview || "";
                      const fromAddr = m.from?.emailAddress?.address || m.From?.EmailAddress?.Address || "Inbox";
                      const parsed = extractSmartOtpAndLink(bodyContent, subj, email);

                      messages.push({
                        id: m.id || m.Id || String(Math.random()),
                        subject: subj || parsed.subject,
                        from: fromAddr,
                        snippet: parsed.snippet,
                        html: bodyContent,
                        otp: parsed.otp,
                        link: parsed.link,
                        service: parsed.service,
                        time: m.receivedDateTime || m.ReceivedDateTime || new Date().toISOString()
                      });
                    }
                    return messages;
                  }
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }

    // DongvanFB Graph API Reader
    try {
      const dvPostRes = await fetch("https://tools.dongvanfb.net/api/graph_messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ email, refresh_token: refreshToken, client_id: clientId })
      });

      if (dvPostRes.ok) {
        const dvJson = await dvPostRes.json();
        const dvList = dvJson.messages || dvJson.data || dvJson.value || [];
        if (Array.isArray(dvList) && dvList.length > 0) {
          for (const m of dvList.slice(0, 5)) {
            const subj = m.subject || m.Subject || "";
            const bodyContent = m.body?.content || m.body || m.bodyPreview || m.content || "";
            const parsed = extractSmartOtpAndLink(bodyContent, subj, email);

            messages.push({
              id: m.id || String(Math.random()),
              subject: subj || parsed.subject,
              from: m.from?.emailAddress?.address || "Inbox",
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
    } catch (e) {}
  }

  // DongvanFB Key Endpoints
  const urls = [
    `https://api.dongvanfb.com/user/get_code_oauth?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(rawLine)}`,
    `https://api.dongvanfb.com/api/get_code?apikey=${DONGVAN_API_KEY}&mail=${encodeURIComponent(email)}`,
    `https://dongvanfb.net/read_mail_box/api.php?apikey=${DONGVAN_API_KEY}&email=${encodeURIComponent(rawLine)}&type=oauth2`
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const txt = await res.text();
        let json = null;
        try { json = JSON.parse(txt); } catch (e) {}

        const directCode = json?.code || json?.otp || json?.data?.code || json?.data?.otp;
        const fullMailText = json?.content || json?.message || txt;
        const parsed = extractSmartOtpAndLink(fullMailText, json?.subject || "", email);

        if (directCode || parsed.otp) {
          messages.push({
            id: String(Date.now()),
            subject: json?.subject || parsed.subject,
            from: "Hotmail / Outlook",
            snippet: parsed.snippet,
            html: fullMailText,
            otp: String(directCode || parsed.otp),
            link: getLiveInboxUrl(email),
            service: detectService(fullMailText),
            time: new Date().toISOString()
          });
          return messages;
        }
      }
    } catch (e) {}
  }

  return messages;
}

async function getOAuth2MailboxOtp(accountLine) {
  const email = (accountLine || "").split(/[|:]/)[0]?.trim() || "";
  const msgs = await getOAuth2MailboxMessages(accountLine);

  if (msgs.length > 0) {
    TEMP_MAIL_HISTORY.set(email.toLowerCase(), msgs);
    const withOtp = msgs.find(m => m.otp) || msgs[0];
    return {
      otp: withOtp.otp,
      link: withOtp.link || getLiveInboxUrl(email),
      service: withOtp.service,
      subject: withOtp.subject,
      snippet: withOtp.snippet,
      allMessages: msgs
    };
  }

  return { otp: null, link: getLiveInboxUrl(email), service: detectService(""), subject: null, snippet: null, allMessages: [] };
}

// ================= CUSTOM DOMAIN STATE STORE =================
async function saveTempMailState(email, chatId, newMsgRecord = null, telegramApi) {
  const cleanEmail = email.toLowerCase().trim();
  if (chatId) EMAIL_TO_CHAT.set(cleanEmail, String(chatId));

  if (newMsgRecord) {
    const existing = TEMP_MAIL_HISTORY.get(cleanEmail) || [];
    const updated = [newMsgRecord, ...existing.filter(m => m.id !== newMsgRecord.id)].slice(0, 10);
    TEMP_MAIL_HISTORY.set(cleanEmail, updated);
  }

  try {
    const userPart = cleanEmail.split("@")[0];
    let desc = "";
    if (newMsgRecord) {
      const safeSubj = (newMsgRecord.subject || "Mail").replace(/[|\r\n]/g, " ").slice(0, 40);
      const safeSnip = (newMsgRecord.snippet || "").replace(/[|\r\n]/g, " ").slice(0, 90);
      desc = `MSG|${userPart}|${newMsgRecord.otp || "NONE"}|${newMsgRecord.service?.name || "Service"}|${chatId || ""}|${newMsgRecord.id}|${safeSubj}|${safeSnip}`;
    } else if (chatId) {
      desc = `MAP|${userPart}|${chatId}`;
    }
    if (desc && DB_CHANNEL_ID && telegramApi) {
      await fetch(`${telegramApi}/setChatDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const sName = parts[3] || "Online Service";
        const msgId = parts[5] || "sync_1";
        const subj = parts[6] || "Incoming Email";
        const snip = parts[7] || "";

        if (!localList.some(m => m.id === msgId)) {
          const syncedMsg = {
            id: msgId,
            subject: subj,
            from: sName,
            snippet: snip,
            html: `<p><b>${escapeHtml(subj)}</b></p><p>${escapeHtml(snip)}</p>`,
            otp: otp,
            link: getLiveInboxUrl(cleanEmail),
            service: detectService(sName),
            time: new Date().toLocaleTimeString(),
            pushed: true
          };
          localList.unshift(syncedMsg);
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
      if (desc.startsWith(`MAP|${userPart}|`)) {
        const parts = desc.split("|");
        if (parts[2]) return parts[2];
      }
      if (desc.startsWith(`MSG|${userPart}|`)) {
        const parts = desc.split("|");
        if (parts[4]) return parts[4];
      }
    }
  } catch (e) {}
  return OWNER_ID || null;
}

function buildRichMailAlert(email, msgObj, isTempMail = false) {
  const sName = msgObj.service?.name || "Online Service";
  const sIcon = msgObj.service?.icon || "📩";
  const otp = msgObj.otp;
  const subject = msgObj.subject || "New Message";
  const snippet = msgObj.snippet || "";
  const liveInboxUrl = getLiveInboxUrl(email);

  let text =
    `🔔 <b>${sIcon} ${escapeHtml(sName.toUpperCase())} MAIL RECEIVED!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
    `📌 <b>Subject:</b> <b>${escapeHtml(subject.slice(0, 90))}</b>\n`;

  if (otp) {
    text += `🔑 <b>OTP Code:</b> <code>${escapeHtml(otp)}</code>\n`;
  } else {
    text += `ℹ️ <b>OTP Status:</b> <i>Code niche message text me dekhein</i>\n`;
  }

  if (snippet) {
    text += `\n📄 <b>Message Text:</b>\n<pre>${escapeHtml(snippet.slice(0, 280))}</pre>\n`;
  }

  const kbRows = [];
  if (otp) {
    kbRows.push([{ text: `📋 TAP TO COPY OTP: ${otp}`, copy_text: { text: String(otp) } }]);
  }
  kbRows.push([{ text: "🌐 Live Inbox Page (See Full Mail)", url: liveInboxUrl }]);
  if (msgObj.link && msgObj.link !== liveInboxUrl) {
    kbRows.push([{ text: "🔗 Direct Verification Link", url: msgObj.link }]);
  }

  if (isTempMail) {
    kbRows.push([
      { text: "🔄 Check New Mail", callback_data: `chk_temp:${email}` },
      { text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }
    ]);
  } else {
    kbRows.push([
      { text: "🔄 Refresh Inbox", callback_data: `chk_mail:${email}` },
      { text: "🔥 Next Account", callback_data: "get_stock" }
    ]);
  }
  kbRows.push([{ text: "🏠 Home", callback_data: "home" }]);

  return { text, reply_markup: { inline_keyboard: kbRows } };
}

// ================= BACKGROUND LISTENERS =================
async function startOAuthAutoPush(chatId, accountData, telegramApi) {
  const email = accountData.split(/[|:]/)[0]?.trim();
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const res = await getOAuth2MailboxOtp(accountData);
    if (res.otp || (res.allMessages && res.allMessages.length > 0)) {
      const latestMsg = res.allMessages[0] || { otp: res.otp, subject: res.subject, snippet: res.snippet, link: res.link, service: res.service };
      const alert = buildRichMailAlert(email, latestMsg, false);
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

      const alert = buildRichMailAlert(cleanEmail, newest, true);
      await send(chatId, alert.text, telegramApi, alert.reply_markup);
      break;
    }
  }
}

// ================= DATABASE HELPERS =================
async function getChannelDbState(telegramApi) {
  try {
    const res = await fetch(`${telegramApi}/getChat?chat_id=${DB_CHANNEL_ID}`).then(r => r.json());
    const pinned = res?.result?.pinned_message?.text || "";

    if (pinned.includes("DB_STORE:")) {
      const matchFile = pinned.match(/FILE:([a-zA-Z0-9_-]+)/);
      const matchIdx = pinned.match(/IDX:(\d+)/);
      const matchTotal = pinned.match(/TOTAL:(\d+)/);

      return {
        fileId: matchFile ? matchFile[1] : null,
        index: matchIdx ? parseInt(matchIdx[1], 10) : 0,
        total: matchTotal ? parseInt(matchTotal[1], 10) : 0,
        msgId: res.result.pinned_message.message_id
      };
    }
  } catch (e) {}
  return { fileId: null, index: 0, total: 0, msgId: null };
}

async function loadChannelFileLines(fileId, telegramApi) {
  if (CACHED_FILE_ID === fileId && CACHED_LINES && CACHED_LINES.length > 0) {
    return CACHED_LINES;
  }
  const fileInfo = await fetch(`${telegramApi}/getFile?file_id=${fileId}`).then(r => r.json());
  const content = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`).then(r => r.text());
  const lines = parseStrictStockLines(content);

  CACHED_FILE_ID = fileId;
  CACHED_LINES = lines;
  return lines;
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
  const dbText =
    `🗄️ <b>MASTER STOCK DATABASE (CHANNEL LEDGER)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Total Valid Stock: <code>${total}</code>\n` +
    `📤 Total Dispensed: <code>${newIndex}</code>\n` +
    `✅ Fresh Stock Baaki: <code>${remaining}</code>\n\n` +
    `<code>DB_STORE: FILE:${fileId} IDX:${newIndex} TOTAL:${total}</code>`;

  if (msgId) {
    await fetch(`${telegramApi}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: msgId, text: dbText, parse_mode: "HTML" })
    }).catch(() => {});
  }
}

async function send(chatId, text, telegramApi, reply_markup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => null);
}

async function edit(chatId, messageId, text, telegramApi, reply_markup = null) {
  if (!messageId) return send(chatId, text, telegramApi, reply_markup);
  const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (reply_markup) payload.reply_markup = reply_markup;
  return fetch(`${telegramApi}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => null);
}

async function deleteMessage(chatId, messageId, telegramApi) {
  if (!messageId) return;
  return fetch(`${telegramApi}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  }).catch(() => null);
}

// ================= LIVE WEBMAIL PAGE RENDERER (/inbox?email=...) =================
async function renderLiveWebmailPage(emailQuery, telegramApi) {
  const cleanEmail = (emailQuery || "").toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes("@")) return new Response("Invalid Email", { status: 400 });

  const domain = cleanEmail.split("@")[1] || "";
  let messages = [];

  if (domain === DEFAULT_DOMAIN) {
    messages = await getTempMailMessages(cleanEmail, telegramApi);
  } else {
    const accountLine = await findAccountLineByEmail(cleanEmail, telegramApi);
    messages = await getOAuth2MailboxMessages(accountLine);
  }

  const cardsHtml =
    messages.length === 0
      ? `<div class="empty-box"><h3>📭 Abhi Koi Message Nahi Aaya Hai</h3><p>Yeh page har 6 second me auto-refresh hota hai.</p></div>`
      : messages
          .map((m, idx) => {
            const otpBadge = m.otp
              ? `<div class="otp-banner" onclick="navigator.clipboard.writeText('${escapeHtml(m.otp)}');this.innerText='✅ COPIED: ${escapeHtml(m.otp)}'">
                  🔑 DETECTED OTP: <span>${escapeHtml(m.otp)}</span> (Tap to Copy)
                 </div>`
              : "";
            return `
            <div class="mail-card">
              <div class="mail-header">
                <span class="badge">#${idx + 1} ${escapeHtml(m.service?.icon || "📩")} ${escapeHtml(m.service?.name || "Mail")}</span>
                <span class="time">${escapeHtml(m.time || "Just now")}</span>
              </div>
              <div class="subject">${escapeHtml(m.subject || "No Subject")}</div>
              <div class="from">From: ${escapeHtml(m.from || "Sender")}</div>
              ${otpBadge}
              <div class="body-box">${escapeHtml(m.snippet || htmlToCleanText(m.html || ""))}</div>
            </div>`;
          })
          .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="6" />
  <title>Live Webmail - ${escapeHtml(cleanEmail)}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, sans-serif; }
    body { background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
    .container { max-width: 680px; margin: 0 auto; }
    .top-bar { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .email-title { font-size: 15px; font-weight: 700; color: #38bdf8; word-break: break-all; }
    .refresh-btn { background: #2563eb; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 13px; }
    .empty-box { background: #1e293b; border: 1px dashed #475569; border-radius: 14px; padding: 40px 20px; text-align: center; color: #94a3b8; }
    .mail-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
    .mail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #94a3b8; }
    .badge { background: #0f172a; color: #38bdf8; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
    .subject { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .from { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
    .otp-banner { background: #065f46; border: 1px solid #10b981; color: #ecfdf5; padding: 10px 14px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-bottom: 12px; cursor: pointer; text-align: center; }
    .otp-banner span { font-size: 20px; color: #fde047; letter-spacing: 2px; margin-left: 6px; }
    .body-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; font-size: 14px; line-height: 1.5; color: #e2e8f0; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-bar">
      <div>
        <div style="font-size:12px;color:#94a3b8;">🌐 LIVE INBOX (Auto-Refresh: 6s)</div>
        <div class="email-title">${escapeHtml(cleanEmail)}</div>
      </div>
      <a class="refresh-btn" href="/inbox?email=${encodeURIComponent(cleanEmail)}">🔄 Refresh Now</a>
    </div>
    ${cardsHtml}
  </div>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// ================= WORKER ENTRY =================
export default {
  async fetch(request, env, ctx) {
    initEnv(env, request.url);
    const url = new URL(request.url);
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}`;

    if (url.pathname === "/inbox") {
      return renderLiveWebmailPage(url.searchParams.get("email") || "", telegramApi);
    }

    if (request.method !== "POST") {
      return new Response(`AlokMail Pro Engine Running. Domain: @${DEFAULT_DOMAIN}`, { status: 200 });
    }

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
        from: mime.from || parsed.service?.name || "Sender",
        snippet: parsed.snippet || mime.bodyText.slice(0, 300),
        html: mime.bodyHtml || mime.bodyText,
        otp: parsed.otp,
        link: parsed.link,
        service: parsed.service,
        time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
        pushed: Boolean(targetChatId)
      };

      await saveTempMailState(toEmail, targetChatId, msgRecord, telegramApi);

      if (targetChatId) {
        const alert = buildRichMailAlert(toEmail, msgRecord, true);
        await send(targetChatId, alert.text, telegramApi, alert.reply_markup);
      }
    } catch (e) {}
  }
};

// ================= MAIN TELEGRAM ROUTER =================
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
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  if (userId === OWNER_ID) {
    if (text === "/export_unused" || data === "admin_export") {
      const db = await getChannelDbState(telegramApi);
      if (!db.fileId || db.index >= db.total) return send(chatId, "⚠️ <i>Koi unused stock baaki nahi hai.</i>", telegramApi);
      const wait = await send(chatId, "⏳ <i>File download ho rahi hai...</i>", telegramApi);
      const lines = await loadChannelFileLines(db.fileId, telegramApi);
      const unusedLines = lines.slice(db.index);

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("document", new Blob([unusedLines.join("\n")], { type: "text/plain" }), `fresh_stock_${unusedLines.length}.txt`);
      formData.append("caption", `📄 <b>Exported Remaining Accounts:</b> <code>${unusedLines.length}</code>`);

      await fetch(`${telegramApi}/sendDocument`, { method: "POST", body: formData });
      if (wait) deleteMessage(chatId, (await wait.json())?.result?.message_id, telegramApi);
      return;
    }

    if (text === "/clear_stock" || data === "admin_clear") {
      const db = await getChannelDbState(telegramApi);
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      if (db.msgId) await updateChannelDb("EMPTY", 0, 0, db.msgId, telegramApi);
      return messageId
        ? edit(chatId, messageId, "🧹 <b>Stock ledger successfully reset to 0!</b>", telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] })
        : send(chatId, "🧹 <b>Stock ledger reset to 0!</b>", telegramApi);
    }

    if (text === "/stock" || data === "admin_status") {
      const db = await getChannelDbState(telegramApi);
      const remaining = Math.max(0, db.total - db.index);
      const rep = `📊 <b>OWNER LIVE STOCK STATUS</b>\n━━━━━━━━━━━━━━━━━━\n📦 <b>Total:</b> <code>${db.total}</code>\n📤 <b>Dispensed:</b> <code>${db.index}</code>\n✅ <b>Fresh:</b> <code>${remaining}</code>`;
      const kb = { inline_keyboard: [[{ text: "📥 Export Unused", callback_data: "admin_export" }], [{ text: "🗑️ Reset Ledger", callback_data: "admin_clear" }], [{ text: "🏠 Home", callback_data: "home" }]] };
      return messageId ? edit(chatId, messageId, rep, telegramApi, kb) : send(chatId, rep, telegramApi, kb);
    }
  }

  if (msg?.document) {
    if (userId !== OWNER_ID) return send(chatId, "⚠️ <i>Kewal Bot Owner stock upload kar sakte hain!</i>", telegramApi);
    const doc = msg.document;
    if (!doc.file_name?.endsWith(".txt")) return send(chatId, "⚠️ <i>Sirf .txt file upload karein!</i>", telegramApi);

    const wait = await send(chatId, "⏳ <i>File read ki ja rahi hai...</i>", telegramApi);
    const waitId = wait ? (await wait.json())?.result?.message_id : null;

    try {
      const forwardRes = await fetch(`${telegramApi}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DB_CHANNEL_ID, document: doc.file_id, caption: `📁 Stock File Uploaded` })
      }).then(r => r.json());

      const finalFileId = forwardRes?.result?.document?.file_id || doc.file_id;
      CACHED_FILE_ID = null;
      CACHED_LINES = null;
      const lines = await loadChannelFileLines(finalFileId, telegramApi);

      if (lines.length === 0) return edit(chatId, waitId, "❌ <i>File ke andar koi valid email line nahi mili.</i>", telegramApi);

      const dbText = `🗄️ <b>MASTER STOCK DATABASE</b>\n━━━━━━━━━━━━━━━━━━\n📦 Total: <code>${lines.length}</code> | 📤 Dispensed: <code>0</code> | ✅ Fresh: <code>${lines.length}</code>\n\n<code>DB_STORE: FILE:${finalFileId} IDX:0 TOTAL:${lines.length}</code>`;
      const dbMsg = await send(DB_CHANNEL_ID, dbText, telegramApi);
      const dbMsgId = (await dbMsg.json())?.result?.message_id;

      if (dbMsgId) {
        await fetch(`${telegramApi}/pinChatMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: DB_CHANNEL_ID, message_id: dbMsgId, disable_notification: true })
        }).catch(() => {});
      }

      return edit(chatId, waitId, `✅ <b>Stock Successfully Uploaded & Pinned!</b>\n📦 <b>Valid Accounts:</b> <code>${lines.length}</code>`, telegramApi, { inline_keyboard: [[{ text: "📊 Status", callback_data: "admin_status" }], [{ text: "🏠 Home", callback_data: "home" }]] });
    } catch (e) {
      return edit(chatId, waitId, "❌ <i>Stock upload karne me error aaya.</i>", telegramApi);
    }
  }

  if (text === "/start" || data === "home") {
    const db = await getChannelDbState(telegramApi);
    const remaining = Math.max(0, db.total - db.index);

    const welcomeMsg =
      `🤖 <b>ALL-IN-ONE ENTERPRISE MAIL & LIVE INBOX BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Hotmail/Outlook Stock:</b> <code>${remaining}</code>\n` +
      `🌐 <b>Custom Temp Domain:</b> <code>@${escapeHtml(DEFAULT_DOMAIN)}</code>\n` +
      `🔑 <b>OTP Support:</b> <code>4, 6 & 8 Digits (Meta, IG, Google, etc.)</code>\n\n` +
      `💡 <i>Kisi bhi purane ya naye Email ka OTP lene ke liye seedha chat me Email bhejein!</i>`;

    const rows = [
      [{ text: "🔥 Get Fresh Hotmail/Outlook", callback_data: "get_stock" }],
      [{ text: `⚡ Generate Temp Mail (@${DEFAULT_DOMAIN})`, callback_data: "gen_temp" }]
    ];
    if (userId === OWNER_ID) rows.push([{ text: "📊 Owner Stock Panel", callback_data: "admin_status" }]);

    return messageId ? edit(chatId, messageId, welcomeMsg, telegramApi, { inline_keyboard: rows }) : send(chatId, welcomeMsg, telegramApi, { inline_keyboard: rows });
  }

  if (data === "get_stock" || text === "/get") {
    const db = await getChannelDbState(telegramApi);
    if (!db.fileId || db.index >= db.total) {
      const emptyMsg = "⚠️ <b>Out of Stock!</b>\n<i>Abhi koi fresh account uplabdh nahi hai.</i>";
      return messageId ? edit(chatId, messageId, emptyMsg, telegramApi, { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] }) : send(chatId, emptyMsg, telegramApi);
    }

    const lines = await loadChannelFileLines(db.fileId, telegramApi);
    const accountLine = lines[db.index];
    if (!accountLine) return send(chatId, "⚠️ <i>Stock read karne me error aaya.</i>", telegramApi);

    await updateChannelDb(db.fileId, db.index + 1, lines.length, db.msgId, telegramApi);

    const parts = accountLine.split(/[|:]/);
    const email = parts[0]?.trim() || "";
    const pass = parts[1]?.trim() || "N/A";
    const liveInboxUrl = getLiveInboxUrl(email);

    const msgText = `✅ <b>FRESH ACCOUNT DISPENSED</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n🔑 <b>Password:</b> <code>${escapeHtml(pass)}</code>\n⏳ <b>Status:</b> <i>Listening for OTP (4, 6, 8 digits)...</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Email", copy_text: { text: email } }, { text: "🔑 Copy Pass", copy_text: { text: pass } }],
        [{ text: "🔄 Check OTP Now", callback_data: `chk_mail:${email}` }],
        [{ text: "🌐 Live Inbox Page (Full Mail)", url: liveInboxUrl }],
        [{ text: "🔥 Next Account", callback_data: "get_stock" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    };

    await (messageId ? edit(chatId, messageId, msgText, telegramApi, kb) : send(chatId, msgText, telegramApi, kb));
    ctx.waitUntil(startOAuthAutoPush(chatId, accountLine, telegramApi));
    return;
  }

  if (data === "gen_temp" || text === "/temp") {
    const email = `${getRandomUser()}@${DEFAULT_DOMAIN}`;
    await saveTempMailState(email, chatId, null, telegramApi);
    const liveInboxUrl = getLiveInboxUrl(email);

    const tempMsg = `⚡ <b>CUSTOM TEMP MAIL GENERATED</b>\n━━━━━━━━━━━━━━━━━━\n📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n⏳ <b>Status:</b> <i>Auto-listening for incoming OTP...</i>`;

    const kb = {
      inline_keyboard: [
        [{ text: "📋 Copy Temp Mail", copy_text: { text: email } }],
        [{ text: "🔄 Check OTP Now", callback_data: `chk_temp:${email}` }],
        [{ text: "🌐 Live Inbox Page (Full Mail)", url: liveInboxUrl }],
        [{ text: "⚡ Naya Temp Mail", callback_data: "gen_temp" }, { text: "🏠 Home", callback_data: "home" }]
      ]
    };

    await (messageId ? edit(chatId, messageId, tempMsg, telegramApi, kb) : send(chatId, tempMsg, telegramApi, kb));
    ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi, null));
    return;
  }

  if (data?.startsWith("chk_temp:")) {
    const email = data.replace("chk_temp:", "").trim().toLowerCase();
    await saveTempMailState(email, chatId, null, telegramApi);
    const list = await getTempMailMessages(email, telegramApi);
    const liveInboxUrl = getLiveInboxUrl(email);

    if (list.length > 0) {
      const latest = list[0];
      const alert = buildRichMailAlert(email, latest, true);
      return messageId ? edit(chatId, messageId, alert.text, telegramApi, alert.reply_markup) : send(chatId, alert.text, telegramApi, alert.reply_markup);
    } else {
      ctx.waitUntil(startTempMailAutoPush(chatId, email, telegramApi, null));
      return send(chatId, `⏳ <code>${escapeHtml(email)}</code> par abhi koi mail nahi aaya hai.`, telegramApi, {
        inline_keyboard: [[{ text: "🌐 Open Live Inbox Page", url: liveInboxUrl }], [{ text: "🔄 Check Again", callback_data: `chk_temp:${email}` }, { text: "🏠 Home", callback_data: "home" }]]
      });
    }
  }

  if (data?.startsWith("chk_mail:") || text.includes("@")) {
    const rawQuery = data?.startsWith("chk_mail:") ? data.replace("chk_mail:", "").trim() : text.trim();
    const queryEmail = rawQuery.split(/[|:]/)[0].trim().toLowerCase();
    const domain = queryEmail.split("@")[1] || "";
    const liveInboxUrl = getLiveInboxUrl(queryEmail);

    if (domain === DEFAULT_DOMAIN) {
      await saveTempMailState(queryEmail, chatId, null, telegramApi);
      const list = await getTempMailMessages(queryEmail, telegramApi);
      const currentTopId = list[0]?.id || null;

      ctx.waitUntil(startTempMailAutoPush(chatId, queryEmail, telegramApi, currentTopId));

      if (list.length > 0) {
        const latest = list[0];
        const alert = buildRichMailAlert(queryEmail, latest, true);
        return send(chatId, `♻️ <b>TEMP MAIL RE-ACTIVATED</b>\n\n` + alert.text, telegramApi, alert.reply_markup);
      }

      return send(chatId, `♻️ <b>Temp Mail Active:</b> <code>${escapeHtml(queryEmail)}</code>\n⏳ <i>Purana email re-activate ho gaya hai, OTP bhejte hi yahan aa jayega!</i>`, telegramApi, {
        inline_keyboard: [[{ text: "🔄 Check OTP", callback_data: `chk_temp:${queryEmail}` }], [{ text: "🌐 Live Inbox Page", url: liveInboxUrl }], [{ text: "🏠 Home", callback_data: "home" }]]
      });
    }

    let targetAccountLine = rawQuery;
    if (!rawQuery.includes("|") && !rawQuery.includes(":")) {
      targetAccountLine = await findAccountLineByEmail(queryEmail, telegramApi);
    }

    const waitMsg = await send(chatId, `🔍 <code>${escapeHtml(queryEmail)}</code> <i>ka inbox check kiya ja raha hai...</i>`, telegramApi);
    const waitId = waitMsg ? (await waitMsg.json())?.result?.message_id : null;

    const res = await getOAuth2MailboxOtp(targetAccountLine);

    if (res.otp || (res.allMessages && res.allMessages.length > 0)) {
      const latestMsg = res.allMessages[0] || { otp: res.otp, subject: res.subject, snippet: res.snippet, link: res.link, service: res.service };
      const alert = buildRichMailAlert(queryEmail, latestMsg, false);
      return edit(chatId, waitId, alert.text, telegramApi, alert.reply_markup);
    } else {
      ctx.waitUntil(startOAuthAutoPush(chatId, targetAccountLine, telegramApi));
      const noOtpMsg = `📭 <b>Abhi Koi OTP Nahi Mila</b>\n📧 <code>${escapeHtml(queryEmail)}</code>\n⏳ <i>Background listener chalu hai!</i>`;
      return edit(chatId, waitId, noOtpMsg, telegramApi, {
        inline_keyboard: [[{ text: "🔄 Check Again", callback_data: `chk_mail:${queryEmail}` }], [{ text: "🌐 Live Inbox Page", url: liveInboxUrl }], [{ text: "🏠 Home", callback_data: "home" }]]
      });
    }
  }
}
