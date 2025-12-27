/**
 * SmartDebriefCard — "Мгновенный разбор полетов"
 * 
 * AI анализирует ошибки пользователя и находит закономерности,
 * вместо сухого перечисления неправильных ответов.
 * 
 * Состояния:
 * 1. Idle - кнопка "Разобрать с AI"
 * 2. Loading - "Skily думает..."
 * 3. Success - персонализированный анализ
 * 4. Error - fallback на стандартное объяснение
 */

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sparkles, Bot, RefreshCw, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Типы для ошибок
export interface FailedQuestion {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  topic?: string;
  explanation?: string | null;
}

interface SmartDebriefCardProps {
  failedQuestions: FailedQuestion[];
  weakTopic?: string;
  onUpgradeClick?: () => void;
}

// Генерация промпта для анализа паттернов ошибок
const generateDebriefPrompt = (failedQuestions: FailedQuestion[]): string => {
  const errorsText = failedQuestions.map((q, i) => `
${i + 1}. Вопрос: "${q.questionText}"
   - Ученик ответил: "${q.userAnswer}" (НЕВЕРНО)
   - Правильный ответ: "${q.correctAnswer}"
   - Тема: ${q.topic || 'Общие правила'}
`).join('\n');

  return `Ты — опытный и эмпатичный автоинструктор Skily.
Ученик только что завершил тест с ошибками. Вот список его ошибок:

${errorsText}

Твоя задача:
1. НЕ разбирай каждый вопрос отдельно (это скучно).
2. Найди ОБЩУЮ закономерность или слабую тему. (Например: "Ты часто ошибаешься в скоростных лимитах для грузовиков" или "Ты путаешь знаки приоритета").
3. Дай один конкретный совет, как это запомнить.
4. Используй стиль "Свой парень", будь краток (максимум 4 предложения).
5. Обращайся к ученику на "Ты" или "Пилот".
6. Используй Markdown: **жирный** для ключевых терминов.
7. Если видишь критическую ошибку безопасности — подчеркни её важность.

Ответ должен быть коротким, личным и полезным. Не начинай с "Привет" или "Понял".`;
};

const SmartDebriefCard = memo(({ 
  failedQuestions, 
  weakTopic,
  onUpgradeClick 
}: SmartDebriefCardProps) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPremium } = usePremium();

  const handleAnalyze = useCallback(async () => {
    // Проверка лимитов для не-премиум пользователей
    if (!isPremium) {
      onUpgradeClick?.();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Получаем токен авторизации
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Требуется авторизация');
      }

      // Формируем промпт
      const prompt = generateDebriefPrompt(failedQuestions);

      // Вызываем Edge Function ai-chat
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            stream: false, // Без стриминга для простоты
            country: 'spain',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка AI сервиса');
      }

      // Парсим ответ (может быть streaming или JSON)
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        // SSE streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullText += parsed.content;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        }
        
        setAnalysis(fullText || 'Анализ не удался. Попробуйте еще раз.');
      } else {
        // JSON response
        const data = await response.json();
        setAnalysis(data.content || data.text || 'Анализ не удался.');
      }

    } catch (err) {
      console.error('[SmartDebrief] Error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  }, [failedQuestions, isPremium, onUpgradeClick]);

  // Если нет ошибок — не показываем блок
  if (failedQuestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-1 mb-8 shadow-xl shadow-purple-900/10"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
      
      <div className="relative z-10 bg-card/40 backdrop-blur-sm rounded-xl p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "p-3 rounded-2xl border shadow-inner transition-colors duration-300",
            analysis 
              ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400"
              : "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400"
          )}>
            {analysis ? <Sparkles className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              {analysis ? 'Анализ Skily' : 'Разбор полетов'}
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-muted-foreground">
              {analysis 
                ? 'Персональные рекомендации'
                : `${failedQuestions.length} ${failedQuestions.length === 1 ? 'ошибка' : 'ошибки'} найдено`
              }
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[80px]">
          <AnimatePresence mode="wait">
            {/* State 1: IDLE */}
            {!analysis && !isLoading && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {weakTopic ? (
                    <>Вы ошиблись в теме <span className="font-medium text-purple-400">"{weakTopic}"</span>. ИИ-инструктор готов найти закономерности и дать совет.</>
                  ) : (
                    'ИИ-инструктор проанализирует ваши ошибки, найдёт общую закономерность и даст персональный совет.'
                  )}
                </p>
                
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className={cn(
                    "w-full sm:w-auto h-12 px-6 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95",
                    isPremium 
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 border-none"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/25 border-none"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {isPremium ? (
                      <>Разобрать с AI <Sparkles className="w-4 h-4" /></>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        Premium: Разбор с AI
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            )}

            {/* State 2: LOADING */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 py-6"
              >
                <div className="flex gap-1">
                  <motion.div 
                    className="w-2.5 h-2.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div 
                    className="w-2.5 h-2.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                  />
                  <motion.div 
                    className="w-2.5 h-2.5 bg-purple-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                </div>
                <span className="text-sm text-purple-300 font-medium">Skily анализирует твои ошибки...</span>
              </motion.div>
            )}

            {/* State 3: SUCCESS */}
            {analysis && !isLoading && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-slate-200 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => (
                          <span className="font-bold text-purple-300">{children}</span>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                      }}
                    >
                      {analysis}
                    </ReactMarkdown>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> AI Summary
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setAnalysis(null);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Повторить
                  </Button>
                </div>
              </motion.div>
            )}

            {/* State 4: ERROR */}
            {error && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-300 font-medium">Не удалось получить анализ</p>
                    <p className="text-xs text-red-400/70 mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  onClick={handleAnalyze}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Попробовать снова
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

SmartDebriefCard.displayName = 'SmartDebriefCard';

export default SmartDebriefCard;
