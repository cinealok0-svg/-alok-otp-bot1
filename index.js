/**
 * 👑 AlokOTP Pro — FULL-STACK WEB APP EDITION (Grizzly SMS Clone)
 * Dynamic Grizzly Catalog, 3% Margin, Bot Deposit Button, Admin Panel
 */

const BOT_TOKEN = "8958056500:AAFPh8tVoxDaZEy_dyw6f_oZWX_lFGyTCUc";
const ADMIN_ID = 8452322818;
const GRIZZLY_API_KEY = "7cd21341575f5a4b44c040530c314b3e";
const GRIZZLY_BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const PROFIT_PERCENTAGE = 0.03; // 3% Profit Margin

// Country ISO Mapping
const COUNTRY_MAP = {
  "0": { name: "Russia", iso: "ru" }, "1": { name: "Ukraine", iso: "ua" },
  "2": { name: "Kazakhstan", iso: "kz" }, "3": { name: "China", iso: "cn" },
  "4": { name: "Philippines", iso: "ph" }, "5": { name: "Myanmar", iso: "mm" },
  "6": { name: "Indonesia", iso: "id" }, "11": { name: "USA", iso: "us" },
  "22": { name: "India", iso: "in" }, "36": { name: "Canada", iso: "ca" },
  "43": { name: "Germany", iso: "de" }, "73": { name: "Brazil", iso: "br" }
};

