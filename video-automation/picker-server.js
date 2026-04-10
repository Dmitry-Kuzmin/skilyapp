/**
 * picker-server.js — Question Picker for video generation
 * Port 3334 — http://localhost:3334
 *
 * Allows browsing real questions from Supabase and rendering videos.
 */

const http   = require("http");
const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const { execSync, spawn } = require("child_process");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

// Load .env so ELEVENLABS_API_KEY is available
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  }
} catch {}

const PORT = 3334;
const SUPABASE_URL = "https://yffjnqegeiorunyvcxkn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDQyMTYsImV4cCI6MjA3ODA4MDIxNn0.PPYZpFYOizWxpyPp4JH7G9oTU33KDhoViwEIKUZZbLA";
const RENDERS_DIR  = path.join(__dirname, "renders");
const AUDIO_DIR    = path.join(__dirname, "public/audio");
const SELECTED_FILE = path.join(RENDERS_DIR, "selected-question.json");

fs.mkdirSync(RENDERS_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR,   { recursive: true });

// ── Microsoft Edge TTS (бесплатно, испанский + русский fallback) ──────────────
const EDGE_VOICE_ES = process.env.EDGE_VOICE_ES || "es-ES-AlvaroNeural";
const EDGE_VOICE_RU = process.env.EDGE_VOICE_RU || "ru-RU-SvetlanaNeural";
async function edgeSynth(text, voice, filePath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);
  const chunks = [];
  audioStream.on("data", c => chunks.push(c));
  await new Promise((res, rej) => { audioStream.on("end", res); audioStream.on("error", rej); });
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(filePath, buf);
  return buf;
}

// ── ElevenLabs TTS (для русского голоса) ─────────────────────────────────────
// kwajW3Xh5svCeKU5ky2S — выбранный голос для русской озвучки (Eleven v3)
// Adam (pNInz6obpgDQGcFmaJgB) — резервный multilingual
const VOICE_RU = process.env.ELEVENLABS_VOICE_RU || "kwajW3Xh5svCeKU5ky2S";

// Build ordered list of API keys: ELEVENLABS_API_KEYS (comma-separated) first,
// then ELEVENLABS_API_KEY as fallback, dedup and filter empty.
const ELEVENLABS_KEYS = (() => {
  const multi = (process.env.ELEVENLABS_API_KEYS || "").split(",").map(s => s.trim()).filter(Boolean);
  const single = (process.env.ELEVENLABS_API_KEY || "").trim();
  const all = [...multi];
  if (single && !all.includes(single)) all.push(single);
  return all;
})();

let elevenLabsKeyIndex = 0; // tracks which key is currently active

function elevenLabsSynthWithKey(text, voiceId, apiKey) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      text,
      model_id: "eleven_v3",
      voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
    });

    const req = https.request({
      hostname: "api.elevenlabs.io",
      path: `/v1/text-to-speech/${voiceId}`,
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, audio: Buffer.concat(chunks) });
        } else {
          // 401 = invalid key, 429 = quota exhausted — both trigger fallback
          resolve({ ok: false, status: res.statusCode });
        }
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: "network", error: e.message }));
    req.write(body);
    req.end();
  });
}

async function elevenLabsSynth(text, voiceId) {
  if (ELEVENLABS_KEYS.length === 0) return null;

  // Try from current active key, rotate on failure
  for (let attempt = 0; attempt < ELEVENLABS_KEYS.length; attempt++) {
    const idx = (elevenLabsKeyIndex + attempt) % ELEVENLABS_KEYS.length;
    const key = ELEVENLABS_KEYS[idx];
    const result = await elevenLabsSynthWithKey(text, voiceId, key);
    if (result.ok) {
      if (attempt > 0) {
        elevenLabsKeyIndex = idx; // stick to the working key
        console.log(`  ↪ ElevenLabs: switched to key #${idx + 1}`);
      }
      return result.audio;
    }
    console.error(`  ✗ ElevenLabs key #${idx + 1} failed (HTTP ${result.status}${result.error ? ": " + result.error : ""}) — trying next`);
  }
  console.error("  ✗ All ElevenLabs keys exhausted");
  return null;
}

// ── Get MP3 duration via music-metadata (ESM, dynamic import) ────────────────
const MM_PATH = path.join(__dirname, "node_modules/music-metadata/lib/index.js");
async function getAudioDurationSec(filePath) {
  try {
    const mm = await import(MM_PATH);
    const meta = await mm.parseFile(filePath);
    if (meta.format.duration) return meta.format.duration;
  } catch {}
  // Fallback: ElevenLabs outputs 128kbps = 16KB/s
  try { return fs.statSync(filePath).size / 16_000; }
  catch { return 2.5; }
}

const ANSWER_PREFIX = {
  es: ["Opción uno: ", "Opción dos: ", "Opción tres: ", "Opción cuatro: "],
  ru: ["Вариант один: ", "Вариант два: ", "Вариант три: ", "Вариант четыре: "],
};

