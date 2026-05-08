/**
 * Copies Astro landing build output into the main dist/ folder.
 * Astro outputs: landing/dist/{es,ru,index}.html (as directories with index.html)
 * vercel.json expects flat files: dist/es.html, dist/ru.html, dist/index-landing.html
 * We copy each landing page as a flat .html file so Vercel rewrites work as-is.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASTRO_DIST = join(ROOT, 'landing', 'dist');
const MAIN_DIST = join(ROOT, 'dist');

if (!existsSync(ASTRO_DIST)) {
  console.error('[copy-landing] landing/dist not found — run npm run build:landing first');
  process.exit(1);
}

// Copy _astro assets (CSS/JS chunks from Astro)
const astroAssets = join(ASTRO_DIST, '_astro');
if (existsSync(astroAssets)) {
  cpSync(astroAssets, join(MAIN_DIST, '_astro'), { recursive: true });
  console.log('[copy-landing] ✅ Copied _astro/ assets');
}

// Copy each language landing as a flat .html file
const pages = [
  { src: join(ASTRO_DIST, 'es', 'index.html'), dest: join(MAIN_DIST, 'es.html') },
  { src: join(ASTRO_DIST, 'ru', 'index.html'), dest: join(MAIN_DIST, 'ru.html') },
  { src: join(ASTRO_DIST, 'en', 'index.html'), dest: join(MAIN_DIST, 'en.html') },
];

for (const { src, dest } of pages) {
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`[copy-landing] ✅ ${src.split('/landing/dist/')[1]} → dist/${dest.split('/dist/')[1]}`);
  } else {
    console.log(`[copy-landing] ⚠️  Skipped (not found): ${src}`);
  }
}

// Copy Astro's public assets (videos, images referenced by the landing)
const astroImages = join(ASTRO_DIST, 'images');
if (existsSync(astroImages)) {
  cpSync(astroImages, join(MAIN_DIST, 'images'), { recursive: true });
  console.log('[copy-landing] ✅ Copied images/ assets');
}

const astroPublic = join(ASTRO_DIST);
const videoFiles = ['AI.webm', 'PracticaTests.webm', 'TranslateRU.webm'];
for (const f of videoFiles) {
  const src = join(astroPublic, f);
  if (existsSync(src)) {
    copyFileSync(src, join(MAIN_DIST, f));
    console.log(`[copy-landing] ✅ Copied ${f}`);
  }
}

console.log('[copy-landing] Done.');
