const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

function trimEnvValue(value) {
  let v = String(value).trim();
  if (v.length >= 2) {
    const a = v[0];
    const b = v[v.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      v = v.slice(1, -1);
    }
  }
  return v;
}

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    env[k.trim()] = trimEnvValue(rest.join("="));
  }
  return env;
}

const env = {
  ...loadEnv(path.join(ROOT, ".env")),
  ...process.env,
};

function addCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  addCors(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  addCors(res);
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function handleRsvp(req, res) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return sendJson(res, 500, { ok: false, message: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" });
  }

  let parsed = {};
  try {
    const raw = await readBody(req);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (error) {
    return sendJson(res, 400, { ok: false, message: "Invalid JSON body" });
  }

  const name = String(parsed.name || "Гость").trim() || "Гость";
  const attendance = String(parsed.attendance || "");
  const comment = String(parsed.comment || "").trim();
  const source = String(parsed.source || "website").trim() || "website";
  const submittedAt = String(parsed.submittedAt || new Date().toISOString()).trim();

  const attendanceLabel =
    attendance === "yes" ? "Да, буду" :
    attendance === "no" ? "Не смогу" :
    "Не указано";

  const text = [
    "Новый RSVP с сайта",
    `Имя: ${name}`,
    `Присутствие: ${attendanceLabel}`,
    `Комментарий: ${comment || "-"}`,
    `Источник: ${source}`,
    `Время: ${submittedAt}`,
  ].join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: /^\d+$/.test(String(chatId).trim()) ? Number(String(chatId).trim()) : chatId,
      text,
    }),
  });

  const tgText = await telegramResponse.text();
  let tgJson = null;
  try {
    tgJson = tgText ? JSON.parse(tgText) : null;
  } catch {
    tgJson = null;
  }

  if (!telegramResponse.ok || !tgJson || tgJson.ok !== true) {
    const details =
      (tgJson && typeof tgJson.description === "string" && tgJson.description) || tgText || "Unknown error";
    return sendJson(res, 502, { ok: false, message: "Telegram request failed", details });
  }

  return sendJson(res, 200, { ok: true });
}

function serveStatic(req, res, pathname) {
  let relPath = pathname === "/" ? "/index.html" : pathname;
  relPath = decodeURIComponent(relPath);
  const filePath = path.normalize(path.join(ROOT, relPath));
  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return sendText(res, 404, "Not found");
    addCors(res);
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".mp3": "audio/mpeg",
      ".php": "text/plain; charset=utf-8",
    };
    const mime = typeMap[ext] || "application/octet-stream";
    const cache =
      ext === ".html"
        ? "no-cache, no-store, must-revalidate"
        : ext === ".css" || ext === ".js"
          ? "no-cache, must-revalidate"
          : ext === ".mp3" || ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".svg" || ext === ".webp"
            ? "public, max-age=86400"
            : "no-cache, must-revalidate";
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": cache,
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") {
      addCors(res);
      res.writeHead(204);
      res.end();
      return;
    }
    if (
      req.method === "POST" &&
      (url.pathname === "/api/rsvp" || url.pathname === "/send-rsvp.php")
    ) {
      await handleRsvp(req, res);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "Internal server error" });
  }
});

const HOST = process.env.BIND_HOST || "0.0.0.0";
const portNum = Number(PORT) || 3000;
server.listen(portNum, HOST, () => {
  const hasTg = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  console.log(`Server listening on http://${HOST}:${portNum}`);
  console.log(hasTg ? "RSVP: .env с Telegram найден." : "RSVP: в .env нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID — форма не отправится.");
});