// Top Services
const TOP_SERVICES = [
  { code: 'wa', name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
  { code: 'tg', name: 'Telegram', icon: 'fab fa-telegram-plane', color: '#0088cc' },
  { code: 'ig', name: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' },
  { code: 'go', name: 'Google', icon: 'fab fa-google', color: '#DB4437' },
  { code: 'fb', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' }
];

// ==========================================
// 1. FRONTEND: HIGH-PERFORMANCE MODERN UI
// ==========================================
const buildHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AlokOTP Pro</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.11.0/css/flag-icons.min.css">
    <style>
        :root { --bg-color: #0f172a; --card-bg: #1e293b; --text-main: #f8fafc; --text-muted: #94a3b8; --primary: #ff6a00; --success: #10b981; --danger: #ef4444; --border: #334155; }
        body { font-family: -apple-system, sans-serif; background: var(--bg-color); color: var(--text-main); margin: 0; padding: 0; padding-bottom: 90px; user-select: none; }
        .header { background: rgba(30,41,59,0.7); backdrop-filter: blur(12px); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border); }
        .logo { font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
        .logo i { color: var(--primary); }
        .balance-badge { background: linear-gradient(135deg, #ff6a00, #ee0979); padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .container { padding: 16px; max-width: 600px; margin: 0 auto; }
        .section-title { font-size: 15px; font-weight: 700; margin: 16px 0 10px 0; color: var(--text-muted); text-transform: uppercase; display: flex; justify-content: space-between;}
        .services-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .svc-chip { flex: 0 0 auto; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .svc-chip.active { border-color: var(--primary); background: rgba(255,106,0,0.15); color: #fff; }
        .search-box { width: 100%; background: var(--card-bg); border: 1px solid var(--border); padding: 12px 14px; border-radius: 12px; color: var(--text-main); outline: none; margin-bottom: 16px; box-sizing: border-box;}
        .search-box:focus { border-color: var(--primary); }
        .country-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .country-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .buy-btn { background: var(--primary); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .order-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .phone-display { font-size: 22px; font-weight: 800; color: var(--primary); background: #0f172a; padding: 10px; border-radius: 10px; margin: 10px 0; text-align: center; letter-spacing: 1px;}
        .otp-code-box { background: rgba(16,185,129,0.15); border: 1px dashed var(--success); color: var(--success); padding: 12px; text-align: center; font-size: 24px; font-weight: 900; border-radius: 10px; margin: 10px 0;}
        .action-btns { display: flex; gap: 8px; }
        .btn-act { flex: 1; padding: 10px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; color:#fff;}
        .btn-check { background: var(--success); }
        .btn-cancel { background: var(--danger); }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(30,41,59,0.9); border-top: 1px solid var(--border); display: flex; justify-content: space-around; padding: 10px 0; z-index: 99; }
        .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 11px; color: var(--text-muted); cursor: pointer; font-weight: 600; gap:4px; }
        .nav-item.active { color: var(--primary); }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo"><i class="fas fa-paw"></i> AlokOTP</div>
        <div class="balance-badge" id="balDisplay"><i class="fas fa-spinner fa-spin"></i></div>
    </div>

    <div class="container">
        <!-- Store View -->
        <div id="viewStore">
            <div class="section-title">Select Service</div>
            <div class="services-scroll" id="topServicesList"></div>
            <div class="section-title" style="margin-top:20px;"><span>Select Country</span><span id="totalStockCount" style="color:var(--primary); font-size:12px;">0</span></div>
            <input type="text" id="searchBox" class="search-box" placeholder="Search country..." onkeyup="filterCountries()">
            <div id="stockLoader" style="text-align:center; padding:20px; color:var(--text-muted);">Loading Live Stock...</div>
            <div class="country-grid" id="countryList"></div>
        </div>

        <!-- Orders View -->
        <div id="viewOrders" style="display:none;">
            <div class="section-title">Active Numbers</div>
            <div id="activeOrdersList"></div>
        </div>

        <!-- Deposit View -->
        <div id="viewDeposit" style="display:none;">
            <div class="section-title">Deposit Funds</div>
            <div class="order-card" style="text-align:center;">
                <h3 style="margin-bottom:10px;">Pay via UPI</h3>
                <div style="background:#0f172a; padding:12px; border-radius:10px; font-weight:bold; font-size:16px; margin-bottom:15px;" id="adminUpiDisplay">Loading...</div>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">Pay on above UPI and contact admin to add balance.</p>
                <button class="btn-act" style="background:var(--primary); width:100%;" onclick="tg.openTelegramLink('https://t.me/AlokAdminSupport')">Contact Admin</button>
            </div>
        </div>
    </div>

    <div class="bottom-nav">
        <div class="nav-item active" id="navStore" onclick="switchTab('store')"><i class="fas fa-store"></i> Store</div>
        <div class="nav-item" id="navOrders" onclick="switchTab('orders')"><i class="fas fa-sim-card"></i> Orders</div>
        <div class="nav-item" id="navDeposit" onclick="switchTab('deposit')"><i class="fas fa-wallet"></i> Deposit</div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const API_URL = window.location.href;
        let userId = tg.initDataUnsafe?.user?.id || 'TEST_USER';
        
        let currentSrv = 'wa';
        let rawStockData = [];
        const TOP_SERVICES = ${JSON.stringify(TOP_SERVICES)};
        const COUNTRY_MAP = ${JSON.stringify(COUNTRY_MAP)};

        async function initApp() {
            renderServiceChips();
            await fetchUserBalance();
            await loadStock(currentSrv);
            setInterval(checkAllActiveOrders, 5000); // Auto Check OTP
        }

        function renderServiceChips() {
            document.getElementById('topServicesList').innerHTML = TOP_SERVICES.map(s => \`
                <div class="svc-chip \${s.code === currentSrv ? 'active' : ''}" onclick="selectService('\${s.code}')">
                    <i class="\${s.icon}" style="color:\${s.color}"></i> \${s.name}
                </div>
            \`).join('');
        }

        function selectService(code) { currentSrv = code; renderServiceChips(); loadStock(code); }

        async function fetchUserBalance() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_user', userId }) });
                const data = await res.json();
                document.getElementById('balDisplay').innerHTML = \`<i class="fas fa-wallet"></i> $\${data.balance}\`;
                if(data.upi) document.getElementById('adminUpiDisplay').innerText = data.upi;
            } catch(e) {}
        }

        async function loadStock(srvCode) {
            document.getElementById('stockLoader').style.display = 'block';
            document.getElementById('countryList').innerHTML = '';
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_stock', service: srvCode }) });
                const data = await res.json();
                rawStockData = data.items || [];
                document.getElementById('totalStockCount').innerText = rawStockData.length;
                renderCountries(rawStockData);
            } catch(e) {}
            document.getElementById('stockLoader').style.display = 'none';
        }

        function renderCountries(items) {
            const list = document.getElementById('countryList');
            list.innerHTML = items.map(item => {
                const cMeta = COUNTRY_MAP[item.id] || { name: \`Country \${item.id}\`, iso: 'un' };
                return \`
                    <div class="country-card">
                        <div class="c-info">
                            <span class="fi fi-\${cMeta.iso}" style="font-size:20px;"></span>
                            <div>
                                <div style="font-weight:bold; font-size:14px;">\${cMeta.name}</div>
                                <div style="font-size:12px; color:var(--text-muted);">\${item.stock} pcs</div>
                            </div>
                        </div>
                        <button class="buy-btn" onclick="buyNumber('\${item.id}', '\${item.price}')">$\${item.price}</button>
                    </div>
                \`;
            }).join('');
        }

        function filterCountries() {
            const q = document.getElementById('searchBox').value.toLowerCase();
            renderCountries(rawStockData.filter(i => (COUNTRY_MAP[i.id]?.name || '').toLowerCase().includes(q)));
        }

        async function buyNumber(countryId, price) {
            tg.showConfirm(\`Buy number for $\${price}?\`, async (ok) => {
                if(!ok) return;
                tg.MainButton.showProgress();
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'buy', userId, service: currentSrv, country: countryId, price }) });
                    const data = await res.json();
                    if(data.success) { tg.showAlert("✅ Success!"); switchTab('orders'); fetchUserBalance(); }
                    else tg.showAlert(\`❌ \${data.message}\`);
                } catch(e) {}
                tg.MainButton.hideProgress();
            });
        }

        async function loadActiveOrders() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_orders', userId }) });
                const data = await res.json();
                const container = document.getElementById('activeOrdersList');
                if(!data.orders.length) { container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No active numbers</div>'; return; }
                
                container.innerHTML = data.orders.map(o => \`
                    <div class="order-card">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--primary); text-transform:uppercase;">\${o.service}</strong>
                            <span style="font-size:12px; background:\${o.status==='OK'?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'}; padding:3px 8px; border-radius:10px; color:\${o.status==='OK'?'var(--success)':'var(--primary)'}">\${o.status==='OK'?'OTP RECEIVED':'WAITING SMS...'}</span>
                        </div>
                        <div class="phone-display" onclick="navigator.clipboard.writeText('+\${o.phone}'); tg.showAlert('Number Copied!');">+\${o.phone}</div>
                        \${o.code ? \`<div class="otp-code-box" onclick="navigator.clipboard.writeText('\${o.code}'); tg.showAlert('OTP Copied!');">\${o.code}</div>\` : ''}
                        <div class="action-btns" style="margin-top:10px;">
                            \${o.status !== 'OK' ? \`<button class="btn-act btn-check" onclick="checkOTP('\${o.actId}', true)">Check SMS</button>\` : ''}
                            <button class="btn-act btn-cancel" onclick="cancelOrder('\${o.actId}')">Cancel & Refund</button>
                        </div>
                    </div>
                \`).join('');
            } catch(e) {}
        }

        async function checkOTP(actId, manual = false) {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'status', actId }) });
            const data = await res.json();
            if(data.status === 'OK') {
                if(manual) tg.showAlert(\`🎉 SMS Received: \${data.code}\`);
                loadActiveOrders();
            } else if (manual) {
                tg.showAlert("⏳ Still waiting for SMS...");
            }
        }

        async function checkAllActiveOrders() {
            if(document.getElementById('viewOrders').style.display !== 'none') loadActiveOrders();
        }

        async function cancelOrder(actId) {
            tg.showConfirm("Cancel and refund money automatically?", async (ok) => {
                if(!ok) return;
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'cancel', userId, actId }) });
                const data = await res.json();
                if(data.success) { tg.showAlert("✅ Order Cancelled & Refunded!"); loadActiveOrders(); fetchUserBalance(); }
                else tg.showAlert(\`❌ Error: \${data.message}\`);
            });
        }

        function switchTab(tab) {
            ['Store', 'Orders', 'Deposit'].forEach(t => { document.getElementById(\`view\${t}\`).style.display = 'none'; document.getElementById(\`nav\${t}\`).classList.remove('active'); });
            document.getElementById(\`view\${tab.charAt(0).toUpperCase() + tab.slice(1)}\`).style.display = 'block';
            document.getElementById(\`nav\${tab.charAt(0).toUpperCase() + tab.slice(1)}\`).classList.add('active');
            if(tab === 'orders') loadActiveOrders();
        }
        initApp();
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
      const url = new URL(request.url);
      
      // AUTO-WEBHOOK SETUP
      if (url.pathname === "/setup") {
          const webhookUrl = url.origin + "/";
          const setupApiUrl = "https://api.telegram.org/bot" + BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(webhookUrl);
          const resp = await fetch(setupApiUrl);
          const result = await resp.json();
          return new Response(JSON.stringify({ 
              message: "Webhook Setup Status", 
              success: result.ok,
              description: result.description
          }, null, 2), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(buildHTML(), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();

        // 🟢 WEB APP INTERNAL API
        if (body.type === 'api') {
            if (body.action === 'get_user') {
                const user = await getUser(body.userId, env);
                const upi = await env.USERS_DB.get("admin:upi") || "UPI Not Set";
                return new Response(JSON.stringify({ balance: user.balance.toFixed(2), upi }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'get_stock') {
                const stock = await fetchLiveStock(body.service);
                return new Response(JSON.stringify({ items: stock }), { headers: { "Content-Type": "application/json" } });
            }
            if (body.action === 'buy') {
                const user = await getUser(body.userId, env);
                if (user.balance < parseFloat(body.price)) return new Response(JSON.stringify({ success: false, message: "Insufficient Balance!" }));
                const res = await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=getNumber&service=" + body.service + "&country=" + body.country);
                const text = await res.text();
                if (text.startsWith("ACCESS_NUMBER")) {
                    const parts = text.split(":");
                    const actId = parts[1];
                    const phone = parts[2];
                    
                    await adjustBalance(body.userId, -parseFloat(body.price), env);
                    const orderData = { actId: actId, userId: body.userId, cost: parseFloat(body.price), phone: phone, service: body.service, status: "WAITING", code: null };
                    await env.USERS_DB.put("act:" + actId, JSON.stringify(orderData));
                    
                    let userOrdersStr = await env.USERS_DB.get("user_orders:" + body.userId);
                    let userOrders = userOrdersStr ? JSON.parse(userOrdersStr) : [];
                    userOrders.push(actId);
                    await env.USERS_DB.put("user_orders:" + body.userId, JSON.stringify(userOrders));
                    return new Response(JSON.stringify({ success: true, actId: actId, phone: phone }));
                }
                return new Response(JSON.stringify({ success: false, message: text }));
            }
            if (body.action === 'get_orders') {
                let userOrdersStr = await env.USERS_DB.get("user_orders:" + body.userId);
                let userOrderIds = userOrdersStr ? JSON.parse(userOrdersStr) : [];
                let activeOrders = [];
                for (let actId of userOrderIds) {
                    let oStr = await env.USERS_DB.get("act:" + actId);
                    if (oStr) activeOrders.push(JSON.parse(oStr));
                }
                return new Response(JSON.stringify({ orders: activeOrders.reverse() }));
            }
            if (body.action === 'status') {
                const res = await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=getStatus&id=" + body.actId);
                const text = await res.text();
                if (text.startsWith("STATUS_OK")) {
                    const code = text.split(":")[1];
                    let oStr = await env.USERS_DB.get("act:" + body.actId);
                    if(oStr) {
                        let order = JSON.parse(oStr);
                        order.status = 'OK'; order.code = code;
                        await env.USERS_DB.put("act:" + body.actId, JSON.stringify(order));
                    }
                    await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=setStatus&status=6&id=" + body.actId);
                    return new Response(JSON.stringify({ status: 'OK', code: code }));
                }
                return new Response(JSON.stringify({ status: text }));
            }
            if (body.action === 'cancel') {
                const orderStr = await env.USERS_DB.get("act:" + body.actId);
                if (!orderStr) return new Response(JSON.stringify({ success: false, message: "Order not found" }));
                const order = JSON.parse(orderStr);
                const res = await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=setStatus&status=8&id=" + body.actId);
                const text = await res.text();
                if (text === "ACCESS_CANCEL" || text === "STATUS_CANCEL") {
                    await adjustBalance(body.userId, order.cost, env);
                    await env.USERS_DB.delete("act:" + body.actId);
                    let userOrdersStr = await env.USERS_DB.get("user_orders:" + body.userId);
                    if (userOrdersStr) {
                        let userOrders = JSON.parse(userOrdersStr).filter(id => id !== body.actId);
                        await env.USERS_DB.put("user_orders:" + body.userId, JSON.stringify(userOrders));
                    }
                    return new Response(JSON.stringify({ success: true }));
                }
                return new Response(JSON.stringify({ success: false, message: text }));
            }
        }

        // 🔵 TELEGRAM BOT & ADMIN PANEL
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text || "";
            const userId = body.message.from.id.toString();
            
            await ensureUser(userId, body.message.from, env);

            if (text.startsWith("/start")) {
                const user = await getUser(userId, env);
                const welcomeText = "👑 *Welcome to AlokOTP Pro Store*\n\n💰 *Wallet Balance:* `$" + user.balance.toFixed(2) + "`\n🆔 *Your ID:* `" + userId + "`\n\n⚡ Buy virtual SMS numbers for WhatsApp, Telegram & 2000+ services.";
                
                const kb = { 
                    inline_keyboard: [
                        [{ text: "🚀 Open Web App Store", web_app: { url: request.url } }],
                        [{ text: "💳 Deposit Funds", callback_data: "deposit_info" }, { text: "💬 Support", url: "https://t.me/AlokAdminSupport" }]
                    ] 
                };
                
                // Admin specific button
                if (userId === ADMIN_ID.toString()) {
                    kb.inline_keyboard.push([{ text: "🛡️ Admin Panel", callback_data: "admin_panel" }]);
                }
                
                await sendTgMessage(chatId, welcomeText, kb);
            }
            
            if (userId === ADMIN_ID.toString()) {
                if (text.startsWith("/add")) {
                    const parts = text.split(" ");
                    if (parts.length === 3) {
                        const newBal = await adjustBalance(parts[1], parseFloat(parts[2]), env);
                        await sendTgMessage(chatId, "✅ Added `$" + parts[2] + "` to user `" + parts[1] + "`.\nNew Balance: `$" + newBal.toFixed(2) + "`");
                    }
                } else if (text.startsWith("/setupi")) {
                    const upi = text.replace("/setupi", "").trim();
                    await env.USERS_DB.put("admin:upi", upi);
                    await sendTgMessage(chatId, "✅ UPI updated to: `" + upi + "`");
                }
            }
        }

        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id.toString();
            
            if (cb.data === "deposit_info") {
                const upi = await env.USERS_DB.get("admin:upi") || "Admin ne abhi UPI set nahi kiya hai.";
                const depMsg = "💳 *Deposit Funds*\n\nApne wallet mein balance daalne ke liye is UPI par payment karein:\n\n🏦 *UPI ID:* `" + upi + "`\n\nPayment karne ke baad screenshot Admin ko bhejein 👇";
                await sendTgMessage(chatId, depMsg, { inline_keyboard: [[{ text: "💬 Send Screenshot to Admin", url: "https://t.me/AlokAdminSupport" }]] });
            }

            if (cb.data === "admin_panel" && userId === ADMIN_ID.toString()) {
                const upi = await env.USERS_DB.get("admin:upi") || "Not Set";
                let gBal = "Loading...";
                try {
                    const gBalRes = await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=getBalance");
                    gBal = await gBalRes.text();
                } catch(e) {}

                const txt = "🛡️ *Admin Control Dashboard*\n\n🐻 *Grizzly API Balance:* `" + gBal + "`\n🏦 *Current UPI:* `" + upi + "`\n📈 *Profit Margin:* `" + (PROFIT_PERCENTAGE * 100) + "%`\n\n*Admin Commands:*\n➕ Add Balance: `/add <UserID> <Amount>`\n🏦 Set UPI: `/setupi <your_upi@bank>`";
                await sendTgMessage(chatId, txt);
            }
            await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/answerCallbackQuery", { method: "POST", body: JSON.stringify({ callback_query_id: cb.id }) });
        }
      } catch (err) {}
      return new Response("OK", { status: 200 });
    }
  }
};

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
async function fetchLiveStock(serviceCode) {
    try {
        const res = await fetch(GRIZZLY_BASE + "?api_key=" + GRIZZLY_API_KEY + "&action=getPricesV3&service=" + serviceCode);
        const data = await res.json();
        
        let availableStock = [];
        for (const cId in data) {
            if (data[cId] && data[cId][serviceCode]) {
                const item = data[cId][serviceCode];
                const stock = parseInt(item.count || 0);
                if (stock > 0) {
                    const baseCost = parseFloat(item.price || item.cost || 0.15);
                    const finalPrice = (baseCost * (1 + PROFIT_PERCENTAGE)).toFixed(2); // 3% margin added here
                    availableStock.push({ id: cId, name: COUNTRY_MAP[cId]?.name || "Country " + cId, stock: stock, price: finalPrice });
                }
            }
        }
        availableStock.sort((a, b) => b.stock - a.stock);
        return availableStock;
    } catch (err) { return []; }
}

async function ensureUser(userId, from, env) {
    if (!(await env.USERS_DB.get("usr:" + userId))) {
        await env.USERS_DB.put("usr:" + userId, JSON.stringify({ name: from.first_name || "User", balance: 0.00 }));
    }
}

async function getUser(userId, env) {
    const data = await env.USERS_DB.get("usr:" + userId);
    return data ? JSON.parse(data) : { balance: 0.00 };
}

async function adjustBalance(userId, delta, env) {
    const user = await getUser(userId, env);
    user.balance = Math.max(0, parseFloat((user.balance + delta).toFixed(2)));
    await env.USERS_DB.put("usr:" + userId, JSON.stringify(user));
    return user.balance;
}

async function sendTgMessage(chatId, text, reply_markup = null) {
    const body = { chat_id: chatId, text: text, parse_mode: "Markdown" };
    if (reply_markup) body.reply_markup = reply_markup;
    await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
