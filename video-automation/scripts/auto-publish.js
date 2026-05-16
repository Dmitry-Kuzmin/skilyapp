/**
 * auto-publish.js
 * Playwright automation: uploads rendered MP4 videos to TikTok, YouTube, Instagram, Facebook.
 * Uses a dedicated Chrome profile (chrome-profile/) — login once, works forever.
 *
 * Usage:
 *   node scripts/auto-publish.js --es renders/video-es.mp4 --ru renders/video-ru.mp4
 *   node scripts/auto-publish.js --es renders/video-es.mp4 --skip-instagram
 *
 * Caption data is read from renders/publish-data.json (written by morning-pipeline.js)
 * Facebook auth: run `node scripts/setup-login.js fb` once to save session.
 * Facebook pages: add FB_PAGE_NAME_ES and FB_PAGE_NAME_RU to .env (page URL slugs).
 */

const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Auth state files saved by setup-login.js (storageState = cookies + localStorage)
const AUTH_ES = path.join(__dirname, "../auth-state-es.json");
const AUTH_RU = path.join(__dirname, "../auth-state-ru.json");
const AUTH_FB = path.join(__dirname, "../auth-state-fb.json"); // Facebook — один аккаунт для обеих страниц
const RENDERS_DIR = path.join(__dirname, "../renders");
const PUBLISH_DATA_FILE = path.join(RENDERS_DIR, "publish-data.json");
const LOG_FILE = path.join(__dirname, "../auto-publish.log");

function plog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch {}
}

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const esVideo = getArg("--es");
const ruVideo = getArg("--ru");
const skipTikTok    = hasFlag("--skip-tiktok");
const skipYouTube   = hasFlag("--skip-youtube");
const skipInstagram = hasFlag("--skip-instagram");
const skipFacebook  = hasFlag("--skip-facebook");
const skipPinterest = hasFlag("--skip-pinterest");

