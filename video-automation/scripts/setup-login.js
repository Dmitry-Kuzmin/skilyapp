#!/usr/bin/env node
/**
 * setup-login.js
 * Opens browser via Playwright so you can log in manually.
 * After login, saves session to auth-state-es.json / auth-state-ru.json.
 * Run this ONCE per profile. After that auto-publish.js works automatically.
 *
 * Usage:
 *   node scripts/setup-login.js es    ← setup Spanish accounts
 *   node scripts/setup-login.js ru    ← setup Expat accounts
 */

const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const lang = process.argv[2] || "es";
if (!["es", "ru"].includes(lang)) {
  console.error("Usage: node scripts/setup-login.js es|ru");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AUTH_FILE = path.join(ROOT, `auth-state-${lang}.json`);

async function waitForSignal() {
  const SIGNAL_FILE = "/tmp/skily-save-session.txt";
  // Clean up any old signal
  try { fs.unlinkSync(SIGNAL_FILE); } catch {}
  console.log(`\n   Когда залогинишься — запусти в терминале:`);
  console.log(`   touch /tmp/skily-save-session.txt\n`);
  // Poll for signal file
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

(async () => {
  console.log(`\n🔑 Setup login для профиля [${lang.toUpperCase()}]`);
  console.log(`   Откроется браузер. Войди во все аккаунты, потом нажми Enter здесь.\n`);

  const context = await chromium.launchPersistentContext("", {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
    ignoreDefaultArgs: [
      "--enable-automation",
      "--disable-sync",
      "--password-store=basic",
      "--use-mock-keychain",
    ],
  });

  // Open all three sites in separate tabs
  const pages = [
    "https://www.tiktok.com/login",
    "https://studio.youtube.com",
    "https://www.instagram.com",
  ];

  const page1 = await context.newPage();
  await page1.goto(pages[0]);

  const page2 = await context.newPage();
  await page2.goto(pages[1]);

  const page3 = await context.newPage();
  await page3.goto(pages[2]);

  console.log("📋 Браузер открыт с тремя вкладками:");
  console.log("   Вкладка 1: TikTok — войди в аккаунт");
  console.log("   Вкладка 2: YouTube Studio — войди в Google аккаунт");
  console.log("   Вкладка 3: Instagram — войди в аккаунт");
  console.log("\n⚠️  НЕ закрывай браузер! После входа во все аккаунты — нажми Enter тут:\n");

  await waitForEnter("   Нажми Enter когда залогинишься во все аккаунты → ");

  // Save session state
  console.log("\n💾 Сохраняю сессию...");
  await context.storageState({ path: AUTH_FILE });
  await context.close();

  const stat = fs.statSync(AUTH_FILE);
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
  const cookieCount = state.cookies?.length || 0;

  console.log(`\n✅ Готово! Сессия сохранена:`);
  console.log(`   Файл: ${AUTH_FILE}`);
  console.log(`   Куки: ${cookieCount} шт.`);
  console.log(`   Размер: ${(stat.size / 1024).toFixed(1)} KB`);

  if (cookieCount < 10) {
    console.warn(`\n⚠️  Мало куков (${cookieCount}). Возможно не все аккаунты залогинены.`);
    console.warn(`   Запусти снова и убедись что вошёл на все 3 сайта.`);
  } else {
    console.log(`\n🚀 Теперь можно запускать:`);
    console.log(`   node scripts/auto-publish.js --es renders/video-es.mp4`);
  }
})().catch(e => {
  console.error("❌ Ошибка:", e.message);
  process.exit(1);
});
