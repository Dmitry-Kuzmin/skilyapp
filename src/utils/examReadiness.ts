import { EXAM_PASS_MARK, EXAM_QS, TOTAL_QUESTIONS_BANK } from '@/lib/exam-config';

const PRIOR_ALPHA = 2;
const PRIOR_BETA = 2;
const RECENT_WEIGHT_MAX = 0.15;
const COVERAGE_FLOOR = 0.6;
const SAMPLE_FULL_AT = 600;

export interface ReadinessMetrics {
  lifetimeAttempts: number;
  lifetimeCorrect: number;
  recentAccuracy: number | null;
  recentSample: number;
  topicsCovered: number;
  testsCompleted: number;
  weakTopicsCount: number;
  worstTopicAcc: number | null;
}

export type ReadinessStatus = 'start' | 'progress' | 'near' | 'ready' | 'legend';

export interface ReadinessResult {
  percent: number;
  passProbability: number;
  sampleScore: number;
  pAdj: number;
  status: ReadinessStatus;
  statusText: string;
  shortText: string;
  description: string;
  color: string;
  recommendations: string[];
  studyProgress: number;
  lifetimeAttempts: number;
}

export function getReadinessStatus(percent: number): {
  status: ReadinessStatus;
  statusText: string;
  shortText: string;
  description: string;
  color: string;
} {
  if (percent <= 0) {
    return {
      status: 'start',
      shortText: 'Начни обучение',
      statusText: 'Нет данных. Пройди свой первый тест, чтобы начать отслеживать прогресс.',
      description: 'Ты только присоединился к платформе. Пройди первый тест, чтобы система могла оценить твою текущую готовность и составить персональный план обучения.',
      color: 'slate',
    };
  } else if (percent <= 20) {
    return {
      status: 'start',
      shortText: 'Начало пути',
      statusText: '1–20%: базовый уровень. Знаний пока мало, ошибки часто.',
      description: 'Ты в самом начале. Шанс сдать настоящий экзамен сейчас низкий: для прохода DGT нужно ответить правильно на 27 из 30 вопросов. Регулярно проходи тесты, разбирай ошибки и изучай темы.',
      color: 'slate',
    };
  } else if (percent <= 50) {
    return {
      status: 'progress',
      shortText: 'Есть прогресс',
      statusText: '21–50%: прогресс пошёл. Сдавать экзамен ещё рано.',
      description: 'Заметный прогресс, но шанс сдать настоящий экзамен пока примерно один из двух. Продолжай тренировки и фокусируйся на слабых темах.',
      color: 'orange',
    };
  } else if (percent <= 75) {
    return {
      status: 'near',
      shortText: 'Почти готов',
      statusText: '51–75%: уже близко. Нужно подтянуть устойчивость.',
      description: 'Хороший уровень. Чтобы выйти на стабильный проход 27/30, держи точность ответов выше 92% на больших выборках и закрой слабые темы.',
      color: 'yellow',
    };
  } else if (percent <= 90) {
    return {
      status: 'ready',
      shortText: 'Готов к экзамену',
      statusText: '76–90%: готов. Запись на экзамен оправдана.',
      description: 'Высокая вероятность сдачи. Можешь записываться на экзамен. Перед самой сдачей пройди ещё один полноценный тренировочный 30-вопросник.',
      color: 'emerald',
    };
  } else {
    return {
      status: 'legend',
      shortText: 'Уровень мастер',
      statusText: '91–100%: мастерский уровень. Сдача почти гарантирована.',
      description: 'Стабильно высокая точность на большой выборке. Шанс провалить экзамен — единичный.',
      color: 'purple',
    };
  }
}

export function generateRecommendations(metrics: ReadinessMetrics): string[] {
  const recs: string[] = [];
  const lifetimeAcc = metrics.lifetimeAttempts > 0
    ? metrics.lifetimeCorrect / metrics.lifetimeAttempts
    : 0;

  if (metrics.lifetimeAttempts < 50) {
    recs.push(`Ответь хотя бы на 50 вопросов для первой оценки (сейчас ${metrics.lifetimeAttempts})`);
  }
  if (metrics.testsCompleted < 3) {
    recs.push(`Пройди 3 экзаменационных теста (сейчас ${metrics.testsCompleted})`);
  }
  if (lifetimeAcc < 0.9 && metrics.lifetimeAttempts >= 50) {
    const cur = Math.round(lifetimeAcc * 100);
    recs.push(`Подними точность до 92%+ (сейчас ${cur}%) — экзамен требует 27/30`);
  }
  if (metrics.worstTopicAcc != null && metrics.worstTopicAcc < 0.6) {
    const cur = Math.round(metrics.worstTopicAcc * 100);
    recs.push(`Закрой слабую тему — там ${cur}% правильных. Слабые темы режут шанс сдачи`);
  } else if (metrics.weakTopicsCount >= 3) {
    recs.push(`Слабых тем: ${metrics.weakTopicsCount}. Пройди по ним отдельные тренировки`);
  }
  if (metrics.topicsCovered < 0.7) {
    const cur = Math.round(metrics.topicsCovered * 100);
    recs.push(`Расширь покрытие тем (сейчас ${cur}%, цель 70%+)`);
  }

  if (recs.length === 0) {
    if (lifetimeAcc < 0.95) {
      recs.push('Поддерживай форму: 1–2 теста в неделю, разбирай ошибки');
    } else {
      recs.push('Ты готов. Запишись на экзамен 🎉');
    }
  }
  return recs;
}

