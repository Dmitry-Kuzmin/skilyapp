/**
 * render-batch.ts
 * Renders a batch of VideoTemplate compositions to MP4 files.
 * Uses Remotion's Node.js API for headless rendering.
 *
 * Output: renders/question-{id}-{lang}.mp4
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import type { VideoQuestion } from "../src/types";
import { exportQuestions } from "./export-questions";
import { generateTTS } from "./generate-tts";

dotenv.config({ path: path.join(__dirname, "../.env") });

const RENDERS_DIR =
  process.env.RENDERS_DIR ?? path.join(__dirname, "../renders");

const FORCE_RENDER = process.env.FORCE_RENDER === "true";

async function renderQuestion(
  bundlePath: string,
  question: VideoQuestion
): Promise<string> {
  const outputPath = path.join(
    RENDERS_DIR,
    `question-${question.id}-${question.language}.mp4`
  );

  // Skip only if exists AND no TTS audio to add AND FORCE_RENDER is off
  const hasTTS = !!(question.questionAudioFile || question.explanationAudioFile);
  if (fs.existsSync(outputPath) && !hasTTS && !FORCE_RENDER) {
    console.log(`  ↳ Already exists, skipping: ${path.basename(outputPath)}`);
    return outputPath;
  }

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: "VideoTemplate",
    inputProps: { question },
  });

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: "h264",
    outputLocation: outputPath,
    overwrite: true,
    inputProps: { question },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  Rendering ${progress * 100 | 0}%`);
    },
  });

  process.stdout.write("\n");
  return outputPath;
}

export async function renderBatch(questions: VideoQuestion[]): Promise<string[]> {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });

  console.log("Bundling Remotion...");
  const bundlePath = await bundle({
    entryPoint: path.join(__dirname, "../src/Root.tsx"),
    publicDir: path.join(__dirname, "../public"), // ensures audio/ files are served correctly
    webpackOverride: (config) => config,
  });

  const outputs: string[] = [];

  for (const q of questions) {
    console.log(`\nRendering [${q.language.toUpperCase()}] #${q.series_number}: ${q.hook_title}`);
    try {
      // Generate TTS voiceover before rendering (cached — skips if already exists)
      const tts = await generateTTS(q);
      const enrichedQuestion: VideoQuestion = { ...q, ...tts };

      const out = await renderQuestion(bundlePath, enrichedQuestion);
      outputs.push(out);
      console.log(`  ✓ ${path.basename(out)}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
    }
  }

  // Save manifest for upload scripts
  const manifestPath = path.join(RENDERS_DIR, "render-manifest.json");
  const manifest = questions.map((q, i) => ({
    question_id: q.id,
    language: q.language,
    series_number: q.series_number,
    hook_title: q.hook_title,
    explanation: q.explanation,
    output_path: outputs[i] ?? null,
  }));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved: ${manifestPath}`);

  return outputs;
}

// Run standalone
if (require.main === module) {
  const batchSize = parseInt(process.env.BATCH_SIZE ?? "5", 10);
  exportQuestions(batchSize)
    .then((questions) => renderBatch(questions))
    .then((outputs) => {
      console.log(`\nDone. ${outputs.length} videos rendered.`);
      outputs.forEach((p) => console.log(` • ${p}`));
    })
    .catch(console.error);
}
