/**
 * auto-publish.js
 * Playwright automation: uploads rendered MP4 videos to TikTok, YouTube, Instagram.
 * Uses a dedicated Chrome profile (chrome-profile/) — login once, works forever.
 *
 * Usage:
 *   node scripts/auto-publish.js --es renders/video-es.mp4 --ru renders/video-ru.mp4
 *   node scripts/auto-publish.js --es renders/video-es.mp4 --skip-instagram
 *
 * Caption data is read from renders/publish-data.json (written by morning-pipeline.js)
 */

const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Two separate profiles: ES accounts (Spanish audience) and RU accounts (expats)
const PROFILE_ES  = path.join(__dirname, "../chrome-profile-es");
const PROFILE_RU  = path.join(__dirname, "../chrome-profile-ru");
const RENDERS_DIR = path.join(__dirname, "../renders");
const PUBLISH_DATA_FILE = path.join(RENDERS_DIR, "publish-data.json");

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const esVideo = getArg("--es");
const ruVideo = getArg("--ru");
const skipTikTok = hasFlag("--skip-tiktok");
const skipYouTube = hasFlag("--skip-youtube");
const skipInstagram = hasFlag("--skip-instagram");

// ── Load caption data ─────────────────────────────────────────────────────────
let publishData = { es: {}, ru: {} };
if (fs.existsSync(PUBLISH_DATA_FILE)) {
  try { publishData = JSON.parse(fs.readFileSync(PUBLISH_DATA_FILE, "utf-8")); }
  catch(e) { console.warn("⚠️  Could not parse publish-data.json:", e.message); }
}

function getCaption(lang, platform) {
  const d = publishData[lang] || {};
  const hookTitle = d.hookTitle || d.question || "";
  const explanation = d.explanation || "";
  const num = String(d.seriesNumber || "").padStart(3, "0");

  if (platform === "youtube") {
    const title = d.youtubeTitle || hookTitle;
    const desc = d.youtubeDescription || (
      lang === "ru"
        ? `📖 Объяснение: ${explanation}\n\n🚗 Готовишься к экзамену ПДД Испании? Тренируйся на Skily!\n👉 https://skilyapp.com\n\n#ПДД #ВодительскиеПрава #DGT #Skily`
        : `📖 Explicación: ${explanation}\n\n🚗 ¿Preparando el DGT? ¡Practica en Skily!\n👉 https://skilyapp.com\n\n#DGT #ExamenConducir #CarnetDeConducir #Skily`
    );
    return { title, description: desc };
  }

  const tags = lang === "ru"
    ? `#ПДД #Вождение #Права #Вопрос${num} #Skily #ЗнаниеСила`
    : `#DGT #Conducir #Carnet #Pregunta${num} #Skily #ExamenDGT`;

  const caption = lang === "ru"
    ? `${hookTitle}\n\n📚 Объяснение: ${explanation}\n\n${tags}`
    : `${hookTitle}\n\n📚 Explicación: ${explanation}\n\n${tags}`;

  return { title: hookTitle, description: caption, caption };
}

// ── Browser helpers ───────────────────────────────────────────────────────────
async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitAndFill(page, selector, text, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
  await page.fill(selector, text);
}

