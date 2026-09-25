/**
 * ============================================================
 * TELEGRAM TEST MAIL + OTP PANEL
 * Cloudflare Workers
 * Database: Telegram Channel pinned JSON message
 * KV: NOT USED
 * ============================================================
 *
 * IMPORTANT:
 * 1. Bot must be ADMIN of DB channel.
 * 2. DB channel should have a pinned JSON database message.
 * 3. Replace all PUT_... placeholders below.
 * 4. This system handles ONLY application-generated TEST OTPs.
 *    It does not intercept Instagram/Meta/third-party OTPs.
 * ============================================================
 */

const BOT_TOKEN = "8943075720:AAHjufjd3Ll_AdvvqqeaN2n1d0FdNpyQSz0";
const OWNER_ID = "8452322818";
const DB_CHANNEL_ID = "-1004474665956";
const DEFAULT_DOMAIN = "vibepulsemedia.online";
/* =========================
   LIMITS
========================= */

const MAX_USERS = 5000;
const MAX_ADMINS = 50;
const MAX_EMAILS_PER_USER = 20;
const MAX_OTP_HISTORY = 10;
const MAX_AUDIT_LOGS = 200;
const MAX_BROADCAST_USERS = 5000;

const USER_COOLDOWN_MS = 20 * 1000;
const OTP_EXPIRE_MS = 10 * 60 * 1000;

/* =========================
   RUNTIME STATE
========================= */

const runtimeCooldown = new Map();
const runtimeLocks = new Map();

/* =========================
   FEMALE TEST NAMES
========================= */

const FEMALE_FIRST_NAMES = [
  "Aarohi",
  "Aanya",
  "Anaya",
  "Diya",
  "Isha",
  "Kiara",
  "Kavya",
  "Meera",
  "Naina",
  "Riya",
  "Sana",
  "Sara",
  "Tanya",
  "Vanya",
  "Zoya",
  "Maya",
  "Anika",
  "Avni",
  "Myra",
  "Navya",
  "Pihu",
  "Rhea",
  "Simran",
  "Tara",
  "Aisha"
];

const FEMALE_LAST_NAMES = [
  "Sharma",
  "Verma",
  "Singh",
  "Kapoor",
  "Mehta",
  "Malhotra",
  "Patel",
  "Khan",
  "Joshi",
  "Agarwal",
  "Gupta",
  "Chopra",
  "Bhatia",
  "Arora",
  "Sethi",
  "Rao",
  "Shah",
  "Khanna",
  "Mishra",
  "Iyer"
];

/* =========================
   DEFAULT DATABASE
========================= */

function createDefaultDB() {
  return {
    version: 1,

    settings: {
      domain: DEFAULT_DOMAIN,
      bot_enabled: true,
      maintenance: false
    },

    admins: [
      String(OWNER_ID)
    ],

    users: {},

    emails: {},

    test_inboxes: {},

    audit_logs: [],

    stats: {
      generated_emails: 0,
      generated_otps: 0,
      users_created: 0,
      broadcasts: 0
    }
  };
}

/* ============================================================
   CLOUDFLARE ENTRY
============================================================ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      if (url.pathname === "/") {
        return new Response(
          "Telegram Test Mail Engine is running.",
          { status: 200 }
        );
      }

      if (url.pathname === "/health") {
        return Response.json({
          ok: true,
          service: "telegram-test-mail-engine",
          database: "telegram-channel-json"
        });
      }

      return new Response("Not Found", { status: 404 });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const secret =
        request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";

      if (WEBHOOK_SECRET !== "PUT_RANDOM_WEBHOOK_SECRET_HERE") {
        if (secret !== WEBHOOK_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      let update;

      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }

      ctx.waitUntil(handleTelegramUpdate(update));

      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
};

/* ============================================================
   TELEGRAM UPDATE ROUTER
============================================================ */

async function handleTelegramUpdate(update) {
  try {
    if (update.message) {
      await handleMessage(update.message);
      return;
    }

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }
  } catch (err) {
    console.error("Update error:", err);
  }
}

/* ============================================================
   MESSAGE HANDLER
============================================================ */

async function handleMessage(message) {
  const chatId = message.chat?.id;
  const userId = message.from?.id;

  if (!chatId || !userId) return;

  const text = String(message.text || "").trim();

  const db = await loadDB();

  await ensureUser(db, message.from);

  if (text === "/start") {
    await saveDB(db);

    await sendMainMenu(chatId, message.from);
    return;
  }

  if (text === "/admin") {
    if (!isAdmin(db, userId)) {
      await sendText(chatId, "❌ Admin access required.");
      return;
    }

    await sendAdminPanel(chatId);
    return;
  }

  if (text === "/help") {
    await sendHelp(chatId);
    return;
  }

  if (text.startsWith("/")) {
    await sendMainMenu(chatId, message.from);
    return;
  }

  await sendMainMenu(chatId, message.from);
}

/* ============================================================
   CALLBACK HANDLER
============================================================ */

