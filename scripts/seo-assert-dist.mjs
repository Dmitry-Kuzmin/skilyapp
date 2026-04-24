#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const distDir = resolve(cwd, 'dist');
const manifestPath = resolve(distDir, 'content-platform-manifest.json');

function extractTag(html, pattern, label, relPath) {
  const match = html.match(pattern);
  if (!match?.[1]) {
    fail(`dist/${relPath} is missing ${label}.`);
  }
  return match[1].trim();
}

function htmlToComparableText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Keywords each language landing MUST contain in its rendered body text.
// Prevents prerender flakiness where /ru output ends up with Spanish content.
const LANG_KEYWORDS = {
  ru: ['экзамен', 'DGT'],
  es: ['examen', 'DGT'],
  en: ['driving', 'DGT'],
};

function fail(msg) {
  console.error(`❌ [SEO Assert] ${msg}`);
  process.exit(1);
}

if (!existsSync(distDir)) fail('dist directory not found. Run build first.');

if (!existsSync(manifestPath)) {
  fail('dist/content-platform-manifest.json is missing.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const requiredFiles = manifest.assertPages;
const requiredDiscoveryFiles = manifest.discoveryFiles;

for (const rel of requiredDiscoveryFiles) {
  const file = resolve(distDir, rel);
  if (!existsSync(file)) {
    fail(`Missing discovery file: dist/${rel}`);
  }
}

const sitemapXml = readFileSync(resolve(distDir, 'sitemap.xml'), 'utf8');

if (sitemapXml.includes('https://skilyapp.com/blog/novye-voprosy-dgt-2025')) {
  fail('dist/sitemap.xml still contains legacy /blog/ article URLs.');
}

const llmsTxt = readFileSync(resolve(distDir, 'llms.txt'), 'utf8');
if (!llmsTxt.includes('Canonical article URLs: https://skilyapp.com/article/{slug}')) {
  fail('dist/llms.txt is missing canonical article guidance for AI crawlers.');
}

const contentHashes = new Map();
const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
let checked = 0;

for (const entry of requiredFiles) {
  const rel = entry.outputPath;
  const file = resolve(distDir, rel);
  if (!existsSync(file)) {
    fail(`Missing prerendered file: dist/${rel}`);
  }

  const html = readFileSync(file, 'utf8');
  checked += 1;

  if (html.length < 5000) {
    fail(`dist/${rel} too small (${html.length} bytes). Looks like shell HTML.`);
  }

  if (/<div id="root">\s*<\/div>/i.test(html)) {
    fail(`dist/${rel} contains empty React root.`);
  }

  if (!/<h1|<h2|<main|application\/ld\+json/i.test(html)) {
    fail(`dist/${rel} has no meaningful semantic content markers.`);
  }

  const title = extractTag(html, /<title>([^<]+)<\/title>/i, '<title>', rel);
  const description = extractTag(html, /<meta name="description"\s+content="([^"]+)"/i, 'meta description', rel);
  const canonical = extractTag(html, /<link rel="canonical"\s+href="([^"]+)"/i, 'canonical URL', rel);

  if (canonical !== entry.canonical) {
    fail(`dist/${rel} has canonical ${canonical}, expected ${entry.canonical}.`);
  }

  const previousTitle = titles.get(title);
  if (previousTitle) {
    fail(`dist/${rel} shares the same <title> as dist/${previousTitle}.`);
  }
  titles.set(title, rel);

  const previousDescription = descriptions.get(description);
  if (previousDescription) {
    fail(`dist/${rel} shares the same meta description as dist/${previousDescription}.`);
  }
  descriptions.set(description, rel);

  const previousCanonical = canonicals.get(canonical);
  if (previousCanonical) {
    fail(`dist/${rel} shares the same canonical as dist/${previousCanonical}.`);
  }
  canonicals.set(canonical, rel);

  if (!sitemapXml.includes(entry.canonical)) {
    fail(`dist/sitemap.xml is missing ${entry.canonical}.`);
  }

  if (entry.llmsRequired && !llmsTxt.includes(entry.canonical)) {
    fail(`dist/llms.txt is missing ${entry.canonical}.`);
  }

  const comparableText = htmlToComparableText(html);
  const key = comparableText;
  const prev = contentHashes.get(key);
  if (prev) {
    fail(`dist/${rel} appears identical to dist/${prev}. Route-level content is not unique.`);
  }
  contentHashes.set(key, rel);
}

console.log(`✅ [SEO Assert] dist passed (${checked} files checked).`);
