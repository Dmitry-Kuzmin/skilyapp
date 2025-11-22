/**
 * Утилиты для расчета готовности к экзамену DGT
 */

export interface ReadinessMetrics {
  accuracy: number; // 0-1
  testsCompleted: number;
  topicsCovered: number; // 0-1
  recentPerformance: number; // 0-1
  activityScore: number; // 0-1
}

export interface ReadinessResult {
  percent: number; // 0-100
  status: 'start' | 'progress' | 'near' | 'ready' | 'legend';
  statusText: string;
  shortText: string; // Короткий текст для UI
  description: string; // Подробное описание уровня
  color: string;
  recommendations: string[];
}

/**
 * Нормализует количество пройденных тестов (максимум 10 тестов = 100%)
 */
export function normalizeTestsCompleted(tests: number): number {
  return Math.min(tests / 10, 1);
}

/**
 * Рассчитывает активность на основе последних попыток
 * Активность = 1, если были попытки за последние 7 дней
 */
export function calculateActivityScore(lastAttempts: Date[]): number {
  if (lastAttempts.length === 0) return 0;
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentAttempts = lastAttempts.filter(
    date => date.getTime() > sevenDaysAgo.getTime()
  );
  
  // Если есть попытки за последние 7 дней - активность 1, иначе 0.5
  if (recentAttempts.length > 0) {
    return 1;
  }
  
  // Если были попытки за последние 30 дней - 0.5
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAttempts = lastAttempts.filter(
    date => date.getTime() > thirtyDaysAgo.getTime()
  );
  
  return monthAttempts.length > 0 ? 0.5 : 0;
}

/**
 * Определяет статус готовности на основе процента
 * Новая система с 5 уровнями и подробными описаниями
 */
export function getReadinessStatus(percent: number): {
  status: 'start' | 'progress' | 'near' | 'ready' | 'legend';
  statusText: string;
  shortText: string;
  description: string;
  color: string;
} {
  if (percent === 0) {
    return {
      status: 'start',
      shortText: 'Начни обучение',
      statusText: 'Нет данных. Пройди свой первый тест, чтобы начать отслеживать прогресс.',
      description: 'Ты только присоединился к платформе. Пройди первый тест, чтобы система могла оценить твою текущую готовность и составить персональный план обучения.',
      color: 'slate',
    };
  } else if (percent <= 30) {
    return {
      status: 'start',
      shortText: 'Начало пути',
      statusText: '0-30%: Ты только начинаешь. Сейчас у тебя базовый уровень знаний.',
      description: 'Ты в начале обучения. Твоя точность ответов еще низкая, и ты только начинаешь изучать материал. Продолжай регулярно тренироваться, проходи тесты и изучай темы. Цель этого этапа — понять структуру экзамена и основы правил дорожного движения.',
      color: 'slate',
    };
  } else if (percent <= 70) {
    return {
      status: 'progress',
      shortText: 'Есть прогресс',
      statusText: '31-70%: Твои усилия дают результат, но еще нужно больше практики.',
      description: 'Ты уже сделал значительный прогресс! Твоя точность улучшилась, и ты начинаешь понимать большинство вопросов. Однако для успешной сдачи экзамена нужно продолжать тренироваться. Изучи оставшиеся темы, регулярно проходи тесты и обращай внимание на ошибки, чтобы их не повторять.',
      color: 'orange',
    };
  } else if (percent <= 84) {
    return {
      status: 'near',
      shortText: 'Почти готов',
      statusText: '71-84%: Ты очень близок к цели! Осталось немного подтянуть слабые места.',
      description: 'Отличная работа! Ты почти готов к экзамену. Твоя точность высокая, и ты хорошо знаешь материал. Сосредоточься на темах, где делаешь ошибки, пройди еще несколько тестов для уверенности и повтори сложные вопросы. Еще немного усилий — и ты будешь полностью готов!',
      color: 'yellow',
    };
  } else if (percent <= 95) {
    return {
      status: 'ready',
      shortText: 'Готов к экзамену',
      statusText: '85-95%: Ты готов сдать экзамен! Твои показатели говорят о высокой готовности.',
      description: 'Поздравляем! Ты достиг необходимого уровня готовности. Твоя точность отличная, ты знаешь все темы и успешно проходишь тесты. Ты можешь записываться на экзамен с уверенностью в успехе. Рекомендуется пройти еще 1-2 тренировочных теста перед экзаменом для поддержания формы.',
      color: 'emerald',
    };
  } else {
    return {
      status: 'legend',
      shortText: 'Уровень мастер',
      statusText: '96-100%: Ты превзошел все ожидания! Сдача экзамена гарантирована.',
      description: 'Невероятно! Ты достиг мастерского уровня. Твоя точность близка к идеалу, ты знаешь материал на отлично и демонстрируешь стабильно высокие результаты. Ты превзошел необходимый уровень для сдачи экзамена. Записывайся на экзамен смело — успех гарантирован! 🏆',
      color: 'purple',
    };
  }
}

