/**
 * export-questions.ts
 * Fetches viral-optimized questions from Supabase for video generation.
 *
 * Selection criteria:
 *  - Has explanation (required for ExplanationScene)
 *  - percent_correct < 60 (tricky questions = higher virality)
 *  - Has 4 answer options
 *  - Not already used (tracked in renders/used-ids.json)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import type { VideoQuestion, Language, Difficulty } from "../src/types";
import { HOOK_TEMPLATES } from "../src/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const USED_IDS_PATH = path.join(__dirname, "../renders/used-ids.json");
const SERIES_STATE_PATH = path.join(__dirname, "../renders/series-state.json");

function loadUsedIds(): Set<string> {
  if (!fs.existsSync(USED_IDS_PATH)) return new Set();
  const data = JSON.parse(fs.readFileSync(USED_IDS_PATH, "utf-8")) as string[];
  return new Set(data);
}

function saveUsedIds(ids: Set<string>) {
  fs.mkdirSync(path.dirname(USED_IDS_PATH), { recursive: true });
  fs.writeFileSync(USED_IDS_PATH, JSON.stringify([...ids], null, 2));
}

function loadSeriesState(): Record<string, number> {
  if (!fs.existsSync(SERIES_STATE_PATH)) return { ru: 1, es: 1 };
  return JSON.parse(fs.readFileSync(SERIES_STATE_PATH, "utf-8"));
}

function saveSeriesState(state: Record<string, number>) {
  fs.writeFileSync(SERIES_STATE_PATH, JSON.stringify(state, null, 2));
}

function pickHookTitle(q: { percent_correct: number; difficulty: string }, lang: Language): string {
  const templates = HOOK_TEMPLATES[lang];
  if (q.percent_correct < 30) return templates.very_hard;
  if (q.percent_correct < 50) return templates.hard;
  if (q.difficulty === "hard") return templates.medium;
  return templates.easy;
}

async function fetchQuestionsForCountry(
  country: string,
  lang: Language,
  batchSize: number,
  usedIds: Set<string>,
  seriesStart: number
): Promise<VideoQuestion[]> {
  const explanationField = `explanation_${lang}` as const;
  const questionField = `question_${lang}` as const;

  const { data: rows, error } = await supabase
    .from("questions_new")
    .select(`
      id,
      ${questionField},
      ${explanationField},
      image_url,
      difficulty,
      percent_correct,
      topics ( title_${lang} ),
      answer_options ( id, text_${lang}, is_correct, position )
    `)
    .eq("country", country)
    .lt("percent_correct", 65)
    .not(explanationField, "is", null)
    .order("percent_correct", { ascending: true });

  if (error) throw new Error(`Supabase error (${country}): ${error.message}`);
  if (!rows || rows.length === 0) {
    console.warn(`No questions found for country=${country}`);
    return [];
  }

  // Filter: not already used, has 4 answer options
  const eligible = rows.filter(
    (r: any) =>
      !usedIds.has(r.id) &&
      Array.isArray(r.answer_options) &&
      r.answer_options.length === 4
  );

  const selected = eligible.slice(0, batchSize);

  return selected.map((r: any, i: number) => {
    const question = (r[questionField] as string) ?? "";
    const explanation = (r[explanationField] as string) ?? "";
    const topic = (r.topics as any)?.[`title_${lang}`] ?? "";

    const sortedOptions = [...r.answer_options].sort(
      (a: any, b: any) => a.position - b.position
    );

    return {
      id: r.id,
      question,
      explanation,
      image_url: r.image_url ?? null,
      difficulty: (r.difficulty ?? "medium") as Difficulty,
      percent_correct: r.percent_correct ?? 50,
      topic,
      answer_options: sortedOptions.map((o: any) => ({
        id: o.id,
        text: o[`text_${lang}`] ?? "",
        is_correct: o.is_correct,
        position: o.position,
      })),
      country,
      language: lang,
      hook_title: pickHookTitle(r, lang),
      series_number: seriesStart + i,
    } satisfies VideoQuestion;
  });
}

export async function exportQuestions(batchSize = 5): Promise<VideoQuestion[]> {
  const usedIds = loadUsedIds();
  const seriesState = loadSeriesState();

  const half = Math.ceil(batchSize / 2);

  const [ruQuestions, esQuestions] = await Promise.all([
    fetchQuestionsForCountry("ru", "ru", half, usedIds, seriesState.ru),
    fetchQuestionsForCountry("es", "es", batchSize - half, usedIds, seriesState.es),
  ]);

  const all = [...ruQuestions, ...esQuestions];

  // Update tracking state
  all.forEach((q) => usedIds.add(q.id));
  seriesState.ru = (seriesState.ru ?? 1) + ruQuestions.length;
  seriesState.es = (seriesState.es ?? 1) + esQuestions.length;

  saveUsedIds(usedIds);
  saveSeriesState(seriesState);

  console.log(`Exported ${ruQuestions.length} RU + ${esQuestions.length} ES questions`);
  return all;
}

// Run standalone
if (require.main === module) {
  exportQuestions(parseInt(process.env.BATCH_SIZE ?? "5", 10))
    .then((qs) => {
      const outPath = path.join(__dirname, "../renders/questions-export.json");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(qs, null, 2));
      console.log(`Saved to ${outPath}`);
    })
    .catch(console.error);
}
