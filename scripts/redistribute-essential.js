/**
 * redistribute-essential.js
 *
 * Filters truly unique questions from essential_test (not in topic-XX tests),
 * assigns a topic (1–10) via keyword matching, splits into 30-question files,
 * and saves them into the corresponding topic-XX folders continuing the
 * existing test numbering.
 *
 * Usage: node scripts/redistribute-essential.js [--dry-run]
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { diffChars } from 'diff'; // not used — pure JS below

const PARSED_DIR = './data/parsed';
const DRY_RUN = process.argv.includes('--dry-run');

// ──────────────────────────────────────────────────────────────
// Topic keyword map — ordered by specificity (most specific first)
// ──────────────────────────────────────────────────────────────
const TOPIC_KEYWORDS = [
  // Topic 4 — Alumbrado (lighting) — very specific, check early
  {
    num: 4,
    words: ['luz', 'luces', 'alumbrado', 'antiniebla', 'faro', 'faros', 'iluminado',
            'iluminación', 'visibilidad', 'niebla', 'lluvia intensa', 'noche'],
  },
  // Topic 3 — Señales (signs/signals)
  {
    num: 3,
    words: ['señal', 'señales', 'semáforo', 'agente', 'señalización', 'código',
            'prohibido', 'prohibición', 'stop', 'ceda', 'marca vial', 'marcas viales',
            'línea continua', 'línea discontinua', 'panel', 'advertencia'],
  },
  // Topic 9 — Mecánica y mantenimiento
  {
    num: 9,
    words: ['neumático', 'freno', 'aceite', 'motor', 'mantenimiento', 'mecánica',
            'reventón', 'rueda', 'presión', 'iTV', 'revisión', 'combustible',
            'bujía', 'batería', 'volante', 'dirección', 'amortiguador'],
  },
  // Topic 7 — Los accidentes (accidents/risk factors)
  {
    num: 7,
    words: ['accidente', 'alcohol', 'alcoholemia', 'droga', 'drogas', 'fatiga',
            'sueño', 'riesgo', 'factor de riesgo', 'distancia de seguridad',
            'distancia de frenado', 'velocidad excesiva', 'teléfono', 'móvil',
            'medicamento', 'puntos'],
  },
  // Topic 8 — Comportamiento en caso de accidente
  {
    num: 8,
    words: ['auxilio', 'socorro', 'botiquín', 'triángulo', 'extintor', 'primeros auxilios',
            'accidentado', 'herido', 'emergencia', 'ambulancia', 'kit de emergencia',
            'chaleco reflectante'],
  },
  // Topic 6 — Documentación
  {
    num: 6,
    words: ['permiso de conducción', 'permiso de conducir', 'licencia', 'seguro',
            'itv', 'documentación', 'documento', 'ficha técnica', 'puntos',
            'carnet', 'dgt', 'tasa', 'multa', 'sanción'],
  },
  // Topic 5 — El uso del vehículo (vehicle use — loads, seatbelts, etc.)
  {
    num: 5,
    words: ['cinturón', 'carga', 'cargamento', 'mma', 'masa máxima', 'remolque',
            'transporte de', 'pasajero', 'pasajeros', 'niño', 'silla', 'casco',
            'motocicleta', 'motociclistas', 'bicicleta', 'ciclista',
            'cuadriciclo', 'quad', 'furgoneta'],
  },
  // Topic 10 — Técnicas de conducción
  {
    num: 10,
    words: ['técnica', 'técnicas de conducción', 'conducción eficiente',
            'conducción nocturna', 'acuaplaning', 'hydroplaning', 'deslizamiento',
            'derrapar', 'curva', 'pendiente', 'cuesta', 'nieve', 'hielo',
            'velocidad anormalmente reducida', 'velocidad mínima'],
  },
  // Topic 2 — Maniobras
  {
    num: 2,
    words: ['adelantamiento', 'adelantar', 'cambio de carril', 'giro', 'girar',
            'marcha atrás', 'incorporación', 'incorporarse', 'estacionamiento',
            'estacionar', 'aparcar', 'aparcamiento', 'parada', 'parar',
            'preferencia de paso', 'ceda el paso', 'intersección', 'cruce',
            'rotonda', 'glorieta', 'separación lateral', 'distancia lateral'],
  },
  // Topic 1 — Definiciones y uso de las vías (fallback for road types etc.)
  {
    num: 1,
    words: ['autovía', 'autopista', 'vía', 'vías', 'calzada', 'arcén', 'carril',
            'carretera', 'travesía', 'vía urbana', 'vía interurbana',
            'sentido', 'circulación', 'puente', 'túnel', 'peaje',
            'animales', 'animal', 'ganado', 'vao'],
  },
];

function assignTopic(questionEs) {
  const text = questionEs.toLowerCase();
  for (const { num, words } of TOPIC_KEYWORDS) {
    if (words.some(w => text.includes(w.toLowerCase()))) {
      return num;
    }
  }
  return 1; // default fallback
}

function normalize(text) {
  return text
    .replace(/…/g, '...')
    .replace(/[¿¡.,;:!?()\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function loadTopicQuestions() {
  const topicFiles = await glob(`${PARSED_DIR}/topic-*/*.json`);
  const exactSet = new Set();
  const normSet = new Set();

  for (const f of topicFiles) {
    if (f.includes('-enriched')) continue;
    const raw = await fs.readFile(f, 'utf8');
    const d = JSON.parse(raw);
    const qs = Array.isArray(d) ? d : (d.questions || []);
    for (const q of qs) {
      const text = q.question;
      const es = (typeof text === 'object' ? text?.es : text) || '';
      if (es) {
        exactSet.add(es.trim());
        normSet.add(normalize(es));
      }
    }
  }
  return { exactSet, normSet };
}

async function loadNearDupeTexts() {
  // Load the analysis result saved earlier (if exists)
  try {
    const data = JSON.parse(await fs.readFile('/tmp/essential_analysis.json', 'utf8'));
    const nearDupeSet = new Set(data.near_dupes.map(r => r.ess));
    return nearDupeSet;
  } catch {
    return new Set();
  }
}

async function getMaxTestNumber(topicNum) {
  const topicDir = path.join(PARSED_DIR, `topic-${String(topicNum).padStart(2, '0')}`);
  const files = await glob(`${topicDir}/*.json`);
  let max = 0;
  for (const f of files) {
    const m = f.match(/test-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return max;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN mode — no files written\n' : '✍️  Writing files...\n');

  const { exactSet, normSet } = await loadTopicQuestions();
  const nearDupeSet = await loadNearDupeTexts();

  console.log(`Topic questions loaded: ${exactSet.size} exact, ${normSet.size} normalized`);
  console.log(`Near-dupes from analysis: ${nearDupeSet.size}`);

  // Collect all essential questions
  const essFiles = await glob(`${PARSED_DIR}/essential_test/*.json`);
  const essNonEnriched = essFiles.filter(f => !f.includes('-enriched'));

  const uniqueByTopic = {}; // topicNum → [questions]
  for (let i = 1; i <= 10; i++) uniqueByTopic[i] = [];

  let totalUnique = 0;
  let totalSkipped = 0;

  for (const f of essNonEnriched.sort()) {
    const raw = await fs.readFile(f, 'utf8');
    const d = JSON.parse(raw);
    const qs = Array.isArray(d) ? d : (d.questions || []);

    for (const q of qs) {
      const text = q.question;
      const es = (typeof text === 'object' ? text?.es : text) || '';
      const esClean = es.trim();
      if (!esClean) continue;

      // Skip exact duplicates
      if (exactSet.has(esClean)) { totalSkipped++; continue; }
      // Skip normalized duplicates
      if (normSet.has(normalize(esClean))) { totalSkipped++; continue; }
      // Skip near-dupes from fuzzy analysis
      if (nearDupeSet.has(esClean)) { totalSkipped++; continue; }

      const topicNum = assignTopic(esClean);
      uniqueByTopic[topicNum].push(q);
      totalUnique++;
    }
  }

  console.log(`\nUnique questions collected: ${totalUnique}`);
  console.log(`Skipped (dupes/near-dupes): ${totalSkipped}`);
  console.log('\nDistribution by topic:');

  const maxNumbers = {};
  for (let i = 1; i <= 10; i++) {
    maxNumbers[i] = await getMaxTestNumber(i);
    console.log(`  topic-${String(i).padStart(2,'0')}: ${uniqueByTopic[i].length} questions → ${Math.ceil(uniqueByTopic[i].length/30)} new files (starting test-${String(maxNumbers[i]+1).padStart(3,'0')})`);
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete — run without --dry-run to write files');
    return;
  }

  // Write files
  let filesWritten = 0;
  for (let topicNum = 1; topicNum <= 10; topicNum++) {
    const qs = uniqueByTopic[topicNum];
    if (qs.length === 0) continue;

    const topicDir = path.join(PARSED_DIR, `topic-${String(topicNum).padStart(2, '0')}`);
    let testNum = maxNumbers[topicNum];

    for (let i = 0; i < qs.length; i += 30) {
      testNum++;
      const chunk = qs.slice(i, i + 30).map((q, idx) => ({
        ...q,
        topic_number: topicNum,
        question_number: idx + 1,
      }));

      const filename = `topic-${String(topicNum).padStart(2,'0')}_test-${String(testNum).padStart(3,'0')}.json`;
      const filepath = path.join(topicDir, filename);
      await fs.writeFile(filepath, JSON.stringify(chunk, null, 2), 'utf8');
      console.log(`  ✅ Written: ${filename} (${chunk.length} questions)`);
      filesWritten++;
    }
  }

  console.log(`\n✨ Done: ${filesWritten} files written with ${totalUnique} questions`);
  console.log('Next: run enrichment from Mission Control for new topic-XX files');
}

main().catch(console.error);
