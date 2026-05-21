/**
 * morning-pipeline.js
 * Full automated daily pipeline:
 *   1. Picks next unrendered question from Supabase
 *   2. Generates TTS audio + renders ES and RU videos via Remotion
 *   3. Saves publish-data.json with captions
 *   4. Calls auto-publish.js to upload to TikTok, YouTube, Instagram
 *   5. Marks question as published in Supabase
 *
 * Run manually: node scripts/morning-pipeline.js
 * Scheduled:    via macOS LaunchAgent (see install-scheduler.sh)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs   = require("fs");
const https = require("https");

// ── Config ────────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, "..");
const RENDERS_DIR = path.join(ROOT, "renders");
const PUBLISH_DATA_FILE = path.join(RENDERS_DIR, "publish-data.json");
const STATE_FILE = path.join(RENDERS_DIR, "series-state.json");
const LOG_FILE = path.join(ROOT, "morning-pipeline.log");
const LOCK_FILE = path.join(ROOT, "pipeline.lock");

// ── Lock: prevent concurrent pipeline runs ────────────────────────────────────
if (fs.existsSync(LOCK_FILE)) {
  const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
  if (lockAge < 90 * 60 * 1000) { // 90-minute max run time
    const pid = fs.readFileSync(LOCK_FILE, "utf-8").trim();
    console.log(`[${new Date().toISOString()}] ⏭  Pipeline already running (pid ${pid}, ${Math.round(lockAge/60000)}m ago) — skipping.`);
    process.exit(0);
  }
  // Stale lock — remove and continue
  fs.unlinkSync(LOCK_FILE);
}
fs.writeFileSync(LOCK_FILE, String(process.pid));
process.on("exit", () => { try { fs.unlinkSync(LOCK_FILE); } catch {} });
process.on("SIGINT", () => process.exit(1));
process.on("SIGTERM", () => process.exit(1));

// Load .env
try {
  fs.readFileSync(path.join(ROOT, ".env"), "utf-8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://yffjnqegeiorunyvcxkn.supabase.co";
// Используем service key если он реальный JWT, иначе — anon key
const _rawKey = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_KEY = (_rawKey && _rawKey.startsWith("eyJ"))
  ? _rawKey
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA";

const NODE = "/Users/dimka/.nvm/versions/node/v24.11.0/bin/node";
const NPX  = "/Users/dimka/.nvm/versions/node/v24.11.0/bin/npx";

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch {}
}

function notify(title, message) {
  try {
    execSync(`osascript -e 'display notification "${message.replace(/'/g, "\\'")}" with title "${title.replace(/'/g, "\\'")}"'`);
  } catch {}
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function supabaseRequest(method, restPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const fullPath = `/rest/v1${restPath}`;
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: fullPath,
      method,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve(buf); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function fetchNextQuestion() {
  // Pick next question not yet published as video.
  // Tracking stored in metadata->video_published_at in Supabase — survives local file deletion.
  // Order: percent_correct ASC (hardest/most-failed questions first = most educational value).
  const cols = "id,question_es,explanation_es,question_ru,explanation_ru,percent_correct,difficulty,image_url,topic_id,metadata";
  const filter = [
    "country=eq.es",
    "question_es=not.is.null",
    "metadata->>video_published_at=is.null",  // not yet published as video
    "order=percent_correct.asc",
    "limit=1",
  ].join("&");

  // Always load local log — cross-reference guards against Supabase mark failures (e.g. ENOTFOUND)
  const logPath = path.join(RENDERS_DIR, "published-log.json");
  let localPublished = [];
  try { localPublished = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch {}
  const localPublishedIds = new Set(localPublished.map(p => p.id));

  const rows = await supabaseRequest("GET", `/questions_new?select=${cols}&${filter}`);

  // Filter out any Supabase results that are already in the local log
  // (happens when previous Supabase PATCH failed mid-run — e.g. ENOTFOUND)
  const freshRows = Array.isArray(rows) ? rows.filter(r => !localPublishedIds.has(r.id)) : [];

  let question;
  if (freshRows.length === 0) {
    log("  ⚠️  No fresh questions from Supabase filter — using local fallback");
    const all = await supabaseRequest("GET",
      `/questions_new?select=${cols}&country=eq.es&question_es=not.is.null&order=percent_correct.asc&limit=50`
    );
    if (!Array.isArray(all) || all.length === 0) throw new Error("No questions in Supabase");
    question = all.find(r => !localPublishedIds.has(r.id)) || all[0];
  } else {
    question = freshRows[0];
  }

  // Fetch answer options
  const answers = await supabaseRequest("GET",
    `/answer_options?select=id,question_id,text_es,text_ru,is_correct,position&question_id=eq.${question.id}&order=position.asc`
  );

  return {
    ...question,
    question:      question.question_es,
    explanation:   question.explanation_es,
    question_ru:   question.question_ru  || "",
    explanation_ru: question.explanation_ru || question.explanation_es,
    answer_options: Array.isArray(answers) ? answers.map(a => ({
      id: a.id, text: a.text_es || "", text_ru: a.text_ru || "", is_correct: a.is_correct, position: a.position,
    })) : [],
  };
}

// Retry any Supabase marks that failed in previous runs (e.g. ENOTFOUND during markPublished)
async function repairFailedMarks() {
  const logPath = path.join(RENDERS_DIR, "published-log.json");
  let published = [];
  try { published = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch { return; }
  if (published.length === 0) return;

  // Check last 5 local entries against Supabase — these are the only ones that could have failed recently
  const recent = published.slice(-5);
  const ids = recent.map(p => p.id);
  let stale;
  try {
    stale = await supabaseRequest("GET",
      `/questions_new?select=id,metadata&id=in.(${ids.join(",")})&metadata->>video_published_at=is.null`
    );
  } catch { return; }

  if (!Array.isArray(stale) || stale.length === 0) return;

  log(`  🔧 Repairing ${stale.length} failed Supabase mark(s)...`);
  for (const row of stale) {
    const entry = published.slice().reverse().find(p => p.id === row.id);
    if (!entry) continue;
    try {
      await supabaseRequest("PATCH", `/questions_new?id=eq.${row.id}`,
        { metadata: { video_published_at: entry.publishedAt, video_series_es: entry.seriesNumber, video_series_ru: entry.seriesNumber } }
      );
      log(`  ✅ Repaired mark: ${row.id} (series #${entry.seriesNumber})`);
    } catch(e) {
      log(`  ⚠️  Repair failed for ${row.id}: ${e.message}`);
    }
  }
}

async function markPublished(questionId, seriesNumber) {
  const now = new Date().toISOString();

  // 1. Save to Supabase metadata (primary — survives local file deletion)
  try {
    await supabaseRequest("PATCH",
      `/questions_new?id=eq.${questionId}`,
      { metadata: { video_published_at: now, video_series_es: seriesNumber, video_series_ru: seriesNumber } }
    );
    log(`  ✅ Marked in Supabase: ${questionId} (series #${seriesNumber})`);
  } catch(e) {
    log(`  ⚠️  Supabase mark failed: ${e.message}`);
  }

  // 2. Also save locally as backup
  const logPath = path.join(RENDERS_DIR, "published-log.json");
  let published = [];
  try { published = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch {}
  published.push({ id: questionId, seriesNumber, publishedAt: now });
  fs.writeFileSync(logPath, JSON.stringify(published, null, 2));
}

// ── Series number ─────────────────────────────────────────────────────────────
function getNextSeriesNumber() {
  // Primary: count already published videos in Supabase (always accurate)
  // Fallback: local series-state.json
  let state = { es: 1 };
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); } catch {}
  const num = state.es || 1;
  state.es = num + 1;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  return num;
}

// ── Start picker-server and wait until ready ──────────────────────────────────
let pickerProc = null;

async function startPickerServer() {
  return new Promise((resolve) => {
    // Check if already running
    const http = require("http");
    const check = () => {
      http.get("http://localhost:3334/api/questions?limit=1", res => {
        res.resume();
        resolve(true);
      }).on("error", () => resolve(false));
    };
    check();
  }).then(async (running) => {
    if (running) { log("  picker-server already running"); return; }
    log("  Starting picker-server...");
    pickerProc = spawn(NODE, [path.join(ROOT, "picker-server.js")], {
      cwd: ROOT, stdio: "pipe",
      env: { ...process.env, PATH: `/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:${process.env.PATH}` },
    });
    // Wait up to 15s for server to be ready
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const ready = await new Promise(res => {
        const http = require("http");
        http.get("http://localhost:3334/api/questions?limit=1", r => { r.resume(); res(true); }).on("error", () => res(false));
      });
      if (ready) { log("  picker-server ready"); return; }
    }
    throw new Error("picker-server failed to start");
  });
}

function stopPickerServer() {
  if (pickerProc) { pickerProc.kill(); pickerProc = null; log("  picker-server stopped"); }
}

// ── Render via picker-server API ──────────────────────────────────────────────
async function renderViaApi(question) {
  const http = require("http");
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ question });
    const req = http.request({
      hostname: "localhost", port: 3334, path: "/api/render", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: 30 * 60 * 1000, // 30 минут — рендер + Gemini + TTS
    }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => { try { resolve(JSON.parse(buf)); } catch { resolve({ error: buf }); } });
    });
    req.on("timeout", () => { req.destroy(new Error("Render API timeout (30min)")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Build video question object ───────────────────────────────────────────────
// ES always uses bg1, RU always uses bg2 — guarantees different visual fingerprint.
// On odd series numbers the assignment swaps so feeds look varied over time.
const BG_VIDEOS = ["backgrounds/bg1.mp4", "backgrounds/bg2.mp4"];

function buildVideoQuestion(q, seriesNumber) {
  // VideoTemplate.tsx uses q.language ("es"/"ru") — not q.country
  const language = q.country === "russia" ? "ru" : "es";

  // ES and RU always use DIFFERENT backgrounds to avoid TikTok duplicate detection
  const bgIndex = seriesNumber % 2;
  const backgroundVideoES = BG_VIDEOS[bgIndex];
  const backgroundVideoRU = BG_VIDEOS[1 - bgIndex];

  return {
    ...q,
    language,
    series_number: seriesNumber,
    // hook_title НЕ задаём — picker-server сгенерирует через Gemini
    explanation: q.explanation || "",
    explanationRu: q.explanation_ru || q.explanation || "",
    question_ru: q.question_ru || q.question,
    show_explanation: true,
    backgroundVideo: backgroundVideoES,
    backgroundVideoRU,
  };
}

// ── ffmpeg: re-encode RU video with subtle visual variation ───────────────────
// Changes the perceptual hash so TikTok doesn't flag it as duplicate of ES video.
// Applies a slight warm color grade + different CRF — invisible to human eye.
const FFMPEG = "/opt/homebrew/bin/ffmpeg";

function reencodeRU(inputPath) {
  const outputPath = inputPath.replace(".mp4", "-ru-final.mp4");
  // Slight warm hue shift (+5°), saturation +5%, brightness +1.5%, different CRF
  const cmd = `${FFMPEG} -y -i "${inputPath}" \
    -vf "hue=h=5:s=1.05,eq=brightness=0.015:contrast=1.02" \
    -c:v libx264 -crf 26 -preset fast \
    -c:a aac -b:a 192k \
    "${outputPath}" 2>&1`;
  log("  🎨 Re-encoding RU with color variation...");
  try {
    execSync(cmd, { timeout: 120000 });
    log(`  ✅ RU re-encoded: ${path.basename(outputPath)}`);
    return outputPath;
  } catch(e) {
    log(`  ⚠️  ffmpeg re-encode failed (using original): ${e.message.slice(0, 100)}`);
    return inputPath;
  }
}

// ── Delayed RU publish (runs in background, exits independently) ──────────────
const RU_DELAY_HOURS = 4;

function scheduleRUPublish(ruVideoPath) {
  const delayMs = RU_DELAY_HOURS * 60 * 60 * 1000;
  const fireAt = new Date(Date.now() + delayMs).toISOString();
  log(`  ⏰ RU publish scheduled for ${fireAt} (${RU_DELAY_HOURS}h from now)`);

  // Spawn a detached background process that sleeps then publishes
  const script = `
    setTimeout(() => {
      const { execSync } = require('child_process');
      const fs = require('fs');
      const logFile = '${LOG_FILE.replace(/\\/g, "\\\\")}';
      const ts = () => new Date().toISOString();
      const log = (m) => { const l = '[' + ts() + '] ' + m; console.log(l); try { fs.appendFileSync(logFile, l + '\\n'); } catch {} };
      log('⏰ Firing delayed RU publish...');
      try {
        execSync('${NODE} ${path.join(__dirname, "auto-publish.js").replace(/\\/g, "\\\\")} --ru "${ruVideoPath.replace(/\\/g, "\\\\")}" --skip-youtube --skip-instagram', {
          cwd: '${ROOT.replace(/\\/g, "\\\\")}',
          stdio: 'inherit',
          timeout: 600000,
        });
        log('✅ Delayed RU publish done.');
      } catch(e) { log('❌ Delayed RU publish error: ' + e.message); }
    }, ${delayMs});
  `;

  const child = spawn(NODE, ["-e", script], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PATH: `/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:${process.env.PATH}` },
  });
  child.unref(); // let parent exit independently
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
(async () => {
  log("═══════════════════════════════════════════");
  log("🌅 Morning pipeline started");
  notify("Skily Video Maker", "🌅 Начинаю утренний конвейер...");

  fs.mkdirSync(RENDERS_DIR, { recursive: true });

  try {
    // 0. Repair any Supabase marks that failed in previous runs (e.g. ENOTFOUND)
    await repairFailedMarks();

    // 1. Pick question
    log("📋 Fetching question from Supabase...");
    const question = await fetchNextQuestion();
    log(`   Got: "${question.question.slice(0, 60)}..."`);

    const seriesNumber = getNextSeriesNumber();
    const videoQuestion = buildVideoQuestion(question, seriesNumber);

    const numStr = String(seriesNumber).padStart(4, "0");
    const outputES = path.join(RENDERS_DIR, `auto-${numStr}-${question.id}-es.mp4`);
    const outputRU = path.join(RENDERS_DIR, `auto-${numStr}-${question.id}-ru.mp4`);

    // 2. Render via picker-server API (start it if needed)
    log("🎬 Rendering videos...");
    await startPickerServer();

    const result = await renderViaApi(videoQuestion);
    if (!result.output) {
      // Log the actual Remotion error for debugging
      if (result.logs) {
        const errorLines = result.logs.split("\n").filter(l => /error|TypeError|Cannot|failed/i.test(l)).slice(0, 10);
        log("  Remotion logs:\n" + errorLines.join("\n"));
      }
      throw new Error("Render failed: " + (result.error || JSON.stringify(result)));
    }

    const finalES = result.output;
    let finalRU = result.outputRU || null;
    log(`   ✅ ES: ${finalES}`);
    if (finalRU) log(`   ✅ RU: ${finalRU}`);

    stopPickerServer();

    // 2b. Re-encode RU with subtle color variation to avoid TikTok duplicate detection
    if (finalRU) {
      finalRU = reencodeRU(finalRU);
    }

    // 3. Save publish-data.json for auto-publish.js
    // hook_title берём из ответа render API (там уже Gemini-версия)
    const finalHookEs = result.hookTitle || videoQuestion.hook_title || "";
    const finalHookRu = result.hookTitleRu || result.hookTitle || videoQuestion.hook_title || "";

    // 3a. Генерируем YouTube-заголовки через Gemini (SEO-оптимизированные под поиск)
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const geminiModel = "gemini-3.1-flash-lite-preview";
    async function geminiYouTubeTitle(question, explanation, lang) {
      if (!geminiKey) return null;
      const isRu = lang === "ru";
      const prompt = isRu
        ? `Ты эксперт по YouTube SEO для канала о подготовке к экзамену по вождению в Испании (ПДД DGT).
Напиши ОДИН заголовок для YouTube Shorts (до 70 символов).
Требования:
- Содержит конкретную тему вопроса (что именно проверяется)
- Включает ключевые слова которые ищут: "DGT", "экзамен вождения", "ПДД Испании" или подобные
- Создаёт интригу или вопрос (но не кликбейт)
- НЕ пиши "40% не знают" — только конкретная тема
- Только заголовок, без кавычек, без пояснений

Вопрос: ${question}
Объяснение: ${explanation?.slice(0, 200)}`
        : `Eres experto en SEO de YouTube para un canal sobre el examen de conducir DGT.
Escribe UN título para YouTube Shorts (máximo 70 caracteres).
Requisitos:
- Menciona el tema concreto de la pregunta
- Incluye palabras clave buscadas: "DGT", "examen conducir", "carnet" o similares
- Genera curiosidad o pregunta (sin clickbait)
- NO escribas "el 40% no sabe" — solo el tema concreto
- Solo el título, sin comillas, sin explicaciones

Pregunta: ${question}
Explicación: ${explanation?.slice(0, 200)}`;

      const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
      return new Promise((resolve) => {
        const req = https.request({
          hostname: "generativelanguage.googleapis.com",
          path: `/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        }, (res) => {
          const chunks = [];
          res.on("data", c => chunks.push(c));
          res.on("end", () => {
            try {
              const json = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              resolve(text ? text.slice(0, 70) : null);
            } catch { resolve(null); }
          });
        });
        req.on("error", () => resolve(null));
        req.write(body);
        req.end();
      });
    }

    // 3b. Генерируем caption insight — 2-3 строки "чит-кода" для TikTok/IG/FB
    async function geminiCaptionInsight(question, explanation, lang) {
      if (!geminiKey) return null;
      const isRu = lang === "ru";
      const prompt = isRu
        ? `Ты эксперт по контенту для TikTok и Instagram Reels.
Для ролика о правилах вождения DGT напиши 2-3 строки с конкретным "чит-кодом" — самой полезной информацией из объяснения.
Формат: каждая строка начинается с эмодзи (суть, не украшение), затем краткий факт.
Требования:
- Максимум 3 строки
- Конкретные факты, знаки (P-23, P-24 и т.д.) если упоминаются
- Ключевой ответ — почему один вариант правильный
- Без вступления, без воды
- Только строки, без заголовков и пояснений

Вопрос: ${question}
Объяснение: ${explanation?.slice(0, 300)}`
        : `Eres experto en contenido para TikTok y Instagram Reels.
Para un vídeo sobre las normas DGT escribe 2-3 líneas con el "cheat code" — la información más útil del tema.
Formato: cada línea empieza con un emoji (de contenido, no decorativo), luego un dato concreto.
Requisitos:
- Máximo 3 líneas
- Datos concretos, señales (P-23, P-24, etc.) si se mencionan
- La clave de por qué esa respuesta es correcta
- Sin introducción, sin relleno
- Solo las líneas, sin títulos ni explicaciones

Pregunta: ${question}
Explicación: ${explanation?.slice(0, 300)}`;

      const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
      return new Promise((resolve) => {
        const req = https.request({
          hostname: "generativelanguage.googleapis.com",
          path: `/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        }, (res) => {
          const chunks = [];
          res.on("data", c => chunks.push(c));
          res.on("end", () => {
            try {
              const json = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              resolve(text ? text.slice(0, 400) : null);
            } catch { resolve(null); }
          });
        });
        req.on("error", () => resolve(null));
        req.write(body);
        req.end();
      });
    }

    log("🤖 Generating YouTube titles + caption insights via Gemini...");
    const [ytTitleEs, ytTitleRu, captionInsightEs, captionInsightRu] = await Promise.all([
      geminiYouTubeTitle(videoQuestion.question, videoQuestion.explanation, "es"),
      geminiYouTubeTitle(
        videoQuestion.question_ru || videoQuestion.question,
        videoQuestion.explanationRu || videoQuestion.explanation,
        "ru"
      ),
      geminiCaptionInsight(videoQuestion.question, videoQuestion.explanation, "es"),
      geminiCaptionInsight(
        videoQuestion.question_ru || videoQuestion.question,
        videoQuestion.explanationRu || videoQuestion.explanation,
        "ru"
      ),
    ]);
    if (ytTitleEs) log(`   📺 YouTube ES: "${ytTitleEs}"`);
    if (ytTitleRu) log(`   📺 YouTube RU: "${ytTitleRu}"`);
    if (captionInsightEs) log(`   💡 Caption ES: "${captionInsightEs.split("\n")[0]}..."`);
    if (captionInsightRu) log(`   💡 Caption RU: "${captionInsightRu.split("\n")[0]}..."`);

    const pubData = {
      es: {
        hookTitle:        finalHookEs,
        youtubeTitle:     ytTitleEs || finalHookEs,
        captionInsight:   captionInsightEs || null,
        question:         videoQuestion.question,
        explanation:      videoQuestion.explanation,
        seriesNumber,
        videoPath:        finalES,
      },
      ru: {
        hookTitle:        finalHookRu,
        youtubeTitle:     ytTitleRu || finalHookRu,
        captionInsight:   captionInsightRu || null,
        question:         videoQuestion.question_ru || videoQuestion.question,
        explanation:      videoQuestion.explanationRu || videoQuestion.explanation,
        seriesNumber,
        videoPath:        finalRU,
      },
      renderedAt: new Date().toISOString(),
    };
    fs.writeFileSync(PUBLISH_DATA_FILE, JSON.stringify(pubData, null, 2));
    log("📄 publish-data.json saved");

    notify("Skily Video Maker", "🎬 Видео готово, начинаю публикацию...");

    // 4. Publish strategy: ES и RU → все платформы сразу

    const runPublish = (args, label) => new Promise((resolve, reject) => {
      log(`📤 ${label}`);
      const proc = spawn(NODE, [path.join(__dirname, "auto-publish.js"), ...args], {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, PATH: `/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:${process.env.PATH}` },
      });
      proc.on("close", code => code === 0 ? resolve() : reject(new Error(`auto-publish exited with code ${code}`)));
    });

    // ES → TikTok + YouTube + Instagram
    await runPublish(["--es", finalES], "Publishing ES to all platforms...");

    // RU → TikTok + YouTube + Instagram (сразу, без задержки)
    if (finalRU) {
      await runPublish(["--ru", finalRU], "Publishing RU to all platforms...");
    }

    // 5. Mark as published in Supabase + local log
    await markPublished(question.id, seriesNumber);

    log("🎉 Morning pipeline complete!");
    notify("Skily Video Maker", "🎉 Конвейер завершён! Все видео опубликованы.");

  } catch(e) {
    log(`❌ Pipeline error: ${e.message}`);
    log(e.stack || "");
    notify("Skily Video Maker", `❌ Ошибка конвейера: ${e.message.slice(0, 80)}`);
    process.exit(1);
  }
})();
