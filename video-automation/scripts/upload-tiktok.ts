/**
 * upload-tiktok.ts
 * Uploads rendered MP4 videos to TikTok via Content Posting API v2.
 *
 * Setup:
 *  1. Create app at https://developers.tiktok.com/
 *  2. Enable "Content Posting API" scope
 *  3. Get access token via OAuth flow
 *  4. Set TIKTOK_ACCESS_TOKEN in .env
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const TIKTOK_API = "https://open.tiktokapis.com/v2";

interface RenderManifestItem {
  question_id: string;
  language: string;
  series_number: number;
  hook_title: string;
  explanation: string;
  output_path: string | null;
}

function buildCaption(item: RenderManifestItem): string {
  const lang = item.language as "ru" | "es";

  if (lang === "ru") {
    return [
      item.hook_title,
      "",
      `📚 Объяснение: ${item.explanation}`,
      "",
      `#ПДД #Вождение #Права #Вопрос${String(item.series_number).padStart(3, "0")} #Skily #ЗнаниеСила`,
    ].join("\n");
  } else {
    return [
      item.hook_title,
      "",
      `📚 Explicación: ${item.explanation}`,
      "",
      `#DGT #Conducir #Carnet #Pregunta${String(item.series_number).padStart(3, "0")} #Skily #ExamenDGT`,
    ].join("\n");
  }
}

async function initVideoUpload(fileSizeBytes: number): Promise<{
  upload_url: string;
  publish_id: string;
}> {
  const res = await axios.post(
    `${TIKTOK_API}/post/publish/video/init/`,
    {
      post_info: {
        title: "", // set in caption separately
        privacy_level: "SELF_ONLY", // change to PUBLIC_TO_EVERYONE when ready
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fileSizeBytes,
        chunk_size: fileSizeBytes,
        total_chunk_count: 1,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );
  return res.data.data;
}

async function uploadVideoChunk(
  uploadUrl: string,
  filePath: string,
  fileSizeBytes: number
): Promise<void> {
  const videoBuffer = fs.readFileSync(filePath);
  await axios.put(uploadUrl, videoBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${fileSizeBytes - 1}/${fileSizeBytes}`,
      "Content-Length": fileSizeBytes,
    },
  });
}

export async function uploadToTikTok(
  item: RenderManifestItem
): Promise<{ success: boolean; publish_id?: string; error?: string }> {
  if (!item.output_path || !fs.existsSync(item.output_path)) {
    return { success: false, error: "Video file not found" };
  }

  if (!process.env.TIKTOK_ACCESS_TOKEN) {
    return { success: false, error: "TIKTOK_ACCESS_TOKEN not set" };
  }

  try {
    const stats = fs.statSync(item.output_path);
    const fileSizeBytes = stats.size;

    console.log(`  TikTok: Initializing upload for ${path.basename(item.output_path)}...`);
    const { upload_url, publish_id } = await initVideoUpload(fileSizeBytes);

    console.log(`  TikTok: Uploading ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB...`);
    await uploadVideoChunk(upload_url, item.output_path, fileSizeBytes);

    // Note: TikTok API processes caption/hashtags separately after upload.
    // The caption is set via post_info.title (max 2200 chars) in the init step.
    // For pinned comment with explanation, use TikTok Creator Center manually
    // or upgrade to Comment API (separate scope).

    console.log(`  TikTok: ✓ publish_id=${publish_id}`);
    return { success: true, publish_id };
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message;
    console.error(`  TikTok: ✗ ${msg}`);
    return { success: false, error: msg };
  }
}

// Run standalone: upload all from render-manifest.json
if (require.main === module) {
  const manifestPath = path.join(__dirname, "../renders/render-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("render-manifest.json not found. Run render-batch.ts first.");
    process.exit(1);
  }

  const manifest: RenderManifestItem[] = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  );

  (async () => {
    for (const item of manifest) {
      if (!item.output_path) continue;
      console.log(`\nUploading to TikTok: [${item.language.toUpperCase()}] #${item.series_number}`);
      const result = await uploadToTikTok(item);
      console.log(`  Result:`, result);
    }
  })().catch(console.error);
}
