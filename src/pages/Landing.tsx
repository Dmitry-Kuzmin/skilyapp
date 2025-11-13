import { 
  BookOpen, 
  Target, 
  Trophy, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Users,
  TrendingUp,
  Clock,
  Brain,
  Gamepad2,
  MessageSquare,
  Award,
  PlayCircle,
  Sparkles,
  Flame,
  BarChart3,
  Shield,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { AuthModal } from "@/components/AuthModal";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [testsCompletedToday, setTestsCompletedToday] = useState(0);
  const [activityLevel, setActivityLevel] = useState<'high' | 'medium' | 'low'>('high');

  // Анимация счетчика тестов
  useEffect(() => {
    const interval = setInterval(() => {
      setTestsCompletedToday(prev => {
        const increment = Math.floor(Math.random() * 3) + 1;
        return prev + increment;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      value: "97%",
      label: "Процент сдачи",
      icon: <Trophy className="w-6 h-6" />,
      color: "text-yellow-500"
    },
    {
      value: "1000+",
      label: "Вопросов DGT",
      icon: <BookOpen className="w-6 h-6" />,
      color: "text-blue-500"
    },
    {
      value: "24/7",
      label: "Доступность",
      icon: <Clock className="w-6 h-6" />,
      color: "text-green-500"
    }
  ];

  const features = [
    {
      icon: <Brain className="w-10 h-10" />,
      title: "AI помощник",
      description: "Задавайте вопросы и получайте мгновенные ответы на русском и испанском языках",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: <Gamepad2 className="w-10 h-10" />,
      title: "Интерактивные игры",
      description: "Изучайте дорожные знаки и правила через увлекательные игры и соревнования",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: <Target className="w-10 h-10" />,
      title: "Реальные экзамены",
      description: "Практикуйтесь на настоящих экзаменационных вопросах DGT с подробными объяснениями",
      gradient: "from-orange-500/20 to-red-500/20"
    },
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Отслеживание прогресса",
      description: "Видите свой прогресс, статистику и получайте награды за достижения",
      gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "Дуэли и соревнования",
      description: "Соревнуйтесь с друзьями в реальном времени и улучшайте свои навыки",
      gradient: "from-indigo-500/20 to-purple-500/20"
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Безопасность",
      description: "Все данные защищены, доступ через Telegram или email",
      gradient: "from-teal-500/20 to-blue-500/20"
    }
  ];

  const benefits = [
    "Более 1000 вопросов из реальных экзаменов DGT",
    "Интерактивные игры для лучшего запоминания",
    "Словарь терминов на русском и испанском",
    "Отслеживание прогресса и статистики",
    "Ежедневные задания и бонусы",
    "Доступно в Telegram и веб-версии",
    "AI помощник для объяснения сложных тем",
    "Дуэли с друзьями для мотивации"
  ];

  const testimonials = [
    {
      name: "Мария Г.",
      location: "Мадрид",
      text: "Сдала экзамен DGT с первого раза! Практика на реальных вопросах помогла мне чувствовать себя уверенно.",
      rating: 5,
      highlight: "Сдала с первого раза"
    },
    {
      name: "Алексей К.",
      location: "Барселона",
      text: "AI помощник объяснил все сложные моменты на русском языке. Очень удобно для тех, кто только начинает изучать испанский.",
      rating: 5,
      highlight: "AI помощник"
    },
    {
      name: "Елена С.",
      location: "Валенсия",
      text: "Игры делают обучение интересным. Особенно понравились дуэли с друзьями - отличная мотивация!",
      rating: 5,
      highlight: "Интересные игры"
    },
    {
      name: "Дмитрий Р.",
      location: "Севилья",
      text: "Прошел все тесты за неделю и сдал экзамен на 95%. Система действительно работает!",
      rating: 5,
      highlight: "95% результат"
    }
  ];

  const whyDifferent = [
    {
      number: "01",
      title: "Не будет скучно",
      description: "Мы верим, что обучение должно быть увлекательным. Наши игры и интерактивные элементы делают подготовку к экзамену интересной."
    },
    {
      number: "02",
      title: "Не потратите время зря",
      description: "Все тесты адаптированы под реальные экзамены DGT. Challenge Bank автоматически повторяет пропущенные вопросы до полного усвоения."
    },
    {
      number: "03",
      title: "Реально выучите материал",
      description: "Все разработано с учетом когнитивной науки и понимания того, как люди действительно учатся. AI помощник объясняет сложные моменты."
    }
  ];

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ 
        paddingTop: 'calc(var(--sat) + var(--tg-content-safe-area-inset-top, 0px))' 
      }}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-background -z-10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6 md:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Flame className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">Лучший способ подготовиться к экзамену DGT</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
              Сдай экзамен DGT<br />
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                с первого раза
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Страшно. Скучно. Непонятно. Нет, мы не говорим о новостях. 
              Мы говорим об экзамене DGT. 
              <br className="hidden md:block" />
              <strong className="text-foreground">А что если есть лучший способ?</strong>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 py-6">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/50 backdrop-blur-sm border">
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time Activity */}
            <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-muted/50 backdrop-blur-sm border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Активность сейчас</span>
              </div>
              <div className="text-2xl font-bold">
                {testsCompletedToday} <span className="text-base font-normal text-muted-foreground">тестов пройдено сегодня</span>
              </div>
              <div className="text-xs text-muted-foreground">
                🔥 Пиковая активность: <strong>Высокая</strong>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-lg shadow-primary/50 group hover:scale-105 transition-transform"
                onClick={() => setAuthModalOpen(true)}
              >
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 border-2 hover:bg-muted/50"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Регистрация не требуется • Без кредитной карты • Начни прямо сейчас
            </p>
          </div>
        </div>
      </section>

      {/* Engaging Learning Section */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Увлекательное обучение
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Меньше "Ух..." Больше "Ага!"
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Мы все там были.</strong> Вы пробираетесь через 
              справочник DGT вашего региона. Вы задаетесь вопросом, действительно ли вы что-то изучаете. 
              Вы бы предпочли есть пиццу или гоняться за кошкой по кругу.
            </p>
            <p>
              Мы вас не виним!
            </p>
            <p>
              В Sdadim мы делаем обучение вождению менее похожим на подготовку к экзамену и более 
              похожим на игру. Никаких плотных справочников. Никаких абстрактных концепций. 
              Только увлекательные практические тесты, интуитивное обучение и легкая для понимания 
              программа, разработанная специально для вас. <strong className="text-foreground">Черт, 
              вам даже может понравиться!</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Why Millions Trust */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Почему тысячи студентов доверяют Sdadim
            </h2>
            <p className="text-xl text-muted-foreground">
              Станьте умнее для DGT как можно скорее
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`p-6 hover:scale-105 transition-all duration-300 border-2 bg-gradient-to-br ${feature.gradient} hover:shadow-xl`}
              >
                <CardContent className="p-0 space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Что делает нас особенными
            </h2>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {whyDifferent.map((item, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="text-4xl md:text-5xl font-bold text-primary/30 flex-shrink-0">
                  {item.number}
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-2xl md:text-3xl font-bold">{item.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Это может быть вы
            </h2>
            <p className="text-xl text-muted-foreground">
              Реальные истории реальных людей, которые сдали экзамен с первого раза
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0 space-y-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed">
                    <strong className="text-primary">{testimonial.highlight}:</strong> {testimonial.text}
                  </p>
                  <div className="pt-4 border-t">
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
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
            
            <Card className="p-8 gradient-card border-2 hover:shadow-xl transition-shadow">
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
                    className="w-full shadow-lg shadow-primary/50 text-lg py-6"
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

      {/* Smarter Practice Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Умная практика, лучшие результаты
            </h2>
            <p className="text-xl text-muted-foreground">
              Скажите "До свидания" черно-белым справочникам. Скажите "Привет"...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg">AI адаптивность</h3>
                <p className="text-sm text-muted-foreground">
                  Становится умнее вместе с вами
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg">Высококачественные изображения</h3>
                <p className="text-sm text-muted-foreground">
                  Для более эффективного визуального обучения
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <PlayCircle className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg">Игровые элементы</h3>
                <p className="text-sm text-muted-foreground">
                  Делают обучение увлекательным
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 text-center hover:scale-105 transition-transform">
              <CardContent className="p-0 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg">Отслеживание прогресса</h3>
                <p className="text-sm text-muted-foreground">
                  Показывает, насколько вы круты
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-secondary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Готов начать свой путь к успеху?
          </h2>
          <p className="text-xl text-muted-foreground">
            Создай аккаунт за 30 секунд и начни подготовку уже сегодня
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 shadow-lg shadow-primary/50 hover:scale-105 transition-transform"
              onClick={() => setAuthModalOpen(true)}
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2"
              onClick={() => setAuthModalOpen(true)}
            >
              Войти в аккаунт
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Регистрация не требуется • Без кредитной карты • Начни прямо сейчас
          </p>
        </div>
      </section>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Landing;
