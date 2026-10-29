const META_AI = "https://www.meta.ai/";
const ACCOUNT_CENTER = "https://accountscenter.facebook.com/";
const META_HELP = "https://www.facebook.com/help/";

function makePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#080d1b">
<title>Meta AI Hub</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
*{box-sizing:border-box}
body{
 margin:0;padding:18px 15px 95px;
 background:radial-gradient(circle at top right,#263d70,transparent 35%),#080d1b;
 color:#f5f7ff;font-family:Arial,system-ui,sans-serif
}
.wrap{max-width:600px;margin:auto}
header{display:flex;align-items:center;gap:12px;margin:10px 0 24px}
.logo{
 width:48px;height:48px;border-radius:16px;
 display:grid;place-items:center;font-size:25px;
 background:linear-gradient(135deg,#7189ff,#4ce0cb)
}
h1{font-size:20px;margin:0}
.small{font-size:12px;color:#aab7d1;margin-top:4px}
.hero{
 padding:24px;border-radius:23px;
 background:linear-gradient(135deg,#1d2e59,#12333b);
 border:1px solid #ffffff18
}
.hero h2{font-size:28px;line-height:1.2}
p{color:#aab7d1;font-size:13px;line-height:1.6}
button{font:inherit;cursor:pointer}
.primary{
 border:0;border-radius:13px;padding:12px 16px;
 background:linear-gradient(100deg,#7189ff,#4ce0cb);
 color:#081323;font-weight:bold
}
.title{margin:25px 2px 12px;font-weight:bold}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{
 min-height:140px;padding:16px;text-align:left;
 color:white;background:#121b30;
 border:1px solid #ffffff15;border-radius:20px
}
.icon{font-size:27px;margin-bottom:12px}
.card h3{font-size:15px;margin:0}
.card p{margin-bottom:0}
.page{display:none}
.page.active{display:block}
.detail{
 background:#121b30;border:1px solid #ffffff15;
 padding:21px;border-radius:22px
}
.detail h2{margin:10px 0}
.back,.action{
 display:block;width:100%;padding:13px;margin-top:12px;
 border-radius:12px;border:1px solid #ffffff15;
 background:#263657;color:white;text-align:center;
 text-decoration:none;font-weight:bold
}
.action.main{background:linear-gradient(100deg,#7189ff,#4ce0cb);color:#081323}
.notice{
 margin-top:17px;padding:14px;border-radius:15px;
 background:#10192a;color:#aab7d1;font-size:12px;line-height:1.6
}
.bottom{
 position:fixed;bottom:0;left:0;right:0;
 padding:8px 6px;background:#080d1bf5;
 border-top:1px solid #ffffff15
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
 <div><h1>Meta AI Hub</h1><div class="small">Your account shortcuts</div></div>
</header>

<main>
<section id="home" class="page active">
 <div class="hero">
  <div class="small">WELCOME TO YOUR HUB</div>
  <h2>Everything in one place.</h2>
  <p>Quick access to Meta AI and official account settings.</p>
  <button class="primary" onclick="external(META_AI)">🤖 Open Meta AI ↗</button>
 </div>

 <div class="title">Quick Access</div>
 <div class="grid">
  <button class="card" onclick="showPage('meta')">
   <div class="icon">🤖</div><h3>Meta AI</h3>
   <p>Open the official website.</p>
  </button>
  <button class="card" onclick="showPage('account')">
   <div class="icon">👤</div><h3>Account Center</h3>
   <p>Visit account settings.</p>
  </button>
  <button class="card" onclick="showPage('email')">
   <div class="icon">📧</div><h3>Email / Contact</h3>
   <p>Manage details on Meta.</p>
  </button>
  <button class="card" onclick="showPage('help')">
   <div class="icon">🛡️</div><h3>Help & Safety</h3>
   <p>Security and help resources.</p>
  </button>
 </div>
 <div class="notice">
  🔐 Never share passwords, verification codes or login cookies with a bot.
  Sign in only on official Meta websites.
 </div>
</section>

<section id="meta" class="page">
 <button class="back" onclick="showPage('home')">← Back</button>
 <div class="detail">
  <div class="icon">🤖</div><h2>Meta AI</h2>
  <p>Open the official Meta AI website. Login persistence depends on your browser and Meta settings.</p>
  <button class="action main" onclick="external(META_AI)">Open Meta AI ↗</button>
 </div>
</section>

<section id="account" class="page">
 <button class="back" onclick="showPage('home')">← Back</button>
 <div class="detail">
  <div class="icon">👤</div><h2>Account Center</h2>
  <p>Review available account settings on Meta's official website.</p>
  <button class="action main" onclick="external(ACCOUNT_CENTER)">Open Account Center ↗</button>
  <button class="action" onclick="external(META_HELP)">Meta Help ↗</button>
 </div>
</section>

<section id="email" class="page">
 <button class="back" onclick="showPage('home')">← Back</button>
 <div class="detail">
  <div class="icon">📧</div><h2>Email & Contact Info</h2>
  <p>Use the official Meta Account Center to review supported contact details.</p>
  <button class="action main" onclick="external(ACCOUNT_CENTER)">Open Account Center ↗</button>
  <button class="action" onclick="external(META_HELP)">Official Help ↗</button>
  <div class="notice">This Mini App does not read Gmail or collect account passwords and OTPs.</div>
 </div>
</section>

<section id="help" class="page">
 <button class="back" onclick="showPage('home')">← Back</button>
 <div class="detail">
  <div class="icon">🛡️</div><h2>Help & Safety</h2>
  <p>Check the website address before signing in. Use official support for account recovery.</p>
  <button class="action main" onclick="external(META_HELP)">Open Meta Help ↗</button>
 </div>
</section>
</main>
</div>

<div class="bottom">
 <div class="nav">
  <button class="active" data-page="home" onclick="showPage('home')"><span>⌂</span>Home</button>
  <button data-page="meta" onclick="showPage('meta')"><span>✦</span>Meta AI</button>
  <button data-page="account" onclick="showPage('account')"><span>👤</span>Account</button>
  <button data-page="email" onclick="showPage('email')"><span>✉</span>Email</button>
 </div>
</div>

<script>
const META_AI = "https://www.meta.ai/";
const ACCOUNT_CENTER = "https://accountscenter.facebook.com/";
const META_HELP = "https://www.facebook.com/help/";

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

function showPage(id){
 document.querySelectorAll(".page").forEach(p=>{
  p.classList.toggle("active",p.id===id);
 });
 document.querySelectorAll(".nav button").forEach(b=>{
  b.classList.toggle("active",b.dataset.page===id);
 });
 window.scrollTo(0,0);
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

async function callTelegram(env, method, data) {
  return fetch(
    "https://api.telegram.org/bot" + env.BOT_TOKEN + "/" + method,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Website / Telegram Mini App
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(makePage(), {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    // Health check
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("Worker is running.");
    }

    if (!env.BOT_TOKEN) {
      return new Response("BOT_TOKEN Secret is missing.", {status:500});
    }

    // Configure Telegram webhook once using a secret setup key
    if (request.method === "GET" && url.pathname === "/setup") {
      if (!env.SETUP_KEY ||
          url.searchParams.get("key") !== env.SETUP_KEY) {
        return new Response("Unauthorized", {status:401});
      }

      const response = await callTelegram(env, "setWebhook", {
        url: url.origin + "/telegram",
        allowed_updates: ["message"]
      });

      const result = await response.json();

      return new Response(
        result.ok ? "Webhook configured successfully." :
        "Webhook setup failed: " + JSON.stringify(result),
        {headers: {"Content-Type":"text/plain;charset=UTF-8"}}
      );
    }

    // Telegram webhook
    if (request.method === "POST" && url.pathname === "/telegram") {
      let update;

      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", {status:400});
      }

      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const command = (msg.text || "").trim();
        const name = msg.from?.first_name || "there";

        const keyboard = {
          inline_keyboard: [
            [{text:"🚀 Open Mini App",web_app:{url:url.origin}}],
            [
              {text:"🤖 Meta AI",url:META_AI},
              {text:"👤 Account Center",url:ACCOUNT_CENTER}
            ],
            [{text:"❓ Help",callback_data:"help"}]
          ]
        };

        let text;

        if (command === "/start" || command.startsWith("/start ")) {
          text =
            "👋 Hello, " + name + "!\n\n" +
            "Welcome to Meta AI Hub.\n\n" +
            "Use the buttons below to open the Mini App, Meta AI or Account Center.\n\n" +
            "🔐 Never share your password or OTP with a bot.";
        } else if (command === "/help") {
          text =
            "ℹ️ Help\n\n" +
            "Open the Mini App using the button below.\n" +
            "Meta AI: " + META_AI + "\n" +
            "Account Center: " + ACCOUNT_CENTER;
        } else {
          text = "Choose an option from the menu below.";
        }

        await callTelegram(env, "sendMessage", {
          chat_id:chatId,
          text,
          reply_markup:keyboard
        });
      }

      if (update.callback_query) {
        const q = update.callback_query;

        await callTelegram(env, "answerCallbackQuery", {
          callback_query_id:q.id
        });

        if (q.data === "help") {
          await callTelegram(env, "sendMessage", {
            chat_id:q.message.chat.id,
            text:"Use Open Mini App to access the dashboard.\n\n" +
              "Meta AI: " + META_AI + "\n" +
              "Account Center: " + ACCOUNT_CENTER
          });
        }
      }

      return new Response("OK");
    }

    return new Response("Not found", {status:404});
  }
};
