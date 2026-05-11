// Calculate scoring
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

// Bot name pool - реалистичные никнеймы для ботов
export const BOT_NAMES = [
  // Русские имена
  'Александр', 'Мария', 'Дмитрий', 'Анна', 'Иван', 'Елена', 'Сергей', 'Ольга',
  'Андрей', 'Наталья', 'Максим', 'Татьяна', 'Алексей', 'Юлия', 'Павел', 'Ирина',
  'Николай', 'Светлана', 'Владимир', 'Екатерина', 'Артем', 'Марина', 'Роман', 'Анастасия',
  'Денис', 'Виктория', 'Антон', 'Кристина', 'Игорь', 'Дарья', 'Михаил', 'Полина',
  'Евгений', 'Валерия', 'Алекс', 'София', 'Кирилл', 'Алиса', 'Станислав', 'Вероника',
  'Артур', 'Арина', 'Даниил', 'Елизавета', 'Георгий', 'Милана', 'Тимур', 'Амелия',
  'Марк', 'Василиса', 'Лев', 'Ангелина', 'Федор', 'Диана', 'Григорий', 'Карина',

  // Испанские имена
  'Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Laura',
  'Miguel', 'Isabel', 'Francisco', 'Patricia', 'Antonio', 'Sofía', 'Manuel', 'Lucía',
  'Pedro', 'Elena', 'Javier', 'Marta', 'Diego', 'Paula', 'Ángel', 'Claudia',
  'Fernando', 'Cristina', 'Roberto', 'Andrea', 'Ricardo', 'Natalia', 'Alejandro', 'Sara',
  'Daniel', 'Beatriz', 'Sergio', 'Raquel', 'Pablo', 'Mónica', 'Álvaro', 'Eva',
  'Adrián', 'Lorena', 'Rubén', 'Silvia', 'Óscar', 'Rocío', 'Víctor', 'Nerea',
  'Iván', 'Celia', 'Jorge', 'Inés', 'Raúl', 'Marina', 'Gonzalo', 'Carla',

  // Английские имена
  'James', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'David', 'Isabella',
  'Richard', 'Charlotte', 'Joseph', 'Amelia', 'Thomas', 'Mia', 'Charles', 'Harper',
  'Christopher', 'Evelyn', 'Daniel', 'Abigail', 'Matthew', 'Emily', 'Anthony', 'Elizabeth',
  'Mark', 'Sofia', 'Donald', 'Avery', 'Steven', 'Ella', 'Paul', 'Madison',
  'Andrew', 'Scarlett', 'Joshua', 'Victoria', 'Kenneth', 'Aria', 'Kevin', 'Grace',
  'Brian', 'Chloe', 'George', 'Camila', 'Timothy', 'Penelope', 'Ronald', 'Riley',
  'Jason', 'Layla', 'Edward', 'Lillian', 'Jeffrey', 'Nora', 'Ryan', 'Zoey',
  'Jacob', 'Mila', 'Gary', 'Aubrey', 'Nicholas', 'Hannah', 'Eric', 'Addison',
  'Jonathan', 'Eleanor', 'Stephen', 'Natalie', 'Larry', 'Luna', 'Justin', 'Savannah',
  'Scott', 'Leah', 'Brandon', 'Zoe', 'Benjamin', 'Stella', 'Samuel', 'Hazel',
  'Frank', 'Ellie', 'Gregory', 'Paisley', 'Raymond', 'Audrey', 'Alexander', 'Skylar',
  'Patrick', 'Violet', 'Jack', 'Claire', 'Dennis', 'Bella', 'Jerry', 'Aurora'
];

// Bot avatar pool (используем доступные аватары)
export const BOT_AVATARS = [
  'default', 'cyberpunk', 'hacker', 'ninja', 'warrior', 'ghost', 'neon'
];

// Bot simulation with adaptive accuracy based on bot difficulty (anti-farming protection)
export function simulateBotAnswer(botDifficulty: 'easy' | 'medium' | 'hard' | 'insane', questionDifficulty: string): {
  delayMs: number;
  willBeCorrect: boolean;
} {
  // 🛡️ АДАПТИВНАЯ ТОЧНОСТЬ БОТА
  // Easy: 60-70% (дает кайфануть новичкам)
  // Medium: 70-80% (стандартная сложность)
  // Hard: 85-90% (начинает давить на фармеров)
  // Insane: 95-99% (бот-убийца, почти непобедим)

  const baseAccuracies = {
    easy: 0.65,      // 65% базовая точность
    medium: 0.75,    // 75% базовая точность
    hard: 0.875,     // 87.5% базовая точность
    insane: 0.97,    // 97% базовая точность (почти непобедим)
  };

  const baseAccuracy = baseAccuracies[botDifficulty] || 0.75;

  // Модификаторы на основе сложности вопроса
  const difficultyModifiers = {
    easy: 0.15,   // +15% для легких вопросов
    medium: 0,    // Без изменений для средних
    hard: -0.10,  // -10% для сложных вопросов (но не ниже минимума)
  };

  const modifier = difficultyModifiers[questionDifficulty as keyof typeof difficultyModifiers] || 0;
  const accuracy = Math.min(0.99, Math.max(0.50, baseAccuracy + modifier));

  // 🎯 УМНЫЕ ТАЙМИНГИ ОТВЕТОВ БОТА
  // Реалистичные времена как у живого игрока (ускорены для лучшего UX)
  const delayRanges = {
    easy: { min: 8000, max: 25000 },       // 8-25 секунд (думает дольше)
    medium: { min: 6000, max: 18000 },     // 6-18 секунд (стандартно)
    hard: { min: 4000, max: 12000 },       // 4-12 секунд (быстрее)
    insane: { min: 3000, max: 8000 },      // 3-8 секунд (очень быстро, как про)
  };

  const range = delayRanges[botDifficulty] || delayRanges.medium;
  const delayMs = Math.floor(Math.random() * (range.max - range.min) + range.min);

  console.log(`[simulateBotAnswer] 🤖 Bot difficulty: ${botDifficulty}, Question: ${questionDifficulty}, Accuracy: ${(accuracy * 100).toFixed(1)}%, Delay: ${Math.round(delayMs / 1000)}s`);

  return {
    delayMs,
    willBeCorrect: Math.random() < accuracy,
  };
}

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

/**
 * Mapping between frontend country names and database codes
 */
export function mapCountry(country?: string): string {
  if (country === 'russia') return 'ru';
  if (country === 'spain') return 'es';
  return country || 'es';
}
