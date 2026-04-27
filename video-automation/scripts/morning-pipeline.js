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

// Load .env
try {
  fs.readFileSync(path.join(ROOT, ".env"), "utf-8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://yffjnqegeiorunyvcxkn.supabase.co";
// Use anon key for reading questions (same as picker-server.js)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA";

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
  // Load published log to skip already-published questions
  const logPath = path.join(RENDERS_DIR, "published-log.json");
  let published = [];
  try { published = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch {}
  const publishedIds = published.map(p => p.id);

  // Fetch questions ordered by difficulty (hardest first = lowest percent_correct)
  // Table: questions_new, country=es for DGT questions
  const cols = "id,question_es,explanation_es,question_ru,explanation_ru,percent_correct,difficulty,image_url,topic_id";
  const filter = `country=eq.es&question_es=not.is.null&order=percent_correct.asc&limit=20`;

  const rows = await supabaseRequest("GET", `/questions_new?select=${cols}&${filter}`);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No questions available from Supabase");
  }

  // Skip already published ones
  const unpublished = rows.filter(r => !publishedIds.includes(r.id));
  const question = unpublished.length > 0 ? unpublished[0] : rows[0];

  // Also fetch answer options
  const answers = await supabaseRequest("GET",
    `/answer_options?select=id,question_id,text_es,text_ru,is_correct,position&question_id=eq.${question.id}&order=position.asc`
  );

  return {
    ...question,
    question:      question.question_es,
    explanation:   question.explanation_es,
    question_ru:   question.question_ru,
    explanation_ru: question.explanation_ru,
    answer_options: Array.isArray(answers) ? answers.map(a => ({
      id: a.id, text: a.text_es, text_ru: a.text_ru, is_correct: a.is_correct, position: a.position,
    })) : [],
  };
}

async function markPublished(questionId) {
  // Write to a local published log (Supabase update optional — add column if needed)
  const logPath = path.join(RENDERS_DIR, "published-log.json");
  let published = [];
  try { published = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch {}
  published.push({ id: questionId, publishedAt: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(published, null, 2));
  log(`Marked ${questionId} as published`);
}

// ── Series number ─────────────────────────────────────────────────────────────
function getNextSeriesNumber() {
  let state = { ru: 1, es: 1 };
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")); } catch {}
  const num = state.es || 1;
  state.es = num + 1;
  state.ru = (state.ru || 1) + 1;
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
    }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => { try { resolve(JSON.parse(buf)); } catch { resolve({ error: buf }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Build video question object ───────────────────────────────────────────────
function buildVideoQuestion(q, seriesNumber) {
  const hookTemplates = {
    easy:   { es: "¿Lo sabrías contestar?", ru: "Угадаешь ответ?" },
    medium: { es: "¡Falla el 40% en DGT!", ru: "40% не знают это!" },
    hard:   { es: "¡Solo 1 de 4 acierta!", ru: "Только 25% правы!" },
  };
  const pct = q.percent_correct || 50;
  const level = pct < 40 ? "hard" : pct < 70 ? "medium" : "easy";
  const hook = hookTemplates[level];

  return {
    ...q,
    series_number: seriesNumber,
    hook_title: hook.es,
    hook_title_ru: hook.ru,
    explanation: q.explanation || "",
    explanationRu: q.explanation_ru || q.explanation || "",
    question_ru: q.question_ru || q.question,
    show_explanation: true,
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
(async () => {
  log("═══════════════════════════════════════════");
  log("🌅 Morning pipeline started");
  notify("Skily Video Maker", "🌅 Начинаю утренний конвейер...");

  fs.mkdirSync(RENDERS_DIR, { recursive: true });

  try {
    // 1. Pick question
    log("📋 Fetching question from Supabase...");
    const question = await fetchNextQuestion();
    log(`   Got: "${question.question.slice(0, 60)}..."`);

    const seriesNumber = getNextSeriesNumber();
    const videoQuestion = buildVideoQuestion(question, seriesNumber);

    const numStr = String(seriesNumber).padStart(4, "0");
    const outputES = path.join(RENDERS_DIR, `auto-${numStr}-${question.id}-es.mp4`);
    const outputRU = path.join(RENDERS_DIR, `auto-${numStr}-${question.id}-ru.mp4`);

    // 2. Try to render via picker-server API (if running), else direct
    log("🎬 Rendering videos...");
    let renderOk = false;

    try {
      const result = await Promise.race([
        renderViaApi(videoQuestion),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      if (result.output) {
        log(`   ✅ ES: ${result.output}`);
        if (result.outputRU) log(`   ✅ RU: ${result.outputRU}`);
        renderOk = true;
        // Use paths from API response
        Object.assign(outputES, result.output);
        Object.assign(outputRU, result.outputRU || outputRU);
      }
    } catch {
      log("   picker-server not running — rendering directly with Remotion");
    }

    if (!renderOk) {
      renderDirect(videoQuestion, outputES, "VideoTemplate");
      log(`   ✅ ES rendered: ${outputES}`);
      renderDirect(videoQuestion, outputRU, "VideoTemplateRU");
      log(`   ✅ RU rendered: ${outputRU}`);
    }

    // 3. Save publish-data.json for auto-publish.js
    const pubData = {
      es: {
        hookTitle: videoQuestion.hook_title,
        question: videoQuestion.question,
        explanation: videoQuestion.explanation,
        seriesNumber,
        videoPath: outputES,
      },
      ru: {
        hookTitle: videoQuestion.hook_title_ru,
        question: videoQuestion.question_ru,
        explanation: videoQuestion.explanationRu,
        seriesNumber,
        videoPath: outputRU,
      },
      renderedAt: new Date().toISOString(),
    };
    fs.writeFileSync(PUBLISH_DATA_FILE, JSON.stringify(pubData, null, 2));
    log("📄 publish-data.json saved");

    notify("Skily Video Maker", "🎬 Видео готово, начинаю публикацию...");

    // 4. Run auto-publish
    log("📤 Starting auto-publisher...");
    const publishArgs = [
      path.join(__dirname, "auto-publish.js"),
      "--es", outputES,
      "--ru", outputRU,
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn(NODE, publishArgs, {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, PATH: `/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:${process.env.PATH}` },
      });
      proc.on("close", code => code === 0 ? resolve() : reject(new Error(`auto-publish exited with code ${code}`)));
    });

    // 5. Mark as published
    await markPublished(question.id);

    log("🎉 Morning pipeline complete!");
    notify("Skily Video Maker", "🎉 Конвейер завершён! Все видео опубликованы.");

  } catch(e) {
    log(`❌ Pipeline error: ${e.message}`);
    log(e.stack || "");
    notify("Skily Video Maker", `❌ Ошибка конвейера: ${e.message.slice(0, 80)}`);
    process.exit(1);
  }
})();
