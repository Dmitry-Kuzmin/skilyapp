/**
 * generate-quiz-fast-tts-edge.ts
 * Generates TTS for QuizFast using Microsoft Edge TTS — FREE, no API key, no signup.
 *
 * Uses Microsoft Azure Neural voices via Edge browser service.
 * Spanish voice: es-ES-AlvaroNeural (male, closest to ElevenLabs Valentino quality)
 *
 * Outputs to public/audio/quiz-fast-edge/:
 *   hook-es-edge.mp3
 *   reveal-{slug}-es-edge.mp3
 *   outro-es-edge.mp3
 *
 * Run:
 *   cd video-automation
 *   npx ts-node --esm scripts/generate-quiz-fast-tts-edge.ts
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as mm from "music-metadata";
import { EdgeTTS } from "@andresaya/edge-tts";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(_dirname, "../public/audio/quiz-fast-edge");

const VOICE = "es-ES-AlvaroNeural";  // free Microsoft Neural, male, Spain Spanish

interface QuizItem { slug: string; correctText: string; }

const HOOK_TEXT  = "¿Sabes qué significa esta señal?";
const OUTRO_TEXT = "Aprende todas las señales en Skily, gratis.";
const ITEMS: QuizItem[] = [
  { slug: "ceda-el-paso", correctText: "Ceda el paso." },
  { slug: "stop",         correctText: "STOP. Detención obligatoria." },
  { slug: "semaforos",    correctText: "Semáforos más adelante." },
];

async function synth(text: string, outPath: string): Promise<void> {
  const tts = new EdgeTTS();
  await tts.synthesize(text, VOICE, {
    rate: "10%",          // чуть медленнее для чёткости
    volume: "100%",
    outputFormat: "audio-24khz-96kbitrate-mono-mp3",
  });
  // toFile ожидает путь без расширения
  const noExt = outPath.replace(/\.mp3$/, "");
  await tts.toFile(noExt);
  // пакет добавляет .mp3 сам
  const created = noExt + ".mp3";
  if (created !== outPath && fs.existsSync(created)) {
    fs.renameSync(created, outPath);
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

async function genFile(
  text: string,
  fileName: string,
  label: string,
): Promise<{ relPath: string; sec: number } | null> {
  const fullPath = path.join(OUT_DIR, fileName);
  const rel      = `audio/quiz-fast-edge/${fileName}`;
  if (fs.existsSync(fullPath)) {
    const sec = await durSec(fullPath);
    console.log(`  ↻ ${label} (cached) — ${sec.toFixed(2)}s`);
    return { relPath: rel, sec };
  }
  process.stdout.write(`  🎙 ${label}…`);
  try {
    await synth(text, fullPath);
    const sec = await durSec(fullPath);
    const kb  = (fs.statSync(fullPath).size / 1024).toFixed(0);
    process.stdout.write(` ✓ ${kb} KB, ${sec.toFixed(2)}s\n`);
    return { relPath: rel, sec };
  } catch (err: any) {
    process.stdout.write(` ✗ ${err?.message ?? err}\n`);
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`🎵 Generating QuizFast TTS — Microsoft Edge Neural (FREE)\n   Voice: ${VOICE}\n`);

  console.log("HOOK:");
  const hook = await genFile(HOOK_TEXT, "hook-es-edge.mp3", "hook");

  console.log("\nREVEALS:");
  const reveals: Record<string, { relPath: string; sec: number }> = {};
  for (const it of ITEMS) {
    const r = await genFile(it.correctText, `reveal-${it.slug}-es-edge.mp3`, `reveal ${it.slug}`);
    if (r) reveals[it.slug] = r;
  }

  console.log("\nOUTRO:");
  const outro = await genFile(OUTRO_TEXT, "outro-es-edge.mp3", "outro");

  console.log("\n────────────────────────────────────");
  console.log("Paste into Root.tsx (Edge variant):");
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
