/**
 * SMT TEMPMAIL Pro - Backend Engine
 * Domain: vibepulsemedia.online
 * Storage Engine: Cloudflare R2 Object Storage (Zero KV, Zero SQL/D1)
 */

const DOMAIN_NAME = "vibepulsemedia.online";

// 80+ Realistic & Aesthetic Girl Names for Natural Emails
const GIRL_NAMES = [
  "aarohi", "ananya", "priya", "zoya", "ishita", "alisha", "riya", "kavya",
  "sneha", "diya", "tanvi", "simran", "meera", "khushi", "tanya", "avani",
  "sonia", "muskan", "kriti", "nisha", "pooja", "shreya", "neha", "anjali",
  "swati", "aditi", "radhika", "komal", "sakshi", "pallavi", "divya", "payal",
  "mansi", "roshni", "deepika", "jyoti", "monika", "parul", "garima", "richa",
  "emma", "sophia", "olivia", "mia", "chloe", "amelia", "lily", "grace",
  "hannah", "zoey", "nora", "hazel", "aurora", "ellie", "stella", "maya",
  "aisha", "kiara", "tanisha", "saanvi", "myra", "siya", "navya", "prisha"
];

// CORS Headers (Frontend se bina kisi rukawat connect hone ke liye)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  /**
   * 1. EMAIL ROUTING EVENT HANDLER
   * vibepulsemedia.online par aane wale har email ko receive karta hai
   */
  async email(message, env, ctx) {
    try {
      const toAddress = (message.to || "").toLowerCase().trim();
      const fromAddress = message.from || "unknown@sender.com";
      const subject = message.headers.get("subject") || "(No Subject)";

      // Raw MIME email text read karein
      const rawEmail = await new Response(message.raw).text();
      const parsed = parseMimeEmail(rawEmail);

      const bodyText = parsed.text || "";
      const bodyHtml = parsed.html || "";
      const fullContent = `${subject} ${bodyText} ${bodyHtml}`;

      // Smart extraction: Auto OTP & Verification URL
      const otpCode = extractOTP(fullContent);
      const verifyUrl = extractVerifyLink(fullContent);

      const id = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      const createdAt = Date.now();

      const emailPayload = {
        id,
        inbox: toAddress,
        from: {
          address: fromAddress,
          name: parsed.fromName || fromAddress
        },
        to: toAddress,
        subject,
        text: bodyText,
        html: bodyHtml,
        otp: otpCode,
        verifyUrl,
        createdAt: new Date(createdAt).toISOString(),
        seen: false
      };

      // R2 Object Storage me save karein (Folder structure: inbox/timestamp_id.json)
      // Reverse timestamp use kiya hai taaki list karte waqt latest email sabse upar aaye
      const reverseTime = (9999999999999 - createdAt).toString().padStart(13, '0');
      const objectKey = `${toAddress}/${reverseTime}_${id}.json`;

      await env.MAIL_BUCKET.put(objectKey, JSON.stringify(emailPayload), {
        customMetadata: {
          id,
          fromName: parsed.fromName || fromAddress,
          fromAddress,
          subject,
          otp: otpCode || "",
          verifyUrl: verifyUrl || "",
          createdAt: createdAt.toString(),
          seen: "0"
        }
      });

      console.log(`[R2 Saved] ${toAddress} | OTP: ${otpCode || 'None'}`);
    } catch (err) {
      console.error("[Email Handler Error]:", err);
    }
  },

  /**
   * 2. REST API FETCH HANDLER
   * Frontend (index.html) is API se baatcheet karega
   */
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. GET /api/domains -> Active domain return karega
      if (path === "/api/domains" && request.method === "GET") {
        return jsonResponse({ domains: [DOMAIN_NAME] });
      }

      // 2. GET /api/random-email -> Girl name ke sath fresh email generate karega
      if (path === "/api/random-email" && request.method === "GET") {
        const randomGirl = GIRL_NAMES[Math.floor(Math.random() * GIRL_NAMES.length)];
        const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit natural number
        const email = `${randomGirl}${randomNum}@${DOMAIN_NAME}`;
        return jsonResponse({
          email,
          username: `${randomGirl}${randomNum}`,
          domain: DOMAIN_NAME
        });
      }

      // 3. GET /api/messages?inbox=... -> Purana ya naya koi bhi inbox fetch karega
      if (path === "/api/messages" && request.method === "GET") {
        const inbox = (url.searchParams.get("inbox") || "").toLowerCase().trim();
        if (!inbox) {
          return jsonResponse({ error: "Missing inbox query parameter" }, 400);
        }

        // R2 me is inbox ke prefix wale saare objects search karein
        const listResult = await env.MAIL_BUCKET.list({
          prefix: `${inbox}/`,
          limit: 50,
          include: ["customMetadata"]
        });

        const messages = listResult.objects.map(obj => {
          const meta = obj.customMetadata || {};
          return {
            id: meta.id || obj.key.split('_').pop().replace('.json', ''),
            storageKey: obj.key,
            from: {
              address: meta.fromAddress || "unknown",
              name: meta.fromName || "Unknown"
            },
            to: inbox,
            subject: meta.subject || "(No Subject)",
            intro: meta.otp ? `Verification Code: ${meta.otp}` : "Click to read full email",
            otp: meta.otp || null,
            verifyUrl: meta.verifyUrl || null,
            createdAt: new Date(parseInt(meta.createdAt || obj.uploaded.getTime())).toISOString(),
            seen: meta.seen === "1"
          };
        });

        return jsonResponse({
          inbox,
          count: messages.length,
          messages
        });
      }

      // 4. GET /api/message-detail?key=... -> Poora HTML/Body content read karega
      if (path === "/api/message-detail" && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key) {
          return jsonResponse({ error: "Missing key parameter" }, 400);
        }

        const object = await env.MAIL_BUCKET.get(key);
        if (!object) {
          return jsonResponse({ error: "Message not found" }, 404);
        }

        const data = await object.json();
        data.seen = true;

        // Mark as read in metadata
        const meta = object.customMetadata || {};
        meta.seen = "1";
        await env.MAIL_BUCKET.put(key, JSON.stringify(data), { customMetadata: meta });

        return jsonResponse(data);
      }

      // 5. DELETE /api/message-detail?key=... -> Ek specific email delete karega
      if (path === "/api/message-detail" && request.method === "DELETE") {
        const key = url.searchParams.get("key");
        if (key) {
          await env.MAIL_BUCKET.delete(key);
        }
        return jsonResponse({ success: true, deletedKey: key });
      }

      // 6. DELETE /api/inbox?inbox=... -> Poora purana inbox saaf karega
      if (path === "/api/inbox" && request.method === "DELETE") {
        const inbox = (url.searchParams.get("inbox") || "").toLowerCase().trim();
        if (inbox) {
          const list = await env.MAIL_BUCKET.list({ prefix: `${inbox}/` });
          for (const item of list.objects) {
            await env.MAIL_BUCKET.delete(item.key);
          }
        }
        return jsonResponse({ success: true, cleared: inbox });
      }

      return jsonResponse({ error: "Route not found", domain: DOMAIN_NAME }, 404);

    } catch (err) {
      return jsonResponse({ error: err.message || "Internal Worker Error" }, 500);
    }
  }
};

