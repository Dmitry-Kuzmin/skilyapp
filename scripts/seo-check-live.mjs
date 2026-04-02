#!/usr/bin/env node

const defaultUrls = [
  'https://skilyapp.com',
  'https://skilyapp.com/about',
  'https://skilyapp.com/tests',
  'https://sdadim.eu',
  'https://sdadim.eu/about',
];

const urls = process.argv.slice(2).length ? process.argv.slice(2) : defaultUrls;
const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function hash(input) {
  // non-crypto fast hash for duplicate shell detection
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function normalizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': ua },
    redirect: 'follow',
  });
  const html = await res.text();
  return { status: res.status, html, finalUrl: res.url };
}

const failures = [];
const pageHashes = new Map();

for (const url of urls) {
  try {
    const { status, html, finalUrl } = await fetchHtml(url);
    if (status >= 400) {
      failures.push(`${url}: HTTP ${status}`);
      continue;
    }

    if (/<div id="root">\s*<\/div>/i.test(html)) {
      failures.push(`${url}: empty #root for bot`);
    }

    if (!/<title>/i.test(html) || !/<meta name="description"/i.test(html)) {
      failures.push(`${url}: missing title/description in HTML`);
    }

    const normalized = normalizeHtml(html);
    const h = hash(normalized.slice(0, 20000));

    const prev = pageHashes.get(h);
    if (prev) {
      failures.push(`${url}: HTML very similar to ${prev} (possible shell on multiple routes)`);
    } else {
      pageHashes.set(h, url);
    }

    console.log(`OK ${url} -> ${finalUrl} [${status}] hash=${h} bytes=${html.length}`);
  } catch (e) {
    failures.push(`${url}: ${e.message}`);
  }
}

if (failures.length) {
  console.error('\n❌ [SEO Live Check] Failures:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('\n✅ [SEO Live Check] All URLs look crawlable for Googlebot.');
