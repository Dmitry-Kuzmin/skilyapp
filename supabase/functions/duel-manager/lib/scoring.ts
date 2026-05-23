// ============================================================================
// Scoring & bot AI simulation
// ============================================================================

export function calculateScore(
  difficulty: string,
  timeRemainMs: number,
  timeTotalMs: number,
  combo: number
): number {
  const basePoints = { easy: 100, medium: 200, hard: 350 };
  const base = basePoints[difficulty as keyof typeof basePoints] || 200;

  const timeBonus = Math.round((timeRemainMs / timeTotalMs) * base * 0.4);
  const comboMult = Math.min(1 + (combo * 0.05), 1.20);

  return Math.round((base + timeBonus) * comboMult);
}

// ============================================================================
// BOT AI — accuracy simulation
// ----------------------------------------------------------------------------
// Only correctness is decided here. Visible "thinking time" is owned by the
// client (src/hooks/useBotOpponent.ts) and passed back as time_taken_ms.
// ============================================================================

type BotDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

// Base accuracy per difficulty — what % a bot gets right on a medium question
const BASE_ACCURACY: Record<BotDifficulty, number> = {
  easy: 0.62,
  medium: 0.75,
  hard: 0.88,
  insane: 0.97,
};

// Question-difficulty modifier — easy questions are easier for everyone
const QUESTION_MODIFIER: Record<string, number> = {
  easy: 0.12,
  medium: 0,
  hard: -0.15,
};

// Flat "blunder" chance — even strong players misclick / misread sometimes
const BLUNDER_CHANCE: Record<BotDifficulty, number> = {
  easy: 0.08,
  medium: 0.05,
  hard: 0.03,
  insane: 0.01,
};

// Per-question variance — humans aren't equally confident every question
const VARIANCE = 0.08;

export function simulateBotAnswer(
  botDifficulty: BotDifficulty,
  questionDifficulty: string
): { willBeCorrect: boolean } {
  // Flat blunder — regardless of skill, sometimes the bot just gets it wrong
  if (Math.random() < BLUNDER_CHANCE[botDifficulty]) {
    console.log(`[simulateBotAnswer] 🤖 ${botDifficulty} bot blundered on ${questionDifficulty} Q`);
    return { willBeCorrect: false };
  }

  const base = BASE_ACCURACY[botDifficulty];
  const qMod = QUESTION_MODIFIER[questionDifficulty] ?? 0;
  const jitter = (Math.random() - 0.5) * 2 * VARIANCE;
  const accuracy = Math.min(0.99, Math.max(0.40, base + qMod + jitter));

  const willBeCorrect = Math.random() < accuracy;

  console.log(
    `[simulateBotAnswer] 🤖 ${botDifficulty} / ${questionDifficulty}Q → ` +
      `acc ${(accuracy * 100).toFixed(0)}% → ${willBeCorrect ? '✅' : '❌'}`
  );

  return { willBeCorrect };
}

// ============================================================================
// Season / coin rewards
// ============================================================================

export const BASE_WIN_SP_NO_BET = 30;
export const BASE_LOSE_SP = 5;
export const DRAW_SP = 15;

export const duelRiskMultiplier = (betAmount: number) => {
  if (!betAmount || betAmount <= 0) return 1;
  if (betAmount >= 600) return 4;
  if (betAmount >= 450) return 3;
  if (betAmount >= 300) return 2.25;
  if (betAmount >= 200) return 1.75;
  if (betAmount >= 100) return 1.25;
  return 1.1;
};

export const calculateSeasonReward = (
  betAmount: number,
  outcome: 'win' | 'lose' | 'draw'
) => {
  if (outcome === 'draw') return DRAW_SP;
  if (outcome === 'lose') return BASE_LOSE_SP;
  if (betAmount > 0) {
    return Math.round(20 * duelRiskMultiplier(betAmount));
  }
  return BASE_WIN_SP_NO_BET;
};

export const BASE_WIN_COINS_NO_BET = 20;
export const BASE_DRAW_COINS_NO_BET = 10;

// Map frontend country names → DB codes
export function mapCountry(country?: string): string {
  if (country === 'russia') return 'ru';
  if (country === 'spain') return 'es';
  return country || 'es';
}
