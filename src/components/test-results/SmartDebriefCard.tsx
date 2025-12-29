/**
 * SmartDebriefCard — "Skily Diagnostic HUD 2.0"
 * 
 * Премиальный компонент анализа ошибок.
 * Визуализирует ответ AI как диагностическую карту пилота.
 */

import { useState, useCallback, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Sparkles, Bot, RefreshCw, Zap, X,
  Lightbulb, Target, Brain, Copy, Play, CheckCircle2,
  AlertCircle, BookOpen, ArrowRight, BrainCircuit,
  Activity, ThermometerSun, Radar, ChevronRight, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePremium } from '@/hooks/usePremium';
import { useProfileData } from '@/hooks/useProfileData';
import { cn } from '@/lib/utils';
import { AILimitReachedModal } from '@/components/ai/AILimitReachedModal';
import { getImageUrl } from '@/utils/imageUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { triggerHapticFeedback, isTelegramMiniApp, TelegramContext } from '@/lib/telegram';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAIInstructionLanguage, getLanguageInstruction, AILanguage } from '@/utils/aiLanguage';
import ReactMarkdown from 'react-markdown';
import { generateConflictTable } from './aiConstants';
import { useAnalysisHistoryStore } from '@/stores/useAnalysisHistoryStore';
import { useAIDebriefAnalysis } from '@/hooks/useAIDebriefAnalysis';

// Константы для лимитов
const FREE_DAILY_LIMIT = 1;

// Типы
export interface FailedQuestion {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  topic?: string;
  explanation?: string | null;
  imageUrl?: string | null; // URL изображения вопроса для визуального контекста
}

// 🧠 AI Memory: Контекст студента для персонализации
export interface StudentStats {
  name: string;           // Имя для персонального обращения
  xp: number;             // Общий XP для уровня
  streak: number;         // Дней подряд занятий
  prevWeakness?: string | null;  // Прошлая проблемная тема
  trend?: 'rising' | 'stable' | 'falling';  // Тренд прогресса
}

interface SmartDebriefCardProps {
  failedQuestions: FailedQuestion[];
  weakTopic?: string;
  country?: 'russia' | 'spain' | string;
  studentStats?: StudentStats; // Контекст студента для AI Memory
}

interface LimitStatus {
  remaining: number;
  limit: number;
  can_use: boolean;
  is_premium: boolean;
}

interface AIDiagnosis {
  summary: string;
  diagnosisTitle: string;
  diagnosisBody: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  logicSteps: Array<{ questionId?: string; step: string; source: string }>;
  mnemonic: string;

  // Поддержка старого формата (для обратной совместимости)
  greeting?: string;
  diagnosis?: string;
}