// ── Load .env ─────────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, "..");
try {
  fs.readFileSync(path.join(ROOT_DIR, ".env"), "utf-8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch {}

// ── Load caption data ─────────────────────────────────────────────────────────
let publishData = { es: {}, ru: {} };
if (fs.existsSync(PUBLISH_DATA_FILE)) {
  try { publishData = JSON.parse(fs.readFileSync(PUBLISH_DATA_FILE, "utf-8")); }
  catch(e) { plog("⚠️  Could not parse publish-data.json:", e.message); }
}

function cleanMarkdown(text) {
  return (text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/�+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getCaption(lang, platform) {
  const d = publishData[lang] || {};
  const hookTitle = cleanMarkdown(d.hookTitle || d.question || "");
  const explanation = cleanMarkdown(d.explanation || "");
  const num = String(d.seriesNumber || "").padStart(3, "0");

  if (platform === "pinterest") {
    // Pinterest: title (≤100 chars) + description (≤500 chars) + link
    const pinTags = lang === "ru"
      ? `#ПДДИспании #DGT #РусскиевИспании #Skily #ВодительскиеПрава`
      : `#DGT #ExamenDGT #CarnetDeConducir #Skily #AutoescuelaEspaña`;
    const pinCta = lang === "ru"
      ? `📌 Сохрани — пригодится перед экзаменом!\n👉 Тренируйся бесплатно: skilyapp.com`
      : `📌 ¡Guárdalo para el examen!\n👉 Practica gratis: skilyapp.com`;
    return {
      title:       hookTitle.slice(0, 100),
      description: `${hookTitle}\n\n${pinCta}\n\n${pinTags}`.slice(0, 500),
    };
  }

  if (platform === "facebook") {
    // Facebook Reels: same caption style as TikTok, shorter hashtags
    const fbTags = lang === "ru"
      ? `#ПДДИспании #DGT #РусскиевИспании #Skily`
      : `#DGT #ExamenDGT #CarnetDeConducir #Skily`;
    const commentCta = lang === "ru"
      ? `✍️ Напиши: 1 — знал, 0 — не знал 👇\n💾 Сохрани — пригодится перед экзаменом`
      : `✍️ Escribe: 1 — lo sabías, 0 — fallaste 👇\n💾 Guárdalo — te ayudará en el examen`;
    return {
      title:       hookTitle,
      description: `${hookTitle}\n\n${commentCta}\n\n${fbTags}`,
    };
  }

  if (platform === "youtube") {
    const title = d.youtubeTitle || hookTitle;
    const desc = d.youtubeDescription || (
      lang === "ru"
        ? `📖 Объяснение: ${explanation}\n\n🚗 Готовишься к экзамену ПДД Испании? Тренируйся на Skily!\n👉 https://skilyapp.com\n\n#ПДД #ВодительскиеПрава #DGT #Skily\n\nMusic: Impact Moderato by Kevin MacLeod (incompetech.com) — Licensed under CC BY 3.0: http://creativecommons.org/licenses/by/3.0/`
        : `📖 Explicación: ${explanation}\n\n🚗 ¿Preparando el DGT? ¡Practica en Skily!\n👉 https://skilyapp.com\n\n#DGT #ExamenConducir #CarnetDeConducir #Skily\n\nMusic: Impact Moderato by Kevin MacLeod (incompetech.com) — Licensed under CC BY 3.0: http://creativecommons.org/licenses/by/3.0/`
    );
    return { title, description: desc };
  }

  const tags = lang === "ru"
    ? `#ПДДИспании #ИспанскиеПрава #DGT #РусскиевИспании #ЖизньвИспании #Skily #ЭкзаменDGT #ВодительскиеПрава`
    : `#DGT #ExamenDGT #CarnetDeConducir #Autoescuela #PreguntaDGT #Conducir #Skily #ExamenConducir`;

  // CTA: комментарий + сохранение — ключевые сигналы для алгоритма
  const commentCta = lang === "ru"
    ? `✍️ Напиши: 1 — знал, 0 — не знал 👇\n💾 Сохрани — пригодится перед экзаменом`
    : `✍️ Escribe: 1 — lo sabías, 0 — fallaste 👇\n💾 Guárdalo — te ayudará en el examen`;

  const caption = lang === "ru"
    ? `${hookTitle}\n\n${commentCta}\n\n${tags}`
    : `${hookTitle}\n\n${commentCta}\n\n${tags}`;

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

// Track per-platform failures to report at the end
const failures = [];

// ── TikTok upload ─────────────────────────────────────────────────────────────
async function uploadTikTok(context, videoPath, lang) {
  plog(`\n🎵 TikTok [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://www.tiktok.com/tiktokstudio/upload?from=creator_center", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });

    await delay(3000);
    plog(`  📍 Current URL: ${page.url()}`);

    // Auth check — TikTok redirects to login or passport page if session expired
    const tiktokUrl = page.url();
    if (tiktokUrl.includes("login") || tiktokUrl.includes("passport") || tiktokUrl.includes("accounts")) {
      const screenshotPath = `/tmp/tiktok-auth-error-${lang}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      throw new Error(`TikTok сессия истекла — запусти: node scripts/setup-login.js ${lang} (скрин: ${screenshotPath})`);
    }

    // TikTok hides the file input — set files directly without clicking
    await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 45000 });
    await page.locator('input[type="file"]').first().setInputFiles(videoPath);
    plog("  ✓ File selected, waiting for upload...");

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
          plog(`  ✓ Dismissed popup (${sel})`);
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
      const screenshotPath = `/tmp/tiktok-after-upload-${lang}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      plog(`  📸 ${screenshotPath}`);
      // Log all contenteditable elements for debugging
      const editables = await page.$$eval('[contenteditable="true"]', els => els.map(e => e.className));
      plog(`  Contenteditable elements found: ${JSON.stringify(editables)}`);
      throw waitErr;
    }
    plog("  ✓ Upload complete");

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
        plog("  ✓ Dismissed tutorial overlay");
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
    plog("  ✓ Caption filled");

    await delay(2000);

    // Dismiss TikTok cookie/privacy banner (locale="ru-RU") — blocks the Post button click
    try {
      const bannerDismissed = await page.evaluate(() => {
        const banner = document.querySelector("tiktok-cookie-banner");
        if (!banner) return false;
        // Try shadow DOM buttons first
        const shadow = banner.shadowRoot;
        if (shadow) {
          const btn = shadow.querySelector("button") || shadow.querySelector('[class*="accept"], [class*="close"], [class*="decline"]');
          if (btn) { btn.click(); return "shadow-btn"; }
        }
        // Fallback: remove the element entirely
        banner.remove();
        return "removed";
      });
      if (bannerDismissed) {
        plog(`  ✓ Cookie banner dismissed (${bannerDismissed})`);
        await delay(800);
      }
    } catch(bannerErr) {
      plog(`  ⚠️  Cookie banner dismissal error: ${bannerErr.message}`);
    }

    // Click Post button — use JS click as fallback if Playwright click is blocked
    const postBtn = page.locator([
      'button[data-e2e="post-button"]',
      'button[data-e2e="post_video_button"]',
      'button:has-text("Post")',
      'button:has-text("Опубликовать")',
    ].join(", ")).first();
    await postBtn.waitFor({ timeout: 10000 });
    try {
      await postBtn.click({ timeout: 5000 });
    } catch {
      // If Playwright click is still blocked, use JS click which ignores overlay
      plog("  ⚠️  Playwright click blocked — using JS click fallback");
      await page.evaluate(() => {
        const btn = document.querySelector('button[data-e2e="post-button"], button[data-e2e="post_video_button"]');
        if (btn) btn.click();
      });
    }
    plog("  ✓ Post clicked");

    // Wait for success confirmation
    await page.waitForURL(/\/manage\/videos|\/tiktokstudio\/content/, { timeout: 30000 }).catch(() => {});
    plog(`  ✅ TikTok [${lang.toUpperCase()}] published!`);
    notify("Skily Video Maker", `✅ TikTok ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    const screenshotPath = `/tmp/tiktok-error-${lang}-${Date.now()}.png`;
    plog(`  ❌ TikTok [${lang.toUpperCase()}] error: ${e.message}`);
    try { await page.screenshot({ path: screenshotPath }); plog(`  📸 ${screenshotPath}`); } catch {}
    notify("Skily Video Maker", `❌ TikTok ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
    failures.push(`TikTok [${lang.toUpperCase()}]: ${e.message}`);
  } finally {
    await page.close();
  }
}

// ── YouTube Shorts upload ─────────────────────────────────────────────────────
async function uploadYouTube(context, videoPath, lang) {
  plog(`\n▶️  YouTube [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://studio.youtube.com", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });

    await delay(5000);
    plog(`  📍 Current URL: ${page.url()}`);

    // Auth check — YouTube Studio redirects to Google login if session expired
    const ytUrl = page.url();
    if (ytUrl.includes("accounts.google.com") || ytUrl.includes("signin") || ytUrl.includes("ServiceLogin")) {
      const screenshotPath = `/tmp/youtube-auth-error-${lang}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath });
      throw new Error(`YouTube сессия истекла — запусти: node scripts/setup-login.js ${lang} (скрин: ${screenshotPath})`);
    }

    // Dismiss any error dialogs
    try {
      const closeBtn = page.locator('button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 })) { await closeBtn.click(); await delay(500); }
    } catch {}

    // YouTube Studio: "Create" → "Upload videos" → set file on hidden input
    await page.locator('button[aria-label="Create"], .ytcpAppHeaderCreateIcon button').first()
      .waitFor({ timeout: 20000 });
    await page.locator('button[aria-label="Create"], .ytcpAppHeaderCreateIcon button').first().click();
    plog("  ✓ Clicked Create");

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
    plog("  ✓ Selected Upload videos");

    await delay(2000);

    // Set file directly on hidden file input
    const fileInput = page.locator("input[type='file']").first();
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(videoPath);
    plog("  ✓ File selected, uploading...");

    // Wait for title field — also wait for any loading scrim to disappear
    await page.waitForSelector("#textbox", { timeout: 120000 });
    // Wait until dialog-scrim is gone (upload dialog loading overlay)
    await page.waitForSelector(".dialog-scrim", { state: "hidden", timeout: 30000 }).catch(() => {});
    await delay(2000);
    plog("  ✓ Upload started");

    const { title, description } = getCaption(lang, "youtube");

    // Fill title — clipboard paste (быстро, не зависит от длины)
    const titleEl = page.locator("#textbox").first();
    await titleEl.click();
    await page.keyboard.press("Meta+A");
    await page.evaluate((t) => navigator.clipboard.writeText(t), title);
    await page.keyboard.press("Meta+V");
    plog("  ✓ Title filled");

    // Fill description — clipboard paste (type() таймаутит на длинных текстах с эмодзи)
    const descEl = page.locator("#textbox").nth(1);
    await descEl.waitFor({ state: "visible", timeout: 10000 });
    await descEl.click();
    await page.keyboard.press("Meta+A");
    await page.evaluate((t) => navigator.clipboard.writeText(t), description);
    await page.keyboard.press("Meta+V");
    plog("  ✓ Description filled");

    // Answer "Not made for kids" — required before Next
    await delay(1000);
    const notForKids = page.locator("tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK'], ytcp-video-metadata-editor-basics #audience-no").first();
    try {
      await notForKids.waitFor({ timeout: 5000 });
      await notForKids.click();
      plog("  ✓ Not made for kids selected");
    } catch {
      // Try by text
      try {
        await page.locator("tp-yt-paper-radio-button").filter({ hasText: /not made for kids|не для детей/i }).first().click();
        plog("  ✓ Not made for kids selected (text match)");
      } catch { plog("  ⚠️  Kids question not found"); }
    }

    // Click Next through steps (Details → Video elements → Checks → Visibility)
    for (let step = 0; step < 3; step++) {
      await delay(2000);
      const nextBtn = page.locator("ytcp-button#next-button").first();
      try {
        await nextBtn.waitFor({ timeout: 8000 });
        await nextBtn.click();
        plog(`  ✓ Next step ${step + 1}`);
      } catch {
        plog(`  ⚠️  Next button not found on step ${step + 1}, continuing...`);
      }
    }

    // Set visibility to Public — screenshot if fails
    await delay(2000);
    await page.screenshot({ path: "/tmp/youtube-visibility.png" });
    plog("  📍 Visibility page URL:", page.url());

    // ── Выбор "Открытый доступ" ─────────────────────────────────────────────
    // Polymer web components (tp-yt-paper-radio-button) игнорируют Playwright .click()
    // из-за Shadow DOM. Решение: getBoundingClientRect() → page.mouse.click() по координатам.
    {
      // Ждём появления радио-кнопок
      await page.waitForSelector("tp-yt-paper-radio-button", { timeout: 10000 });
      await delay(500);

      // Получаем координаты кнопки PUBLIC через evaluate
      const radioCoords = await page.evaluate(() => {
        // Вариант 1: по атрибуту name="PUBLIC"
        let radio = document.querySelector("tp-yt-paper-radio-button[name='PUBLIC']");
        // Вариант 2: последняя кнопка в группе (Public всегда последняя из трёх)
        if (!radio) {
          const all = [...document.querySelectorAll("tp-yt-paper-radio-button")];
          radio = all[all.length - 1] || null;
        }
        if (!radio) return null;
        const r = radio.getBoundingClientRect();
        // Кликаем по кружку (левая часть элемента)
        return { x: r.left + 14, y: r.top + r.height / 2, name: radio.getAttribute("name") };
      });

      if (radioCoords) {
        await page.mouse.click(radioCoords.x, radioCoords.y);
        await delay(600);
        plog(`  ✓ Clicked Public radio via mouse at (${radioCoords.x.toFixed(0)}, ${radioCoords.y.toFixed(0)}) name="${radioCoords.name}"`);
      } else {
        plog("  ⚠️  tp-yt-paper-radio-button not found in DOM");
      }

      // Проверяем что выбор зафиксировался — смотрим на selected в radio-group
      const selectedVal = await page.evaluate(() => {
        const group = document.querySelector("tp-yt-paper-radio-group");
        return group?.selected || group?.getAttribute("selected") || "";
      });
      plog(`  📍 Radio group selected: "${selectedVal}"`);
      await page.screenshot({ path: "/tmp/youtube-after-public-click.png" });

      if (selectedVal !== "PUBLIC") {
        // Запасной вариант: имитируем прямой клик через JS dispatch
        plog("  ⚠️  Still not PUBLIC — trying JS dispatchEvent...");
        await page.evaluate(() => {
          const radio = document.querySelector("tp-yt-paper-radio-button[name='PUBLIC']")
            || [...document.querySelectorAll("tp-yt-paper-radio-button")].at(-1);
          if (radio) {
            ["mousedown", "mouseup", "click"].forEach(t =>
              radio.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true }))
            );
          }
        });
        await delay(500);
        const selectedVal2 = await page.evaluate(() => {
          const group = document.querySelector("tp-yt-paper-radio-group");
          return group?.selected || group?.getAttribute("selected") || "";
        });
        plog(`  📍 After dispatch: "${selectedVal2}"`);
        if (selectedVal2 !== "PUBLIC") {
          await page.screenshot({ path: `/tmp/youtube-no-public-${lang}.png` });
          throw new Error(`YouTube: не удалось выбрать Открытый доступ (selected="${selectedVal2}"). Скрин: /tmp/youtube-no-public-${lang}.png`);
        }
      }
    }

    // Прокручиваем вниз — блок "Советы перед публикацией" может перекрывать кнопку
    await page.evaluate(() => {
      const dialog = document.querySelector("ytcp-uploads-dialog, tp-yt-paper-dialog");
      if (dialog) dialog.scrollTop = dialog.scrollHeight;
    }).catch(() => {});
    await delay(500);

    const publishBtn = page.locator("ytcp-button#done-button").first();
    await publishBtn.waitFor({ timeout: 10000 });

    // Guard: кнопка должна быть "Опубликовать", а не "Сохранить"
    const btnText = await publishBtn.innerText().catch(() => "");
    plog(`  📍 Publish button text: "${btnText.trim()}"`);
    if (btnText.includes("Сохранить") || btnText.toLowerCase().includes("save")) {
      await page.screenshot({ path: `/tmp/youtube-save-not-publish-${lang}.png` });
      throw new Error(`YouTube: кнопка "${btnText.trim()}" — Public не выбран! Скрин: /tmp/youtube-save-not-publish-${lang}.png`);
    }

    await publishBtn.click({ force: true });
    plog("  ✓ Publish clicked");

    // Polling-цикл: YouTube может показать попап "Проверка видео ещё продолжается"
    // в любой момент (обычно через 1-5 сек после клика).
    // Нажимаем "Опубликовать" в попапе, затем ждём финального подтверждения.
    let published = false;
    const deadline = Date.now() + 90000; // 90 секунд максимум

    while (Date.now() < deadline && !published) {
      await delay(1200);

      // 1. Проверяем попап "Проверка видео ещё продолжается"
      const warningVisible = await page.getByText("Проверка видео ещё продолжается")
        .or(page.getByText("Video checks still in progress"))
        .isVisible().catch(() => false);

      if (warningVisible) {
        plog("  ⚠️  Диалог 'Проверка видео' — нажимаем Опубликовать в нём...");
        // Ищем кнопку "Опубликовать" СТРОГО ВНУТРИ диалога (не на основной странице)
        const dialogBtnCoords = await page.evaluate(() => {
          // Находим сам диалог по тексту заголовка
          let dialog = null;
          for (const el of document.querySelectorAll(
            "tp-yt-paper-dialog, ytcp-dialog, [role='dialog'], .ytcp-modal"
          )) {
            if ((el.textContent || "").includes("Проверка видео") ||
                (el.textContent || "").includes("Video checks")) {
              dialog = el;
              break;
            }
          }
          if (!dialog) return null;

          // Внутри диалога ищем кнопку с нужным текстом
          for (const btn of dialog.querySelectorAll("ytcp-button, button, [role='button']")) {
            const text = (btn.innerText || btn.textContent || "").trim();
            if (text !== "Опубликовать" && text !== "Publish") continue;
            const r = btn.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
          }
          return null;
        });
        if (dialogBtnCoords) {
          await page.mouse.click(dialogBtnCoords.x, dialogBtnCoords.y);
          plog(`  ✓ Диалог подтверждён (клик по координатам ${dialogBtnCoords.x.toFixed(0)}, ${dialogBtnCoords.y.toFixed(0)})`);
        } else {
          plog("  ⚠️  Кнопка Опубликовать в диалоге не найдена");
        }
        // Видео будет опубликовано после завершения проверки (может занять несколько минут)
        // Не ждём share-dialog — просто доверяем клику
        await delay(3000);
        published = true;
        plog(`  ✅ YouTube [${lang.toUpperCase()}] — публикация подтверждена, видео появится после проверки`);
        break;
      }

      // 2. Проверяем финальный share-диалог
      const shareVisible = await page.locator("ytcp-video-share-dialog")
        .isVisible().catch(() => false);
      if (shareVisible) {
        plog(`  ✅ YouTube [${lang.toUpperCase()}] published! (share dialog)`);
        published = true;
        break;
      }

      // 3. Проверяем редирект URL (после успешной публикации)
      const currentUrl = page.url();
      if (currentUrl.includes("/videos/") || currentUrl.includes("/short")) {
        plog(`  ✅ YouTube [${lang.toUpperCase()}] published! (URL: ${currentUrl.slice(-60)})`);
        published = true;
        break;
      }
    }

    if (!published) {
      await page.screenshot({ path: `/tmp/youtube-no-confirm-${lang}.png` });
      plog(`  ⚠️  YouTube [${lang.toUpperCase()}] — не подтверждено за 90 сек. Скрин: /tmp/youtube-no-confirm-${lang}.png`);
    }
    notify("Skily Video Maker", `✅ YouTube ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    const screenshotPath = `/tmp/youtube-error-${lang}-${Date.now()}.png`;
    plog(`  ❌ YouTube [${lang.toUpperCase()}] error: ${e.message}`);
    try { await page.screenshot({ path: screenshotPath }); plog(`  📸 ${screenshotPath}`); } catch {}
    notify("Skily Video Maker", `❌ YouTube ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
    failures.push(`YouTube [${lang.toUpperCase()}]: ${e.message}`);
  } finally {
    await page.close();
  }
}

// ── Instagram Reels upload ────────────────────────────────────────────────────
async function uploadInstagram(context, videoPath, lang) {
  plog(`\n📸 Instagram [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);
  const page = await context.newPage();
  try {
    await page.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await delay(3000);
    plog(`  📍 URL: ${page.url()}`);

    // If redirected to login — session expired
    if (page.url().includes("accounts") || page.url().includes("login")) {
      throw new Error(`Instagram not logged in — run: node scripts/setup-login.js ${lang}`);
    }

    // Dismiss any popups FIRST (notifications, etc.) before clicking Create
    for (const txt of ["Не сейчас", "Not Now", "Not now", "Dismiss"]) {
      try {
        const btn = page.locator(`button:has-text("${txt}")`).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          plog(`  ✓ Dismissed popup (${txt})`);
          await delay(800);
          break;
        }
      } catch {}
    }

    let fileSet = false;

    // Click "Создать" / "Create" in sidebar
    const createBtn = page.locator([
      'svg[aria-label="Новая публикация"]',
      'svg[aria-label="New post"]',
      '[aria-label="Создать"]',
      '[aria-label="Create"]',
      'text="Создать"',
      'text="Create"',
    ].join(", ")).first();

    try {
      await createBtn.waitFor({ state: "visible", timeout: 10000 });
      await createBtn.click();
    } catch {
      // Fallback: find via text content evaluation
      await page.evaluate(() => {
        const all = [...document.querySelectorAll("*")];
        const btn = all.find(el =>
          el.children.length <= 2 &&
          (el.textContent?.trim() === "Создать" || el.textContent?.trim() === "Create")
        );
        if (btn) btn.click();
      });
    }
    plog("  ✓ Create clicked");
    await delay(2000);

    // Now wait for "Публикация" sub-menu item to appear, then capture filechooser
    const pubVisible = await page.locator('text="Публикация"').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (pubVisible) {
      plog("  Sub-menu detected → clicking Публикация");
      try {
        const [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: 8000 }),
          page.locator('text="Публикация"').first().click(),
        ]);
        await fileChooser.setFiles(videoPath);
        fileSet = true;
        plog("  ✓ File set via Публикация (filechooser)");
      } catch(fcErr) {
        plog("  No filechooser from Публикация — waiting for file input:", fcErr.message.slice(0, 60));
        await page.locator('text="Публикация"').first().click().catch(() => {});
        await delay(3000);
      }
    } else {
      plog("  No sub-menu (personal account) — looking for file input directly");
    }

    // Diagnostic screenshot
    await page.screenshot({ path: "/tmp/instagram-after-create.png" });
    plog("  📸 /tmp/instagram-after-create.png");

    // Click "Select from computer" / use hidden file input
    if (!fileSet) {
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
    }

    // Second try: hidden file input directly
    if (!fileSet) {
      try {
        const inp = page.locator('input[type="file"]').first();
        await inp.waitFor({ state: "attached", timeout: 10000 });
        await inp.setInputFiles(videoPath);
        fileSet = true;
      } catch {
        await page.screenshot({ path: "/tmp/instagram-no-file-input.png" });
        plog("  📸 /tmp/instagram-no-file-input.png");
      }
    }

    if (!fileSet) throw new Error("Could not set file on Instagram");
    plog("  ✓ File selected");

    // Helper: dismiss any modal popups (Reels info, etc.) before navigating
    const dismissPopups = async () => {
      for (const sel of ['button:has-text("OK")', 'button:has-text("ОК")', 'button:has-text("Понятно")']) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1500 })) {
            await btn.click();
            plog(`  ✓ Dismissed popup (${sel})`);
            await delay(600);
          }
        } catch {}
      }
    };

    // Helper: click "Далее"/"Next" using native Playwright mouse events (React-compatible)
    const clickNext = async () => {
      await dismissPopups(); // dismiss any modal before trying to click Next
      const loc = page.locator('div[role="button"]:has-text("Далее"), div[role="button"]:has-text("Next")').first();
      try {
        await loc.waitFor({ state: "visible", timeout: 8000 });
        await loc.click();
        return true;
      } catch { return false; }
    };

    // Wait for crop dialog to fully load
    await delay(3000);
    await dismissPopups();

    // Открываем пикер соотношения — иконка "стрелки друг на друга" внизу-слева превью
    await page.screenshot({ path: "/tmp/instagram-crop-dialog.png" });
    plog("  📸 /tmp/instagram-crop-dialog.png");

    // Логгируем все кнопки в диалоге (для отладки позиции)
    const dialogBtns = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return [];
      return [...modal.querySelectorAll('button, [role="button"]')].map(b => {
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label') || b.textContent?.trim().slice(0,20) };
      }).filter(b => b.w > 8 && b.h > 8);
    });
    plog("  Кнопки в диалоге:", JSON.stringify(dialogBtns));

    // Кнопка иконки "стрелки" — самая левая среди кнопок в нижней части превью
    // Ищем среди маленьких кнопок (не "Далее") в нижней половине диалога
    const ratioBtn = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      const mr = modal.getBoundingClientRect();
      const btns = [...modal.querySelectorAll('button, [role="button"]')];
      const candidates = btns.filter(b => {
        const r = b.getBoundingClientRect();
        // Маленькая кнопка (не широкая "Далее"), в нижней части диалога, слева
        return r.top > mr.top + mr.height * 0.5
          && r.left < mr.left + mr.width * 0.4
          && r.width < 80 && r.width > 8;
      }).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top); // самая нижняя
      if (!candidates[0]) return null;
      const r = candidates[0].getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, label: candidates[0].getAttribute('aria-label') };
    });

    if (ratioBtn) {
      plog(`  Кликаю иконку пикера: "${ratioBtn.label}" at (${Math.round(ratioBtn.x)}, ${Math.round(ratioBtn.y)})`);
      await page.mouse.click(ratioBtn.x, ratioBtn.y);
    } else {
      plog("  ⚠️ Кнопка пикера не найдена по позиции — пробую aria-label");
      for (const sel of ['[aria-label*="Выбрать размер" i]', '[aria-label*="размер и обр" i]',
                          '[aria-label*="crop" i]', '[aria-label*="кадр" i]', '[aria-label*="ratio" i]',
                          '[aria-label*="Select crop" i]', '[aria-label*="Обрезка" i]']) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 600 })) {
            const box = await el.boundingBox();
            if (box) { await page.mouse.click(box.x + box.width/2, box.y + box.height/2); break; }
          }
        } catch {}
      }
    }

    await delay(1200);
    await page.screenshot({ path: "/tmp/instagram-ratio-picker.png" });
    plog("  📸 /tmp/instagram-ratio-picker.png");

    // Кликаем 9:16 через mouse.click по координатам
    const pos916 = await page.evaluate(() => {
      const all = [...document.querySelectorAll("span, div, li")];
      const el = all.find(e => e.textContent?.trim() === "9:16" && e.children.length === 0);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (pos916) {
      await page.mouse.click(pos916.x, pos916.y);
      plog(`  ✓ Selected 9:16 at (${Math.round(pos916.x)}, ${Math.round(pos916.y)})`);
      await delay(800);
    } else {
      plog("  ⚠️  9:16 не найдено — продолжаем без смены формата");
    }

    // Click Далее: Crop → Filters
    await delay(1000);
    if (await clickNext()) { plog("  ✓ Next: crop → filters"); }
    await delay(2000);

    // Click Далее: Filters → Caption
    if (await clickNext()) { plog("  ✓ Next: filters → caption"); }
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
      plog("  📸 /tmp/instagram-caption-step.png");
      throw new Error("Caption field not found");
    }
    await captionEl.click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), caption);
    await page.keyboard.press("Meta+V");
    plog("  ✓ Caption filled");

    await delay(1500);

    // Dismiss hashtag autocomplete by clicking on the video preview area (left side of dialog).
    // Do NOT use Escape — on Russian Instagram Escape fires the "Discard post?" dialog
    // even when autocomplete is open, breaking the publish flow.
    try {
      const videoEl = page.locator('[role="dialog"] video, [role="dialog"] canvas').first();
      if (await videoEl.isVisible({ timeout: 1000 })) {
        await videoEl.click({ position: { x: 10, y: 10 } });
      } else {
        await page.mouse.click(470, 465); // center of video preview area
      }
    } catch {
      await page.mouse.click(470, 465);
    }
    await delay(600);

    // Guard: if Discard dialog appeared anyway (defensive), dismiss it with "Отмена"
    try {
      const discardHeader = page.locator('text="Отменить публикацию?"').or(page.locator('text="Discard post?"')).first();
      if (await discardHeader.isVisible({ timeout: 800 })) {
        await page.locator('button:has-text("Отмена"), button:has-text("Cancel")').last().click();
        await delay(600);
        plog("  ✓ Dismissed Discard dialog (guard)");
      }
    } catch {}

    await page.screenshot({ path: "/tmp/instagram-before-share.png" });

    // "Поделиться" (Share) is in the dialog header top-right.
    // "Где поделиться:" is a section inside the form — must NOT match.
    // Strategy: find via evaluate the LEAF node with exact text, then mouse.click at its position.
    const sharePos = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      // Find leaf elements with exactly "Поделиться" or "Share"
      const all = [...dialog.querySelectorAll("*")];
      const btn = all.find(el =>
        el.children.length === 0 &&
        (el.textContent.trim() === "Поделиться" || el.textContent.trim() === "Share")
      );
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, tag: btn.tagName, text: btn.textContent.trim() };
    });

    if (!sharePos) throw new Error("Share button (leaf node) not found in dialog");
    plog(`  Share button found: <${sharePos.tag}> "${sharePos.text}" at (${Math.round(sharePos.x)}, ${Math.round(sharePos.y)})`);
    await page.screenshot({ path: "/tmp/instagram-before-share.png" });

    // Click at exact position (bypasses all event interception)
    await page.mouse.click(sharePos.x, sharePos.y);
    plog("  ✓ Share clicked via mouse.click");

    // Сначала ждём появления диалога "Публикация" (spinner загрузки)
    await page.waitForSelector('div[role="dialog"] >> text="Публикация"', { timeout: 15000 })
      .then(() => plog("  ✓ Идёт загрузка ролика..."))
      .catch(() => plog("  ⚠️  Диалог загрузки не появился — продолжаем"));

    await page.screenshot({ path: "/tmp/instagram-after-share.png" });
    plog("  📸 /tmp/instagram-after-share.png");

    // Ждём пока диалог-загрузчик исчезнет (Instagram закрывает его после успеха)
    // Или ловим текст успеха — таймаут 3 минуты (большие файлы грузятся долго)
    const uploadDone = await Promise.race([
      // Вариант 1: диалог исчез → загрузка завершена
      page.waitForSelector('div[role="dialog"] >> text="Публикация"', { state: "hidden", timeout: 180000 })
        .then(() => "dialog_gone"),
      // Вариант 2: появился текст успеха
      page.waitForSelector([
        'span:has-text("Your reel")',
        'span:has-text("Your Reel")',
        'span:has-text("Рил опубликован")',
        'span:has-text("Рилс опубликован")',
        'span:has-text("опубликован")',
        'span:has-text("Your post")',
        'div[role="dialog"] button:has-text("OK")',
      ].join(", "), { timeout: 180000 }).then(() => "success_text"),
    ]).catch(() => null);

    await page.screenshot({ path: "/tmp/instagram-share-done.png" });
    plog("  📸 /tmp/instagram-share-done.png");
    plog("  📍 URL после публикации:", page.url());

    if (!uploadDone) {
      throw new Error("Таймаут ожидания публикации — ролик мог не загрузиться");
    }
    // Небольшая пауза чтобы Instagram завершил обработку
    await delay(3000);
    plog(`  ✅ Instagram [${lang.toUpperCase()}] published! (${uploadDone})`);
    notify("Skily Video Maker", `✅ Instagram ${lang.toUpperCase()} опубликован`);
  } catch(e) {
    const screenshotPath = `/tmp/instagram-error-${lang}-${Date.now()}.png`;
    plog(`  ❌ Instagram [${lang.toUpperCase()}] error: ${e.message}`);
    try { await page.screenshot({ path: screenshotPath }); plog(`  📸 ${screenshotPath}`); } catch {}
    notify("Skily Video Maker", `❌ Instagram ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
    failures.push(`Instagram [${lang.toUpperCase()}]: ${e.message}`);
  } finally {
    await page.close();
  }
}

// ── Launch Chrome context with saved auth state ────────────────────────────────
async function launchContext(authFile) {
  if (!fs.existsSync(authFile)) {
    const lang = authFile.includes("-es.") ? "es" : "ru";
    plog(`\n❌ Нет файла сессии: ${authFile}`);
    plog(`   Сначала запусти: node scripts/setup-login.js ${lang}\n`);
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

// ── Facebook Reels upload (Playwright) ───────────────────────────────────────
// Аналогично Instagram: браузер с сохранёнными cookies, загрузка через веб.
// Логин один раз: node scripts/setup-login.js fb → сохраняет auth-state-fb.json.
// .env: FB_PAGE_NAME_RU=SkilyRussia  FB_PAGE_NAME_ES=SkilyEspana (slug из URL страницы)
async function uploadFacebook(videoPath, lang) {
  const pageName = lang === "ru"
    ? (process.env.FB_PAGE_NAME_RU || "")
    : (process.env.FB_PAGE_NAME_ES || "");

  if (!pageName) {
    plog(`  ⚠️  Facebook (${lang.toUpperCase()}): FB_PAGE_NAME_${lang.toUpperCase()} не задан в .env — пропускаем`);
    plog(`     Добавь: FB_PAGE_NAME_${lang.toUpperCase()}=имя_страницы (из facebook.com/<имя>)`);
    return;
  }
  if (!fs.existsSync(AUTH_FB)) {
    plog(`  ⚠️  Facebook: auth-state-fb.json не найден — запусти: node scripts/setup-login.js fb`);
    return;
  }

  plog(`\n📘 Facebook [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);

  let browser, context, page;
  try {
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: false,
      args: ["--no-sandbox"],
    });
    context = await browser.newContext({
      storageState: AUTH_FB,
      viewport: { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    page = await context.newPage();
    // Открываем страницу (поддерживает slug и profile.php?id=...)
    const pageUrl = pageName.startsWith("http")
      ? pageName
      : `https://www.facebook.com/${pageName}`;
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await delay(3000);
    plog(`  📍 URL: ${page.url()}`);

    if (page.url().includes("/login") || page.url().includes("checkpoint")) {
      throw new Error(`Facebook сессия истекла — запусти: node scripts/setup-login.js fb`);
    }

    // Ищем кнопку создания Reels на странице
    let reelOpened = false;
    for (const label of ["Reel", "Рилс", "Создать рилс", "Create Reel"]) {
      try {
        const btn = page.locator(`[aria-label*="${label}" i]`).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          reelOpened = true;
          plog(`  ✓ Reels button clicked (${label})`);
          break;
        }
      } catch {}
    }

    // Fallback: перейти напрямую на reels/create
    if (!reelOpened) {
      plog(`  ℹ️  Reel button not found on page — navigating to reels/create`);
      await page.goto("https://www.facebook.com/reels/create/", {
        waitUntil: "domcontentloaded", timeout: 20000,
      });
      await delay(2000);
    }

    // ── Шаг 1: ждём диалог "Создание видео Reels" ───────────────────────────
    plog("  ⏳ Waiting for Reels dialog...");
    await page.waitForSelector('text="Создание видео Reels"', { timeout: 15000 });
    plog("  ✓ Reels dialog opened");

    // ── Шаг 2: ждём "Ой!" и dismiss-им (появляется через ~3-5 сек) ──────────
    try {
      await page.waitForSelector('text="Ой!"', { timeout: 8000 });
      plog("  ⚠️  Ой! popup detected — dismissing");
      await page.locator('button:has-text("Закрыть")').click({ force: true });
      await page.waitForSelector('text="Ой!"', { state: "hidden", timeout: 5000 });
      plog("  ✓ Ой! dismissed");
    } catch {
      plog("  ✓ No Ой! popup");
    }
    await delay(800);

    await page.screenshot({ path: `/tmp/facebook-create-${lang}.png` });
    plog(`  📸 /tmp/facebook-create-${lang}.png`);

    // ── Шаг 3: загружаем файл через кнопку "Загрузить" → filechooser ─────────
    const sizeMB = Math.round(fs.statSync(videoPath).size / 1024 / 1024);
    plog(`  Uploading ${sizeMB}MB...`);

    let fileChooser;

    // Попытка 1: кнопка "Загрузить" (нормальный клик, без force)
    try {
      [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 10000 }),
        page.locator('button:has-text("Загрузить"), button:has-text("Upload")').first().click(),
      ]);
      plog("  ✓ filechooser via Загрузить button");
    } catch {}

    // Попытка 2: клик по зоне "+  Добавить видео"
    if (!fileChooser) {
      try {
        [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: 10000 }),
          page.locator('text="Добавить видео"').first().click(),
        ]);
        plog("  ✓ filechooser via Добавить видео zone");
      } catch {}
    }

    // Попытка 3: evaluate-click на скрытый input[type=file] внутри диалога
    if (!fileChooser) {
      try {
        [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: 8000 }),
          page.evaluate(() => {
            const inp = document.querySelector('input[type="file"]');
            if (inp) inp.click();
          }),
        ]);
        plog("  ✓ filechooser via evaluate input.click()");
      } catch {}
    }

    if (!fileChooser) {
      await page.screenshot({ path: `/tmp/facebook-no-filechooser-${lang}.png` });
      throw new Error(`Could not open file chooser — см. /tmp/facebook-no-filechooser-${lang}.png`);
    }

    await fileChooser.setFiles(videoPath);
    plog("  ✓ File selected");

    // ── Шаг 4: ждём "Далее" — видео загружено и готово (до 5 мин) ───────────
    plog("  ⏳ Waiting for video upload (up to 5 min)...");
    // Используем locator().waitFor() — waitForSelector не поддерживает text=
    const daleeLocator = page.getByRole("button", { name: "Далее" })
      .or(page.locator('[role="button"]:has-text("Далее")'))
      .first();
    await daleeLocator.waitFor({ state: "visible", timeout: 300000 });
    plog("  ✓ Video ready — Далее appeared");
    await delay(1000);

    await page.screenshot({ path: `/tmp/facebook-editing-${lang}.png` });
    plog(`  📸 /tmp/facebook-editing-${lang}.png`);

    // ── Шаг 5: первый "Далее" (переходим к экрану редактирования) ────────────
    await daleeLocator.click();
    plog("  ✓ Далее #1 clicked");
    await delay(2000);

    await page.screenshot({ path: `/tmp/facebook-after-next-${lang}.png` });
    plog(`  📸 /tmp/facebook-after-next-${lang}.png`);

    // ── Шаг 6: заполняем описание (экран "Редактирование видео Reels") ────────
    const { description } = getCaption(lang, "facebook");
    // Facebook рендерит поле описания нестандартно — ищем через DOM-координаты
    // (Playwright locator не находит из-за shadow DOM / особенностей React)
    const fieldPos = await page.evaluate(() => {
      // 1. Нативный textarea
      for (const el of document.querySelectorAll("textarea")) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 20 && r.top > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, type: "textarea" };
        }
      }
      // 2. role="textbox" (contenteditable с ARIA)
      for (const el of document.querySelectorAll('[role="textbox"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 20 && r.top > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, type: "textbox" };
        }
      }
      // 3. Любой contenteditable
      for (const el of document.querySelectorAll('[contenteditable="true"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 20 && r.top > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, type: "contenteditable" };
        }
      }
      return null;
    });

    if (fieldPos) {
      plog(`  📍 Description field at (${Math.round(fieldPos.x)}, ${Math.round(fieldPos.y)}) [${fieldPos.type}]`);
      await page.mouse.click(fieldPos.x, fieldPos.y);
      await delay(300);
      await page.evaluate((text) => navigator.clipboard.writeText(text), description);
      await page.keyboard.press("Meta+V");
      plog("  ✓ Description filled");
    } else {
      plog("  ⚠️  Description field not found — продолжаем без описания");
      await page.screenshot({ path: `/tmp/facebook-no-desc-${lang}.png` });
      plog(`  📸 /tmp/facebook-no-desc-${lang}.png`);
    }
    await delay(1000);

    // ── Шаг 7: второй "Далее" (переходим к финальной публикации) ─────────────
    const nextBtn2 = page.locator('button:has-text("Далее"), div[role="button"]:has-text("Далее")').first();
    try {
      await nextBtn2.waitFor({ state: "visible", timeout: 5000 });
      await nextBtn2.click();
      plog("  ✓ Далее #2 clicked");
      await delay(3000);
    } catch {
      plog("  ℹ️  No second Далее (single-step flow)");
    }

    await page.screenshot({ path: `/tmp/facebook-before-publish-${lang}.png` });
    plog(`  📸 /tmp/facebook-before-publish-${lang}.png`);

    // ── Шаг 7: финальная кнопка публикации ──────────────────────────────────
    // ВАЖНО: кнопка финальной публикации называется "Отправить" (не "Поделиться"!)
    // "Поделиться в группах" — это настройка-строка, не кнопка публикации.
    // Используем exact:true чтобы не попасть в строки-настройки.
    const publishBtn = page.getByRole("button", { name: "Отправить", exact: true })
      .or(page.getByRole("button", { name: "Поделиться", exact: true }))
      .or(page.getByRole("button", { name: "Опубликовать", exact: true }))
      .or(page.getByRole("button", { name: "Share", exact: true }))
      .or(page.getByRole("button", { name: "Publish", exact: true }))
      .first();

    try {
      await publishBtn.waitFor({ state: "visible", timeout: 15000 });
      // Проверяем текст кнопки — не должно быть "в группах", "в истории" и т.д.
      const btnText = await publishBtn.innerText().catch(() => "");
      plog(`  📍 Publish button text: "${btnText.trim()}"`);
      if (btnText.toLowerCase().includes("груп") || btnText.toLowerCase().includes("историю")) {
        await page.screenshot({ path: `/tmp/facebook-wrong-btn-${lang}.png` });
        throw new Error(`Нашли не ту кнопку: "${btnText.trim()}" — см. /tmp/facebook-wrong-btn-${lang}.png`);
      }
      await publishBtn.click();
      plog("  ✓ Publish clicked");
    } catch {
      await page.screenshot({ path: `/tmp/facebook-no-publish-${lang}.png` });
      plog(`  📸 /tmp/facebook-no-publish-${lang}.png`);
      throw new Error(`Publish button not found — см. /tmp/facebook-no-publish-${lang}.png`);
    }

    // Ждём успешной публикации (исчезновение диалога или редирект)
    await delay(3000);
    await page.screenshot({ path: `/tmp/facebook-done-${lang}.png` });
    plog(`  📸 /tmp/facebook-done-${lang}.png`);
    plog(`  ✅ Facebook [${lang.toUpperCase()}] Reel опубликован!`);
    notify("Skily Video Maker", `✅ Facebook ${lang.toUpperCase()} Reel опубликован`);

  } catch(e) {
    const screenshotPath = `/tmp/facebook-error-${lang}-${Date.now()}.png`;
    try { await page?.screenshot({ path: screenshotPath }); } catch {}
    plog(`  ❌ Facebook [${lang.toUpperCase()}] error: ${e.message}`);
    plog(`  📸 ${screenshotPath}`);
    notify("Skily Video Maker", `❌ Facebook ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
    failures.push(`Facebook [${lang.toUpperCase()}]: ${e.message}`);
  } finally {
    try { await page?.close(); } catch {}
    try { await context?.close(); } catch {}
    try { await browser?.close(); } catch {}
  }
}

// ── Pinterest Video Pin (Playwright) ─────────────────────────────────────────
// Аналогично другим платформам: браузер с сохранёнными cookies.
// Логин: node scripts/setup-login.js pinterest → auth-state-pinterest.json
// .env: PINTEREST_BOARD_NAME_RU / PINTEREST_BOARD_NAME_ES (название доски)
//
// TODO: переключить на API v5 когда Pinterest одобрит production access:
//   node scripts/setup-pinterest.js → PINTEREST_ACCESS_TOKEN в .env
async function uploadPinterest(videoPath, lang) {
  const boardName = lang === "ru"
    ? process.env.PINTEREST_BOARD_NAME_RU
    : process.env.PINTEREST_BOARD_NAME_ES;
  const authFile = path.join(__dirname, "../auth-state-pinterest.json");

  if (!fs.existsSync(authFile)) {
    plog(`  ⚠️  Pinterest: auth-state-pinterest.json не найден`);
    plog(`     Запусти: node scripts/setup-login.js pinterest`);
    return;
  }
  if (!boardName) {
    plog(`  ⚠️  Pinterest: PINTEREST_BOARD_NAME_${lang.toUpperCase()} не задан в .env — пропускаем`);
    return;
  }

  plog(`\n📌 Pinterest [${lang.toUpperCase()}] → ${path.basename(videoPath)}`);

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });
  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto("https://www.pinterest.com/pin-creation-tool/", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    await delay(3000);
    plog(`  📍 URL: ${page.url()}`);

    if (page.url().includes("login")) {
      throw new Error("Pinterest сессия истекла — запусти: node scripts/setup-login.js pinterest");
    }

    // ── Шаг 1: загружаем видео ───────────────────────────────────────────────
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(videoPath);
    plog("  ✓ File selected, uploading...");
    await delay(4000);

    await page.screenshot({ path: `/tmp/pinterest-after-upload-${lang}.png` });
    plog(`  📸 /tmp/pinterest-after-upload-${lang}.png`);

    // ── Шаг 2: заголовок ────────────────────────────────────────────────────
    // Pinterest: поле "Название" имеет placeholder "Добавьте описание пина"
    const { title, description } = getCaption(lang, "pinterest");
    const titlePos = await page.evaluate(() => {
      const els = [...document.querySelectorAll("textarea, input[type='text']")];
      // Первый видимый textarea — это поле названия
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 200 && r.height > 20 && r.top > 0) {
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      return null;
    });
    if (titlePos) {
      await page.mouse.click(titlePos.x, titlePos.y);
      await page.evaluate((t) => navigator.clipboard.writeText(t), title);
      await page.keyboard.press("Meta+V");
      plog("  ✓ Title filled");
    } else { plog("  ⚠️  Title field not found"); }

    // ── Шаг 3: описание ─────────────────────────────────────────────────────
    // После заголовка — нажимаем Tab чтобы перейти на поле описания (надёжнее поиска в DOM)
    await delay(300);
    try {
      await page.keyboard.press("Tab");
      await delay(400);
      // Проверяем что активный элемент — это textarea/input (а не кнопка или ссылка)
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? { tag: el.tagName, placeholder: el.getAttribute("placeholder") || el.getAttribute("aria-placeholder") || "" } : null;
      });
      plog(`  📍 After Tab: focused ${focused?.tag} placeholder="${focused?.placeholder?.slice(0, 40)}"`);

      if (focused && (focused.tag === "TEXTAREA" || focused.tag === "INPUT" || focused.tag === "DIV")) {
        await page.evaluate((t) => navigator.clipboard.writeText(t), description);
        await page.keyboard.press("Meta+V");
        plog("  ✓ Description filled via Tab");
      } else {
        // Fallback: ищем поле описания по placeholder (первый видимый textarea после скролла)
        await page.evaluate(() => window.scrollBy(0, 400));
        await delay(1000);
        const descPos = await page.evaluate(() => {
          for (const el of document.querySelectorAll("textarea, [contenteditable='true']")) {
            const r = el.getBoundingClientRect();
            // Ищем любой видимый textarea/contenteditable с пустым или placeholder-содержимым
            if (r.width > 200 && r.height > 20 && r.top > 50 && r.top < window.innerHeight - 50) {
              const val = el.value || el.textContent || "";
              if (val.trim() === "" || val.length < 10) { // пустое поле
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: el.tagName };
              }
            }
          }
          return null;
        });
        if (descPos) {
          await page.mouse.click(descPos.x, descPos.y);
          await delay(300);
          await page.evaluate((t) => navigator.clipboard.writeText(t), description);
          await page.keyboard.press("Meta+V");
          plog(`  ✓ Description filled via fallback (${descPos.tag})`);
        } else {
          plog("  ⚠️  Description field not found — пропускаем");
        }
      }
    } catch(e) { plog("  ⚠️  Description error: " + e.message.slice(0, 80)); }

    // ── Шаг 4: ссылка ────────────────────────────────────────────────────────
    const linkEl = page.locator('input[placeholder*="ссылк" i], input[placeholder*="link" i], input[placeholder*="url" i]').first();
    try {
      if (await linkEl.isVisible({ timeout: 3000 })) {
        await linkEl.fill("https://skilyapp.com");
        plog("  ✓ Link filled");
      }
    } catch {}

    // ── Шаг 5: выбор доски ───────────────────────────────────────────────────
    try {
      // Скроллим обратно наверх чтобы увидеть дропдаун доски
      await page.evaluate(() => window.scrollBy(0, -200));
      await delay(400);

      const boardDropdown = page.locator('[data-test-id="board-dropdown-select-button"]').first();
      await boardDropdown.waitFor({ state: "visible", timeout: 8000 });
      await boardDropdown.click();
      await delay(800);

      // Вводим название в поиск
      const searchInput = page.locator('input[placeholder*="Поиск" i], input[placeholder*="Search" i]').first();
      await searchInput.waitFor({ state: "visible", timeout: 3000 });
      await searchInput.fill(boardName.slice(0, 12)); // первые 12 символов
      await delay(1500); // ждём пока появятся результаты

      // Кликаем по элементу с текстом названия доски (getByText находит любой тег)
      const boardText = boardName.slice(0, 20); // "Экзамен DGT — разбор" / "Examen DGT — Pregunt"
      try {
        const boardOption = page.getByText(boardText, { exact: false }).first();
        await boardOption.waitFor({ state: "visible", timeout: 3000 });
        await boardOption.click();
        plog(`  ✓ Board clicked by text: "${boardText}"`);
      } catch {
        // Fallback: клик по координатам первого результата в дропдауне
        const resultPos = await page.evaluate(() => {
          // Ищем любой div/span с текстом внутри выпадающего списка
          const all = [...document.querySelectorAll("div, span, li")];
          for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.top > 500 && r.top < 800 && r.width > 100 && r.height > 20 && r.height < 100) {
              const text = el.textContent?.trim();
              if (text && text.length > 5 && text.length < 60) {
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: text.slice(0, 40) };
              }
            }
          }
          return null;
        });
        if (resultPos) {
          await page.mouse.click(resultPos.x, resultPos.y);
          plog(`  ✓ Board clicked by coords: "${resultPos.text}"`);
        } else {
          plog("  ⚠️  Board option not found");
        }
      }
      await delay(500);
    } catch(e) { plog(`  ⚠️  Board selection: ${e.message.slice(0, 80)}`); }

    // ── Шаг 6: публикация — кнопка в правом верхнем углу ────────────────────
    plog("  ⏳ Waiting for video to process...");
    // Кнопка "Опубликовать" / "Publish" — Pinterest не использует <header>, ищем по роли/тексту
    const publishBtn = page.getByRole("button", { name: "Опубликовать", exact: true })
      .or(page.getByRole("button", { name: "Publish", exact: true }))
      .or(page.locator('[data-test-id="board-dropdown-save-button"]'))
      .or(page.locator('button:has-text("Опубликовать")'))
      .or(page.locator('button:has-text("Publish")'))
      .first();
    await publishBtn.waitFor({ state: "visible", timeout: 120000 });

    await page.screenshot({ path: `/tmp/pinterest-before-publish-${lang}.png` });
    plog(`  📸 /tmp/pinterest-before-publish-${lang}.png`);

    await publishBtn.click();
    plog("  ✓ Publish clicked");

    // Ждём завершения загрузки — Pinterest редиректит на страницу пина или показывает тост
    // Таймаут 90с на случай медленной сети (видео 1+ мин весит ~20MB)
    plog("  ⏳ Waiting for Pinterest to finish uploading...");
    try {
      await page.waitForFunction(() => {
        // Успех: URL сменился со /pin-creation-tool/ на /pin/XXX или /
        if (!location.pathname.includes("pin-creation-tool")) return true;
        // Или: прогресс-бар исчез (больше нет текста "Публикация...")
        const body = document.body.innerText || "";
        if (body.includes("Пин создан") || body.includes("Pin created") ||
            body.includes("Ваш пин опубликован") || body.includes("Your Pin has been published")) return true;
        return false;
      }, { timeout: 90000 });
      plog("  ✓ Publish confirmed (page changed)");
    } catch {
      // Таймаут — делаем скрин чтобы понять состояние
      plog("  ⚠️  Timeout waiting for confirmation — may still be uploading");
    }

    await page.screenshot({ path: `/tmp/pinterest-done-${lang}.png` });
    plog(`  📸 /tmp/pinterest-done-${lang}.png`);
    plog(`  ✅ Pinterest [${lang.toUpperCase()}] опубликован!`);
    notify("Skily Video Maker", `✅ Pinterest ${lang.toUpperCase()} опубликован`);

  } catch(e) {
    const screenshotPath = `/tmp/pinterest-error-${lang}-${Date.now()}.png`;
    try { await page.screenshot({ path: screenshotPath }); } catch {}
    plog(`  ❌ Pinterest [${lang.toUpperCase()}] error: ${e.message}`);
    plog(`  📸 ${screenshotPath}`);
    notify("Skily Video Maker", `❌ Pinterest ${lang.toUpperCase()} ошибка: ${e.message.slice(0, 60)}`);
    failures.push(`Pinterest [${lang.toUpperCase()}]: ${e.message}`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

(async () => {
  if (!esVideo && !ruVideo) {
    plog("Usage: node scripts/auto-publish.js --es path/to/video-es.mp4 [--ru path/to/video-ru.mp4]");
    process.exit(1);
  }

  if (!fs.existsSync(CHROME_PATH)) {
    plog(`❌ Chrome not found at: ${CHROME_PATH}`);
    process.exit(1);
  }

  plog("🚀 Starting Skily Auto-Publisher...");
  plog(`   ES video: ${esVideo || "(none)"} → auth: auth-state-es.json`);
  plog(`   RU video: ${ruVideo || "(none)"} → auth: auth-state-ru.json`);

  // ── ES: Spanish accounts ───────────────────────────────────────────────────
  if (esVideo) {
    plog("\n── ES accounts (Spanish audience) ──");
    const ctxES = await launchContext(AUTH_ES);
    try {
      if (!skipTikTok)    await uploadTikTok(ctxES,    path.resolve(esVideo), "es");
      if (!skipYouTube)   await uploadYouTube(ctxES,   path.resolve(esVideo), "es");
      if (!skipInstagram) await uploadInstagram(ctxES, path.resolve(esVideo), "es");
    } finally {
      await ctxES.close();
    }
    // Facebook and Pinterest open their own Chrome — close shared context first to free RAM
    if (!skipFacebook) {
      await uploadFacebook(path.resolve(esVideo), "es").catch(e => {
        plog(`  ❌ Facebook ES failed: ${e.message}`);
        failures.push(`Facebook ES: ${e.message.slice(0, 80)}`);
      });
    }
    if (!skipPinterest) {
      await uploadPinterest(path.resolve(esVideo), "es").catch(e => {
        plog(`  ❌ Pinterest ES failed: ${e.message}`);
        failures.push(`Pinterest ES: ${e.message.slice(0, 80)}`);
      });
    }
    await delay(3000);
  }

  // ── RU: Expat accounts ─────────────────────────────────────────────────────
  if (ruVideo) {
    plog("\n── RU accounts (Expat audience) ──");
    const ctxRU = await launchContext(AUTH_RU);
    try {
      if (!skipTikTok)    await uploadTikTok(ctxRU,    path.resolve(ruVideo), "ru");
      if (!skipYouTube)   await uploadYouTube(ctxRU,   path.resolve(ruVideo), "ru");
      if (!skipInstagram) await uploadInstagram(ctxRU, path.resolve(ruVideo), "ru");
    } finally {
      await ctxRU.close();
    }
    // Facebook and Pinterest open their own Chrome — close shared context first to free RAM
    if (!skipFacebook) {
      await uploadFacebook(path.resolve(ruVideo), "ru").catch(e => {
        plog(`  ❌ Facebook RU failed: ${e.message}`);
        failures.push(`Facebook RU: ${e.message.slice(0, 80)}`);
      });
    }
    if (!skipPinterest) {
      await uploadPinterest(path.resolve(ruVideo), "ru").catch(e => {
        plog(`  ❌ Pinterest RU failed: ${e.message}`);
        failures.push(`Pinterest RU: ${e.message.slice(0, 80)}`);
      });
    }
  }

  if (failures.length > 0) {
    plog(`\n⚠️  ${failures.length} upload(s) failed:`);
    failures.forEach(f => plog(`   ✗ ${f}`));
    notify("Skily Video Maker", `⚠️ ${failures.length} ошибок публикации — см. auto-publish.log`);
  } else {
    plog("\n✅ Auto-publisher finished — all uploads succeeded.");
    notify("Skily Video Maker", "✅ Все видео опубликованы!");
  }
})();
