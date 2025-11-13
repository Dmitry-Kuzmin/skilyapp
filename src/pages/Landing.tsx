import { 
  BookOpen, 
  Target, 
  Trophy, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Clock,
  Brain,
  Gamepad2,
  MessageSquare,
  BarChart3,
  Shield,
  PlayCircle,
  Flame,
  Sparkles,
  TrendingUp,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { AuthModal } from "@/components/AuthModal";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [testsCompletedToday, setTestsCompletedToday] = useState(1247);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Анимация счетчика тестов
  useEffect(() => {
    const interval = setInterval(() => {
      setTestsCompletedToday(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fade-in анимация при загрузке
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Intersection Observer для анимаций при скролле
  useEffect(() => {
    const observers = document.querySelectorAll('[data-animate]');
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    }, observerOptions);

    observers.forEach(el => observer.observe(el));
    return () => observers.forEach(el => observer.unobserve(el));
  }, []);

  const stats = [
    {
      value: "97%",
      label: "Процент сдачи",
      icon: Trophy,
      gradient: "from-yellow-400 via-yellow-500 to-yellow-600"
    },
    {
      value: "1000+",
      label: "Вопросов DGT",
      icon: BookOpen,
      gradient: "from-blue-400 via-blue-500 to-blue-600"
    },
    {
      value: "24/7",
      label: "Доступность",
      icon: Clock,
      gradient: "from-green-400 via-green-500 to-green-600"
    }
  ];

  const features = [
    {
      icon: Brain,
      title: "AI помощник",
      description: "Задавайте вопросы и получайте мгновенные ответы на русском и испанском языках",
      gradient: "from-purple-500/10 via-pink-500/10 to-purple-500/10",
      iconGradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Gamepad2,
      title: "Интерактивные игры",
      description: "Изучайте дорожные знаки и правила через увлекательные игры и соревнования",
      gradient: "from-blue-500/10 via-cyan-500/10 to-blue-500/10",
      iconGradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Target,
      title: "Реальные экзамены",
      description: "Практикуйтесь на настоящих экзаменационных вопросах DGT с подробными объяснениями",
      gradient: "from-orange-500/10 via-red-500/10 to-orange-500/10",
      iconGradient: "from-orange-500 to-red-500"
    },
    {
      icon: BarChart3,
      title: "Отслеживание прогресса",
      description: "Видите свой прогресс, статистику и получайте награды за достижения",
      gradient: "from-green-500/10 via-emerald-500/10 to-green-500/10",
      iconGradient: "from-green-500 to-emerald-500"
    },
    {
      icon: MessageSquare,
      title: "Дуэли и соревнования",
      description: "Соревнуйтесь с друзьями в реальном времени и улучшайте свои навыки",
      gradient: "from-indigo-500/10 via-purple-500/10 to-indigo-500/10",
      iconGradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: Shield,
      title: "Безопасность",
      description: "Все данные защищены, доступ через Telegram или email",
      gradient: "from-teal-500/10 via-blue-500/10 to-teal-500/10",
      iconGradient: "from-teal-500 to-blue-500"
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
      className="min-h-screen bg-background relative overflow-hidden"
      style={{ 
        paddingTop: 'calc(var(--sat) + var(--tg-content-safe-area-inset-top, 0px))' 
      }}
    >
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className={`relative overflow-hidden py-16 md:py-24 px-4 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8 md:space-y-10">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
              data-animate
            >
              <Flame className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Лучший способ подготовиться к экзамену DGT
              </span>
            </div>
            
            {/* Main Heading */}
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight"
              data-animate
            >
              <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
                Сдай экзамен DGT
              </span>
              <span className="block mt-2 bg-gradient-to-r from-secondary via-primary to-secondary bg-clip-text text-transparent animate-gradient" style={{ animationDelay: '0.5s' }}>
                с первого раза
              </span>
            </h1>
            
            {/* Subheading */}
            <p 
              className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light"
              data-animate
            >
              Страшно. Скучно. Непонятно. Нет, мы не говорим о новостях. 
              <br className="hidden md:block" />
              Мы говорим об экзамене DGT. 
              <br className="hidden md:block" />
              <strong className="text-foreground font-semibold">А что если есть лучший способ?</strong>
            </p>

            {/* Stats */}
            <div 
              className="flex flex-wrap justify-center gap-4 md:gap-6 py-6"
              data-animate
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={index}
                    className="group relative px-6 py-4 rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-primary/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md group-hover:shadow-lg transition-shadow`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                          {stat.value}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground font-medium">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-time Activity */}
            <div 
              className="inline-flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-br from-card/90 via-card/80 to-card/90 backdrop-blur-md border border-border/50 shadow-xl"
              data-animate
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping absolute" />
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full relative" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Активность сейчас</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                {testsCompletedToday.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>тестов пройдено сегодня</span>
                <span className="text-primary font-semibold">• Высокая активность</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
              data-animate
            >
              <Button 
                size="lg" 
                className="text-lg px-10 py-7 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 group transition-all duration-300 hover:scale-105"
                onClick={() => setAuthModalOpen(true)}
              >
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-7 border-2 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </Button>
            </div>

            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Регистрация не требуется • Без кредитной карты • Начни прямо сейчас
            </p>
          </div>
        </div>
      </section>

      {/* Engaging Learning Section */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="container mx-auto max-w-5xl">
          <div 
            className="text-center space-y-6 mb-16"
            data-animate
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text text-transparent">
              Увлекательное обучение
            </h2>
            <p className="text-2xl md:text-3xl text-muted-foreground font-light">
              Меньше "Ух..." Больше "Ага!"
            </p>
          </div>

          <div 
            className="max-w-3xl mx-auto space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed"
            data-animate
          >
            <p className="font-light">
              <strong className="text-foreground font-semibold">Мы все там были.</strong> Вы пробираетесь через 
              справочник DGT вашего региона. Вы задаетесь вопросом, действительно ли вы что-то изучаете. 
              Вы бы предпочли есть пиццу или гоняться за кошкой по кругу.
            </p>
            <p className="font-light">
              Мы вас не виним!
            </p>
            <p className="font-light">
              В Sdadim мы делаем обучение вождению менее похожим на подготовку к экзамену и более 
              похожим на игру. Никаких плотных справочников. Никаких абстрактных концепций. 
              Только увлекательные практические тесты, интуитивное обучение и легкая для понимания 
              программа, разработанная специально для вас. <strong className="text-foreground font-semibold">Черт, 
              вам даже может понравиться!</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Why Millions Trust */}
      <section className="py-20 md:py-28 px-4 bg-muted/20 relative">
        <div className="container mx-auto max-w-6xl">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Почему тысячи студентов доверяют Sdadim
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Станьте умнее для DGT как можно скорее
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className={`group relative overflow-hidden border-2 transition-all duration-500 hover:scale-105 hover:shadow-2xl bg-gradient-to-br ${feature.gradient} hover:border-primary/50`}
                  data-animate
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 md:p-8 space-y-5">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.iconGradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="container mx-auto max-w-5xl">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Что делает нас особенными
            </h2>
          </div>

          <div className="space-y-12">
            {whyDifferent.map((item, index) => (
              <div 
                key={index}
                className="flex flex-col md:flex-row gap-8 items-start group"
                data-animate
              >
                <div className="flex-shrink-0">
                  <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 bg-clip-text text-transparent group-hover:from-primary/40 group-hover:via-secondary/40 group-hover:to-primary/40 transition-all duration-300">
                    {item.number}
                  </div>
                </div>
                <div className="space-y-3 flex-1 pt-2">
                  <h3 className="text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 px-4 bg-muted/20 relative">
        <div className="container mx-auto max-w-6xl">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Это может быть вы
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Реальные истории реальных людей, которые сдали экзамен с первого раза
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                data-animate
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 md:p-8 space-y-5">
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed">
                    <strong className="text-primary font-semibold">{testimonial.highlight}:</strong> {testimonial.text}
                  </p>
                  <div className="pt-4 border-t border-border/50">
                    <div className="font-bold text-lg">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </div>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div 
              className="space-y-8"
              data-animate
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                Готовься эффективно
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground font-light">
                Наша платформа создана специально для русскоязычных студентов,
                которые готовятся к экзамену DGT в Испании
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-4 group"
                    data-animate
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <span className="text-lg md:text-xl group-hover:text-primary transition-colors duration-300">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card 
              className="p-8 md:p-10 gradient-card border-2 hover:shadow-2xl transition-all duration-500 hover:scale-105 relative overflow-hidden group"
              data-animate
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-secondary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-center w-24 h-24 rounded-3xl gradient-primary mx-auto shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300">
                  <Trophy className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="text-center space-y-5">
                  <h3 className="text-3xl md:text-4xl font-bold">
                    Начни сегодня
                  </h3>
                  <p className="text-muted-foreground text-lg md:text-xl font-light">
                    Присоединяйся к тысячам студентов, которые уже успешно сдали экзамен
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 text-lg py-7 transition-all duration-300 hover:scale-105"
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
      <section className="py-20 md:py-28 px-4 bg-muted/20 relative">
        <div className="container mx-auto max-w-6xl">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Умная практика, лучшие результаты
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Скажите "До свидания" черно-белым справочникам. Скажите "Привет"...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Brain, title: "AI адаптивность", desc: "Становится умнее вместе с вами", gradient: "from-purple-500 to-pink-500" },
              { icon: Target, title: "Высококачественные изображения", desc: "Для более эффективного визуального обучения", gradient: "from-blue-500 to-cyan-500" },
              { icon: Gamepad2, title: "Игровые элементы", desc: "Делают обучение увлекательным", gradient: "from-green-500 to-emerald-500" },
              { icon: TrendingUp, title: "Отслеживание прогресса", desc: "Показывает, насколько вы круты", gradient: "from-orange-500 to-red-500" }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={index}
                  className="p-6 md:p-8 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50 group"
                  data-animate
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-0 space-y-4">
                    <div className="flex justify-center">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg md:text-xl group-hover:text-primary transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="container mx-auto max-w-4xl text-center space-y-10 relative z-10">
          <h2 
            className="text-4xl md:text-5xl lg:text-6xl font-bold"
            data-animate
          >
            Готов начать свой путь к успеху?
          </h2>
          <p 
            className="text-xl md:text-2xl text-muted-foreground font-light"
            data-animate
          >
            Создай аккаунт за 30 секунд и начни подготовку уже сегодня
          </p>
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            data-animate
          >
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
              onClick={() => setAuthModalOpen(true)}
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-10 py-7 border-2 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              onClick={() => setAuthModalOpen(true)}
            >
              Войти в аккаунт
            </Button>
          </div>
          <p 
            className="text-sm text-muted-foreground flex items-center justify-center gap-2"
            data-animate
          >
            <CheckCircle2 className="w-4 h-4" />
            Регистрация не требуется • Без кредитной карты • Начни прямо сейчас
          </p>
        </div>
      </section>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Landing;
