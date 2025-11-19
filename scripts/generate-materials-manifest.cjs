#!/usr/bin/env node

/**
 * Generates a manifest for static learning materials and copies JSON files
 * into the public folder so they can be fetched at runtime if needed.
 *
 * Usage:
 *   node scripts/generate-materials-manifest.cjs
 */

const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(ROOT, "src", "data", "materials");
const PUBLIC_ROOT = path.join(ROOT, "public", "data", "materials");
const MANIFEST_PATH = path.join(ROOT, "public", "data", "materials-manifest.json");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(source, destination) {
  try {
    await fs.cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function normalizeCode(code) {
  return (code ?? "").toString().trim().replace(/\./g, "-");
}

function detectTopicNumber(dirName) {
  const match = dirName.match(/(\d+)/);
  if (!match) return null;
  return Number(match[1]);
}

async function collectMaterials() {
  const manifestItems = [];

  const topicDirs = await fs.readdir(SRC_ROOT, { withFileTypes: true });
  for (const dirent of topicDirs) {
    if (!dirent.isDirectory()) continue;
    const topicNumber = detectTopicNumber(dirent.name);
    if (!topicNumber) continue;

    const sourceTopicDir = path.join(SRC_ROOT, dirent.name);
    const destTopicDir = path.join(PUBLIC_ROOT, `topic-${topicNumber}`);
    await ensureDir(destTopicDir);

    const entries = await fs.readdir(sourceTopicDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name === "images") {
        await copyDir(path.join(sourceTopicDir, entry.name), path.join(destTopicDir, entry.name));
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

      const filePath = path.join(sourceTopicDir, entry.name);
      const fileContent = await fs.readFile(filePath, "utf-8");

      let parsed;
      try {
        parsed = JSON.parse(fileContent);
      } catch (error) {
        console.error(`[materials-manifest] Skip invalid JSON ${filePath}:`, error.message);
        continue;
      }

      if (!parsed.code) {
        console.warn(`[materials-manifest] Skip ${filePath}: missing code`);
        continue;
      }

      const normalizedCode = normalizeCode(parsed.code);
      const staticId = `static-topic-${topicNumber}-subtopic-${normalizedCode}`;
      const publicFileName = `subtopic-${normalizedCode}.json`;
      const destFile = path.join(destTopicDir, publicFileName);

      await fs.writeFile(destFile, JSON.stringify(parsed, null, 2), "utf-8");

      manifestItems.push({
        staticId,
        topicNumber,
        topicId: parsed.topic_id ?? `topic-${topicNumber}`,
        subtopicCode: parsed.code,
        order: parsed.order ?? null,
        title: {
          ru: parsed.title_ru ?? "",
          es: parsed.title_es ?? "",
          en: parsed.title_en ?? "",
        },
        hasImages: Array.isArray(parsed.images) && parsed.images.length > 0,
        sourcePdf: parsed.source_pdf ?? null,
        file: `materials/topic-${topicNumber}/${publicFileName}`,
        languages: {
          ru: Boolean(parsed.content_ru?.trim()),
          es: Boolean(parsed.content_es?.trim()),
          en: Boolean(parsed.content_en?.trim()),
        },
      });
    }
  }

  manifestItems.sort((a, b) => {
    if (a.topicNumber !== b.topicNumber) {
      return a.topicNumber - b.topicNumber;
    }
    return a.subtopicCode.localeCompare(b.subtopicCode, "en", { numeric: true });
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    total: manifestItems.length,
    items: manifestItems,
  };

  await ensureDir(path.dirname(MANIFEST_PATH));
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(
    `[materials-manifest] Generated ${manifest.items.length} entries → ${path.relative(ROOT, MANIFEST_PATH)}`
  );
}

collectMaterials().catch((error) => {
  console.error("[materials-manifest] Failed to generate manifest:", error);
  process.exitCode = 1;
});

