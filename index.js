/**
 * Simple Temp Mail Bot — Personal Use Only
 * Platform: Cloudflare Workers
 */

// Guerrilla Mail domains
const GUERRILLA_DOMAINS = [
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la'
];

// 1secmail domains
const SECMAIL_DOMAINS = [
  '1secmail.com',
  '1secmail.org',
  '1secmail.net'
];

const DOMAIN_LIST = [...GUERRILLA_DOMAINS, ...SECMAIL_DOMAINS];

// ================= MASSIVE REALISTIC FEMALE NAMES LIST =================
const FEMALE_FIRST_NAMES = [
  // --- Global / Western / European ---
  "emma", "olivia", "ava", "sophia", "isabella", "charlotte", "amelia", "mia", "harper", "evelyn",
  "abigail", "emily", "ella", "elizabeth", "camila", "luna", "sofia", "avery", "mila", "aria",
  "scarlett", "penelope", "layla", "chloe", "victoria", "madison", "eleanor", "grace", "nora", "riley",
  "zoey", "hannah", "hazel", "lily", "ellie", "violet", "lillian", "zoe", "stella", "aurora",
  "natalie", "emilia", "everly", "leah", "aubrey", "willow", "addison", "lucy", "audrey", "bella",
  "claire", "skylar", "maya", "sarah", "alyssa", "clara", "elena", "julia", "valentina", "isla",
  "eva", "naomi", "alina", "alessia", "bianca", "celeste", "diana", "fiona", "gemma", "helena",
  "iris", "jade", "kira", "lara", "melissa", "nina", "paula", "quinn", "rosa", "sienna",
  "talia", "valeria", "willa", "yasmin", "zara", "amber", "brooke", "carmen", "daisy", "esme",
  "freya", "georgia", "holly", "ivy", "jessica", "katie", "laura", "molly", "nicole", "paige",
  "rachel", "samantha", "tessa", "vanessa", "wendy", "alicia", "beatrice", "cassidy", "delilah",
  "felicity", "giselle", "heidi", "ingrid", "jocelyn", "kendra", "lorelei", "monica", "nadia", "odette",
  "priscilla", "rebecca", "serena", "tabitha", "veronica", "winona", "yvonne", "zelda", "adelaide", "bridget",
  // --- Indian / Desi Names ---
  "aanya", "aadhya", "aarohi", "ananya", "aditi", "diya", "ishita", "kavya", "khushi", "myra",
  "navya", "pooja", "priya", "riya", "saanvi", "shreya", "sneha", "tanvi", "tanya", "vaishnavi",
  "anushka", "deepika", "divya", "meera", "neha", "simran", "swati", "kriti", "nisha", "radha",
  "rashmi", "roshni", "sakshi", "sonam", "sunidhi", "mansi", "komal", "garima", "anjali", "bhavna",
  "payal", "preeti", "ruhi", "sonali", "sheetal", "pallavi", "kajal", "jyoti", "archana", "muskan",
  "alka", "amrita", "anita", "asha", "barkha", "chhavi", "damini", "drishti", "ekta", "geetika",
  "harshita", "heena", "isha", "jhanvi", "juhi", "kanchan", "karishma", "kiran", "latika", "madhu",
  "mahima", "monika", "nandini", "nidhi", "nikita", "parul", "prachi", "prerna", "ragini", "renu",
  "ritika", "rupa", "saloni", "sanya", "seema", "shalini", "shikha", "shruti", "smriti", "sonia",
  "soumya", "srishti", "surbhi", "tanisha", "trisha", "urvashi", "vandana", "vidhi", "yamini", "yashika",
  // --- Arabic / Middle Eastern & Slavic / Russian ---
  "aaliyah", "amira", "fatima", "layla", "leila", "mariam", "noor", "samira", "soraya", "zahra",
  "anastasia", "daria", "ekaterina", "katya", "ksenia", "margarita", "natasha", "olga", "polina", "svetlana",
  "tatiana", "valery", "viktoria", "yana", "yulia", "amina", "farida", "habiba", "iman", "jasmin"
];