/**
 * Генерирует персональные рекомендации на основе метрик
 */
export function generateRecommendations(metrics: ReadinessMetrics): string[] {
  const recommendations: string[] = [];
  
  // Точность
  if (metrics.accuracy < 0.8) {
    const diff = Math.ceil((0.8 - metrics.accuracy) * 100);
    recommendations.push(`Повышайте точность ответов до 80% (сейчас ${Math.round(metrics.accuracy * 100)}%, нужно +${diff}%)`);
  } else if (metrics.accuracy < 0.9) {
    recommendations.push('Отличная точность! Стремитесь к 90% для идеальной готовности');
  }
  
  // Покрытие тем
  if (metrics.topicsCovered < 0.7) {
    const current = Math.round(metrics.topicsCovered * 100);
    recommendations.push(`Изучите больше тем (сейчас ${current}%, цель 70%)`);
  } else if (metrics.topicsCovered < 0.9) {
    recommendations.push('Хорошее покрытие тем! Изучите оставшиеся темы для полной готовности');
  }
  
  // Количество тестов
  if (metrics.testsCompleted < 5) {
    const needed = 5 - metrics.testsCompleted;
    recommendations.push(`Пройдите еще ${needed} ${needed === 1 ? 'тест' : needed < 5 ? 'теста' : 'тестов'} (минимум 5 для готовности)`);
  } else if (metrics.testsCompleted < 10) {
    recommendations.push(`Пройдено ${metrics.testsCompleted} тестов. Пройдите еще ${10 - metrics.testsCompleted} для максимальной уверенности`);
  }
  
  // Недавние результаты
  if (metrics.recentPerformance < 0.75) {
    const current = Math.round(metrics.recentPerformance * 100);
    recommendations.push(`Повторите последние разделы (средний балл последних тестов: ${current}%, цель 75%)`);
  } else if (metrics.recentPerformance < 0.85) {
    recommendations.push('Хорошие недавние результаты! Продолжайте в том же духе');
  }
  
  // Активность
  if (metrics.activityScore < 0.5) {
    recommendations.push('Регулярно тренируйтесь для лучших результатов (минимум раз в неделю)');
  } else if (metrics.activityScore < 1) {
    recommendations.push('Хорошая активность! Тренируйтесь чаще для стабильного прогресса');
  }
  
  // Если все хорошо, но не достигнут максимум
  if (recommendations.length === 0) {
    if (metrics.accuracy < 0.95) {
      recommendations.push('Продолжайте тренироваться для достижения отличных результатов (95%+ точность)');
    } else {
      recommendations.push('Отличная работа! Вы готовы к экзамену! 🎉');
    }
  }
  
  return recommendations;
}

/**
 * Рассчитывает готовность к экзамену на основе метрик
 * Новая формула с учетом системы тем:
 * (accuracy * 0.5) + (topic_completion * 0.3) + (test_success_rate * 0.2)
 * 
 * Старая формула (fallback):
 * (accuracy * 0.4) + (tests * 0.2) + (topics * 0.25) + (recent * 0.1) + (activity * 0.05)
 */
export function calculateReadiness(metrics: ReadinessMetrics): ReadinessResult {
  const normalizedTests = normalizeTestsCompleted(metrics.testsCompleted);
  
  // Используем новую формулу, если доступны данные о завершении тем
  // Проверяем наличие testSuccessRate в метриках (если есть, используем новую формулу)
  const hasNewMetrics = 'testSuccessRate' in metrics;
  
  let readinessPercent: number;
  
  if (hasNewMetrics) {
    // Новая формула: (accuracy * 0.5) + (topic_completion * 0.3) + (test_success_rate * 0.2)
    const testSuccessRate = (metrics as any).testSuccessRate || 0;
    readinessPercent = (
      metrics.accuracy * 0.5 +
      metrics.topicsCovered * 0.3 +
      testSuccessRate * 0.2
    ) * 100;
  } else {
    // Старая формула (fallback)
    readinessPercent = (
      metrics.accuracy * 0.4 +
      normalizedTests * 0.2 +
      metrics.topicsCovered * 0.25 +
      metrics.recentPerformance * 0.1 +
      metrics.activityScore * 0.05
    ) * 100;
  }
  
  const roundedPercent = Math.round(readinessPercent);
  const status = getReadinessStatus(roundedPercent);
  const recommendations = generateRecommendations(metrics);
  
  return {
    percent: roundedPercent,
    status: status.status,
    statusText: status.statusText,
    shortText: status.shortText,
    description: status.description,
    color: status.color,
    recommendations,
  };
}

