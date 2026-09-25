const MAX_USERS = 5000;
const MAX_ADMINS = 50;
const MAX_EMAILS_PER_USER = 20;
const MAX_OTP_HISTORY = 10;
const MAX_AUDIT_LOGS = 50;

const OTP_EXPIRE_MS = 10 * 60 * 1000;
const USER_COOLDOWN_MS = 20 * 1000;

const cooldowns = new Map();

const FIRST_NAMES = [
  "Aarohi", "Aanya", "Anaya", "Diya", "Isha",
  "Kiara", "Kavya", "Meera", "Naina", "Riya",
  "Sana", "Sara", "Tanya", "Vanya", "Zoya",
  "Maya", "Anika", "Avni", "Myra", "Navya",
  "Pihu", "Rhea", "Simran", "Tara", "Aisha"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Singh", "Kapoor", "Mehta",
  "Malhotra", "Patel", "Khan", "Joshi", "Agarwal",
  "Gupta", "Chopra", "Bhatia", "Arora", "Sethi",
  "Rao", "Shah", "Khanna", "Mishra", "Iyer"
];

function config(env) {
  return {
    BOT_TOKEN: env.BOT_TOKEN,
    OWNER_ID: String(env.OWNER_ID || "8452322818"),
    DB_CHANNEL_ID: String(env.DB_CHANNEL_ID || "-1004474665956"),
    DOMAIN: String(env.DEFAULT_DOMAIN || "vibepulsemedia.online"),
    WEBHOOK_SECRET: String(env.WEBHOOK_SECRET || "")
  };
}

function createDB(env) {
  const c = config(env);

  return {
    version: 1,

    settings: {
      domain: c.DOMAIN,
      maintenance: false
    },

    admins: [c.OWNER_ID],

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

export default {
  async fetch(request, env, ctx) {

    const url = new URL(request.url);

    /*
     * HEALTH
     */
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        "ALOKMAIL BOT IS RUNNING",
        { status: 200 }
      );
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "alokmail-bot",
        webhook: "/webhook"
      });
    }

    /*
     * TELEGRAM WEBHOOK
     */
    if (
      request.method === "POST" &&
      url.pathname === "/webhook"
    ) {

      const c = config(env);

      if (!c.BOT_TOKEN) {
        return new Response(
          "BOT_TOKEN missing",
          { status: 500 }
        );
      }

      /*
       * Optional Telegram secret
       */
      if (c.WEBHOOK_SECRET) {

        const received =
          request.headers.get(
            "X-Telegram-Bot-Api-Secret-Token"
          ) || "";

        if (received !== c.WEBHOOK_SECRET) {
          return new Response(
            "Unauthorized",
            { status: 401 }
          );
        }
      }

      let update;

      try {
        update = await request.json();
      } catch {
        return new Response(
          "Invalid JSON",
          { status: 400 }
        );
      }

      ctx.waitUntil(
        handleUpdate(update, env)
      );

      return new Response(
        "OK",
        { status: 200 }
      );
    }

    return new Response(
      "Not Found",
      { status: 404 }
    );
  }
};


/* =========================================================
   TELEGRAM UPDATE
   ========================================================= */

async function handleUpdate(update, env) {

  try {

    if (update.message) {
      await handleMessage(update.message, env);
      return;
    }

    if (update.callback_query) {
      await handleCallback(
        update.callback_query,
        env
      );
    }

  } catch (error) {

    console.error(
      "UPDATE ERROR:",
      error
    );

  }
}


/* =========================================================
   MESSAGE
   ========================================================= */

async function handleMessage(message, env) {

  const chatId = message.chat?.id;
  const user = message.from;

  if (!chatId || !user) return;

  const text =
    String(message.text || "").trim();

  const db = await loadDB(env);

  const created =
    await ensureUser(
      db,
      user,
      env
    );

  if (created) {
    await saveDB(db, env);
  }


  /*
   * START
   */

  if (text === "/start") {

    await sendMainMenu(
      chatId,
      user,
      env
    );

    return;
  }


  /*
   * HELP
   */

  if (text === "/help") {

    await sendHelp(
      chatId,
      env
    );

    return;
  }


  /*
   * ADMIN
   */

  if (text === "/admin") {

    if (!isAdmin(db, user.id)) {

      await sendText(
        chatId,
        "❌ Admin access required.",
        env
      );

      return;
    }

    await sendAdminPanel(
      chatId,
      env
    );

    return;
  }


  /*
   * CUSTOM EMAIL
   */

  if (text.startsWith("/custom ")) {

    await createCustomEmail(
      db,
      chatId,
      user.id,
      text.substring(8).trim(),
      env
    );

    return;
  }


  /*
   * ADMIN COMMANDS
   */

  if (
    text.startsWith("/addadmin ") ||
    text.startsWith("/removeadmin ") ||
    text.startsWith("/domain ") ||
    text.startsWith("/broadcast ") ||
    text.startsWith("/user ") ||
    text === "/dbinfo"
  ) {

    await handleAdminCommand(
      db,
      message,
      env
    );

    return;
  }


  await sendMainMenu(
    chatId,
    user,
    env
  );
}