const FEMALE_LAST_NAMES = [
  // --- Western / Latin Surnames ---
  "smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez", "martinez",
  "hernandez", "lopez", "gonzalez", "wilson", "anderson", "thomas", "taylor", "moore", "jackson", "martin",
  "lee", "perez", "thompson", "white", "harris", "sanchez", "clark", "ramirez", "lewis", "robinson",
  "walker", "young", "allen", "king", "wright", "scott", "torres", "nguyen", "hill", "flores",
  "green", "adams", "nelson", "baker", "hall", "rivera", "campbell", "mitchell", "carter", "roberts",
  "morales", "foster", "gray", "evans", "stone", "ross", "russell", "cooper", "ward", "peterson",
  "bailey", "reed", "kelly", "howard", "ramos", "cox", "diaz", "richardson", "wood", "watson",
  "brooks", "bennett", "gray", "mendoza", "ruiz", "hughes", "price", "alvarez", "castillo", "sanders",
  "patel", "myers", "long", "ross", "foster", "jimenez", "powell", "jenkins", "perry", "russell",
  "sullivan", "bell", "coleman", "butler", "henderson", "barnes", "gonzales", "fisher", "vasquez", "simmons",
  // --- Indian / Desi Surnames ---
  "sharma", "verma", "gupta", "mehta", "singh", "patel", "shah", "jain", "kapoor", "reddy",
  "nair", "rao", "joshi", "bhat", "mishra", "pandey", "yadav", "tiwari", "sinha", "das",
  "saxena", "bose", "sen", "ghosh", "banerjee", "chatterjee", "dutta", "chowdhury", "kaur", "gill",
  "dhillon", "sandhu", "sidhu", "grewal", "chauhan", "rathore", "shekhawat", "raghav", "tomar", "rawat",
  "negi", "bhatt", "pant", "agarwal", "bansal", "mittal", "goyal", "garg", "singhal", "mahajan",
  "kulkarni", "deshmukh", "patil", "pawar", "shinde", "jadhav", "gaikwad", "sawant", "kamble", "more",
  "menon", "pillai", "kurup", "varma", "nambiar", "shetty", "hegde", "rai", "acharya", "pai",
  "iyer", "iyengar", "krishnan", "raman", "subramanian", "natarajan", "balan", "swamy", "naidu", "chowdary"
];

// ================= HELPERS =================
function getRandomUser() {
  const first = FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const last = FEMALE_LAST_NAMES[Math.floor(Math.random() * FEMALE_LAST_NAMES.length)];
  const num2 = Math.floor(10 + Math.random() * 90);
  const num3 = Math.floor(100 + Math.random() * 900);
  const num4 = Math.floor(1000 + Math.random() * 9000);
  const birthYear = Math.floor(1994 + Math.random() * 12); // 1994 - 2005

  // 15+ variations -> Produces over 1,000,000+ realistic permutations
  const formats = [
    `${first}.${last}${num2}`,
    `${first}.${last}${birthYear}`,
    `${first}_${last}${num2}`,
    `${first}_${last}${birthYear}`,
    `${first}${last}${num2}`,
    `${first}${last}${num3}`,
    `${first}.${last}`,
    `${first}${birthYear}`,
    `${first}_${birthYear}`,
    `${first}${num4}`,
    `${first}_${num3}`,
    `${first}.${last.charAt(0)}${birthYear}`,
    `${first}${last.charAt(0)}${num3}`,
    `${first.charAt(0)}.${last}${num2}`,
    `${first}_official${num2}`,
    `${first}.real${num2}`
  ];

  return formats[Math.floor(Math.random() * formats.length)].toLowerCase();
}

function escapeHtml(str) {
  return (str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractSmartOtp(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const match =
    clean.match(/(?:OTP|code|verification code|passcode|secret code|pin|c\u00f3digo|pin code)\D{0,14}(\d{4,8})/i) ||
    clean.match(/\b\d{6,8}\b/) ||
    clean.match(/\b\d{4}\b/);
  return match ? (match[1] || match[0]) : null;
}

// ================= CLOUDFLARE WORKER ROUTER =================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Temp Mail Bot is running.", { status: 200 });
    }
    try {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
    } catch (e) {}
    return new Response("OK", { status: 200 });
  }
};

