/**
 * 👑 AlokOTP Pro — FINAL FULL-STACK EDITION (Bot + Mini App)
 * 100% Dynamic, 3% Margin, Advanced Admin Panel, Working Cancel/Refund
 */

const BOT_TOKEN = "8958056500:AAFPh8tVoxDaZEy_dyw6f_oZWX_lFGyTCUc";
const ADMIN_ID = 8452322818;
const GRIZZLY_API_KEY = "7cd21341575f5a4b44c040530c314b3e";
const GRIZZLY_BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const PROFIT_PERCENTAGE = 0.03; // 3% Profit Margin

// ==========================================
// 1. FRONTEND: THE WEB APP UI (Grizzly Theme)
// ==========================================
const buildHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AlokOTP Store</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f5f7fa;
            --card-bg: #ffffff;
            --text-main: #333333;
            --text-muted: #888888;
            --primary: #ff6a00;
            --border: #e0e0e0;
        }
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: var(--bg-color); color: var(--text-main); margin: 0; padding: 0; overflow-x: hidden; }
        .header { background: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
        .logo { font-size: 20px; font-weight: 900; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
        .logo i { color: var(--primary); font-size: 24px; }
        .profile-btn { background: var(--primary); color: #fff; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 5px; }
        .container { padding: 20px; }
        .section-title { font-size: 16px; font-weight: 700; margin-bottom: 15px; color: var(--text-main); }
        .service-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
        .service-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; font-size: 14px; }
        .service-card.active { border-color: var(--primary); background: #fff5eb; }
        .service-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-size: 18px; }
        .icon-wa { color: #25D366; background: #e9fbf0; } .icon-tg { color: #0088cc; background: #e5f3fa; } .icon-ig { color: #E1306C; background: #fceaf0; } .icon-fb { color: #1877F2; background: #e8f1fe; } .icon-go { color: #DB4437; background: #fbeceb; }
        .search-box { width: 100%; background: var(--card-bg); border: 1px solid var(--border); padding: 14px 15px; border-radius: 12px; font-size: 15px; margin-bottom: 15px; box-sizing: border-box; outline: none; }
        .country-list { display: flex; flex-direction: column; gap: 10px; }
        .country-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .c-left { display: flex; align-items: center; gap: 12px; }
        .c-flag { font-size: 26px; }
        .c-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
        .c-qty { font-size: 12px; color: var(--text-muted); }
        .c-buy { background: var(--primary); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; }
        #orderScreen { display: none; }
        .order-box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; margin-top: 20px; }
        .o-phone { font-size: 28px; font-weight: 900; color: var(--primary); margin: 15px 0; }
        .o-status { font-size: 14px; font-weight: bold; color: #f39c12; margin-bottom: 20px; background: #fdf5e6; padding: 8px; border-radius: 8px; }
        .o-code { font-size: 36px; font-weight: 900; color: #2ecc71; margin: 20px 0; display: none; }
        .btn-row { display: flex; gap: 10px; justify-content: center; }
        .btn-check { flex: 1; background: #2ecc71; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancel { flex: 1; background: #e74c3c; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .loader { text-align: center; padding: 40px; color: var(--text-muted); font-weight: bold; display: none; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo"><i class="fas fa-paw"></i> AlokOTP</div>
        <div class="profile-btn" id="balDisplay"><i class="fas fa-wallet"></i> $0.00</div>
    </div>
    <div class="container" id="mainScreen">
        <div class="section-title">Service selection</div>
        <div class="service-grid" id="services">
            <div class="service-card active" onclick="loadCountries('wa', this)"><div class="service-icon icon-wa"><i class="fab fa-whatsapp"></i></div> WhatsApp</div>
            <div class="service-card" onclick="loadCountries('tg', this)"><div class="service-icon icon-tg"><i class="fab fa-telegram-plane"></i></div> Telegram</div>
            <div class="service-card" onclick="loadCountries('ig', this)"><div class="service-icon icon-ig"><i class="fab fa-instagram"></i></div> Instagram</div>
            <div class="service-card" onclick="loadCountries('fb', this)"><div class="service-icon icon-fb"><i class="fab fa-facebook-f"></i></div> Facebook</div>
            <div class="service-card" onclick="loadCountries('go', this)"><div class="service-icon icon-go"><i class="fab fa-google"></i></div> Google</div>
        </div>
        <div class="section-title" id="countryTitle">Country selection for WhatsApp</div>
        <input type="text" id="searchBox" class="search-box" placeholder="🔍 Search by country" onkeyup="filterCountries()">
        <div class="loader" id="loader"><div class="spinner"></div>Loading live stock...</div>
        <div class="country-list" id="countryList"></div>
    </div>
    <div class="container" id="orderScreen">
        <button onclick="showMain()" style="background:none; border:none; color:var(--text-muted); font-size:16px; cursor:pointer; font-weight:bold; margin-bottom:10px;"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="order-box">
            <h3>Your Virtual Number</h3>
            <div class="o-phone" id="oPhone">+1...</div>
            <div class="o-status" id="oStatus"><i class="fas fa-spinner fa-spin"></i> Waiting for SMS...</div>
            <div class="o-code" id="oCode"></div>
            <div class="btn-row" id="oButtons">
                <button class="btn-check" onclick="checkOTP()">Check SMS</button>
                <button class="btn-cancel" onclick="cancelOrder()">Cancel & Refund</button>
            </div>
        </div>
    </div>
    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const API_URL = window.location.href;
        let currentSrv = 'wa', stockData = [], userId = tg.initDataUnsafe?.user?.id || 'TEST_USER', currentOrderId = null;

        async function initUser() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_user', userId }) });
                const data = await res.json();
                document.getElementById('balDisplay.innerHTML = \`<i class="fas fa-wallet"></i> $\${data.balance}\`;
            } catch (e) {}
        }
        async function loadCountries(srv, btn) {
            currentSrv = srv;
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
            if(btn) btn.classList.add('active');
            document.getElementById('countryTitle').innerText = \`Country selection for \${srv.toUpperCase()}\`;
            document.getElementById('searchBox').value = '';
            document.getElementById('countryList').innerHTML = '';
            document.getElementById('loader').style.display = 'block';
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_stock', service: srv }) });
                const data = await res.json();
                stockData = data.items;
                renderList(stockData);
            } catch (e) {}
            document.getElementById('loader').style.display = 'none';
        }
        function renderList(items) {
            const list = document.getElementById('countryList');
            list.innerHTML = '';
            items.forEach(item => {
                list.innerHTML += \`
                    <div class="country-card">
                        <div class="c-left">
                            <div class="c-flag">🌐</div>
                            <div>
                                <div class="c-name">\${item.name}</div>
                                <div class="c-qty">\${item.stock} qty available</div>
                            </div>
                        </div>
                        <button class="c-buy" onclick="buyNumber('\${item.id}', '\${item.price}')">$\${item.price}</button>
                    </div>\`;
            });
        }
        function filterCountries() {
            const q = document.getElementById('searchBox').value.toLowerCase();
            renderList(stockData.filter(i => i.name.toLowerCase().includes(q)));
        }
        async function buyNumber(countryId, price) {
            tg.showConfirm(\`Buy number for $\${price}?\`, async (ok) => {
                if(!ok) return;
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'buy', userId, service: currentSrv, country: countryId, price }) });
                    const data = await res.json();
                    if(data.success) {
                        currentOrderId = data.actId;
                        document.getElementById('oPhone').innerText = '+' + data.phone;
                        document.getElementById('oStatus').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for SMS...';
                        document.getElementById('oCode').style.display = 'none';
                        document.getElementById('oButtons').style.display = 'flex';
                        document.getElementById('mainScreen').style.display = 'none';
                        document.getElementById('orderScreen').style.display = 'block';
                        initUser();
                    } else { tg.showAlert(data.message || "Failed!"); }
                } catch(e) {}
            });
        }
        async function checkOTP() {
            if(!currentOrderId) return;
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'status', actId: currentOrderId }) });
                const data = await res.json();
                if(data.status === 'OK') {
                    document.getElementById('oStatus').innerHTML = '✅ SMS Received!';
                    document.getElementById('oCode').innerText = data.code;
                    document.getElementById('oCode').style.display = 'block';
                    document.getElementById('oButtons').style.display = 'none';
                } else { tg.showAlert("Status: " + data.status); }
            } catch(e) {}
        }
        async function cancelOrder() {
            if(!currentOrderId) return;
            tg.showConfirm("Cancel order and refund funds?", async (ok) => {
                if(!ok) return;
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'cancel', userId, actId: currentOrderId }) });
                    const data = await res.json();
                    if(data.success) {
                        tg.showAlert("✅ Refunded!");
                        initUser();
                        showMain();
                    } else { tg.showAlert("Cannot cancel: " + data.message); }
                } catch(e) {}
            });
        }
        function showMain() {
            document.getElementById('orderScreen').style.display = 'none';
            document.getElementById('mainScreen').style.display = 'block';
        }
        initUser();
        loadCountries('wa');
    </script>
</body>
</html>
`;

// ==========================================
// 2. BACKEND WORKER ROUTER
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(buildHTML(), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.type === 'api') {
            if (body.action === 'get_user') {
                const user = await getUser(body.userId, env);
                return new Response(JSON.stringify({ balance: user.balance.toFixed(2) }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'get_stock') {
                const stock = await fetchLiveStock(body.service);
                return new Response(JSON.stringify({ items: stock }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'buy') {
                const user = await getUser(body.userId, env);
                if (user.balance < parseFloat(body.price)) return new Response(JSON.stringify({ success: false, message: "Insufficient Balance!" }), { headers: { "Content-Type": "application/json" } });
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=${body.service}&country=${body.country}`);
                const text = await res.text();
                if (text.startsWith("ACCESS_NUMBER")) {
                    const [, actId, phone] = text.split(":");
                    await adjustBalance(body.userId, -parseFloat(body.price), env);
                    await env.USERS_DB.put(`act:${actId}`, JSON.stringify({ userId: body.userId, cost: parseFloat(body.price), phone }));
                    return new Response(JSON.stringify({ success: true, actId, phone }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'status') {
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${body.actId}`);
                const text = await res.text();
                if (text.startsWith("STATUS_OK")) {
                    const code = text.split(":")[1];
                    await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=6&id=${body.actId}`);
                    return new Response(JSON.stringify({ status: 'OK', code }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ status: text }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'cancel') {
                const orderStr = await env.USERS_DB.get(`act:${body.actId}`);
                if (!orderStr) return new Response(JSON.stringify({ success: false, message: "Not found" }), { headers: { "Content-Type": "application/json" } });
                const order = JSON.parse(orderStr);
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${body.actId}`);
                const text = await res.text();
                if (text === "ACCESS_CANCEL") {
                    await adjustBalance(body.userId, order.cost, env);
                    await env.USERS_DB.delete(`act:${body.actId}`);
                    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { headers: { "Content-Type": "application/json" } });
            }
        }
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text || "";
            const userId = body.message.from.id.toString();
            await ensureUser(userId, body.message.from, env);
            if (text.startsWith("/start")) {
                const user = await getUser(userId, env);
                const welcomeText = `👑 *AlokOTP Supreme Store*\n\n💰 *Balance:* \`$${user.balance.toFixed(2)}\`\n🆔 *ID:* \`${userId}\``;
                const kb = { inline_keyboard: [[{ text: "🛒 Open Live Store", web_app: { url: request.url } }]] };
                if (userId === ADMIN_ID.toString()) kb.inline_keyboard.push([{ text: "🛡️ Admin Panel", callback_data: "admin_panel" }]);
                await sendTgMessage(chatId, welcomeText, kb);
            }
            if (userId === ADMIN_ID.toString() && text.startsWith("/add")) {
                const parts = text.split(" ");
                if (parts.length === 3) {
                    const newBal = await adjustBalance(parts[1], parseFloat(parts[2]), env);
                    await sendTgMessage(chatId, `✅ Added $${parts[2]} to ${parts[1]}. Bal: $${newBal.toFixed(2)}`);
                }
            }
        }
        if (body.callback_query && body.callback_query.data === "admin_panel" && body.callback_query.from.id.toString() === ADMIN_ID.toString()) {
            const gBal = await (await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getBalance`)).text();
            await sendTgMessage(body.callback_query.message.chat.id, `🛡️ *Admin Panel*\n🐻 API Bal: \`${gBal}\`\nCommand: \`/add UserID Amount\``);
        }
      } catch (err) {}
      return new Response("OK", { status: 200 });
    }
  }
};

async function fetchLiveStock(serviceCode) {
    try {
        const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getPricesV3&service=${serviceCode}`);
        const data = await res.json();
        let items = [];
        for (const cId in data) {
            if (data[cId] && data[cId][serviceCode]) {
                const item = data[cId][serviceCode];
                const stock = parseInt(item.count || 0);
                if (stock > 0) {
                    const baseCost = parseFloat(item.price || item.cost || 0.15);
                    const finalPrice = (baseCost * (1 + PROFIT_PERCENTAGE)).toFixed(2);
                    items.push({ id: cId, name: getCountryName(cId), stock, price: finalPrice });
                }
            }
        }
        items.sort((a, b) => b.stock - a.stock);
        return items;
    } catch (e) { return []; }
}
function getCountryName(cId) {
    const map = { "0":"Russia", "1":"Ukraine", "2":"Kazakhstan", "3":"China", "4":"Philippines", "6":"Indonesia", "11":"USA", "12":"USA (Phy)", "16":"UK", "22":"India", "36":"Canada", "43":"Germany", "73":"Brazil" };
    return map[cId] || `Country ${cId}`;
}
async function ensureUser(userId, from, env) {
    if (!(await env.USERS_DB.get(`usr:${userId}`))) await env.USERS_DB.put(`usr:${userId}`, JSON.stringify({ balance: 0.00 }));
}
async function getUser(userId, env) {
    const data = await env.USERS_DB.get(`usr:${userId}`);
    return data ? JSON.parse(data) : { balance: 0.00 };
}
async function adjustBalance(userId, delta, env) {
    const user = await getUser(userId, env);
    user.balance = Math.max(0, parseFloat((user.balance + delta).toFixed(2)));
    await env.USERS_DB.put(`usr:${userId}`, JSON.stringify(user));
    return user.balance;
}
async function sendTgMessage(chatId, text, kb = null) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", reply_markup: kb }) });
}
