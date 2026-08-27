/**
 * 👑 AlokOTP Pro — FULL-STACK WEB APP EDITION (Grizzly SMS Clone)
 * Dynamic Grizzly Catalog (2000+ Services & 150+ Countries)
 * Real-time Search, Country Flags, Wallet System, Auto Refund, Admin Panel
 */

const BOT_TOKEN = "8958056500:AAFPh8tVoxDaZEy_dyw6f_oZWX_lFGyTCUc";
const ADMIN_ID = 8452322818;
const GRIZZLY_API_KEY = "7cd21341575f5a4b44c040530c314b3e";
const GRIZZLY_BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const PROFIT_PERCENTAGE = 0.03; // 3% Profit Margin

// Country ISO Mapping for Flag Icons & Names
const COUNTRY_MAP = {
  "0": { name: "Russia", iso: "ru" },
  "1": { name: "Ukraine", iso: "ua" },
  "2": { name: "Kazakhstan", iso: "kz" },
  "3": { name: "China", iso: "cn" },
  "4": { name: "Philippines", iso: "ph" },
  "5": { name: "Myanmar", iso: "mm" },
  "6": { name: "Indonesia", iso: "id" },
  "7": { name: "Malaysia", iso: "my" },
  "8": { name: "Kenya", iso: "ke" },
  "9": { name: "Vietnam", iso: "vn" },
  "10": { name: "Kyrgyzstan", iso: "kg" },
  "11": { name: "USA", iso: "us" },
  "12": { name: "Israel", iso: "il" },
  "13": { name: "Hong Kong", iso: "hk" },
  "14": { name: "Poland", iso: "pl" },
  "15": { name: "United Kingdom", iso: "gb" },
  "16": { name: "Madagascar", iso: "mg" },
  "18": { name: "Nigeria", iso: "ng" },
  "19": { name: "Macao", iso: "mo" },
  "22": { name: "India", iso: "in" },
  "24": { name: "Cambodia", iso: "kh" },
  "25": { name: "Laos", iso: "la" },
  "31": { name: "South Africa", iso: "za" },
  "32": { name: "Romania", iso: "ro" },
  "33": { name: "Colombia", iso: "co" },
  "36": { name: "Canada", iso: "ca" },
  "37": { name: "Morocco", iso: "ma" },
  "40": { name: "Uzbekistan", iso: "uz" },
  "43": { name: "Germany", iso: "de" },
  "48": { name: "Netherlands", iso: "nl" },
  "52": { name: "Thailand", iso: "th" },
  "73": { name: "Brazil", iso: "br" },
  "86": { name: "Italy", iso: "it" },
  "96": { name: "Spain", iso: "es" },
  "187": { name: "USA (Virtual)", iso: "us" }
};

