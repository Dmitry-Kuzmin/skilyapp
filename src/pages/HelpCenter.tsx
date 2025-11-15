import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Flag,
  Crown,
  FileText,
  Gamepad2,
  Zap,
  Users,
  Sun,
  Moon,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTelegramMiniApp } from "@/lib/telegram";

interface Section {
  id: string;
  title: string;
  icon: any;
  description: string;
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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const isTelegramApp = isTelegramMiniApp();

  const sections: Section[] = [
    {
      id: "welcome",
      title: "Добро пожаловать",
      icon: BookOpen,
      description: "Начните работу с Sdadim",
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
      icon: FileText,
      description: "Как использовать все функции приложения",
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
      id: "notifications",
      title: "Уведомления и напоминания",
      icon: Bell,
      description: "Telegram уведомления и напоминания",
      subsections: [
        {
          id: "notifications-overview",
          title: "Система уведомлений",
          content: `Sdadim поддерживает уведомления через Telegram бота, чтобы вы не пропускали важные события и мотивировали себя к регулярным занятиям.

Уведомления можно подключить через кнопку колокольчика в WalletWidget.`
        },
        {
          id: "notifications-types",
          title: "Типы уведомлений",
          content: `Вы будете получать уведомления о:

• Ежедневных целях — напоминания о необходимости пройти тест или игру
• Предупреждения о потере streak — если вы рискуете потерять серию ежедневных бонусов
• Приглашениях на дуэли — когда друзья бросают вам вызов
• Новых наградах Duel Pass — когда вы достигаете нового уровня
• Возвращении после долгого отсутствия — мотивационные сообщения

Все уведомления можно настроить или отключить в любой момент.`
        },
        {
          id: "notifications-setup",
          title: "Как подключить уведомления",
          content: `Чтобы подключить Telegram уведомления:

1. Нажмите на иконку колокольчика в WalletWidget (верхняя панель)
2. В открывшемся окне нажмите "Подключить Telegram бота"
3. Следуйте инструкциям для подключения бота
4. Выберите типы уведомлений, которые хотите получать

После подключения вы будете получать уведомления прямо в Telegram!`
        },
        {
          id: "notifications-management",
          title: "Управление уведомлениями",
          content: `Управлять уведомлениями можно через:

• Настройки приложения — включение/отключение типов уведомлений
• Telegram бот — настройки частоты и типов уведомлений
• Профиль пользователя — общие настройки уведомлений

Вы можете отключить уведомления в любой момент без потери других функций приложения.`
        }
      ]
    },
    {
      id: "rewards",
      title: "Система наград",
      icon: Trophy,
      description: "Достижения, бонусы и реферальная программа",
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
      description: "Как зарабатывать и использовать опыт",
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
      description: "Внутриигровая валюта и её использование",
      subsections: [
        {
          id: "coins-overview",
          title: "Что такое монеты?",
          content: `Монеты — это внутриигровая валюта, которую вы можете использовать для различных целей в приложении. 

Ваш баланс монет отображается в WalletWidget в верхней панели навигации. По клику на виджет открывается магазин, где вы можете просмотреть историю транзакций и совершить покупки.`
        },
        {
          id: "coins-earning",
          title: "Как заработать монеты",
          content: `Монеты начисляются за:

• Прохождение тестов — от 10 до 50 монет в зависимости от результата
• Победу в дуэли — 50 монет
• Ничью в дуэли — 25 монет
• Участие в дуэли — 15 монет
• Ежедневные бонусы — от 5 до 100 монет в зависимости от дня серии
• Реферальную программу — за каждого приглашенного друга
• Duel Pass награды — за достижение уровней
• Специальные достижения — разовые награды
• Premium бонусы — +50% монет за все действия (только для Premium пользователей)

Активное участие в играх, тестах и приглашение друзей — лучший способ заработать монеты.`
        },
        {
          id: "coins-spending",
          title: "На что потратить монеты",
          content: `Монеты можно использовать для:

• Покупки бустов в магазине — различные цены в зависимости от типа буста
• Восстановления серии ежедневных бонусов — 10 монет
• Покупки монетных пакетов — пополнение баланса через Stripe (в разработке)

Все транзакции сохраняются в истории монет, которую можно просмотреть в магазине.`
        },
        {
          id: "coins-history",
          title: "История транзакций",
          content: `В магазине доступна подробная история всех операций с монетами:

• Фильтры по категориям: Все, Доходы, Расходы, Покупки, Награды
• Детальная информация о каждой транзакции:
  - Тип операции (тест, дуэль, ежедневный бонус, покупка буста, Duel Pass награда и т.д.)
  - Дата и время
  - Сумма (положительная для доходов, отрицательная для расходов)
  - Иконка для быстрой идентификации

История помогает отслеживать все ваши финансовые операции в приложении.`
        },
        {
          id: "coins-tips",
          title: "Советы по монетам",
          content: `Чтобы максимизировать количество монет:

• Участвуйте в дуэлях регулярно
• Проходите тесты каждый день
• Заходите каждый день за ежедневными бонусами
• Приглашайте друзей через реферальную программу
• Выполняйте достижения, которые дают монеты
• Получайте награды Duel Pass
• Рассмотрите Premium подписку для удвоенных наград
• Не тратьте монеты без необходимости

Планируйте свои расходы заранее!`
        }
      ]
    },
    {
      id: "premium",
      title: "Premium подписка",
      icon: Crown,
      description: "Преимущества Premium и как получить",
      subsections: [
        {
          id: "premium-overview",
          title: "Что такое Premium?",
          content: `Premium — это подписка, которая открывает все возможности приложения без ограничений и даёт дополнительные преимущества.

Premium статус отображается золотым бейджем в WalletWidget и на главной странице.`
        },
        {
          id: "premium-benefits",
          title: "Преимущества Premium",
          content: `С Premium подпиской вы получаете:

• Безлимитный доступ ко всем тестам и играм — никаких ограничений на количество попыток
• Удвоенные награды — +50% монет за все действия (тесты, игры, дуэли)
• Duel Pass Premium — эксклюзивные награды на каждом уровне Duel Pass
• Без рекламы — чистый интерфейс без отвлекающих элементов
• Мгновенные подсказки — быстрый доступ к объяснениям и подсказкам
• Приоритетная поддержка — быстрые ответы на ваши вопросы

Premium окупается за неделю активного использования!`
        },
        {
          id: "premium-plans",
          title: "Тарифные планы",
          content: `Доступны два варианта подписки:

• Месячная подписка — €9.99/месяц
  - Полный доступ ко всем функциям
  - Автоматическое продление
  - Можно отменить в любой момент

• Годовая подписка — €59.99/год (экономия 50%)
  - Все преимущества месячной подписки
  - Максимальная экономия
  - Оптимальный выбор для активных пользователей

Оба плана включают 3-дневный пробный период для новых пользователей.`
        },
        {
          id: "premium-trial",
          title: "Пробный период",
          content: `Новые пользователи автоматически получают 3-дневный пробный период Premium:

• Полный доступ ко всем Premium функциям
• Никаких платежей в течение пробного периода
• Автоматическая отмена, если не продлите подписку
• Можно отменить в любой момент

Используйте пробный период, чтобы оценить все преимущества Premium!`
        },
        {
          id: "premium-purchase",
          title: "Как получить Premium",
          content: `Получить Premium можно несколькими способами:

1. Через главную страницу — нажмите кнопку "Получить Premium" в hero-секции
2. Через магазин — откройте магазин (WalletWidget) → вкладка "Premium"
3. Через страницу игр — кнопка Premium в hero-секции
4. Через upsell баннеры — появляются при достижении лимитов

После нажатия на кнопку вы будете перенаправлены на безопасную страницу оплаты Stripe.`
        },
        {
          id: "premium-management",
          title: "Управление подпиской",
          content: `Управлять Premium подпиской можно через:

• Профиль пользователя — просмотр статуса и даты окончания
• Настройки — информация о подписке
• Stripe кабинет — управление платежами и отмена подписки

Подписка автоматически продлевается, но вы можете отменить её в любой момент.`
        }
      ]
    },
    {
      id: "duel-pass",
      title: "Duel Pass",
      icon: Trophy,
      description: "Система уровней и наград Duel Pass",
      subsections: [
        {
          id: "duel-pass-overview",
          title: "Что такое Duel Pass?",
          content: `Duel Pass — это система уровней и наград, которая мотивирует вас к регулярным занятиям.

За каждое действие (прохождение тестов, участие в играх, дуэлях) вы получаете XP (очки опыта) для Duel Pass. При достижении определённого количества XP вы повышаете уровень и получаете награды.

Прогресс Duel Pass отображается в WalletWidget в виде мини-полоски XP с текущим уровнем.`
        },
        {
          id: "duel-pass-levels",
          title: "Уровни и награды",
          content: `Duel Pass состоит из 10 уровней, каждый с уникальными наградами:

• Бесплатные награды — доступны всем пользователям:
  - Монеты (от 50 до 500)
  - XP бонусы
  - Специальные достижения

• Premium награды — доступны только Premium пользователям:
  - Удвоенные монеты
  - Эксклюзивные бусты
  - Специальные бейджи
  - Уникальные награды

Награды можно получить только один раз за уровень. После получения они отмечаются как "Получено".`
        },
        {
          id: "duel-pass-xp",
          title: "Как заработать XP для Duel Pass",
          content: `XP для Duel Pass начисляется за:

• Прохождение тестов — от 10 до 50 XP в зависимости от результата
• Участие в играх — от 20 до 100 XP за игру
• Участие в дуэлях — от 15 до 75 XP в зависимости от результата
• Ежедневные бонусы — от 5 до 200 XP в зависимости от дня серии
• Получение достижений — от 20 до 500 XP

Premium пользователи получают +50% XP за все действия!`
        },
        {
          id: "duel-pass-claiming",
          title: "Как получить награды",
          content: `Чтобы получить награду Duel Pass:

1. Достигните нужного уровня, накопив достаточно XP
2. Откройте Duel Pass на главной странице или через магазин
3. Нажмите кнопку "Получить" на доступной награде
4. Награда автоматически добавится в ваш баланс

Награды можно получить в любое время после достижения уровня. Если вы пропустили уровень, вы всё равно можете получить все предыдущие награды.`
        },
        {
          id: "duel-pass-premium",
          title: "Duel Pass Premium",
          content: `Premium пользователи получают дополнительные преимущества:

• Удвоенные награды на каждом уровне
• Эксклюзивные Premium награды
• +50% XP за все действия
• Приоритетный доступ к новым уровням

Premium Duel Pass можно приобрести отдельно или получить автоматически с Premium подпиской.`
        },
        {
          id: "duel-pass-seasons",
          title: "Сезоны Duel Pass",
          content: `Duel Pass работает по сезонам:

• Каждый сезон длится определённое время (обычно 1-3 месяца)
• В начале нового сезона прогресс сбрасывается
• Новые уровни и награды появляются каждый сезон
• Специальные события и бонусы в течение сезона

Следите за обновлениями, чтобы не пропустить новый сезон!`
        }
      ]
    },
    {
      id: "shop",
      title: "Магазин",
      icon: ShoppingBag,
      description: "Покупка бустов, монет и Premium",
      subsections: [
        {
          id: "shop-overview",
          title: "Что такое магазин?",
          content: `Магазин — это место, где вы можете купить бусты, пополнить баланс монет и получить Premium подписку.

Магазин открывается по клику на WalletWidget в верхней панели навигации или через кнопку "Магазин бустов" на странице игр.`
        },
        {
          id: "shop-tabs",
          title: "Вкладки магазина",
          content: `Магазин разделён на три вкладки:

1. Бусты — покупка различных бустов для улучшения результатов:
   • Популярные бусты — доступны всем пользователям
   • Премиум бусты — только для Premium пользователей
   • Каждый буст имеет описание, цену и количество в инвентаре

2. Монеты — пополнение баланса монет:
   • Пакеты монет различных размеров (100, 500, 1200, 3000)
   • Бонусные монеты при покупке больших пакетов
   • Безопасная оплата через Stripe

3. Premium & Duel Pass — подписки и премиум функции:
   • Premium подписка (месяц/год)
   • Duel Pass Premium
   • Сравнение тарифов и преимуществ`
        },
        {
          id: "shop-boosts",
          title: "Бусты",
          content: `Бусты — это временные улучшения, которые помогают вам в тестах и играх:

• Типы бустов:
  - Увеличение времени на ответ
  - Подсказки и подсказки
  - Дополнительные попытки
  - Увеличение наград

• Покупка бустов:
  - Выберите нужный буст в магазине
  - Проверьте свой баланс монет
  - Нажмите "Купить"
  - Буст автоматически добавится в инвентарь

• Использование бустов:
  - Бусты применяются автоматически при необходимости
  - Или вручную перед началом теста/игры
  - Каждый буст имеет ограниченное количество использований`
        },
        {
          id: "shop-coins",
          title: "Покупка монет",
          content: `Пополнить баланс монет можно через вкладку "Монеты" в магазине:

• Доступные пакеты:
  - 100 монет — €2.99
  - 500 монет — €9.99 (+50 бонус)
  - 1200 монет — €19.99 (+200 бонус)
  - 3000 монет — €39.99 (+500 бонус)

• Процесс покупки:
  1. Выберите нужный пакет
  2. Нажмите "Купить"
  3. Вас перенаправит на безопасную страницу оплаты Stripe
  4. После оплаты монеты автоматически добавятся в баланс

Все покупки сохраняются в истории транзакций.`
        },
        {
          id: "shop-premium",
          title: "Premium в магазине",
          content: `Получить Premium можно через вкладку "Premium & Duel Pass":

• Выберите тарифный план (месяц или год)
• Нажмите "Выбрать"
• Вас перенаправит на страницу оплаты Stripe
• После оплаты Premium активируется автоматически

Premium подписка включает все преимущества, описанные в разделе "Premium подписка".`
        }
      ]
    },
    {
      id: "spain-driving-license",
      title: "Права в Испании",
      icon: Flag,
      description: "Всё о получении водительских прав в Испании",
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
      description: "Часто задаваемые вопросы",
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
        },
        {
          id: "faq-premium",
          title: "Premium и монеты",
          items: [
            "Как получить Premium? — Через магазин, главную страницу или страницу игр",
            "Что включает Premium? — Безлимитный доступ, удвоенные награды, Duel Pass Premium, без рекламы",
            "Как пополнить баланс монет? — Через магазин → вкладка 'Монеты'",
            "Можно ли отменить Premium? — Да, в любой момент через Stripe кабинет",
            "Что такое Duel Pass? — Система уровней и наград за регулярные занятия"
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
    setShowIntro(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Отслеживание активного раздела при прокрутке
  useEffect(() => {
    if (!showIntro) {
      const handleScroll = () => {
        const mainSections = ['welcome', 'app-usage', 'rewards', 'experience', 'coins', 'premium', 'duel-pass', 'shop', 'notifications', 'spain-driving-license', 'faq'];
        const scrollPosition = window.scrollY + 200;

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
      handleScroll();
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [showIntro]);

  const tableOfContents = activeSection ? sections.find(s => s.id === activeSection)?.subsections.map(sub => ({
    id: sub.id,
    title: sub.title
  })) : [];

  const currentSection = activeSection ? sections.find(s => s.id === activeSection) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Sdadim</span>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 border border-gray-200 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Links */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
                Главная
              </Link>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Sun className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6 h-12 border-t border-gray-100">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "h-full px-1 text-sm font-medium border-b-2 transition-colors",
                  activeSection === section.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showIntro && !activeSection ? (
          /* Intro Grid */
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">Документация Sdadim</h1>
              <p className="text-lg text-gray-600">Всё, что нужно знать для подготовки к экзамену DGT</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card
                    key={section.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => scrollToSection(section.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                        <Icon className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                          activeSection === section.id
                            ? "bg-purple-50 text-purple-600"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {section.title}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-2 space-y-8">
              {currentSection && (
                <div id={currentSection.id} className="scroll-mt-24">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        {currentSection.icon && (
                          <currentSection.icon className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900">{currentSection.title}</h1>
                    </div>
                    <p className="text-gray-600">{currentSection.description}</p>
                  </div>

                  <div className="space-y-12">
                    {currentSection.subsections.map((subsection) => (
                      <div key={subsection.id} id={subsection.id} className="scroll-mt-24">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                          {subsection.title}
                        </h2>
                        <div className="prose prose-gray max-w-none">
                          <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {subsection.content}
                          </div>
                          {subsection.items && (
                            <ul className="mt-4 space-y-2 list-none">
                              {subsection.items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>

            {/* Right Sidebar - Table of Contents */}
            {tableOfContents.length > 0 && (
              <aside className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="border-l border-gray-200 pl-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">На этой странице</h3>
                    <nav className="space-y-2">
                      {tableOfContents.map((sub) => (
                        <a
                          key={sub.id}
                          href={`#${sub.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const element = document.getElementById(sub.id);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className="block text-sm text-gray-600 hover:text-purple-600 transition-colors"
                        >
                          {sub.title}
                        </a>
                      ))}
                    </nav>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Helpful Section */}
        {!showIntro && (
          <div className="mt-16 pt-8 border-t border-gray-200">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Была ли эта страница полезной?</h3>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" className="border-gray-200">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Да
                </Button>
                <Button variant="outline" size="sm" className="border-gray-200">
                  <XCircle className="w-4 h-4 mr-2" />
                  Нет
                </Button>
              </div>
              <div className="relative max-w-md mx-auto mt-4">
                <Input
                  placeholder="Ask a question..."
                  className="pr-10 bg-gray-50 border-gray-200"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 border border-gray-200 rounded">
                  ⌘I
                </kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpCenter;