// ── TTS text preprocessing (fix abbreviation pronunciation) ──────────────────
function preprocessTTS(text, lang) {
  // Replace meaningful emoji with words BEFORE stripping all emoji
  if (lang === "ru") {
    text = text.replace(/✅/g, "да").replace(/❌/g, "нет").replace(/⚡/g, "").replace(/🤯/g, "").replace(/🚗/g, "").replace(/🏆/g, "").replace(/🎯/g, "");
  } else if (lang === "es") {
    text = text.replace(/✅/g, "sí").replace(/❌/g, "no").replace(/⚡/g, "").replace(/🤯/g, "").replace(/🚗/g, "").replace(/🏆/g, "").replace(/🎯/g, "");
  }

  // Strip ALL emoji and pictographs first (before any other processing)
  text = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "") // Emoji / pictographs (most emojis)
    .replace(/[\u{2600}-\u{27BF}]/gu, "")   // Misc symbols, dingbats
    .replace(/[\u{2300}-\u{23FF}]/gu, "")   // Technical symbols
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")   // Variation selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "") // Supplemental symbols
    .replace(/\uFE0F/g, "")                  // Emoji variation selector-16
    .replace(/\u200D/g, "")                  // Zero-width joiner
    .replace(/[\u2700-\u27BF]/g, "")         // Dingbats
    .replace(/\s{2,}/g, " ")
    .trim();

  if (lang === "es" || lang === "ru") {
    text = text
      // Latin abbreviations
      .replace(/\bkm\/h\b/gi, lang === "es" ? "kilómetros por hora" : "километров в час")
      .replace(/\bkm\b/gi,   lang === "es" ? "kilómetros" : "километров")
      .replace(/\bm\/s\b/gi, lang === "es" ? "metros por segundo" : "метров в секунду")
      .replace(/\bm\/h\b/gi, lang === "es" ? "metros por hora" : "метров в час")
      .replace(/\bcc\b/gi,   lang === "es" ? "centímetros cúbicos" : "кубических сантиметров")
      .replace(/\bDGT\b/g,   lang === "es" ? "D.G.T." : "Д-Ж-Т")
      // Strip markdown bold/italic that ElevenLabs reads literally
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      // Strip Unicode replacement chars (corrupted DB data)
      .replace(/\uFFFD+/g, "")
      .replace(/\s{2,}/g, " ");
  }
  // Для русского языка: транслитерация испанских терминов + ударения
  if (lang === "ru") {
    text = text
      // ── Испанские дорожные термины → русская фонетика ──────────────────────
      // TTS не умеет читать испанский в русском тексте — заменяем заранее
      .replace(/\bautopistas?\b/gi,         "аутописта")
      .replace(/\bautov[ií]as?\b/gi,        "аутовиа")
      .replace(/\bcarreteras?\b/gi,         "карретера")
      .replace(/\barc[eé]ns?\b/gi,          "арсен")
      .replace(/\bcalzadas?\b/gi,           "кальсада")
      .replace(/\bglorietas?\b/gi,          "глорьета")
      .replace(/\bavenidas?\b/gi,           "авенида")
      .replace(/\bcalles?\b/gi,             "калье")
      .replace(/\bv[ií]as?\b/gi,            "виа")
      .replace(/\badelantamientos?\b/gi,    "аделантамьенто")
      .replace(/\bcirculaci[oó]n\b/gi,      "сиркуласьон")
      .replace(/\bconductores?\b/gi,        "кондуктор")
      .replace(/\bceda el paso\b/gi,        "седа эль пасо")
      .replace(/\bpriori?dad\b/gi,          "приоридад")
      .replace(/\bpreferencia\b/gi,         "преференсья")
      .replace(/\bprohibici[oó]n\b/gi,      "прохибисьон")
      .replace(/\bprohibido\b/gi,           "прохибидо")
      .replace(/\bse[nñ]ales?\b/gi,         "сеньяль")
      .replace(/\bsem[aá]foros?\b/gi,       "семафоро")
      .replace(/\bveh[ií]culos?\b/gi,       "вехикуло")
      .replace(/\bvelocidad\b/gi,           "велосидад")
      .replace(/\bintersecciones?\b/gi,     "интерсексьон")
      .replace(/\bemergencias?\b/gi,        "эмерхенсья")
      .replace(/\btoneladas?\b/gi,          "тонелада")
      .replace(/\bpe[ao]t[oó]nes?\b/gi,     "пеатон")
      .replace(/\bcruce\b/gi,               "крусе")
      .replace(/\bfrenado\b/gi,             "френадо")
      .replace(/\bfrenos?\b/gi,             "френо")
      .replace(/\bdistancia\b/gi,           "дистансья")
      .replace(/\bmarcha\b/gi,              "марча")
      .replace(/\bzona\b/gi,                "сона")
      .replace(/\bcarriles?\b/gi,           "карриль")
      .replace(/\bm[aá]ximo\b/gi,           "максимо")
      .replace(/\bm[ií]nimo\b/gi,           "минимо")
      .replace(/\bturismo\b/gi,             "туризмо")
      .replace(/\bcami[oó]nes?\b/gi,        "камьон")
      .replace(/\bpuente\b/gi,              "пуэнте")
      .replace(/\bt[uú]nel\b/gi,            "тунель")
      .replace(/\baparcamiento\b/gi,        "апаркамьенто")
      .replace(/\bpaso\b/gi,                "пасо")
      .replace(/\bkilómetros?\b/gi,         "километров")
      .replace(/\bkilometros?\b/gi,         "километров")
      .replace(/\bmetros?\b/gi,             "метрос")
      // ── Математика / спец. символы ─────────────────────────────────────────
      .replace(/\s*=\s*/g,  " равно ")
      .replace(/\s*≥\s*/g,  " не менее ")
      .replace(/\s*≤\s*/g,  " не более ")
      .replace(/\s*>\s*/g,  " больше ")
      .replace(/\s*<\s*/g,  " меньше ")
      .replace(/\s*±\s*/g,  " плюс-минус ")
      .replace(/№/g,         "номер ")
      // ── Единицы ────────────────────────────────────────────────────────────
      .replace(/км\/ч/gi,   "километров в час")
      .replace(/м\/с/gi,    "метров в секунду")
      .replace(/км/gi,      "километров")
      .replace(/\bт\.е\.\b/gi, "то есть")
      .replace(/\bт\.к\.\b/gi, "так как")
      .replace(/\bпр\./gi,  "прочее")
      .replace(/\bул\./gi,  "улица")
      // ── Ударения — дорожная лексика ────────────────────────────────────────
      .replace(/\bеду\b/g,          "е́ду")
      .replace(/\bводы\b/g,         "во́ды")
      .replace(/\bдороги\b/g,       "доро́ги")
      .replace(/\bполосы\b/g,       "по́лосы")
      .replace(/\bзнаки\b/g,        "зна́ки")
      .replace(/\bдвижения\b/g,     "движе́ния")
      .replace(/\bсигналы\b/g,      "сигна́лы")
      .replace(/\bскорость\b/g,     "ско́рость")
      .replace(/\bскорости\b/g,     "ско́рости")
      .replace(/\bпроезда\b/g,      "прое́зда")
      .replace(/\bобочина\b/g,      "обочина́")
      .replace(/\bобочины\b/g,      "обочины́")
      .replace(/\bповорот\b/g,      "поворо́т")
      .replace(/\bповороты\b/g,     "повороты́")
      .replace(/\bсъезд\b/g,        "съе́зд")
      .replace(/\bперее́зд\b/g,      "переезд")
      .replace(/\bвъезд\b/g,        "въе́зд")
      .replace(/\bзапрещено\b/g,    "запрещено́")
      .replace(/\bразрешено\b/g,    "разрешено́")
      .replace(/\bоборудован\b/g,   "оборудо́ван")
      .replace(/\bзамок\b/g,        "замо́к")
      .replace(/\bпропасть\b/g,     "пропа́сть")
      // ── Финальная интонация ────────────────────────────────────────────────
      .replace(/([а-яёА-ЯЁ]{3,})\.$/, "$1,.")
      .replace(/([а-яёА-ЯЁ]{3,})\s*$/, "$1.");
  }
  return text.trim();
}


async function synth(text, voiceId, filePath, label, lang = "es") {
  if (!fs.existsSync(filePath)) {
    process.stdout.write(`  🎙 ${label}…`);
    const processed = preprocessTTS(text, lang);

    if (lang === "es") {
      // Spanish → Edge TTS only
      const audio = await edgeSynth(processed, EDGE_VOICE_ES, filePath).then(() => fs.readFileSync(filePath)).catch(() => null);
      if (audio) { process.stdout.write(` ✓ Edge/${EDGE_VOICE_ES} (${(audio.length/1024).toFixed(0)}KB)\n`); return getAudioDurationSec(filePath); }
      process.stdout.write(` ✗ Edge failed\n`); return null;
    }

    // Russian → try ElevenLabs first, fallback to Edge TTS (Dmitry)
    const elAudio = await elevenLabsSynth(processed, voiceId);
    if (elAudio) {
      fs.writeFileSync(filePath, elAudio);
      process.stdout.write(` ✓ ElevenLabs (${(elAudio.length/1024).toFixed(0)}KB)\n`);
      return getAudioDurationSec(filePath);
    }
    // ElevenLabs failed — use Edge TTS Russian voice
    process.stdout.write(` ↪ Edge fallback…`);
    const edgeAudio = await edgeSynth(processed, EDGE_VOICE_RU, filePath).then(() => fs.readFileSync(filePath)).catch(() => null);
    if (edgeAudio) { process.stdout.write(` ✓ Edge/${EDGE_VOICE_RU} (${(edgeAudio.length/1024).toFixed(0)}KB)\n`); return getAudioDurationSec(filePath); }
    process.stdout.write(` ✗ both TTS failed\n`);
    return null;
  }
  return getAudioDurationSec(filePath);
}

