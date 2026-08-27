/**
 * ðŸ‘‘ AlokOTP Pro â€” FULL-STACK WEB APP EDITION (Grizzly Clone)
 * 100% Dynamic, 3% Margin, Advanced Admin Panel, Working Cancel/Refund
 */

const BOT_TOKEN = "8958056500:AAFPh8tVoxDaZEy_dyw6f_oZWX_lFGyTCUc";
const ADMIN_ID = 8452322818;
const GRIZZLY_API_KEY = "7cd21341575f5a4b44c040530c314b3e";
const GRIZZLY_BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const PROFIT_PERCENTAGE = 0.03; // 3% Profit Margin

// ==========================================
// 1. FRONTEND: THE WEB APP UI (HTML/CSS/JS)
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
            --primary: #ff6a00; /* Grizzly Orange */
            --primary-hover: #e65c00;
            --border: #e0e0e0;
        }
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: var(--bg-color); color: var(--text-main); margin: 0; padding: 0; overflow-x: hidden; }
        
        /* Header */
        .header { background: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
        .logo { font-size: 20px; font-weight: 900; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
        .logo i { color: var(--primary); font-size: 24px; }
        .profile-btn { background: var(--primary); color: #fff; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(255, 106, 0, 0.3); display: flex; align-items: center; gap: 5px; }

        /* Container */
        .container { padding: 20px; }
        .section-title { font-size: 16px; font-weight: 700; margin-bottom: 15px; color: var(--text-main); display: flex; justify-content: space-between; }
        
        /* Service Grid */
        .service-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px; }
        .service-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; font-weight: 600; font-size: 14px; }
        .service-card.active { border-color: var(--primary); background: #fff5eb; box-shadow: 0 4px 10px rgba(255, 106, 0, 0.1); }
        .service-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-size: 18px; }
        .icon-wa { color: #25D366; background: #e9fbf0; } .icon-tg { color: #0088cc; background: #e5f3fa; } .icon-ig { color: #E1306C; background: #fceaf0; } .icon-fb { color: #1877F2; background: #e8f1fe; } .icon-go { color: #DB4437; background: #fbeceb; }
        
        /* Search Box */
        .search-box { width: 100%; background: var(--card-bg); border: 1px solid var(--border); padding: 14px 15px; border-radius: 12px; font-size: 15px; margin-bottom: 15px; box-sizing: border-box; outline: none; transition: 0.3s; }
        .search-box:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(255, 106, 0, 0.2); }
        
        /* Country List */
        .country-list { display: flex; flex-direction: column; gap: 10px; }
        .country-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .c-left { display: flex; align-items: center; gap: 12px; }
        .c-flag { font-size: 26px; }
        .c-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
        .c-qty { font-size: 12px; color: var(--text-muted); }
        .c-buy { background: var(--primary); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(255, 106, 0, 0.3); }
        .c-buy:active { transform: scale(0.95); }

        /* Order Screen */
        #orderScreen { display: none; }
        .order-box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; margin-top: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .o-phone { font-size: 32px; font-weight: 900; color: var(--primary); margin: 15px 0; letter-spacing: 1px; }
        .o-status { font-size: 14px; font-weight: bold; color: #f39c12; margin-bottom: 20px; background: #fdf5e6; padding: 8px; border-radius: 8px; }
        .o-code { font-size: 40px; font-weight: 900; color: #2ecc71; margin: 20px 0; display: none; }
        .btn-row { display: flex; gap: 10px; justify-content: center; }
        .btn-check { flex: 1; background: #2ecc71; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer; }
        .btn-cancel { flex: 1; background: #e74c3c; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer; }

        /* Loader */
        .loader { text-align: center; padding: 40px; color: var(--text-muted); font-weight: bold; display: none; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="header">
        <div class="logo"><i class="fas fa-paw"></i> AlokOTP</div>
        <div class="profile-btn" id="balDisplay"><i class="fas fa-wallet"></i> $0.00</div>
    </div>

    <div class="container" id="mainScreen">
        <div class="section-title"><span>Service selection</span></div>
        
        <div class="service-grid" id="services">
            <div class="service-card active" onclick="loadCountries('wa', this)"><div class="service-icon icon-wa"><i class="fab fa-whatsapp"></i></div> WhatsApp</div>
            <div class="service-card" onclick="loadCountries('tg', this)"><div class="service-icon icon-tg"><i class="fab fa-telegram-plane"></i></div> Telegram</div>
            <div class="service-card" onclick="loadCountries('ig', this)"><div class="service-icon icon-ig"><i class="fab fa-instagram"></i></div> Instagram</div>
            <div class="service-card" onclick="loadCountries('fb', this)"><div class="service-icon icon-fb"><i class="fab fa-facebook-f"></i></div> Facebook</div>
            <div class="service-card" onclick="loadCountries('go', this)"><div class="service-icon icon-go"><i class="fab fa-google"></i></div> Google</div>
        </div>

        <div class="section-title"><span id="countryTitle">Country selection for WhatsApp</span></div>
        <input type="text" id="searchBox" class="search-box" placeholder="ðŸ” Search by country" onkeyup="filterCountries()">
        
        <div class="loader" id="loader"><div class="spinner"></div>Loading live stock...</div>
        <div class="country-list" id="countryList"></div>
    </div>

    <!-- Active Order Screen -->
    <div class="container" id="orderScreen">
        <button onclick="showMain()" style="background:none; border:none; color:var(--text-muted); font-size:16px; cursor:pointer; font-weight:bold; margin-bottom:10px;"><i class="fas fa-arrow-left"></i> Back to Store</button>
        <div class="order-box">
            <h3 style="margin:0; color:var(--text-main);">Your Virtual Number</h3>
            <div class="o-phone" id="oPhone">+1 234 567 8900</div>
            <div class="o-status" id="oStatus"><i class="fas fa-spinner fa-spin"></i> Waiting for SMS...</div>
            <div class="o-code" id="oCode"></div>
            
            <div class="btn-row" id="oButtons">
                <button class="btn-check" onclick="checkOTP()"><i class="fas fa-sync-alt"></i> Check SMS</button>
                <button class="btn-cancel" onclick="cancelOrder()"><i class="fas fa-times"></i> Cancel</button>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const API_URL = window.location.href;
        
        let currentSrv = 'wa';
        let stockData = [];
        let userId = tg.initDataUnsafe?.user?.id || 'TEST_USER';
        let currentOrderId = null;

        // Initialize User Balance
        async function initUser() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_user', userId }) });
                const data = await res.json();
                document.getElementById('balDisplay').innerHTML = \`<i class="fas fa-wallet"></i> $\${data.balance}\`;
            } catch (e) {}
        }

        // Load Live Stock
        async function loadCountries(srv, btn) {
            currentSrv = srv;
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
            if(btn) btn.classList.add('active');
            
            const titles = { 'wa': 'WhatsApp', 'tg': 'Telegram', 'ig': 'Instagram', 'fb': 'Facebook', 'go': 'Google' };
            document.getElementById('countryTitle').innerText = \`Country selection for \${titles[srv]}\`;
            document.getElementById('searchBox').value = '';
            
            document.getElementById('countryList').innerHTML = '';
            document.getElementById('loader').style.display = 'block';

            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_stock', service: srv }) });
                const data = await res.json();
                stockData = data.items;
                renderList(stockData);
            } catch (e) { alert("Failed to fetch live stock."); }
            document.getElementById('loader').style.display = 'none';
        }

        function renderList(items) {
            const list = document.getElementById('countryList');
            list.innerHTML = '';
            items.forEach(item => {
                list.innerHTML += \`
                    <div class="country-card">
                        <div class="c-left">
                            <div class="c-flag">ðŸŒ</div>
                            <div>
                                <div class="c-name">\${item.name}</div>
                                <div class="c-qty">\${item.stock} qty available</div>
                            </div>
                        </div>
                        <button class="c-buy" onclick="buyNumber('\${item.id}', '\${item.price}')">$\${item.price}</button>
                    </div>
                \`;
            });
        }

        function filterCountries() {
            const q = document.getElementById('searchBox').value.toLowerCase();
            renderList(stockData.filter(i => i.name.toLowerCase().includes(q)));
        }

        // Buy Number
        async function buyNumber(countryId, price) {
            tg.showConfirm(\`Buy \${currentSrv.toUpperCase()} number for $\${price}?\`, async (ok) => {
                if(!ok) return;
                tg.MainButton.showProgress();
                
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'buy', userId, service: currentSrv, country: countryId, price }) });
                    const data = await res.json();
                    
                    if(data.success) {
                        currentOrderId = data.actId;
                        document.getElementById('oPhone').innerText = '+' + data.phone;
                        document.getElementById('oStatus').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for SMS...';
                        document.getElementById('oStatus').style.color = '#f39c12';
                        document.getElementById('oCode').style.display = 'none';
                        document.getElementById('oButtons').style.display = 'flex';
                        
                        document.getElementById('mainScreen').style.display = 'none';
                        document.getElementById('orderScreen').style.display = 'block';
                        initUser(); // Update balance
                    } else {
                        tg.showAlert(data.message || "Failed to buy number. Check balance.");
                    }
                } catch(e) { tg.showAlert("Network error."); }
                tg.MainButton.hideProgress();
            });
        }

        // Check OTP
        async function checkOTP() {
            if(!currentOrderId) return;
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'status', actId: currentOrderId }) });
                const data = await res.json();
                
                if(data.status === 'OK') {
                    document.getElementById('oStatus').innerHTML = '<i class="fas fa-check-circle"></i> SMS Received!';
                    document.getElementById('oStatus').style.color = '#2ecc71';
                    document.getElementById('oCode').innerText = data.code;
                    document.getElementById('oCode').style.display = 'block';
                    document.getElementById('oButtons').style.display = 'none';
                } else if (data.status === 'WAITING') {
                    tg.showAlert("â³ Still waiting for SMS. Please wait...");
                } else {
                    tg.showAlert("Order Status: " + data.status);
                }
            } catch(e) {}
        }

        // Cancel Order & Refund
        async function cancelOrder() {
            if(!currentOrderId) return;
            tg.showConfirm("Are you sure you want to cancel? Funds will be refunded.", async (ok) => {
                if(!ok) return;
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'cancel', userId, actId: currentOrderId }) });
                    const data = await res.json();
                    
                    if(data.success) {
                        tg.showAlert("âœ… Order Cancelled! Refund added to your wallet.");
                        initUser();
                        showMain();
                    } else {
                        tg.showAlert("âš ï¸ Could not cancel: " + data.message);
                    }
                } catch(e) {}
            });
        }

        function showMain() {
            document.getElementById('orderScreen').style.display = 'none';
            document.getElementById('mainScreen').style.display = 'block';
        }

        // Boot
        initUser();
        loadCountries('wa');
    </script>
</body>
</html>
`;

// ==========================================
// 2. BACKEND: CLOUDFLARE WORKER ROUTER
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(buildHTML(), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();

        // ðŸŸ¢ INTERNAL WEB APP API (Frontend to Backend)
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
                if (user.balance < parseFloat(body.price)) {
                    return new Response(JSON.stringify({ success: false, message: "Insufficient Balance!" }), { headers: { "Content-Type": "application/json" } });
                }
                
                // Call Grizzly
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=${body.service}&country=${body.country}`);
                const text = await res.text();
                
                if (text.startsWith("ACCESS_NUMBER")) {
                    const [, actId, phone] = text.split(":");
                    // Deduct Balance
                    await adjustBalance(body.userId, -parseFloat(body.price), env);
                    // Save Order
                    await env.USERS_DB.put(`act:${actId}`, JSON.stringify({ userId: body.userId, cost: parseFloat(body.price), phone, status: "WAITING" }));
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
                } else if (text === "STATUS_WAIT_CODE") {
                    return new Response(JSON.stringify({ status: 'WAITING' }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ status: text }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'cancel') {
                const orderStr = await env.USERS_DB.get(`act:${body.actId}`);
                if (!orderStr) return new Response(JSON.stringify({ success: false, message: "Order not found" }), { headers: { "Content-Type": "application/json" } });
                const order = JSON.parse(orderStr);
                
                // Call Grizzly Cancel
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${body.actId}`);
                const text = await res.text();
                
                if (text === "ACCESS_CANCEL") {
                    // Refund Money
                    await adjustBalance(body.userId, order.cost, env);
                    await env.USERS_DB.delete(`act:${body.actId}`);
                    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { headers: { "Content-Type": "application/json" } });
            }
        }

        // ðŸ”µ TELEGRAM BOT API (Bot Commands)
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text || "";
            const userId = body.message.from.id.toString();
            
            await ensureUser(userId, body.message.from, env);

            if (text.startsWith("/start")) {
                const user = await getUser(userId, env);
                const welcomeText = `ðŸ‘‘ *AlokOTP Supreme Store*\n\nðŸ’° *Wallet Balance:* \`$${user.balance.toFixed(2)}\`\nðŸ†” *Your ID:* \`${userId}\`\n\nðŸ‘‡ Click the button below to open the Live Store & buy numbers.`;
                const kb = { inline_keyboard: [[{ text: "ðŸ›’ Open Live Store", web_app: { url: request.url } }]] };
                if (userId === ADMIN_ID.toString()) kb.inline_keyboard.push([{ text: "ðŸ›¡ï¸ Admin Panel", callback_data: "admin_panel" }]);
                
                await sendTgMessage(chatId, welcomeText, kb);
            }
            
            // ADMIN COMMANDS IN TEXT
            if (userId === ADMIN_ID.toString()) {
                if (text.startsWith("/add")) {
                    const parts = text.split(" ");
                    if (parts.length === 3) {
                        const newBal = await adjustBalance(parts[1], parseFloat(parts[2]), env);
                        await sendTgMessage(chatId, `âœ… Added \`$${parts[2]}\` to \`${parts[1]}\`.\nNew Balance: \`$${newBal.toFixed(2)}\``);
                    }
                } else if (text.startsWith("/setupi")) {
                    const upi = text.replace("/setupi", "").trim();
                    await env.USERS_DB.put("admin:upi", upi);
                    await sendTgMessage(chatId, `âœ… Deposit UPI updated to: \`${upi}\``);
                }
            }
        }

        // ðŸ”µ TELEGRAM CALLBACK QUERIES (Inline Buttons)
        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id.toString();
            
            if (cb.data === "admin_panel" && userId === ADMIN_ID.toString()) {
                const upi = await env.USERS_DB.get("admin:upi") || "Not Set";
                const gBalRes = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getBalance`);
                const gBal = await gBalRes.text();

                const txt = `ðŸ›¡ï¸ *Admin Control Center*\n\nðŸ» *Grizzly API Balance:* \`${gBal}\`\nðŸ¦ *Current UPI:* \`${upi}\`\nðŸ“ˆ *Profit Margin:* \`${PROFIT_PERCENTAGE * 100}%\`\n\n*Quick Commands:*\nâž• Add Funds: \`/add <UserID> <$Amount>\`\nðŸ¦ Change UPI: \`/setupi <upi@bank>\``;
                await sendTgMessage(chatId, txt);
            }
            // Answer Callback to remove loading state
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { method: "POST", body: JSON.stringify({ callback_query_id: cb.id }) });
        }

      } catch (err) { console.error(err); }
      return new Response("OK", { status: 200 });
    }
  }
};

