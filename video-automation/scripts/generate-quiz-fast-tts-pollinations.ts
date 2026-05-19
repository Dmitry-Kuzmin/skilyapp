/**
 * generate-quiz-fast-tts-pollinations.ts
 * Generates TTS for QuizFast using **FREE** Pollinations.ai API (no signup needed!)
 *
 * Uses ElevenLabs voices via Pollinations proxy → same quality as ElevenLabs but free.
 *
 * Outputs to public/audio/quiz-fast-pollinations/:
 *   hook-es-poll.mp3                  — "¿Sabes esta señal?"
 *   reveal-{slug}-es-poll.mp3         — correct answer per item
 *   outro-es-poll.mp3                 — CTA narration
 *
 * Cached: skips files that already exist.
 *
 * Run:
 *   cd video-automation
 *   npx ts-node --esm scripts/generate-quiz-fast-tts-pollinations.ts
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as mm from "music-metadata";

const _dirname = path.dirname(fileURLToPath(import.meta.url));

const VOICE_ES = "valentino"; // Pollinations uses simple voice names
const OUT_DIR  = path.join(_dirname, "../public/audio/quiz-fast-pollinations");

interface QuizItem {
  slug: string;
  correctText: string;
}

const HOOK_TEXT  = "¿Sabes qué significa esta señal?";
const OUTRO_TEXT = "Aprende todas las señales en Skily, gratis.";

const ITEMS: QuizItem[] = [
  { slug: "ceda-el-paso",  correctText: "Ceda el paso." },
  { slug: "stop",          correctText: "STOP. Detención obligatoria." },
  { slug: "semaforos",     correctText: "Semáforos más adelante." },
];

async function synth(text: string, voiceId: string): Promise<Buffer | null> {
  try {
    const url = `https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=${voiceId}`;
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30_000,
    });
    return Buffer.from(res.data);
  } catch (err: any) {
    const msg = err?.response?.status ? `HTTP ${err.response.status}` : err?.message;
    console.error(`  ✗ Pollinations: ${msg}`);
    return null;
  }
}

async function durSec(filePath: string): Promise<number> {
  try {
    const md = await mm.parseFile(filePath);
    return md.format.duration ?? fs.statSync(filePath).size / 24_000;
  } catch {
    return fs.statSync(filePath).size / 24_000;
  }
}

async function genFile(text: string, fileName: string, label: string): Promise<{ relPath: string; sec: number } | null> {
  const fullPath = path.join(OUT_DIR, fileName);
  const rel      = `audio/quiz-fast-pollinations/${fileName}`;
  if (fs.existsSync(fullPath)) {
    const sec = await durSec(fullPath);
    console.log(`  ↻ ${label} (cached) — ${sec.toFixed(2)}s`);
    return { relPath: rel, sec };
  }
  process.stdout.write(`  🎙 ${label}…`);
  const buf = await synth(text, VOICE_ES);
  if (!buf) { process.stdout.write(" ✗\n"); return null; }
  fs.writeFileSync(fullPath, buf);
  const sec = await durSec(fullPath);
  process.stdout.write(` ✓ ${(buf.length / 1024).toFixed(0)} KB, ${sec.toFixed(2)}s\n`);
  return { relPath: rel, sec };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("🎵 Generating QuizFast TTS with Pollinations.ai (FREE)…\n");

  console.log("HOOK:");
  const hook = await genFile(HOOK_TEXT, "hook-es-poll.mp3", "hook");

  console.log("\nREVEALS:");
  const reveals: Record<string, { relPath: string; sec: number }> = {};
  for (const it of ITEMS) {
    const r = await genFile(it.correctText, `reveal-${it.slug}-es-poll.mp3`, `reveal ${it.slug}`);
    if (r) reveals[it.slug] = r;
  }

  console.log("\nOUTRO:");
  const outro = await genFile(OUTRO_TEXT, "outro-es-poll.mp3", "outro");

  console.log("\n────────────────────────────────────");
  console.log("Paste into Root.tsx (Pollinations variant):");
  console.log("────────────────────────────────────\n");
  if (hook) {
    console.log(`  hookAudioFile: "${hook.relPath}",`);
    console.log(`  hookAudioDurationSec: ${hook.sec.toFixed(2)},`);
  }
  console.log();
  for (const it of ITEMS) {
    const r = reveals[it.slug];
    if (r) {
      console.log(`  // ${it.slug}`);
      console.log(`  revealAudioFile: "${r.relPath}",`);
      console.log(`  revealAudioDurationSec: ${r.sec.toFixed(2)},`);
    }
  }
  console.log();
  if (outro) {
    console.log(`  outroAudioFile: "${outro.relPath}",`);
    console.log(`  outroAudioDurationSec: ${outro.sec.toFixed(2)},`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
