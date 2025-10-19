import { Clock, Target, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";

const Tests = () => {
  const testModes = [
    {
      id: 1,
      title: "Экзаменационный режим",
      description: "Полная симуляция реального экзамена DGT",
      icon: Target,
      features: ["30 вопросов", "30 минут", "Максимум 3 ошибки"],
      color: "primary",
      gradient: "gradient-primary",
    },
    {
      id: 2,
      title: "Практический режим",
      description: "Учись в своём темпе с подсказками",
      icon: BookOpen,
      features: ["Без ограничений", "Объяснения", "Прогресс сохраняется"],
      color: "secondary",
      gradient: "bg-secondary",
    },
  ];

  const testCategories = [
    { name: "Скорость", questions: 45, icon: Zap },
    { name: "Алкоголь", questions: 32, icon: Target },
    { name: "Дорожные знаки", questions: 89, icon: Target },
    { name: "Светофоры", questions: 28, icon: Target },
    { name: "Приоритеты", questions: 56, icon: Target },
    { name: "Обгоны", questions: 41, icon: Target },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Тесты DGT</h1>
          <p className="text-muted-foreground text-lg">
            Выбери режим и начни подготовку к экзамену
          </p>
        </div>

        {/* Test Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testModes.map((mode) => (
            <Card
              key={mode.id}
              className="p-8 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex items-center justify-center w-16 h-16 rounded-xl ${mode.gradient} shadow-glow`}
                  >
                    <mode.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                    Популярно
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-muted-foreground">{mode.description}</p>
                </div>

                <div className="space-y-2">
                  {mode.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full shadow-primary group-hover:shadow-glow"
                  size="lg"
                >
                  Начать тест
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Test Categories */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Тесты по темам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testCategories.map((category, index) => (
              <Card
                key={index}
                className="p-4 gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {category.questions} вопросов
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <Card className="p-6 gradient-card border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">87%</p>
              <p className="text-sm text-muted-foreground mt-1">Точность</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">12</p>
              <p className="text-sm text-muted-foreground mt-1">Пройдено</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold">245</p>
              <p className="text-sm text-muted-foreground mt-1">Правильных</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">37</p>
              <p className="text-sm text-muted-foreground mt-1">Ошибок</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Tests;