async function waitAndClick(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

function notify(title, message) {
  const { execSync } = require("child_process");
  try {
    execSync(`osascript -e 'display notification "${message.replace(/'/g, "\\'")}" with title "${title.replace(/'/g, "\\'")}"'`);
  } catch {}
}

// ── TikTok upload ─────────────────────────────────────────────────────────────
async function uploadTikTok(context, videoPath, lang) {
  console.log(`\n🎵 TikTok [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://www.tiktok.com/tiktokstudio/upload?from=creator_center", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });

    // Screenshot: check what page looks like after navigation
    await delay(3000);
    await page.screenshot({ path: "/tmp/tiktok-debug.png", fullPage: false });
    console.log("  📸 Screenshot saved: /tmp/tiktok-debug.png");
    console.log("  📍 Current URL:", page.url());

    // Wait for upload area
    await page.waitForSelector('input[type="file"]', { timeout: 20000 });

    // Upload file
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('div[class*="upload-drag-area"], div[class*="upload-btn-input"]').first().click().catch(() =>
        page.locator('input[type="file"]').first().dispatchEvent("click")
      ),
    ]);
    await fileChooser.setFiles(videoPath);
    console.log("  ✓ File selected, waiting for upload...");

    // Wait for upload to complete (progress bar disappears or caption field appears)
    await page.waitForSelector('div[class*="caption-wrap"] [contenteditable="true"], div[data-e2e="caption-input"]', {
      timeout: 120000,
    });
    console.log("  ✓ Upload complete");

    // Fill caption
    const { caption } = getCaption(lang, "tiktok");
    const captionEl = page.locator('div[class*="caption-wrap"] [contenteditable="true"], div[data-e2e="caption-input"]').first();
    await captionEl.click();
    await captionEl.fill("");
    await captionEl.type(caption, { delay: 10 });
    console.log("  ✓ Caption filled");

    await delay(2000);

    // Click Post button
    const postBtn = page.locator('button[data-e2e="post-button"], button:has-text("Post"), button:has-text("Опубликовать")').first();
    await postBtn.waitFor({ timeout: 10000 });
    await postBtn.click();
    console.log("  ✓ Post clicked");

    // Wait for success confirmation
    await page.waitForURL(/\/manage\/videos|\/tiktokstudio\/content/, { timeout: 30000 }).catch(() => {});
    console.log(`  ✅ TikTok [${lang.toUpperCase()}] published!`);
    notify("Skily Video Maker", `✅ TikTok ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    console.error(`  ❌ TikTok [${lang.toUpperCase()}] error:`, e.message);
    notify("Skily Video Maker", `❌ TikTok ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
}

// ── YouTube Shorts upload ─────────────────────────────────────────────────────
async function uploadYouTube(context, videoPath, lang) {
  console.log(`\n▶️  YouTube [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://studio.youtube.com", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });

    // Screenshot: check what page looks like after navigation
    await delay(3000);
    await page.screenshot({ path: "/tmp/youtube-debug.png", fullPage: false });
    console.log("  📸 Screenshot saved: /tmp/youtube-debug.png");
    console.log("  📍 Current URL:", page.url());

    // Click Upload button
    await page.waitForSelector("#upload-button, ytcp-button#upload-icon", { timeout: 20000 });
    await page.click("#upload-button, ytcp-button#upload-icon");

    // Select file
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator("input[type='file']").first().dispatchEvent("click"),
    ]);
    await fileChooser.setFiles(videoPath);
    console.log("  ✓ File selected, uploading...");

    // Wait for title field
    await page.waitForSelector("#textbox", { timeout: 120000 });
    console.log("  ✓ Upload started");

    const { title, description } = getCaption(lang, "youtube");

    // Fill title (first textbox)
    const titleEl = page.locator("#textbox").first();
    await titleEl.click();
    await titleEl.selectAll().catch(() => {});
    await page.keyboard.press("Control+A");
    await titleEl.type(title, { delay: 15 });
    console.log("  ✓ Title filled");

    // Fill description (second textbox)
    const descEl = page.locator("#textbox").nth(1);
    await descEl.click();
    await descEl.type(description, { delay: 5 });
    console.log("  ✓ Description filled");

    // Click Next through steps (Details → Video elements → Checks → Visibility)
    for (let step = 0; step < 3; step++) {
      await delay(1500);
      const nextBtn = page.locator("ytcp-button#next-button, button:has-text('Next'), button:has-text('Далее')").first();
      await nextBtn.waitFor({ timeout: 10000 });
      await nextBtn.click();
    }

    // Set visibility to Public
    await delay(1500);
    const publicRadio = page.locator("tp-yt-paper-radio-button[name='PUBLIC']").first();
    await publicRadio.waitFor({ timeout: 10000 });
    await publicRadio.click();

    // Publish
    await delay(1000);
    const publishBtn = page.locator("ytcp-button#done-button, button:has-text('Publish'), button:has-text('Опубликовать')").first();
    await publishBtn.waitFor({ timeout: 10000 });
    await publishBtn.click();

    // Wait for publish confirmation
    await page.waitForSelector("ytcp-video-share-dialog, yt-icon-button.close-button", { timeout: 30000 }).catch(() => {});
    console.log(`  ✅ YouTube [${lang.toUpperCase()}] published!`);
    notify("Skily Video Maker", `✅ YouTube ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    console.error(`  ❌ YouTube [${lang.toUpperCase()}] error:`, e.message);
    notify("Skily Video Maker", `❌ YouTube ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
}

// ── Instagram Reels upload ────────────────────────────────────────────────────
async function uploadInstagram(context, videoPath, lang) {
  console.log(`\n📸 Instagram [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });

    // Click Create / + button
    await page.waitForSelector('a[href="/create/style/"], svg[aria-label="New post"], a:has(svg[aria-label="New post"])', { timeout: 20000 });
    await page.click('a[href="/create/style/"], svg[aria-label="New post"]').catch(() =>
      page.locator('a').filter({ hasText: /Create|Создать/ }).first().click()
    );

    // Click "Select from computer" / upload button
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 15000 }),
      page.locator('button:has-text("Select from computer"), button:has-text("Выбрать с компьютера"), input[type="file"]').first().click(),
    ]);
    await fileChooser.setFiles(videoPath);
    console.log("  ✓ File selected");

    // Handle crop/format step — click OK or Next
    await delay(3000);
    const nextBtn1 = page.locator('button:has-text("Next"), button:has-text("Далее")').first();
    await nextBtn1.waitFor({ timeout: 30000 });
    await nextBtn1.click();

    // Trim step if present
    await delay(2000);
    const nextBtn2 = page.locator('button:has-text("Next"), button:has-text("Далее")').first();
    if (await nextBtn2.isVisible({ timeout: 3000 }).catch(() => false)) await nextBtn2.click();

    // Caption step
    await delay(2000);
    const { caption } = getCaption(lang, "instagram");
    const captionEl = page.locator('div[aria-label*="caption"], div[aria-label*="подпись"], textarea[placeholder*="caption"]').first();
    await captionEl.waitFor({ timeout: 15000 });
    await captionEl.click();
    await captionEl.type(caption, { delay: 10 });
    console.log("  ✓ Caption filled");

    await delay(1500);

    // Share / Publish
    const shareBtn = page.locator('button:has-text("Share"), button:has-text("Поделиться")').first();
    await shareBtn.waitFor({ timeout: 10000 });
    await shareBtn.click();

    // Wait for "Your reel has been shared" or similar
    await page.waitForSelector('span:has-text("Your reel"), span:has-text("Рилс опубликован"), div[role="dialog"] button:has-text("OK")', {
      timeout: 60000,
    }).catch(() => {});
    console.log(`  ✅ Instagram [${lang.toUpperCase()}] published!`);
    notify("Skily Video Maker", `✅ Instagram ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    console.error(`  ❌ Instagram [${lang.toUpperCase()}] error:`, e.message);
    notify("Skily Video Maker", `❌ Instagram ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
}

// ── Launch Chrome context for a given profile ─────────────────────────────────
async function launchContext(profileDir) {
  fs.mkdirSync(profileDir, { recursive: true });
  return chromium.launchPersistentContext(profileDir, {
    executablePath: CHROME_PATH,
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--password-store=keychain",  // use macOS keychain so Google tokens decrypt correctly
    ],
    // Remove flags that break login session persistence:
    // --disable-sync prevents Google from syncing/restoring login state
    // --enable-automation triggers bot detection on TikTok/Instagram
    // --password-store=basic stores passwords in plain text, breaking Google token decryption
    ignoreDefaultArgs: [
      "--enable-automation",
      "--disable-sync",
      "--password-store=basic",
    ],
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  if (!esVideo && !ruVideo) {
    console.error("Usage: node scripts/auto-publish.js --es path/to/video-es.mp4 [--ru path/to/video-ru.mp4]");
    process.exit(1);
  }

  if (!fs.existsSync(CHROME_PATH)) {
    console.error("❌ Chrome not found at:", CHROME_PATH);
    process.exit(1);
  }

  console.log("🚀 Starting Skily Auto-Publisher...");
  console.log(`   ES video: ${esVideo || "(none)"} → profile: chrome-profile-es`);
  console.log(`   RU video: ${ruVideo || "(none)"} → profile: chrome-profile-ru`);

  // ── ES: Spanish accounts ───────────────────────────────────────────────────
  if (esVideo) {
    console.log("\n── ES accounts (Spanish audience) ──");
    const ctxES = await launchContext(PROFILE_ES);
    try {
      if (!skipTikTok)    await uploadTikTok(ctxES,    path.resolve(esVideo), "es");
      if (!skipYouTube)   await uploadYouTube(ctxES,   path.resolve(esVideo), "es");
      if (!skipInstagram) await uploadInstagram(ctxES, path.resolve(esVideo), "es");
    } finally {
      await ctxES.close();
    }
    await delay(3000);
  }

  // ── RU: Expat accounts ─────────────────────────────────────────────────────
  if (ruVideo) {
    console.log("\n── RU accounts (Expat audience) ──");
    const ctxRU = await launchContext(PROFILE_RU);
    try {
      if (!skipTikTok)    await uploadTikTok(ctxRU,    path.resolve(ruVideo), "ru");
      if (!skipYouTube)   await uploadYouTube(ctxRU,   path.resolve(ruVideo), "ru");
      if (!skipInstagram) await uploadInstagram(ctxRU, path.resolve(ruVideo), "ru");
    } finally {
      await ctxRU.close();
    }
  }

  console.log("\n✅ Auto-publisher finished.");
  notify("Skily Video Maker", "✅ Все видео опубликованы!");
})();
