import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Типы
// ============================================

interface TestRewardRequest {
  user_id: string;
  test_id?: string;
  session_id: string; // для idempotency
  score: number; // 0-100
  questions_count: number;
  correct_count: number;
  test_duration_seconds: number;
  premium_flag?: boolean;
  double_sp_active?: boolean;
}

interface RewardConfig {
  baseCoins: number;
  baseSP: number;
  questionsReference: number;
  maxQuestionsMultiplierCap: number;
  premiumCoinsMultiplier: number;
  premiumSPMultiplier: number;
  maxCoinsPerTest: number;
  maxSPPerTest: number;
  minCoinsPerTest: number;
  minTestDurationBase: number;
  minTestDurationPerQuestion: number;
  abuseDetection: {
    enabled: boolean;
    minAnswerSpeedSeconds: number;
    suspiciousPatternThreshold: number;
    minPenalty: number;
  };
  diminishingReturns: {
    enabled: boolean;
    threshold: number;
    reductionPerTest: number;
    maxReduction: number;
  };
}

// ============================================
// Формулы расчета наград
// ============================================

/**
 * Мультипликатор длины теста (логистическая кривая)
 */
function calcQuestionsMultiplier(
  Q: number,
  questionsReference: number,
  maxCap: number
): number {
  if (Q <= questionsReference) {
    return Q / questionsReference; // линейно до 1.0
  } else {
    const extra = Q - questionsReference;
    // Логистическая плавная кривая
    const multiplier = 1 + (1 - Math.exp(-extra / 15)) * (maxCap - 1);
    return Math.min(multiplier, maxCap);
  }
}

/**
 * Расчет награды монет
 */
function calculateCoinsReward(
  score: number,
  Q: number,
  config: RewardConfig,
  questionsMultiplier: number,
  premium: boolean
): number {
  // Базовая формула
  let coinsReward = config.baseCoins * (score / 100) * questionsMultiplier;
  
  // Минимальная награда (динамическая)
  const minCoins = Math.max(
    config.minCoinsPerTest,
    Math.ceil(1.5 * questionsMultiplier)
  );
  coinsReward = Math.max(coinsReward, minCoins);
  
  // Premium мультипликатор
  if (premium) {
    coinsReward *= config.premiumCoinsMultiplier;
  }
  
  // Округление
  coinsReward = Math.round(coinsReward);
  
  // Cap
  coinsReward = Math.min(coinsReward, config.maxCoinsPerTest);
  
  return coinsReward;
}

/**
 * Расчет награды SP
 */
function calculateSPReward(
  score: number,
  Q: number,
  config: RewardConfig,
  premium: boolean,
  doubleSP: boolean
): number {
  // Базовая формула с минимальной планкой 35%
  let spReward = config.baseSP * (0.35 + score / 180);
  
  // Бонусы
  const questionsBonusSP = Math.floor(Q / 10);
  const perfectBonus = score === 100 ? 10 : 0;
  spReward += questionsBonusSP + perfectBonus;
  
  // Premium мультипликатор
  if (premium) {
    spReward *= config.premiumSPMultiplier;
  }
  
  // Double SP (после всех расчетов)
  if (doubleSP) {
    spReward *= 2;
  }
  
  // Округление
  spReward = Math.round(spReward);
  
  // Минимальная награда
  spReward = Math.max(spReward, Math.ceil(Q / 25));
  
  // Cap
  spReward = Math.min(spReward, config.maxSPPerTest);
  
  return spReward;
}

// ============================================
// Анти-абуз система (3 уровня)
// ============================================

/**
 * Уровень A: Hard Limits - проверка минимальной длительности теста
 */
function checkHardLimits(
  duration: number,
  Q: number,
  config: RewardConfig
): { passed: boolean; reason?: string } {
  const minDuration = config.minTestDurationBase + Q * config.minTestDurationPerQuestion;
  
  if (duration < minDuration) {
    return {
      passed: false,
      reason: `Test duration too short. Minimum: ${minDuration}s, actual: ${duration}s`
    };
  }
  
  return { passed: true };
}

/**
 * Уровень B: Soft Penalization - детекция аномалий
 */
