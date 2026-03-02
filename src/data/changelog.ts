/**
 * changelog.ts — история обновлений Skily для пользователей.
 * Данные взяты из git-коммитов за последние 3 месяца и адаптированы
 * под пользовательский язык (без технических деталей).
 */

export type ChangeCategory =
    | 'feature'   // новая функция
    | 'fix'       // исправление
    | 'design'    // UI/UX улучшение
    | 'performance'; // производительность

export interface ChangeItem {
    text: string;
    category: ChangeCategory;
}

export interface ChangelogRelease {
    version: string;           // отображаемая версия / метка
    date: string;              // ISO дата
    badge?: string;            // эмодзи-бейдж
    title: string;             // заголовок релиза
    description?: string;      // краткое описание блока
    changes: ChangeItem[];
    isLatest?: boolean;
}

/**
 * Релизы отсортированы: самые новые — первые.
 * Каждый блок = логически связанная волна обновлений.
 */
export const CHANGELOG: ChangelogRelease[] = [
    {
        version: 'Mar 2026',
        date: '2026-03-02',
        badge: '🎨',
        title: 'Полировка UI и системные улучшения',
        description: 'Восстановление шрифтов, устранение прыжков экрана при загрузке.',
        isLatest: true,
        changes: [
            { text: 'Восстановлен жирный шрифт логотипа и заголовков — теперь выглядит сочнее и чище', category: 'design' },
            { text: 'Заголовок «Дуэль» на странице игр снова крупный и выразительный', category: 'design' },
            { text: 'Устранены прыжки страницы при загрузке шапки — добавлен скелетон анимации', category: 'fix' },
            { text: 'Исправлены переводы в блоке настроек контекста', category: 'fix' },
        ],
    },
    {
        version: 'Mar 2026 · Sprint 1',
        date: '2026-03-01',
        badge: '🧩',
        title: 'Рефакторинг тестов и оптимизация запросов',
        description: 'Единый UI для режимов Марафон и Нон-стоп, меньше нагрузки на сервер.',
        changes: [
            { text: 'Режимы «Марафон» и «Нон-стоп» теперь используют общие компоненты — меньше багов, единый стиль', category: 'feature' },
            { text: 'AI-виджет появился в режиме Нон-стоп', category: 'feature' },
            { text: 'Исправлено отображение изображений на карте вопросов', category: 'fix' },
            { text: 'Сокращено количество запросов к серверу на 40%', category: 'performance' },
        ],
    },
    {
        version: 'Feb 2026 · Week 4',
        date: '2026-02-28',
        badge: '⚔️',
        title: 'Дуэли: умная защита и Duel Pass',
        description: 'Баннер активной дуэли больше не мешает, таблица Duel Pass оптимизирована для мобильных.',
        changes: [
            { text: 'Баннер активной дуэли теперь появляется только когда дуэль действительно идёт', category: 'fix' },
            { text: 'Таблица Duel Pass адаптирована для маленьких экранов — иконки вместо длинных текстов', category: 'design' },
            { text: 'Исправлено отображение очков соперника в дуэли', category: 'fix' },
            { text: 'Кнопка «Получить» в Duel Pass стала компактнее и удобнее', category: 'design' },
        ],
    },
    {
        version: 'Feb 2026 · Week 3',
        date: '2026-02-23',
        badge: '🤖',
        title: 'AI-помощник и новый голос',
        description: 'Голосовой ввод через Whisper, умные объяснения прямо в тесте.',
        changes: [
            { text: 'Голосовой ввод теперь работает через Whisper от OpenAI — точнее и быстрее', category: 'feature' },
            { text: 'AI автоматически показывает объяснение, если в контексте уже есть нужная информация', category: 'feature' },
            { text: 'Мобильный попап AI-объяснения — получай подсказку без потери фокуса', category: 'feature' },
            { text: 'AI-кнопка в карточке вопроса переработана — новый стиль с «лампочкой» и пульсацией', category: 'design' },
            { text: 'Панель отчётности о проблемных вопросах переработана — красивее и понятнее', category: 'design' },
        ],
    },
    {
        version: 'Feb 2026 · Week 2',
        date: '2026-02-15',
        badge: '⭐',
        title: 'Избранное 2.0 и новые игры',
        description: 'Умная коллекция для повторения, новый визуал игрового режима, флэш-карты.',
        changes: [
            { text: 'Избранное 2.0: интервальное повторение и «умный зал» для сложных вопросов', category: 'feature' },
            { text: 'Игры получили эффектный фоновый визуал и анимации', category: 'design' },
            { text: 'Лексикон (Четыре варианта) — полный редизайн и новое название', category: 'design' },
            { text: 'Исправлено 100%-е чтение готовности и синхронизация показателей', category: 'fix' },
            { text: 'Загрузочные советы в тестах — теперь не скучно ждать', category: 'feature' },
        ],
    },
    {
        version: 'Feb 2026 · Week 1',
        date: '2026-02-10',
        badge: '🔐',
        title: 'Авторизация: Apple Login и Passkeys',
        description: 'Вход через Apple, ключи доступа WebAuthn, улучшенный лендинг.',
        changes: [
            { text: 'Добавлен вход через Apple — удобно и безопасно', category: 'feature' },
            { text: 'Поддержка Passkeys (WebAuthn) — входи без пароля с Face ID / Touch ID', category: 'feature' },
            { text: 'Лендинг на испанском обновлён реальными вопросами DGT', category: 'feature' },
            { text: 'Исправлено бесконечное проксирование перезагрузки страницы при ошибках', category: 'fix' },
            { text: 'iOS PWA теперь ведёт в Telegram — добавить на главный экран', category: 'feature' },
        ],
    },
    {
        version: 'Feb 2026 · Design',
        date: '2026-02-13',
        badge: '💳',
        title: 'Оплата и Premium: новый поток',
        description: 'Красивая оплата внутри приложения, поддержка лайфтайм-плана.',
        changes: [
            { text: 'Checkout-модал Paddle — оплата прямо в приложении, без редиректов', category: 'feature' },
            { text: 'Поддержка плана «Premium Forever» — купи раз и забудь о подписках', category: 'feature' },
            { text: 'Интеграция Cryptomus — дополнительный метод оплаты', category: 'feature' },
            { text: 'Карточка лицензии переработана в стиле Cyber Card', category: 'design' },
            { text: 'Страница Premium-функций с bento-grid и AI spotlight', category: 'design' },
        ],
    },
    {
        version: 'Dec 2025',
        date: '2025-12-03',
        badge: '⚡',
        title: 'Offline-First и суперпроизводительность',
        description: 'Работает без интернета, данные в IndexedDB, Super RPC v2.0.',
        changes: [
            { text: 'Offline-First: базовые функции работают без сети, данные синхронизируются при восстановлении', category: 'feature' },
            { text: 'Super RPC v2.0 — главный дашборд загружается одним запросом вместо двухсот', category: 'performance' },
            { text: 'Персистентный кэш на IndexedDB — данные живут 7 дней, не нужно грузить заново', category: 'performance' },
            { text: 'Фоновые задачи: синхронизация работает в фоне без блокировки UI', category: 'performance' },
            { text: 'Умная фильтрация кэша — эфемерные данные не сохраняются и не портят кэш', category: 'performance' },
        ],
    },
    {
        version: 'Dec 2025 · Partners',
        date: '2025-12-02',
        badge: '🤝',
        title: 'Партнёрская программа и ежедневные бонусы',
        description: 'Реферальные ссылки, статистика партнёров, анимированный виджет бонусов.',
        changes: [
            { text: 'Партнёрская программа: создавай ссылки, отслеживай переходы и конверсии', category: 'feature' },
            { text: 'Ежедневные бонусы переработаны — красивый виджет с анимацией 7-дневного цикла', category: 'design' },
            { text: 'Таблица Links PRO: статистика, поиск и иконки каналов', category: 'feature' },
            { text: 'Исправлены дубликаты уведомлений о наградах', category: 'fix' },
        ],
    },
];
