/**
 * upload-youtube.ts
 * Uploads rendered MP4 videos to YouTube as Shorts via Data API v3.
 *
 * Setup:
 *  1. Google Cloud Console → Enable YouTube Data API v3
 *  2. Create OAuth 2.0 credentials (Desktop app)
 *  3. Run auth flow once to get refresh token: npx ts-node scripts/youtube-auth.ts
 *  4. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env
 *
 * Shorts requirement: video must be <= 60 seconds and vertical (9:16).
 * Our videos are 30s at 1080x1920 — perfect for Shorts.
 */

import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

interface RenderManifestItem {
  question_id: string;
  language: string;
  series_number: number;
  hook_title: string;
  explanation: string;
  output_path: string | null;
}

function getOAuth2Client() {
  const oauth2 = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  oauth2.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });
  return oauth2;
}

function buildTitle(item: RenderManifestItem): string {
  // YouTube Shorts title: max 100 chars
  const num = String(item.series_number).padStart(3, "0");
  if (item.language === "ru") {
    return `${item.hook_title} | ПДД Вопрос #${num} #Shorts`;
  } else {
    return `${item.hook_title} | DGT Pregunta #${num} #Shorts`;
  }
}

function buildDescription(item: RenderManifestItem): string {
  if (item.language === "ru") {
    return [
      `📖 Объяснение: ${item.explanation}`,
      "",
      "🚗 Готовишься к экзамену по ПДД? Тренируйся в Skily!",
      "👉 https://skilyapp.com",
      "",
      "#ПДД #Вождение #ЭкзаменПДД #Права #Skily #Shorts",
    ].join("\n");
  } else {
    return [
      `📖 Explicación: ${item.explanation}`,
      "",
      "🚗 ¿Preparando el carnet de conducir? ¡Entrena en Skily!",
      "👉 https://skilyapp.com",
      "",
      "#DGT #Carnet #ExamenDGT #Conducir #Skily #Shorts",
    ].join("\n");
  }
}

export async function uploadToYouTube(
  item: RenderManifestItem
): Promise<{ success: boolean; video_id?: string; error?: string }> {
  if (!item.output_path || !fs.existsSync(item.output_path)) {
    return { success: false, error: "Video file not found" };
  }

  if (
    !process.env.YOUTUBE_CLIENT_ID ||
    !process.env.YOUTUBE_CLIENT_SECRET ||
    !process.env.YOUTUBE_REFRESH_TOKEN
  ) {
    return { success: false, error: "YouTube OAuth credentials not set" };
  }

  try {
    const auth = getOAuth2Client();
    const youtube = google.youtube({ version: "v3", auth });

    console.log(`  YouTube: Uploading ${path.basename(item.output_path)}...`);

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: buildTitle(item),
          description: buildDescription(item),
          tags:
            item.language === "ru"
              ? ["ПДД", "Вождение", "Права", "Экзамен", "Skily", "Shorts"]
              : ["DGT", "Carnet", "Conducir", "Examen", "Skily", "Shorts"],
          categoryId: "27", // Education
          defaultLanguage: item.language,
        },
        status: {
          privacyStatus: "private", // Change to "public" when ready
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: "video/mp4",
        body: fs.createReadStream(item.output_path),
      },
    });

    const videoId = res.data.id!;
    console.log(`  YouTube: ✓ https://youtube.com/shorts/${videoId}`);
    return { success: true, video_id: videoId };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error(`  YouTube: ✗ ${msg}`);
    return { success: false, error: msg };
  }
}

// Run standalone
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
      console.log(`\nUploading to YouTube: [${item.language.toUpperCase()}] #${item.series_number}`);
      const result = await uploadToYouTube(item);
      console.log(`  Result:`, result);
    }
  })().catch(console.error);
}
