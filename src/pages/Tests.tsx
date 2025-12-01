import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopics } from "@/hooks/useTopics";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useChallengeBankCount } from "@/hooks/useChallengeBankCount";

// Views
import { BentoTestsView } from "@/components/tests/views/BentoTestsView";

// --- Types ---
type Topic = {
  id: string;
  number: number;
  name: string;
  questions: number;
  cover_image?: string;
  gradient_from?: string;
  gradient_to?: string;
  is_premium?: boolean;
};

const Tests = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { language, t } = useLanguage();

  // ОПТИМИЗАЦИЯ: Используем React Query хуки вместо прямых запросов
  const { data: dbTopics = [], isLoading: topicsLoading } = useTopics();
  const { data: userProgress = [] } = useUserProgress(profileId);
  const { data: challengeBankCount = 0 } = useChallengeBankCount(profileId);

  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const loading = topicsLoading;

  // ОПТИМИЗАЦИЯ: Вычисляем topics с локализацией через useMemo
  const topics = useMemo(() => {
    return dbTopics.map((topic) => {
      // Выбираем название темы в зависимости от языка
      let topicName = "";
      if (language === "es") {
        topicName = topic.title_es || topic.title_ru || `Tema ${topic.number}`;
      } else if (language === "en") {
        topicName = topic.title_en || topic.title_es || topic.title_ru || `Topic ${topic.number}`;
      } else {
        topicName = topic.title_ru || `Тема ${topic.number}`;
      }

      return {
        id: topic.id,
        number: topic.number,
        name: topicName,
        questions: 40, // Placeholder
        cover_image: topic.cover_image,
        gradient_from: topic.gradient_from,
        gradient_to: topic.gradient_to,
        is_premium: topic.is_premium || false,
      };
    });
  }, [dbTopics, language]);

  // ОПТИМИЗАЦИЯ: Вычисляем stats через useMemo
  const stats = useMemo(() => {
    const totalAnswered = userProgress.length;
    const correct = userProgress.filter((item) => item.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;
    const errors = totalAnswered - correct;

    return {
      accuracy,
      completed: 0, // Не используется в текущей версии
      correct,
      errors,
      totalAnswered,
      averageScore: 0, // Не используется в текущей версии
    };
  }, [userProgress]);

  const handleStartTest = (path: string) => {
    navigate(path);
  };

  const handleTopicClick = (topicId: string) => {
    // Открываем тест по теме, а не учебник
    handleStartTest(`/test/practice?topic=${topicId}&count=30`);
  };

  return (
    <Layout>
      <BentoTestsView
        topics={topics}
        stats={stats}
        challengeBankCount={challengeBankCount}
        randomQuestionCount={randomQuestionCount}
        setRandomQuestionCount={setRandomQuestionCount}
        handleStartTest={handleStartTest}
        handleTopicClick={handleTopicClick}
        t={t}
      />
    </Layout>
  );
};

export default Tests;
