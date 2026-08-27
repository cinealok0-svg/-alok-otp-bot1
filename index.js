/**
 * 👑 ALOKOTP PRO — ALL SERVICES (26+ Services)
 * WhatsApp, Telegram, Instagram, Facebook, Google, TikTok, Twitter,
 * Snapchat, LinkedIn, YouTube, Pinterest, Reddit, Apple, Amazon,
 * Microsoft, Discord, VK, OK, Mail.ru, Uber, Zomato, Swiggy,
 * Google Play, Netflix, HBO, Disney+
 */

const BOT_TOKEN = "8958056500:AAFPh8tVoxDaZEy_dyw6f_oZWX_lFGyTCUc";
const ADMIN_ID = 8452322818;
const GRIZZLY_API_KEY = "7cd21341575f5a4b44c040530c314b3e";
const GRIZZLY_BASE = "https://api.grizzlysms.com/stubs/handler_api.php";
const PROFIT_PERCENTAGE = 0.03;

// ========== COMPLETE SERVICE MAP (26+ Services) ==========
const SERVICE_MAP = {
    // Social Media
    'wa': { label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
    'tg': { label: 'Telegram', icon: 'fab fa-telegram-plane', color: '#0088cc' },
    'ig': { label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' },
    'fb': { label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' },
    'go': { label: 'Google', icon: 'fab fa-google', color: '#DB4437' },
    'tk': { label: 'TikTok', icon: 'fab fa-tiktok', color: '#ffffff' },
    'tw': { label: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2' },
    'sn': { label: 'Snapchat', icon: 'fab fa-snapchat-ghost', color: '#FFFC00' },
    'li': { label: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0A66C2' },
    'yt': { label: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
    'pi': { label: 'Pinterest', icon: 'fab fa-pinterest-p', color: '#E60023' },
    'rd': { label: 'Reddit', icon: 'fab fa-reddit-alien', color: '#FF4500' },
    'vk': { label: 'VKontakte', icon: 'fab fa-vk', color: '#0077FF' },
    'ok': { label: 'Odnoklassniki', icon: 'fas fa-users', color: '#F2720C' },
    
    // Tech/Apps
    'ap': { label: 'Apple', icon: 'fab fa-apple', color: '#A2AAAD' },
    'am': { label: 'Amazon', icon: 'fab fa-amazon', color: '#FF9900' },
    'ms': { label: 'Microsoft', icon: 'fab fa-microsoft', color: '#00A4EF' },
    'dc': { label: 'Discord', icon: 'fab fa-discord', color: '#5865F2' },
    'gp': { label: 'Google Play', icon: 'fab fa-google-play', color: '#34A853' },
    
    // Delivery/Food
    'ub': { label: 'Uber', icon: 'fas fa-car', color: '#000000' },
    'zp': { label: 'Zomato', icon: 'fas fa-pizza-slice', color: '#E23744' },
    'sw': { label: 'Swiggy', icon: 'fas fa-utensils', color: '#FC8019' },
    
    // Email
    'ma': { label: 'Mail.ru', icon: 'fas fa-envelope', color: '#005FF9' },
    
    // Entertainment
    'nf': { label: 'Netflix', icon: 'fab fa-netflix', color: '#E50914' },
    'hb': { label: 'HBO', icon: 'fas fa-film', color: '#6B46C1' },
    'ds': { label: 'Disney+', icon: 'fas fa-star', color: '#113CCF' },
    
    // Crypto
    'cb': { label: 'Coinbase', icon: 'fab fa-bitcoin', color: '#0052FF' },
    'bn': { label: 'Binance', icon: 'fas fa-coins', color: '#F0B90B' },
    
    // Dating
    'tm': { label: 'Tinder', icon: 'fas fa-heart', color: '#FF6B6B' },
    'bm': { label: 'Bumble', icon: 'fas fa-bolt', color: '#FFC107' },
    
    // Others
    'sp': { label: 'Spotify', icon: 'fab fa-spotify', color: '#1DB954' },
    'sl': { label: 'Signal', icon: 'fab fa-signal', color: '#3A76F0' }
};

// ========== ALL COUNTRIES (85+) ==========
const COUNTRY_MAP = {
    "0": { name: "Russia", flag: "🇷🇺" }, "1": { name: "Ukraine", flag: "🇺🇦" },
    "2": { name: "Kazakhstan", flag: "🇰🇿" }, "3": { name: "China", flag: "🇨🇳" },
    "4": { name: "Philippines", flag: "🇵🇭" }, "5": { name: "Malaysia", flag: "🇲🇾" },
    "6": { name: "Indonesia", flag: "🇮🇩" }, "7": { name: "Vietnam", flag: "🇻🇳" },
    "8": { name: "Thailand", flag: "🇹🇭" }, "9": { name: "Nigeria", flag: "🇳🇬" },
    "10": { name: "South Africa", flag: "🇿🇦" }, "11": { name: "USA", flag: "🇺🇸" },
    "12": { name: "USA (Physical)", flag: "🇺🇸" }, "13": { name: "Mexico", flag: "🇲🇽" },
    "14": { name: "Brazil", flag: "🇧🇷" }, "15": { name: "Argentina", flag: "🇦🇷" },
    "16": { name: "United Kingdom", flag: "🇬🇧" }, "17": { name: "France", flag: "🇫🇷" },
    "18": { name: "Germany", flag: "🇩🇪" }, "19": { name: "Italy", flag: "🇮🇹" },
    "20": { name: "Spain", flag: "🇪🇸" }, "21": { name: "Portugal", flag: "🇵🇹" },
    "22": { name: "India", flag: "🇮🇳" }, "23": { name: "Pakistan", flag: "🇵🇰" },
    "24": { name: "Bangladesh", flag: "🇧🇩" }, "25": { name: "Sri Lanka", flag: "🇱🇰" },
    "26": { name: "Nepal", flag: "🇳🇵" }, "27": { name: "UAE", flag: "🇦🇪" },
    "28": { name: "Saudi Arabia", flag: "🇸🇦" }, "29": { name: "Egypt", flag: "🇪🇬" },
    "30": { name: "Turkey", flag: "🇹🇷" }, "31": { name: "Israel", flag: "🇮🇱" },
    "32": { name: "Australia", flag: "🇦🇺" }, "33": { name: "New Zealand", flag: "🇳🇿" },
    "34": { name: "Canada", flag: "🇨🇦" }, "35": { name: "Colombia", flag: "🇨🇴" },
    "36": { name: "Peru", flag: "🇵🇪" }, "37": { name: "Chile", flag: "🇨🇱" },
    "38": { name: "Venezuela", flag: "🇻🇪" }, "39": { name: "Ecuador", flag: "🇪🇨" },
    "40": { name: "Guatemala", flag: "🇬🇹" }, "41": { name: "Cuba", flag: "🇨🇺" },
    "42": { name: "Dominican", flag: "🇩🇴" }, "43": { name: "Honduras", flag: "🇭🇳" },
    "44": { name: "Nicaragua", flag: "🇳🇮" }, "45": { name: "Costa Rica", flag: "🇨🇷" },
    "46": { name: "Panama", flag: "🇵🇦" }, "47": { name: "Jamaica", flag: "🇯🇲" },
    "48": { name: "Trinidad", flag: "🇹🇹" }, "49": { name: "Guyana", flag: "🇬🇾" },
    "50": { name: "Bolivia", flag: "🇧🇴" }, "51": { name: "Paraguay", flag: "🇵🇾" },
    "52": { name: "Uruguay", flag: "🇺🇾" }, "53": { name: "Belgium", flag: "🇧🇪" },
    "54": { name: "Netherlands", flag: "🇳🇱" }, "55": { name: "Switzerland", flag: "🇨🇭" },
    "56": { name: "Austria", flag: "🇦🇹" }, "57": { name: "Sweden", flag: "🇸🇪" },
    "58": { name: "Norway", flag: "🇳🇴" }, "59": { name: "Denmark", flag: "🇩🇰" },
    "60": { name: "Finland", flag: "🇫🇮" }, "61": { name: "Poland", flag: "🇵🇱" },
    "62": { name: "Czech", flag: "🇨🇿" }, "63": { name: "Hungary", flag: "🇭🇺" },
    "64": { name: "Romania", flag: "🇷🇴" }, "65": { name: "Bulgaria", flag: "🇧🇬" },
    "66": { name: "Greece", flag: "🇬🇷" }, "67": { name: "Morocco", flag: "🇲🇦" },
    "68": { name: "Kenya", flag: "🇰🇪" }, "69": { name: "Ghana", flag: "🇬🇭" },
    "70": { name: "Angola", flag: "🇦🇴" }, "71": { name: "Mozambique", flag: "🇲🇿" },
    "72": { name: "Zambia", flag: "🇿🇲" }, "73": { name: "Zimbabwe", flag: "🇿🇼" },
    "74": { name: "Uganda", flag: "🇺🇬" }, "75": { name: "Tanzania", flag: "🇹🇿" },
    "76": { name: "Sudan", flag: "🇸🇩" }, "77": { name: "Rwanda", flag: "🇷🇼" },
    "78": { name: "Cameroon", flag: "🇨🇲" }, "79": { name: "Ivory Coast", flag: "🇨🇮" },
    "80": { name: "Burkina Faso", flag: "🇧🇫" }, "81": { name: "Mali", flag: "🇲🇱" },
    "82": { name: "Niger", flag: "🇳🇪" }, "83": { name: "Chad", flag: "🇹🇩" },
    "84": { name: "Somalia", flag: "🇸🇴" }, "85": { name: "Ethiopia", flag: "🇪🇹" }
};

// ==========================================
// 1. FRONTEND
// ==========================================
const buildHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AlokOTP Store</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0f; color: #e8e8e8; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a2e; }
        ::-webkit-scrollbar-thumb { background: #ff6a00; border-radius: 4px; }

        .header { background: linear-gradient(135deg, #0f0f1a, #1a1a2e); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #2a2a3e; }
        .logo { font-size: 20px; font-weight: 900; display: flex; align-items: center; gap: 8px; color: #fff; }
        .logo i { color: #ff6a00; }
        .logo span { background: linear-gradient(135deg, #ff6a00, #ff9a44); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .deposit-btn { background: #2ecc71; color: #fff; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .profile-btn { background: linear-gradient(135deg, #ff6a00, #ee5a00); color: #fff; padding: 7px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 5px; }

        .container { padding: 14px 16px; max-width: 500px; margin: 0 auto; }
        .section-title { font-size: 13px; font-weight: 700; color: #8888aa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

        .service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
        .service-card { background: #14141f; border: 2px solid transparent; border-radius: 12px; padding: 10px 4px; text-align: center; cursor: pointer; transition: all 0.25s; color: #8888aa; }
        .service-card .icon { font-size: 20px; display: block; margin-bottom: 3px; }
        .service-card .label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.2px; font-weight: 600; }
        .service-card.active { border-color: #ff6a00; background: #1a1a2e; color: #fff; }
        .service-card:active { transform: scale(0.95); }

        .search-box { width: 100%; background: #14141f; border: 1px solid #2a2a3e; padding: 12px 14px; border-radius: 12px; font-size: 14px; color: #e8e8e8; outline: none; margin-bottom: 12px; }
        .search-box::placeholder { color: #555577; }
        .search-box:focus { border-color: #ff6a00; }

        .country-list { display: flex; flex-direction: column; gap: 8px; max-height: 55vh; overflow-y: auto; padding-bottom: 10px; }
        .country-card { background: #14141f; border: 1px solid #1e1e32; border-radius: 12px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
        .country-card:active { transform: scale(0.98); }
        .c-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .c-flag { font-size: 26px; min-width: 36px; }
        .c-info { flex: 1; min-width: 0; }
        .c-name { font-weight: 700; font-size: 13px; color: #e8e8e8; }
        .c-qty { font-size: 10px; color: #555577; }
        .c-price { font-weight: 800; color: #ff6a00; font-size: 15px; margin-right: 10px; }
        .c-buy { background: linear-gradient(135deg, #ff6a00, #ee5a00); color: #fff; border: none; padding: 7px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }
        .c-buy:disabled { opacity: 0.3; cursor: not-allowed; }

        .loader { text-align: center; padding: 30px; display: none; }
        .spinner { border: 3px solid #1a1a2e; border-top: 3px solid #ff6a00; border-radius: 50%; width: 35px; height: 35px; animation: spin 0.8s linear infinite; margin: 0 auto 8px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        #orderScreen { display: none; }
        .order-box { background: #14141f; border: 1px solid #1e1e32; border-radius: 16px; padding: 20px; text-align: center; margin-top: 8px; }
        .o-phone { font-size: 28px; font-weight: 900; color: #ff6a00; margin: 10px 0; }
        .o-status { font-size: 13px; font-weight: 600; color: #f39c12; padding: 8px; background: #1a1a2e; border-radius: 8px; }
        .o-code { font-size: 34px; font-weight: 900; color: #2ecc71; display: none; padding: 10px; background: #0a1a0f; border-radius: 10px; border: 1px solid #2ecc71; }
        .btn-row { display: flex; gap: 10px; margin-top: 10px; }
        .btn-check { flex: 1; background: #2ecc71; color: #fff; border: none; padding: 10px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-cancel { flex: 1; background: #e74c3c; color: #fff; border: none; padding: 10px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .btn-back { background: none; border: none; color: #555577; font-size: 13px; cursor: pointer; font-weight: 600; }

        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a1a2e; color: #fff; padding: 10px 22px; border-radius: 12px; display: none; font-size: 13px; border: 1px solid #2a2a3e; z-index: 999; }
        .empty-state { text-align: center; padding: 30px; color: #555577; }
        .empty-state i { font-size: 36px; display: block; margin-bottom: 8px; color: #2a2a3e; }

        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index:200; display:none; justify-content:center; align-items:center; padding:20px; }
        .modal-overlay.active { display:flex; }
        .modal-box { background:#14141f; border:1px solid #2a2a3e; border-radius:16px; padding:24px 20px; max-width:380px; width:100%; text-align:center; }
        .modal-box h2 { color:#e8e8e8; font-size:18px; }
        .modal-box p { color:#8888aa; font-size:13px; }
        .modal-box .upi-id { background:#0a0a0f; padding:12px; border-radius:10px; color:#ff6a00; font-size:18px; font-weight:700; border:1px dashed #2a2a3e; margin:10px 0; }
        .modal-close { background:#e74c3c; color:#fff; border:none; padding:10px; border-radius:10px; font-weight:700; cursor:pointer; width:100%; margin-top:10px; }
        .copy-btn { background:#2a2a3e; color:#e8e8e8; border:none; padding:8px 20px; border-radius:8px; font-weight:600; cursor:pointer; }
    </style>
</head>
<body>

    <div class="header">
        <div class="logo"><i class="fas fa-paw"></i> <span>AlokOTP</span></div>
        <div class="header-right">
            <button class="deposit-btn" onclick="openDeposit()"><i class="fas fa-plus-circle"></i> Deposit</button>
            <div class="profile-btn" id="balDisplay"><i class="fas fa-wallet"></i> $0.00</div>
        </div>
    </div>

    <div class="container" id="mainScreen">
        <div class="section-title"><span>📱 Select Service</span></div>
        <div class="service-grid" id="services"></div>

        <div class="section-title"><span id="countryTitle">🌍 Select Country</span></div>
        <input type="text" id="searchBox" class="search-box" placeholder="🔍 Search country..." onkeyup="filterCountries()">
        <div class="loader" id="loader"><div class="spinner"></div>Loading stock...</div>
        <div class="country-list" id="countryList"></div>
    </div>

    <div class="container" id="orderScreen">
        <button class="btn-back" onclick="showMain()"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="order-box">
            <h3>📞 Your Virtual Number</h3>
            <div class="o-phone" id="oPhone">+1 234 567 8900</div>
            <div class="o-status" id="oStatus"><i class="fas fa-spinner fa-spin"></i> Waiting for SMS...</div>
            <div class="o-code" id="oCode"></div>
            <div class="btn-row" id="oButtons">
                <button class="btn-check" onclick="checkOTP()"><i class="fas fa-sync-alt"></i> Check SMS</button>
                <button class="btn-cancel" onclick="cancelOrder()"><i class="fas fa-times"></i> Cancel</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="depositModal">
        <div class="modal-box">
            <h2>💰 Deposit Funds</h2>
            <p>Send payment to UPI & text @AlokOTP with TXN ID</p>
            <div class="upi-id" id="upiDisplay">alokotp@paytm</div>
            <button class="copy-btn" onclick="copyUPI()"><i class="fas fa-copy"></i> Copy UPI</button>
            <button class="modal-close" onclick="closeDeposit()">Close</button>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        
        const API_URL = window.location.href;
        let currentSrv = 'wa';
        let stockData = [];
        let userId = tg.initDataUnsafe?.user?.id || 'TEST_USER';
        let currentOrderId = null;
        let isProcessing = false;
        let SERVICES = [];
        let COUNTRY_MAP = {};

        async function loadServices() {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'api', action: 'get_services' })
                });
                const data = await res.json();
                SERVICES = data.services || [];
                COUNTRY_MAP = data.countries || {};
                initServices();
                if (SERVICES.length > 0) {
                    currentSrv = SERVICES[0].id;
                    loadCountries(currentSrv);
                }
            } catch(e) {
                showToast('❌ Failed to load services');
            }
        }

        function initServices() {
            const grid = document.getElementById('services');
            grid.innerHTML = '';
            SERVICES.forEach(s => {
                const div = document.createElement('div');
                div.className = 'service-card' + (s.id === currentSrv ? ' active' : '');
                div.innerHTML = `<span class="icon" style="color:${s.color}"><i class="${s.icon}"></i></span><span class="label">${s.label}</span>`;
                div.onclick = () => loadCountries(s.id, div);
                grid.appendChild(div);
            });
        }

        async function loadCountries(srv, btn) {
            currentSrv = srv;
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
            if(btn) btn.classList.add('active');
            
            const s = SERVICES.find(x => x.id === srv);
            document.getElementById('countryTitle').textContent = `🌍 ${s ? s.label : 'Country'}`;
            document.getElementById('searchBox').value = '';
            document.getElementById('countryList').innerHTML = '';
            document.getElementById('loader').style.display = 'block';

            try {
                const res = await fetch(API_URL, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'api', action: 'get_stock', service: srv }) 
                });
                const data = await res.json();
                stockData = data.items || [];
                renderList(stockData);
            } catch (e) {
                showToast('❌ Failed to load stock');
            }
            document.getElementById('loader').style.display = 'none';
        }

        function renderList(items) {
            const list = document.getElementById('countryList');
            if (!items || items.length === 0) {
                list.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i>No countries available</div>`;
                return;
            }
            list.innerHTML = '';
            items.forEach(item => {
                const country = COUNTRY_MAP[item.id] || { name: `Country ${item.id}`, flag: '🌍' };
                const div = document.createElement('div');
                div.className = 'country-card';
                div.innerHTML = `
                    <div class="c-left">
                        <div class="c-flag">${country.flag}</div>
                        <div class="c-info">
                            <div class="c-name">${country.name}</div>
                            <div class="c-qty">📦 ${item.stock} available</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;">
                        <span class="c-price">$${item.price}</span>
                        <button class="c-buy" onclick="buyNumber('${item.id}', '${item.price}')" ${item.stock < 1 ? 'disabled' : ''}>
                            ${item.stock < 1 ? 'Out' : 'Buy'}
                        </button>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        function filterCountries() {
            const q = document.getElementById('searchBox').value.toLowerCase();
            const filtered = stockData.filter(i => {
                const country = COUNTRY_MAP[i.id] || { name: `Country ${i.id}` };
                return country.name.toLowerCase().includes(q);
            });
            renderList(filtered);
        }

        async function buyNumber(countryId, price) {
            if (isProcessing) return;
            const s = SERVICES.find(x => x.id === currentSrv);
            tg.showConfirm(`Buy ${s ? s.label : ''} number for $${price}?`, async (ok) => {
                if (!ok) return;
                isProcessing = true;
                tg.MainButton.showProgress();
                
                try {
                    const res = await fetch(API_URL, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'api', action: 'buy', userId, service: currentSrv, country: countryId, price }) 
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        currentOrderId = data.actId;
                        document.getElementById('oPhone').textContent = '+' + data.phone;
                        document.getElementById('oStatus').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for SMS...';
                        document.getElementById('oStatus').style.color = '#f39c12';
                        document.getElementById('oCode').style.display = 'none';
                        document.getElementById('oButtons').style.display = 'flex';
                        
                        document.getElementById('mainScreen').style.display = 'none';
                        document.getElementById('orderScreen').style.display = 'block';
                        updateBalance();
                        showToast('✅ Number purchased! Waiting for SMS...');
                    } else {
                        tg.showAlert(data.message || '❌ Insufficient balance or error.');
                    }
                } catch(e) { 
                    tg.showAlert('❌ Network error. Please retry.');
                }
                tg.MainButton.hideProgress();
                isProcessing = false;
            });
        }

        async function checkOTP() {
            if (!currentOrderId) return;
            try {
                const res = await fetch(API_URL, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'api', action: 'status', actId: currentOrderId }) 
                });
                const data = await res.json();
                
                if (data.status === 'OK') {
                    document.getElementById('oStatus').innerHTML = '<i class="fas fa-check-circle"></i> ✅ SMS Received!';
                    document.getElementById('oStatus').style.color = '#2ecc71';
                    document.getElementById('oCode').textContent = data.code;
                    document.getElementById('oCode').style.display = 'block';
                    document.getElementById('oButtons').style.display = 'none';
                    showToast('✅ OTP: ' + data.code);
                } else if (data.status === 'WAITING') {
                    showToast('⏳ Waiting for SMS...');
                } else {
                    tg.showAlert('Status: ' + data.status);
                }
            } catch(e) { tg.showAlert('Error checking SMS.'); }
        }

        async function cancelOrder() {
            if (!currentOrderId) return;
            tg.showConfirm('⚠️ Cancel order? Refund will be added.', async (ok) => {
                if (!ok) return;
                try {
                    const res = await fetch(API_URL, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'api', action: 'cancel', userId, actId: currentOrderId }) 
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        showToast('✅ Order cancelled! Refunded.');
                        updateBalance();
                        showMain();
                    } else {
                        tg.showAlert('❌ ' + data.message);
                    }
                } catch(e) { tg.showAlert('Error cancelling.'); }
            });
        }

        async function updateBalance() {
            try {
                const res = await fetch(API_URL, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'api', action: 'get_user', userId }) 
                });
                const data = await res.json();
                document.getElementById('balDisplay').innerHTML = `<i class="fas fa-wallet"></i> $${data.balance || '0.00'}`;
            } catch(e) {}
        }

        function openDeposit() { document.getElementById('depositModal').classList.add('active'); }
        function closeDeposit() { document.getElementById('depositModal').classList.remove('active'); }
        function copyUPI() {
            const upi = document.getElementById('upiDisplay').textContent;
            navigator.clipboard.writeText(upi).then(() => showToast('✅ UPI copied: ' + upi));
        }

        function showMain() {
            document.getElementById('orderScreen').style.display = 'none';
            document.getElementById('mainScreen').style.display = 'block';
            loadCountries(currentSrv);
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.style.display = 'block';
            clearTimeout(t._timeout);
            t._timeout = setTimeout(() => { t.style.display = 'none'; }, 2500);
        }

        // BOOT
        loadServices();
        updateBalance();
        setInterval(updateBalance, 30000);
    </script>
</body>
</html>
`;

// ==========================================
// 2. BACKEND
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(buildHTML(), { 
        status: 200, 
        headers: { "Content-Type": "text/html; charset=utf-8" } 
      });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();

        if (body.type === 'api') {
            
            // GET DYNAMIC SERVICES
            if (body.action === 'get_services') {
                const availableServices = await getAvailableServices();
                return new Response(JSON.stringify({ 
                    services: availableServices,
                    countries: COUNTRY_MAP
                }), { headers: { "Content-Type": "application/json" } });
            }

            if (body.action === 'get_user') {
                const user = await getUser(body.userId, env);
                return new Response(JSON.stringify({ balance: user.balance.toFixed(2) }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            }

            if (body.action === 'get_stock') {
                const stock = await fetchLiveStock(body.service);
                return new Response(JSON.stringify({ items: stock }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            }

            if (body.action === 'buy') {
                const user = await getUser(body.userId, env);
                const price = parseFloat(body.price);
                
                if (user.balance < price) {
                    return new Response(JSON.stringify({ success: false, message: "Insufficient Balance!" }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }
                
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=${body.service}&country=${body.country}`);
                const text = await res.text();
                
                if (text.startsWith("ACCESS_NUMBER")) {
                    const [, actId, phone] = text.split(":");
                    await adjustBalance(body.userId, -price, env);
                    await env.USERS_DB.put(`act:${actId}`, JSON.stringify({ 
                        userId: body.userId, cost: price, phone, status: "WAITING" 
                    }));
                    return new Response(JSON.stringify({ success: true, actId, phone }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            }

            if (body.action === 'status') {
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${body.actId}`);
                const text = await res.text();
                if (text.startsWith("STATUS_OK")) {
                    const code = text.split(":")[1];
                    await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=6&id=${body.actId}`);
                    return new Response(JSON.stringify({ status: 'OK', code }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                } else if (text === "STATUS_WAIT_CODE" || text === "STATUS_WAITING") {
                    return new Response(JSON.stringify({ status: 'WAITING' }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }
                return new Response(JSON.stringify({ status: text }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            }

            if (body.action === 'cancel') {
                const orderStr = await env.USERS_DB.get(`act:${body.actId}`);
                if (!orderStr) {
                    return new Response(JSON.stringify({ success: false, message: "Order not found" }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }
                const order = JSON.parse(orderStr);
                const res = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${body.actId}`);
                const text = await res.text();
                if (text === "ACCESS_CANCEL" || text.startsWith("ACCESS")) {
                    await adjustBalance(body.userId, order.cost, env);
                    await env.USERS_DB.delete(`act:${body.actId}`);
                    return new Response(JSON.stringify({ success: true }), { 
                        headers: { "Content-Type": "application/json" } 
                    });
                }
                return new Response(JSON.stringify({ success: false, message: text }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            }
        }

        // TELEGRAM BOT
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text || "";
            const userId = body.message.from.id.toString();
            
            await ensureUser(userId, body.message.from, env);

            if (text.startsWith("/start")) {
                const user = await getUser(userId, env);
                const welcomeText = `👑 *AlokOTP Pro Store*\n\n💰 *Balance:* \`$${user.balance.toFixed(2)}\`\n🆔 *ID:* \`${userId}\`\n\n👇 Click below to open the store:`;
                const kb = { 
                    inline_keyboard: [
                        [{ text: "🛒 Open Store", web_app: { url: request.url } }],
                        [{ text: "💰 Deposit", callback_data: "deposit" }]
                    ] 
                };
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
                        await sendTgMessage(chatId, `✅ Added \`$${parts[2]}\` to \`${parts[1]}\`.\nNew Balance: \`$${newBal.toFixed(2)}\``);
                    }
                } else if (text.startsWith("/setupi")) {
                    const upi = text.replace("/setupi", "").trim();
                    await env.USERS_DB.put("admin:upi", upi);
                    await sendTgMessage(chatId, `✅ UPI updated: \`${upi}\``);
                }
            }
        }

        if (body.callback_query) {
            const cb = body.callback_query;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id.toString();
            
            if (cb.data === "deposit") {
                const upi = await env.USERS_DB.get("admin:upi") || "alokotp@paytm";
                await sendTgMessage(chatId, `💰 *Deposit Funds*\n\nSend payment to UPI: \`${upi}\`\n\nAfter payment, send TXN ID to @AlokOTP.`);
            }
            
            if (cb.data === "admin_panel" && userId === ADMIN_ID.toString()) {
                const upi = await env.USERS_DB.get("admin:upi") || "Not Set";
                const gBalRes = await fetch(`${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getBalance`);
                const gBal = await gBalRes.text();
                const txt = `🛡️ *Admin Panel*\n\n🐻 *Grizzly Balance:* \`${gBal}\`\n🏦 *UPI:* \`${upi}\`\n📈 *Profit:* \`${PROFIT_PERCENTAGE * 100}%\`\n\n*Commands:*\n\`/add <UserID> <Amount>\`\n\`/setupi <upi@bank>\``;
                await sendTgMessage(chatId, txt);
            }
            
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callback_query_id: cb.id }) 
            });
        }

      } catch (err) { console.error(err); }
      return new Response("OK", { status: 200 });
    }
  }
};

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================

async function getAvailableServices() {
    const serviceCodes = Object.keys(SERVICE_MAP);
    let available = [];
    
    for (const code of serviceCodes) {
        try {
            const url = `${GRIZZLY_BASE}?api_key=${GRIZZLY_API_KEY}&action=getPricesV3&service=${code}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data && Object.keys(data).length > 0) {
                let hasStock = false;
                for (const cId in data) {
                    if (data[cId] && data[cId][code] && parseInt(data[cId][code].count || 0) > 0) {
                        hasStock = true;
                        break;
                    }
                }
                if (hasStock) {
                    available.push({
                        id: code,
                        label: SERVICE_MAP[code].label,
                        icon: SERVICE_MAP[code].icon,
                        color: SERVICE_MAP[code].color
                    });
                }
            }
        } catch (e) {}
    }
    
    if (available.length === 0) {
        available = [
            { id: 'wa', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
            { id: 'tg', label: 'Telegram', icon: 'fab fa-telegram-plane', color: '#0088cc' },
            { id: 'ig', label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' }
        ];
    }
    
    return available;
}

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
                    const baseCost = parseFloat(item.price || 0.15);
                    const finalPrice = (baseCost * (1 + PROFIT_PERCENTAGE)).toFixed(2);
                    availableStock.push({ id: cId, stock, price: finalPrice });
                }
            }
        }
        availableStock.sort((a, b) => b.stock - a.stock);
        return availableStock;
    } catch (err) { 
        return []; 
    }
}

async function ensureUser(userId, from, env) {
    if (!(await env.USERS_DB.get(`usr:${userId}`))) {
        await env.USERS_DB.put(`usr:${userId}`, JSON.stringify({ 
            name: from?.first_name || "User", balance: 0.00 
        }));
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
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
    });
}