/* ==================================================================== */
/* PARSING & DECODING UTILITIES                                         */
/* ==================================================================== */

// Auto OTP Parser (4 to 8 digits)
function extractOTP(content) {
  if (!content) return null;
  const match = content.match(/(?:code|otp|pin|verification\s*code|password\s*reset|security\s*code)[:\s*#]*([0-9]{4,8})\b/i);
  if (match && match[1]) return match[1];

  const sixDigit = content.match(/\b([0-9]{6})\b/);
  return sixDigit ? sixDigit[1] : null;
}

// Verification link extractor
function extractVerifyLink(content) {
  if (!content) return null;
  const match = content.match(/https?:\/\/[^\s"'<>]+(?:verify|confirm|activate|validation|token=)[^\s"'<>]*/i);
  return match ? match[0] : null;
}

// Robust Multi-part MIME Parser
function parseMimeEmail(raw) {
  let text = "";
  let html = "";
  let fromName = "";

  const fromMatch = raw.match(/From:\s*([^<\r\n]+)<([^>]+)>/i);
  if (fromMatch) {
    fromName = fromMatch[1].replace(/["']/g, "").trim();
  }

  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split("--" + boundary);

    for (const part of parts) {
      if (part.includes("text/html")) {
        html = cleanMimeSection(part);
      } else if (part.includes("text/plain")) {
        text = cleanMimeSection(part);
      }
    }
  } else {
    const bodyStart = raw.indexOf("\r\n\r\n");
    text = bodyStart !== -1 ? raw.substring(bodyStart + 4) : raw;
  }

  return {
    text: decodeQuotedPrintable(text.trim()),
    html: decodeQuotedPrintable(html.trim()),
    fromName
  };
}

function cleanMimeSection(part) {
  const headerEnd = part.indexOf("\r\n\r\n");
  if (headerEnd === -1) return part;
  const body = part.substring(headerEnd + 4);
  const isBase64 = /content-transfer-encoding:\s*base64/i.test(part);

  if (isBase64) {
    try {
      return atob(body.replace(/\s/g, ""));
    } catch (_) {}
  }
  return body;
}

function decodeQuotedPrintable(str) {
  if (!str) return "";
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
