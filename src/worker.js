// ==================== आपकी पूरी कॉन्फ़िगरेशन ====================
const BOT_TOKEN = "8776281127:AAHq0dEQyxJoHkM6WRim_aQv8McZAzJ6fZk";
const OWNER_ID = "8452322818";
const BIN_CHANNEL = "-1003795603399";
const BASE_URL = "https://alok-otp-bot1.cinealok0.workers.dev";
// =================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. वन-क्लिक Webhook सेट करने का लिंक
    if (path === "/setwebhook") {
      const webhookUrl = `${BASE_URL}/webhook`;
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // 2. टेलीग्राम बॉट वेबहुक (फाइल रिसीव और लिंक बनाना)
    if (request.method === "POST" && (path === "/webhook" || path === "/")) {
      try {
        const update = await request.json();
        if (update.message) {
          ctx.waitUntil(handleTelegramMessage(update.message));
        }
      } catch (err) {
        console.error("Webhook Error:", err);
      }
      return new Response("OK");
    }

    // 3. डायरेक्ट डाउनलोड लिंक (/dl/...)
    if (path.startsWith("/dl/")) {
      const token = path.replace("/dl/", "");
      return handleDownload(token, request);
    }

    // 4. ऑनलाइन वीडियो प्लेयर (/watch/...)
    if (path.startsWith("/watch/")) {
      const token = path.replace("/watch/", "");
      return handlePlayer(token);
    }

    // होमपेज (स्टेटस चेक)
    return new Response(
      `<html><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
        <h2>🚀 Telegram File Streamer Bot is Running!</h2>
        <p>Active Domain: <code>${BASE_URL}</code></p>
        <p><a style="display:inline-block;padding:10px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;" href="${BASE_URL}/setwebhook">🔗 बॉट एक्टिवेट करें (Set Webhook)</a></p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  },
};

// ==================== URL-SAFE BASE64 HELPER ====================
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  while (output.length % 4) {
    output += "=";
  }
  return atob(output);
}

// ==================== टेलीग्राम मैसेज हैंडलर ====================
async function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const fromId = String(message.from?.id || "");

  // सिर्फ आपकी ऑनर आईडी ही बॉट यूज़ कर पाएगी
  if (fromId !== OWNER_ID) {
    await sendTelegram(chatId, "⚠️ यह बॉट प्राइवेट है और केवल बॉट ऑनर के लिए सुरक्षित है।");
    return;
  }

  // /start कमांड
  if (message.text === "/start") {
    await sendTelegram(
      chatId,
      `👋 **नमस्ते ऑनर!**\n\nमुझे कोई भी वीडियो या फाइल भेजें। मैं उसे आपके प्राइवेट चैनल में हमेशा के लिए सेव कर दूंगा और आपको लाइफटाइम डाउनलोड व स्ट्रीमिंग लिंक बनाकर दूंगा!`
    );
    return;
  }

  // मीडिया चेक करना (Video / Document / Audio)
  const media = message.video || message.document || message.audio;
  if (!media) {
    await sendTelegram(chatId, "❌ कृपया कोई वीडियो या डॉक्यूमेंट फाइल भेजें।");
    return;
  }

  const fileId = media.file_id;
  const fileName = media.file_name || `video_${Date.now()}.mp4`;
  const fileSize = media.file_size || 0;

  // 1. फाइल को स्टोरेज चैनल में हमेशा के लिए फॉरवर्ड करें
  const forwardRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: BIN_CHANNEL,
      from_chat_id: chatId,
      message_id: message.message_id,
    }),
  });

  const forwardData = await forwardRes.json();
  const channelMsgId = forwardData.result?.message_id || message.message_id;

  // 2. परमानेंट टोकन जनरेट करना
  const meta = {
    f: fileId,
    m: channelMsgId,
    n: fileName,
    s: fileSize,
  };
  const token = base64UrlEncode(encodeURIComponent(JSON.stringify(meta)));

  const downloadLink = `${BASE_URL}/dl/${token}`;
  const watchLink = `${BASE_URL}/watch/${token}`;
  const channelCleanId = BIN_CHANNEL.replace("-100", "");
  const channelPostLink = `https://t.me/c/${channelCleanId}/${channelMsgId}`;
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  // 3. टेलीग्राम पर रिप्लाई भेजना
  const replyText =
    `✅ **फाइल Telegram में हमेशा के लिए सेव हो गई!**\n\n` +
    `📁 **फाइल का नाम:** \`${fileName}\`\n` +
    `📦 **साइज़:** \`${sizeMB} MB\`\n` +
    `🆔 **चैनल मैसेज ID:** \`${channelMsgId}\`\n\n` +
    `🔗 **डाउनलोड लिंक:**\n\`${downloadLink}\`\n\n` +
    `📌 *यह लिंक कभी एक्सपायर नहीं होगा!*`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⚡ डायरेक्ट डाउनलोड करें", url: downloadLink }],
          [{ text: "▶️ ऑनलाइन देखें (Web Player)", url: watchLink }],
          [{ text: "📂 स्टोरेज चैनल में देखें", url: channelPostLink }]
        ],
      },
    }),
  });
}