async function handleCallback(query) {
  const userId = query.from.id;
  const chatId = query.message?.chat?.id;

  if (!chatId) return;

  await answerCallback(query.id);

  const data = String(query.data || "");

  const db = await loadDB();

  await ensureUser(db, query.from);

  /* ---------- USER ---------- */

  if (data === "home") {
    await saveDB(db);
    await sendMainMenu(chatId, query.from);
    return;
  }

  if (data === "generate_email") {
    await generateTestEmail(db, chatId, userId);
    return;
  }

  if (data === "custom_email") {
    await requestCustomEmail(chatId);
    return;
  }

  if (data === "my_emails") {
    await showMyEmails(db, chatId, userId);
    return;
  }

  if (data === "my_inbox") {
    await showMyInbox(db, chatId, userId);
    return;
  }

  if (data === "generate_test_otp") {
    await generateTestOTP(db, chatId, userId);
    return;
  }

  if (data === "otp_history") {
    await showOTPHistory(db, chatId, userId);
    return;
  }

  if (data === "my_profile") {
    await showProfile(db, chatId, userId);
    return;
  }

  if (data === "settings") {
    await showUserSettings(chatId);
    return;
  }

  if (data === "help") {
    await sendHelp(chatId);
    return;
  }

  /* ---------- ADMIN ---------- */

  if (data === "admin_panel") {
    if (!isAdmin(db, userId)) {
      await sendText(chatId, "❌ Access denied.");
      return;
    }

    await sendAdminPanel(chatId);
    return;
  }

  if (data === "admin_stats") {
    if (!isAdmin(db, userId)) return deny(chatId);

    await showAdminStats(db, chatId);
    return;
  }

  if (data === "admin_users") {
    if (!isAdmin(db, userId)) return deny(chatId);

    await showAdminUsers(db, chatId);
    return;
  }

  if (data === "admin_list") {
    if (!isAdmin(db, userId)) return deny(chatId);

    await showAdminList(db, chatId);
    return;
  }

  if (data === "admin_domain") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    await showDomainPanel(db, chatId);
    return;
  }

  if (data === "admin_add") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    await sendText(
      chatId,
      "➕ Add Admin\n\n" +
      "Use:\n" +
      "`/addadmin USER_ID`\n\n" +
      "Example:\n" +
      "`/addadmin 123456789`"
    );
    return;
  }

  if (data === "admin_remove") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    await sendText(
      chatId,
      "➖ Remove Admin\n\n" +
      "Use:\n" +
      "`/removeadmin USER_ID`"
    );
    return;
  }

  if (data === "admin_transfer") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    await sendText(
      chatId,
      "👑 Transfer Ownership\n\n" +
      "Use:\n" +
      "`/transfer USER_ID`\n\n" +
      "The current owner will remain an admin."
    );
    return;
  }

  if (data === "admin_broadcast") {
    if (!isAdmin(db, userId)) return deny(chatId);

    await sendText(
      chatId,
      "📢 Broadcast\n\n" +
      "Use:\n" +
      "`/broadcast YOUR MESSAGE`"
    );
    return;
  }

  if (data === "admin_audit") {
    if (!isAdmin(db, userId)) return deny(chatId);

    await showAuditLogs(db, chatId);
    return;
  }

  if (data === "admin_db") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    await sendText(
      chatId,
      "💾 Database\n\n" +
      "The database is stored in the pinned JSON message of the configured Telegram Channel.\n\n" +
      "Use `/dbinfo` for database information."
    );
    return;
  }

  /* ---------- COPY EMAIL ---------- */

  if (data.startsWith("copy_email:")) {
    const emailId = data.split(":")[1];

    const item = db.emails[emailId];

    if (!item || String(item.user_id) !== String(userId)) {
      await sendText(chatId, "❌ This email does not belong to you.");
      return;
    }

    await sendText(
      chatId,
      "📋 Email:\n\n`" + escapeMarkdown(item.email) + "`"
    );

    return;
  }

  /* ---------- COPY OTP ---------- */

  if (data.startsWith("show_otp:")) {
    const otpId = data.split(":")[1];

    const inbox = db.test_inboxes[String(userId)] || [];

    const otp = inbox.find(x => x.id === otpId);

    if (!otp) {
      await sendText(chatId, "❌ OTP not found.");
      return;
    }

    if (Date.now() > otp.expires_at) {
      await sendText(chatId, "⌛ This test OTP has expired.");
      return;
    }

    await sendText(
      chatId,
      "🔐 Your test OTP\n\n" +
      "`" + otp.code + "`\n\n" +
      "⚠️ This is an application-generated TEST OTP."
    );

    return;
  }

  /* ---------- CUSTOM DOMAIN ---------- */

  if (data === "domain_default") {
    if (!isOwner(db, userId)) return ownerOnly(chatId);

    db.settings.domain = DEFAULT_DOMAIN;

    addAudit(
      db,
      userId,
      "domain_reset",
      DEFAULT_DOMAIN
    );

    await saveDB(db);

    await sendText(
      chatId,
      "✅ Domain reset to:\n`" + escapeMarkdown(DEFAULT_DOMAIN) + "`"
    );

    return;
  }

  /* ---------- UNKNOWN ---------- */

  await sendMainMenu(chatId, query.from);
}

/* ============================================================
   MAIN MENU
============================================================ */

