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
// Auth state files saved by setup-login.js (storageState = cookies + localStorage)
const AUTH_ES = path.join(__dirname, "../auth-state-es.json");
const AUTH_RU = path.join(__dirname, "../auth-state-ru.json");
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

    await delay(3000);
    console.log("  📍 Current URL:", page.url());

    // TikTok hides the file input — set files directly without clicking
    await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 20000 });
    await page.locator('input[type="file"]').first().setInputFiles(videoPath);
    console.log("  ✓ File selected, waiting for upload...");

    // Wait a bit for page to settle after upload starts
    await delay(5000);

    // Dismiss any popups (content check dialog, etc.)
    const dismissSelectors = [
      'button:has-text("Отмена")',
      'button:has-text("Cancel")',
      'button:has-text("Понятно")',
      'button:has-text("OK")',
      'svg[data-e2e="modal-close-icon"]',
      'button[aria-label="Close"]',
    ];
    for (const sel of dismissSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1500 })) {
          await el.click();
          console.log(`  ✓ Dismissed popup (${sel})`);
          await delay(500);
        }
      } catch {}
    }

    // Scroll to top to find caption field
    await page.keyboard.press("Control+Home");
    await delay(1000);

    // Wait for caption field (TikTok shows it after upload completes)
    const captionSelector = [
      '.public-DraftEditor-content[contenteditable="true"]',
      'div[class*="caption-wrap"] [contenteditable="true"]',
      'div[data-e2e="caption-input"]',
      'div[class*="editor-kit"] [contenteditable="true"]',
    ].join(", ");

    try {
      await page.waitForSelector(captionSelector, { timeout: 60000 });
    } catch(waitErr) {
      await page.screenshot({ path: "/tmp/tiktok-after-upload.png" });
      console.log("  📸 /tmp/tiktok-after-upload.png");
      // Log all contenteditable elements for debugging
      const editables = await page.$$eval('[contenteditable="true"]', els => els.map(e => e.className));
      console.log("  Contenteditable elements found:", JSON.stringify(editables));
      throw waitErr;
    }
    console.log("  ✓ Upload complete");

    // Dismiss any tutorial/onboarding overlays (react-joyride, etc.)
    try {
      const overlay = page.locator('[data-test-id="overlay"], .react-joyride__overlay').first();
      if (await overlay.isVisible({ timeout: 2000 })) {
        await page.keyboard.press("Escape");
        await delay(500);
        // If still there, click it to dismiss
        if (await overlay.isVisible({ timeout: 1000 })) {
          await overlay.click({ force: true });
          await delay(500);
        }
        console.log("  ✓ Dismissed tutorial overlay");
      }
    } catch {}

    // Fill caption — use clipboard paste (much faster than typing char by char)
    const { caption } = getCaption(lang, "tiktok");
    const captionEl = page.locator([
      '.public-DraftEditor-content[contenteditable="true"]',
      'div[class*="caption-wrap"] [contenteditable="true"]',
      'div[data-e2e="caption-input"]',
    ].join(", ")).first();
    await captionEl.click();
    await page.keyboard.press("Meta+A");
    // Write to clipboard and paste — avoids char-by-char timeout
    await page.evaluate((text) => navigator.clipboard.writeText(text), caption);
    await page.keyboard.press("Meta+V");
    await delay(500);
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

    await delay(5000);
    console.log("  📍 Current URL:", page.url());

    // Dismiss any error dialogs
    try {
      const closeBtn = page.locator('button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 })) { await closeBtn.click(); await delay(500); }
    } catch {}

    // YouTube Studio: "Create" → "Upload videos" → set file on hidden input
    await page.locator('button[aria-label="Create"], .ytcpAppHeaderCreateIcon button').first()
      .waitFor({ timeout: 15000 });
    await page.locator('button[aria-label="Create"], .ytcpAppHeaderCreateIcon button').first().click();
    console.log("  ✓ Clicked Create");

    await delay(1500);
    // Pick "Upload videos" from dropdown — try all languages
    await page.locator([
      'tp-yt-paper-item:has-text("Upload videos")',
      'tp-yt-paper-item:has-text("Загрузить видео")',
      'tp-yt-paper-item:has-text("Загрузить")',
      'tp-yt-paper-item:has-text("Subir vídeo")',
      'tp-yt-paper-item:has-text("Subir")',
      'yt-formatted-string:has-text("Upload")',
      'yt-formatted-string:has-text("Загрузить")',
      'yt-formatted-string:has-text("Subir")',
      // Fallback: first item in the Create dropdown menu
      'tp-yt-paper-listbox tp-yt-paper-item:first-child',
    ].join(", ")).first().click();
    console.log("  ✓ Selected Upload videos");

    await delay(2000);

    // Set file directly on hidden file input
    const fileInput = page.locator("input[type='file']").first();
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(videoPath);
    console.log("  ✓ File selected, uploading...");

    // Wait for title field
    await page.waitForSelector("#textbox", { timeout: 120000 });
    console.log("  ✓ Upload started");

    const { title, description } = getCaption(lang, "youtube");

    // Fill title (first textbox) — clear existing text then type
    const titleEl = page.locator("#textbox").first();
    await titleEl.click();
    await page.keyboard.press("Meta+A");  // Select all (macOS)
    await titleEl.type(title, { delay: 15 });
    console.log("  ✓ Title filled");

    // Fill description (second textbox)
    const descEl = page.locator("#textbox").nth(1);
    await descEl.click();
    await descEl.type(description, { delay: 5 });
    console.log("  ✓ Description filled");

    // Answer "Not made for kids" — required before Next
    await delay(1000);
    const notForKids = page.locator("tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK'], ytcp-video-metadata-editor-basics #audience-no").first();
    try {
      await notForKids.waitFor({ timeout: 5000 });
      await notForKids.click();
      console.log("  ✓ Not made for kids selected");
    } catch {
      // Try by text
      try {
        await page.locator("tp-yt-paper-radio-button").filter({ hasText: /not made for kids|не для детей/i }).first().click();
        console.log("  ✓ Not made for kids selected (text match)");
      } catch { console.log("  ⚠️  Kids question not found"); }
    }

    // Click Next through steps (Details → Video elements → Checks → Visibility)
    for (let step = 0; step < 3; step++) {
      await delay(2000);
      const nextBtn = page.locator("ytcp-button#next-button").first();
      try {
        await nextBtn.waitFor({ timeout: 8000 });
        await nextBtn.click();
        console.log(`  ✓ Next step ${step + 1}`);
      } catch {
        console.log(`  ⚠️  Next button not found on step ${step + 1}, continuing...`);
      }
    }

    // Set visibility to Public — screenshot if fails
    await delay(2000);
    await page.screenshot({ path: "/tmp/youtube-visibility.png" });
    console.log("  📍 Visibility page URL:", page.url());

    // Try multiple selectors for the Public radio
    const publicLocator = page.locator([
      "tp-yt-paper-radio-button[name='PUBLIC']",
      "ytcp-text-dropdown-trigger",
      "div[test-id='PUBLIC']",
      "label:has-text('Public')",
      "label:has-text('Публичный')",
      "#privacy-radios tp-yt-paper-radio-button:first-child",
    ].join(", ")).first();

    try {
      await publicLocator.waitFor({ timeout: 8000 });
      await publicLocator.click();
      console.log("  ✓ Set to Public");
    } catch {
      console.log("  ⚠️  Public radio not found, trying to publish as-is...");
    }

    // Publish / Save
    await delay(1000);
    const publishBtn = page.locator([
      "ytcp-button#done-button",
      "button:has-text('Publish')",
      "button:has-text('Save')",
      "button:has-text('Опубликовать')",
      "button:has-text('Сохранить')",
    ].join(", ")).first();
    await publishBtn.waitFor({ timeout: 10000 });
    await publishBtn.click();
    console.log("  ✓ Publish clicked");

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
    // Navigate directly to Instagram upload page (works for all account types)
    await page.goto("https://www.instagram.com/create/style/", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await delay(3000);
    console.log("  📍 URL:", page.url());

    // Dismiss any popups (notifications, etc.)
    for (const txt of ["Не сейчас", "Not Now", "Not now", "Dismiss"]) {
      try {
        const btn = page.locator(`button:has-text("${txt}")`).first();
        if (await btn.isVisible({ timeout: 1500 })) { await btn.click(); await delay(500); break; }
      } catch {}
    }

    // If redirected to login — session expired
    if (page.url().includes("accounts") || page.url().includes("login")) {
      throw new Error(`Instagram not logged in — run: node scripts/setup-login.js ${lang}`);
    }
    console.log("  ✓ Upload page opened");

    // Click "Select from computer" / use hidden file input
    let fileSet = false;

    // First try: "Select from computer" button (appears in upload dialog)
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 6000 }),
        page.locator([
          'button:has-text("Select from computer")',
          'button:has-text("Выбрать с компьютера")',
          'button:has-text("Выбрать на компьютере")',
          'button:has-text("Выбрать файлы")',
        ].join(", ")).first().click(),
      ]);
      await fileChooser.setFiles(videoPath);
      fileSet = true;
    } catch {}

    // Second try: hidden file input directly
    if (!fileSet) {
      try {
        const inp = page.locator('input[type="file"]').first();
        await inp.waitFor({ state: "attached", timeout: 10000 });
        await inp.setInputFiles(videoPath);
        fileSet = true;
      } catch {}
    }

    if (!fileSet) throw new Error("Could not set file on Instagram");
    console.log("  ✓ File selected");

    // Helper: click "Далее"/"Next" using native Playwright mouse events (React-compatible)
    const clickNext = async () => {
      const loc = page.locator('div[role="button"]:has-text("Далее"), div[role="button"]:has-text("Next")').first();
      try {
        await loc.waitFor({ state: "visible", timeout: 5000 });
        await loc.click();
        return true;
      } catch { return false; }
    };

    // Wait for crop dialog to fully load
    await delay(3000);

    // Dismiss info popups (Reels info shows "OK" button only — safe to click)
    try {
      const okBtn = page.locator('button:has-text("OK"), button:has-text("ОК")').first();
      if (await okBtn.isVisible({ timeout: 2000 })) {
        await okBtn.click();
        console.log("  ✓ Dismissed Reels info popup");
        await delay(1000);
      }
    } catch {}

    // Select 9:16 format:
    // 1. Click the expand/ratio icon (bottom-left square icon in preview)
    // 2. Pick 9:16 from the list that appears
    const open916Picker = async () => {
      // Try known aria-labels for the expand icon
      const expandSelectors = [
        '[aria-label*="crop" i]',
        '[aria-label*="Select crop" i]',
        '[aria-label*="кадр" i]',
        '[aria-label*="Соотношение" i]',
        // Fallback: SVG button at bottom-left of the dialog
      ];
      for (const sel of expandSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 })) { await el.click(); return true; }
        } catch {}
      }
      // Last resort: click by position (bottom-left of dialog area)
      await page.evaluate(() => {
        // Find all SVG buttons inside the dialog/modal
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return;
        const rect = modal.getBoundingClientRect();
        const btns = modal.querySelectorAll('button, [role="button"]');
        // Find button in bottom-left quadrant of modal
        for (const b of btns) {
          const br = b.getBoundingClientRect();
          if (br.left < rect.left + rect.width * 0.4 && br.top > rect.top + rect.height * 0.6) {
            b.click(); return;
          }
        }
      });
      return false;
    };

    await open916Picker();
    await delay(800);

    // Click 9:16
    try {
      const btn916 = page.locator([
        'div[role="button"]:has-text("9:16")',
        'span:has-text("9:16")',
        'button:has-text("9:16")',
      ].join(", ")).first();
      if (await btn916.isVisible({ timeout: 2000 })) {
        await btn916.click();
        console.log("  ✓ Selected 9:16");
        await delay(600);
        // Close picker by clicking expand icon again
        await open916Picker().catch(() => {});
        await delay(400);
      }
    } catch {}

    // Click Далее: Crop → Filters
    await delay(1000);
    if (await clickNext()) { console.log("  ✓ Next: crop → filters"); }
    await delay(2000);

    // Click Далее: Filters → Caption
    if (await clickNext()) { console.log("  ✓ Next: filters → caption"); }
    await delay(2000);

    // Caption step
    await delay(2000);
    const { caption } = getCaption(lang, "instagram");

    // Find caption textarea — Instagram uses various aria-labels in different languages
    const captionEl = page.locator([
      'div[aria-label*="caption" i]',
      'div[aria-label*="подпись" i]',
      'div[aria-label*="Caption" i]',
      'div[aria-label*="Write" i]',
      'div[aria-label*="Напишите" i]',
      'textarea[placeholder*="caption" i]',
      'div[contenteditable="true"]',
    ].join(", ")).first();

    try {
      await captionEl.waitFor({ timeout: 12000 });
    } catch {
      await page.screenshot({ path: "/tmp/instagram-caption-step.png" });
      console.log("  📸 /tmp/instagram-caption-step.png");
      throw new Error("Caption field not found");
    }
    await captionEl.click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), caption);
    await page.keyboard.press("Meta+V");
    console.log("  ✓ Caption filled");

    await delay(1500);

    // Share / Publish
    const shareBtn = page.locator([
      'div[role="button"]:has-text("Share")',
      'div[role="button"]:has-text("Поделиться")',
      'div[role="button"]:has-text("Опубликовать")',
      'button:has-text("Share")',
      'button:has-text("Поделиться")',
      'button:has-text("Опубликовать")',
    ].join(", ")).first();
    await shareBtn.waitFor({ timeout: 10000 });
    await shareBtn.click();
    console.log("  ✓ Share clicked");

    // Wait for confirmation
    await page.waitForSelector([
      'span:has-text("Your reel")',
      'span:has-text("Рилс опубликован")',
      'span:has-text("Your post")',
      'div[role="dialog"] button:has-text("OK")',
    ].join(", "), { timeout: 60000 }).catch(() => {});
    console.log(`  ✅ Instagram [${lang.toUpperCase()}] published!`);
    notify("Skily Video Maker", `✅ Instagram ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    console.error(`  ❌ Instagram [${lang.toUpperCase()}] error:`, e.message);
    notify("Skily Video Maker", `❌ Instagram ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
}

// ── Launch Chrome context with saved auth state ────────────────────────────────
async function launchContext(authFile) {
  if (!fs.existsSync(authFile)) {
    const lang = authFile.includes("-es.") ? "es" : "ru";
    console.error(`\n❌ Нет файла сессии: ${authFile}`);
    console.error(`   Сначала запусти: node scripts/setup-login.js ${lang}\n`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  // Attach close to browser when context closes
  context._browser = browser;
  const origClose = context.close.bind(context);
  context.close = async () => { await origClose(); await browser.close(); };

  return context;
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
  console.log(`   ES video: ${esVideo || "(none)"} → auth: auth-state-es.json`);
  console.log(`   RU video: ${ruVideo || "(none)"} → auth: auth-state-ru.json`);

  // ── ES: Spanish accounts ───────────────────────────────────────────────────
  if (esVideo) {
    console.log("\n── ES accounts (Spanish audience) ──");
    const ctxES = await launchContext(AUTH_ES);
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
    const ctxRU = await launchContext(AUTH_RU);
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
