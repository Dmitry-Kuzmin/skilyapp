import { Target, Zap, Trophy, Gift, BookOpen, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import RankProgress from "@/components/RankProgress";
import StatsCard from "@/components/StatsCard";
import AchievementCard from "@/components/AchievementCard";
import { AISearchWidget } from "@/components/AISearchWidget";
import { useUserContext } from "@/contexts/UserContext";
import Landing from "./Landing";

const Index = () => {
  const { isAuthenticated } = useUserContext();

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }
  // Mock data - будет заменено на реальные данные
  const userStats = {
    rank: "Ученик",
    xp: 2450,
    nextRankXP: 5000,
    coins: 850,
    testsCompleted: 12,
    accuracy: 87,
    streak: 5,
  };

  const dailyTasks = [
    { id: 1, title: "Пройти 10 вопросов", progress: 7, max: 10, reward: 50 },
    { id: 2, title: "Изучить 5 новых терминов", progress: 3, max: 5, reward: 30 },
    { id: 3, title: "Сыграть в любую игру", progress: 0, max: 1, reward: 40 },
  ];

  const recentAchievements = [
    {
      id: 1,
      title: "Первые шаги",
      description: "Пройдите первый тест",
      unlocked: true,
    },
    {
      id: 2,
      title: "Снайпер знаков",
      description: "Выучите 50 дорожных знаков без ошибок",
      unlocked: false,
      progress: 23,
      maxProgress: 50,
    },
    {
      id: 3,
      title: "Безошибочный водитель",
      description: "Пройдите 20 тестов без ошибок",
      unlocked: false,
      progress: 3,
      maxProgress: 20,
    },
    {
      id: 4,
      title: "Марафонец",
      description: "Учитесь 7 дней подряд",
      unlocked: false,
      progress: 5,
      maxProgress: 7,
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse-slow">
            Добро пожаловать в Sdadim!
          </h1>
          <p className="text-muted-foreground text-lg">
            Готовься к экзамену DGT с удовольствием
          </p>
        </div>

        {/* AI Search Widget */}
        <AISearchWidget />

        {/* Rank Progress */}
        <RankProgress
          currentRank={userStats.rank}
          currentXP={userStats.xp}
          nextRankXP={userStats.nextRankXP}
          coins={userStats.coins}
        />

        {/* Daily Bonus */}
        <Card className="p-6 gradient-card border-gold/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl gradient-gold animate-pulse-slow">
                <Gift className="w-8 h-8 text-gold-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Ежедневный бонус</h3>
                <p className="text-sm text-muted-foreground">
                  Заходи каждый день и получай награды!
                </p>
              </div>
            </div>
            <Button variant="gold" size="lg" className="shadow-glow">
              <Zap className="w-5 h-5" />
              Получить
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            icon={<Target className="w-6 h-6 text-primary-foreground" />}
            label="Точность"
            value={`${userStats.accuracy}%`}
            trend="+3% за неделю"
          />
          <StatsCard
            icon={<BookOpen className="w-6 h-6 text-primary-foreground" />}
            label="Тестов пройдено"
            value={userStats.testsCompleted}
            trend="+2 за сегодня"
          />
          <StatsCard
            icon={<Clock className="w-6 h-6 text-primary-foreground" />}
            label="Серия дней"
            value={`${userStats.streak} дней`}
            trend="Продолжай!"
          />
        </div>

        {/* Daily Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Ежедневные задания</h2>
            <span className="text-sm text-muted-foreground">
              {dailyTasks.filter(t => t.progress >= t.max).length} / {dailyTasks.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dailyTasks.map((task) => {
              const isCompleted = task.progress >= task.max;
              const progressPercent = (task.progress / task.max) * 100;

              return (
                <Card
                  key={task.id}
                  className={`p-4 gradient-card border transition-all duration-300 hover:scale-105 ${
                    isCompleted ? "border-success/50" : "border-border/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold">{task.title}</h4>
                      {isCompleted && (
                        <Trophy className="w-5 h-5 text-success animate-bounce-slow" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {task.progress} / {task.max}
                        </span>
                        <span className="text-gold font-semibold">+{task.reward} 💰</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? "bg-success" : "gradient-primary"
                          }`}
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Continue Learning */}
        <Card className="p-6 gradient-card border-primary/30 hover:border-primary/50 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                Продолжить обучение
              </h3>
              <p className="text-muted-foreground">
                Тест: Скорость и дистанция • Вопрос 7/30
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden w-64">
                <div className="h-full gradient-primary w-1/4" />
              </div>
            </div>
            <Button size="lg" className="shadow-primary">
              Продолжить
            </Button>
          </div>
        </Card>

        {/* Achievements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Достижения</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/achievements">Все достижения →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} {...achievement} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
