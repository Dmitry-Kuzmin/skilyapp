/**
 * Утилиты для анализа тестов и прогнозирования готовности
 */

export interface TestResult {
  score: number;
  accuracy: number;
  date: string;
  topic_id?: string;
}

export interface TrendData {
  trend: 'positive' | 'negative' | 'stable';
  slope: number;
  confidence: number;
  points: Array<{ x: number; y: number }>;
}

export interface CriticalPoint {
  topic_id: string;
  topic_title: string;
  error_count: number;
  error_rate: number;
  attempts: number;
}

/**
 * Рассчитывает тренд на основе последних N тестов
 * Использует линейную регрессию для определения направления
 */
export function calculateTrend(testResults: TestResult[], count: number = 10): TrendData {
  const recentTests = testResults
    .slice(-count)
    .filter(test => test.accuracy > 0)
    .map((test, index) => ({
      x: index,
      y: test.accuracy,
    }));

  if (recentTests.length < 2) {
    return {
      trend: 'stable',
      slope: 0,
      confidence: 0,
      points: recentTests,
    };
  }

  // Линейная регрессия: y = mx + b
  const n = recentTests.length;
  const sumX = recentTests.reduce((sum, p) => sum + p.x, 0);
  const sumY = recentTests.reduce((sum, p) => sum + p.y, 0);
  const sumXY = recentTests.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = recentTests.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Определяем тренд
  let trend: 'positive' | 'negative' | 'stable' = 'stable';
  if (slope > 0.5) {
    trend = 'positive';
  } else if (slope < -0.5) {
    trend = 'negative';
  }

  // Рассчитываем коэффициент детерминации (R²) для уверенности
  const meanY = sumY / n;
  const ssRes = recentTests.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = recentTests.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const confidence = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  return {
    trend,
    slope,
    confidence,
    points: recentTests,
  };
}

/**
 * Рассчитывает индекс стабильности (Consistency Score)
 * Формула: 100 - (Стандартное Отклонение * Коэффициент)
 */
export function calculateConsistencyScore(testResults: TestResult[]): {
  score: number;
  deviation: number;
  level: 'high' | 'medium' | 'low';
} {
  if (testResults.length < 2) {
    return {
      score: 100,
      deviation: 0,
      level: 'high',
    };
  }

  const scores = testResults.map(test => test.accuracy);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Стандартное отклонение
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const deviation = Math.sqrt(variance);

  // Нормализуем отклонение (0-100), где 0 = идеальная стабильность
  const maxDeviation = 50; // Максимальное возможное отклонение
  const normalizedDeviation = Math.min(100, (deviation / maxDeviation) * 100);
  
  // Индекс стабильности (чем выше, тем стабильнее)
  const consistencyScore = Math.max(0, 100 - normalizedDeviation);

  let level: 'high' | 'medium' | 'low' = 'high';
  if (consistencyScore >= 80) {
    level = 'high';
  } else if (consistencyScore >= 60) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    score: Math.round(consistencyScore),
    deviation: Math.round(deviation * 10) / 10,
    level,
  };
}

/**
 * Рассчитывает прогноз времени до достижения целевого уровня
 * Использует экстраполяцию тренда
 */
export function calculateTimeToPass(
  currentScore: number,
  targetScore: number,
  trendData: TrendData,
  averageDailyTests: number = 1
): {
  days: number;
  date: Date;
  confidence: 'high' | 'medium' | 'low';
} {
  if (currentScore >= targetScore) {
    return {
      days: 0,
      date: new Date(),
      confidence: 'high',
    };
  }

  if (trendData.slope <= 0 || trendData.confidence < 0.3) {
    // Тренд отрицательный или низкая уверенность - используем средний темп улучшения
    const averageImprovement = 1; // 1% в день в среднем
    const daysNeeded = Math.ceil((targetScore - currentScore) / averageImprovement);
    
    return {
      days: Math.max(1, daysNeeded),
      date: new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000),
      confidence: 'low',
    };
  }

  // Используем наклон тренда для прогноза
  // slope - это улучшение за один тест
  // Переводим в улучшение за день, учитывая среднее количество тестов в день
  const dailyImprovement = trendData.slope * averageDailyTests;
  const daysNeeded = Math.ceil((targetScore - currentScore) / dailyImprovement);

  const futureDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);

  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (trendData.confidence > 0.7 && daysNeeded < 30) {
    confidence = 'high';
  } else if (trendData.confidence < 0.5 || daysNeeded > 60) {
    confidence = 'low';
  }

  return {
    days: Math.max(1, daysNeeded),
    date: futureDate,
    confidence,
  };
}

