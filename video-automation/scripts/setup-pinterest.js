#!/usr/bin/env node
/**
 * setup-pinterest.js — OAuth 2.0 flow для получения токена с pins:write
 *
 * Шаги:
 *  1. Добавь redirect URI в приложение:
 *     developers.pinterest.com/apps/1570789/ → URI перенаправления → http://localhost:8085/callback
 *  2. Запусти: node scripts/setup-pinterest.js <app_secret_key>
 *  3. Одобри доступ в браузере
 *  4. Скопируй токены в .env
 */

const http    = require("http");
const { exec } = require("child_process");
const path    = require("path");
const fs      = require("fs");

const CLIENT_ID     = "1570789";
const CLIENT_SECRET = process.argv[2];
const REDIRECT_URI  = "http://localhost:8085/callback";
const SCOPE         = "pins:read,pins:write,boards:read,boards:write,user_accounts:read";
const ENV_FILE      = path.join(__dirname, "../.env");

if (!CLIENT_SECRET) {
  console.log(`
📌 Pinterest OAuth Setup
════════════════════════

Шаг 1: Добавь redirect URI в приложение
  → developers.pinterest.com/apps/1570789/
  → Раздел "URI перенаправления" → Добавить:
    http://localhost:8085/callback

Шаг 2: Запусти с секретным ключом приложения:
  node scripts/setup-pinterest.js aa9ddd8ff11d4a803d22c82d3750b64e1a8d5e72
`);
  process.exit(0);
}

const authUrl = `https://www.pinterest.com/oauth/?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&state=skily_${Date.now()}`;

console.log("\n📌 Pinterest OAuth Setup");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("   Открываю браузер для авторизации...\n");

const server = http.createServer(async (req, res) => {
  try {
    const urlObj  = new URL(req.url, "http://localhost:8085");
    const code    = urlObj.searchParams.get("code");
    const error   = urlObj.searchParams.get("error");

    if (error) {
      res.end(`<h2>❌ Ошибка: ${error}</h2>`);
      console.error(`\n❌ OAuth error: ${error}`);
      server.close();
      return;
    }
    if (!code) {
      res.end("<h2>Жду код авторизации...</h2>");
      return;
    }

    res.end(`
      <html><body style="font-family:sans-serif;padding:40px">
      <h2>✅ Авторизация успешна!</h2>
      <p>Можешь закрыть эту вкладку и вернуться в терминал.</p>
      </body></html>
    `);
    server.close();

    // Обмениваем code на токен
    console.log("🔄 Получаю access token...");
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code:         code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("❌ Token exchange failed:", JSON.stringify(tokenData, null, 2));
      process.exit(1);
    }

    const accessToken   = tokenData.access_token;
    const refreshToken  = tokenData.refresh_token || "";
    const expiresIn     = tokenData.expires_in || 0;
    const expiresDate   = new Date(Date.now() + expiresIn * 1000).toISOString().slice(0, 10);

    console.log(`\n✅ Токен получен! Действителен до: ${expiresDate}`);

    // Загружаем доски
    const boardsRes = await fetch("https://api.pinterest.com/v5/boards?page_size=25", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const boardsData = await boardsRes.json();
    const boards = boardsData.items || [];

    if (boards.length === 0) {
      console.log("\n⚠️  Досок не найдено. Создай доски на Pinterest и повтори.");
      console.log("   → pinterest.com → Создать → Доска");
    } else {
      console.log("\n📋 Твои доски:\n");
      for (const b of boards) {
        console.log(`  ID:   ${b.id}`);
        console.log(`  Name: ${b.name}`);
        console.log();
      }
    }

    // Обновляем .env
    let envContent = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf-8") : "";
    const updates = {
      PINTEREST_ACCESS_TOKEN:  accessToken,
      PINTEREST_REFRESH_TOKEN: refreshToken,
      PINTEREST_CLIENT_ID:     CLIENT_ID,
      PINTEREST_CLIENT_SECRET: CLIENT_SECRET,
    };
    for (const [key, val] of Object.entries(updates)) {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(ENV_FILE, envContent);
    console.log("✅ Токены сохранены в .env");

    console.log("\n═══════════════════════════════════");
    console.log("📝 Осталось добавить board IDs в .env:\n");
    console.log(`PINTEREST_BOARD_ID_RU=<id доски для RU>`);
    console.log(`PINTEREST_BOARD_ID_ES=<id доски для ES>`);
    console.log("\nСкопируй нужные ID из списка выше.");

  } catch(e) {
    console.error("❌ Ошибка:", e.message);
    server.close();
    process.exit(1);
  }
});

server.listen(8085, () => {
  exec(`open "${authUrl}"`);
  console.log("   Браузер открыт — одобри доступ на странице Pinterest.");
  console.log("   Жду ответа...\n");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error("❌ Порт 8085 занят. Закрой другие процессы и повтори.");
  } else {
    console.error("❌ Server error:", e.message);
  }
  process.exit(1);
});
