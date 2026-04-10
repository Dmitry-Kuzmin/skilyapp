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
<title>Skily — Video Picker</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0D1117; color: #F0F6FC; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }

.header { background: #161B22; border-bottom: 1px solid rgba(255,255,255,0.07); padding: 16px 24px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 10; }
.logo { font-size: 22px; font-weight: 900; color: #2F81F7; letter-spacing: 1px; }
.controls { display: flex; gap: 12px; flex: 1; align-items: center; flex-wrap: wrap; }
input[type=text] { background: #0D1117; border: 1px solid rgba(255,255,255,0.1); color: #F0F6FC; padding: 10px 16px; border-radius: 10px; font-size: 15px; flex: 1; min-width: 200px; outline: none; }
input[type=text]:focus { border-color: #2F81F7; }
select { background: #0D1117; border: 1px solid rgba(255,255,255,0.1); color: #F0F6FC; padding: 10px 14px; border-radius: 10px; font-size: 15px; cursor: pointer; outline: none; }
.btn { padding: 10px 20px; border-radius: 10px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #2F81F7; color: #fff; }
.btn-primary:hover { background: #1a6bd4; }
.btn-sm { padding: 8px 16px; font-size: 13px; }
.btn-render { background: #3FB950; color: #fff; }
.btn-render:hover { background: #2ea043; }
.btn-render:disabled { background: #1f6b2e; color: rgba(255,255,255,0.5); cursor: not-allowed; }

.layout { display: grid; grid-template-columns: 1fr 420px; gap: 0; height: calc(100vh - 64px); }
.list { overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.07); }
.preview { overflow-y: auto; padding: 24px; background: #0D1117; }

.question-item { padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.15s; }
.question-item:hover { background: rgba(255,255,255,0.03); }
.question-item.selected { background: rgba(47,129,247,0.08); border-left: 3px solid #2F81F7; }
.q-meta { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.5px; }
.badge-easy   { background: rgba(63,185,80,0.15); color: #3FB950; }
.badge-medium { background: rgba(240,136,62,0.15); color: #F0883E; }
.badge-hard   { background: rgba(248,81,73,0.12); color: #F85149; }
.badge-pct    { background: rgba(255,255,255,0.08); color: #8B949E; }
.q-text { font-size: 15px; color: #F0F6FC; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Preview panel */
.preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #8B949E; gap: 12px; font-size: 15px; }
.preview-card { background: #161B22; border-radius: 16px; border: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
.preview-img { width: 100%; max-height: 240px; object-fit: cover; }
.preview-body { padding: 20px; }
.preview-question { font-size: 17px; font-weight: 700; color: #F0F6FC; line-height: 1.5; margin-bottom: 16px; }
.preview-option { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.07); background: #0D1117; margin-bottom: 8px; }
.preview-option.correct { border-color: rgba(63,185,80,0.5); background: rgba(63,185,80,0.10); }
.opt-badge { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #8B949E; flex-shrink: 0; }
.preview-option.correct .opt-badge { background: #3FB950; color: #fff; }
.opt-text { font-size: 14px; color: #F0F6FC; line-height: 1.4; }
.preview-explanation { margin-top: 16px; padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(47,129,247,0.3); background: rgba(47,129,247,0.07); font-size: 14px; color: #F0F6FC; line-height: 1.5; }
.preview-expl-label { font-size: 12px; font-weight: 700; color: #2F81F7; margin-bottom: 6px; letter-spacing: 0.5px; }
.preview-actions { margin-top: 16px; display: flex; gap: 10px; flex-direction: column; }
.render-log { background: #0D1117; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px; font-size: 12px; font-family: monospace; color: #8B949E; max-height: 120px; overflow-y: auto; margin-top: 8px; white-space: pre-wrap; }
.loading { text-align: center; padding: 40px; color: #8B949E; }
.pagination { display: flex; gap: 8px; padding: 16px 24px; align-items: center; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.05); }
/* Edit fields */
.edit-label { font-size: 11px; font-weight: 700; color: #8B949E; letter-spacing: 0.5px; margin-bottom: 5px; text-transform: uppercase; }
.edit-textarea { width: 100%; background: #0D1117; border: 1.5px solid rgba(255,255,255,0.1); color: #F0F6FC; border-radius: 10px; padding: 10px 14px; font-size: 14px; line-height: 1.6; font-family: inherit; resize: vertical; outline: none; }
.edit-textarea:focus { border-color: #2F81F7; }
.edit-input { width: 100%; background: #0D1117; border: 1.5px solid rgba(255,255,255,0.1); color: #F0F6FC; border-radius: 10px; padding: 9px 14px; font-size: 14px; font-family: inherit; outline: none; }
.edit-input:focus { border-color: #2F81F7; }
.edit-input.correct { border-color: rgba(63,185,80,0.5); background: rgba(63,185,80,0.05); }
.edit-group { margin-bottom: 14px; }
.edit-answer-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.edit-answer-num { width: 28px; height: 28px; border-radius: 7px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #8B949E; flex-shrink: 0; }
.edit-answer-num.correct { background: #3FB950; color: #fff; }
.btn-danger { background: rgba(248,81,73,0.15); color: #F85149; border: 1px solid rgba(248,81,73,0.3); }
.btn-danger:hover { background: rgba(248,81,73,0.25); }
.btn-regen { background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); font-size:12px; padding:5px 12px; border-radius:8px; cursor:pointer; font-family:inherit; }
.btn-regen:hover { background: rgba(139,92,246,0.25); }
.btn-regen:disabled { opacity:0.4; cursor:not-allowed; }
.section-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 18px 0; }
.desc-box { background:#0D1117; border:1.5px solid rgba(47,129,247,0.2); border-radius:10px; padding:14px; font-size:13px; color:#C9D1D9; line-height:1.6; white-space:pre-wrap; margin-top:8px; }
.desc-label { font-size:12px; font-weight:700; color:#2F81F7; margin-bottom:4px; letter-spacing:0.5px; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">SKILY</div>
  <div class="controls">
    <input type="text" id="search" placeholder="Поиск вопроса..." oninput="onSearch()">
    <select id="lang" onchange="reload()">
      <option value="es">🇪🇸 Español (DGT)</option>
      <option value="ru">🇷🇺 Русский (ПДД)</option>
    </select>
    <button class="btn btn-primary" onclick="reload()">Обновить</button>
  </div>
</div>

<div class="layout">
  <div class="list" id="list">
    <div class="loading">Загрузка вопросов...</div>
  </div>

  <div class="preview" id="preview">
    <div class="preview-empty">
      <div style="font-size:40px">👈</div>
      <div>Выбери вопрос слева</div>
      <div style="font-size:13px; opacity:0.6">чтобы увидеть превью и создать видео</div>
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

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { offset = 0; reload(); }, 400);
}

async function reload() {
  offset = 0;
  await loadQuestions();
}

async function loadQuestions() {
  const search = document.getElementById("search").value;
  const lang = document.getElementById("lang").value;
  document.getElementById("list").innerHTML = '<div class="loading">Загрузка...</div>';
  try {
    const res = await fetch(\`/api/questions?lang=\${lang}&search=\${encodeURIComponent(search)}&offset=\${offset}&limit=\${LIMIT}\`);
    const data = await res.json();
    questions = data.questions || [];
    total = data.total || questions.length;
    renderList();
  } catch(e) {
    document.getElementById("list").innerHTML = '<div class="loading">Ошибка загрузки. Проверь сервер.</div>';
  }
}

function renderList() {
  const lang = document.getElementById("lang").value;
  const diffLabel = { easy: lang==="ru"?"ЛЁГКИЙ":"FÁCIL", medium: lang==="ru"?"СРЕДНИЙ":"MEDIO", hard: lang==="ru"?"СЛОЖНЫЙ":"DIFÍCIL" };
  let html = questions.map((q, i) => \`
    <div class="question-item \${selected && selected.id === q.id ? 'selected' : ''}" onclick="selectQuestion(\${i})">
      <div class="q-meta">
        <span class="badge badge-\${q.difficulty}">\${diffLabel[q.difficulty]||q.difficulty}</span>
        <span class="badge badge-pct">\${q.percent_correct ?? 50}% верно</span>
        <span class="badge badge-pct">\${q.answer_options?.length || 0} вариантов</span>
      </div>
      <div class="q-text">\${q.question}</div>
    </div>
  \`).join('');

  html += \`<div class="pagination">
    <span style="color:#8B949E;font-size:13px">\${offset+1}–\${Math.min(offset+LIMIT, total)} из \${total}</span>
    <button class="btn btn-sm btn-primary" \${offset===0?'disabled':''} onclick="prevPage()">← Назад</button>
    <button class="btn btn-sm btn-primary" \${offset+LIMIT>=total?'disabled':''} onclick="nextPage()">Вперёд →</button>
  </div>\`;

  document.getElementById("list").innerHTML = html;
}

function prevPage() { if (offset > 0) { offset -= LIMIT; loadQuestions(); } }
function nextPage() { offset += LIMIT; loadQuestions(); }

function selectQuestion(i) {
  selected = questions[i];
  renderList();
  renderPreview();
  setTimeout(renderOutroChips, 50); // chips depend on selected.language
}

function renderPreview() {
  if (!selected) return;
  const q = selected;
  const lang = q.language || document.getElementById("lang").value;

  const answersHTML = (q.answer_options || []).map((o, i) => \`
    <div class="edit-answer-row" style="align-items:flex-start">
      <div class="edit-answer-num \${o.is_correct ? 'correct' : ''}" style="margin-top:8px">\${o.is_correct ? '✓' : i+1}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px">
        <input class="edit-input \${o.is_correct ? 'correct' : ''}" id="editAnswer_\${i}" value="\${escHtml(o.text)}" placeholder="Вариант \${i+1} (ES)">
        \${lang === 'es' ? \`<input class="edit-input" id="editAnswerRu_\${i}" value="\${escHtml(o.text_ru||'')}" placeholder="Перевод на русский..." style="font-size:13px;border-color:rgba(255,255,255,0.06)">\` : ''}
      </div>
    </div>
  \`).join('');

  const ruBlock = lang === "es" ? \`
    <hr class="section-divider">
    <div class="edit-group">
      <div class="edit-label">🇷🇺 Перевод вопроса (субтитр)</div>
      <textarea class="edit-textarea" id="editQuestionRu" rows="2" placeholder="Перевод вопроса на русский...">\${escHtml(q.question_ru || '')}</textarea>
    </div>
    <div class="edit-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <div class="edit-label" style="margin-bottom:0">🇷🇺 Объяснение на русском (озвучка RU-видео)</div>
        <button class="btn-regen" onclick="adaptText('editExplanationRu','ru')" id="regenExplRu">🔄 Адаптировать для TTS</button>
      </div>
      <textarea class="edit-textarea" id="editExplanationRu" rows="4" placeholder="Объяснение для русскоязычного видео...">\${escHtml(q.explanation_ru || q.explanationRu || '')}</textarea>
    </div>
  \` : '';

  document.getElementById("preview").innerHTML = \`
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;color:#F0F6FC;font-size:17px">✏️ Редактор</span>
      <span style="font-size:12px;color:#8B949E">\${lang.toUpperCase()} · \${q.percent_correct}% верно</span>
    </div>

    \${q.image_url ? \`<img class="preview-img" src="\${q.image_url}" alt="" style="border-radius:12px;width:100%;margin-bottom:16px;object-fit:cover;max-height:200px">\` : ''}

    <div class="edit-group">
      <div class="edit-label">❓ Вопрос</div>
      <textarea class="edit-textarea" id="editQuestion" rows="3">\${escHtml(q.question)}</textarea>
    </div>

    <div class="edit-group">
      <div class="edit-label">📋 Варианты ответов</div>
      \${answersHTML}
    </div>

    <div class="edit-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <div class="edit-label" style="margin-bottom:0">💡 Объяснение</div>
        <button class="btn-regen" onclick="adaptText('editExplanation','${lang}')" id="regenExpl">🔄 Адаптировать для TTS</button>
      </div>
      <textarea class="edit-textarea" id="editExplanation" rows="5">\${escHtml(q.explanation)}</textarea>
    </div>

    \${ruBlock}

    <hr class="section-divider">

    <!-- ── КОНЦОВКА (Outro) ──────────────────────────────────────────── -->
    <div class="edit-group">
      <div class="edit-label">🎬 Концовка ролика</div>

      <!-- RU row -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:13px">🇷🇺</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px" id="outroChipsRU"></div>
      </div>
      <textarea class="edit-textarea" id="outroTextRU" rows="2"
        placeholder="Концовка русского ролика…"
        oninput="window._outroActiveRU=null;syncOutroActive('RU')" ></textarea>

      \${lang === 'es' ? \`
      <!-- ES row — only for DGT questions -->
      <div style="display:flex;align-items:center;gap:6px;margin:8px 0 6px">
        <span style="font-size:13px">🇪🇸</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px" id="outroChipsES"></div>
      </div>
      <textarea class="edit-textarea" id="outroTextES" rows="2"
        placeholder="Концовка испанского ролика…"
        oninput="window._outroActiveES=null;syncOutroActive('ES')" ></textarea>
      \` : ''}
    </div>

    <!-- ── НАСТРОЙКИ ──────────────────────────────────────────────────── -->
    <div class="edit-group" style="display:flex;align-items:center;gap:12px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#8B949E">
        <input type="checkbox" id="showExplanation" style="width:16px;height:16px;cursor:pointer">
        Показывать объяснение в ролике
      </label>
    </div>

    <!-- ── ОПИСАНИЕ ДЛЯ ЮТУБ ──────────────────────────────────────────────── -->
    <hr class="section-divider">
    <div class="edit-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="edit-label" style="margin-bottom:0">📝 Описание для YouTube</div>
        <button class="btn-regen" onclick="generateDescription()" id="genDescBtn">✨ Сгенерировать</button>
      </div>
      <div id="descOutput" style="display:none">
        <div class="desc-label">ЗАГОЛОВОК</div>
        <div class="desc-box" id="descTitle" style="margin-bottom:10px;font-weight:700;font-size:14px"></div>
        <div class="desc-label">ОПИСАНИЕ</div>
        <div class="desc-box" id="descBody"></div>
        <button onclick="copyDesc()" style="margin-top:8px;padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#C9D1D9;font-size:12px;cursor:pointer;font-family:inherit">📋 Скопировать</button>
      </div>
    </div>

    <div class="preview-actions">
      <div style="display:flex;gap:8px">
        <button class="btn btn-render" style="flex:1" onclick="renderVideo()" id="renderBtn">
          ✅ Готово!
        </button>
        <button class="btn btn-sm btn-danger" onclick="clearAudio()" title="Удалить кэш аудио для этого вопроса">
          🗑 Аудио
        </button>
      </div>
      <div id="renderLog" class="render-log" style="display:none">Запускаем рендер...</div>
    </div>
  \`;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function clearAudio() {
  if (!selected) return;
  const res = await fetch(\`/api/clear-audio?id=\${selected.id}\`, { method: 'DELETE' });
  const data = await res.json();
  const log = document.getElementById('renderLog');
  if (log) { log.style.display = 'block'; log.textContent = data.message || 'Аудио очищено'; }
}

// ── Outro templates ────────────────────────────────────────────────────────
const OUTRO_TEMPLATES = {
  ru: [
    { id:"subscribe", label:"Подпишись",     text:"Подпишись! Каждый день новый вопрос ПДД Испании 🇪🇸" },
    { id:"tag",       label:"Skilyapp.com",   text:"Переходи на Skilyapp.com — и готовься к экзамену на права в Испании бесплатно! 🚀" },
    { id:"comment",   label:"Угадал?",       text:"Угадал? Пиши ✅ или ❌ в комментарии!" },
    { id:"skily",     label:"Skily",         text:"Готовишься к испанским правам? 2000+ вопросов на Skily 🚀" },
    { id:"save",      label:"Сохрани",       text:"Сохрани видео — пригодится на экзамене! 📌" },
    { id:"challenge", label:"Челлендж",      text:"Сдашь DGT с первого раза? Проверь себя на Skily! 🏆" },
  ],
  es: [
    { id:"subscribe", label:"Suscríbete",    text:"Suscríbete — nueva pregunta DGT cada día 🇪🇸" },
    { id:"tag",       label:"Skilyapp.com",   text:"¡Entra en Skilyapp.com y prepárate para el DGT gratis! 🚀" },
    { id:"comment",   label:"¿Acertaste?",   text:"¿Acertaste? ¡Comenta ✅ o ❌!" },
    { id:"skily",     label:"Skily",         text:"¿Preparando el DGT? +2000 preguntas en Skily 🚀" },
    { id:"save",      label:"Guarda",        text:"¡Guarda este video para repasar antes del examen! 📌" },
    { id:"challenge", label:"Desafío",       text:"¿Aprobarás el DGT a la primera? ¡Demuéstralo en Skily! 🏆" },
  ],
};

function renderOutroChips() {
  if (!selected) return;
  window._outroMap = {};
  window._outroActiveRU = null;
  window._outroActiveES = null;

  function buildChips(containerId, langKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const templates = OUTRO_TEMPLATES[langKey] || OUTRO_TEMPLATES.ru;
    templates.forEach(t => { window._outroMap[t.id + '_' + langKey] = t.text; });
    container.innerHTML = templates.map(t => {
      const key = t.id + '_' + langKey;
      return \`<button id="chip_\${key}"
        onclick="selectOutro('\${key}','\${langKey}')"
        style="padding:4px 11px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#C9D1D9;font-size:12px;
               cursor:pointer;font-family:inherit;transition:all .15s">\${t.label}</button>\`;
    }).join('');
  }
  buildChips('outroChipsRU', 'ru');
  buildChips('outroChipsES', 'es');
}

function syncOutroActive(langKey) {
  // deactivate all chips for this lang when user types manually
  (OUTRO_TEMPLATES[langKey.toLowerCase()] || []).forEach(t => {
    const chip = document.getElementById('chip_' + t.id + '_' + langKey.toLowerCase());
    if (chip) { chip.style.borderColor = 'rgba(255,255,255,0.15)'; chip.style.background = 'rgba(255,255,255,0.05)'; chip.style.color = '#C9D1D9'; }
  });
}

function selectOutro(key, langKey) {
  const text = window._outroMap[key];
  if (!text) return;
  const fieldId = langKey === 'es' ? 'outroTextES' : 'outroTextRU';
  const ta = document.getElementById(fieldId);
  if (ta) { ta.value = text; }

  // Highlight active chip, reset others in this lang
  (OUTRO_TEMPLATES[langKey] || []).forEach(t => {
    const chip = document.getElementById('chip_' + t.id + '_' + langKey);
    if (!chip) return;
    const isActive = (t.id + '_' + langKey) === key;
    chip.style.borderColor  = isActive ? '#2F81F7' : 'rgba(255,255,255,0.15)';
    chip.style.background   = isActive ? 'rgba(47,129,247,0.15)' : 'rgba(255,255,255,0.05)';
    chip.style.color        = isActive ? '#79C0FF' : '#C9D1D9';
  });
}

async function renderVideo() {
  if (!selected) return;
  const btn = document.getElementById("renderBtn");
  const log = document.getElementById("renderLog");
  btn.disabled = true;
  btn.textContent = "⏳ Рендерится...";
  log.style.display = "block";
  log.textContent = "Генерируем аудио и рендерим...\\n";

  // Собираем отредактированные значения из полей
  const editedQuestion = {
    ...selected,
    question:    document.getElementById('editQuestion')?.value ?? selected.question,
    explanation: document.getElementById('editExplanation')?.value ?? selected.explanation,
    question_ru: document.getElementById('editQuestionRu')?.value ?? selected.question_ru,
    explanationRu: document.getElementById('editExplanationRu')?.value ?? selected.explanationRu ?? selected.explanation_ru,
    outro_text_ru: document.getElementById('outroTextRU')?.value?.trim() || undefined,
    outro_text_es: document.getElementById('outroTextES')?.value?.trim() || undefined,
    // legacy fallback — use RU text as default
    outro_text:  document.getElementById('outroTextRU')?.value?.trim() || undefined,
    show_explanation: document.getElementById('showExplanation')?.checked !== false,
    answer_options: (selected.answer_options || []).map((o, i) => ({
      ...o,
      text:    document.getElementById(\`editAnswer_\${i}\`)?.value ?? o.text,
      text_ru: document.getElementById(\`editAnswerRu_\${i}\`)?.value ?? o.text_ru,
    })),
  };

  try {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: editedQuestion }),
    });
    const data = await res.json();
    if (data.output) {
      btn.textContent = "✅ Готово!";
      btn.style.background = "#3FB950";
      let msg = "ES: " + data.output + "\\n";
      if (data.outputRU) msg += "RU: " + data.outputRU + "\\n";
      log.textContent += msg;
    } else {
      btn.textContent = "⚠️ Ошибка";
      btn.style.background = "#da3633";
      log.textContent += data.error || "Неизвестная ошибка";
      btn.disabled = false;
    }
  } catch(e) {
    btn.textContent = "⚠️ Ошибка";
    btn.style.background = "#da3633";
    log.textContent += e.message;
    btn.disabled = false;
  }
}

// ── Gemini TTS text adaptation ─────────────────────────────────────────────
async function adaptText(fieldId, lang) {
  const ta = document.getElementById(fieldId);
  if (!ta) return;
  const btn = document.getElementById(fieldId === 'editExplanationRu' ? 'regenExplRu' : 'regenExpl');
  const original = ta.value.trim();
  if (!original) return;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Адаптируем...'; }
  try {
    const res = await fetch('/api/adapt-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: original, lang }),
    });
    const data = await res.json();
    if (data.adapted) {
      ta.value = data.adapted;
    } else {
      alert('Ошибка адаптации: ' + (data.error || 'неизвестная ошибка'));
    }
  } catch(e) {
    alert('Ошибка: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Адаптировать для TTS'; }
  }
}

// ── YouTube description generation ────────────────────────────────────────
async function generateDescription() {
  if (!selected) return;
  const btn = document.getElementById('genDescBtn');
  const out = document.getElementById('descOutput');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Генерируем...'; }
  try {
    const question = document.getElementById('editQuestion')?.value || selected.question;
    const explanation = document.getElementById('editExplanation')?.value || selected.explanation;
    const lang = selected.language || document.getElementById('lang').value;
    const res = await fetch('/api/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, explanation, lang, percent_correct: selected.percent_correct }),
    });
    const data = await res.json();
    if (data.title && data.description) {
      document.getElementById('descTitle').textContent = data.title;
      document.getElementById('descBody').textContent = data.description;
      if (out) out.style.display = 'block';
    } else {
      alert('Ошибка генерации: ' + (data.error || 'неизвестная ошибка'));
    }
  } catch(e) {
    alert('Ошибка: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Сгенерировать'; }
  }
}

function copyDesc() {
  const title = document.getElementById('descTitle')?.textContent || '';
  const body = document.getElementById('descBody')?.textContent || '';
  navigator.clipboard.writeText(title + '\\n\\n' + body).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Скопировано!';
    setTimeout(() => { btn.textContent = '📋 Скопировать'; }, 2000);
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

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\nSkily Video Picker ready: http://localhost:${PORT}\n`);
});