// ============================================================================
// ПРОМПТ-ИНЖИНИРИНГ: V6 "Global Brain" (Multi-Language + AI Memory)
// ============================================================================
const generateDebriefPrompt = (
  failedQuestions: FailedQuestion[],
  country: string = 'russia',
  studentStats?: StudentStats
): string => {
  // 🌍 ОПРЕДЕЛЯЕМ ЯЗЫК ОТВЕТА
  const targetLang = getAIInstructionLanguage();
  const languageInstruction = getLanguageInstruction(targetLang);

  console.log('[SmartDebrief] Target language:', targetLang);

  // Контекст страны (для правовой базы)
  const isSpain = country === 'spain';
  const isRussianUserInSpain = isSpain && targetLang === 'Russian';

  const legalContext = isSpain
    ? 'Юридическая база: Reglamento General de Circulación (RGC), статьи DGT.'
    : 'Юридическая база: ПДД РФ, разделы и пункты.';

  // 🔍 DEBUG: Проверяем что приходит в failedQuestions
  console.log('🔍 DEBUG PAYLOAD:', failedQuestions.map(q => ({
    questionId: q.questionId,
    userAnswer: q.userAnswer,
    isSkipped_check: !q.userAnswer || q.userAnswer === 'NO_ANSWER_GIVEN',
  })));

  // ✂️ TRUNCATE: Функция обрезки для экономии токенов
  const truncate = (str: string, limit: number) =>
    str && str.length > limit ? str.substring(0, limit) + '...' : str;

  // Структурированные данные с обрезкой длинных строк
  const structuredErrors = failedQuestions.map(q => {
    const isSkipped = !q.userAnswer || q.userAnswer === 'NO_ANSWER_GIVEN';

    return {
      id: q.questionId,
      question: truncate(q.questionText, 200), // Хватит для понимания
      user_choice: truncate(q.userAnswer || 'NO_ANSWER', 100),
      correct_answer: truncate(q.correctAnswer, 100),
      topic: q.topic || 'General',
      is_skipped: isSkipped
    };
  });

  console.log('🔍 STRUCTURED ERRORS FOR AI:', structuredErrors.map(e => ({
    id: e.id,
    user_choice: e.user_choice,
    is_skipped: e.is_skipped
  })));

  // Получаем текущие проблемные темы
  const currentTopics = [...new Set(failedQuestions.map(q => q.topic).filter(Boolean))];

  // Проверяем, исправил ли ученик прошлую проблему
  const prevWeaknessFixed = studentStats?.prevWeakness &&
    !currentTopics.some(t => t?.toLowerCase().includes(studentStats.prevWeakness?.toLowerCase() || ''));

  // Определяем уровень опыта для персонализации стиля
  const experienceLevel = studentStats
    ? (studentStats.xp > 5000 ? 'veteran' : studentStats.xp > 1500 ? 'intermediate' : 'beginner')
    : 'unknown';

  // Контекст студента
  const studentContext = studentStats ? `
# 🧠 AI MEMORY — STUDENT PROFILE:
| Параметр | Значение |
|----------|----------|
| Имя | ${studentStats.name} |
| XP | ${studentStats.xp} |
| Уровень | ${experienceLevel === 'veteran' ? 'Опытный (5000+ XP)' : experienceLevel === 'intermediate' ? 'Продвинутый (1500+ XP)' : 'Новичок'} |
| Streak | ${studentStats.streak} дней |
| Прошлая слабость | ${studentStats.prevWeakness || 'Нет данных'} |
| Прогресс | ${prevWeaknessFixed ? '✅ Исправил прошлую проблему!' : 'Работает над ней'} |

# 🎭 ПЕРСОНАЛИЗАЦИЯ ПО УРОВНЮ:
${experienceLevel === 'beginner' ? `
- Стиль: ПОДДЕРЖИВАЮЩИЙ и ОБОДРЯЮЩИЙ
- Приветствие: "${studentStats.name}, добро пожаловать на борт!" или "Отличное начало, ${studentStats.name}!"
- Не пугай сложными терминами сразу
- Объясняй ПОЧЕМУ правило такое (логику)
` : experienceLevel === 'intermediate' ? `
- Стиль: КОУЧИНГОВЫЙ и ДЕЛОВОЙ
- Приветствие: "${studentStats.name}, давай разберём детали" или "Хорошая практика!"
- Можешь использовать термины с пояснениями
- Указывай на паттерны ошибок
` : `
- Стиль: ЭКСПЕРТНЫЙ и АНАЛИТИЧЕСКИЙ
- Приветствие: "${studentStats.name}, интересный кейс!" или "Давай покопаемся глубже"
- Используй профессиональные термины
- Анализируй глубинные причины
`}
${studentStats.streak > 3 ? `🔥 ОБЯЗАТЕЛЬНО похвали за ${studentStats.streak} дней подряд!` : ''}
${prevWeaknessFixed ? `🎉 ОБЯЗАТЕЛЬНО отметь прогресс: "${studentStats.name} справился с проблемой [${studentStats.prevWeakness}]!"` : ''}
` : '';

  // Блок сравнения с Россией (V7 - из константы)
  const russiaComparisonBlock = isRussianUserInSpain ? `
# ��🇺 VS 🇪🇸 CONTRASTIVE LEARNING (для русскоязычных):

## ПРАВИЛО СРАВНЕНИЯ:
- Пиши блок "💡 Отличие от РФ:" ТОЛЬКО если есть РЕАЛЬНАЯ разница или опасный нюанс
- Если правило ОДИНАКОВОЕ с РФ — НЕ ПИШИ это ничего про РФ (экономь место на экране)
- Формат: "💡 Отличие от РФ: В России [привычка], но в Испании [правило]. [Опасность]."
- Начинай СТРОГО с "💡 Отличие от РФ:" (два символа: эмодзи + пробел)

## ⚠️ CONFLICT POINTS (Опасные привычки из РФ):
Эти темы ТРЕБУЮТ сравнения, потому что российская интуиция УБИВАЕТ на экзамене:

${generateConflictTable()}

## ФОРМАТ СРАВНЕНИЯ:
"💡 Отличие от РФ: В отличие от привычки в РФ [старая привычка], в Испании [новое правило]. На экзамене: [что делать]."
` : '';

  return `# 🚗 SKILY V7 — ПЕРСОНАЛЬНЫЙ AI-ИНСТРУКТОР

Ты не просто анализатор ошибок. Ты — наставник ${studentStats?.name || 'студента'}, который:
- Видит ПАТТЕРНЫ мышления (не отдельные ошибки)
- Использует РАЗНООБРАЗНЫЙ стиль объяснений
- Даёт УНИКАЛЬНУЮ ценность (сравнения, аналогии, мнемоники)
- Помнит историю ученика (AI Memory)
- Использует ЭМОДЗИ для визуальных якорей 👁️

${languageInstruction}

${legalContext}
${studentContext}
${russiaComparisonBlock}

# 📋 ОШИБКИ СТУДЕНТА:
${JSON.stringify(structuredErrors, null, 2)}

# 🎨 ВАРИАТИВНОСТЬ ОБЪЯСНЕНИЙ (КРИТИЧЕСКИ ВАЖНО!):

НИКОГДА не начинай каждый step одинаково! Используй РАЗНЫЕ подходы:

| # | Стиль | Пример начала с эмодзи |
|---|-------|------------------------|
| 1 | Прямой анализ | "💡 Здесь ключевой момент в том, что..." |
| 2 | Через ловушку | "🪤 Это классическая ловушка DGT — многие думают..." |
| 3 | Через логику | "🤔 Представь ситуацию: ты на автомагистрали и..." |
| 4 | Через последствия | "⚠️ Если бы ты так сделал на реальной дороге..." |
| 5 | Через аналогию | "🎯 Это как в шахматах — нужно думать на ход вперёд..." |
| 6 | Через сравнение | "⚖️ Разница между A и B в том, что..." |
| 7 | Через вопрос | "❓ Почему правильно именно так? Потому что..." |

⚠️ ЗАПРЕЩЕНО: начинать 3+ объяснения подряд с "Ты выбрал..." или "Ты посчитал...  "!
✅ ОБЯЗАТЕЛЬНО: Начинай каждый step с релевантного эмодзи для визуального якоря!

# 🔍 ГЛУБИНА АНАЛИЗА:

Не просто "ты ошибся", а:
1. **Почему** этот вариант казался логичным (понимание студента)
2. **В чём** реальная суть правила (глубинное понимание)
3. **Как** запомнить на будущее (мнемоника или ассоциация)

# 📊 ФОРМАТ ОТВЕТА (СТРОГИЙ JSON):

{
  "summary": "Персональное приветствие + главный инсайт + поддержка. БЕЗ звёздочек!",
  "diagnosisTitle": "🎯 Фокус на: Тема1 и Тема2",
  "diagnosisBody": "Краткий паттерн ошибок. БЕЗ markdown, только текст!",
  "severity": "low | medium | high | critical",
  "tags": ["🛑 Тема1", "👀 Тема2", "🇪🇸 Тема3"],
  "logicSteps": [
    {
      "questionId": "UUID из INPUT DATA",
      "step": "🎯 РАЗНООБРАЗНОЕ объяснение с эмодзи в начале. Термины выделяй так: **Arcén** (обочина). ${isRussianUserInSpain ? 'Если тема из CONFLICT POINTS — добавь сравнение с РФ строго в формате: 💡 Отличие от РФ: ...' : ''}",
      "source": "Название закона (RGC / ПДД РФ)"
    }
  ],
  "mnemonic": "Рифма, акроним или яркая ассоциация для главной ошибки."
}

# 🎯 ЭМОДЗИ (V7 - КРИТИЧЕСКИ ВАЖНО!):
- **diagnosisTitle**: Добавь 1 эмодзи, отражающий суть проблемы (🎯, ⚠️, 🔍, etc.)
- **tags**: Подбирай к каждому тегу подходящий эмодзи (напр. "🛑 Приоритет", "🌧️ Погода", "🇪🇸 DGT")
- **logicSteps**: Начинай каждый step с релевантного эмодзи для визуального якоря

# 🎯 МНЕМОНИКА (ВАЖНО!):
- НЕ пиши абстрактное типа "Будь внимателен" или "Соблюдай правила"
- Мнемоника должна быть КОНКРЕТНОЙ и ЗАПОМИНАЮЩЕЙСЯ
- Форматы: рифма | правило большого пальца | визуальная ассоциация | акроним
- Пример хороший: "Сломался? На Arcén съезжай — другим не мешай!"
- Пример плохой: "Соблюдай правила дорожного движения"

# ⚖️ ИСТОЧНИКИ (ЗАЩИТА ОТ ГАЛЛЮЦИНАЦИЙ):
- Если НЕ уверен на 100% в номере статьи — пиши только название закона: "RGC" или "ПДД РФ"
- ЛУЧШЕ написать "RGC" без номера, чем выдумать "Art. 45.3" который не существует
- Номер статьи пиши ТОЛЬКО если точно знаешь его

# 🚫 ЗАПРЕТЫ:

1. НЕ начинай каждый step одинаково ("Ты выбрал...", "Ты посчитал...")
2. НЕ используй * для выделения — только ** (двойные звёздочки)
3. НЕ пиши "пропустил" если is_skipped !== true
4. НЕ обвиняй студента — объясняй ПОЧЕМУ правило такое
5. НЕ используй markdown в summary и diagnosisBody — только чистый текст!
6. НЕ делай сухие цитаты — объясняй понятно
7. НЕ выдумывай номера статей — лучше без номера, чем неверный
8. НЕ забывай эмодзи в тегах и начале каждого step!

# ✨ ТВОЯ ЦЕЛЬ:

Дать такой анализ, чтобы студент сказал: "Вау, это было полезнее любого бесплатного ChatGPT!"
- Персональный подход (имя, история)
- Уникальные сравнения (Испания vs Россия) — только где РЕАЛЬНАЯ разница!
- Разнообразный стиль с эмодзи-якорями
- Глубинное понимание правил
- Запоминающаяся мнемоника`;
};




