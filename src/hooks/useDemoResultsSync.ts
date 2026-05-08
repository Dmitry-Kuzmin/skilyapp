import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEMO_STORAGE_KEY = "skilyapp_demo_results";

interface DemoAnswer {
  questionId: string;
  isCorrect: boolean;
}

interface DemoResults {
  answers: DemoAnswer[];
  completedAt: string;
}

export function useDemoResultsSync(profileId: string | null) {
  useEffect(() => {
    if (!profileId) return;

    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return;

    let results: DemoResults;
    try {
      results = JSON.parse(raw);
    } catch {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      return;
    }

    if (!Array.isArray(results.answers) || results.answers.length === 0) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      return;
    }

    const completedAt = results.completedAt ?? new Date().toISOString();

    const rows = results.answers.map((a) => ({
      user_id: profileId,
      question_id: a.questionId,
      is_answered: true,
      is_correct: a.isCorrect,
      attempts: 1,
      last_attempt_at: completedAt,
    }));

    supabase
      .from("user_progress")
      .upsert(rows, { onConflict: "user_id,question_id", ignoreDuplicates: false })
      .then(({ error }) => {
        if (!error) localStorage.removeItem(DEMO_STORAGE_KEY);
      });
  }, [profileId]);
}