// ================= PROVIDER: GUERRILLA MAIL =================
async function createGuerrillaMailbox(domain) {
  const user = getRandomUser();
  const init = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address').then(r => r.json());
  const sid = init.sid_token || '';
  const setRes = await fetch(
    `https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(user)}&site=${encodeURIComponent(domain)}&lang=en&sid_token=${sid}`
  ).then(r => r.json());
  return { provider: 'g', email: (setRes.email_addr || `${user}@${domain}`).toLowerCase(), sid };
}

async function fetchGuerrillaMessages(sid) {
  try {
    const res = await fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${sid}`).then(r => r.json());
    return (res.list || [])
      .filter(m => m.mail_from !== 'no-reply@guerrillamail.com')
      .map(m => ({ id: m.mail_id, from: m.mail_from, subject: m.mail_subject }));
  } catch (e) { return []; }
}

async function fetchGuerrillaDetail(sid, mailId) {
  try {
    const data = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sid}`).then(r => r.json());
    return {
      from: data.mail_from || 'Unknown',
      subject: data.mail_subject || '(No Subject)',
      body: data.mail_body || ''
    };
  } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
}

// ================= PROVIDER: 1SECMAIL =================
async function createSecmailMailbox(domain) {
  const user = getRandomUser();
  return { provider: 's', email: `${user}@${domain}`, login: user, domain };
}

async function fetchSecmailMessages(login, domain) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
    );
    if (!res.ok) return [];
    const list = await res.json();
    return (list || []).map(m => ({ id: m.id, from: m.from, subject: m.subject }));
  } catch (e) { return []; }
}

async function fetchSecmailDetail(login, domain, mailId) {
  try {
    const res = await fetch(
      `https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${mailId}`
    );
    if (!res.ok) return { from: 'Unknown', subject: '', body: '' };
    const data = await res.json();
    return {
      from: data.from || 'Unknown',
      subject: data.subject || '(No Subject)',
      body: data.textBody || data.htmlBody || data.body || ''
    };
  } catch (e) { return { from: 'Unknown', subject: '', body: '' }; }
}

// ================= DISPATCH =================
async function createMailbox(domainChoice = null) {
  const domain = domainChoice || DOMAIN_LIST[Math.floor(Math.random() * DOMAIN_LIST.length)];
  if (SECMAIL_DOMAINS.includes(domain)) {
    return createSecmailMailbox(domain);
  }
  try {
    return await createGuerrillaMailbox(domain);
  } catch (e) {
    return createSecmailMailbox(SECMAIL_DOMAINS[0]);
  }
}

async function fetchMessages(provider, login, domain, sid) {
  return provider === 's' ? fetchSecmailMessages(login, domain) : fetchGuerrillaMessages(sid);
}

async function fetchDetail(provider, login, domain, sid, mailId) {
  return provider === 's' ? fetchSecmailDetail(login, domain, mailId) : fetchGuerrillaDetail(sid, mailId);
}

