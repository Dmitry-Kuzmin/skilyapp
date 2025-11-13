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
  TrendingUp,
  Zap,
  Sparkles,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Rocket,
  Lightbulb,
  Heart,
  Smile,
  ThumbsUp,
  GraduationCap,
  BookMarked,
  Timer,
  Medal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { AuthModal } from "@/components/AuthModal";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [testsCompletedToday, setTestsCompletedToday] = useState(1247);
  const [isVisible, setIsVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
      gradient: "from-yellow-400 via-yellow-500 to-yellow-600",
      delay: "0ms",
      description: "Студентов сдают с первого раза"
    },
    {
      value: "1000+",
      label: "Вопросов DGT",
      icon: BookOpen,
      gradient: "from-blue-400 via-blue-500 to-blue-600",
      delay: "100ms",
      description: "Из реальных экзаменов"
    },
    {
      value: "24/7",
      label: "Доступность",
      icon: Clock,
      gradient: "from-green-400 via-green-500 to-green-600",
      delay: "200ms",
      description: "Учись когда удобно"
    }
  ];

  const features = [
    {
      icon: Brain,
      title: "AI помощник",
      description: "Задавайте вопросы и получайте мгновенные ответы на русском и испанском языках",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 via-pink-500/5 to-purple-500/10"
    },
    {
      icon: Gamepad2,
      title: "Интерактивные игры",
      description: "Изучайте дорожные знаки и правила через увлекательные игры и соревнования",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 via-cyan-500/5 to-blue-500/10"
    },
    {
      icon: Target,
      title: "Реальные экзамены",
      description: "Практикуйтесь на настоящих экзаменационных вопросах DGT с подробными объяснениями",
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 via-red-500/5 to-orange-500/10"
    },
    {
      icon: BarChart3,
      title: "Отслеживание прогресса",
      description: "Видите свой прогресс, статистику и получайте награды за достижения",
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 via-emerald-500/5 to-green-500/10"
    },
    {
      icon: MessageSquare,
      title: "Дуэли и соревнования",
      description: "Соревнуйтесь с друзьями в реальном времени и улучшайте свои навыки",
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-500/10 via-purple-500/5 to-indigo-500/10"
    },
    {
      icon: Shield,
      title: "Безопасность",
      description: "Все данные защищены, доступ через Telegram или email",
      gradient: "from-teal-500 to-blue-500",
      bgGradient: "from-teal-500/10 via-blue-500/5 to-teal-500/10"
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
      highlight: "Сдала с первого раза",
      avatar: "👩‍🦰"
    },
    {
      name: "Алексей К.",
      location: "Барселона",
      text: "AI помощник объяснил все сложные моменты на русском языке. Очень удобно для тех, кто только начинает изучать испанский.",
      rating: 5,
      highlight: "AI помощник",
      avatar: "👨‍💼"
    },
    {
      name: "Елена С.",
      location: "Валенсия",
      text: "Игры делают обучение интересным. Особенно понравились дуэли с друзьями - отличная мотивация!",
      rating: 5,
      highlight: "Интересные игры",
      avatar: "👩‍🎓"
    },
    {
      name: "Дмитрий Р.",
      location: "Севилья",
      text: "Прошел все тесты за неделю и сдал экзамен на 95%. Система действительно работает!",
      rating: 5,
      highlight: "95% результат",
      avatar: "👨‍🔧"
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

  const comparisonData = [
    { feature: "Вопросы из реальных экзаменов", sdadim: true, others: false },
    { feature: "AI помощник на русском", sdadim: true, others: false },
    { feature: "Интерактивные игры", sdadim: true, others: false },
    { feature: "Дуэли с друзьями", sdadim: true, others: false },
    { feature: "Отслеживание прогресса", sdadim: true, others: true },
    { feature: "Бесплатный доступ", sdadim: true, others: false },
  ];

  const faqData = [
    {
      question: "Сколько стоит использование платформы?",
      answer: "Базовый доступ полностью бесплатный! Вы можете проходить тесты, использовать AI помощника и играть в игры без ограничений. Premium подписка открывает дополнительные функции."
    },
    {
      question: "Действительно ли вопросы из реальных экзаменов DGT?",
      answer: "Да! Все наши вопросы взяты из официальных экзаменов DGT и регулярно обновляются. Мы следим за изменениями в правилах и добавляем новые вопросы."
    },
    {
      question: "Можно ли использовать на телефоне?",
      answer: "Конечно! Платформа полностью адаптирована для мобильных устройств и доступна как веб-версия, так и через Telegram Mini App."
    },
    {
      question: "Как работает AI помощник?",
      answer: "AI помощник использует передовые технологии для объяснения сложных тем на русском и испанском языках. Вы можете задавать вопросы в любой момент во время обучения."
    },
    {
      question: "Нужна ли регистрация?",
      answer: "Для базового доступа регистрация не обязательна, но мы рекомендуем создать аккаунт для сохранения прогресса и доступа ко всем функциям."
    }
  ];

  const steps = [
    {
      icon: Rocket,
      title: "Зарегистрируйся",
      description: "Создай аккаунт за 30 секунд через Telegram или email"
    },
    {
      icon: BookMarked,
      title: "Выбери тему",
      description: "Начни с любой темы или пройди диагностический тест"
    },
    {
      icon: Target,
      title: "Практикуйся",
      description: "Решай тесты, играй в игры, задавай вопросы AI"
    },
    {
      icon: Medal,
      title: "Сдай экзамен",
      description: "Готовься до уверенности и сдавай DGT с первого раза"
    }
  ];

  return (
    <div 
      className="min-h-screen bg-background relative overflow-hidden"
      style={{ 
        paddingTop: 'calc(var(--sat) + var(--tg-content-safe-area-inset-top, 0px))' 
      }}
    >
      {/* Декоративные элементы фона - профессиональный подход */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Основной градиентный фон */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3" />
        
        {/* Декоративные орбы */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/4 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-secondary/4 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-primary/2 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '3s' }} />
        
        {/* Сетка паттерн для глубины */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Hero Section - Первое впечатление */}
      <section 
        ref={heroRef}
        className={`relative overflow-hidden section-spacing-lg px-4 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="container-landing">
          <div className="text-center space-y-8 md:space-y-12 max-w-5xl mx-auto">
            {/* Badge - Trust Signal */}
            <div 
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card/80 backdrop-blur-md border border-primary/20 shadow-lg transition-all duration-500 hover:scale-105 hover:border-primary/40 hover:shadow-xl"
              data-animate
            >
              <div className="relative">
                <Flame className="w-4 h-4 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-ping" />
              </div>
              <span className="text-sm font-semibold gradient-text">
                Лучший способ подготовиться к экзамену DGT
              </span>
            </div>
            
            {/* Main Heading - Hero Typography */}
            <h1 
              className="text-hero gradient-text animate-gradient"
              data-animate
            >
              <span className="block">Сдай экзамен DGT</span>
              <span className="block mt-2 md:mt-4">с первого раза</span>
            </h1>
            
            {/* Subheading - Value Proposition */}
            <p 
              className="text-body-lg text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed"
              data-animate
            >
              Страшно. Скучно. Непонятно. Нет, мы не говорим о новостях.
              <br className="hidden md:block" />
              Мы говорим об экзамене DGT.
              <br className="hidden md:block" />
              <strong className="text-foreground font-semibold">А что если есть лучший способ?</strong>
            </p>

            {/* Stats - Social Proof */}
            <div 
              className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 py-6"
              data-animate
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className="group relative overflow-hidden card-elevated border-2 hover:border-primary/50 bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm"
                    style={{ animationDelay: stat.delay }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                            {stat.value}
                          </div>
                          <div className="text-sm font-semibold text-muted-foreground mb-1">
                            {stat.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stat.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Real-time Activity - FOMO Element */}
            <div 
              className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-card/90 backdrop-blur-md border border-border/50 shadow-xl"
              data-animate
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping absolute" />
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full relative" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Активность сейчас</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                {testsCompletedToday.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>тестов пройдено сегодня</span>
                <span className="text-primary font-semibold">• Высокая активность</span>
              </div>
            </div>
            
            {/* CTA Buttons - Primary Action */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
              data-animate
            >
              <Button 
                size="lg" 
                className="btn-hero group"
                onClick={() => setAuthModalOpen(true)}
              >
                Попробовать бесплатно
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-10 py-7 text-lg border-2 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                onClick={() => setAuthModalOpen(true)}
              >
                Войти
              </Button>
            </div>

            {/* Trust Indicators */}
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Регистрация не требуется
              <span className="text-border">•</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
              Без кредитной карты
              <span className="text-border">•</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
              Начни прямо сейчас
            </p>
          </div>
        </div>
      </section>

      {/* How It Works - Timeline Block */}
      <section className="section-spacing px-4 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Как это работает
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Всего 4 простых шага до успешной сдачи экзамена
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden card-elevated border-2 hover:border-primary/50"
                  data-animate
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <CardContent className="p-6 md:p-8 space-y-4 text-center">
                    <div className="relative">
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300`}>
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table - Unique Block */}
      <section className="section-spacing px-4 bg-muted/20 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Почему выбирают Sdadim
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Сравните с другими платформами
            </p>
          </div>

          <Card className="card-elevated border-2 overflow-hidden" data-animate>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left p-6 font-bold text-lg">Функция</th>
                      <th className="text-center p-6 font-bold text-lg gradient-text">Sdadim</th>
                      <th className="text-center p-6 font-semibold text-muted-foreground">Другие платформы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr 
                        key={index}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-200"
                      >
                        <td className="p-6 font-medium">{row.feature}</td>
                        <td className="p-6 text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          {row.others ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                              <X className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Engaging Learning Section */}
      <section className="section-spacing px-4 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-6 mb-16 max-w-4xl mx-auto"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Увлекательное обучение
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Меньше "Ух..." Больше "Ага!"
            </p>
          </div>

          <div 
            className="max-w-3xl mx-auto space-y-6 text-body-lg text-muted-foreground leading-relaxed font-light"
            data-animate
          >
            <p>
              <strong className="text-foreground font-semibold">Мы все там были.</strong> Вы пробираетесь через 
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
              программа, разработанная специально для вас. <strong className="text-foreground font-semibold">Черт, 
              вам даже может понравиться!</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Why Millions Trust - Features Grid */}
      <section className="section-spacing px-4 bg-muted/20 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Почему тысячи студентов доверяют Sdadim
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Станьте умнее для DGT как можно скорее
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className={`group relative overflow-hidden card-elevated border-2 bg-gradient-to-br ${feature.bgGradient} hover:border-primary/50`}
                  data-animate
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 md:p-8 space-y-5">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-body">
                      {feature.description}
                    </p>
                  </CardContent>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="section-spacing px-4 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Что делает нас особенными
            </h2>
          </div>

          <div className="space-y-12 max-w-4xl mx-auto">
            {whyDifferent.map((item, index) => (
              <div 
                key={index}
                className="flex flex-col md:flex-row gap-8 md:gap-12 items-start group"
                data-animate
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex-shrink-0">
                  <div className="text-6xl md:text-7xl font-bold gradient-text group-hover:scale-110 transition-transform duration-500">
                    {item.number}
                  </div>
                </div>
                <div className="space-y-3 flex-1 pt-2">
                  <h3 className="text-headline group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-body-lg text-muted-foreground leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Social Proof */}
      <section className="section-spacing px-4 bg-muted/20 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Это может быть вы
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Реальные истории реальных людей, которые сдали экзамен с первого раза
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="group relative overflow-hidden card-elevated border-2 hover:border-primary/50"
                data-animate
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 md:p-8 space-y-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{testimonial.avatar}</div>
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-body-lg leading-relaxed">
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
      <section className="section-spacing px-4 relative">
        <div className="container-landing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div 
              className="space-y-8"
              data-animate
            >
              <h2 className="text-display gradient-text">
                Готовься эффективно
              </h2>
              <p className="text-headline text-muted-foreground font-light">
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
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <span className="text-body-lg group-hover:text-primary transition-colors duration-300">
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
                <div className="flex items-center justify-center w-24 h-24 rounded-3xl gradient-primary mx-auto shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500">
                  <Trophy className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="text-center space-y-5">
                  <h3 className="text-3xl md:text-4xl font-bold">
                    Начни сегодня
                  </h3>
                  <p className="text-body-lg text-muted-foreground font-light">
                    Присоединяйся к тысячам студентов, которые уже успешно сдали экзамен
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full btn-hero text-lg py-7"
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

      {/* FAQ Section - Interactive Block */}
      <section className="section-spacing px-4 bg-muted/20 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Часто задаваемые вопросы
            </h2>
            <p className="text-headline text-muted-foreground font-light">
              Все что нужно знать о платформе
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqData.map((faq, index) => (
              <Card
                key={index}
                className="card-elevated border-2 overflow-hidden"
                data-animate
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors duration-200 text-left"
                >
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-muted-foreground leading-relaxed animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Smarter Practice Section */}
      <section className="section-spacing px-4 relative">
        <div className="container-landing">
          <div 
            className="text-center space-y-4 mb-16"
            data-animate
          >
            <h2 className="text-display gradient-text">
              Умная практика, лучшие результаты
            </h2>
            <p className="text-headline text-muted-foreground font-light">
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
                  className="p-6 md:p-8 text-center card-elevated border-2 hover:border-primary/50 group"
                  data-animate
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-0 space-y-4">
                    <div className="flex justify-center">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
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

      {/* Final CTA Section - Conversion Focus */}
      <section className="section-spacing-lg px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="container-landing text-center space-y-10 relative z-10 max-w-4xl mx-auto">
          <h2 
            className="text-display gradient-text"
            data-animate
          >
            Готов начать свой путь к успеху?
          </h2>
          <p 
            className="text-headline text-muted-foreground font-light"
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
              className="btn-hero text-lg px-10 py-7"
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
            className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap"
            data-animate
          >
            <CheckCircle2 className="w-4 h-4 text-success" />
            Регистрация не требуется
            <span className="text-border">•</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
            Без кредитной карты
            <span className="text-border">•</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
            Начни прямо сейчас
          </p>
        </div>
      </section>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Landing;
