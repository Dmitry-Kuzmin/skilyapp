/**
 * run-pipeline.ts
 * Full automation pipeline:
 *   1. Export questions from Supabase
 *   2. Render videos via Remotion
 *   3. Upload to TikTok + YouTube
 *   4. Save results log
 *
 * Usage:
 *   npm run pipeline                     # Batch of 5 (default)
 *   BATCH_SIZE=3 npm run pipeline        # Custom batch
 *   DRY_RUN=true npm run pipeline        # Export + render only, no upload
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { exportQuestions } from "./export-questions";
import { renderBatch } from "./render-batch";
import { uploadToTikTok } from "./upload-tiktok";
import { uploadToYouTube } from "./upload-youtube";

dotenv.config({ path: path.join(__dirname, "../.env") });

const DRY_RUN = process.env.DRY_RUN === "true";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "5", 10);
const RENDERS_DIR = process.env.RENDERS_DIR ?? path.join(__dirname, "../renders");

interface PipelineResult {
  timestamp: string;
  batch_size: number;
  questions_exported: number;
  videos_rendered: number;
  uploads: {
    question_id: string;
    language: string;
    series_number: number;
    tiktok?: { success: boolean; publish_id?: string; error?: string };
    youtube?: { success: boolean; video_id?: string; error?: string };
  }[];
}

async function run(): Promise<void> {
  console.log("=".repeat(60));
  console.log("SKILY VIDEO PIPELINE");
  console.log(`Batch size: ${BATCH_SIZE} | Dry run: ${DRY_RUN}`);
  console.log("=".repeat(60));

  // Step 1: Export questions
  console.log("\n[1/3] Exporting questions from Supabase...");
  const questions = await exportQuestions(BATCH_SIZE);
  if (questions.length === 0) {
    console.error("No questions available. Check your Supabase data.");
    process.exit(1);
  }
  console.log(`Exported ${questions.length} questions.`);

  // Step 2: Render videos
  console.log("\n[2/3] Rendering videos...");
  const outputPaths = await renderBatch(questions);
  const rendered = outputPaths.filter(Boolean);
  console.log(`Rendered ${rendered.length}/${questions.length} videos.`);

  // Step 3: Upload
  const result: PipelineResult = {
    timestamp: new Date().toISOString(),
    batch_size: BATCH_SIZE,
    questions_exported: questions.length,
    videos_rendered: rendered.length,
    uploads: [],
  };

  if (!DRY_RUN) {
    console.log("\n[3/3] Uploading to TikTok + YouTube...");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const outputPath = outputPaths[i] ?? null;
      const item = {
        question_id: q.id,
        language: q.language,
        series_number: q.series_number,
        hook_title: q.hook_title,
        explanation: q.explanation,
        output_path: outputPath,
      };

      console.log(`\n → [${q.language.toUpperCase()}] ${q.hook_title}`);

      const [tiktok, youtube] = await Promise.all([
        uploadToTikTok(item),
        uploadToYouTube(item),
      ]);

      result.uploads.push({
        question_id: q.id,
        language: q.language,
        series_number: q.series_number,
        tiktok,
        youtube,
      });
    }
  } else {
    console.log("\n[3/3] DRY RUN — skipping uploads.");
  }

  // Save results log
  const logPath = path.join(
    RENDERS_DIR,
    `pipeline-${new Date().toISOString().slice(0, 10)}.json`
  );
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify(result, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("PIPELINE COMPLETE");
  console.log(`Questions: ${result.questions_exported}`);
  console.log(`Rendered: ${result.videos_rendered}`);
  if (!DRY_RUN) {
    const ttOk = result.uploads.filter((u) => u.tiktok?.success).length;
    const ytOk = result.uploads.filter((u) => u.youtube?.success).length;
    console.log(`TikTok uploads: ${ttOk}/${questions.length}`);
    console.log(`YouTube uploads: ${ytOk}/${questions.length}`);
  }
  console.log(`Log: ${logPath}`);
  console.log("=".repeat(60));
}

run().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