/**
 * Определяет критическую точку (тему с наибольшим количеством ошибок)
 */
export function findCriticalPoint(
  testResults: TestResult[],
  topicMap: Map<string, string> = new Map()
): CriticalPoint | null {
  // Собираем статистику по темам
  const topicStats = new Map<string, { errors: number; attempts: number }>();

  testResults.forEach(test => {
    if (test.topic_id) {
      const stats = topicStats.get(test.topic_id) || { errors: 0, attempts: 0 };
      stats.attempts += 1;
      stats.errors += Math.round((100 - test.accuracy) / 10); // Примерная оценка ошибок
      topicStats.set(test.topic_id, stats);
    }
  });

  if (topicStats.size === 0) {
    return null;
  }

  // Находим тему с наибольшим количеством ошибок
  let maxErrorRate = 0;
  let criticalTopic: { id: string; stats: { errors: number; attempts: number } } | null = null;

  topicStats.forEach((stats, topicId) => {
    const errorRate = stats.errors / stats.attempts;
    if (errorRate > maxErrorRate) {
      maxErrorRate = errorRate;
      criticalTopic = { id: topicId, stats };
    }
  });

  if (!criticalTopic) {
    return null;
  }

  return {
    topic_id: criticalTopic.id,
    topic_title: topicMap.get(criticalTopic.id) || 'Тема не определена',
    error_count: criticalTopic.stats.errors,
    error_rate: Math.round((criticalTopic.stats.errors / criticalTopic.stats.attempts) * 100),
    attempts: criticalTopic.stats.attempts,
  };
}

/**
 * Рассчитывает "заряд внимания" (Focus Battery)
 * Если пользователь делает много ошибок подряд, внимание падает
 */
export function calculateFocusBattery(testResults: TestResult[]): {
  charge: number; // 0-100
  level: 'high' | 'medium' | 'low';
  message: string;
} {
  if (testResults.length < 3) {
    return {
      charge: 100,
      level: 'high',
      message: 'Продолжай в том же духе!',
    };
  }

  // Анализируем последние 5 тестов
  const recentTests = testResults.slice(-5);
  const lowScores = recentTests.filter(test => test.accuracy < 60).length;
  const consecutiveErrors = recentTests.reduce((max, test, index) => {
    if (test.accuracy < 50 && index > 0 && recentTests[index - 1].accuracy < 50) {
      return max + 1;
    }
    return max;
  }, 0);

  let charge = 100;
  let level: 'high' | 'medium' | 'low' = 'high';
  let message = '';

  // Штрафы за низкие результаты
  charge -= lowScores * 15;
  charge -= consecutiveErrors * 25;

  charge = Math.max(0, Math.min(100, charge));

  if (charge >= 70) {
    level = 'high';
    message = 'Отличная концентрация! Продолжай в том же духе.';
  } else if (charge >= 40) {
    level = 'medium';
    message = 'Внимание слегка снижено. Сделай короткий перерыв.';
  } else {
    level = 'low';
    message = 'Внимание падает. Рекомендуется сделать перерыв и вернуться позже.';
  }

  return {
    charge: Math.round(charge),
    level,
    message,
  };
}

/**
 * Генерирует данные для тепловой карты активности (GitHub-style)
 */
export function generateActivityHeatmap(
  testResults: TestResult[],
  days: number = 30
): Array<{ date: Date; count: number; level: 0 | 1 | 2 | 3 | 4 }> {
  const now = new Date();
  const heatmap: Array<{ date: Date; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];

  // Инициализируем все дни
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    heatmap.push({
      date,
      count: 0,
      level: 0,
    });
  }

  // Подсчитываем тесты по дням
  testResults.forEach(test => {
    const testDate = new Date(test.date);
    testDate.setHours(0, 0, 0, 0);
    
    const index = heatmap.findIndex(day => 
      day.date.getTime() === testDate.getTime()
    );
    
    if (index !== -1) {
      heatmap[index].count += 1;
    }
  });

  // Определяем максимальное количество тестов для нормализации
  const maxCount = Math.max(...heatmap.map(day => day.count), 1);

  // Присваиваем уровни интенсивности (0-4)
  heatmap.forEach(day => {
    if (day.count === 0) {
      day.level = 0;
    } else if (day.count <= maxCount * 0.25) {
      day.level = 1;
    } else if (day.count <= maxCount * 0.5) {
      day.level = 2;
    } else if (day.count <= maxCount * 0.75) {
      day.level = 3;
    } else {
      day.level = 4;
    }
  });

  return heatmap;
}