async function detectAbusePattern(
  userId: string,
  currentTest: {
    score: number;
    Q: number;
    duration: number;
  },
  config: RewardConfig,
  supabase: any
): Promise<number> {
  if (!config.abuseDetection.enabled) {
    return 1.0;
  }
  
  // Получаем историю за последние 2 часа
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  const { data: recentTests } = await supabase
    .from('test_results')
    .select('score, questions_count, test_duration_seconds')
    .eq('user_id', userId)
    .gte('created_at', twoHoursAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!recentTests || recentTests.length < 3) {
    return 1.0; // Недостаточно данных для анализа
  }
  
  const allTests = [...recentTests, currentTest];
  const avgDuration = allTests.reduce((sum, t) => sum + (t.test_duration_seconds || 0), 0) / allTests.length;
  const avgScore = allTests.reduce((sum, t) => sum + t.score, 0) / allTests.length;
  const avgQ = allTests.reduce((sum, t) => sum + t.questions_count, 0) / allTests.length;
  
  let penalty = 1.0;
  
  // ВАЖНО: Штраф применяется ТОЛЬКО если есть несколько подозрительных тестов подряд
  // Один быстрый тест - это нормально (пользователь может быстро отвечать)
  const minTestsForPenalty = 3; // Минимум 3 теста для применения штрафа
  
  if (allTests.length < minTestsForPenalty) {
    // Недостаточно данных - не применяем штраф
    return 1.0;
  }
  
  // Проверка 1: слишком быстрые тесты (только если ВСЕ тесты очень быстрые)
  // Смягчаем: если хотя бы один тест нормальный, не штрафуем
  const allFastTests = allTests.every(t => (t.test_duration_seconds || 0) < 60);
  const speedPenalty = (allFastTests && avgDuration < 45) ? 0.9 : 1.0; // Смягчено: было 0.7, стало 0.9 и только если ВСЕ быстрые
  penalty *= speedPenalty;
  
  // Проверка 2: низкий score + высокая скорость (только если ВСЕ тесты плохие)
  // Смягчаем: если хотя бы один тест с нормальным score, не штрафуем
  const allLowScore = allTests.every(t => t.score < 40);
  const behaviorPenalty = (allLowScore && avgScore < 30 && avgDuration < 45) ? 0.85 : 1.0; // Смягчено: было 0.6, стало 0.85
  penalty *= behaviorPenalty;
  
  // Проверка 3: одинаковые паттерны (боты) - это главный индикатор
  // Если все тесты имеют одинаковое количество вопросов и одинаковую длительность - это бот
  const uniqueQ = new Set(allTests.map(t => t.questions_count));
  const uniqueDurations = new Set(allTests.map(t => Math.round((t.test_duration_seconds || 0) / 10) * 10)); // Округляем до 10 секунд
  const isBotPattern = (uniqueQ.size === 1 && uniqueDurations.size === 1 && allTests.length >= config.abuseDetection.suspiciousPatternThreshold);
  const patternPenalty = isBotPattern ? 0.7 : 1.0; // Это реальный признак бота
  penalty *= patternPenalty;
  
  // Проверка 4: слишком быстрые ответы (невозможно для человека)
  // Смягчаем: проверяем только если ВСЕ тесты имеют нереально быстрые ответы
  const avgAnswerSpeed = avgDuration / avgQ;
  const allUnrealisticSpeed = allTests.every(t => {
    const answerSpeed = (t.test_duration_seconds || 0) / t.questions_count;
    return answerSpeed < config.abuseDetection.minAnswerSpeedSeconds;
  });
  const answerSpeedPenalty = (allUnrealisticSpeed && avgAnswerSpeed < config.abuseDetection.minAnswerSpeedSeconds * 0.8) ? 0.6 : 1.0; // Смягчено: только если ВСЕ нереально быстрые
  penalty *= answerSpeedPenalty;
  
  // Минимальный штраф - не применяем если penalty близок к 1.0 (меньше 5% снижения)
  if (penalty > 0.95) {
    return 1.0; // Недостаточно признаков злоупотребления
  }
  
  return Math.max(config.abuseDetection.minPenalty, penalty);
}

/**
 * Уровень C: Shadow Balancing - diminishing returns
 */
