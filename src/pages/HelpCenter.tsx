import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Trophy, 
  Sparkles, 
  Coins, 
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";

interface Section {
  id: string;
  title: string;
  icon: any;
  subsections: Subsection[];
}

interface Subsection {
  id: string;
  title: string;
  content: string;
  items?: string[];
}

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("welcome");
  const isTelegramApp = isTelegramMiniApp();

  const sections: Section[] = [
    {
      id: "welcome",
      title: "Добро пожаловать",
      icon: BookOpen,
      subsections: [
        {
          id: "welcome-intro",
          title: "Что такое Sdadim?",
          content: `Sdadim — это интерактивное приложение для подготовки к экзамену на получение водительских прав в Испании (DGT). Мы помогаем вам эффективно изучать правила дорожного движения, дорожные знаки и сдавать экзамены с удовольствием.

Приложение включает:
• Тысячи вопросов из официальной базы DGT
• Интерактивные игры для запоминания
• Систему достижений и наград
• Ежедневные бонусы
• Реферальную программу
• Искусственный интеллект для объяснения сложных тем`
        },
        {
          id: "welcome-getting-started",
          title: "Начало работы",
          content: `Чтобы начать использовать Sdadim:

1. Зарегистрируйтесь через Telegram или веб-браузер
2. Изучите главную страницу и доступные разделы
3. Начните с прохождения тестов или изучения материалов
4. Заходите каждый день за ежедневными бонусами
5. Отслеживайте свой прогресс в разделе достижений`
        }
      ]
    },
    {
      id: "app-usage",
      title: "Использование приложения",
      icon: BookOpen,
      subsections: [
        {
          id: "app-tests",
          title: "Прохождение тестов",
          content: `В приложении доступно несколько типов тестов:

• Обычные тесты — выберите тему и количество вопросов (10, 20, 30)
• Экзаменационные тесты — полный экзамен на 30 вопросов с таймером
• Последовательные тесты — тесты по порядку из базы DGT
• Банк вызовов — сложные вопросы, которые вызывают затруднения

Во время прохождения теста:
• Выберите правильный ответ из предложенных вариантов
• Используйте кнопку перевода для просмотра вопроса на русском
• Добавляйте вопросы в закладки для повторения
• Используйте AI-объяснение для понимания сложных тем
• Отмечайте проблемные вопросы для улучшения качества`
        },
        {
          id: "app-games",
          title: "Игры",
          content: `Игры помогают изучать материал в увлекательной форме:

• Гонка — быстро отвечайте на вопросы, зарабатывайте очки
• Угадай знак — определяйте дорожные знаки по изображениям
• Соответствие — сопоставляйте термины и их значения
• Дуэль — соревнуйтесь с друзьями в реальном времени
• Четыре варианта — классический формат вопросов
• Дорожная гонка — проходите маршруты, отвечая на вопросы
• Флэш-карты — запоминайте термины и определения

Каждая игра начисляет очки опыта и монеты за правильные ответы.`
        },
        {
          id: "app-learning",
          title: "Обучение",
          content: `Раздел обучения включает:

• Карту обучения — визуальное представление всех тем
• Детальные материалы по каждой теме
• Объяснения правил дорожного движения
• Словарь терминов на испанском и русском языках
• Дорожные знаки с описаниями

Изучайте материалы в удобном для вас темпе и закрепляйте знания через тесты и игры.`
        },
        {
          id: "app-ai",
          title: "Искусственный интеллект",
          content: `AI-помощник Lumi доступен в тестах и играх:

• Объясняет правильные и неправильные ответы
• Помогает понять сложные правила
• Отвечает на вопросы о ПДД
• Предоставляет контекст и примеры

Используйте AI-объяснение для глубокого понимания материала.`
        }
      ]
    },
    {
      id: "rewards",
      title: "Система наград",
      icon: Trophy,
      subsections: [
        {
          id: "rewards-overview",
          title: "Обзор системы наград",
          content: `В Sdadim существует система достижений, которая мотивирует вас к регулярным занятиям. За выполнение различных действий вы получаете достижения и награды.`
        },
        {
          id: "rewards-achievements",
          title: "Достижения",
          content: `Достижения разделены на категории:

• Новичок — базовые достижения для начала
• Мастер — продвинутые достижения
• Серия — за регулярные занятия
• Точность — за правильные ответы
• Игры — за участие в играх
• Обучение — за изучение материалов

Примеры достижений:
• Новичок — завершить первый урок (30 XP)
• Фотомодель — добавить фото в профиль (20 XP)
• Воин выходного дня — пройти тест в субботу и воскресенье (50 XP)
• Энтузиаст — заниматься 3 дня подряд (40 XP)
• Стратег — завершить все дополнительные тесты (120 XP)
• Гений ПДД — набрать 100% правильных ответов в экзаменационном тесте (500 XP)
• Мастер ПДД — набрать 4000 очков опыта (бейдж)`
        },
        {
          id: "rewards-daily-bonus",
          title: "Ежедневный бонус",
          content: `Заходите каждый день и получайте награды! Система ежедневных бонусов работает по принципу серий:

• День 1-6: Малые награды (XP и монеты)
• День 7: Недельный герой — особые награды
• День 14: Две недели подряд — увеличенные награды
• День 21: Три недели — еще больше наград
• День 30: Месяц подряд — значительные награды
• День 60: Два месяца — премиальные награды
• День 90: Железная воля — максимальные награды и бейдж

Если пропустите день, серия сбрасывается. Но вы можете восстановить её за 10 монет.`
        },
        {
          id: "rewards-referral",
          title: "Реферальная программа",
          content: `Приглашайте друзей и получайте награды:

• При регистрации друга по вашей реферальной ссылке вы оба получаете бонусы
• За каждого приглашенного друга вы получаете монеты
• Чем больше друзей вы пригласите, тем больше наград

Делитесь своей реферальной ссылкой и помогайте друзьям готовиться к экзамену!`
        }
      ]
    },
    {
      id: "experience",
      title: "Система опыта (XP)",
      icon: Sparkles,
      subsections: [
        {
          id: "experience-overview",
          title: "Что такое опыт?",
          content: `Опыт (XP) — это очки, которые вы зарабатываете за различные действия в приложении. Чем больше опыта вы накапливаете, тем выше ваш уровень и ранг.`
        },
        {
          id: "experience-earning",
          title: "Как заработать опыт",
          content: `Опыт начисляется за:

• Правильные ответы в тестах — от 10 до 50 XP в зависимости от сложности
• Прохождение игр — от 20 до 100 XP за игру
• Получение достижений — от 20 до 500 XP
• Ежедневные бонусы — от 5 до 200 XP в зависимости от дня серии
• Завершение уроков — от 30 до 150 XP
• Участие в дуэлях — от 15 до 75 XP в зависимости от результата

Чем сложнее действие, тем больше опыта вы получаете.`
        },
        {
          id: "experience-ranks",
          title: "Ранги и уровни",
          content: `По мере накопления опыта вы повышаете свой ранг:

• Ученик (0-500 XP)
• Начинающий (500-1000 XP)
• Опытный (1000-2000 XP)
• Продвинутый (2000-4000 XP)
• Эксперт (4000-8000 XP)
• Мастер (8000+ XP)

Каждый новый ранг открывает новые возможности и награды.`
        },
        {
          id: "experience-benefits",
          title: "Преимущества опыта",
          content: `Накопление опыта дает вам:

• Доступ к новым разделам и функциям
• Специальные бейджи и значки
• Приоритет в рейтингах
• Эксклюзивные достижения
• Возможность участвовать в специальных событиях

Регулярно занимайтесь, чтобы максимизировать свой опыт!`
        }
      ]
    },
    {
      id: "coins",
      title: "Система монет",
      icon: Coins,
      subsections: [
        {
          id: "coins-overview",
          title: "Что такое монеты?",
          content: `Монеты — это внутриигровая валюта, которую вы можете использовать для различных целей в приложении.`
        },
        {
          id: "coins-earning",
          title: "Как заработать монеты",
          content: `Монеты начисляются за:

• Победу в дуэли — 50 монет
• Ничью в дуэли — 25 монет
• Участие в дуэли — 15 монет
• Ежедневные бонусы — от 5 до 100 монет в зависимости от дня серии
• Реферальная программа — за каждого приглашенного друга
• Специальные достижения — разовые награды

Активное участие в играх и приглашение друзей — лучший способ заработать монеты.`
        },
        {
          id: "coins-spending",
          title: "На что потратить монеты",
          content: `Монеты можно использовать для:

• Восстановления серии ежедневных бонусов — 10 монет
• Покупки бустов в магазине — различные цены
• Специальных функций и улучшений

Экономьте монеты для важных покупок!`
        },
        {
          id: "coins-tips",
          title: "Советы по монетам",
          content: `Чтобы максимизировать количество монет:

• Участвуйте в дуэлях регулярно
• Заходите каждый день за ежедневными бонусами
• Приглашайте друзей через реферальную программу
• Выполняйте достижения, которые дают монеты
• Не тратьте монеты без необходимости

Планируйте свои расходы заранее!`
        }
      ]
    },
    {
      id: "spain-driving-license",
      title: "Права в Испании",
      icon: Flag,
      subsections: [
        {
          id: "spain-requirements",
          title: "Требования для получения прав",
          content: `Для получения водительских прав в Испании необходимо:

• Быть не моложе 18 лет (для категории B)
• Пройти медицинское обследование
• Пройти теоретический экзамен (30 вопросов, максимум 3 ошибки)
• Пройти практический экзамен по вождению
• Оплатить соответствующие сборы

Экзамены проводятся DGT (Dirección General de Tráfico).`
        },
        {
          id: "spain-exam",
          title: "Экзамен DGT",
          content: `Теоретический экзамен состоит из 30 вопросов с несколькими вариантами ответов:

• Время на экзамен: 30 минут
• Максимум ошибок: 3
• Формат: вопросы с изображениями и текстом
• Языки: испанский, каталанский, баскский, галисийский

Практический экзамен включает:
• Проверку навыков вождения
• Выполнение маневров
• Соблюдение правил дорожного движения`
        },
        {
          id: "spain-preparation",
          title: "Подготовка к экзамену",
          content: `Рекомендации по подготовке:

• Изучайте официальные материалы DGT
• Проходите тесты регулярно
• Изучайте дорожные знаки
• Практикуйтесь с вопросами из базы DGT
• Используйте приложение Sdadim для тренировки

Регулярная практика — ключ к успеху!`
        },
        {
          id: "spain-faq",
          title: "Часто задаваемые вопросы",
          content: `Вопрос: Сколько стоит получение прав в Испании?
Ответ: Стоимость варьируется, но обычно составляет от 600 до 1500 евро, включая обучение, экзамены и сборы.

Вопрос: Можно ли сдать экзамен на русском языке?
Ответ: Нет, экзамен доступен только на официальных языках Испании. Но вы можете использовать перевод в приложении для подготовки.

Вопрос: Сколько раз можно пересдавать экзамен?
Ответ: Количество попыток не ограничено, но каждая пересдача требует оплаты.

Вопрос: Действительны ли права из другой страны?
Ответ: Зависит от страны происхождения. ЕС права действительны, для других стран может потребоваться обмен или пересдача.`
        }
      ]
    },
    {
      id: "faq",
      title: "FAQ",
      icon: HelpCircle,
      subsections: [
        {
          id: "faq-general",
          title: "Общие вопросы",
          items: [
            "Как зарегистрироваться? — Используйте Telegram или веб-браузер для регистрации",
            "Приложение бесплатное? — Да, базовые функции бесплатны, есть премиум функции",
            "Работает ли приложение офлайн? — Нет, требуется подключение к интернету",
            "На каких устройствах работает? — Веб-версия работает на всех устройствах, Telegram версия в Telegram",
            "Как связаться с поддержкой? — Через Telegram или email support@sdadim.com"
          ]
        },
        {
          id: "faq-technical",
          title: "Технические вопросы",
          items: [
            "Приложение не загружается — Проверьте интернет-соединение и обновите страницу",
            "Не сохраняется прогресс — Убедитесь, что вы авторизованы и данные синхронизированы",
            "Ошибки в вопросах — Используйте кнопку 'Сообщить о проблеме' в тестах",
            "Медленная работа — Очистите кэш браузера или перезапустите приложение",
            "Не работают изображения — Проверьте настройки контента в браузере"
          ]
        },
        {
          id: "faq-account",
          title: "Аккаунт и данные",
          items: [
            "Как изменить профиль? — Откройте меню профиля и нажмите 'Редактировать'",
            "Как удалить аккаунт? — Обратитесь в поддержку для удаления аккаунта",
            "Можно ли иметь несколько аккаунтов? — Да, но прогресс не синхронизируется",
            "Как восстановить пароль? — Используйте функцию восстановления пароля при входе",
            "Где хранятся мои данные? — Данные хранятся безопасно в соответствии с политикой конфиденциальности"
          ]
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    subsections: section.subsections.filter(sub => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.items && sub.items.some(item => item.toLowerCase().includes(searchQuery.toLowerCase())))
    )
  })).filter(section => section.subsections.length > 0);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Отслеживание активного раздела при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      const mainSections = ['welcome', 'app-usage', 'rewards', 'experience', 'coins', 'spain-driving-license', 'faq'];
      const scrollPosition = window.scrollY + 150;

      for (let i = mainSections.length - 1; i >= 0; i--) {
        const sectionId = mainSections[i];
        const element = document.getElementById(sectionId);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sectionId);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Вызываем сразу для установки начального состояния
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tableOfContents = sections.map(section => ({
    id: section.id,
    title: section.title,
    subsections: section.subsections.map(sub => ({
      id: sub.id,
      title: sub.title
    }))
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div 
          className={cn(
            "sticky z-10 bg-background/95 backdrop-blur-sm border-b",
            isTelegramApp 
              ? "tg-safe-top" 
              : "top-0"
          )}
          style={isTelegramApp ? {
            paddingTop: `calc(env(safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 80px))`,
            top: 0
          } : {
            paddingTop: '0px',
            top: 0
          }}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <HelpCircle className="w-6 h-6 text-primary" />
                  <h1 className="text-xl font-bold">Центр помощи</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Всё, что нужно знать о Sdadim
                </p>
              </div>

              <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по документации..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-24">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Содержание
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <div key={section.id}>
                        <button
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                            activeSection === section.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {section.title}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.id} id={section.id} className="scroll-mt-24">
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold">{section.title}</h2>
                      </div>

                      <div className="space-y-6">
                        {section.subsections.map((subsection) => (
                          <div key={subsection.id} id={subsection.id} className="space-y-3 scroll-mt-24">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                              {subsection.title}
                            </h3>
                            <div className="text-muted-foreground whitespace-pre-line">
                              {subsection.content}
                            </div>
                            {subsection.items && (
                              <ul className="space-y-2 ml-4">
                                {subsection.items.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Table of Contents (Right Sidebar) */}
            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-24">
                <h3 className="font-bold mb-4">На этой странице</h3>
                <nav className="space-y-2">
                  {tableOfContents.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left block text-sm font-medium px-2 py-1 rounded transition-colors",
                          activeSection === section.id
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {section.title}
                      </button>
                      {activeSection === section.id && (
                        <div className="ml-4 space-y-1">
                          {section.subsections.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                const element = document.getElementById(sub.id);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className="w-full text-left block text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                            >
                              {sub.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </Card>
            </div>
          </div>

          {/* Helpful Section */}
          <Card className="mt-8 p-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold">Была ли эта страница полезной?</h3>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Да
                </Button>
                <Button variant="outline" size="sm">
                  <XCircle className="w-4 h-4 mr-2" />
                  Нет
                </Button>
              </div>
              <div className="relative max-w-md mx-auto">
                <Input
                  placeholder="Задать вопрос..."
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HelpCenter;