// ============================================================================
// КОМПОНЕНТ РЕЗУЛЬТАТА (HUD View)
// ============================================================================
interface AnalysisContentProps {
  data: AIDiagnosis;
  onClose: () => void;
  onRetry: () => void;
  failedCount: number;
  onPractice?: () => void;
  country?: string;
  allFailedQuestions: FailedQuestion[];
}

const AnalysisContent: React.FC<AnalysisContentProps> = ({
  data,
  onClose,
  onRetry,
  failedCount,
  onPractice,
  country,
  allFailedQuestions
}) => {
  const isCritical = data.severity === 'high' || data.severity === 'critical';

  return (
    <div className="relative h-full max-h-[90vh] bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100">

      {/* 1. ХЕДЕР: Статус системы */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isCritical ? "bg-red-400" : "bg-emerald-400"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isCritical ? "bg-red-500" : "bg-emerald-500"
            )}></span>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400">
            {data.diagnosis ? `Analysis: ${country === 'spain' ? 'DGT Spain' : 'ПДД РФ'} ` : 'System Analysis'} • {failedCount} Errors
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition p-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* КОНТЕНТ С АБСОЛЮТНЫМ ПОЗИЦИОНИРОВАНИЕМ */}
      <div
        className="absolute overflow-y-auto p-6 sm:p-8 space-y-8"
        style={{ top: '60px', bottom: '80px', left: 0, right: 0 }}
      >

        {/* 1. SUMMARY - Компактное резюме */}
        <div className="flex items-start gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
          <Bot className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed">
            <ReactMarkdown
              components={{
                strong: ({ children }) => (
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
                ),
                em: ({ children }) => (
                  <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
                )
              }}
            >
              {data.summary || data.greeting || 'Анализ завершён'}
            </ReactMarkdown>
          </div>
        </div>

        {/* 2. TELEMETRY BAR - Монолитная панель метрик */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/10 border-y border-gray-200 dark:border-white/10 py-4">
          <div className="text-center px-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Ошибок</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{failedCount}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Доминирует</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate px-1">
              {data.tags[0] || 'Общее'}
            </div>
          </div>
          <div className="text-center px-2">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Риск</div>
            <div className={cn(
              "text-sm font-bold uppercase",
              isCritical ? "text-orange-500" : "text-emerald-500"
            )}>
              {data.severity === 'critical' ? 'ВАЖНО' :
                data.severity === 'high' ? 'ВНИМАНИЕ' :
                  data.severity === 'medium' ? 'СРЕДНИЙ' : 'ОТЛИЧНО'}
            </div>
          </div>
        </div>

        {/* 3. DIAGNOSIS - Ключевая уязвимость */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
              Точка роста
            </h3>
          </div>

          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <span className="text-indigo-600 dark:text-indigo-400">{children}</span>
                  ),
                  p: ({ children }) => <>{children}</>
                }}
              >
                {data.diagnosisTitle || data.diagnosis || 'Анализ ошибок'}
              </ReactMarkdown>
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
                  ),
                  em: ({ children }) => (
                    <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
                  )
                }}
              >
                {data.diagnosisBody || data.diagnosis || 'Данные анализа недоступны'}
              </ReactMarkdown>
            </div>
          </div>

          {/* Теги */}
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-block px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 4. РАЗБОР ЛОГИКИ */}
        <div className="space-y-4">
        </div>

        {/* 4. РАЗБОР ЛОГИКИ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Логика решений
            </h3>
          </div>

          <div className="space-y-6">
            {data.logicSteps.map((item, idx) => {
              const step = typeof item === 'string' ? item : item.step;
              const source = typeof item === 'object' ? item.source : null;
              const questionId = typeof item === 'object' ? item.questionId : null;

              // Ищем оригинальный вопрос для контекста (с fallback по индексу)
              let originalQuestion = allFailedQuestions.find(q => q.questionId === questionId);

              // Fallback: если не нашли по ID, берём по индексу (если idx < количества вопросов)
              if (!originalQuestion && idx < allFailedQuestions.length) {
                originalQuestion = allFailedQuestions[idx];
              }

              return (
                <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-md">

                  {/* КАРТИНКА (Якорь памяти) — Всегда показываем контейнер */}
                  <div className="shrink-0 group relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-white/10">
                    {originalQuestion?.imageUrl && getImageUrl(originalQuestion.imageUrl) ? (
                      <img
                        src={getImageUrl(originalQuestion.imageUrl) || ''}
                        alt="Context"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          // Если картинка не загрузилась, скрываем img
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      // Плейсхолдер когда нет картинки
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400 dark:text-gray-500 text-center p-2">
                          <Image className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] opacity-60">Нет изображения</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Image className="text-white w-6 h-6 drop-shadow-md" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 mb-2">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        {idx + 1}
                      </div>

                      <div className="flex-1">
                        {/* Текст вопроса для контекста */}
                        {originalQuestion && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mb-1.5 font-medium uppercase tracking-wider">
                            Вопрос: {originalQuestion.questionText}
                          </p>
                        )}

                        {/* Парсинг и визуальное выделение сравнения с РФ (V7) */}
                        {(() => {
                          const isRussiaComparison = step.includes('💡 Отличие от РФ:');
                          const cleanStep = step.replace(/💡 Отличие от РФ:\s*/g, '');

                          return (
                            <>
                              {isRussiaComparison && (
                                <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 rounded-md">
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    🇷🇺 vs 🇪🇸 ОТЛИЧИЕ ОТ РОССИИ
                                  </span>
                                </div>
                              )}
                              <div className={cn(
                                "text-sm text-gray-600 dark:text-gray-300 leading-relaxed",
                                isRussiaComparison && "pl-3 border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-500/5 py-2 rounded-r"
                              )}>
                                <ReactMarkdown
                                  components={{
                                    strong: ({ children }) => (
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1 rounded">{children}</span>
                                    ),
                                    em: ({ children }) => (
                                      <span className="font-semibold text-gray-900 dark:text-white not-italic">{children}</span>
                                    )
                                  }}
                                >
                                  {cleanStep}
                                </ReactMarkdown>
                              </div>
                            </>
                          );
                        })()}

                        {source && (
                          <div className="mt-2.5 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400">
                            {source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. ЛАЙФХАК */}
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 flex items-start gap-4">
            <div className="mt-1 p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Лайфхак запоминания</h5>
              <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                <ReactMarkdown
                  components={{
                    strong: ({ children }) => (
                      <span className="font-bold text-amber-700 dark:text-amber-300 not-italic">{children}</span>
                    )
                  }}
                >
                  {"\"" + data.mnemonic + "\""}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 6. ФУТЕР (Call to Action) — Улучшенный UI */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-white/95 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/95 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          {/* Кнопка "Позже" — компактная */}
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors shrink-0"
          >
            Позже
          </button>

          {/* Основная кнопка — растянута */}
          <Button
            onClick={onPractice}
            className="flex-1 group flex items-center justify-center gap-2 h-12 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]
              bg-gray-900 text-white hover:bg-black
              dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            <span>Отработать ошибку</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

    </div >
  );
};