// ================= TELEGRAM ROUTER =================
async function handleTelegramUpdate(update, env) {
  const telegramApi = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const messageId = cb?.message?.message_id;
  const text = msg?.text?.trim();
  const data = cb?.data;

  if (!chatId) return;

  if (cb?.id) {
    await fetch(`${telegramApi}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
  }

  // Home / Start
  if (text === "/start" || data === "home") {
    const card =
      `📬 <b>TEMP MAIL BOT</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Generate a realistic disposable email address and check inboxes for OTPs instantly.`;
    const kb = {
      inline_keyboard: [
        [{ text: "⚡ Generate Temp Mail", callback_data: "gen" }],
        [{ text: "🌐 Switch Domain", callback_data: "domains" }]
      ]
    };
    return messageId ? edit(chatId, messageId, card, telegramApi, kb) : send(chatId, card, telegramApi, kb);
  }

  // Generate mailbox
  if (data === "gen" || (data && data.startsWith("dgen_"))) {
    const domainChoice = data.startsWith("dgen_") ? data.replace("dgen_", "") : null;
    const mb = await createMailbox(domainChoice);
    const token = `t:${mb.provider}:${mb.provider === 's' ? mb.login : ''}:${mb.email}:${mb.provider === 'g' ? mb.sid : ''}`;
    const domainName = mb.email.split('@')[1];

    const out =
      `📬 <b>DISPOSABLE ADDRESS READY</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📧 <b>Email:</b>\n<code>${mb.email}</code>\n\n` +
      `📡 <b>Server:</b> <code>${domainName}</code>\n` +
      `⏳ <i>Tap below to check inbox.</i>`;

    return edit(chatId, messageId, out, telegramApi, {
      inline_keyboard: [
        [{ text: "📩 Check Inbox", callback_data: token }],
        [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🌐 Switch Domain", callback_data: "domains" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    });
  }

  // Check inbox
  if (data && data.startsWith("t:")) {
    const parts = data.split(":");
    const provider = parts[1];
    const login = parts[2];
    const email = parts[3];
    const sid = parts[4] || '';
    const domain = email.split('@')[1];

    const list = await fetchMessages(provider, login, domain, sid);

    if (!list || list.length === 0) {
      return edit(chatId, messageId,
        `📭 <b>No messages yet</b>\n\n📧 <code>${email}</code>\n\n<i>Tap refresh to check again.</i>`,
        telegramApi,
        {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: data }],
            [{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home", callback_data: "home" }]
          ]
        });
    }

    let report = `📬 <b>INBOX (${list.length})</b>\n━━━━━━━━━━━━━━━━━━\n📧 <code>${email}</code>\n\n`;
    let detectedOtp = null;

    for (let i = 0; i < Math.min(list.length, 3); i++) {
      const detail = await fetchDetail(provider, login, domain, sid, list[i].id);
      const mail = {
        from: detail.from !== 'Unknown' ? detail.from : (list[i].from || 'Unknown'),
        subject: detail.subject || list[i].subject || '(No Subject)',
        body: detail.body
      };
      const fullText = (mail.subject || "") + " " + (mail.body || "");
      const otp = extractSmartOtp(fullText);
      if (otp && !detectedOtp) detectedOtp = otp;

      report += `📩 <b>From:</b> <code>${escapeHtml(mail.from)}</code>\n`;
      report += `📝 <b>Subject:</b> <i>${escapeHtml(mail.subject)}</i>\n`;
      if (otp) report += `🔑 <b>OTP:</b> <code>${otp}</code>\n`;
      report += `━━━━━━━━━━━━━━━━━━\n`;
    }

    const kbRows = [[{ text: "🔄 Refresh", callback_data: data }]];
    kbRows.push([{ text: "⚡ New Mail", callback_data: "gen" }, { text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, report, telegramApi, { inline_keyboard: kbRows });
  }

  // Domain switcher
  if (data === "domains") {
    const rows = [];
    for (let i = 0; i < DOMAIN_LIST.length; i += 2) {
      const row = [{ text: `@${DOMAIN_LIST[i]}`, callback_data: `dgen_${DOMAIN_LIST[i]}` }];
      if (DOMAIN_LIST[i + 1]) row.push({ text: `@${DOMAIN_LIST[i + 1]}`, callback_data: `dgen_${DOMAIN_LIST[i + 1]}` });
      rows.push(row);
    }
    rows.push([{ text: "🏠 Home", callback_data: "home" }]);
    return edit(chatId, messageId, `🌐 <b>Select Domain:</b>`, telegramApi, { inline_keyboard: rows });
  }
}

// ================= TELEGRAM SEND HELPERS =================
async function send(chatId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  return fetch(`${telegramApi}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function edit(chatId, msgId, text, telegramApi, kb = null) {
  const payload = { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (kb) payload.reply_markup = kb;
  const res = await fetch(`${telegramApi}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return send(chatId, text, telegramApi, kb);
  return res;
}
