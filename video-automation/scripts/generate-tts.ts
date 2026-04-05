/**
 * generate-tts.ts
 * Generates voice narration for video questions using ElevenLabs API.
 *
 * Produces two MP3 files per question:
 *   public/audio/{id}-{lang}-question.mp3    — question text narration
 *   public/audio/{id}-{lang}-explanation.mp3 — explanation narration
 *
 * Files are cached — won't re-generate if already exist.
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import axios from "axios";
import type { VideoQuestion } from "../src/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ES = process.env.ELEVENLABS_VOICE_ES ?? "CwhRBWXzGAHq8TQ4Fs17"; // Roger
const VOICE_RU = process.env.ELEVENLABS_VOICE_RU ?? "CwhRBWXzGAHq8TQ4Fs17"; // Roger
const AUDIO_DIR = path.join(__dirname, "../public/audio");
const MODEL = "eleven_multilingual_v2";

interface TTSResult {
  questionAudioFile?: string;   // relative to public/ for staticFile()
  explanationAudioFile?: string;
}

async function synthesize(text: string, voiceId: string): Promise<Buffer | null> {
  if (!API_KEY) return null;

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.25,
          use_speaker_boost: true,
        },
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
    return Buffer.from(response.data);
  } catch (err: any) {
    const msg = err?.response?.data
      ? Buffer.from(err.response.data).toString()
      : err?.message;
    console.error(`  ✗ ElevenLabs error: ${msg}`);
    return null;
  }
}

export async function generateTTS(question: VideoQuestion): Promise<TTSResult> {
  if (!API_KEY) {
    console.warn("  ⚠ ELEVENLABS_API_KEY not set — skipping TTS");
    return {};
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const voiceId = question.language === "ru" ? VOICE_RU : VOICE_ES;
  const qFile = `${question.id}-${question.language}-question.mp3`;
  const eFile = `${question.id}-${question.language}-explanation.mp3`;
  const qPath = path.join(AUDIO_DIR, qFile);
  const ePath = path.join(AUDIO_DIR, eFile);
  const result: TTSResult = {};

  // ── Question narration ──────────────────────────────────────────────────────
  if (!fs.existsSync(qPath)) {
    process.stdout.write("  🎙 Generating question audio...");
    const audio = await synthesize(question.question, voiceId);
    if (audio) {
      fs.writeFileSync(qPath, audio);
      process.stdout.write(` ✓ (${(audio.length / 1024).toFixed(0)} KB)\n`);
      result.questionAudioFile = `audio/${qFile}`;
    } else {
      process.stdout.write(" ✗\n");
    }
  } else {
    result.questionAudioFile = `audio/${qFile}`;
  }

  // ── Explanation narration ───────────────────────────────────────────────────
  if (!fs.existsSync(ePath)) {
    process.stdout.write("  🎙 Generating explanation audio...");
    const audio = await synthesize(question.explanation, voiceId);
    if (audio) {
      fs.writeFileSync(ePath, audio);
      process.stdout.write(` ✓ (${(audio.length / 1024).toFixed(0)} KB)\n`);
      result.explanationAudioFile = `audio/${eFile}`;
    } else {
      process.stdout.write(" ✗\n");
    }
  } else {
    result.explanationAudioFile = `audio/${eFile}`;
  }

  return result;
}

// ── Standalone: generate TTS for a single test question ────────────────────
if (require.main === module) {
  const testQ: VideoQuestion = {
    id: "tts-test",
    question: "¿A qué velocidad máxima puede circular un vehículo en autopista?",
    explanation: "En autopistas y autovías la velocidad máxima genérica es 120 km/h. Superar este límite es una infracción grave.",
    image_url: null,
    difficulty: "easy",
    percent_correct: 78,
    topic: "Normas de circulación",
    answer_options: [],
    country: "es",
    language: "es",
    hook_title: "¿Sabes la respuesta? ⚡",
    series_number: 1,
  };

  console.log("Testing ElevenLabs TTS...");
  generateTTS(testQ)
    .then((r) => {
      console.log("Generated:", r);
    })
    .catch(console.error);
}