// Top/Popular Services Master List with FontAwesome Icons
const TOP_SERVICES = [
  { code: 'wa', name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
  { code: 'tg', name: 'Telegram', icon: 'fab fa-telegram-plane', color: '#0088cc' },
  { code: 'ig', name: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' },
  { code: 'go', name: 'Google / YouTube', icon: 'fab fa-google', color: '#DB4437' },
  { code: 'fb', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' },
  { code: 'mm', name: 'Microsoft / Outlook', icon: 'fab fa-microsoft', color: '#00A4EF' },
  { code: 'tw', name: 'Twitter / X', icon: 'fab fa-twitter', color: '#1DA1F2' },
  { code: 'tk', name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
  { code: 'nf', name: 'Netflix', icon: 'fas fa-film', color: '#E50914' },
  { code: 'tnd', name: 'Tinder', icon: 'fas fa-fire', color: '#FD3A73' },
  { code: 'ub', name: 'Uber', icon: 'fas fa-car', color: '#000000' },
  { code: 'am', name: 'Amazon', icon: 'fab fa-amazon', color: '#FF9900' },
  { code: 'ot', name: 'Any Other Service', icon: 'fas fa-sms', color: '#6c757d' }
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
    <title>AlokOTP Pro — Virtual SMS Store</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.11.0/css/flag-icons.min.css">
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --card-hover: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #ff6a00;
            --primary-glow: rgba(255, 106, 0, 0.35);
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --border: #334155;
            --glass: rgba(30, 41, 59, 0.7);
        }
        
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background: var(--bg-color); 
            color: var(--text-main); 
            margin: 0; 
            padding: 0; 
            user-select: none;
            padding-bottom: 90px;
        }

        /* Glassmorphism Header */
        .header { 
            background: var(--glass); 
            backdrop-filter: blur(12px); 
            padding: 14px 18px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            position: sticky; 
            top: 0; 
            z-index: 100; 
            border-bottom: 1px solid var(--border); 
        }
        .logo { font-size: 20px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
        .logo i { color: var(--primary); font-size: 22px; filter: drop-shadow(0 0 8px var(--primary)); }
        
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .balance-badge { 
            background: linear-gradient(135deg, #ff6a00, #ee0979); 
            color: #fff; 
            padding: 7px 14px; 
            border-radius: 20px; 
            font-weight: 700; 
            font-size: 14px; 
            box-shadow: 0 4px 12px var(--primary-glow); 
            display: flex; 
            align-items: center; 
            gap: 6px; 
            cursor: pointer;
        }

        /* Container & Tabs */
        .container { padding: 16px; max-width: 600px; margin: 0 auto; }
        
        .nav-tabs { 
            display: flex; 
            background: var(--card-bg); 
            padding: 4px; 
            border-radius: 12px; 
            margin-bottom: 16px; 
            border: 1px solid var(--border); 
        }
        .tab-btn { 
            flex: 1; 
            padding: 10px; 
            text-align: center; 
            font-weight: 600; 
            font-size: 14px; 
            color: var(--text-muted); 
            border-radius: 8px; 
            cursor: pointer; 
            transition: all 0.2s ease; 
        }
        .tab-btn.active { 
            background: var(--primary); 
            color: #fff; 
            box-shadow: 0 2px 8px var(--primary-glow); 
        }

        .section-title { 
            font-size: 15px; 
            font-weight: 700; 
            margin: 16px 0 10px 0; 
            color: var(--text-muted); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Service Cards Horizontal Scroll */
        .services-scroll { 
            display: flex; 
            gap: 10px; 
            overflow-x: auto; 
            padding-bottom: 8px; 
            scrollbar-width: none; 
        }
        .services-scroll::-webkit-scrollbar { display: none; }
        
        .svc-chip { 
            flex: 0 0 auto; 
            background: var(--card-bg); 
            border: 1px solid var(--border); 
            border-radius: 12px; 
            padding: 10px 14px; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            cursor: pointer; 
            font-size: 13px; 
            font-weight: 600; 
            transition: 0.2s; 
        }
        .svc-chip.active { 
            border-color: var(--primary); 
            background: rgba(255, 106, 0, 0.15); 
            color: #fff; 
        }
        .svc-chip i { font-size: 16px; }

        /* Search Input */
        .search-wrapper { position: relative; margin-bottom: 16px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .search-box { 
            width: 100%; 
            background: var(--card-bg); 
            border: 1px solid var(--border); 
            padding: 12px 14px 12px 40px; 
            border-radius: 12px; 
            font-size: 14px; 
            color: var(--text-main); 
            outline: none; 
            transition: 0.2s; 
        }
        .search-box:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }

        /* Country Grid */
        .country-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .country-card { 
            background: var(--card-bg); 
            border: 1px solid var(--border); 
            border-radius: 12px; 
            padding: 12px 16px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            transition: 0.2s; 
        }
        .country-card:hover { border-color: var(--card-hover); }
        .c-info { display: flex; align-items: center; gap: 12px; }
        .c-flag-icon { font-size: 24px; border-radius: 4px; overflow: hidden; }
        .c-name { font-weight: 700; font-size: 14px; color: var(--text-main); }
        .c-stock { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        
        .buy-btn { 
            background: var(--primary); 
            color: #fff; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 8px; 
            font-weight: 700; 
            font-size: 13px; 
            cursor: pointer; 
            transition: 0.2s; 
            box-shadow: 0 2px 8px var(--primary-glow); 
        }
        .buy-btn:active { transform: scale(0.95); }

        /* Active Orders Cards */
        .order-card { 
            background: var(--card-bg); 
            border: 1px solid var(--border); 
            border-radius: 16px; 
            padding: 16px; 
            margin-bottom: 12px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.2); 
        }
        .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .order-service { font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; }
        .order-status { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 700; }
        .status-waiting { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .status-success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        
        .phone-display { 
            font-size: 22px; 
            font-weight: 800; 
            color: var(--primary); 
            letter-spacing: 1px; 
            margin: 10px 0; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            background: #0f172a; 
            padding: 10px 14px; 
            border-radius: 10px; 
        }
        .otp-code-box { 
            background: rgba(16, 185, 129, 0.15); 
            border: 1px dashed var(--success); 
            color: var(--success); 
            padding: 12px; 
            border-radius: 10px; 
            text-align: center; 
            font-size: 24px; 
            font-weight: 900; 
            letter-spacing: 4px; 
            margin: 12px 0; 
        }
        
        .action-btns { display: flex; gap: 8px; margin-top: 12px; }
        .btn-act { 
            flex: 1; 
            padding: 10px; 
            border-radius: 8px; 
            border: none; 
            font-weight: 700; 
            font-size: 13px; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 6px; 
        }
        .btn-check { background: var(--success); color: #fff; }
        .btn-cancel { background: var(--danger); color: #fff; }
        .btn-copy { background: var(--card-hover); color: var(--text-main); }

        /* Loader & Empty States */
        .loader { text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px; }
        .spinner { 
            border: 3px solid rgba(255,106,0,0.1); 
            border-top: 3px solid var(--primary); 
            border-radius: 50%; 
            width: 32px; 
            height: 32px; 
            animation: spin 0.8s linear infinite; 
            margin: 0 auto 12px auto; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* Bottom Nav */
        .bottom-nav { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            background: var(--glass); 
            backdrop-filter: blur(12px); 
            border-top: 1px solid var(--border); 
            display: flex; 
            justify-content: space-around; 
            padding: 8px 0; 
            z-index: 99; 
        }
        .nav-item { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            font-size: 11px; 
            color: var(--text-muted); 
            cursor: pointer; 
            gap: 4px; 
            font-weight: 600; 
        }
        .nav-item i { font-size: 18px; }
        .nav-item.active { color: var(--primary); }
    </style>
</head>
<body>

    <!-- Top Header -->
    <div class="header">
        <div class="logo"><i class="fas fa-paw"></i> AlokOTP Pro</div>
        <div class="header-actions">
            <div class="balance-badge" id="balDisplay" onclick="switchTab('deposit')">
                <i class="fas fa-wallet"></i> $0.00
            </div>
        </div>
    </div>

    <!-- Main Container -->
    <div class="container">
        
        <!-- STORE VIEW -->
        <div id="viewStore">
            <div class="section-title">Select Service</div>
            <div class="services-scroll" id="topServicesList"></div>

            <div class="section-title" style="margin-top:20px;">
                <span id="countryTitle">Select Country</span>
                <span style="font-size:12px; color:var(--primary);" id="totalStockCount">0 Stock</span>
            </div>

            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="searchBox" class="search-box" placeholder="Search country name..." onkeyup="filterCountries()">
            </div>

            <div class="loader" id="stockLoader">
                <div class="spinner"></div>
                Fetching Live Grizzly SMS Stock...
            </div>
            
            <div class="country-grid" id="countryList"></div>
        </div>

        <!-- ACTIVE ORDERS VIEW -->
        <div id="viewOrders" style="display:none;">
            <div class="section-title">Active OTP Activations</div>
            <div id="activeOrdersList">
                <div style="text-align:center; padding:40px; color:var(--text-muted);">No active orders right now.</div>
            </div>
        </div>

        <!-- DEPOSIT VIEW -->
        <div id="viewDeposit" style="display:none;">
            <div class="section-title">Add Funds to Wallet</div>
            <div class="order-card" style="text-align:center;">
                <i class="fas fa-qrcode" style="font-size:48px; color:var(--primary); margin-bottom:12px;"></i>
                <h3 style="margin:0 0 8px 0;">Instant Deposit (UPI / Crypto)</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
                    Send money to Admin UPI or contact support to get wallet credits.
                </p>
                <div style="background:#0f172a; padding:12px; border-radius:10px; font-weight:bold; font-size:16px; margin-bottom:16px;" id="adminUpiDisplay">
                    Loading UPI...
                </div>
                <button class="btn-act btn-check" style="width:100%;" onclick="tg.openTelegramLink('https://t.me/AlokAdminSupport')">
                    <i class="fab fa-telegram-plane"></i> Contact Admin for Funds
                </button>
            </div>
        </div>

    </div>

    <!-- Bottom Navigation Bar -->
    <div class="bottom-nav">
        <div class="nav-item active" id="navStore" onclick="switchTab('store')">
            <i class="fas fa-store"></i> Store
        </div>
        <div class="nav-item" id="navOrders" onclick="switchTab('orders')">
            <i class="fas fa-sim-card"></i> Orders
        </div>
        <div class="nav-item" id="navDeposit" onclick="switchTab('deposit')">
            <i class="fas fa-wallet"></i> Deposit
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const API_URL = window.location.href;
        let userId = tg.initDataUnsafe?.user?.id || '8452322818';
        
        let currentSrv = 'wa';
        let rawStockData = [];
        let activeOrders = [];

        const TOP_SERVICES = ${JSON.stringify(TOP_SERVICES)};
        const COUNTRY_MAP = ${JSON.stringify(COUNTRY_MAP)};

        // Initialize App
        async function initApp() {
            renderServiceChips();
            await fetchUserBalance();
            await loadStock(currentSrv);
            setInterval(checkAllActiveOrders, 5000); // Auto check OTP every 5s
        }

        // Render Service Chips
        function renderServiceChips() {
            const container = document.getElementById('topServicesList');
            container.innerHTML = TOP_SERVICES.map(s => \`
                <div class="svc-chip \${s.code === currentSrv ? 'active' : ''}" onclick="selectService('\${s.code}')">
                    <i class="\${s.icon}" style="color:\${s.color}"></i> \${s.name}
                </div>
            \`).join('');
        }

        function selectService(code) {
            currentSrv = code;
            renderServiceChips();
            loadStock(code);
        }

        // Fetch User Balance
        async function fetchUserBalance() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_user', userId }) });
                const data = await res.json();
                document.getElementById('balDisplay').innerHTML = \`<i class="fas fa-wallet"></i> $\${data.balance}\`;
                if(data.upi) document.getElementById('adminUpiDisplay').innerText = data.upi;
            } catch(e) {}
        }

        // Fetch Live Grizzly Stock
        async function loadStock(srvCode) {
            document.getElementById('stockLoader').style.display = 'block';
            document.getElementById('countryList').innerHTML = '';
            
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_stock', service: srvCode }) });
                const data = await res.json();
                rawStockData = data.items || [];
                document.getElementById('totalStockCount').innerText = \`\${rawStockData.length} Countries\`;
                renderCountries(rawStockData);
            } catch(e) {
                document.getElementById('countryList').innerHTML = '<div style="text-align:center; padding:20px; color:var(--danger);">Failed to load stock. Retry!</div>';
            }
            document.getElementById('stockLoader').style.display = 'none';
        }

        // Render Countries List
        function renderCountries(items) {
            const list = document.getElementById('countryList');
            if(!items.length) {
                list.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">No numbers available right now.</div>';
                return;
            }

            list.innerHTML = items.map(item => {
                const cMeta = COUNTRY_MAP[item.id] || { name: item.name || \`Country \${item.id}\`, iso: 'un' };
                const flagClass = cMeta.iso ? \`fi fi-\${cMeta.iso}\` : 'fas fa-globe';
                return \`
                    <div class="country-card">
                        <div class="c-info">
                            <span class="\${flagClass} c-flag-icon"></span>
                            <div>
                                <div class="c-name">\${cMeta.name}</div>
                                <div class="c-stock">\${item.stock} numbers available</div>
                            </div>
                        </div>
                        <button class="buy-btn" onclick="buyNumber('\${item.id}', '\${item.price}')">$\${item.price}</button>
                    </div>
                \`;
            }).join('');
        }

        function filterCountries() {
            const q = document.getElementById('searchBox').value.toLowerCase();
            const filtered = rawStockData.filter(i => {
                const cMeta = COUNTRY_MAP[i.id] || { name: i.name };
                return cMeta.name.toLowerCase().includes(q) || i.id.toString().includes(q);
            });
            renderCountries(filtered);
        }

        // Buy Number
        async function buyNumber(countryId, price) {
            tg.showConfirm(\`Confirm purchase for $\${price}?\`, async (ok) => {
                if(!ok) return;
                tg.MainButton.showProgress();
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'buy', userId, service: currentSrv, country: countryId, price }) });
                    const data = await res.json();
                    
                    if(data.success) {
                        tg.showAlert("✅ Virtual Number Purchased!");
                        fetchUserBalance();
                        switchTab('orders');
                        loadActiveOrders();
                    } else {
                        tg.showAlert(\`❌ \${data.message || 'Purchase failed.'}\`);
                    }
                } catch(e) { tg.showAlert("Network error!"); }
                tg.MainButton.hideProgress();
            });
        }

        // Load & Render Active Orders
        async function loadActiveOrders() {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'get_orders', userId }) });
                const data = await res.json();
                activeOrders = data.orders || [];
                renderOrders(activeOrders);
            } catch(e) {}
        }

        function renderOrders(orders) {
            const container = document.getElementById('activeOrdersList');
            if(!orders.length) {
                container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No active activations found.</div>';
                return;
            }

            container.innerHTML = orders.map(o => \`
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-service"><i class="fas fa-mobile-alt" style="color:var(--primary);"></i> Service: \${o.service.toUpperCase()}</div>
                        <div class="order-status \${o.status === 'OK' ? 'status-success' : 'status-waiting'}">
                            \${o.status === 'OK' ? 'RECEIVED' : 'WAITING FOR SMS'}
                        </div>
                    </div>
                    <div class="phone-display">
                        <span>+\${o.phone}</span>
                        <button class="btn-act btn-copy" style="padding:4px 8px;" onclick="copyTxt('+\${o.phone}')"><i class="fas fa-copy"></i></button>
                    </div>
                    \${o.code ? \`<div class="otp-code-box">OTP: \${o.code}</div>\` : ''}
                    <div class="action-btns">
                        \${o.status !== 'OK' ? \`<button class="btn-act btn-check" onclick="checkOTP('\${o.actId}')"><i class="fas fa-sync-alt"></i> Check SMS</button>\` : ''}
                        <button class="btn-act btn-cancel" onclick="cancelOrder('\${o.actId}')"><i class="fas fa-times"></i> Cancel</button>
                    </div>
                </div>
            \`).join('');
        }

        async function checkOTP(actId) {
            try {
                const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'status', actId }) });
                const data = await res.json();
                if(data.status === 'OK') {
                    tg.showAlert(\`🎉 SMS Received: \${data.code}\`);
                    loadActiveOrders();
                } else {
                    tg.showAlert(\`Status: \${data.status}\`);
                }
            } catch(e) {}
        }

        async function checkAllActiveOrders() {
            if(document.getElementById('viewOrders').style.display !== 'none') {
                loadActiveOrders();
            }
        }

        async function cancelOrder(actId) {
            tg.showConfirm("Cancel number and request instant refund?", async (ok) => {
                if(!ok) return;
                try {
                    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ type: 'api', action: 'cancel', userId, actId }) });
                    const data = await res.json();
                    if(data.success) {
                        tg.showAlert("✅ Cancelled & Money Refunded!");
                        fetchUserBalance();
                        loadActiveOrders();
                    } else {
                        tg.showAlert(\`Cannot cancel: \${data.message}\`);
                    }
                } catch(e) {}
            });
        }

        function copyTxt(txt) {
            navigator.clipboard.writeText(txt);
            tg.showAlert("Copied to clipboard!");
        }

        // View Switcher
        function switchTab(tab) {
            ['Store', 'Orders', 'Deposit'].forEach(t => {
                document.getElementById(\`view\${t}\`).style.display = 'none';
                document.getElementById(\`nav\${t}\`).classList.remove('active');
            });

            if(tab === 'store') {
                document.getElementById('viewStore').style.display = 'block';
                document.getElementById('navStore').classList.add('active');
            } else if(tab === 'orders') {
                document.getElementById('viewOrders').style.display = 'block';
                document.getElementById('navOrders').classList.add('active');
                loadActiveOrders();
            } else if(tab === 'deposit') {
                document.getElementById('viewDeposit').style.display = 'block';
                document.getElementById('navDeposit').classList.add('active');
            }
        }

        // Start App
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
      return new Response(buildHTML(), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();

        // 🟢 WEB APP INTERNAL API
        if (body.type === 'api') {
            if (body.action === 'get_user') {
                const user = await getUser(body.userId, env);
                const upi = await env.USERS_DB.get("admin:upi") || "alok@upi";
                return new Response(JSON.stringify({ balance: user.balance.toFixed(2), upi }), { headers: { "Content-Type": "application/json" } });
            }
            
            if (body.action === 'get_stock') {
                const stock = await fetchLiveStock(body.service);
                return new Response(JSON.stringify({ items: stock }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'buy') {
                const user = await getUser(body.userId, env);
                if (user.balance < parseFloat(body.price)) {
                    return new Response(JSON.stringify({ success: false, message: "Insufficient Wallet Balance!" }), { headers: { "Content-Type": "application/json" } });
                }
                
                // Call Grizzly API
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=${body.service}&country=${body.country}`);
                const text = await res.text();
                
                if (text.startsWith("ACCESS_NUMBER")) {
                    const [, actId, phone] = text.split(":");
                    await adjustBalance(body.userId, -parseFloat(body.price), env);
                    
                    const orderData = { actId, userId: body.userId, cost: parseFloat(body.price), phone, service: body.service, status: "WAITING", code: null };
                    await env.USERS_DB.put(`act:${actId}`, JSON.stringify(orderData));
                    
                    // Track user's active orders index
                    let userOrdersStr = await env.USERS_DB.get(`user_orders:${body.userId}`);
                    let userOrders = userOrdersStr ? JSON.parse(userOrdersStr) : [];
                    userOrders.push(actId);
                    await env.USERS_DB.put(`user_orders:${body.userId}`, JSON.stringify(userOrders));

                    return new Response(JSON.stringify({ success: true, actId, phone }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'get_orders') {
                let userOrdersStr = await env.USERS_DB.get(`user_orders:${body.userId}`);
                let userOrderIds = userOrdersStr ? JSON.parse(userOrdersStr) : [];
                let activeOrders = [];
                
                for (let actId of userOrderIds) {
                    let oStr = await env.USERS_DB.get(`act:${actId}`);
                    if (oStr) activeOrders.push(JSON.parse(oStr));
                }
                return new Response(JSON.stringify({ orders: activeOrders.reverse() }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'status') {
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${body.actId}`);
                const text = await res.text();
                
                if (text.startsWith("STATUS_OK")) {
                    const code = text.split(":")[1];
                    let oStr = await env.USERS_DB.get(`act:${body.actId}`);
                    if(oStr) {
                        let order = JSON.parse(oStr);
                        order.status = 'OK';
                        order.code = code;
                        await env.USERS_DB.put(`act:${body.actId}`, JSON.stringify(order));
                    }
                    await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=6&id=${body.actId}`);
                    return new Response(JSON.stringify({ status: 'OK', code }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ status: text }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'cancel') {
                const orderStr = await env.USERS_DB.get(`act:${body.actId}`);
                if (!orderStr) return new Response(JSON.stringify({ success: false, message: "Order not found" }), { headers: { "Content-Type": "application/json" } });
                const order = JSON.parse(orderStr);
                
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${body.actId}`);
                const text = await res.text();
                
                if (text === "ACCESS_CANCEL" || text === "STATUS_CANCEL") {
                    await adjustBalance(body.userId, order.cost, env);
                    await env.USERS_DB.delete(`act:${body.actId}`);
                    
                    // Cleanup user order list
                    let userOrdersStr = await env.USERS_DB.get(`user_orders:${body.userId}`);
                    if (userOrdersStr) {
                        let userOrders = JSON.parse(userOrdersStr).filter(id => id !== body.actId);
                        await env.USERS_DB.put(`user_orders:${body.userId}`, JSON.stringify(userOrders));
                    }
                    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { headers: { "Content-Type": "application/json" } });
            }
        }

        // 🔵 TELEGRAM BOT API
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text || "";
            const userId = body.message.from.id.toString();
            
            await ensureUser(userId, body.message.from, env);

            if (text.startsWith("/start")) {
                const user = await getUser(userId, env);
                const welcomeText = `👑 *Welcome to AlokOTP Pro Store*\n\n💰 *Wallet Balance:* \`$${user.balance.toFixed(2)}\`\n🆔 *Telegram User ID:* \`${userId}\`\n\n⚡ Buy virtual SMS numbers for WhatsApp, Telegram, Google & 2000+ services with 100% auto refund!`;
                const kb = { 
                    inline_keyboard: [
                        [{ text: "🚀 Open Web App Store", web_app: { url: request.url } }],
                        [{ text: "💬 Support", url: "https://t.me/AlokAdminSupport" }]
                    ] 
                };
                if (userId === ADMIN_ID.toString()) kb.inline_keyboard.push([{ text: "🛡️ Admin Panel", callback_data: "admin_panel" }]);
                
                await sendTgMessage(chatId, welcomeText, kb);
            }
            
            if (userId === ADMIN_ID.toString()) {
                if (text.startsWith("/add")) {
                    const parts = text.split(" ");
                    if (parts.length === 3) {
                        const newBal = await adjustBalance(parts[1], parseFloat(parts[2]), env);
                        await sendTgMessage(chatId, `✅ Successfully added \`$${parts[2]}\` to user \`${parts[1]}\`.\nNew Balance: \`$${newBal.toFixed(2)}\``);
                    }
                } else if (text.startsWith("/setupi")) {
                    const upi = text.replace("/setupi", "").trim();
                    await env.USERS_DB.put("admin:upi", upi);
                    await sendTgMessage(chatId, `✅ Deposit UPI Address set to: \`${upi}\``);
                }
            }
        }

        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id.toString();
            
            if (cb.data === "admin_panel" && userId === ADMIN_ID.toString()) {
                const upi = await env.USERS_DB.get("admin:upi") || "Not Set";
                const gBalRes = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getBalance`);
                const gBal = await gBalRes.text();

                const txt = `🛡️ *Admin Control Dashboard*\n\n🐻 *Grizzly API Balance:* \`${gBal}\`\n🏦 *Current UPI:* \`${upi}\`\n📈 *Profit Margin:* \`${PROFIT_PERCENTAGE * 100}%\`\n\n*Admin Commands:*\n➕ Add Balance: \`/add <UserID> <Amount>\`\n🏦 Set UPI: \`/setupi <your_upi@bank>\``;
                await sendTgMessage(chatId, txt);
            }
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { method: "POST", body: JSON.stringify({ callback_query_id: cb.id }) });
        }

      } catch (err) { console.error(err); }
      return new Response("OK", { status: 200 });
    }
  }
};

// ==========================================
// 3. HELPER FUNCTIONS
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
                    const finalPrice = (baseCost * (1 + PROFIT_PERCENTAGE)).toFixed(2);
                    availableStock.push({ id: cId, name: COUNTRY_MAP[cId]?.name || `Country ${cId}`, stock, price: finalPrice });
                }
            }
        }
        availableStock.sort((a, b) => b.stock - a.stock);
        return availableStock;
    } catch (err) { return []; }
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
