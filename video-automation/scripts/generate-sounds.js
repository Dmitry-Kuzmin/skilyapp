/**
 * generate-sounds.js
 * Generates WAV sound effects for the video template.
 * Run once: node scripts/generate-sounds.js
 * No external dependencies — pure Node.js Buffer + math.
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "../public/sounds");
fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

function writeWav(filename, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), buf);
  console.log(`  ✓ ${filename}`);
}

// ── Envelope helper ──────────────────────────────────────────────────────────
function envelope(i, total, attack = 0.01, release = 0.15) {
  const t = i / total;
  const a = Math.min(1, t / attack);
  const r = Math.min(1, (1 - t) / release);
  return Math.min(a, r);
}

// ── 1. Countdown beeps (3, 2, 1) — short sine tones ─────────────────────────
function makeBeep(hz, durationMs, volume = 0.6) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = volume * envelope(i, n, 0.005, 0.2) * Math.sin(2 * Math.PI * hz * t);
  }
  return samples;
}

writeWav("beep3.wav", makeBeep(440, 180));   // low  — 3
writeWav("beep2.wav", makeBeep(550, 180));   // mid  — 2
writeWav("beep1.wav", makeBeep(660, 220));   // high — 1

// ── 2. Reveal "ding" — ascending two-note chime ──────────────────────────────
function makeChime(durationMs = 600) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const half = Math.floor(n / 2);
  const samples = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const hz = i < half ? 660 : 880;
    const env = envelope(i, n, 0.005, 0.35);
    // Add slight harmonic
    samples[i] = 0.55 * env * (
      Math.sin(2 * Math.PI * hz * t) +
      0.3 * Math.sin(2 * Math.PI * hz * 2 * t)
    );
  }
  return samples;
}

writeWav("reveal.wav", makeChime(600));

// ── 3. "Wrong" buzz — dissonant descending ───────────────────────────────────
function makeWrong(durationMs = 400) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const sweep = 300 - (i / n) * 80; // descending
    const env = envelope(i, n, 0.01, 0.25);
    samples[i] = 0.45 * env * Math.sin(2 * Math.PI * sweep * t);
  }
  return samples;
}
writeWav("wrong.wav", makeWrong());

// ── 4. Suspense tick — short click ───────────────────────────────────────────
function makeTick(durationMs = 60) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = envelope(i, n, 0.01, 0.5);
    // Noise + tone
    samples[i] = 0.4 * env * (Math.random() * 0.4 + Math.sin(2 * Math.PI * 1200 * i / SAMPLE_RATE) * 0.6);
  }
  return samples;
}
writeWav("tick.wav", makeTick());

// ── 5. Hook whoosh — rising white noise sweep ────────────────────────────────
function makeWhoosh(durationMs = 350) {
  const n = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
    const hz = 200 + t * 1800;
    samples[i] = 0.35 * env * (
      Math.sin(2 * Math.PI * hz * i / SAMPLE_RATE) +
      (Math.random() - 0.5) * 0.5
    );
  }
  return samples;
}
writeWav("whoosh.wav", makeWhoosh());

console.log(`\nSounds saved to: ${OUT_DIR}\n`);