// ==========================================
// 3. BACKEND FUNCTIONS
// ==========================================
async function fetchLiveStock(serviceCode) {
    try {
        const url = `${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getPricesV3&service=${serviceCode}`;
        const res = await fetch(url);
        const data = await res.json();
        
        let availableStock = [];
        for (const cId in data) {
            if (data[cId] && data[cId][serviceCode]) {
                const item = data[cId][serviceCode];
                const stock = parseInt(item.count || 0);
                if (stock > 0) {
                    const baseCost = parseFloat(item.price || item.cost || 0.15);
                    // ðŸŒŸ 3% Profit Logic: Base Cost * 1.03
                    const finalPrice = (baseCost * (1 + PROFIT_PERCENTAGE)).toFixed(2);
                    
                    availableStock.push({ id: cId, name: getCountryName(cId), stock: stock, price: finalPrice });
                }
            }
        }
        availableStock.sort((a, b) => b.stock - a.stock);
        return availableStock;
    } catch (err) { return []; }
}

function getCountryName(cId) {
    const map = { "0":"Russia", "1":"Ukraine", "2":"Kazakhstan", "3":"China", "4":"Philippines", "6":"Indonesia", "11":"USA", "12":"USA (Phy)", "16":"UK", "22":"India", "36":"Canada", "43":"Germany", "73":"Brazil" };
    return map[cId] || `Country ${cId}`;
}

async function ensureUser(userId, from, env) {
    if (!(await env.USERS_DB.get(`usr:${userId}`))) {
        await env.USERS_DB.put(`usr:${userId}`, JSON.stringify({ name: from.first_name || "User", balance: 0.00 }));
    }
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

async function sendTgMessage(chatId, text, reply_markup = null) {
    const body = { chat_id: chatId, text, parse_mode: "Markdown" };
    if (reply_markup) body.reply_markup = reply_markup;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
