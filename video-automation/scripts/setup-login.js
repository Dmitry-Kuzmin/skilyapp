#!/usr/bin/env node
/**
 * setup-login.js
 * Launches REAL Chrome (zero automation flags) with remote debugging.
 * You log in normally — Instagram/TikTok/YouTube see a genuine browser.
 * When you're done, Playwright quietly connects and saves the session.
 *
 * Usage:
 *   node scripts/setup-login.js es    ← setup Spanish accounts
 *   node scripts/setup-login.js ru    ← setup Expat accounts
 */

const { chromium } = require("playwright-core");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const lang = process.argv[2] || "es";
if (!["es", "ru"].includes(lang)) {
  console.error("Usage: node scripts/setup-login.js es|ru");
  process.exit(1);
}

const ROOT        = path.join(__dirname, "..");
const CHROME      = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE_DIR = path.join(ROOT, `chrome-login-${lang}`);
const AUTH_FILE   = path.join(ROOT, `auth-state-${lang}.json`);
const SIGNAL_FILE = "/tmp/skily-save-session.txt";
const DEBUG_PORT  = 9222;

fs.mkdirSync(PROFILE_DIR, { recursive: true });

function waitForSignal() {
  try { fs.unlinkSync(SIGNAL_FILE); } catch {}
  return new Promise(resolve => {
    const iv = setInterval(() => {
      if (fs.existsSync(SIGNAL_FILE)) {
        clearInterval(iv);
        try { fs.unlinkSync(SIGNAL_FILE); } catch {}
        resolve();
      }
    }, 1000);
  });
}

function waitForCDP(port, timeout = 15000) {
  const http = require("http");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`http://localhost:${port}/json/version`, res => {
        res.resume(); resolve();
      }).on("error", () => {
        if (Date.now() - start > timeout) return reject(new Error("CDP timeout"));
        setTimeout(check, 500);
      });
    };
    check();
  });
}

(async () => {
  console.log(`\n🔑 Setup login [${lang.toUpperCase()}] — открываю обычный Chrome`);
  console.log(`   Instagram, TikTok и YouTube не увидят автоматизацию.\n`);

  // Launch REAL Chrome — no Playwright flags, just remote debugging
  const chromeProc = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.tiktok.com/login",
    "https://studio.youtube.com",
    "https://www.instagram.com",
  ], { detached: false, stdio: "ignore" });

  // Wait for CDP to be available
  process.stdout.write("   Жду запуска Chrome...");
  await waitForCDP(DEBUG_PORT);
  console.log(" готов!\n");

  console.log("📋 Браузер открыт с тремя вкладками:");
  console.log("   Вкладка 1: TikTok     — войди в аккаунт");
  console.log("   Вкладка 2: YouTube    — войди в Google аккаунт");
  console.log("   Вкладка 3: Instagram  — войди в аккаунт");
  console.log(`\n⚠️  НЕ закрывай браузер! Когда войдёшь — скажи Claude "готово"\n`);
  console.log(`   (или вручную: touch /tmp/skily-save-session.txt)\n`);

  await waitForSignal();

  // Connect to running Chrome via CDP and grab session state
  console.log("💾 Подключаюсь к Chrome и сохраняю сессию...");
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const contexts = browser.contexts();
  const context  = contexts[0];

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  chromeProc.kill();

  const stat  = fs.statSync(AUTH_FILE);
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  const cookieCount = state.cookies?.length || 0;
  const domains = [...new Set(state.cookies.map(c => c.domain))].join(", ");

  console.log(`\n✅ Сессия сохранена:`);
  console.log(`   Файл:   ${AUTH_FILE}`);
  console.log(`   Куки:   ${cookieCount} шт.`);
  console.log(`   Размер: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`   Домены: ${domains}`);

  if (cookieCount < 20) {
    console.warn(`\n⚠️  Мало куков — возможно не все аккаунты залогинены. Повтори.`);
  } else {
    console.log(`\n🚀 Готово! Теперь auto-publish.js будет работать автоматически.`);
  }
})().catch(e => {
  console.error("❌ Ошибка:", e.message);
  process.exit(1);
});