/* =========================================================
   CALLBACK
   ========================================================= */

async function handleCallback(query, env) {

  const user = query.from;
  const chatId = query.message?.chat?.id;

  if (!chatId) return;

  await answerCallback(
    query.id,
    env
  );

  const data =
    String(query.data || "");

  const db =
    await loadDB(env);

  const created =
    await ensureUser(
      db,
      user,
      env
    );

  if (created) {
    await saveDB(db, env);
  }


  /* HOME */

  if (data === "home") {

    await sendMainMenu(
      chatId,
      user,
      env
    );

    return;
  }


  /* GENERATE EMAIL */

  if (data === "generate_email") {

    await generateTestEmail(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* CUSTOM EMAIL */

  if (data === "custom_email") {

    await sendText(
      chatId,
      "✏️ Custom Test Email\n\n" +
      "Use:\n" +
      "`/custom username`\n\n" +
      "Example:\n" +
      "`/custom mytest123`",
      env
    );

    return;
  }


  /* MY EMAILS */

  if (data === "my_emails") {

    await showMyEmails(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* INBOX */

  if (data === "my_inbox") {

    await showMyInbox(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* TEST OTP */

  if (data === "generate_test_otp") {

    await generateTestOTP(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* OTP HISTORY */

  if (data === "otp_history") {

    await showOTPHistory(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* PROFILE */

  if (data === "profile") {

    await showProfile(
      db,
      chatId,
      user.id,
      env
    );

    return;
  }


  /* SETTINGS */

  if (data === "settings") {

    await showSettings(
      chatId,
      env
    );

    return;
  }


  /* HELP */

  if (data === "help") {

    await sendHelp(
      chatId,
      env
    );

    return;
  }


  /* ADMIN PANEL */

  if (data === "admin_panel") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await sendAdminPanel(
      chatId,
      env
    );

    return;
  }


  /* ADMIN STATS */

  if (data === "admin_stats") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await showAdminStats(
      db,
      chatId,
      env
    );

    return;
  }


  /* ADMIN USERS */

  if (data === "admin_users") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await showAdminUsers(
      db,
      chatId,
      env
    );

    return;
  }


  /* ADMIN LIST */

  if (data === "admin_list") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await showAdminList(
      db,
      chatId,
      env
    );

    return;
  }


  /* DOMAIN */

  if (data === "admin_domain") {

    if (!isOwner(db, user.id, env)) {
      return;
    }

    await showDomainPanel(
      db,
      chatId,
      env
    );

    return;
  }


  /* ADD ADMIN */

  if (data === "admin_add") {

    if (!isOwner(db, user.id, env)) {
      return;
    }

    await sendText(
      chatId,
      "➕ Add Admin\n\n" +
      "`/addadmin USER_ID`",
      env
    );

    return;
  }


  /* REMOVE ADMIN */

  if (data === "admin_remove") {

    if (!isOwner(db, user.id, env)) {
      return;
    }

    await sendText(
      chatId,
      "➖ Remove Admin\n\n" +
      "`/removeadmin USER_ID`",
      env
    );

    return;
  }


  /* BROADCAST */

  if (data === "admin_broadcast") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await sendText(
      chatId,
      "📢 Broadcast\n\n" +
      "`/broadcast YOUR MESSAGE`",
      env
    );

    return;
  }


  /* AUDIT */

  if (data === "admin_audit") {

    if (!isAdmin(db, user.id)) {
      return;
    }

    await showAuditLogs(
      db,
      chatId,
      env
    );

    return;
  }


  /* DATABASE */

  if (data === "admin_db") {

    if (!isOwner(db, user.id, env)) {
      return;
    }

    await sendText(
      chatId,
      "💾 Database:\n\n" +
      "Telegram Channel → Pinned JSON Message",
      env
    );

    return;
  }


  /* COPY EMAIL */

  if (data.startsWith("copy_email:")) {

    const id =
      data.substring(
        "copy_email:".length
      );

    const item =
      db.emails[id];

    if (
      !item ||
      String(item.user_id) !==
      String(user.id)
    ) {
      return;
    }

    await sendMessage(
      chatId,
      "📧 `" +
      escapeMarkdown(item.email) +
      "`",
      [
        [
          {
            text: "📋 Copy Email",
            copy_text: {
              text: item.email
            }
          }
        ],
        [
          {
            text: "🏠 Home",
            callback_data: "home"
          }
        ]
      ],
      env
    );

    return;
  }


  /* SHOW OTP */

  if (data.startsWith("show_otp:")) {

    const id =
      data.substring(
        "show_otp:".length
      );

    const inbox =
      db.test_inboxes[
        String(user.id)
      ] || [];

    const otp =
      inbox.find(
        x => x.id === id
      );

    if (!otp) {
      await sendText(
        chatId,
        "❌ OTP not found.",
        env
      );
      return;
    }

    if (
      Date.now() >
      otp.expires_at
    ) {

      await sendText(
        chatId,
        "⌛ This test OTP has expired.",
        env
      );

      return;
    }

    await sendMessage(
      chatId,
      "🔐 TEST OTP\n\n`" +
      otp.code +
      "`\n\n" +
      "⚠️ Application-generated TEST OTP.",
      [
        [
          {
            text: "📋 Copy OTP",
            copy_text: {
              text: otp.code
            }
          }
        ],
        [
          {
            text: "🏠 Home",
            callback_data: "home"
          }
        ]
      ],
      env
    );

    return;
  }
}


/* =========================================================
   MAIN MENU
   ========================================================= */

async function sendMainMenu(
  chatId,
  user,
  env
) {

  const db =
    await loadDB(env);

  if (
    db.settings.maintenance &&
    !isAdmin(db, user.id)
  ) {

    await sendText(
      chatId,
      "🛠️ Maintenance mode is active.",
      env
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
        callback_data: "profile"
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

  if (
    isAdmin(db, user.id)
  ) {

    keyboard.push([
      {
        text: "👑 Admin Panel",
        callback_data: "admin_panel"
      }
    ]);
  }

  await sendMessage(
    chatId,

    "🌐 *ALOKMAIL TEST ENGINE*\n\n" +

    "Welcome, *" +
    escapeMarkdown(
      user.first_name || "User"
    ) +
    "*.\n\n" +

    "📌 Domain: `" +
    escapeMarkdown(
      db.settings.domain
    ) +
    "`\n\n" +

    "🔐 OTP Mode: TEST ONLY",

    keyboard,
    env
  );
}


/* =========================================================
   TEST EMAIL
   ========================================================= */

async function generateTestEmail(
  db,
  chatId,
  userId,
  env
) {

  if (!checkCooldown(userId)) {

    await sendText(
      chatId,
      "⏳ Please wait a few seconds.",
      env
    );

    return;
  }

  const first =
    randomItem(FIRST_NAMES)
      .toLowerCase();

  const last =
    randomItem(LAST_NAMES)
      .toLowerCase();

  const number =
    Math.floor(
      100 + Math.random() * 900
    );

  const email =
    `${first}.${last}${number}@${db.settings.domain}`;

  const emailId =
    "em_" + randomId();

  db.emails[emailId] = {

    id: emailId,

    user_id:
      String(userId),

    email,

    created_at:
      Date.now(),

    active: true
  };

  const user =
    db.users[
      String(userId)
    ];

  user.email_ids =
    user.email_ids || [];

  user.email_ids.unshift(
    emailId
  );

  user.email_ids =
    user.email_ids.slice(
      0,
      MAX_EMAILS_PER_USER
    );

  db.stats.generated_emails++;

  addAudit(
    db,
    userId,
    "generate_test_email",
    email
  );

  await saveDB(
    db,
    env
  );

  await sendMessage(
    chatId,

    "✅ *TEST EMAIL CREATED*\n\n" +

    "📧 `" +
    escapeMarkdown(email) +
    "`\n\n" +

    "This is an application test address.",

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
          callback_data:
            "generate_test_otp"
        }
      ],

      [
        {
          text: "📥 My Inbox",
          callback_data:
            "my_inbox"
        }
      ],

      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   CUSTOM EMAIL
   ========================================================= */

async function createCustomEmail(
  db,
  chatId,
  userId,
  username,
  env
) {

  if (
    !/^[a-zA-Z0-9._-]{3,40}$/
      .test(username)
  ) {

    await sendText(
      chatId,
      "❌ Invalid username.\n\n" +
      "Allowed: letters, numbers, `.`, `_`, `-`",
      env
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

    user_id:
      String(userId),

    email,

    created_at:
      Date.now(),

    active: true,

    custom: true
  };

  const user =
    db.users[
      String(userId)
    ];

  user.email_ids =
    user.email_ids || [];

  user.email_ids.unshift(
    emailId
  );

  user.email_ids =
    user.email_ids.slice(
      0,
      MAX_EMAILS_PER_USER
    );

  db.stats.generated_emails++;

  addAudit(
    db,
    userId,
    "custom_test_email",
    email
  );

  await saveDB(
    db,
    env
  );

  await sendMessage(
    chatId,

    "✅ *CUSTOM TEST EMAIL*\n\n" +
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
          text: "🔢 Generate Test OTP",
          callback_data:
            "generate_test_otp"
        }
      ],

      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   TEST OTP
   ========================================================= */

async function generateTestOTP(
  db,
  chatId,
  userId,
  env
) {

  if (!checkCooldown(userId)) {

    await sendText(
      chatId,
      "⏳ Please wait before generating another OTP.",
      env
    );

    return;
  }

  const user =
    db.users[
      String(userId)
    ];

  if (
    !user ||
    !user.email_ids ||
    !user.email_ids.length
  ) {

    await sendMessage(
      chatId,
      "📧 Create a test email first.",
      [
        [
          {
            text: "📧 Generate Email",
            callback_data:
              "generate_email"
          }
        ]
      ],
      env
    );

    return;
  }

  const emailId =
    user.email_ids[0];

  const email =
    db.emails[emailId];

  if (!email) {
    return;
  }

  const code =
    String(
      Math.floor(
        100000 +
        Math.random() * 900000
      )
    );

  const otpId =
    "otp_" + randomId();

  const otp = {

    id: otpId,

    user_id:
      String(userId),

    email_id:
      emailId,

    email:
      email.email,

    code,

    created_at:
      Date.now(),

    expires_at:
      Date.now() +
      OTP_EXPIRE_MS
  };

  const key =
    String(userId);

  db.test_inboxes[key] =
    db.test_inboxes[key] || [];

  db.test_inboxes[key].unshift(
    otp
  );

  db.test_inboxes[key] =
    db.test_inboxes[key].slice(
      0,
      MAX_OTP_HISTORY
    );

  db.stats.generated_otps++;

  addAudit(
    db,
    userId,
    "generate_test_otp",
    email.email
  );

  await saveDB(
    db,
    env
  );

  await sendMessage(
    chatId,

    "🔐 *TEST OTP GENERATED*\n\n" +

    "📧 `" +
    escapeMarkdown(email.email) +
    "`\n\n" +

    "🔢 Code: `" +
    code +
    "`\n\n" +

    "⏳ Valid for 10 minutes.\n\n" +

    "⚠️ Application-generated TEST OTP only.",

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
          text: "📥 Inbox",
          callback_data:
            "my_inbox"
        },
        {
          text: "🕘 History",
          callback_data:
            "otp_history"
        }
      ],

      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   MY EMAILS
   ========================================================= */

async function showMyEmails(
  db,
  chatId,
  userId,
  env
) {

  const user =
    db.users[
      String(userId)
    ];

  if (
    !user ||
    !user.email_ids ||
    !user.email_ids.length
  ) {

    await sendMessage(
      chatId,
      "📭 You have no test emails.",
      [
        [
          {
            text: "📧 Generate Email",
            callback_data:
              "generate_email"
          }
        ]
      ],
      env
    );

    return;
  }

  const keyboard = [];

  for (
    const id of
    user.email_ids.slice(0, 10)
  ) {

    const email =
      db.emails[id];

    if (!email) continue;

    keyboard.push([
      {
        text:
          "📧 " + email.email,
        callback_data:
          "copy_email:" + id
      }
    ]);
  }

  keyboard.push([
    {
      text: "📧 New Email",
      callback_data:
        "generate_email"
    }
  ]);

  keyboard.push([
    {
      text: "🏠 Home",
      callback_data:
        "home"
    }
  ]);

  await sendMessage(
    chatId,
    "📋 *YOUR TEST EMAILS*\n\n" +
    "Tap an address.",
    keyboard,
    env
  );
}


/* =========================================================
   INBOX
   ========================================================= */

async function showMyInbox(
  db,
  chatId,
  userId,
  env
) {

  const inbox =
    db.test_inboxes[
      String(userId)
    ] || [];

  if (!inbox.length) {

    await sendMessage(
      chatId,
      "📭 *Inbox Empty*",
      [
        [
          {
            text: "🔢 Generate Test OTP",
            callback_data:
              "generate_test_otp"
          }
        ],
        [
          {
            text: "🏠 Home",
            callback_data:
              "home"
          }
        ]
      ],
      env
    );

    return;
  }

  const latest =
    inbox[0];

  const expired =
    Date.now() >
    latest.expires_at;

  await sendMessage(
    chatId,

    "📥 *YOUR TEST INBOX*\n\n" +

    "📧 `" +
    escapeMarkdown(latest.email) +
    "`\n\n" +

    "🕐 " +
    formatDate(
      latest.created_at
    ) +
    "\n\n" +

    (
      expired
        ? "⌛ Latest OTP expired."
        : "✅ Latest OTP active."
    ),

    [
      [
        {
          text: "👁️ Show OTP",
          callback_data:
            "show_otp:" +
            latest.id
        }
      ],

      [
        {
          text: "🕘 History",
          callback_data:
            "otp_history"
        }
      ],

      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   OTP HISTORY
   ========================================================= */

async function showOTPHistory(
  db,
  chatId,
  userId,
  env
) {

  const inbox =
    db.test_inboxes[
      String(userId)
    ] || [];

  if (!inbox.length) {

    await sendText(
      chatId,
      "📭 No test OTP history.",
      env
    );

    return;
  }

  const lines =
    inbox
      .slice(0, 10)
      .map(item => {

        const active =
          Date.now() <
          item.expires_at;

        return (
          "• `" +
          item.code +
          "` — " +
          (active
            ? "✅ active"
            : "⌛ expired") +
          "\n" +
          formatDate(
            item.created_at
          )
        );
      });

  await sendMessage(
    chatId,

    "🕘 *TEST OTP HISTORY*\n\n" +
    lines.join("\n\n"),

    [
      [
        {
          text: "📥 Inbox",
          callback_data:
            "my_inbox"
        }
      ],
      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   PROFILE
   ========================================================= */

async function showProfile(
  db,
  chatId,
  userId,
  env
) {

  const user =
    db.users[
      String(userId)
    ];

  const otpCount =
    (
      db.test_inboxes[
        String(userId)
      ] || []
    ).length;

  await sendMessage(
    chatId,

    "👤 *PROFILE*\n\n" +

    "🆔 ID: `" +
    userId +
    "`\n\n" +

    "👤 Name: " +
    escapeMarkdown(
      user?.first_name ||
      "User"
    ) +
    "\n\n" +

    "📅 Joined: " +
    formatDate(
      user?.created_at
    ) +
    "\n\n" +

    "📧 Emails: " +
    (
      user?.email_ids?.length ||
      0
    ) +
    "\n\n" +

    "🔢 Test OTPs: " +
    otpCount,

    [
      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function showSettings(
  chatId,
  env
) {

  await sendMessage(
    chatId,

    "⚙️ *SETTINGS*\n\n" +

    "🔐 OTP Mode: TEST ONLY\n\n" +

    "🛡️ Third-party OTP interception is disabled.",

    [
      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   HELP
   ========================================================= */

async function sendHelp(
  chatId,
  env
) {

  await sendMessage(
    chatId,

    "❓ *HELP*\n\n" +

    "📧 Generate Test Email\n" +
    "Creates an application test address.\n\n" +

    "✏️ Custom Email\n" +
    "Creates your own test address.\n\n" +

    "🔢 Test OTP\n" +
    "Creates a six-digit application OTP.\n\n" +

    "📥 Inbox\n" +
    "Shows your own generated test OTPs.\n\n" +

    "⚠️ Third-party verification codes are not intercepted.",

    [
      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   ADMIN PANEL
   ========================================================= */

async function sendAdminPanel(
  chatId,
  env
) {

  await sendMessage(
    chatId,

    "👑 *ADMIN CONTROL PANEL*\n\n" +
    "Select an option:",

    [
      [
        {
          text: "📊 Statistics",
          callback_data:
            "admin_stats"
        },
        {
          text: "👥 Users",
          callback_data:
            "admin_users"
        }
      ],

      [
        {
          text: "🛡️ Admins",
          callback_data:
            "admin_list"
        }
      ],

      [
        {
          text: "➕ Add Admin",
          callback_data:
            "admin_add"
        },
        {
          text: "➖ Remove Admin",
          callback_data:
            "admin_remove"
        }
      ],

      [
        {
          text: "🌐 Domain",
          callback_data:
            "admin_domain"
        }
      ],

      [
        {
          text: "📢 Broadcast",
          callback_data:
            "admin_broadcast"
        }
      ],

      [
        {
          text: "📝 Audit Logs",
          callback_data:
            "admin_audit"
        }
      ],

      [
        {
          text: "💾 Database",
          callback_data:
            "admin_db"
        }
      ],

      [
        {
          text: "🏠 User Panel",
          callback_data:
            "home"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   ADMIN STATS
   ========================================================= */

async function showAdminStats(
  db,
  chatId,
  env
) {

  const users =
    Object.keys(
      db.users
    ).length;

  const emails =
    Object.keys(
      db.emails
    ).length;

  const otpRecords =
    Object.values(
      db.test_inboxes
    )
      .reduce(
        (sum, arr) =>
          sum + arr.length,
        0
      );

  await sendMessage(
    chatId,

    "📊 *SYSTEM STATISTICS*\n\n" +

    "👥 Users: `" +
    users +
    "`\n\n" +

    "📧 Emails: `" +
    emails +
    "`\n\n" +

    "🔢 Test OTP records: `" +
    otpRecords +
    "`\n\n" +

    "📨 Generated Emails: `" +
    db.stats.generated_emails +
    "`\n\n" +

    "🔐 Generated Test OTPs: `" +
    db.stats.generated_otps +
    "`\n\n" +

    "📢 Broadcasts: `" +
    db.stats.broadcasts +
    "`",

    [
      [
        {
          text: "🔄 Refresh",
          callback_data:
            "admin_stats"
        }
      ],
      [
        {
          text: "👑 Admin Panel",
          callback_data:
            "admin_panel"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   ADMIN USERS
   ========================================================= */

async function showAdminUsers(
  db,
  chatId,
  env
) {

  const users =
    Object.values(
      db.users
    )
      .sort(
        (a, b) =>
          b.created_at -
          a.created_at
      )
      .slice(0, 20);

  if (!users.length) {

    await sendText(
      chatId,
      "No users.",
      env
    );

    return;
  }

  const lines =
    users.map(
      (u, i) =>
        `${i + 1}. ` +
        escapeMarkdown(
          u.first_name ||
          "User"
        ) +
        " — `" +
        u.id +
        "`"
    );

  await sendMessage(
    chatId,

    "👥 *RECENT USERS*\n\n" +
    lines.join("\n") +
    "\n\n" +
    "Use:\n" +
    "`/user USER_ID`",

    [
      [
        {
          text: "👑 Admin Panel",
          callback_data:
            "admin_panel"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   ADMIN LIST
   ========================================================= */

async function showAdminList(
  db,
  chatId,
  env
) {

  const lines =
    db.admins.map(
      (id, index) =>
        `${index + 1}. \`${id}\``
    );

  await sendMessage(
    chatId,

    "🛡️ *ADMIN LIST*\n\n" +
    lines.join("\n"),

    [
      [
        {
          text: "➕ Add Admin",
          callback_data:
            "admin_add"
        },
        {
          text: "➖ Remove Admin",
          callback_data:
            "admin_remove"
        }
      ],

      [
        {
          text: "👑 Admin Panel",
          callback_data:
            "admin_panel"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   DOMAIN PANEL
   ========================================================= */

async function showDomainPanel(
  db,
  chatId,
  env
) {

  await sendMessage(
    chatId,

    "🌐 *DOMAIN SETTINGS*\n\n" +

    "Current:\n`" +
    escapeMarkdown(
      db.settings.domain
    ) +
    "`\n\n" +

    "Change:\n" +
    "`/domain example.com`",

    [
      [
        {
          text: "👑 Admin Panel",
          callback_data:
            "admin_panel"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   AUDIT
   ========================================================= */

async function showAuditLogs(
  db,
  chatId,
  env
) {

  if (!db.audit_logs.length) {

    await sendText(
      chatId,
      "📝 No audit logs.",
      env
    );

    return;
  }

  const lines =
    db.audit_logs
      .slice(0, 20)
      .map(
        x =>
          "• `" +
          formatDate(x.time) +
          "`\n" +
          x.action +
          "\nUser: `" +
          x.user_id +
          "`\n" +
          escapeMarkdown(
            x.detail
          )
      );

  await sendMessage(
    chatId,

    "📝 *AUDIT LOGS*\n\n" +
    lines.join("\n\n"),

    [
      [
        {
          text: "👑 Admin Panel",
          callback_data:
            "admin_panel"
        }
      ]
    ],

    env
  );
}


/* =========================================================
   ADMIN COMMANDS
   ========================================================= */

async function handleAdminCommand(
  db,
  message,
  env
) {

  const userId =
    message.from.id;

  const chatId =
    message.chat.id;

  const text =
    String(
      message.text || ""
    );

  if (
    !isAdmin(
      db,
      userId
    )
  ) {

    await sendText(
      chatId,
      "❌ Admin access required.",
      env
    );

    return;
  }


  /* ADD ADMIN */

  if (
    text.startsWith(
      "/addadmin "
    )
  ) {

    if (
      !isOwner(
        db,
        userId,
        env
      )
    ) {

      await sendText(
        chatId,
        "👑 Owner permission required.",
        env
      );

      return;
    }

    const target =
      text.split(/\s+/)[1];

    if (!target) return;

    if (
      db.admins.length >=
      MAX_ADMINS
    ) {

      await sendText(
        chatId,
        "❌ Admin limit reached.",
        env
      );

      return;
    }

    if (
      !db.admins.includes(
        String(target)
      )
    ) {

      db.admins.push(
        String(target)
      );

      addAudit(
        db,
        userId,
        "add_admin",
        target
      );

      await saveDB(
        db,
        env
      );
    }

    await sendText(
      chatId,
      "✅ Admin added:\n`" +
      target +
      "`",
      env
    );

    return;
  }


  /* REMOVE ADMIN */

  if (
    text.startsWith(
      "/removeadmin "
    )
  ) {

    if (
      !isOwner(
        db,
        userId,
        env
      )
    ) return;

    const target =
      text.split(/\s+/)[1];

    if (!target) return;

    if (
      String(target) ===
      String(
        config(env).OWNER_ID
      )
    ) {

      await sendText(
        chatId,
        "❌ Owner cannot be removed.",
        env
      );

      return;
    }

    db.admins =
      db.admins.filter(
        x =>
          String(x) !==
          String(target)
      );

    addAudit(
      db,
      userId,
      "remove_admin",
      target
    );

    await saveDB(
      db,
      env
    );

    await sendText(
      chatId,
      "✅ Admin removed:\n`" +
      target +
      "`",
      env
    );

    return;
  }


  /* DOMAIN */

  if (
    text.startsWith(
      "/domain "
    )
  ) {

    if (
      !isOwner(
        db,
        userId,
        env
      )
    ) return;

    let domain =
      text
        .split(/\s+/)[1] ||
        "";

    domain =
      domain
        .toLowerCase()
        .replace(
          /^https?:\/\//,
          ""
        )
        .replace(
          /\/.*$/,
          ""
        );

    if (
      !isValidDomain(
        domain
      )
    ) {

      await sendText(
        chatId,
        "❌ Invalid domain.",
        env
      );

      return;
    }

    db.settings.domain =
      domain;

    addAudit(
      db,
      userId,
      "domain_changed",
      domain
    );

    await saveDB(
      db,
      env
    );

    await sendText(
      chatId,
      "✅ Domain changed:\n`" +
      escapeMarkdown(
        domain
      ) +
      "`",
      env
    );

    return;
  }


  /* BROADCAST */

  if (
    text.startsWith(
      "/broadcast "
    )
  ) {

    const body =
      text
        .substring(
          "/broadcast ".length
        )
        .trim();

    if (!body) return;

    await broadcast(
      db,
      userId,
      body,
      chatId,
      env
    );

    return;
  }


  /* USER */

  if (
    text.startsWith(
      "/user "
    )
  ) {

    const target =
      text.split(/\s+/)[1];

    const targetUser =
      db.users[
        String(target)
      ];

    if (!targetUser) {

      await sendText(
        chatId,
        "❌ User not found.",
        env
      );

      return;
    }

    await sendMessage(
      chatId,

      "👤 *USER INFO*\n\n" +

      "ID: `" +
      targetUser.id +
      "`\n\n" +

      "Name: " +
      escapeMarkdown(
        targetUser.first_name ||
        ""
      ) +
      "\n\n" +

      "Joined: " +
      formatDate(
        targetUser.created_at
      ) +
      "\n\n" +

      "Emails: " +
      (
        targetUser.email_ids?.length ||
        0
      ),

      [
        [
          {
            text: "👑 Admin Panel",
            callback_data:
              "admin_panel"
          }
        ]
      ],

      env
    );

    return;
  }


  /* DB INFO */

  if (
    text === "/dbinfo"
  ) {

    if (
      !isOwner(
        db,
        userId,
        env
      )
    ) return;

    await sendText(
      chatId,

      "💾 *DATABASE*\n\n" +
      "Storage: Telegram Channel\n" +
      "Users: " +
      Object.keys(db.users).length +
      "\nEmails: " +
      Object.keys(db.emails).length +
      "\nAdmins: " +
      db.admins.length,

      env
    );
  }
}


/* =========================================================
   BROADCAST
   ========================================================= */

async function broadcast(
  db,
  adminId,
  body,
  adminChatId,
  env
) {

  const users =
    Object.keys(
      db.users
    ).slice(
      0,
      5000
    );

  let sent = 0;
  let failed = 0;

  await sendText(
    adminChatId,
    "📢 Broadcast started...\nUsers: " +
    users.length,
    env
  );

  for (
    const id of users
  ) {

    try {

      await sendMessage(
        id,

        "📢 *ANNOUNCEMENT*\n\n" +
        escapeMarkdown(body),

        [
          [
            {
              text: "🏠 Open Panel",
              callback_data:
                "home"
            }
          ]
        ],

        env
      );

      sent++;

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

  await saveDB(
    db,
    env
  );

  await sendText(
    adminChatId,

    "✅ Broadcast finished.\n\n" +
    "Sent: " +
    sent +
    "\nFailed: " +
    failed,

    env
  );
}


/* =========================================================
   DATABASE
   ========================================================= */

async function loadDB(env) {

  const c =
    config(env);

  const response =
    await telegram(
      "getChat",
      {
        chat_id:
          c.DB_CHANNEL_ID
      },
      env
    );

  const pinned =
    response.result?.pinned_message;

  if (!pinned) {

    throw new Error(
      "No pinned DB message found."
    );
  }

  const raw =
    pinned.text ||
    pinned.caption ||
    "";

  let db;

  try {

    db =
      JSON.parse(raw);

  } catch {

    throw new Error(
      "Pinned message is not valid JSON."
    );
  }

  return normalizeDB(
    db,
    env
  );
}


function normalizeDB(
  db,
  env
) {

  const base =
    createDB(env);

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
      Array.isArray(
        db.audit_logs
      )
        ? db.audit_logs.slice(
            0,
            MAX_AUDIT_LOGS
          )
        : [],

    stats: {
      ...base.stats,
      ...(db.stats || {})
    }
  };
}


async function saveDB(
  db,
  env
) {

  const c =
    config(env);

  let json =
    JSON.stringify(
      db
    );

  /*
   * Telegram message limit safety
   */

  if (
    json.length > 3900
  ) {

    db.audit_logs =
      db.audit_logs.slice(
        0,
        10
      );

    json =
      JSON.stringify(
        db
      );
  }

  if (
    json.length > 4000
  ) {

    throw new Error(
      "Database is too large for one Telegram message."
    );
  }

  const response =
    await telegram(
      "getChat",
      {
        chat_id:
          c.DB_CHANNEL_ID
      },
      env
    );

  const pinned =
    response.result?.pinned_message;

  if (!pinned) {

    throw new Error(
      "No pinned DB message."
    );
  }

  await telegram(
    "editMessageText",
    {
      chat_id:
        c.DB_CHANNEL_ID,

      message_id:
        pinned.message_id,

      text:
        json
    },
    env
  );
}


/* =========================================================
   USER
   ========================================================= */

async function ensureUser(
  db,
  user,
  env
) {

  const id =
    String(user.id);

  if (
    db.users[id]
  ) {

    return false;
  }

  if (
    Object.keys(
      db.users
    ).length >=
    MAX_USERS
  ) {

    throw new Error(
      "User limit reached."
    );
  }

  db.users[id] = {

    id,

    first_name:
      user.first_name ||
      "",

    last_name:
      user.last_name ||
      "",

    username:
      user.username ||
      "",

    created_at:
      Date.now(),

    email_ids:
      []
  };

  db.stats.users_created++;

  addAudit(
    db,
    id,
    "user_created",
    user.username ||
    user.first_name ||
    ""
  );

  return true;
}


/* =========================================================
   HELPERS
   ========================================================= */

function isAdmin(
  db,
  userId
) {

  return db.admins
    .map(String)
    .includes(
      String(userId)
    );
}


function isOwner(
  db,
  userId,
  env
) {

  return (
    String(userId) ===
    String(
      config(env).OWNER_ID
    )
  );
}


function addAudit(
  db,
  userId,
  action,
  detail
) {

  db.audit_logs.unshift({

    time:
      Date.now(),

    user_id:
      String(userId),

    action,

    detail:
      String(detail || "")
  });

  db.audit_logs =
    db.audit_logs.slice(
      0,
      MAX_AUDIT_LOGS
    );
}


function checkCooldown(
  userId
) {

  const id =
    String(userId);

  const now =
    Date.now();

  const last =
    cooldowns.get(id) ||
    0;

  if (
    now - last <
    USER_COOLDOWN_MS
  ) {

    return false;
  }

  cooldowns.set(
    id,
    now
  );

  return true;
}


function randomItem(
  array
) {

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}


function randomId() {

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2, 10)
  );
}


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function formatDate(
  timestamp
) {

  if (!timestamp) {
    return "Unknown";
  }

  return new Date(
    timestamp
  )
    .toISOString()
    .replace(
      "T",
      " "
    )
    .substring(
      0,
      19
    );
}


function escapeMarkdown(
  text
) {

  return String(text)
    .replace(
      /([_*\[\]()~`>#+\-=|{}.!\\])/g,
      "\\$1"
    );
}


function isValidDomain(
  domain
) {

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
    .test(domain);
}


/* =========================================================
   TELEGRAM API
   ========================================================= */

async function telegram(
  method,
  payload,
  env
) {

  const token =
    config(env).BOT_TOKEN;

  if (!token) {

    throw new Error(
      "BOT_TOKEN is missing."
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );

  const data =
    await response.json();

  if (!data.ok) {

    throw new Error(
      "Telegram API error: " +
      JSON.stringify(data)
    );
  }

  return data;
}


async function sendMessage(
  chatId,
  text,
  keyboard,
  env
) {

  return telegram(
    "sendMessage",
    {
      chat_id:
        chatId,

      text,

      parse_mode:
        "Markdown",

      disable_web_page_preview:
        true,

      reply_markup: {
        inline_keyboard:
          keyboard || []
      }
    },
    env
  );
}


async function sendText(
  chatId,
  text,
  env
) {

  return sendMessage(
    chatId,
    text,
    [
      [
        {
          text: "🏠 Home",
          callback_data:
            "home"
        }
      ]
    ],
    env
  );
}


async function answerCallback(
  callbackId,
  env
) {

  try {

    await telegram(
      "answerCallbackQuery",
      {
        callback_query_id:
          callbackId
      },
      env
    );

  } catch {}
}
