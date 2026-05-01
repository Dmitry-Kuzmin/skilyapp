/**
 * Migrate road sign images from Wikipedia/external URLs → Supabase Storage
 * Usage: node scripts/migrate-road-signs-images.js
 *
 * - Downloads each image from current image_url
 * - Uploads to dgt-images/road-signs/{sign_id}.png
 * - Updates road_signs.image_url in DB to Supabase CDN URL
 * - Skips already-migrated signs (those with supabase URL)
 * - Retries up to 3x on network errors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.local'), override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'dgt-images';
const FOLDER = 'road-signs';
const CONCURRENCY = 2;
const MAX_RETRIES = 4;
const BATCH_DELAY_MS = 800;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function downloadImage(url, retries = MAX_RETRIES) {
  const encoded = encodeWikimediaUrl(url);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(encoded, {
        headers: { 'User-Agent': 'SkilyApp/1.0 (https://skilyapp.com; migration-bot)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/png';
      return { data: Buffer.from(buf), contentType };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

function encodeWikimediaUrl(url) {
  if (!url.includes('wikimedia.org')) return url;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.split('/').map(seg => {
      try { return encodeURIComponent(decodeURIComponent(seg)); }
      catch { return seg; }
    }).join('/');
    return u.toString();
  } catch { return url; }
}

function mimeToExt(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  return 'png';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processSign(sign, stats) {
  if (sign.image_url.includes('supabase.co')) {
    stats.skipped++;
    return;
  }

  const ext = mimeToExt('');  // will be resolved after download
  const storagePath = `${FOLDER}/${sign.id}`;

  try {
    const { data: imageData, contentType } = await downloadImage(sign.image_url);
    const realExt = mimeToExt(contentType);
    const finalPath = `${storagePath}.${realExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(finalPath, imageData, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(finalPath);
    const newUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from('road_signs')
      .update({ image_url: newUrl })
      .eq('id', sign.id);

    if (updateError) throw new Error(`DB update: ${updateError.message}`);

    stats.done++;
    process.stdout.write(`\r✅ ${stats.done}/${stats.total} migrated, ${stats.failed} failed, ${stats.skipped} skipped`);
  } catch (err) {
    stats.failed++;
    stats.errors.push({ id: sign.id, name: sign.name_es, url: sign.image_url, error: err.message });
  }
}

async function runBatch(signs, stats) {
  for (let i = 0; i < signs.length; i += CONCURRENCY) {
    const batch = signs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(sign => processSign(sign, stats)));
  }
}

async function main() {
  console.log('🚀 Road Signs Image Migration → Supabase Storage');
  console.log(`   Bucket: ${BUCKET}/${FOLDER}`);
  console.log('');

  const { data: signs, error } = await supabase
    .from('road_signs')
    .select('id, name_es, image_url')
    .order('name_es');

  if (error) { console.error('❌ Failed to fetch signs:', error); process.exit(1); }

  const pending = signs.filter(s => !s.image_url.includes('supabase.co'));
  const alreadyDone = signs.length - pending.length;

  console.log(`📊 Total signs: ${signs.length}`);
  console.log(`⏭️  Already in Supabase: ${alreadyDone}`);
  console.log(`📥 To migrate: ${pending.length}`);
  console.log('');

  if (pending.length === 0) {
    console.log('✅ All signs already migrated!');
    return;
  }

  const stats = { done: 0, failed: 0, skipped: 0, total: pending.length, errors: [] };

  await runBatch(pending, stats);

  console.log('\n\n📋 Summary:');
  console.log(`   ✅ Migrated: ${stats.done}`);
  console.log(`   ⏭️  Skipped:  ${stats.skipped}`);
  console.log(`   ❌ Failed:   ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Failed signs:');
    stats.errors.forEach(e => console.log(`   [${e.id}] ${e.name}: ${e.error}`));
    console.log('\nRun script again to retry failed items.');
  } else {
    console.log('\n🎉 All images successfully migrated to Supabase Storage!');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
