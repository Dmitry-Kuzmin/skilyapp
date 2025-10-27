import { BookOpen, Target, Trophy, Zap, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Интерактивное обучение",
      description: "Изучайте дорожные знаки и правила с помощью игр и тестов",
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Реальные экзамены DGT",
      description: "Практикуйтесь на настоящих экзаменационных вопросах",
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "Система достижений",
      description: "Отслеживайте прогресс и получайте награды за успехи",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI помощник",
      description: "Задавайте вопросы и получайте мгновенные ответы",
    },
  ];

  const benefits = [
    "Более 1000 вопросов из реальных экзаменов DGT",
    "Интерактивные игры для лучшего запоминания",
    "Словарь терминов на русском и испанском",
    "Отслеживание прогресса и статистики",
    "Ежедневные задания и бонусы",
    "Доступно в Telegram и веб-версии",
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-background -z-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Лучший способ подготовиться к экзамену DGT</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
              Сдай экзамен DGT<br />с первого раза
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Интерактивная платформа для изучения правил дорожного движения в Испании
              с AI помощником, играми и реальными экзаменационными вопросами
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-primary group"
                onClick={() => setAuthModalOpen(true)}
              >
                Начать бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">
              Почему выбирают Sdadim?
            </h2>
            <p className="text-xl text-muted-foreground">
              Все что нужно для успешной сдачи экзамена в одном месте
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 gradient-card hover:scale-105 transition-transform">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl gradient-primary mb-4">
                  <div className="text-primary-foreground">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Готовься эффективно
              </h2>
              <p className="text-xl text-muted-foreground">
                Наша платформа создана специально для русскоязычных студентов,
                которые готовятся к экзамену DGT в Испании
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="p-8 gradient-card">
              <div className="space-y-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mx-auto">
                  <Trophy className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-bold">
                    Начни сегодня
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    Присоединяйся к тысячам студентов, которые уже успешно сдали экзамен
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full shadow-primary"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Зарегистрироваться бесплатно
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Не требуется кредитная карта
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-secondary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Готов начать свой путь к успеху?
          </h2>
          <p className="text-xl text-muted-foreground">
            Создай аккаунт за 30 секунд и начни подготовку уже сегодня
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 shadow-primary"
            onClick={() => setAuthModalOpen(true)}
          >
            Начать бесплатно
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Landing;