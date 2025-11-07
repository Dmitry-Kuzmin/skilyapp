import { supabase } from "@/integrations/supabase/client";

export interface TopicUnlockCondition {
  required_topics?: number[];
  min_score?: number;
  skip_test_id?: string;
}

export interface TopicProgress {
  completed: boolean;
  progressPercent: number;
  completedSubtopicCount: number;
  totalSubtopicCount: number;
  isUnlocked: boolean;
}

/**
 * Проверяет, разблокирована ли тема для пользователя
 */
export async function checkTopicUnlock(
  userId: string,
  topicId: string
): Promise<{ isUnlocked: boolean; reason?: string }> {
  try {
    // Получаем тему с условиями разблокировки
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, number, order_index, unlock_condition")
      .eq("id", topicId)
      .single();

    if (topicError || !topic) {
      return { isUnlocked: false, reason: "Тема не найдена" };
    }

    // Если unlock_condition пустой или null, тема доступна
    const unlockCondition = topic.unlock_condition as TopicUnlockCondition | null;
    if (!unlockCondition || Object.keys(unlockCondition).length === 0) {
      return { isUnlocked: true };
    }

    // Проверка 1: Требуемые темы должны быть завершены
    if (unlockCondition.required_topics && unlockCondition.required_topics.length > 0) {
      // Получаем ID требуемых тем по их номерам
      const { data: requiredTopics } = await supabase
        .from("topics")
        .select("id")
        .in("number", unlockCondition.required_topics);

      if (requiredTopics && requiredTopics.length > 0) {
        const requiredTopicIds = requiredTopics.map((t) => t.id);

        // Проверяем, завершены ли все требуемые темы
        const { data: progressData } = await supabase
          .from("user_topic_progress")
          .select("topic_id, completed")
          .eq("user_id", userId)
          .in("topic_id", requiredTopicIds)
          .eq("completed", true)
          .is("subtopic_id", null); // Только прогресс на уровне темы

        const completedRequiredTopics = progressData?.length || 0;
        if (completedRequiredTopics < requiredTopicIds.length) {
          // Проверяем, есть ли пропускной тест
          if (unlockCondition.skip_test_id) {
            // Проверяем, пройден ли пропускной тест
            const { data: skipTestProgress } = await supabase
              .from("user_topic_progress")
              .select("score, completed")
              .eq("user_id", userId)
              .eq("subtopic_id", unlockCondition.skip_test_id)
              .eq("completed", true)
              .single();

            if (
              skipTestProgress &&
              skipTestProgress.completed &&
              skipTestProgress.score &&
              unlockCondition.min_score &&
              skipTestProgress.score >= unlockCondition.min_score
            ) {
              return { isUnlocked: true };
            }
          }

          return {
            isUnlocked: false,
            reason: `Требуется завершить темы: ${unlockCondition.required_topics.join(", ")}`,
          };
        }
      }
    }

    // Проверка 2: Минимальный балл (если указан)
    if (unlockCondition.min_score && unlockCondition.min_score > 0) {
      // Получаем средний балл пользователя по предыдущим темам
      const { data: allTopics } = await supabase
        .from("topics")
        .select("id, order_index")
        .lt("order_index", topic.order_index)
        .order("order_index");

      if (allTopics && allTopics.length > 0) {
        const previousTopicIds = allTopics.map((t) => t.id);
        const { data: previousProgress } = await supabase
          .from("user_topic_progress")
          .select("score")
          .eq("user_id", userId)
          .in("topic_id", previousTopicIds)
          .eq("completed", true)
          .is("subtopic_id", null);

        if (previousProgress && previousProgress.length > 0) {
          const avgScore =
            previousProgress.reduce((sum, p) => sum + (p.score || 0), 0) /
            previousProgress.length;

          if (avgScore < unlockCondition.min_score) {
            return {
              isUnlocked: false,
              reason: `Требуется средний балл ${unlockCondition.min_score}%`,
            };
          }
        } else {
          return {
            isUnlocked: false,
            reason: "Требуется завершить предыдущие темы",
          };
        }
      }
    }

    return { isUnlocked: true };
  } catch (error) {
    console.error("Error checking topic unlock:", error);
    return { isUnlocked: false, reason: "Ошибка проверки" };
  }
}

/**
 * Рассчитывает прогресс пользователя по теме
 */