async function sendMainMenu(chatId, user) {
  const db = await loadDB();

  const maintenance = db.settings.maintenance;

  if (maintenance && !isAdmin(db, user.id)) {
    await sendText(
      chatId,
      "🛠️ Maintenance mode is active.\nPlease try again later."
    );
    return;
  }

  const keyboard = [
    [
      {
        text: "📧 Generate Test Email",
        callback_data: "generate_email"
      }
    ],
    [
      {
        text: "✏️ Custom Email",
        callback_data: "custom_email"
      },
      {
        text: "📥 My Inbox",
        callback_data: "my_inbox"
      }
    ],
    [
      {
        text: "🔢 Generate Test OTP",
        callback_data: "generate_test_otp"
      },
      {
        text: "🕘 OTP History",
        callback_data: "otp_history"
      }
    ],
    [
      {
        text: "📋 My Emails",
        callback_data: "my_emails"
      }
    ],
    [
      {
        text: "👤 Profile",
        callback_data: "my_profile"
      },
      {
        text: "⚙️ Settings",
        callback_data: "settings"
      }
    ],
    [
      {
        text: "❓ Help",
        callback_data: "help"
      }
    ]
  ];

  if (isAdmin(db, user.id)) {
    keyboard.push([
      {
        text: "👑 Admin Panel",
        callback_data: "admin_panel"
      }
    ]);
  }

  await sendMessage(
    chatId,
    "🌐 *Professional Test Mail Engine*\n\n" +
    "Welcome, *" +
    escapeMarkdown(user.first_name || "User") +
    "*.\n\n" +
    "Choose an option below.\n\n" +
    "📌 Domain: `" +
    escapeMarkdown(db.settings.domain) +
    "`\n" +
    "🔐 OTP mode: TEST ONLY",
    keyboard
  );
}

/* ============================================================
   GENERATE TEST EMAIL
============================================================ */

