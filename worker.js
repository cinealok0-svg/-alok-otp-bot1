const META_AI = "https://www.meta.ai/";
const ACCOUNT_CENTER = "https://accountscenter.facebook.com/";
const META_HELP = "https://www.facebook.com/help/";

function html() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#080d1b">
<title>Meta AI Hub</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>

<style>
*{box-sizing:border-box}
body{
 margin:0;padding:18px 15px 100px;
 background:radial-gradient(circle at top right,#263c70,transparent 35%),#080d1b;
 color:#f5f7ff;font-family:system-ui,Arial,sans-serif;
}
.wrap{max-width:600px;margin:auto}
header{display:flex;align-items:center;gap:12px;margin:10px 0 24px}
.logo{
 width:48px;height:48px;border-radius:16px;
 display:grid;place-items:center;font-size:25px;
 background:linear-gradient(135deg,#7189ff,#4ce0cb)
}
h1{font-size:20px;margin:0}
.small{font-size:12px;color:#9eabc7;margin-top:4px}
.hero{
 padding:24px;border-radius:24px;
 background:linear-gradient(135deg,#1d2e59,#12333b);
 border:1px solid #ffffff16
}
.hero h2{font-size:28px;line-height:1.2;margin:10px 0}
.hero p,.card p{color:#aab7d1;font-size:13px;line-height:1.6}
button{font:inherit;cursor:pointer}
.primary{
 border:0;border-radius:13px;padding:12px 16px;
 background:linear-gradient(100deg,#7189ff,#4ce0cb);
 color:#081323;font-weight:800
}
.title{margin:26px 2px 12px;font-weight:800}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{
 min-height:145px;padding:17px;text-align:left;
 color:white;background:#121b30;
 border:1px solid #ffffff12;border-radius:20px
}
.icon{font-size:27px;margin-bottom:12px}
.card h3{font-size:15px;margin:0}
.card p{margin-bottom:0}
.page{display:none}
.page.active{display:block}
.detail{
 background:#121b30;border:1px solid #ffffff12;
 padding:22px;border-radius:22px
}
.detail h2{margin:10px 0}
.back,.action{
 display:block;width:100%;padding:13px;margin-top:12px;
 border-radius:12px;border:1px solid #ffffff12;
 background:#263657;color:white;text-align:center;
 text-decoration:none;font-weight:700
}
.action.main{background:linear-gradient(100deg,#7189ff,#4ce0cb);color:#081323}
.notice{
 margin-top:17px;padding:15px;border-radius:15px;
 background:#10192a;border:1px solid #ffffff12;
 font-size:12px;color:#aab7d1;line-height:1.6
}
.bottom{
 position:fixed;bottom:0;left:0;right:0;
 padding:9px 7px calc(9px + env(safe-area-inset-bottom));
 background:#080d1bf2;border-top:1px solid #ffffff15;
 backdrop-filter:blur(15px)
}
.nav{max-width:600px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr)}
.nav button{border:0;background:none;color:#8998b7;font-size:11px;padding:7px 0}
.nav button span{display:block;font-size:21px;margin-bottom:4px}
.nav button.active{color:#9eb4ff}
</style>
</head>

<body>
<div class="wrap">

<header>
 <div class="logo">✦</div>
 <div>
  <h1>Meta AI Hub</h1>
  <div class="small">Your account shortcuts</div>
 </div>
</header>

<main>
<section id="home" class="page active">
 <div class="hero">
  <div class="small">WELCOME TO YOUR HUB</div>
  <h2>Everything you need in one place.</h2>
  <p>Quick access to Meta AI and official account settings.</p>
  <button class="primary" onclick="external(META_AI)">🤖 Open Meta AI ↗</button>
 </div>

 <div class="title">Quick Access</div>

 <div class="grid">
  <button class="card" onclick="page('meta')">
   <div class="icon">🤖</div>
   <h3>Meta AI</h3>
   <p>Open the official Meta AI website.</p>
  </button>

  <button class="card" onclick="page('account')">
   <div class="icon">👤</div>
   <h3>Account Center</h3>
   <p>Visit official account settings.</p>
  </button>

  <button class="card" onclick="page('email')">
   <div class="icon">📧</div>
   <h3>Email / Contact</h3>
   <p>Manage contact details on Meta.</p>
  </button>

  <button class="card" onclick="page('help')">
   <div class="icon">🛡️</div>
   <h3>Help & Safety</h3>
   <p>Security tips and help resources.</p>
  </button>
 </div>

 <div class="notice">
  🔐 Security: Enter your password and verification codes only
  on official Meta websites. This Mini App never collects them.
 </div>
</section>

<section id="meta" class="page">
 <button class="back" onclick="page('home')">← Back to Home</button>
 <div class="detail">
  <div class="icon">🤖</div>
  <h2>Meta AI</h2>
  <p>Open the official Meta AI website. Login persistence depends on your browser and Meta settings.</p>
  <button class="action main" onclick="external(META_AI)">Open Meta AI ↗</button>
 </div>
</section>

<section id="account" class="page">
 <button class="back" onclick="page('home')">← Back to Home</button>
 <div class="detail">
  <div class="icon">👤</div>
  <h2>Meta Account Center</h2>
  <p>Visit Meta to review supported account settings.</p>
  <button class="action main" onclick="external(ACCOUNT_CENTER)">Open Account Center ↗</button>
  <button class="action" onclick="external(META_HELP)">Meta Help Center ↗</button>
 </div>
</section>

<section id="email" class="page">
 <button class="back" onclick="page('home')">← Back to Home</button>
 <div class="detail">
  <div class="icon">📧</div>
  <h2>Email & Contact Info</h2>
  <p>Use Meta's official settings to review or update supported email and contact details.</p>
  <button class="action main" onclick="external(ACCOUNT_CENTER)">Manage via Account Center ↗</button>
  <button class="action" onclick="external(META_HELP)">Official Help ↗</button>
  <div class="notice">Never share your password, OTP or login cookies with a bot.</div>
 </div>
</section>

<section id="help" class="page">
 <button class="back" onclick="page('home')">← Back to Home</button>
 <div class="detail">
  <div class="icon">🛡️</div>
  <h2>Help & Safety</h2>
  <p>Always check the website address before signing in. Use official Meta support for account recovery.</p>
  <button class="action main" onclick="external(META_HELP)">Open Meta Help ↗</button>
 </div>
</section>
</main>
</div>

<div class="bottom">
 <div class="nav">
  <button class="active" data-page="home" onclick="page('home')"><span>⌂</span>Home</button>
  <button data-page="meta" onclick="page('meta')"><span>✦</span>Meta AI</button>
  <button data-page="account" onclick="page('account')"><span>👤</span>Account</button>
  <button data-page="email" onclick="page('email')"><span>✉</span>Email</button>
 </div>
</div>

<script>
const tg = window.Telegram && window.Telegram.WebApp
 ? window.Telegram.WebApp : null;

if(tg){
 tg.ready();
 tg.expand();
 try{
  tg.setHeaderColor("#080d1b");
  tg.setBackgroundColor("#080d1b");
 }catch(e){}
}

function page(id){
 document.querySelectorAll(".page").forEach(x=>{
  x.classList.toggle("active",x.id===id);
 });
 document.querySelectorAll(".nav button").forEach(x=>{
  x.classList.toggle("active",x.dataset.page===id);
 });
 window.scrollTo({top:0,behavior:"smooth"});
}

function external(url){
 if(tg && typeof tg.openLink==="function"){
  tg.openLink(url);
 }else{
  window.open(url,"_blank","noopener,noreferrer");
 }
}
</script>
</body>
</html>`;
}

async function telegram(method, token, data) {
  const response = await fetch(
    "https://api.telegram.org/bot" + token + "/" + method,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    }
  );
  return await response.json();
}

async function sendMessage(token, chatId, text, keyboard) {
  return telegram("sendMessage", token, {
    chat_id: chatId,
    text,
    reply_markup: keyboard
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.BOT_TOKEN;

    // Mini App website
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(html(), {
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
    }

    if (!token) {
      return new Response(
        "BOT_TOKEN secret is missing. Add it in Cloudflare Worker Settings.",
        {status: 500}
      );
    }

    // One-time setup: open /setup?key=YOUR_SETUP_KEY
    // Set both BOT_TOKEN and SETUP_KEY as Worker secrets.
    if (request.method === "GET" && url.pathname === "/setup") {
      if (!env.SETUP_KEY || url.searchParams.get("key") !== env.SETUP_KEY) {
        return new Response("Unauthorized", {status: 401});
      }

      const webhookUrl = url.origin + "/telegram";
      const result = await telegram("setWebhook", token, {
        url: webhookUrl,
        allowed_updates: ["message"]
      });

      return new Response(
        result.ok
          ? "Webhook configured successfully. You can now open your Telegram bot."
          : "Webhook setup failed: " + JSON.stringify(result),
        {headers: {"Content-Type": "text/plain; charset=UTF-8"}}
      );
    }

    // Telegram webhook endpoint
    if (request.method === "POST" && url.pathname === "/telegram") {
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", {status: 400});
      }

      if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const text = (message.text || "").trim();
        const firstName = message.from?.first_name || "there";
        const appUrl = url.origin;

        const keyboard = {
          inline_keyboard: [
            [{text: "🚀 Open Mini App", web_app: {url: appUrl}}],
            [
              {text: "🤖 Meta AI", url: META_AI},
              {text: "👤 Account Center", url: ACCOUNT_CENTER}
            ],
            [{text: "❓ Help", callback_data: "help"}]
          ]
        };

        if (text === "/start" || text.startsWith("/start ")) {
          await sendMessage(
            token,
            chatId,
            "👋 Hello, " + firstName + "!\n\n" +
            "Welcome to Meta AI Hub.\n\n" +
            "🚀 Open the Mini App using the button below.\n" +
            "🤖 Visit the official Meta AI website.\n" +
            "👤 Open Meta Account Center.\n\n" +
            "🔐 Never share your Meta password or OTP with a bot.",
            keyboard
          );
        } else if (text === "/help") {
          await sendMessage(
            token,
            chatId,
            "ℹ️ Help\n\n" +
            "Tap Open Mini App to use the dashboard.\n" +
            "Meta AI: " + META_AI + "\n" +
            "Account Center: " + ACCOUNT_CENTER + "\n\n" +
            "This bot does not collect passwords, OTPs or login cookies.",
            keyboard
          );
        } else {
          await sendMessage(
            token,
            chatId,
            "Use the buttons below to open Meta AI Hub.",
            keyboard
          );
        }
      }

      return new Response("OK");
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("Meta AI Hub Worker is running.");
    }

    return new Response("Not found", {status: 404});
  }
};
