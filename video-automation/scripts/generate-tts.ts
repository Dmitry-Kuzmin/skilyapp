/**
 * generate-tts.ts
 * Generates ElevenLabs voice narration for all audio segments of a video question.
 *
 * Produces:
 *   public/audio/{id}-{lang}-question.mp3       — question text
 *   public/audio/{id}-{lang}-answer-{i}.mp3     — each answer option
 *   public/audio/{id}-{lang}-explanation.mp3    — explanation
 *   public/audio/{id}-ru-explanation.mp3        — Russian explanation (if explanationRu set)
 *
 * All files are cached — skipped if already exist.
 * Returns durations in seconds for dynamic Remotion timing.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import axios from "axios";
import * as mm from "music-metadata";
import type { VideoQuestion } from "../src/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const API_KEY  = process.env.ELEVENLABS_API_KEY ?? "";
const VOICE_ES = process.env.ELEVENLABS_VOICE_ES ?? "CwhRBWXzGAHq8TQ4Fs17"; // Roger
const VOICE_RU = process.env.ELEVENLABS_VOICE_RU ?? "kwajW3Xh5svCeKU5ky2S";
const AUDIO_DIR = path.join(__dirname, "../public/audio");
const MODEL = "eleven_v3";

// ── ElevenLabs synthesis ──────────────────────────────────────────────────────
async function synthesize(text: string, voiceId: string): Promise<Buffer | null> {
  if (!API_KEY) return null;
  try {
    const res = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.25, use_speaker_boost: true },
      },
      {
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
        timeout: 30_000,
      }
    );
    return Buffer.from(res.data);
  } catch (err: any) {
    const msg = err?.response?.data
      ? Buffer.from(err.response.data).toString()
      : err?.message;
    console.error(`  ✗ ElevenLabs: ${msg}`);
    return null;
  }
}

// ── Get audio duration using music-metadata ───────────────────────────────────
async function getDurationSec(filePath: string): Promise<number> {
  try {
    const metadata = await mm.parseFile(filePath);
    return metadata.format.duration ?? fallbackDuration(filePath);
  } catch {
    return fallbackDuration(filePath);
  }
}

// Fallback: estimate from file size (ElevenLabs outputs ~24KB/s at 192kbps)
function fallbackDuration(filePath: string): number {
  try {
    return fs.statSync(filePath).size / 24_000;
  } catch {
    return 3;
  }
}

// ── Generate + cache one file, return its duration ───────────────────────────
async function genFile(
  text: string,
  voiceId: string,
  filePath: string,
  label: string
): Promise<number | null> {
  if (!fs.existsSync(filePath)) {
    process.stdout.write(`  🎙 ${label}…`);
    const audio = await synthesize(text, voiceId);
    if (!audio) { process.stdout.write(" ✗\n"); return null; }
    fs.writeFileSync(filePath, audio);
    process.stdout.write(` ✓ (${(audio.length / 1024).toFixed(0)} KB)\n`);
  }
  return getDurationSec(filePath);
}

// ── Answer prefix labels ──────────────────────────────────────────────────────
const ANSWER_PREFIX = {
  es: ["Opción uno: ", "Opción dos: ", "Opción tres: ", "Opción cuatro: "],
  ru: ["Вариант один: ", "Вариант два: ", "Вариант три: ", "Вариант четыре: "],
};

// ── Main export ───────────────────────────────────────────────────────────────
export interface TTSResult {
  questionAudioFile?: string;
  questionAudioDurationSec?: number;
  answerAudioFiles?: string[];
  answerAudioDurationsSec?: number[];
  explanationAudioFile?: string;
  explanationAudioDurationSec?: number;
  explanationRuAudioFile?: string;
  explanationRuAudioDurationSec?: number;
}

export async function generateTTS(question: VideoQuestion): Promise<TTSResult> {
  if (!API_KEY) {
    console.warn("  ⚠ ELEVENLABS_API_KEY not set — skipping TTS");
    return {};
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const lang    = question.language;
  const voiceEs = VOICE_ES;
  const voiceRu = VOICE_RU;
  const voice   = lang === "ru" ? voiceRu : voiceEs;
  const result: TTSResult = {};

  // ── Question narration ──
  const qFile = path.join(AUDIO_DIR, `${question.id}-${lang}-question.mp3`);
  const qDur  = await genFile(question.question, voice, qFile, "question");
  if (qDur !== null) {
    result.questionAudioFile        = `audio/${question.id}-${lang}-question.mp3`;
    result.questionAudioDurationSec = qDur;
  }

  // ── Answer options ──
  const prefixes = ANSWER_PREFIX[lang] ?? ANSWER_PREFIX.es;
  const answerFiles: string[] = [];
  const answerDurs:  number[] = [];
  for (let i = 0; i < question.answer_options.length; i++) {
    const text    = prefixes[i] + question.answer_options[i].text;
    const aFile   = path.join(AUDIO_DIR, `${question.id}-${lang}-answer-${i}.mp3`);
    const dur     = await genFile(text, voice, aFile, `answer ${i + 1}`);
    answerFiles.push(`audio/${question.id}-${lang}-answer-${i}.mp3`);
    answerDurs.push(dur ?? 2.5);
  }
  result.answerAudioFiles       = answerFiles;
  result.answerAudioDurationsSec = answerDurs;

  // ── Explanation (same language) ──
  const eFile = path.join(AUDIO_DIR, `${question.id}-${lang}-explanation.mp3`);
  const eDur  = await genFile(question.explanation, voice, eFile, "explanation");
  if (eDur !== null) {
    result.explanationAudioFile        = `audio/${question.id}-${lang}-explanation.mp3`;
    result.explanationAudioDurationSec = eDur;
  }

  // ── Russian explanation (for cross-language RU variant) ──
  if (question.explanationRu) {
    const erFile = path.join(AUDIO_DIR, `${question.id}-ru-explanation.mp3`);
    const erDur  = await genFile(question.explanationRu, voiceRu, erFile, "explanation [RU]");
    if (erDur !== null) {
      result.explanationRuAudioFile        = `audio/${question.id}-ru-explanation.mp3`;
      result.explanationRuAudioDurationSec = erDur;
    }
  }

  return result;
}

// ── Standalone test ───────────────────────────────────────────────────────────
if (require.main === module) {
  const testQ: VideoQuestion = {
    id: "tts-test-full",
    question: "¿A qué velocidad máxima puede circular un vehículo en autopista?",
    explanation: "En autopistas y autovías la velocidad máxima genérica es 120 km/h.",
    explanationRu: "На автострадах максимальная скорость — 120 км/ч. Превышение является серьёзным нарушением.",
    image_url: null,
    difficulty: "easy",
    percent_correct: 78,
    topic: "Normas de circulación",
    answer_options: [
      { id: "b1", text: "100 km/h", is_correct: false, position: 1 },
      { id: "b2", text: "120 km/h", is_correct: true,  position: 2 },
      { id: "b3", text: "130 km/h", is_correct: false, position: 3 },
    ],
    country: "es",
    language: "es",
    hook_title: "¿Sabes la respuesta? ⚡",
    series_number: 1,
  };

  console.log("Testing ElevenLabs TTS (all segments)…");
  generateTTS(testQ).then((r) => {
    console.log("\nResult:");
    console.log(`  question:     ${r.questionAudioDurationSec?.toFixed(1)}s`);
    r.answerAudioDurationsSec?.forEach((d, i) =>
      console.log(`  answer ${i + 1}:     ${d.toFixed(1)}s`)
    );
    console.log(`  explanation:  ${r.explanationAudioDurationSec?.toFixed(1)}s`);
    console.log(`  explanation RU: ${r.explanationRuAudioDurationSec?.toFixed(1)}s`);
  }).catch(console.error);
}