function logBinomCoef(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  let s = 0;
  const m = Math.min(k, n - k);
  for (let i = 1; i <= m; i++) {
    s += Math.log(n - m + i) - Math.log(i);
  }
  return s;
}

export function passProbability(p: number, n = EXAM_QS, k = EXAM_PASS_MARK): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const lp = Math.log(p);
  const lq = Math.log(1 - p);
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += Math.exp(logBinomCoef(n, i) + i * lp + (n - i) * lq);
  }
  return Math.min(1, Math.max(0, sum));
}

export function calculateReadiness(metrics: ReadinessMetrics): ReadinessResult {
  if (metrics.lifetimeAttempts === 0) {
    const status = getReadinessStatus(0);
    return {
      percent: 0, passProbability: 0, sampleScore: 0, pAdj: 0,
      status: status.status, statusText: status.statusText, shortText: status.shortText,
      description: status.description, color: status.color,
      recommendations: generateRecommendations(metrics),
      studyProgress: 0, lifetimeAttempts: 0,
    };
  }

  const lifetimeP =
    (metrics.lifetimeCorrect + PRIOR_ALPHA) /
    (metrics.lifetimeAttempts + PRIOR_ALPHA + PRIOR_BETA);

  let p = lifetimeP;
  if (metrics.recentSample >= 10 && metrics.recentAccuracy != null) {
    const wRecent = Math.min(metrics.recentSample / 50, 1) * RECENT_WEIGHT_MAX;
    p = lifetimeP * (1 - wRecent) + metrics.recentAccuracy * wRecent;
  }

  const coverage = Math.min(Math.max(metrics.topicsCovered, 0), 1);
  const coverageGate = COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * coverage;
  const pAdj = Math.min(1, p * coverageGate);

  let prob = passProbability(pAdj);

  if (metrics.worstTopicAcc != null && metrics.worstTopicAcc < 0.6) {
    prob = Math.min(prob, 0.5);
  }
  if (metrics.weakTopicsCount >= 3) {
    prob = Math.min(prob, 0.6);
  }
  if (metrics.lifetimeAttempts < 50) {
    prob = Math.min(prob, 0.4);
  }
  if (metrics.testsCompleted < 3) {
    prob = Math.min(prob, 0.3);
  }

  const sampleScore = Math.min(
    Math.log10(1 + metrics.lifetimeAttempts) / Math.log10(SAMPLE_FULL_AT + 1),
    1,
  );

  return buildResult(prob, sampleScore, pAdj, p, metrics);
}

function buildResult(
  prob: number,
  sampleScore: number,
  pAdj: number,
  p: number,
  metrics: ReadinessMetrics,
): ReadinessResult {
  // Display percent uses pAdj (Bayesian accuracy + coverage gate) instead of raw
  // passProbability so learners see gradual progress across all stages.
  // passProbability stays intact in the return value for telemetry/analytics.
  let displayP = pAdj;
  if (metrics.worstTopicAcc != null && metrics.worstTopicAcc < 0.6) displayP = Math.min(displayP, 0.5);
  if (metrics.weakTopicsCount >= 3) displayP = Math.min(displayP, 0.6);
  if (metrics.lifetimeAttempts < 50) displayP = Math.min(displayP, 0.4);
  if (metrics.testsCompleted < 3) displayP = Math.min(displayP, 0.3);
  const percent = Math.round(Math.min(100, Math.max(0, displayP * 100)));
  // Active users with near-zero display score still see "Начало пути", not "Начни обучение".
  const statusInput = (percent === 0 && metrics.lifetimeAttempts > 0) ? 1 : percent;
  const status = getReadinessStatus(statusInput);

  const volumeScore = Math.min(metrics.lifetimeAttempts / TOTAL_QUESTIONS_BANK, 1);
  const accuracyScore = metrics.lifetimeAttempts > 0 ? metrics.lifetimeCorrect / metrics.lifetimeAttempts : 0;
  // 40% volume (сколько вопросов из банка пройдено), 40% точность, 20% охват тем
  const studyProgress = Math.round((0.4 * volumeScore + 0.4 * accuracyScore + 0.2 * metrics.topicsCovered) * 100);

  return {
    percent,
    passProbability: prob,
    sampleScore,
    pAdj: pAdj || p,
    status: status.status,
    statusText: status.statusText,
    shortText: status.shortText,
    description: status.description,
    color: status.color,
    recommendations: generateRecommendations(metrics),
    studyProgress,
    lifetimeAttempts: metrics.lifetimeAttempts,
  };
}