async function generateTTSForQuestion(question) {

  const lang    = question.language || "es";
  const voiceId = VOICE_RU;
  const id      = question.id;
  const result  = {};
  const prefixes = ANSWER_PREFIX[lang] || ANSWER_PREFIX.es;

  // Hook intro voiceover — separate files for RU and ES
  {
    const pct  = question.percent_correct || 50;
    const hKey = pct < 30 ? "vhard" : pct < 50 ? "hard"
               : (question.difficulty === "hard" ? "medium" : "easy");

    // Russian hook (for RU video — always generated)
    const ruHooksSuffix = {
      vhard: "Это не знает почти никто!",
      hard:  "Девяносто девять процентов водителей ошибаются.",
      medium:"Только опытные знают ответ.",
      easy:  "Проверь свои знания!",
    };
    // Пауза между предложениями — три точки (многоточие) заставляют Edge TTS сделать выраженную паузу
    const ruHookText = lang === "ru"
      ? `Вопрос по ПДД России... ${ruHooksSuffix[hKey]}`
      : `Вопрос по ПДД Испании... ${ruHooksSuffix[hKey]}`;
    const hPathRu = path.join(AUDIO_DIR, `${id}-ru-hook.mp3`);
    if (fs.existsSync(hPathRu)) fs.unlinkSync(hPathRu);
    const hDurRu = await synth(ruHookText, voiceId, hPathRu, "hook intro [RU]", "ru");
    if (hDurRu !== null) {
      result.hookAudioFileRu        = `audio/${id}-ru-hook.mp3`;
      result.hookAudioDurationSecRu = hDurRu;
    }

    // Spanish hook (only for ES DGT videos)
    if (lang === "es") {
      const esHooks = {
        vhard: "¡Pregunta DGT! ... Casi nadie sabe la respuesta.",
        hard:  "¡Pregunta DGT! ... El noventa y nueve por ciento de conductores falla.",
        medium:"¡Pregunta DGT! ... Solo los expertos lo saben.",
        easy:  "¡Pregunta DGT! ... Pon a prueba tu conocimiento.",
      };
      const hPathEs = path.join(AUDIO_DIR, `${id}-es-hook.mp3`);
      if (fs.existsSync(hPathEs)) fs.unlinkSync(hPathEs);
      const hDurEs = await synth(esHooks[hKey], null, hPathEs, "hook intro [ES]", "es");
      if (hDurEs !== null) {
        result.hookAudioFileEs        = `audio/${id}-es-hook.mp3`;
        result.hookAudioDurationSecEs = hDurEs;
      }
    }

    // Legacy single-field (for pure RU PDD or backward compat)
    result.hookAudioFile        = result.hookAudioFileRu;
    result.hookAudioDurationSec = result.hookAudioDurationSecRu;
  }

  // Question
  const qPath = path.join(AUDIO_DIR, `${id}-${lang}-question.mp3`);
  const qDur  = await synth(question.question, voiceId, qPath, "question", lang);
  if (qDur !== null) {
    result.questionAudioFile        = `audio/${id}-${lang}-question.mp3`;
    result.questionAudioDurationSec = qDur;
  }

  // Answer options
  const answerFiles = [], answerDurs = [];
  for (let i = 0; i < (question.answer_options || []).length; i++) {
    const text  = prefixes[i] + question.answer_options[i].text;
    const aPath = path.join(AUDIO_DIR, `${id}-${lang}-answer-${i}.mp3`);
    const dur   = await synth(text, voiceId, aPath, `answer ${i+1}`, lang);
    answerFiles.push(`audio/${id}-${lang}-answer-${i}.mp3`);
    answerDurs.push(dur ?? 2.5);
  }
  result.answerAudioFiles        = answerFiles;
  result.answerAudioDurationsSec = answerDurs;

  // Explanation (same language)
  const ePath = path.join(AUDIO_DIR, `${id}-${lang}-explanation.mp3`);
  const eDur  = await synth(question.explanation, voiceId, ePath, "explanation", lang);
  if (eDur !== null) {
    result.explanationAudioFile        = `audio/${id}-${lang}-explanation.mp3`;
    result.explanationAudioDurationSec = eDur;
  }

  // Russian explanation (for RU variant video)
  if (question.explanationRu) {
    const erPath = path.join(AUDIO_DIR, `${id}-ru-explanation.mp3`);
    const erDur  = await synth(question.explanationRu, VOICE_RU, erPath, "explanation [RU]", "ru");
    if (erDur !== null) {
      result.explanationRuAudioFile        = `audio/${id}-ru-explanation.mp3`;
      result.explanationRuAudioDurationSec = erDur;
    }
  }

  // Outro / CTA voice-over — separate for RU and ES
  const outroTextRu = question.outro_text_ru || question.outro_text || null;
  const outroTextEs = question.outro_text_es || null;

  if (outroTextRu) {
    const outroPathRu = path.join(AUDIO_DIR, `${id}-ru-outro.mp3`);
    if (fs.existsSync(outroPathRu)) fs.unlinkSync(outroPathRu);
    const outroDurRu = await synth(outroTextRu, VOICE_RU, outroPathRu, "outro [RU]", "ru");
    if (outroDurRu !== null) {
      result.outroAudioFileRu        = `audio/${id}-ru-outro.mp3`;
      result.outroAudioDurationSecRu = outroDurRu;
    }
  }

  if (outroTextEs && lang === "es") {
    const outroPathEs = path.join(AUDIO_DIR, `${id}-es-outro.mp3`);
    if (fs.existsSync(outroPathEs)) fs.unlinkSync(outroPathEs);
    const outroDurEs = await synth(outroTextEs, null, outroPathEs, "outro [ES]", "es");
    if (outroDurEs !== null) {
      result.outroAudioFileEs        = `audio/${id}-es-outro.mp3`;
      result.outroAudioDurationSecEs = outroDurEs;
    }
  }

  // Legacy single-field fallback
  result.outroAudioFile        = result.outroAudioFileRu || null;
  result.outroAudioDurationSec = result.outroAudioDurationSecRu || null;

  return result;
}

// ── Gemini API ────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL   = "gemini-2.5-flash-lite-preview-06-17";