async function generateTestEmail(db, chatId, userId) {
  if (!checkCooldown(userId)) {
    await sendText(
      chatId,
      "⏳ Please wait a few seconds before generating another address."
    );
    return;
  }

  const first =
    randomItem(FEMALE_FIRST_NAMES).toLowerCase();

  const last =
    randomItem(FEMALE_LAST_NAMES).toLowerCase();

  const number =
    Math.floor(100 + Math.random() * 900);

  const localPart =
    `${first}.${last}${number}`;

  const email =
    `${localPart}@${db.settings.domain}`;

  const emailId =
    "em_" + randomId();

  db.emails[emailId] = {
    id: emailId,
    user_id: String(userId),
    email,
    created_at: Date.now(),
    active: true
  };

  const user = db.users[String(userId)];

  user.email_ids = user.email_ids || [];

  user.email_ids.unshift(emailId);

  user.email_ids =
    user.email_ids.slice(0, MAX_EMAILS_PER_USER);

  db.stats.generated_emails++;

  addAudit(
    db,
    userId,
    "generate_test_email",
    email
  );

  await saveDB(db);

  await sendMessage(
    chatId,
    "✅ *Test Email Created*\n\n" +
    "📧 `" + escapeMarkdown(email) + "`\n\n" +
    "This address belongs to your test account.\n" +
    "It does not intercept third-party service mail.",
    [
      [
        {
          text: "📋 Copy",
          copy_text: {
            text: email
          }
        }
      ],
      [
        {
          text: "🔢 Generate Test OTP",
          callback_data: "generate_test_otp"
        }
      ],
      [
        {
          text: "📥 My Inbox",
          callback_data: "my_inbox"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   CUSTOM EMAIL
============================================================ */

async function requestCustomEmail(chatId) {
  await sendText(
    chatId,
    "✏️ *Custom Email*\n\n" +
    "Use this command:\n\n" +
    "`/custom username`\n\n" +
    "Example:\n" +
    "`/custom mytest123`\n\n" +
    "The domain will be your configured test domain."
  );
}

/* ============================================================
   MY EMAILS
============================================================ */

async function showMyEmails(db, chatId, userId) {
  const user = db.users[String(userId)];

  if (!user || !user.email_ids?.length) {
    await sendMessage(
      chatId,
      "📭 You have no test emails yet.",
      [
        [
          {
            text: "📧 Generate Email",
            callback_data: "generate_email"
          }
        ],
        [
          {
            text: "🏠 Home",
            callback_data: "home"
          }
        ]
      ]
    );

    return;
  }

  const rows = [];

  for (const id of user.email_ids.slice(0, 10)) {
    const email = db.emails[id];

    if (!email) continue;

    rows.push([
      {
        text: "📧 " + email.email,
        callback_data: "copy_email:" + id
      }
    ]);
  }

  rows.push([
    {
      text: "📧 New Email",
      callback_data: "generate_email"
    }
  ]);

  rows.push([
    {
      text: "🏠 Home",
      callback_data: "home"
    }
  ]);

  await sendMessage(
    chatId,
    "📋 *Your Test Emails*\n\n" +
    "Tap an address to display it.",
    rows
  );
}

/* ============================================================
   TEST OTP GENERATION
============================================================ */

async function generateTestOTP(db, chatId, userId) {
  if (!checkCooldown(userId)) {
    await sendText(
      chatId,
      "⏳ Please wait before generating another test OTP."
    );
    return;
  }

  const user = db.users[String(userId)];

  if (!user.email_ids?.length) {
    await sendMessage(
      chatId,
      "📧 Create a test email first.",
      [
        [
          {
            text: "Generate Email",
            callback_data: "generate_email"
          }
        ]
      ]
    );

    return;
  }

  const emailId = user.email_ids[0];
  const email = db.emails[emailId];

  if (!email) {
    await sendText(chatId, "❌ Email not found.");
    return;
  }

  const code =
    String(
      Math.floor(
        100000 + Math.random() * 900000
      )
    );

  const otpId =
    "otp_" + randomId();

  const otp = {
    id: otpId,
    user_id: String(userId),
    email_id: emailId,
    email: email.email,
    code,
    created_at: Date.now(),
    expires_at: Date.now() + OTP_EXPIRE_MS
  };

  if (!db.test_inboxes[String(userId)]) {
    db.test_inboxes[String(userId)] = [];
  }

  db.test_inboxes[String(userId)].unshift(otp);

  db.test_inboxes[String(userId)] =
    db.test_inboxes[String(userId)]
      .slice(0, MAX_OTP_HISTORY);

  db.stats.generated_otps++;

  addAudit(
    db,
    userId,
    "generate_test_otp",
    email.email
  );

  await saveDB(db);

  await sendMessage(
    chatId,
    "🔐 *TEST OTP GENERATED*\n\n" +
    "📧 `" + escapeMarkdown(email.email) + "`\n\n" +
    "🔢 Code:\n" +
    "`" + code + "`\n\n" +
    "⏳ Valid for 10 minutes.\n\n" +
    "⚠️ This code was generated by this application. " +
    "It is not an intercepted third-party OTP.",
    [
      [
        {
          text: "📋 Copy OTP",
          copy_text: {
            text: code
          }
        }
      ],
      [
        {
          text: "🕘 History",
          callback_data: "otp_history"
        }
      ],
      [
        {
          text: "📥 Inbox",
          callback_data: "my_inbox"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   MY INBOX
============================================================ */

async function showMyInbox(db, chatId, userId) {
  const inbox =
    db.test_inboxes[String(userId)] || [];

  if (!inbox.length) {
    await sendMessage(
      chatId,
      "📭 *Inbox Empty*\n\n" +
      "Generate a test OTP to create an inbox message.",
      [
        [
          {
            text: "🔢 Generate Test OTP",
            callback_data: "generate_test_otp"
          }
        ],
        [
          {
            text: "🏠 Home",
            callback_data: "home"
          }
        ]
      ]
    );

    return;
  }

  const latest = inbox[0];

  const expired =
    Date.now() > latest.expires_at;

  let text =
    "📥 *Your Test Inbox*\n\n" +
    "📧 `" +
    escapeMarkdown(latest.email) +
    "`\n\n" +
    "🔢 Latest test message\n" +
    "🕐 " +
    formatDate(latest.created_at) +
    "\n";

  if (expired) {
    text += "\n⌛ Latest OTP expired.";
  } else {
    text += "\n✅ Latest OTP is active.";
  }

  await sendMessage(
    chatId,
    text,
    [
      [
        {
          text: "👁️ Show Latest OTP",
          callback_data: "show_otp:" + latest.id
        }
      ],
      [
        {
          text: "🕘 OTP History",
          callback_data: "otp_history"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   OTP HISTORY
============================================================ */

async function showOTPHistory(db, chatId, userId) {
  const inbox =
    db.test_inboxes[String(userId)] || [];

  if (!inbox.length) {
    await sendText(chatId, "📭 No test OTP history.");
    return;
  }

  const lines = [];

  for (const item of inbox.slice(0, 10)) {
    const expired =
      Date.now() > item.expires_at;

    lines.push(
      "• `" +
      item.code +
      "` — " +
      (expired ? "⌛ expired" : "✅ active") +
      "\n  " +
      formatDate(item.created_at)
    );
  }

  await sendMessage(
    chatId,
    "🕘 *Your Test OTP History*\n\n" +
    lines.join("\n\n") +
    "\n\n⚠️ History contains only OTPs generated by this application.",
    [
      [
        {
          text: "📥 Inbox",
          callback_data: "my_inbox"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   PROFILE
============================================================ */

async function showProfile(db, chatId, userId) {
  const user = db.users[String(userId)];

  await sendMessage(
    chatId,
    "👤 *Your Profile*\n\n" +
    "🆔 ID: `" + userId + "`\n" +
    "👤 Name: " +
    escapeMarkdown(user.first_name || "Unknown") +
    "\n" +
    "📅 Joined: " +
    formatDate(user.created_at) +
    "\n" +
    "📧 Emails: " +
    (user.email_ids?.length || 0) +
    "\n" +
    "🔢 Test OTPs: " +
    ((db.test_inboxes[String(userId)] || []).length),
    [
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   USER SETTINGS
============================================================ */

async function showUserSettings(chatId) {
  await sendMessage(
    chatId,
    "⚙️ *Settings*\n\n" +
    "Your test account uses the domain configured by the owner.\n\n" +
    "🔐 OTP access:\n" +
    "Only your own application-generated test OTPs are visible to you.\n\n" +
    "🛡️ Third-party OTP interception is not enabled.",
    [
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   HELP
============================================================ */

async function sendHelp(chatId) {
  await sendMessage(
    chatId,
    "❓ *Help*\n\n" +
    "📧 Generate Test Email\n" +
    "Creates a female-name based test address.\n\n" +
    "✏️ Custom Email\n" +
    "Creates a custom test address using your configured domain.\n\n" +
    "🔢 Test OTP\n" +
    "Creates a six-digit OTP generated by this application.\n\n" +
    "📥 Inbox\n" +
    "Shows your own test inbox.\n\n" +
    "🕘 OTP History\n" +
    "Shows your own generated test OTP history.\n\n" +
    "⚠️ This bot does not intercept or retrieve Instagram, Meta, Google, banking, or other third-party verification codes.",
    [
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   ADMIN PANEL
============================================================ */

async function sendAdminPanel(chatId) {
  const db = await loadDB();

  await sendMessage(
    chatId,
    "👑 *ADMIN CONTROL PANEL*\n\n" +
    "Select an operation:",
    [
      [
        {
          text: "📊 Statistics",
          callback_data: "admin_stats"
        },
        {
          text: "👥 Users",
          callback_data: "admin_users"
        }
      ],
      [
        {
          text: "🛡️ Admins",
          callback_data: "admin_list"
        }
      ],
      [
        {
          text: "➕ Add Admin",
          callback_data: "admin_add"
        },
        {
          text: "➖ Remove Admin",
          callback_data: "admin_remove"
        }
      ],
      [
        {
          text: "👑 Transfer Owner",
          callback_data: "admin_transfer"
        }
      ],
      [
        {
          text: "🌐 Custom Domain",
          callback_data: "admin_domain"
        }
      ],
      [
        {
          text: "📢 Broadcast",
          callback_data: "admin_broadcast"
        },
        {
          text: "📝 Audit Logs",
          callback_data: "admin_audit"
        }
      ],
      [
        {
          text: "💾 Database",
          callback_data: "admin_db"
        }
      ],
      [
        {
          text: "🏠 User Panel",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   ADMIN STATS
============================================================ */

async function showAdminStats(db, chatId) {
  const users =
    Object.keys(db.users).length;

  const emails =
    Object.keys(db.emails).length;

  const otpCount =
    Object.values(db.test_inboxes)
      .reduce(
        (sum, arr) => sum + arr.length,
        0
      );

  await sendMessage(
    chatId,
    "📊 *SYSTEM STATISTICS*\n\n" +
    "👥 Users: `" + users + "`\n" +
    "📧 Emails: `" + emails + "`\n" +
    "🔢 Test OTP records: `" + otpCount + "`\n" +
    "📨 Generated emails: `" +
    db.stats.generated_emails +
    "`\n" +
    "🔐 Generated test OTPs: `" +
    db.stats.generated_otps +
    "`\n" +
    "📢 Broadcasts: `" +
    db.stats.broadcasts +
    "`\n\n" +
    "🌐 Domain: `" +
    escapeMarkdown(db.settings.domain) +
    "`",
    [
      [
        {
          text: "🔄 Refresh",
          callback_data: "admin_stats"
        }
      ],
      [
        {
          text: "👑 Admin Panel",
          callback_data: "admin_panel"
        }
      ]
    ]
  );
}

/* ============================================================
   ADMIN USERS
============================================================ */

async function showAdminUsers(db, chatId) {
  const users =
    Object.values(db.users);

  if (!users.length) {
    await sendText(chatId, "No users.");
    return;
  }

  const latest =
    users
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20);

  const lines =
    latest.map(
      (u, i) =>
        `${i + 1}. ${u.first_name || "User"} — \`${u.id}\``
    );

  await sendMessage(
    chatId,
    "👥 *Recent Users*\n\n" +
    lines.join("\n") +
    "\n\nFor a specific user:\n" +
    "`/user USER_ID`",
    [
      [
        {
          text: "👑 Admin Panel",
          callback_data: "admin_panel"
        }
      ]
    ]
  );
}

/* ============================================================
   ADMIN LIST
============================================================ */

async function showAdminList(db, chatId) {
  const lines =
    db.admins.map(
      (id, index) =>
        `${index + 1}. \`${id}\`` +
        (String(id) === String(OWNER_ID)
          ? " 👑 OWNER"
          : "")
    );

  await sendMessage(
    chatId,
    "🛡️ *ADMIN LIST*\n\n" +
    lines.join("\n"),
    [
      [
        {
          text: "➕ Add Admin",
          callback_data: "admin_add"
        },
        {
          text: "➖ Remove Admin",
          callback_data: "admin_remove"
        }
      ],
      [
        {
          text: "👑 Admin Panel",
          callback_data: "admin_panel"
        }
      ]
    ]
  );
}

/* ============================================================
   DOMAIN PANEL
============================================================ */

async function showDomainPanel(db, chatId) {
  await sendMessage(
    chatId,
    "🌐 *CUSTOM DOMAIN*\n\n" +
    "Current domain:\n" +
    "`" +
    escapeMarkdown(db.settings.domain) +
    "`\n\n" +
    "Change it with:\n" +
    "`/domain example.com`\n\n" +
    "⚠️ Cloudflare DNS/Email Routing must also be configured separately. " +
    "Changing this setting alone does not create DNS records.",
    [
      [
        {
          text: "↩️ Reset Default",
          callback_data: "domain_default"
        }
      ],
      [
        {
          text: "👑 Admin Panel",
          callback_data: "admin_panel"
        }
      ]
    ]
  );
}

/* ============================================================
   AUDIT LOGS
============================================================ */

async function showAuditLogs(db, chatId) {
  const logs =
    db.audit_logs.slice(0, 20);

  if (!logs.length) {
    await sendText(chatId, "📝 No audit logs.");
    return;
  }

  const lines =
    logs.map(
      x =>
        "• `" +
        formatDate(x.time) +
        "`\n" +
        x.action +
        "\nUser: `" +
        x.user_id +
        "`\n" +
        escapeMarkdown(String(x.detail || ""))
    );

  await sendMessage(
    chatId,
    "📝 *AUDIT LOGS*\n\n" +
    lines.join("\n\n"),
    [
      [
        {
          text: "👑 Admin Panel",
          callback_data: "admin_panel"
        }
      ]
    ]
  );
}

/* ============================================================
   COMMANDS
============================================================ */

async function handleAdminCommand(db, message) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = String(message.text || "");

  if (!isAdmin(db, userId)) {
    await deny(chatId);
    return true;
  }

  if (text.startsWith("/addadmin ")) {
    if (!isOwner(db, userId)) {
      await ownerOnly(chatId);
      return true;
    }

    const target =
      text.split(/\s+/)[1];

    if (!target) return true;

    if (!db.admins.includes(String(target))) {
      if (db.admins.length >= MAX_ADMINS) {
        await sendText(chatId, "❌ Admin limit reached.");
        return true;
      }

      db.admins.push(String(target));

      addAudit(
        db,
        userId,
        "add_admin",
        target
      );

      await saveDB(db);
    }

    await sendText(
      chatId,
      "✅ Admin added:\n`" + target + "`"
    );

    return true;
  }

  if (text.startsWith("/removeadmin ")) {
    if (!isOwner(db, userId)) {
      await ownerOnly(chatId);
      return true;
    }

    const target =
      text.split(/\s+/)[1];

    if (!target) return true;

    if (String(target) === String(OWNER_ID)) {
      await sendText(
        chatId,
        "❌ Owner cannot be removed."
      );
      return true;
    }

    db.admins =
      db.admins.filter(
        x => String(x) !== String(target)
      );

    addAudit(
      db,
      userId,
      "remove_admin",
      target
    );

    await saveDB(db);

    await sendText(
      chatId,
      "✅ Admin removed:\n`" + target + "`"
    );

    return true;
  }

  if (text.startsWith("/transfer ")) {
    if (!isOwner(db, userId)) {
      await ownerOnly(chatId);
      return true;
    }

    const target =
      text.split(/\s+/)[1];

    if (!target) return true;

    /*
     * Safe ownership transfer:
     * new owner is added to admins.
     *
     * The immutable OWNER_ID constant is not
     * overwritten at runtime because it is a
     * configuration value.
     *
     * For actual deployment, change OWNER_ID
     * after transfer.
     */

    if (!db.admins.includes(String(target))) {
      db.admins.push(String(target));
    }

    db.settings.pending_owner =
      String(target);

    addAudit(
      db,
      userId,
      "owner_transfer_requested",
      target
    );

    await saveDB(db);

    await sendText(
      chatId,
      "👑 Transfer request recorded for:\n" +
      "`" + target + "`\n\n" +
      "For permanent ownership transfer, update OWNER_ID in Worker configuration after verifying the target."
    );

    return true;
  }

  if (text.startsWith("/domain ")) {
    if (!isOwner(db, userId)) {
      await ownerOnly(chatId);
      return true;
    }

    let domain =
      text.split(/\s+/)[1] || "";

    domain =
      domain
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .trim();

    if (!isValidDomain(domain)) {
      await sendText(
        chatId,
        "❌ Invalid domain."
      );
      return true;
    }

    db.settings.domain = domain;

    addAudit(
      db,
      userId,
      "domain_changed",
      domain
    );

    await saveDB(db);

    await sendText(
      chatId,
      "✅ Domain changed to:\n`" +
      escapeMarkdown(domain) +
      "`"
    );

    return true;
  }

  if (text.startsWith("/broadcast ")) {
    const body =
      text.slice("/broadcast ".length).trim();

    if (!body) return true;

    await broadcast(db, userId, body, chatId);

    return true;
  }

  if (text === "/dbinfo") {
    if (!isOwner(db, userId)) {
      await ownerOnly(chatId);
      return true;
    }

    await sendText(
      chatId,
      "💾 *DATABASE*\n\n" +
      "Storage: Telegram Channel\n" +
      "Format: JSON\n" +
      "KV: disabled\n" +
      "Users: " +
      Object.keys(db.users).length +
      "\nEmails: " +
      Object.keys(db.emails).length +
      "\nAdmins: " +
      db.admins.length
    );

    return true;
  }

  if (text.startsWith("/user ")) {
    const target =
      text.split(/\s+/)[1];

    if (!target) return true;

    const targetUser =
      db.users[String(target)];

    if (!targetUser) {
      await sendText(
        chatId,
        "❌ User not found."
      );
      return true;
    }

    /*
     * IMPORTANT:
     * Admins can inspect account metadata,
     * but cannot retrieve another user's OTP.
     */

    await sendMessage(
      chatId,
      "👤 *USER INFORMATION*\n\n" +
      "ID: `" + targetUser.id + "`\n" +
      "Name: " +
      escapeMarkdown(targetUser.first_name || "") +
      "\n" +
      "Joined: " +
      formatDate(targetUser.created_at) +
      "\n" +
      "Emails: " +
      (targetUser.email_ids?.length || 0) +
      "\n\n" +
      "🔐 User OTP contents are private.",
      [
        [
          {
            text: "👑 Admin Panel",
            callback_data: "admin_panel"
          }
        ]
      ]
    );

    return true;
  }

  return false;
}

/* ============================================================
   PATCH MESSAGE HANDLER FOR COMMANDS
============================================================ */

const originalHandleMessage = handleMessage;

handleMessage = async function(message) {
  const db = await loadDB();

  await ensureUser(db, message.from);

  const text = String(message.text || "");

  if (text.startsWith("/")) {
    const handled =
      await handleAdminCommand(db, message);

    if (handled) return;
  }

  if (text.startsWith("/custom ")) {
    await createCustomEmail(
      db,
      message.chat.id,
      message.from.id,
      text.slice(8).trim()
    );
    return;
  }

  await originalHandleMessage(message);
};

/* ============================================================
   CUSTOM EMAIL CREATION
============================================================ */

async function createCustomEmail(
  db,
  chatId,
  userId,
  username
) {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
    await sendText(
      chatId,
      "❌ Invalid username.\nUse 3-40 letters, numbers, `.`, `_`, or `-`."
    );
    return;
  }

  const email =
    username.toLowerCase() +
    "@" +
    db.settings.domain;

  const emailId =
    "em_" + randomId();

  db.emails[emailId] = {
    id: emailId,
    user_id: String(userId),
    email,
    created_at: Date.now(),
    active: true,
    custom: true
  };

  const user =
    db.users[String(userId)];

  user.email_ids =
    user.email_ids || [];

  user.email_ids.unshift(emailId);

  user.email_ids =
    user.email_ids.slice(0, MAX_EMAILS_PER_USER);

  db.stats.generated_emails++;

  addAudit(
    db,
    userId,
    "create_custom_test_email",
    email
  );

  await saveDB(db);

  await sendMessage(
    chatId,
    "✅ *Custom Test Email Created*\n\n" +
    "`" +
    escapeMarkdown(email) +
    "`",
    [
      [
        {
          text: "📋 Copy",
          copy_text: {
            text: email
          }
        }
      ],
      [
        {
          text: "🔢 Test OTP",
          callback_data: "generate_test_otp"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

/* ============================================================
   BROADCAST
============================================================ */

async function broadcast(
  db,
  adminId,
  body,
  adminChatId
) {
  const userIds =
    Object.keys(db.users)
      .slice(0, MAX_BROADCAST_USERS);

  let sent = 0;
  let failed = 0;

  await sendText(
    adminChatId,
    "📢 Broadcast started...\nUsers: " +
    userIds.length
  );

  for (const id of userIds) {
    try {
      await sendMessage(
        id,
        "📢 *Announcement*\n\n" +
        escapeMarkdown(body),
        [
          [
            {
              text: "🏠 Open Panel",
              callback_data: "home"
            }
          ]
        ]
      );

      sent++;

      /*
       * Small delay to reduce Telegram rate-limit risk.
       */
      await sleep(80);

    } catch {
      failed++;
    }
  }

  db.stats.broadcasts++;

  addAudit(
    db,
    adminId,
    "broadcast",
    body.slice(0, 100)
  );

  await saveDB(db);

  await sendText(
    adminChatId,
    "✅ Broadcast finished.\n\n" +
    "Sent: " + sent + "\n" +
    "Failed: " + failed
  );
}

/* ============================================================
   DATABASE
============================================================ */

/*
 * Telegram Channel database design:
 *
 * Channel
 *   ↓
 * pinned message
 *   ↓
 * JSON
 *
 * The bot reads pinned_message.text
 * and edits the same message.
 */

async function loadDB() {
  const chat =
    await telegram("getChat", {
      chat_id: DB_CHANNEL_ID
    });

  const pinned =
    chat?.result?.pinned_message;

  if (!pinned) {
    throw new Error(
      "DB channel has no pinned database message."
    );
  }

  const raw =
    pinned.text ||
    pinned.caption ||
    "";

  try {
    const parsed =
      JSON.parse(raw);

    return normalizeDB(parsed);
  } catch {
    throw new Error(
      "Pinned DB message does not contain valid JSON."
    );
  }
}

function normalizeDB(db) {
  const base =
    createDefaultDB();

  return {
    ...base,
    ...db,

    settings: {
      ...base.settings,
      ...(db.settings || {})
    },

    admins:
      Array.isArray(db.admins)
        ? db.admins.map(String)
        : base.admins,

    users:
      db.users || {},

    emails:
      db.emails || {},

    test_inboxes:
      db.test_inboxes || {},

    audit_logs:
      Array.isArray(db.audit_logs)
        ? db.audit_logs.slice(0, MAX_AUDIT_LOGS)
        : [],

    stats: {
      ...base.stats,
      ...(db.stats || {})
    }
  };
}

async function saveDB(db) {
  db = normalizeDB(db);

  /*
   * Limit audit data.
   */
  db.audit_logs =
    db.audit_logs.slice(0, MAX_AUDIT_LOGS);

  /*
   * Prevent accidental oversized DB.
   */
  const json =
    JSON.stringify(db);

  if (json.length > 3900) {
    /*
     * Keep the database message under
     * Telegram's text message limit.
     *
     * First reduce logs.
     */
    db.audit_logs =
      db.audit_logs.slice(0, 30);
  }

  const finalJson =
    JSON.stringify(db);

  if (finalJson.length > 4000) {
    throw new Error(
      "Database is too large for a single Telegram message. Archive/partition the database."
    );
  }

  const chat =
    await telegram("getChat", {
      chat_id: DB_CHANNEL_ID
    });

  const pinned =
    chat?.result?.pinned_message;

  if (!pinned) {
    throw new Error(
      "No pinned database message."
    );
  }

  await telegram("editMessageText", {
    chat_id: DB_CHANNEL_ID,
    message_id: pinned.message_id,
    text: finalJson
  });
}

/* ============================================================
   FIRST-TIME DB INITIALIZATION
============================================================ */

/*
 * Run this manually once:
 *
 * 1. Create DB channel.
 * 2. Add bot as admin.
 * 3. Send:
 *
 * {
 *   "version": 1,
 *   "settings": {
 *     "domain": "your-domain.example",
 *     "bot_enabled": true,
 *     "maintenance": false
 *   },
 *   "admins": ["YOUR_OWNER_ID"],
 *   "users": {},
 *   "emails": {},
 *   "test_inboxes": {},
 *   "audit_logs": [],
 *   "stats": {
 *     "generated_emails": 0,
 *     "generated_otps": 0,
 *     "users_created": 0,
 *     "broadcasts": 0
 *   }
 * }
 *
 * 4. Pin that message.
 */

/* ============================================================
   USER CREATION
============================================================ */

async function ensureUser(db, tgUser) {
  const id =
    String(tgUser.id);

  if (!db.users[id]) {
    if (
      Object.keys(db.users).length >= MAX_USERS
    ) {
      throw new Error(
        "User limit reached."
      );
    }

    db.users[id] = {
      id,
      first_name:
        tgUser.first_name || "",
      last_name:
        tgUser.last_name || "",
      username:
        tgUser.username || "",
      created_at:
        Date.now(),
      email_ids: []
    };

    db.stats.users_created++;

    addAudit(
      db,
      id,
      "user_created",
      tgUser.username || tgUser.first_name || ""
    );

    await saveDB(db);
  }
}

/* ============================================================
   AUDIT
============================================================ */

function addAudit(
  db,
  userId,
  action,
  detail
) {
  db.audit_logs.unshift({
    time: Date.now(),
    user_id: String(userId),
    action,
    detail: String(detail || "")
  });

  db.audit_logs =
    db.audit_logs.slice(0, MAX_AUDIT_LOGS);
}

/* ============================================================
   ACCESS
============================================================ */

function isAdmin(db, userId) {
  return db.admins
    .map(String)
    .includes(String(userId));
}

function isOwner(db, userId) {
  return String(userId) === String(OWNER_ID);
}

/* ============================================================
   COOLDOWN
============================================================ */

function checkCooldown(userId) {
  const id =
    String(userId);

  const now =
    Date.now();

  const last =
    runtimeCooldown.get(id) || 0;

  if (
    now - last <
    USER_COOLDOWN_MS
  ) {
    return false;
  }

  runtimeCooldown.set(
    id,
    now
  );

  return true;
}

/* ============================================================
   TELEGRAM API
============================================================ */

async function telegram(method, payload = {}) {
  const url =
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

  const response =
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

  const data =
    await response.json();

  if (!data.ok) {
    throw new Error(
      `Telegram API ${method}: ` +
      JSON.stringify(data)
    );
  }

  return data;
}

async function sendMessage(
  chatId,
  text,
  keyboard = []
) {
  return telegram(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

async function sendText(
  chatId,
  text
) {
  return sendMessage(
    chatId,
    text,
    [
      [
        {
          text: "🏠 Home",
          callback_data: "home"
        }
      ]
    ]
  );
}

async function answerCallback(id) {
  try {
    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id: id
      }
    );
  } catch {}
}

/* ============================================================
   ACCESS RESPONSES
============================================================ */

async function deny(chatId) {
  await sendText(
    chatId,
    "❌ You do not have permission."
  );
}

async function ownerOnly(chatId) {
  await sendText(
    chatId,
    "👑 Owner permission required."
  );
}

/* ============================================================
   UTILITIES
============================================================ */

function randomItem(arr) {
  return arr[
    Math.floor(
      Math.random() * arr.length
    )
  ];
}

function randomId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
  } catch {
    return "Unknown";
  }
}

function escapeMarkdown(text) {
  return String(text)
    .replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function isValidDomain(domain) {
  if (!domain) return false;

  if (domain.length > 253) {
    return false;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
    .test(domain);
}

/* ============================================================
   OPTIONAL WEBHOOK SETUP
============================================================ */

/*
 * Set webhook manually from a browser/API:
 *
 * https://api.telegram.org/botYOUR_TOKEN/setWebhook
 *
 * URL:
 * https://YOUR-WORKER.workers.dev/telegram/webhook
 *
 * With secret_token:
 * PUT_RANDOM_WEBHOOK_SECRET_HERE
 *
 * Example request body:
 *
 * {
 *   "url": "https://YOUR-WORKER.workers.dev/telegram/webhook",
 *   "secret_token": "YOUR_RANDOM_SECRET"
 * }
 *
 * ============================================================
 *
 * IMPORTANT:
 *
 * The Telegram bot needs admin permission in the DB channel.
 *
 * The DB channel needs one pinned message containing JSON.
 *
 * Do NOT put the bot token directly into public GitHub code.
 *
 * ============================================================
 */