// ============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================================================
const SmartDebriefCard = memo(({
  failedQuestions,
  weakTopic,
  country = 'russia',
  studentStats
}: SmartDebriefCardProps) => {
  const [analysisData, setAnalysisData] = useState<AIDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = проверяем
  const { isPremium } = usePremium();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { profileData } = useProfileData();

  // 🎣 NEW: AI Debrief Hook with Zustand
  const { performAnalysis: performAIAnalysis, getCachedAnalysis } = useAIDebriefAnalysis();

  // Загружаем статус лимитов и проверяем авторизацию
  useEffect(() => {
    const fetchLimitStatus = async () => {
      try {
        // DESKTOP FIX: Проверяем платформу для диагностики
        const platform = (window as any).Telegram?.WebApp?.platform;
        console.log('[SmartDebrief] Platform:', platform);

        const { data: { user } } = await supabase.auth.getUser();

        // Проверка авторизации
        if (!user) {
          // TELEGRAM FIX: В телеграм-мини-приложении мы никогда не показываем баннер "Войти".
          // Считаем пользователя условно авторизованным для UI.
          if (isTelegramMiniApp()) {
            console.log('[SmartDebrief] Telegram environment detected, skipping auth block');
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          return;
        }
        setIsAuthenticated(true);

        // КРИТИЧНО: Ждем получения profileData перед проверкой лимитов
        if (!profileData?.id) {
          console.log('[SmartDebrief] Waiting for profileData...', { platform });
          return;
        }

        console.log('[SmartDebrief] Using profileId:', profileData.id);

        const { data, error } = await supabase.rpc('get_ai_debrief_limit_status', {
          p_user_id: profileData.id  // ИСПРАВЛЕНО: profile ID вместо user.id
        });

        if (!error && data) {
          setLimitStatus(data as LimitStatus);
        }
      } catch (err) {
        console.error('[SmartDebrief] Failed to fetch limit status:', err);
        setIsAuthenticated(false);
      }
    };

    fetchLimitStatus();
  }, [profileData?.id]);  // ИСПРАВЛЕНО: перезагружаем при изменении profileData

  // 🔄 ZUSTAND CACHE: Загружаем кэш при монтировании
  useEffect(() => {
    const questionIds = failedQuestions.map(q => q.questionId);
    const cached = getCachedAnalysis(questionIds);

    if (cached) {
      console.log('[SmartDebrief] ✅ Loaded cached analysis from Zustand');
      setAnalysisData(cached.diagnosis);
    }
  }, [failedQuestions, getCachedAnalysis]);

  const remaining = limitStatus?.remaining ?? FREE_DAILY_LIMIT;
  const canUseFree = limitStatus?.can_use ?? true;
  const isServerPremium = limitStatus?.is_premium ?? isPremium;

  const parseAIResponse = (text: string): AIDiagnosis => {
    try {
      console.log('[SmartDebrief] Raw AI response:', text.slice(0, 500));

      // 1. Очистка от Markdown блоков кода
      let cleanText = text
        .replace(/```json\s */g, '')
        .replace(/```\s*/g, '')
        .trim();

      // 2. Поиск JSON объекта (от первой { до последней })
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.slice(firstBrace, lastBrace + 1);
      }

      // 3. AGGRESSIVE REPAIR: Попытка парсинга
      try {
        return JSON.parse(cleanText);
      } catch (parseError) {
        console.warn('[SmartDebrief] JSON parse failed, attempting repair...', parseError);

        // 4. SMART REPAIR: Закрываем незакрытые структуры
        let repairedText = cleanText;

        // Подсчитываем открытые скобки
        const openBraces = (repairedText.match(/\{/g) || []).length;
        const closeBraces = (repairedText.match(/\}/g) || []).length;
        const openBrackets = (repairedText.match(/\[/g) || []).length;
        const closeBrackets = (repairedText.match(/\]/g) || []).length;

        // Если незаконченный массив logicSteps
        if (repairedText.includes('"logicSteps":') && openBrackets > closeBrackets) {
          // Ищем последний полный элемент в logicSteps
          const logicStepsMatch = repairedText.match(/"logicSteps":\s*\[(.*)/s);
          if (logicStepsMatch) {
            const stepsContent = logicStepsMatch[1];
            // Находим последнюю закрывающую фигурную скобку элемента
            const lastCompleteItemIndex = stepsContent.lastIndexOf('}');
            if (lastCompleteItemIndex !== -1) {
              // Обрезаем до последнего полного элемента
              const beforeSteps = repairedText.substring(0, repairedText.indexOf('"logicSteps":'));
              const completeSteps = stepsContent.substring(0, lastCompleteItemIndex + 1);
              repairedText = beforeSteps + '"logicSteps": [' + completeSteps + ']';
            }
          }
        }

        // Закрываем оставшиеся структуры
        const stillOpenBraces = (repairedText.match(/\{/g) || []).length;
        const stillCloseBraces = (repairedText.match(/\}/g) || []).length;

        // Добавляем недостающие закрывающие скобки
        repairedText += '}'.repeat(Math.max(0, stillOpenBraces - stillCloseBraces));

        console.log('[SmartDebrief] Repaired JSON, length:', repairedText.length);

        // Пробуем ещё раз
        return JSON.parse(repairedText);
      }
    } catch (e) {
      console.error("Failed to parse AI JSON even after repair:", e);
      return {
        greeting: "Привет! Возникли сложности с обработкой ответа, но я проанализировал твои ошибки.",
        diagnosis: "ИИ вернул ответ в нестандартном формате. Попробуй сгенерировать заново.",
        severity: "low" as const,
        tags: ["Ошибка формата"],
        logicSteps: [{ step: "Нажми 'Попробовать снова'", source: "" }],
        mnemonic: "Иногда даже роботы ошибаются"
      };
    }
  };

  // 🚀 NEW: Perform Analysis V2 - uses hook + Zustand
  const performAnalysisV2 = async (attempt: number = 1): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Auth check
      let userId: string | null = null;
      const isTelegram = isTelegramMiniApp();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      } else if (!isTelegram) {
        throw new Error('Требуется авторизация');
      }

      // 2. Limit check (only for non-premium users)
      console.log('[SmartDebrief] 🔍 Premium check:', {
        isPremium,
        isServerPremium,
        limitStatus,
        userId
      });

      if (userId && !isServerPremium) {
        const { data: limitCheck } = await supabase.rpc(
          'check_and_increment_ai_debrief_limit',
          { p_user_id: userId }
        );

        if (limitCheck && !limitCheck.allowed) {
          setLimitStatus({
            remaining: 0,
            limit: limitCheck.limit,
            can_use: false,
            is_premium: false
          });
          setLimitModalOpen(true);
          setIsLoading(false);
          return;
        }

        if (limitCheck) {
          setLimitStatus({
            remaining: limitCheck.remaining,
            limit: limitCheck.limit,
            can_use: limitCheck.remaining > 0 || limitCheck.is_premium,
            is_premium: limitCheck.is_premium
          });
        }
      } else if (isPremium) {
        console.log('[SmartDebrief] 👑 Premium user: skipping limit check');
        setLimitStatus({
          remaining: 999,
          limit: 999,
          can_use: true,
          is_premium: true
        });
      }

      // 3. Call AI Analysis Hook
      const result = await performAIAnalysis(
        failedQuestions,
        country,
        studentStats,
        generateDebriefPrompt
      );

      if (!result) {
        throw new Error('AI вернул пустой результат');
      }

      // 4. Set result and open modal
      setAnalysisData(result);
      setResultModalOpen(true);
      triggerHapticFeedback('success');
      setIsLoading(false);

    } catch (err) {
      console.error(`[SmartDebrief] Attempt ${attempt} failed:`, err);

      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      const isFatal = errorMessage.includes('авторизация');

      if (attempt === 1 && !isFatal) {
        console.log('[SmartDebrief] Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return performAnalysisV2(2);
      }

      setError(`Анализ не удался: ${errorMessage}`);
      setIsLoading(false);
      triggerHapticFeedback('error');

      toast.error(`ИИ не смог разобрать ошибки: ${errorMessage}`, { duration: 4000 });
    }
  };


  const performAnalysis = async (attempt: number = 1): Promise<void> => {
    try {
      let accessToken: string | null = null;
      let userId: string | null = null;
      const isTelegram = isTelegramMiniApp();

      // Пытаемся получить Supabase сессию
      let { data: { session } } = await supabase.auth.getSession();

      // Если сессии нет, пробуем обновить
      if (!session?.access_token) {
        console.log('[SmartDebrief] Session missing, attempting refresh...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session) {
          session = refreshData.session;
        }
      }

      // Проверяем, удалось ли получить сессию
      if (session?.access_token) {
        accessToken = session.access_token;
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }

      // TELEGRAM BYPASS: Если мы в Telegram и нет сессии — работаем без неё
      // Edge Function ai-chat поддерживает анонимные запросы с rate limiting
      if (!accessToken && isTelegram) {
        console.log('[SmartDebrief] 📱 Telegram mode: proceeding without Supabase session');
      } else if (!accessToken) {
        throw new Error('Требуется авторизация');
      }

      // Проверка лимитов (только если есть userId И НЕ премиум)
      // Премиум пользователи получают безлимит!
      const isPremiumUser = isPremium; // из usePremium hook (проп компонента)

      console.log('[SmartDebrief] 🔍 Premium check:', {
        isPremium,
        isPremiumUser,
        isServerPremium,
        limitStatus,
        userId
      });

      if (userId && !isServerPremium) {
        const { data: limitCheck, error: limitError } = await supabase.rpc(
          'check_and_increment_ai_debrief_limit',
          { p_user_id: userId }
        );

        if (limitCheck && !limitCheck.allowed) {
          setLimitStatus({
            remaining: 0,
            limit: limitCheck.limit,
            can_use: false,
            is_premium: false
          });
          setLimitModalOpen(true);
          return;
        }

        // Обновляем UI статус лимита
        if (limitCheck) {
          setLimitStatus({
            remaining: limitCheck.remaining,
            limit: limitCheck.limit,
            can_use: limitCheck.remaining > 0 || limitCheck.is_premium,
            is_premium: limitCheck.is_premium
          });
        }
      } else if (isPremiumUser) {
        console.log('[SmartDebrief] 👑 Premium user: skipping limit check');
        setLimitStatus({
          remaining: 999,
          limit: 999,
          can_use: true,
          is_premium: true
        });
      } else if (isTelegram) {
        console.log('[SmartDebrief] 📱 Telegram mode: skipping limit check (no userId)');
        // Telegram-пользователи без сессии используют серверный rate limiting
      }

      const prompt = generateDebriefPrompt(failedQuestions, country, studentStats);

      console.log(`[SmartDebrief] Attempt ${attempt}/2: Sending request...`);
      console.log(`[SmartDebrief] Country for AI:`, country);
      console.log(`[SmartDebrief] StudentStats for AI:`, studentStats);
      console.log(`[SmartDebrief] Has access token:`, !!accessToken);

      // Формируем заголовки: с токеном если есть, иначе без
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            country: country,
            mode: 'debrief',
          }),
        }
      );

      console.log(`[SmartDebrief] Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          const errJson = await response.json().catch(() => ({}));
          if (errJson.error === 'daily_limit_reached') {
            setLimitModalOpen(true);
            return;
          }
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[SmartDebrief] AI service error (${response.status}):`, errorText);
        throw new Error(`AI сервис вернул ошибку ${response.status}`);
      }

      // Парсим ответ (SSE или JSON)
      const contentType = response.headers.get('content-type');
      console.log('[SmartDebrief] Response content-type:', contentType);
      let resultText = '';

      if (contentType?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';
        let isDone = false; // Флаг окончания стрима

        console.log('[SmartDebrief] Reading SSE stream with buffer...');

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done || isDone) break; // ИСПРАВЛЕНО: проверяем оба условия

              const chunk = decoder.decode(value, { stream: true });
              lineBuffer += chunk;

              const lines = lineBuffer.split('\n');
              lineBuffer = lines.pop() || ''; // Оставляем последний (возможно неполный) кусок в буфере

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                const data = trimmedLine.slice(6);
                if (data === '[DONE]') {
                  console.log('[SmartDebrief] SSE stream finished ([DONE])');
                  isDone = true; // ИСПРАВЛЕНО: устанавливаем флаг вместо break
                  break; // Выходим из for, затем while проверит isDone
                }

                try {
                  const parsed = JSON.parse(data);
                  const textChunk = (
                    parsed.content ||
                    parsed.text ||
                    parsed.response ||
                    parsed.choices?.[0]?.delta?.content ||
                    parsed.choices?.[0]?.text ||
                    ''
                  );

                  console.log('[SmartDebrief] Extracted chunk:', textChunk.slice(0, 100));

                  if (textChunk) {
                    resultText += textChunk;
                  }
                } catch (e) {
                  console.warn('[SmartDebrief] JSON parse error in SSE line:', e);
                  // Игнорируем ошибки парсинга неполных JSON
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        const data = await response.json();
        resultText = data.content || data.text || data.response || '';
      }

      console.log('[SmartDebrief] Full result length:', resultText.length);

      if (!resultText || resultText.trim().length === 0) {
        console.error('[SmartDebrief] Empty response from AI');
        throw new Error('Пустой ответ от AI (возможно, модель перегружена)');
      }

      const parsedData = parseAIResponse(resultText);

      // Проверяем, что парсинг не вернул fallback-ошибку
      if (parsedData.tags.includes('Ошибка формата')) {
        console.warn('[SmartDebrief] AI returned malformed JSON, got fallback');
        // Не кидаем ошибку, но показываем результат
      }

      setAnalysisData(parsedData);

      // 💾 SAVE TO CACHE: Сохраняем результат для следующих загрузок
      try {
        const questionIds = failedQuestions.map(q => q.questionId).sort().join('-');
        const cacheKey = `skily_ai_debrief_${questionIds}`;
        localStorage.setItem(cacheKey, JSON.stringify(parsedData));
        console.log('[SmartDebrief] ✅ Saved analysis to localStorage:', cacheKey);
      } catch (e) {
        console.error('[SmartDebrief] Error saving cache:', e);
      }

      setResultModalOpen(true);
      triggerHapticFeedback('success');

    } catch (err) {
      console.error(`[SmartDebrief] Attempt ${attempt} failed:`, err);

      const errorMessage = err instanceof Error
        ? err.message
        : 'Неизвестная ошибка';

      // Не делаем Retry для ошибок авторизации (это бессмысленно)
      const isFatal = errorMessage.includes('авторизация') ||
        errorMessage.includes('синхронизаци') ||
        errorMessage.includes('не найден');

      // Retry логика - пробуем еще раз только при первой попытке и если ошибка не фатальная
      if (attempt === 1 && !isFatal) {
        console.log('[SmartDebrief] Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return performAnalysis(2);
      }

      console.error('[SmartDebrief] Final error after retry:', errorMessage);
      setError(`Анализ не удался: ${errorMessage}`);
      triggerHapticFeedback('error');

      // Для Telegram показываем более компактное сообщение
      const displayError = isTelegramMiniApp() && isFatal
        ? errorMessage
        : `ИИ не смог разобрать ошибки: ${errorMessage}`;

      toast.error(displayError, {
        duration: 4000,
      });
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (isLoading) return; // Защита от спам-кликов
    setIsLoading(true);
    setError(null);
    await performAnalysis(1);
    setIsLoading(false);
  }, [failedQuestions, country]);

  const handlePractice = useCallback(() => {
    // Навигация в режим Redemption (восстановление)
    // Передаем failedQuestions и данные анализа ИИ для этапа рефлексии
    console.log(`[SmartDebrief] Navigating to redemption with ${failedQuestions.length} questions`);
    navigate('/test/redemption', {
      state: {
        mode: 'redemption',
        failedQuestions: failedQuestions,
        analysisData: analysisData,
        pddCountry: country
      }
    });
  }, [navigate, failedQuestions, analysisData, country]);

  const handleClose = useCallback(() => setResultModalOpen(false), []);
  const handleRetry = useCallback(() => {
    setResultModalOpen(false);
    handleAnalyze();
  }, [handleAnalyze]);

  if (failedQuestions.length === 0) return null;

  // ===================================
  // ВАРИАНТ 0: Не авторизован — показываем CTA "Войти"
  // ===================================
  if (isAuthenticated === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div
          onClick={() => navigate('/auth')}
          className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-5 shadow-lg border border-slate-700/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            {/* Иконка */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>

            {/* Текст */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white">Neural Analysis</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-[10px] font-bold uppercase tracking-wider text-indigo-300">Pro</span>
              </div>
              <p className="text-sm text-slate-400">Войдите, чтобы получить AI-разбор ошибок</p>
            </div>

            {/* Кнопка */}
            <div className="shrink-0">
              <div className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold group-hover:bg-indigo-400 transition-colors">
                Войти
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ===================================
  // RENDER TRIGGER CARD
  // ===================================
  return (
    <>
      <motion.div
        key="ai-smart-debrief-banner-v2"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="mb-10 cursor-pointer"
        onClick={analysisData ? () => setResultModalOpen(true) : handleAnalyze}
      >
        {analysisData ? (
          /* ВАРИАНТ 1: "Нейро-Ядро" (Neural Core) — Анализ ГОТОВ */
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-0.5 shadow-2xl shadow-indigo-500/30 group">
            {/* Декоративные слои */}
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:30px_30px]"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl group-hover:bg-cyan-400/30 transition-all duration-700"></div>

            <div className="relative h-full w-full bg-slate-950/20 backdrop-blur-xl rounded-[2.3rem] p-6 sm:p-8 flex items-center justify-between overflow-hidden">
              <div className="flex items-start gap-5 relative z-10">
                {/* Иконка */}
                <div className="shrink-0 relative mt-1">
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full blur-lg opacity-40 group-hover:opacity-100 animate-pulse transition-opacity"></div>
                  <div className="relative h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                    <BrainCircuit className="w-8 h-8 text-cyan-300" />
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200 mb-3">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    Анализ завершен
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    Инсайты сформированы
                  </h3>
                  <p className="text-sm text-indigo-100 mt-1.5 opacity-70 font-medium max-w-sm leading-relaxed">
                    Skily нашел глубинные причины твоих ошибок. Раскрой их прямо сейчас.
                  </p>
                </div>
              </div>

              {/* Кнопка-стрелка */}
              <div className="shrink-0 relative z-10 pl-4 hidden sm:block">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/10 group-hover:scale-110 group-hover:rotate-[-8deg] duration-300 shadow-lg">
                  <ChevronRight className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ВАРИАНТ 2: "Obsidian AI Core" (Quiet Luxury) 🌑 — До анализа */
          <div
            onClick={handleAnalyze}
            className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-[#09090b] p-[1px] shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/20"
          >
            {/* 1. АНИМИРОВАННЫЙ БОРДЕР (Conic Gradient Spin) */}
            <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#312e81_50%,#6366f1_100%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* 2. ТЕЛО КАРТОЧКИ (Obsidian Texture) */}
            <div className="relative flex h-full w-full items-center justify-between rounded-[15px] bg-[#0c0c0e] px-5 py-4">

              {/* Фоновый шум (Noise Texture) для дороговизны */}
              <div className="absolute inset-0 rounded-[15px] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')] opacity-[0.03] mix-blend-overlay" />

              {/* Свечение при наведении (Spotlight) */}
              <div
                className="pointer-events-none absolute -inset-px rounded-[15px] opacity-0 transition duration-500 group-hover:opacity-100"
                style={{ background: `radial-gradient(600px circle at 50% 50%, rgba(99,102,241,0.15), transparent 40%)` }}
              />

              <div className="relative z-10 flex items-center gap-4 sm:gap-5">

                {/* Иконка: Голографический Кристалл */}
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-white/5 backdrop-blur-md">
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                  )}

                  {/* Счетчик (Red Dot Notification) */}
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-[#0c0c0e]">
                    <span className="text-[9px] font-bold text-white">{failedQuestions.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold tracking-tight text-white">
                      Neural Analysis
                    </h3>
                    {/* Бейдж PRO (Metallic) */}
                    <div className="flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                      <Zap className="h-2 w-2 fill-current" /> Pro
                    </div>
                  </div>

                  <p className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Обнаружен критический паттерн ошибок
                  </p>
                </div>
              </div>

              {/* Кнопка действия (Glowing Button) */}
              <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-300 group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <ArrowRight className="h-4 w-4" />
              </div>

            </div>
          </div>
        )}
      </motion.div>

      {/* RENDER MODAL / DRAWER */}
      {isMobile ? (
        <Drawer open={resultModalOpen && !!analysisData} onOpenChange={setResultModalOpen}>
          <DrawerContent className="bg-white dark:bg-[#0f172a] border-t border-gray-200 dark:border-white/10 h-full max-h-[90vh] flex flex-col p-0 outline-none overflow-hidden">
            <DrawerTitle className="sr-only">AI Analysis</DrawerTitle>
            {analysisData && (
              <AnalysisContent
                data={analysisData}
                onClose={handleClose}
                onRetry={handleRetry}
                failedCount={failedQuestions.length}
                onPractice={handlePractice}
                country={country}
                allFailedQuestions={failedQuestions}
              />
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <AnimatePresence>
          {resultModalOpen && analysisData && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl rounded-3xl shadow-2xl bg-white dark:bg-[#0f172a] h-full max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <AnalysisContent
                  data={analysisData}
                  onClose={handleClose}
                  onRetry={handleRetry}
                  failedCount={failedQuestions.length}
                  onPractice={handlePractice}
                  country={country}
                  allFailedQuestions={failedQuestions}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* LIMIT MODAL */}
      <AILimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        currentCount={FREE_DAILY_LIMIT}
        limit={FREE_DAILY_LIMIT}
        message="Лимит на сегодня исчерпан. Скоро ты сможешь разбирать каждую ошибку!"
      />
    </>
  );
});

SmartDebriefCard.displayName = 'SmartDebriefCard';
export default SmartDebriefCard;