async function geminiGenerate(prompt) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set in .env");
  const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
          if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
            resolve(json.candidates[0].content.parts[0].text.trim());
          } else {
            reject(new Error(JSON.stringify(json)));
          }
        } catch(e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Supabase REST helper ──────────────────────────────────────────────────────
function supabaseRequest(endpoint, params = "") {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}${params}`;
    const options = {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      }
    };
    https.get(url, options, (res) => {
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

// ── Fetch questions from Supabase ─────────────────────────────────────────────
async function fetchQuestions({ lang = "es", search = "", limit = 30, offset = 0 } = {}) {
  // Russian PDD questions live under country='russia', DGT under country='es'
  const country = lang === "ru" ? "russia" : "es";
  const qField = `question_${lang}`;
  const exField = `explanation_${lang}`;

  // For DGT (es): also pull question_ru/explanation_ru for the RU overlay video
  const cols = lang === "es"
    ? `id,${qField},${exField},question_ru,explanation_ru,image_url,difficulty,percent_correct,topic_id`
    : `id,${qField},${exField},image_url,difficulty,percent_correct,topic_id`;

  let filter = `country=eq.${country}&${qField}=not.is.null`;
  if (search) filter += `&${qField}=ilike.*${encodeURIComponent(search)}*`;

  // Get total count via HEAD request with Prefer: count=exact
  let total = 0;
  try {
    total = await new Promise((resolve) => {
      const url = `${SUPABASE_URL}/rest/v1/questions_new?select=id&${filter}`;
      const options = {
        method: "HEAD",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Prefer": "count=exact",
        }
      };
      const req = https.request(url, options, (res) => {
        const range = res.headers["content-range"] || "";
        const match = range.match(/\/(\d+)$/);
        resolve(match ? parseInt(match[1]) : 0);
      });
      req.on("error", () => resolve(0));
      req.end();
    });
  } catch {}

  const rows = await supabaseRequest(
    "questions_new",
    `?select=${cols}&${filter}&order=percent_correct.asc&limit=${limit}&offset=${offset}`
  );

  if (!Array.isArray(rows)) return { questions: [], total: 0 };

  // Fetch answer options for each question
  const ids = rows.map(r => r.id);
  if (ids.length === 0) return [];

  const textField = `text_${lang}`;
  // Всегда тянем text_ru для субтитров в RU-видео
  const answerSelect = lang === "es"
    ? `id,question_id,text_es,text_ru,is_correct,position`
    : `id,question_id,text_ru,is_correct,position`;
  const answers = await supabaseRequest(
    "answer_options",
    `?select=${answerSelect}&question_id=in.(${ids.join(",")})&order=position.asc`
  );

  const answerMap = {};
  if (Array.isArray(answers)) {
    for (const a of answers) {
      if (!answerMap[a.question_id]) answerMap[a.question_id] = [];
      answerMap[a.question_id].push({
        id: a.id,
        text: a[textField] || "",
        text_ru: a.text_ru || undefined,
        is_correct: a.is_correct,
        position: a.position,
      });
    }
  }

  const questions = rows.map(r => ({
    id: r.id,
    question: r[qField] || "",
    // DGT only: keep Russian translation for RU overlay video
    ...(lang === "es" ? { question_ru: r.question_ru || null, explanation_ru: r.explanation_ru || null } : {}),
    explanation: r[exField] || "",
    image_url: r.image_url || null,
    difficulty: r.difficulty || "medium",
    percent_correct: r.percent_correct || 50,
    country,
    language: lang,
    answer_options: (answerMap[r.id] || []),
  }));
  return { questions, total };
}

// ── HTML page ─────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skily — Video Maker</title>
<style>
:root {
  --bg: #080C14;
  --surface: #0F1623;
  --surface2: #161E2E;
  --surface3: #1C2539;
  --border: rgba(255,255,255,0.07);
  --border-hover: rgba(255,255,255,0.13);
  --blue: #3B82F6;
  --blue-dim: rgba(59,130,246,0.12);
  --blue-glow: rgba(59,130,246,0.25);
  --green: #22C55E;
  --green-dim: rgba(34,197,94,0.12);
  --purple: #8B5CF6;
  --purple-dim: rgba(139,92,246,0.13);
  --orange: #F97316;
  --orange-dim: rgba(249,115,22,0.12);
  --red: #EF4444;
  --red-dim: rgba(239,68,68,0.12);
  --text: #F1F5F9;
  --text2: #94A3B8;
  --text3: #475569;
  --radius: 12px;
  --radius-sm: 8px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif; min-height: 100vh; font-size: 14px; }

/* ── Header ── */
.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  display: flex; align-items: center; gap: 16px;
  height: 56px; position: sticky; top: 0; z-index: 100;
  box-shadow: 0 1px 20px rgba(0,0,0,0.4);
}
.logo {
  font-size: 18px; font-weight: 900; letter-spacing: 1.5px;
  background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  flex-shrink: 0;
}
.logo span { -webkit-text-fill-color: var(--text2); font-weight: 400; font-size: 13px; margin-left: 4px; letter-spacing: 0; }
.search-wrap { flex: 1; position: relative; max-width: 400px; }
.search-wrap input {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  color: var(--text); padding: 8px 14px 8px 36px; border-radius: var(--radius-sm);
  font-size: 14px; outline: none; transition: border-color .2s;
}
.search-wrap input:focus { border-color: var(--blue); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 15px; pointer-events: none; }
.header-right { display: flex; gap: 10px; align-items: center; margin-left: auto; }
select {
  background: var(--surface2); border: 1.5px solid var(--border); color: var(--text);
  padding: 7px 12px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; outline: none;
  transition: border-color .2s;
}
select:focus { border-color: var(--blue); }
.btn { padding: 8px 16px; border-radius: var(--radius-sm); border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; }
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { background: #2563EB; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
.btn-primary:active { transform: translateY(0); }

/* ── Layout ── */
.layout { display: grid; grid-template-columns: 1fr 500px; height: calc(100vh - 56px); }
.list { overflow-y: auto; border-right: 1px solid var(--border); background: var(--bg); }
.panel { overflow-y: auto; background: var(--surface); }

/* ── Question list ── */
.q-item {
  padding: 14px 20px; border-bottom: 1px solid var(--border);
  cursor: pointer; transition: background .12s; position: relative;
}
.q-item:hover { background: rgba(255,255,255,0.02); }
.q-item.active { background: var(--blue-dim); }
.q-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--blue); border-radius: 0 2px 2px 0; }
.q-meta { display: flex; gap: 6px; margin-bottom: 7px; align-items: center; flex-wrap: wrap; }
.badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.4px; text-transform: uppercase; }
.badge-easy   { background: var(--green-dim); color: var(--green); }
.badge-medium { background: var(--orange-dim); color: var(--orange); }
.badge-hard   { background: var(--red-dim); color: var(--red); }
.badge-pct    { background: rgba(255,255,255,0.06); color: var(--text2); }
.q-text { font-size: 13px; color: var(--text); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ── Pagination ── */
.pagination {
  display: flex; gap: 8px; padding: 14px 20px; align-items: center;
  justify-content: space-between; border-top: 1px solid var(--border);
  position: sticky; bottom: 0; background: var(--bg);
}
.pag-info { color: var(--text3); font-size: 12px; }
.pag-btns { display: flex; gap: 6px; }
.btn-pag { padding: 6px 14px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--surface2); color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }
.btn-pag:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
.btn-pag:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Empty state ── */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--text3); }
.empty-state .icon { font-size: 48px; opacity: 0.5; }
.empty-state .title { font-size: 16px; font-weight: 600; color: var(--text2); }
.empty-state .sub { font-size: 13px; }

/* ── Loading ── */
.loading { text-align: center; padding: 48px; color: var(--text3); }
.loading::after { content: ''; display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin .7s linear infinite; margin-left: 10px; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Panel layout ── */
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  background: var(--surface); position: sticky; top: 0; z-index: 10;
}
.panel-title { font-size: 15px; font-weight: 700; color: var(--text); }
.panel-meta { display: flex; gap: 8px; align-items: center; }
.panel-body { padding: 16px 20px; }

/* ── Section cards ── */
.section {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--radius); margin-bottom: 10px; overflow: hidden;
}
.section-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}
.section-label {
  font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--text2); display: flex; align-items: center; gap: 6px;
}
.section-body { padding: 12px 14px; }

/* ── Fields ── */
.field-group { margin-bottom: 10px; }
.field-group:last-child { margin-bottom: 0; }
.field-label { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text3); margin-bottom: 5px; }
.field-ta {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  color: var(--text); border-radius: var(--radius-sm); padding: 9px 12px;
  font-size: 13px; line-height: 1.6; font-family: inherit; resize: none;
  outline: none; transition: border-color .2s; overflow: hidden; min-height: 60px;
}
.field-ta:focus { border-color: var(--blue); }
.field-in {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  color: var(--text); border-radius: var(--radius-sm); padding: 8px 12px;
  font-size: 13px; font-family: inherit; outline: none; transition: border-color .2s;
}
.field-in:focus { border-color: var(--blue); }
.field-in.correct { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.04); }

/* ── Answer rows ── */
.answer-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
.answer-row:last-child { margin-bottom: 0; }
.answer-num {
  width: 26px; height: 26px; border-radius: 7px; background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: var(--text3); flex-shrink: 0; margin-top: 7px;
}
.answer-num.correct { background: var(--green); color: #fff; }
.answer-inputs { flex: 1; display: flex; flex-direction: column; gap: 5px; }

/* ── Buttons ── */
.btn-regen {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--purple-dim); color: var(--purple);
  border: 1px solid rgba(139,92,246,0.25); font-size: 11px; font-weight: 600;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: inherit;
  transition: all .15s; white-space: nowrap; flex-shrink: 0;
}
.btn-regen:hover { background: rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.4); }
.btn-regen:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-regen.loading-spin::after { content: ''; display: inline-block; width: 10px; height: 10px; border: 1.5px solid rgba(139,92,246,0.3); border-top-color: var(--purple); border-radius: 50%; animation: spin .6s linear infinite; }
.btn-ai {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
  color: #93C5FD; border: 1px solid rgba(99,102,241,0.3);
  font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: var(--radius-sm);
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-ai:hover { background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25)); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
.btn-ai:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-danger {
  background: var(--red-dim); color: var(--red);
  border: 1px solid rgba(239,68,68,0.25); font-size: 13px; font-weight: 600;
  padding: 10px 16px; border-radius: var(--radius-sm); cursor: pointer; transition: all .15s;
}
.btn-danger:hover { background: rgba(239,68,68,0.2); }
.btn-render {
  background: linear-gradient(135deg, #16A34A, #15803D);
  color: #fff; border: none; font-size: 15px; font-weight: 700;
  padding: 13px 20px; border-radius: var(--radius-sm); cursor: pointer;
  transition: all .2s; box-shadow: 0 2px 8px rgba(22,163,74,0.3);
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-render:hover:not(:disabled) { background: linear-gradient(135deg, #15803D, #166534); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(22,163,74,0.4); }
.btn-render:disabled { background: rgba(22,163,74,0.25); color: rgba(255,255,255,0.4); cursor: not-allowed; transform: none; box-shadow: none; }
.btn-copy {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-sm);
  border: 1.5px solid var(--border); background: var(--surface3);
  color: var(--text2); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.btn-copy:hover { border-color: var(--green); color: var(--green); }
.btn-copy.copied { border-color: var(--green); background: var(--green-dim); color: var(--green); }

/* ── Chips ── */
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
  padding: 3px 10px; border-radius: 20px; border: 1.5px solid var(--border);
  background: rgba(255,255,255,0.04); color: var(--text2); font-size: 11px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.chip:hover { border-color: var(--border-hover); color: var(--text); }
.chip.active { border-color: var(--blue); background: var(--blue-dim); color: #93C5FD; }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; }
.toggle-row label { font-size: 13px; color: var(--text2); cursor: pointer; flex: 1; }
input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--blue); cursor: pointer; }

/* ── Description output ── */
.desc-section { display: none; margin-top: 10px; }
.desc-section.visible { display: block; }
.desc-field-label { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: var(--blue); margin-bottom: 5px; }
.desc-ta {
  width: 100%; background: var(--bg); border: 1.5px solid rgba(59,130,246,0.2);
  color: var(--text); border-radius: var(--radius-sm); padding: 10px 12px;
  font-size: 13px; line-height: 1.65; font-family: inherit; resize: none;
  outline: none; transition: border-color .2s; overflow: hidden; min-height: 50px;
}
.desc-ta:focus { border-color: var(--blue); }
.desc-ta.title-ta { font-weight: 700; font-size: 14px; }

/* ── Render log ── */
.render-log {
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 10px 12px; font-size: 11px; font-family: "SF Mono", "Fira Code", monospace;
  color: var(--text3); max-height: 100px; overflow-y: auto; white-space: pre-wrap;
  margin-top: 8px; display: none;
}
.render-log.visible { display: block; }

/* ── Divider ── */
.divider { border: none; border-top: 1px solid var(--border); margin: 4px 0; }

/* ── Question image ── */
.q-image { width: 100%; max-height: 180px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 10px; display: block; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">SKILY <span>Video Maker</span></div>
  <div class="search-wrap">
    <span class="search-icon">🔍</span>
    <input type="text" id="search" placeholder="Поиск вопроса..." oninput="onSearch()">
  </div>
  <div class="header-right">
    <select id="lang" onchange="reload()">
      <option value="es">🇪🇸 Español (DGT)</option>
      <option value="ru">🇷🇺 Русский (ПДД)</option>
    </select>
    <button class="btn btn-primary" onclick="reload()">↺ Обновить</button>
  </div>
</div>

<div class="layout">
  <div class="list" id="list">
    <div class="loading">Загрузка вопросов</div>
  </div>

  <div class="panel" id="panel">
    <div class="empty-state">
      <div class="icon">🎬</div>
      <div class="title">Выбери вопрос</div>
      <div class="sub">Нажми на любой вопрос слева чтобы начать</div>
    </div>
  </div>
</div>

<script>
let questions = [];
let selected = null;
let offset = 0;
let total = 0;
const LIMIT = 30;
let searchTimer;

// ── Auto-resize textareas ────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function bindAutoResize() {
  document.querySelectorAll('.field-ta, .desc-ta').forEach(ta => {
    ta.addEventListener('input', () => autoResize(ta));
    autoResize(ta);
  });
}

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { offset = 0; reload(); }, 380);
}
async function reload() { offset = 0; await loadQuestions(); }

async function loadQuestions() {
  const search = document.getElementById("search").value;
  const lang = document.getElementById("lang").value;
  document.getElementById("list").innerHTML = '<div class="loading">Загрузка</div>';
  try {
    const res = await fetch(\`/api/questions?lang=\${lang}&search=\${encodeURIComponent(search)}&offset=\${offset}&limit=\${LIMIT}\`);
    const data = await res.json();
    questions = data.questions || [];
    total = data.total || questions.length;
    renderList();
  } catch(e) {
    document.getElementById("list").innerHTML = '<div style="padding:40px;text-align:center;color:#475569">Ошибка загрузки. Проверь сервер.</div>';
  }
}

function renderList() {
  const lang = document.getElementById("lang").value;
  const diffLabel = { easy: lang==="ru"?"ЛЁГКИЙ":"FÁCIL", medium: lang==="ru"?"СРЕДНИЙ":"MEDIO", hard: lang==="ru"?"СЛОЖНЫЙ":"DIFÍCIL" };
  let html = questions.map((q, i) => \`
    <div class="q-item \${selected && selected.id === q.id ? 'active' : ''}" onclick="selectQuestion(\${i})">
      <div class="q-meta">
        <span class="badge badge-\${q.difficulty}">\${diffLabel[q.difficulty]||q.difficulty}</span>
        <span class="badge badge-pct">\${q.percent_correct ?? 50}% верно</span>
        <span class="badge badge-pct">\${q.answer_options?.length || 0} отв.</span>
      </div>
      <div class="q-text">\${q.question}</div>
    </div>
  \`).join('');

  html += \`<div class="pagination">
    <span class="pag-info">\${offset+1}–\${Math.min(offset+LIMIT, total)} из \${total}</span>
    <div class="pag-btns">
      <button class="btn-pag" \${offset===0?'disabled':''} onclick="prevPage()">← Назад</button>
      <button class="btn-pag" \${offset+LIMIT>=total?'disabled':''} onclick="nextPage()">Вперёд →</button>
    </div>
  </div>\`;

  document.getElementById("list").innerHTML = html;
}

function prevPage() { if (offset > 0) { offset -= LIMIT; loadQuestions(); } }
function nextPage() { offset += LIMIT; loadQuestions(); }

function selectQuestion(i) {
  selected = questions[i];
  renderList();
  renderPanel();
  setTimeout(() => { renderOutroChips(); bindAutoResize(); }, 60);
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderPanel() {
  if (!selected) return;
  const q = selected;
  const lang = q.language || document.getElementById("lang").value;

  const answersHTML = (q.answer_options || []).map((o, i) => \`
    <div class="answer-row">
      <div class="answer-num \${o.is_correct ? 'correct' : ''}">\${o.is_correct ? '✓' : i+1}</div>
      <div class="answer-inputs">
        <input class="field-in \${o.is_correct ? 'correct' : ''}" id="editAnswer_\${i}" value="\${escHtml(o.text)}" placeholder="Вариант \${i+1}">
        \${lang === 'es' ? \`<input class="field-in" id="editAnswerRu_\${i}" value="\${escHtml(o.text_ru||'')}" placeholder="Перевод на русский…" style="font-size:12px;opacity:0.7">\` : ''}
      </div>
    </div>
  \`).join('');

  const ruSection = lang === "es" ? \`
    <div class="section">
      <div class="section-head">
        <div class="section-label">🇷🇺 Русский блок</div>
      </div>
      <div class="section-body">
        <div class="field-group">
          <div class="field-label">Перевод вопроса (субтитр)</div>
          <textarea class="field-ta" id="editQuestionRu" placeholder="Перевод вопроса на русский…">\${escHtml(q.question_ru || '')}</textarea>
        </div>
        <div class="field-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <div class="field-label" style="margin-bottom:0">Объяснение RU (озвучка)</div>
            <button class="btn-regen" id="regenExplRu" onclick="adaptText('editExplanationRu','ru')">🔄 TTS-адапт.</button>
          </div>
          <textarea class="field-ta" id="editExplanationRu" placeholder="Объяснение для русской озвучки…">\${escHtml(q.explanation_ru || q.explanationRu || '')}</textarea>
        </div>
      </div>
    </div>
  \` : '';

  document.getElementById("panel").innerHTML = \`
    <div class="panel-header">
      <div class="panel-title">✏️ Редактор</div>
      <div class="panel-meta">
        <span class="badge badge-\${q.difficulty}">\${q.difficulty}</span>
        <span class="badge badge-pct">\${q.percent_correct}% верно</span>
        <span class="badge badge-pct">\${lang.toUpperCase()}</span>
      </div>
    </div>

    <div class="panel-body">

      \${q.image_url ? \`<img class="q-image" src="\${q.image_url}" alt="">\` : ''}

      <!-- ВОПРОС -->
      <div class="section">
        <div class="section-head"><div class="section-label">❓ Вопрос</div></div>
        <div class="section-body">
          <textarea class="field-ta" id="editQuestion">\${escHtml(q.question)}</textarea>
        </div>
      </div>

      <!-- ВАРИАНТЫ ОТВЕТОВ -->
      <div class="section">
        <div class="section-head"><div class="section-label">📋 Варианты ответов</div></div>
        <div class="section-body">\${answersHTML}</div>
      </div>

      <!-- ОБЪЯСНЕНИЕ ES -->
      <div class="section">
        <div class="section-head">
          <div class="section-label">💡 Объяснение</div>
          <button class="btn-regen" id="regenExpl" onclick="adaptText('editExplanation','\${lang}')">🔄 TTS-адапт.</button>
        </div>
        <div class="section-body">
          <textarea class="field-ta" id="editExplanation">\${escHtml(q.explanation)}</textarea>
        </div>
      </div>

      \${ruSection}

      <!-- КОНЦОВКА -->
      <div class="section">
        <div class="section-head"><div class="section-label">🎬 Концовка ролика</div></div>
        <div class="section-body">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <span>🇷🇺</span>
            <div class="chips" id="outroChipsRU"></div>
          </div>
          <textarea class="field-ta" id="outroTextRU" placeholder="Концовка RU-ролика…" oninput="syncOutroActive('RU');autoResize(this)"></textarea>

          \${lang === 'es' ? \`
          <div style="display:flex;align-items:center;gap:8px;margin:10px 0 7px">
            <span>🇪🇸</span>
            <div class="chips" id="outroChipsES"></div>
          </div>
          <textarea class="field-ta" id="outroTextES" placeholder="Концовка ES-ролика…" oninput="syncOutroActive('ES');autoResize(this)"></textarea>
          \` : ''}
        </div>
      </div>

      <!-- НАСТРОЙКИ -->
      <div class="toggle-row" onclick="document.getElementById('showExplanation').click()">
        <input type="checkbox" id="showExplanation">
        <label>Показывать объяснение в ролике</label>
      </div>

      <!-- YOUTUBE ОПИСАНИЕ -->
      <div class="section" style="margin-top:10px">
        <div class="section-head">
          <div class="section-label">📝 Описание YouTube</div>
          <button class="btn-ai" id="genDescBtn" onclick="generateDescription()">✨ Сгенерировать</button>
        </div>
        <div class="section-body">
          <div class="desc-section" id="descOutput">
            <div class="field-group">
              <div class="desc-field-label">Заголовок</div>
              <textarea class="desc-ta title-ta" id="descTitle" placeholder="Заголовок для YouTube…"></textarea>
            </div>
            <div class="field-group">
              <div class="desc-field-label">Описание</div>
              <textarea class="desc-ta" id="descBody" placeholder="Описание для YouTube…"></textarea>
            </div>
            <button class="btn-copy" id="copyBtn" onclick="copyDesc()">📋 Скопировать всё</button>
          </div>
          <div id="descPlaceholder" style="color:var(--text3);font-size:12px;padding:4px 0">Нажми «Сгенерировать» — Gemini напишет цепляющий заголовок и описание с хэштегами 🚀</div>
        </div>
      </div>

      <!-- РЕНДЕР -->
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn-render" onclick="renderVideo()" id="renderBtn">🎬 Рендерить видео</button>
        <button class="btn-danger" onclick="clearAudio()" title="Удалить кэш аудио">🗑</button>
      </div>
      <div class="render-log" id="renderLog"></div>

    </div>
  \`;
}

// ── Outro templates ───────────────────────────────────────────────────────
const OUTRO_TEMPLATES = {
  ru: [
    { id:"subscribe", label:"Подпишись",    text:"Подпишись! Каждый день новый вопрос ПДД Испании 🇪🇸" },
    { id:"tag",       label:"Skilyapp.com", text:"Переходи на Skilyapp.com — и готовься к экзамену на права в Испании бесплатно! 🚀" },
    { id:"comment",   label:"Угадал?",      text:"Угадал? Пиши ✅ или ❌ в комментарии!" },
    { id:"skily",     label:"Skily",        text:"Готовишься к испанским правам? 2000+ вопросов на Skily 🚀" },
    { id:"save",      label:"Сохрани",      text:"Сохрани видео — пригодится на экзамене! 📌" },
    { id:"challenge", label:"Челлендж",     text:"Сдашь DGT с первого раза? Проверь себя на Skily! 🏆" },
  ],
  es: [
    { id:"subscribe", label:"Suscríbete",   text:"Suscríbete — nueva pregunta DGT cada día 🇪🇸" },
    { id:"tag",       label:"Skilyapp.com", text:"¡Entra en Skilyapp.com y prepárate para el DGT gratis! 🚀" },
    { id:"comment",   label:"¿Acertaste?",  text:"¿Acertaste? ¡Comenta ✅ o ❌!" },
    { id:"skily",     label:"Skily",        text:"¿Preparando el DGT? +2000 preguntas en Skily 🚀" },
    { id:"save",      label:"Guarda",       text:"¡Guarda este video para repasar antes del examen! 📌" },
    { id:"challenge", label:"Desafío",      text:"¿Aprobarás el DGT a la primera? ¡Demuéstralo en Skily! 🏆" },
  ],
};

function renderOutroChips() {
  if (!selected) return;
  window._outroMap = {};
  function buildChips(containerId, langKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const templates = OUTRO_TEMPLATES[langKey] || OUTRO_TEMPLATES.ru;
    templates.forEach(t => { window._outroMap[t.id + '_' + langKey] = t.text; });
    container.innerHTML = templates.map(t => {
      const key = t.id + '_' + langKey;
      return \`<button class="chip" id="chip_\${key}" onclick="selectOutro('\${key}','\${langKey}')">\${t.label}</button>\`;
    }).join('');
  }
  buildChips('outroChipsRU', 'ru');
  if (document.getElementById('outroChipsES')) buildChips('outroChipsES', 'es');
}

function syncOutroActive(langKey) {
  (OUTRO_TEMPLATES[langKey.toLowerCase()] || []).forEach(t => {
    const chip = document.getElementById('chip_' + t.id + '_' + langKey.toLowerCase());
    if (chip) chip.classList.remove('active');
  });
}

function selectOutro(key, langKey) {
  const text = window._outroMap[key];
  if (!text) return;
  const ta = document.getElementById(langKey === 'es' ? 'outroTextES' : 'outroTextRU');
  if (ta) { ta.value = text; autoResize(ta); }
  (OUTRO_TEMPLATES[langKey] || []).forEach(t => {
    const chip = document.getElementById('chip_' + t.id + '_' + langKey);
    if (chip) chip.classList.toggle('active', (t.id + '_' + langKey) === key);
  });
}

// ── Render video ──────────────────────────────────────────────────────────
async function renderVideo() {
  if (!selected) return;
  const btn = document.getElementById("renderBtn");
  const log = document.getElementById("renderLog");
  btn.disabled = true; btn.textContent = "⏳ Рендерится…";
  log.classList.add('visible'); log.textContent = "Генерируем аудио и рендерим…\\n";

  const editedQuestion = {
    ...selected,
    question:      document.getElementById('editQuestion')?.value ?? selected.question,
    explanation:   document.getElementById('editExplanation')?.value ?? selected.explanation,
    question_ru:   document.getElementById('editQuestionRu')?.value ?? selected.question_ru,
    explanationRu: document.getElementById('editExplanationRu')?.value ?? selected.explanationRu ?? selected.explanation_ru,
    outro_text_ru: document.getElementById('outroTextRU')?.value?.trim() || undefined,
    outro_text_es: document.getElementById('outroTextES')?.value?.trim() || undefined,
    outro_text:    document.getElementById('outroTextRU')?.value?.trim() || undefined,
    show_explanation: document.getElementById('showExplanation')?.checked === true,
    answer_options: (selected.answer_options || []).map((o, i) => ({
      ...o,
      text:    document.getElementById(\`editAnswer_\${i}\`)?.value ?? o.text,
      text_ru: document.getElementById(\`editAnswerRu_\${i}\`)?.value ?? o.text_ru,
    })),
  };

  try {
    const res = await fetch("/api/render", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ question: editedQuestion }) });
    const data = await res.json();
    if (data.output) {
      btn.textContent = "✅ Готово!"; btn.style.background = "linear-gradient(135deg,#16A34A,#15803D)";
      log.textContent += "✅ ES: " + data.output + "\\n";
      if (data.outputRU) log.textContent += "✅ RU: " + data.outputRU + "\\n";
    } else {
      btn.textContent = "⚠️ Ошибка"; btn.style.background = "linear-gradient(135deg,#B91C1C,#991B1B)";
      log.textContent += "❌ " + (data.error || "Неизвестная ошибка");
      btn.disabled = false;
    }
  } catch(e) {
    btn.textContent = "⚠️ Ошибка"; btn.style.background = "linear-gradient(135deg,#B91C1C,#991B1B)";
    log.textContent += "❌ " + e.message; btn.disabled = false;
  }
}

async function clearAudio() {
  if (!selected) return;
  const res = await fetch(\`/api/clear-audio?id=\${selected.id}\`, { method: 'DELETE' });
  const data = await res.json();
  const log = document.getElementById('renderLog');
  if (log) { log.classList.add('visible'); log.textContent = "🗑 " + (data.message || 'Аудио очищено'); }
}

// ── TTS адаптация через Gemini ────────────────────────────────────────────
async function adaptText(fieldId, lang) {
  const ta = document.getElementById(fieldId);
  if (!ta || !ta.value.trim()) return;
  const btnId = fieldId === 'editExplanationRu' ? 'regenExplRu' : 'regenExpl';
  const btn = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const res = await fetch('/api/adapt-text', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: ta.value.trim(), lang }) });
    const data = await res.json();
    if (data.adapted) { ta.value = data.adapted; autoResize(ta); }
    else alert('Ошибка адаптации: ' + (data.error || '?'));
  } catch(e) { alert('Ошибка: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '🔄 TTS-адапт.'; } }
}

// ── YouTube описание через Gemini ─────────────────────────────────────────
async function generateDescription() {
  if (!selected) return;
  const btn = document.getElementById('genDescBtn');
  const placeholder = document.getElementById('descPlaceholder');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Генерируем…'; }
  try {
    const question = document.getElementById('editQuestion')?.value || selected.question;
    const explanation = document.getElementById('editExplanation')?.value || selected.explanation;
    const lang = selected.language || document.getElementById('lang').value;
    const res = await fetch('/api/generate-description', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question, explanation, lang, percent_correct: selected.percent_correct }),
    });
    const data = await res.json();
    if (data.title && data.description) {
      const titleEl = document.getElementById('descTitle');
      const bodyEl = document.getElementById('descBody');
      const out = document.getElementById('descOutput');
      titleEl.value = data.title; bodyEl.value = data.description;
      if (placeholder) placeholder.style.display = 'none';
      if (out) { out.classList.add('visible'); autoResize(titleEl); autoResize(bodyEl); }
    } else { alert('Ошибка: ' + (data.error || '?')); }
  } catch(e) { alert('Ошибка: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '✨ Сгенерировать'; } }
}

function copyDesc() {
  const title = document.getElementById('descTitle')?.value || '';
  const body = document.getElementById('descBody')?.value || '';
  navigator.clipboard.writeText(title + '\\n\\n' + body).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Скопировано!'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Скопировать всё'; btn.classList.remove('copied'); }, 1500);
  });
}

// Initial load
loadQuestions();
</script>
</body>
</html>`;

// ── HTTP server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  // ── GET / ─────────────────────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  // ── GET /api/questions ────────────────────────────────────────────────────
  if (req.method === "GET" && url.pathname === "/api/questions") {
    const lang   = url.searchParams.get("lang") || "es";
    const search = url.searchParams.get("search") || "";
    const limit  = parseInt(url.searchParams.get("limit") || "30");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    try {
      const { questions: qs, total } = await fetchQuestions({ lang, search, limit, offset });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ questions: qs, total }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── DELETE /api/clear-audio ───────────────────────────────────────────────
  if (req.method === "DELETE" && url.pathname === "/api/clear-audio") {
    const id = url.searchParams.get("id");
    if (!id) { res.writeHead(400); res.end(JSON.stringify({ error: "No id" })); return; }
    const deleted = [];
    try {
      fs.readdirSync(AUDIO_DIR).forEach(f => {
        if (f.startsWith(id)) {
          fs.unlinkSync(path.join(AUDIO_DIR, f));
          deleted.push(f);
        }
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Удалено " + deleted.length + " файлов: " + deleted.join(", "), deleted }));
    } catch(e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── POST /api/render ──────────────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/render") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { question } = JSON.parse(body);

        // Build full VideoQuestion object
        const seriesState = (() => {
          try { return JSON.parse(fs.readFileSync(path.join(RENDERS_DIR,"series-state.json"),"utf-8")); }
          catch { return { ru:1, es:1 }; }
        })();

        const lang = question.language || question.country || "es";
        const hookTemplates = {
          ru: { vhard:"Это не знает НИКТО 🤯", hard:"99% водителей ошибаются ❌", medium:"Только опытные знают ответ 🚗", easy:"Проверь себя за 5 секунд ⚡" },
          es: { vhard:"¡NADIE sabe la respuesta! 🤯", hard:"El 99% de conductores falla ❌", medium:"Solo los expertos lo saben 🚗", easy:"¿Sabes la respuesta? ⚡" },
        };
        const pct = question.percent_correct || 50;
        const hookKey = pct < 30 ? "vhard" : pct < 50 ? "hard" : question.difficulty === "hard" ? "medium" : "easy";

        // Spanish hook templates for the RU variant (hook stays in RU, question in ES)
        const hookTemplatesRU = {
          vhard: "Это не знает НИКТО 🤯", hard: "99% водителей ошибаются ❌",
          medium: "Только опытные знают ответ 🚗", easy: "Проверь себя! ⚡",
        };

        const videoQuestion = {
          ...question,
          hook_title: hookTemplates[lang]?.[hookKey] || "Проверь себя",
          series_number: seriesState[lang] || 1,
          // Pass Russian explanation if it exists in DB row
          explanationRu: question.explanationRu || question.explanation_ru || undefined,
        };

        // Generate ALL TTS (question, all answers, explanation, RU explanation)
        console.log(`\n[TTS] Generating audio for #${videoQuestion.series_number} (${lang})…`);
        const tts = await generateTTSForQuestion(videoQuestion);
        Object.assign(videoQuestion, tts);

        // Save selected question for Remotion
        fs.writeFileSync(SELECTED_FILE, JSON.stringify(videoQuestion, null, 2));

        const remotionCli = path.join(__dirname, "node_modules/.bin/remotion");

        // ── Helper: run one remotion render ───────────────────────────────────
        function runRender(question, outputPath, compositionId) {
          const propsFile = path.join(RENDERS_DIR, `render-props-${compositionId}.json`);
          fs.writeFileSync(propsFile, JSON.stringify({ question }));

          return new Promise((resolve) => {
            const proc = spawn(remotionCli, [
              "render",
              "src/Root.tsx", compositionId,
              "--output", outputPath,
              "--props", propsFile,
              "--log", "verbose",
              "--crf", "14",
              "--pixel-format", "yuv420p",
            ], { cwd: __dirname, env: { ...process.env, PATH: process.env.PATH } });

            let logs = "";
            proc.stdout.on("data", d => { logs += d; });
            proc.stderr.on("data", d => { logs += d; });
            proc.on("close", (code) => resolve({ code, logs, outputPath }));
          });
        }

        let primaryResult, outputPrimary, outputRU = null;

        if (lang === "ru") {
          // ── Russian PDD: only one fully-Russian video ─────────────────────
          outputPrimary = path.join(RENDERS_DIR, `question-${question.id}-ru.mp4`);
          console.log(`[Render] RU (ПДД) video…`);
          primaryResult = await runRender(videoQuestion, outputPrimary, "VideoTemplateRU");
        } else {
          // ── DGT (Spanish): ES video + optional RU overlay video ───────────
          // ES video uses ES hook and ES outro
          const videoQuestionES = {
            ...videoQuestion,
            hookAudioFile:        videoQuestion.hookAudioFileEs || videoQuestion.hookAudioFile,
            hookAudioDurationSec: videoQuestion.hookAudioDurationSecEs || videoQuestion.hookAudioDurationSec,
            outroAudioFile:       videoQuestion.outroAudioFileEs || null,
            outroAudioDurationSec:videoQuestion.outroAudioDurationSecEs || null,
          };
          outputPrimary = path.join(RENDERS_DIR, `question-${question.id}-es.mp4`);
          console.log(`[Render] ES video…`);
          primaryResult = await runRender(videoQuestionES, outputPrimary, "VideoTemplate");

          if (videoQuestion.explanationRu && videoQuestion.explanationRuAudioFile) {
            // RU overlay uses RU hook and RU outro
            const ruQuestion = {
              ...videoQuestion,
              language: "ru",
              hook_title: hookTemplatesRU[hookKey] || hookTemplatesRU.easy,
              hookAudioFile:        videoQuestion.hookAudioFileRu || videoQuestion.hookAudioFile,
              hookAudioDurationSec: videoQuestion.hookAudioDurationSecRu || videoQuestion.hookAudioDurationSec,
              outroAudioFile:       videoQuestion.outroAudioFileRu || null,
              outroAudioDurationSec:videoQuestion.outroAudioDurationSecRu || null,
            };
            outputRU = path.join(RENDERS_DIR, `question-${question.id}-ru.mp4`);
            console.log(`[Render] RU overlay video…`);
            await runRender(ruQuestion, outputRU, "VideoTemplateRU");
          }
        }

        if (primaryResult.code === 0) {
          seriesState[lang] = (seriesState[lang] || 1) + 1;
          if (outputRU) seriesState["ru"] = (seriesState["ru"] || 1) + 1;
          fs.writeFileSync(path.join(RENDERS_DIR,"series-state.json"), JSON.stringify(seriesState,null,2));

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            output: outputPrimary,
            outputRU: outputRU || null,
            logs: primaryResult.logs,
          }));
        } else {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Render failed (exit ${primaryResult.code})`, logs: primaryResult.logs }));
        }

      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /api/adapt-text ─────────────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/adapt-text") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { text, lang } = JSON.parse(body);
        const langName = lang === "ru" ? "Russian" : "Spanish";
        const prompt = `You are a TTS (text-to-speech) preparation specialist for ${langName} driving test educational content.

Your task: adapt the following text for natural voice narration. The text will be read aloud by an AI voice model (ElevenLabs).

Rules:
1. Write out ALL numbers as words (e.g. "120 km/h" → "сто двадцать километров в час" for RU, "ciento veinte kilómetros por hora" for ES)
2. Expand ALL abbreviations (km, m, kg, DGT, ПДД, т.е., etc.)
3. Remove markdown formatting (**bold**, *italic*)
4. Remove emoji and special symbols
5. Keep the same language (${langName}) — do NOT translate
6. Make sentences flow naturally when spoken — split long sentences if needed
7. Preserve the meaning 100% — only improve readability for voice
8. Remove parenthetical technical references that sound unnatural when spoken
9. Add natural pauses with commas or periods where a speaker would pause
10. Output ONLY the adapted text, nothing else — no explanations, no quotes

Original text:
${text}`;

        const adapted = await geminiGenerate(prompt);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ adapted }));
      } catch(e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /api/generate-description ───────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/generate-description") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { question, explanation, lang, percent_correct } = JSON.parse(body);
        const isRu = lang === "ru";
        const prompt = isRu
          ? `Ты эксперт по контенту для YouTube о правилах дорожного движения в Испании для русскоязычной аудитории.

Напиши для видео-ролика формата #shorts:

ВОПРОС: ${question}
ОБЪЯСНЕНИЕ: ${explanation}
ПРОЦЕНТ ПРАВИЛЬНЫХ ОТВЕТОВ: ${percent_correct || 50}%

Требования:
- Заголовок: цепляющий, вызывает интерес, 60-80 символов, содержит "ПДД Испании" или "DGT", подходит для YouTube Shorts
- Описание: 3-5 коротких абзаца, объясняет правило, добавляет полезный контекст, призыв действия со ссылкой на Skilyapp.com, хэштеги в конце: #DGT #ПДДИспании #ВодительскиеПрава #Skilyapp
- Стиль: живой, разговорный, без занудства, ощущение что делится опытом

Формат ответа (строго JSON):
{"title": "...", "description": "..."}`
          : `Eres experto en contenido de YouTube sobre el examen DGT para conductores hispanohablantes.

Escribe para un vídeo formato #shorts:

PREGUNTA: ${question}
EXPLICACIÓN: ${explanation}
PORCENTAJE DE ACIERTOS: ${percent_correct || 50}%

Requisitos:
- Título: llamativo, genera curiosidad, 60-80 caracteres, incluye "DGT" o "examen de conducir", apto para YouTube Shorts
- Descripción: 3-5 párrafos cortos, explica la norma, añade contexto útil, llamada a la acción con enlace a Skilyapp.com, hashtags al final: #DGT #ExamenConducir #CarnetDeConducir #Skilyapp
- Estilo: directo, coloquial, como si lo explicara un amigo que ya aprobó

Formato de respuesta (JSON estricto):
{"title": "...", "description": "..."}`;

        const raw = await geminiGenerate(prompt);
        // Extract JSON from response (model may wrap in ```json ... ```)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response: " + raw.slice(0, 200));
        const parsed = JSON.parse(jsonMatch[0]);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ title: parsed.title, description: parsed.description }));
      } catch(e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\nSkily Video Picker ready: http://localhost:${PORT}\n`);
});
