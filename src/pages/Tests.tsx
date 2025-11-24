import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "next-themes";

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

  // State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState({
    accuracy: 0,
    completed: 0,
    correct: 0,
    errors: 0,
    totalAnswered: 0,
    averageScore: 0
  });
  const [challengeBankCount, setChallengeBankCount] = useState(0);
  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        loadTopics(),
        isAuthenticated && profileId ? loadStats() : Promise.resolve(),
        isAuthenticated && profileId ? loadChallengeBankCount() : Promise.resolve()
      ]);
      setLoading(false);
    };
    init();
  }, [isAuthenticated, profileId]);

  const loadTopics = async () => {
    try {
      const { data: dbTopics, error } = await supabase
        .from("topics")
        .select(`
          id, number, title_ru, cover_image, 
          gradient_from, gradient_to, is_premium
        `)
        .order('number');

      if (error) throw error;

      const topicsWithCounts = (dbTopics || []).map(topic => ({
        id: topic.id,
        number: topic.number,
        name: topic.title_ru || `Тема ${topic.number}`,
        questions: 40, // Placeholder
        cover_image: topic.cover_image,
        gradient_from: topic.gradient_from,
        gradient_to: topic.gradient_to,
        is_premium: topic.is_premium || false,
      }));

      setTopics(topicsWithCounts);
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const loadStats = async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase
        .from("user_progress")
        .select("is_correct")
        .eq("user_id", profileId);

      const totalAnswered = data?.length || 0;
      const correct = data?.filter((item) => item.is_correct).length || 0;
      const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;
      const errors = totalAnswered - correct;

      setStats(prev => ({ ...prev, totalAnswered, correct, accuracy, errors }));
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadChallengeBankCount = async () => {
    if (!profileId) return;
    try {
      // @ts-ignore
      const { count } = await supabase
        .from('user_challenge_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('mastered', false);

      setChallengeBankCount(count || 0);
    } catch (error) {
      console.error("Error loading challenge bank:", error);
    }
  };

  const handleStartTest = (path: string) => {
    navigate(path);
  };

  const handleTopicClick = (topicId: string) => {
    navigate(`/topic/${topicId}`);
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
      />
    </Layout>
  );
};

export default Tests;
