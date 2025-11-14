import { BookOpen, SignpostBig, Languages, Video, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";

const Learning = () => {
  const navigate = useNavigate();

  const learningModules = [
    {
      id: 1,
      title: "Экзамены DGT",
      description: "4000+ реальных вопросов для категорий A1, B, D с AI подсказками",
      icon: Car,
      progress: 0,
      topics: 4012,
      color: "primary",
      path: "/dgt-tests",
      badge: "Новое",
    },
    {
      id: 2,
      title: "Учебные материалы",
      description: "Структурированный курс ПДД Испании на русском языке",
      icon: BookOpen,
      progress: 45,
      topics: 12,
      color: "primary",
      path: "/tests",
    },
    {
      id: 3,
      title: "Дорожные знаки",
      description: "Полный каталог испанских дорожных знаков с объяснениями",
      icon: SignpostBig,
      progress: 68,
      topics: 89,
      color: "secondary",
      path: "/road-signs",
    },
    {
      id: 4,
      title: "Словарь терминов",
      description: "Изучай испанские термины ПДД с переводом",
      icon: Languages,
      progress: 23,
      topics: 156,
      color: "success",
      path: "/dictionary",
    },
    {
      id: 5,
      title: "Видеокурс",
      description: "Эксклюзивные видеоуроки по ПДД",
      icon: Video,
      progress: 0,
      topics: 24,
      color: "gold",
      premium: true,
    },
  ];

  const recentTopics = [
    { id: 1, title: "Ограничения скорости", category: "Скорость", completed: true },
    { id: 2, title: "Приоритет проезда", category: "Приоритеты", completed: true },
    { id: 3, title: "Знаки запрета", category: "Знаки", completed: false },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Обучение</h1>
          <p className="text-muted-foreground text-lg">
            Изучай материалы в удобном формате
          </p>
        </div>

        {/* Learning Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {learningModules.map((module) => (
            <Card
              key={module.id}
              className="p-6 gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer group relative overflow-hidden"
            >
              {module.premium && (
                <Badge className="absolute top-4 right-4 gradient-gold border-none">
                  Premium
                </Badge>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-${module.color}/20`}>
                    <module.icon className={`w-7 h-7 text-${module.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {module.topics} тем доступно
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground">{module.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span className="font-semibold text-primary">{module.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${module.color} transition-all duration-500`}
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                </div>

                <Button
                  variant={module.premium ? "gold" : "default"}
                  className="w-full"
                  size="lg"
                  onClick={() => module.path && navigate(module.path)}
                  disabled={module.premium}
                >
                  {module.premium ? "Разблокировать" : "Продолжить"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Topics */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Недавно изученные</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTopics.map((topic) => (
              <Card
                key={topic.id}
                className="p-4 gradient-card border-border/50 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{topic.title}</h4>
                    <p className="text-xs text-muted-foreground">{topic.category}</p>
                  </div>
                  {topic.completed && (
                    <Badge variant="outline" className="bg-success/20 text-success border-success/50">
                      ✓
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Study Tips */}
        <Card className="p-6 gradient-card border-primary/30">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shrink-0">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">💡 Совет дня</h3>
              <p className="text-muted-foreground">
                Изучай материалы регулярно, по 20-30 минут в день. Это гораздо эффективнее,
                чем длинные сессии раз в неделю!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Learning;