async function getDiminishingFactor(
  userId: string,
  config: RewardConfig,
  supabase: any
): Promise<{ factor: number; testsToday: number; message?: string }> {
  if (!config.diminishingReturns.enabled) {
    return { factor: 1.0, testsToday: 0 };
  }
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from('test_results')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());
  
  const testsToday = count || 0;
  
  if (testsToday > config.diminishingReturns.threshold) {
    const extraTests = testsToday - config.diminishingReturns.threshold;
    const reduction = Math.min(
      extraTests * config.diminishingReturns.reductionPerTest,
      config.diminishingReturns.maxReduction
    );
    const factor = 1 - reduction;
    
    return {
      factor: Math.max(0.8, factor), // минимум 80%
      testsToday,
      message: "Вы отлично тренируетесь! Мы немного снизили награды, чтобы балансировать игровой процесс. Завтра всё восстановится ✨"
    };
  }
  
  return { factor: 1.0, testsToday };
}

// ============================================
// Основная функция
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      user_id,
      test_id,
      session_id,
      score,
      questions_count,
      correct_count,
      test_duration_seconds,
      premium_flag = false,
      double_sp_active = false,
    }: TestRewardRequest = await req.json();

    // Валидация входных данных
    if (!user_id || !session_id || score === undefined || questions_count === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, session_id, score, questions_count" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверка idempotency
    const { data: existingResult } = await supabase
      .from('test_results')
      .select('coins_awarded, sp_awarded')
      .eq('session_id', session_id)
      .single();

    if (existingResult) {
      // Уже обработано - возвращаем существующий результат
      return new Response(
        JSON.stringify({
          success: true,
          coins_awarded: existingResult.coins_awarded,
          sp_awarded: existingResult.sp_awarded,
          message: "Test already processed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем конфигурацию наград
    const { data: configData, error: configError } = await supabase.rpc('get_active_reward_config', {
      p_key: 'test_rewards',
      p_season_id: null
    });

    if (configError) {
      console.error("[complete-test-and-award] Config error:", configError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Reward configuration not found", 
          details: configError?.message || configError?.toString(),
          code: configError?.code
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!configData) {
      console.error("[complete-test-and-award] Config data is null");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Reward configuration is null",
          details: "No active reward configuration found"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config: RewardConfig = configData as RewardConfig;
    
    // Валидация конфигурации
    if (!config.baseCoins || !config.baseSP) {
      console.error("[complete-test-and-award] Invalid config:", config);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid reward configuration",
          details: "Config missing required fields: baseCoins or baseSP"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверка Premium статуса
    const { data: profile } = await supabase
      .from('profiles')
      .select('premium_until, trial_until')
      .eq('id', user_id)
      .single();

    const now = new Date();
    const isPremium = premium_flag || 
      (profile?.premium_until && new Date(profile.premium_until) > now) ||
      (profile?.trial_until && new Date(profile.trial_until) > now);

    // ============================================
    // Уровень A: Hard Limits (проверка, но не блокировка)
    // ============================================
    // Вместо полного блокирования, просто логируем предупреждение
    // Реальная защита от абуза будет через detectAbusePattern
    const hardLimitsCheck = checkHardLimits(test_duration_seconds, questions_count, config);
    if (!hardLimitsCheck.passed) {
      console.warn("[complete-test-and-award] Hard limits check failed:", hardLimitsCheck.reason);
      // Не блокируем, но это будет учтено в abuse detection
    }

    // ============================================
    // Расчет базовых наград
    // ============================================
    const questionsMultiplier = calcQuestionsMultiplier(
      questions_count,
      config.questionsReference,
      config.maxQuestionsMultiplierCap
    );

    let coinsReward = calculateCoinsReward(
      score,
      questions_count,
      config,
      questionsMultiplier,
      isPremium
    );

    let spReward = calculateSPReward(
      score,
      questions_count,
      config,
      isPremium,
      double_sp_active
    );

    // Сохраняем базовые значения для аналитики
    const baseCoinsCalculated = coinsReward;
    const baseSPCalculated = spReward;

    // ============================================
    // Уровень B: Soft Penalization
    // ============================================
    const abusePenalty = await detectAbusePattern(
      user_id,
      { score, Q: questions_count, duration: test_duration_seconds },
      config,
      supabase
    );

    coinsReward = Math.round(coinsReward * abusePenalty);
    spReward = Math.round(spReward * abusePenalty);
    
    // Сохраняем abuse_penalty для использования ниже
    const abuse_penalty = abusePenalty;

    // ============================================
    // Уровень C: Shadow Balancing (Diminishing Returns)
    // ============================================
    const diminishing = await getDiminishingFactor(user_id, config, supabase);
    const diminishingFactor = diminishing.factor;

    coinsReward = Math.round(coinsReward * diminishingFactor);
    spReward = Math.round(spReward * diminishingFactor);

    // ============================================
    // Атомарное обновление балансов и запись результатов
    // ============================================
    
    // Используем транзакцию через RPC или последовательные операции с проверками
    // В Supabase Edge Functions транзакции через RPC функции

    // 1. Обновляем баланс монет
    const { error: coinsError } = await supabase.rpc("increment_profile_value", {
      p_profile_id: user_id,
      p_column: "coins",
      p_amount: coinsReward,
    });

    if (coinsError) {
      console.error("[complete-test-and-award] Coins update error:", coinsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to update coins balance",
          details: coinsError.message || coinsError.toString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Начисляем SP через season-sp функцию
    let spData: any = null;
    let spError: any = null;
    
    try {
      const spResponse = await supabase.functions.invoke("season-sp", {
        body: {
          user_id,
          source_type: score === 100 ? "test_perfect" : "test_completed",
          metadata: {
            sp_earned: spReward,
            test_id,
            session_id,
            score,
            questions_count
          }
        },
      });
      
      spData = spResponse.data;
      spError = spResponse.error;
      
      if (spError) {
        console.error("[complete-test-and-award] SP update error:", spError);
        // Не прерываем процесс, но логируем ошибку
      }
    } catch (spInvokeError) {
      console.error("[complete-test-and-award] SP function invoke error:", spInvokeError);
      // Не прерываем процесс, но логируем ошибку
    }

    // 3. Записываем результат теста
    const { data: insertedResult, error: insertError } = await supabase
      .from('test_results')
      .insert({
        user_id,
        test_id: test_id || null,
        session_id,
        score,
        questions_count,
        correct_count,
        test_duration_seconds,
        coins_awarded: coinsReward,
        sp_awarded: spReward,
        premium_used: isPremium,
        double_sp_used: double_sp_active,
        abuse_penalty: abuse_penalty,
        diminishing_factor: diminishingFactor,
        questions_multiplier: questionsMultiplier,
        base_coins_calculated: baseCoinsCalculated,
        base_sp_calculated: baseSPCalculated,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("[complete-test-and-award] Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to save test result",
          details: insertError.message || insertError.toString(),
          code: insertError.code
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testResultId = insertedResult?.id;

    if (!testResultId) {
      console.error("[complete-test-and-award] Failed to get test_result_id from insert");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to get test result ID",
          details: "Insert succeeded but ID is missing"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Логируем транзакции
    await supabase.from("transactions").insert({
      user_id,
      transaction_type: "coins_earned_test",
      amount: coinsReward,
      metadata: {
        test_id,
        session_id,
        score,
        questions_count,
        premium: isPremium,
        abuse_penalty,
        diminishing_factor: diminishingFactor,
        test_result_id: testResultId, // Добавляем ID результата для связи
      },
    });

    // 5. Отслеживаем прогресс челленджей
    try {
      await supabase.functions.invoke("season-challenges-track", {
        body: {
          user_id,
          source_type: score === 100 ? "test_perfect" : "test_completed",
          metadata: {
            questions_count,
            score,
            coins_earned: coinsReward,
            sp_earned: spReward,
          },
        },
      });
    } catch (err) {
      // Игнорируем ошибки отслеживания челленджей
      console.warn("[complete-test-and-award] Challenge tracking error:", err);
    }

    // Возвращаем результат
    return new Response(
      JSON.stringify({
        success: true,
        coins_awarded: coinsReward,
        sp_awarded: spReward,
        base_coins: baseCoinsCalculated,
        base_sp: baseSPCalculated,
        test_result_id: testResultId, // Добавляем ID результата для связи с отчетами
        abuse_penalty,
        diminishing_factor: diminishingFactor,
        tests_today: diminishing.testsToday,
        message: diminishing.message,
        level_up: spData?.level_up || false,
        new_level: spData?.level,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[complete-test-and-award] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error", 
        details: error?.message || error?.toString() || "Unknown error",
        stack: error?.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

