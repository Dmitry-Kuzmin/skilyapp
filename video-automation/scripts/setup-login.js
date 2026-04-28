#!/usr/bin/env node
/**
 * setup-login.js
 * Opens Chrome with the Skily automation profile so you can log in manually.
 * Run this ONCE per profile to save sessions. After login, close Chrome — done.
 *
 * Usage:
 *   node scripts/setup-login.js es    ← opens chrome-profile-es/ (Spanish accounts)
 *   node scripts/setup-login.js ru    ← opens chrome-profile-ru/ (Expat accounts)
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const lang = process.argv[2] || "es";
if (!["es", "ru"].includes(lang)) {
  console.error("Usage: node scripts/setup-login.js es|ru");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const profileDir = path.join(ROOT, `chrome-profile-${lang}`);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(profileDir, { recursive: true });

console.log(`\n🔑 Открываю Chrome с профилем: chrome-profile-${lang}/`);
console.log(`\n📋 Что нужно сделать в открытом браузере:`);
console.log(`   1. Перейди на https://www.tiktok.com/login — войди в аккаунт`);
console.log(`   2. Перейди на https://studio.youtube.com — войди в Google аккаунт`);
console.log(`   3. Перейди на https://www.instagram.com — войди в аккаунт`);
console.log(`   4. Закрой Chrome (⌘Q) — сессии сохранятся`);
console.log(`\n⚠️  После входа ЗАКРОЙ Chrome — только тогда сессия сохранится на диск.\n`);

const proc = spawn(CHROME, [
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  // Open all three sites at once in separate tabs
  "https://www.tiktok.com/login",
  "https://studio.youtube.com",
  "https://www.instagram.com",
], {
  detached: true,
  stdio: "ignore",
});

proc.unref();

console.log(`✅ Chrome открыт. Войди в аккаунты и закрой браузер.`);
console.log(`   Потом запусти: node scripts/auto-publish.js --es renders/your-video-es.mp4\n`);