// ==================== डाउनलोड और स्ट्रीमिंग ====================
async function handleDownload(token, request) {
  try {
    const raw = decodeURIComponent(base64UrlDecode(token));
    const meta = JSON.parse(raw);

    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${meta.f}`
    );
    const fileInfo = await fileInfoRes.json();

    // अगर फाइल 20MB से बड़ी है तो डायरेक्ट चैनल लिंक शो करेगा
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      const channelCleanId = BIN_CHANNEL.replace("-100", "");
      const tgLink = `https://t.me/c/${channelCleanId}/${meta.m}`;
      return new Response(
        `<html><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
          <h2>⚠️ 20MB से बड़ी फाइल</h2>
          <p>यह फाइल 20MB से बड़ी है। फाइल आपके चैनल में 100% सुरक्षित सेव है।</p>
          <a style="display:inline-block;padding:12px 25px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:15px;" href="${tgLink}">📂 चैनल में फाइल खोलें (Direct Telegram Download)</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const tgDownloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`;
    const response = await fetch(tgDownloadUrl, { headers: request.headers });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Disposition", `attachment; filename="${meta.n}"`);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (e) {
    return new Response("अमान्य लिंक या फाइल नहीं मिली।", { status: 404 });
  }
}

// ==================== ऑनलाइन वीडियो प्लेयर ====================
async function handlePlayer(token) {
  try {
    const raw = decodeURIComponent(base64UrlDecode(token));
    const meta = JSON.parse(raw);
    const dlUrl = `${BASE_URL}/dl/${token}`;

    const html = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${meta.n} - Player</title>
      <style>
        body { background: #0b0f19; color: #fff; font-family: system-ui, sans-serif; text-align: center; padding: 20px; margin: 0; }
        .card { max-width: 800px; margin: 0 auto; background: #1a2234; padding: 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        video { width: 100%; max-height: 480px; border-radius: 8px; background: #000; }
        h3 { font-size: 1.1rem; word-break: break-all; margin-bottom: 15px; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; }
        .btn { padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; color: white; display: inline-block; }
        .btn-dl { background: #2563eb; }
        .btn-mx { background: #0284c7; }
        .btn-vlc { background: #f97316; }
      </style>
    </head>
    <body>
      <div class="card">
        <h3>🎬 ${meta.n}</h3>
        <video controls autoplay playsinline>
          <source src="${dlUrl}" type="video/mp4">
          आपका ब्राउज़र वीडियो सपोर्ट नहीं करता।
        </video>
        <div class="btn-group">
          <a class="btn btn-dl" href="${dlUrl}">⚡ डाउनलोड करें</a>
          <a class="btn btn-mx" href="intent:${dlUrl}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end">📱 Play in MX Player</a>
          <a class="btn btn-vlc" href="vlc://${dlUrl}">📱 Play in VLC</a>
        </div>
      </div>
    </body>
    </html>
    `;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e) {
    return new Response("अमान्य प्लेयर लिंक", { status: 404 });
  }
}

// ==================== टेलीग्राम मैसेज सेंडर ====================
async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });
}