export async function calculateTopicProgress(
  userId: string,
  topicId: string
): Promise<TopicProgress> {
  try {
    // Получаем все подтемы темы
    const { data: subtopics, error: subtopicsError } = await supabase
      .from("subtopics")
      .select("id, is_required")
      .eq("topic_id", topicId)
      .order("order_index");

    if (subtopicsError || !subtopics) {
      return {
        completed: false,
        progressPercent: 0,
        completedSubtopicCount: 0,
        totalSubtopicCount: 0,
        isUnlocked: false,
      };
    }

    const totalSubtopicCount = subtopics.length;
    const requiredSubtopics = subtopics.filter((s) => s.is_required);
    const requiredSubtopicIds = requiredSubtopics.map((s) => s.id);

    // Получаем прогресс пользователя по подтемам
    const { data: progressData, error: progressError } = await supabase
      .from("user_topic_progress")
      .select("subtopic_id, completed")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .in("subtopic_id", subtopics.map((s) => s.id))
      .eq("completed", true);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    const completedSubtopicIds = new Set(
      (progressData || []).map((p) => p.subtopic_id).filter(Boolean)
    );
    const completedSubtopicCount = completedSubtopicIds.size;

    // Проверяем, завершены ли все обязательные подтемы
    const allRequiredCompleted = requiredSubtopicIds.every((id) =>
      completedSubtopicIds.has(id)
    );

    // Рассчитываем процент прогресса
    const progressPercent =
      totalSubtopicCount > 0 ? (completedSubtopicCount / totalSubtopicCount) * 100 : 0;

    // Проверяем разблокировку
    const unlockCheck = await checkTopicUnlock(userId, topicId);

    return {
      completed: allRequiredCompleted && totalSubtopicCount > 0,
      progressPercent,
      completedSubtopicCount,
      totalSubtopicCount,
      isUnlocked: unlockCheck.isUnlocked,
    };
  } catch (error) {
    console.error("Error calculating topic progress:", error);
    return {
      completed: false,
      progressPercent: 0,
      completedSubtopicCount: 0,
      totalSubtopicCount: 0,
      isUnlocked: false,
    };
  }
}

/**
 * Рассчитывает общий прогресс пользователя по всем темам
 */
export async function calculateOverallProgress(
  userId: string
): Promise<{
  totalTopics: number;
  completedTopics: number;
  totalSubtopics: number;
  completedSubtopics: number;
  avgAccuracy: number;
  testSuccessRate: number;
  readinessScore: number;
}> {
  try {
    // Получаем все темы
    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id")
      .order("order_index");

    if (topicsError || !topics) {
      return {
        totalTopics: 0,
        completedTopics: 0,
        totalSubtopics: 0,
        completedSubtopics: 0,
        avgAccuracy: 0,
        testSuccessRate: 0,
        readinessScore: 0,
      };
    }

    const totalTopics = topics.length;
    let completedTopics = 0;
    let totalSubtopics = 0;
    let completedSubtopics = 0;

    // Рассчитываем прогресс по каждой теме
    for (const topic of topics) {
      const progress = await calculateTopicProgress(userId, topic.id);
      if (progress.completed) {
        completedTopics++;
      }
      totalSubtopics += progress.totalSubtopicCount;
      completedSubtopics += progress.completedSubtopicCount;
    }

    // Получаем среднюю точность из user_progress (вопросы)
    const { data: questionProgress } = await supabase
      .from("user_progress")
      .select("is_correct")
      .eq("user_id", userId)
      .eq("is_answered", true);

    const totalAnswered = questionProgress?.length || 0;
    const correctAnswers =
      questionProgress?.filter((p) => p.is_correct === true).length || 0;
    const avgAccuracy = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0;

    // Получаем успешность тестов из game_sessions
    const { data: testSessions } = await supabase
      .from("game_sessions")
      .select("score, total_questions")
      .eq("user_id", userId)
      .or("game_type.eq.test_exam,game_type.eq.test_practice");

    const totalTests = testSessions?.length || 0;
    const successfulTests =
      testSessions?.filter((s) => {
        const scorePercent =
          s.total_questions > 0 ? ((s.score || 0) / s.total_questions) * 100 : 0;
        return scorePercent >= 80; // 80% для успешного теста
      }).length || 0;
    const testSuccessRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

    // Рассчитываем readiness score
    const topicCompletion = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
    const readinessScore =
      avgAccuracy * 0.5 + topicCompletion * 0.3 + testSuccessRate * 0.2;

    return {
      totalTopics,
      completedTopics,
      totalSubtopics,
      completedSubtopics,
      avgAccuracy,
      testSuccessRate,
      readinessScore,
    };
  } catch (error) {
    console.error("Error calculating overall progress:", error);
    return {
      totalTopics: 0,
      completedTopics: 0,
      totalSubtopics: 0,
      completedSubtopics: 0,
      avgAccuracy: 0,
      testSuccessRate: 0,
      readinessScore: 0,
    };
  }
}

