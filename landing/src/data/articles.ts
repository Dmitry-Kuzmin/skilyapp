export type Lang = "ru" | "en" | "es";

export interface ArticleMeta {
  slug: string;
  categorySlug: string;
  publishedAt: string;
  readTime: number;
  ru: { title: string; description: string; excerpt: string; category: string; author: string };
  en: { title: string; description: string; excerpt: string; category: string; author: string };
  es: { title: string; description: string; excerpt: string; category: string; author: string };
  keywords?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  howTo?: {
    name: string;
    description?: string;
    totalTime?: string;
    steps: Array<{ name: string; text: string }>;
  };
}

export const articles: ArticleMeta[] = [
  {
    slug: "ekzamen-dgt-2026",
    categorySlug: "dgt-2026",
    publishedAt: "2026-05-01",
    readTime: 18,
    ru: {
      title: "Новый теоретический экзамен на права в Испании: изменения 2026",
      description: "DGT запустила крупнейшую реформу за 10 лет. Видео-вопросы с февраля 2026, новые знаки уже сейчас — разбираем всё, что изменилось и как готовиться.",
      excerpt: "Видео-вопросы, новые знаки ZBE и VMP, интервью с директором автошколы и 7 советов по подготовке — полный разбор реформы DGT 2026.",
      category: "DGT 2026",
      author: "Дмитрий, основатель Skilyapp",
    },
    en: {
      title: "New Theory Driving Exam in Spain: 2026 Changes",
      description: "DGT has launched its biggest reform in 10 years. Video questions arrive in February 2026, while new road signs are already in place — here is what changed and how to prepare.",
      excerpt: "Video questions, new ZBE and VMP road signs, a driving-school interview and 7 preparation tips — a complete breakdown of the DGT 2026 reform.",
      category: "DGT 2026",
      author: "Dmitry, founder of Skilyapp",
    },
    es: {
      title: "Nuevo examen teórico de conducir en España: cambios de 2026",
      description: "La DGT ha lanzado su mayor reforma en 10 años. Las preguntas en vídeo llegan en febrero de 2026 y las nuevas señales ya están en vigor: te explicamos qué cambia y cómo prepararte.",
      excerpt: "Preguntas en vídeo, nuevas señales ZBE y VMP, entrevista con una autoescuela y 7 consejos de preparación: análisis completo de la reforma DGT 2026.",
      category: "DGT 2026",
      author: "Dmitry, fundador de Skilyapp",
    },
    keywords: [
      "DGT 2026",
      "теоретический экзамен DGT",
      "видео-вопросы DGT",
      "реформа DGT 2026",
      "новый экзамен на права Испания",
      "percepción del riesgo DGT",
      "examen teórico DGT 2026",
      "Pere Navarro DGT",
      "новые знаки DGT",
      "ZBE Испания",
      "электросамокаты ПДД Испания",
      "подготовка к DGT на русском",
      "Hazard Perception Test Spain",
    ],
    faqItems: [
      {
        question: "Когда вступают в силу видео-вопросы DGT 2026?",
        answer: "Реформа экзамена DGT идёт в две фазы. Фаза 1 (новые дорожные знаки — электросамокаты, ZBE, VAO, зарядные станции) уже действует с 1 октября 2025 года. Фаза 2 — введение видео-вопросов на восприятие риска — начинается ориентировочно с 5 февраля 2026 года, после публикации в BOE.",
      },
      {
        question: "Как работают видео-вопросы на новом экзамене DGT?",
        answer: "Видео-вопрос — это короткий ролик до 60 секунд от первого лица водителя (POV), показывающий реальную дорожную ситуацию. На экране появляется надпись «Le quedan 3 visualizaciones antes de ver la pregunta» — вы можете пересмотреть видео максимум 3 раза.",
      },
      {
        question: "Сколько вопросов и ошибок на экзамене DGT в 2026 году?",
        answer: "Базовая структура экзамена не изменилась: 30 вопросов с тремя вариантами ответа, максимум 3 ошибки для сдачи, около 30 минут на выполнение. Цена €94,05 (включает 2 попытки).",
      },
      {
        question: "Какие новые дорожные знаки появились в DGT в 2025-2026?",
        answer: "С 1 октября 2025 года вступил в силу обновлённый Catálogo Oficial de Señales. Новые знаки включают: устройства персональной мобильности (электросамокаты VMP), ZBE, VAO, знаки для зарядных станций электромобилей, дороги типа 2+1.",
      },
      {
        question: "Как лучше всего готовиться к видео-вопросам DGT?",
        answer: "Тренируйтесь на официальном тесте DGT Test de Predicción de Riesgos — все 21 видео минимум 3-4 раза. Используйте 3 пересмотра стратегически: первый — общая картина, второй — периферия и погода, третий — подтверждение риска.",
      },
      {
        question: "На каких языках можно готовиться к экзамену DGT?",
        answer: "Сам экзамен в DGT центрах сдаётся только на испанском, но готовиться можно на любом языке. Платформа Skilyapp поддерживает три языка: испанский, английский и русский.",
      },
    ],
    howTo: {
      name: "Как подготовиться к новому экзамену DGT 2026 и сдать с первого раза",
      description: "Пошаговая методика подготовки к теоретическому экзамену DGT с учётом видео-вопросов и обновлённых знаков 2026",
      totalTime: "PT4W",
      steps: [
        { name: "Проверьте дату экзамена и формат", text: "Узнайте, попадает ли ваш экзамен в формат до или после февраля 2026. После февраля будут видео-вопросы." },
        { name: "Обновите учебные материалы", text: "Используйте только материалы, актуализированные под 2025-2026: новые знаки для электросамокатов, ZBE, VAO, зарядных станций." },
        { name: "Пройдите официальный тест DGT на восприятие риска", text: "Все 21 видео из Test de Predicción de Riesgos на dgt.es минимум 3-4 раза." },
        { name: "Делайте практические тесты ежедневно", text: "Минимум 100, в идеале 150-200 практических тестов за период подготовки." },
        { name: "Тренируйте видео-вопросы стратегически", text: "Учитесь использовать 3 пересмотра: 1-й — общая картина, 2-й — сканирование периферии и погоды, 3-й — подтверждение риска." },
        { name: "Сдавайте полные симуляции экзамена", text: "В последнюю неделю — минимум 4-5 полных симуляций (30 вопросов за 30 минут)." },
        { name: "На экзамене думайте как водитель", text: "Главный сдвиг в DGT 2026: вы не отвечаете на вопросы — вы принимаете решения как водитель." },
      ],
    },
  },
  {
    slug: "novye-voprosy-dgt-2025",
    categorySlug: "tips",
    publishedAt: "2025-03-02",
    readTime: 15,
    ru: {
      title: "Новые типы вопросов DGT в 2025: к чему готовиться",
      description: "Свежие требования экзамена и рабочие приёмы подготовки с помощью Skilyapp.",
      excerpt: "Разбираем обновлённый формат вопросов DGT 2025 и показываем, как тренироваться на примерах Skilyapp.",
      category: "Актуально",
      author: "Команда Skilyapp",
    },
    en: {
      title: "New DGT Question Types in 2025: What to Prepare For",
      description: "Fresh exam requirements and practical preparation tactics with Skilyapp.",
      excerpt: "We break down the updated DGT 2025 question format and show how to train for it with Skilyapp.",
      category: "News",
      author: "Skilyapp Team",
    },
    es: {
      title: "Nuevos tipos de preguntas DGT en 2025: cómo prepararte",
      description: "Nuevas exigencias del examen y tácticas prácticas de preparación con Skilyapp.",
      excerpt: "Analizamos el formato actualizado de preguntas DGT 2025 y cómo entrenarlo con Skilyapp.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "analitika-dgt-progress",
    categorySlug: "preparation",
    publishedAt: "2025-03-04",
    readTime: 14,
    ru: {
      title: "Как читать аналитику прогресса и закрывать слабые темы",
      description: "Методика, которая превращает отчёты Skilyapp в конкретные шаги подготовки.",
      excerpt: "Если вы теряетесь в цифрах статистики, эта статья покажет, как превратить аналитику в конкретные шаги.",
      category: "Подготовка",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How to Read Progress Analytics and Close Weak Topics",
      description: "A method that turns Skilyapp reports into concrete preparation steps.",
      excerpt: "If statistics feel abstract, this guide shows how to turn analytics into daily training decisions.",
      category: "Preparation",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo leer la analítica de progreso y cerrar temas débiles",
      description: "Un método que convierte los informes de Skilyapp en pasos concretos de preparación.",
      excerpt: "Si las estadísticas te resultan abstractas, esta guía te muestra cómo convertir la analítica en decisiones diarias.",
      category: "Preparación",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "podgotovka-na-russkom-i-ispanskom",
    categorySlug: "preparation",
    publishedAt: "2025-03-06",
    readTime: 16,
    ru: {
      title: "Как готовиться к DGT, если думаете на русском, а сдаёте на испанском",
      description: "Двуязычная стратегия: словарь, переводчик и смешанные тесты.",
      excerpt: "Стратегия для тех, кто читает вопросы на испанском, но объяснять себе правила хочет на русском.",
      category: "Подготовка",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How to Prepare for DGT if You Think in Russian but Take the Exam in Spanish",
      description: "A bilingual strategy: glossary, translation support and mixed practice tests.",
      excerpt: "A practical approach for students who read the exam in Spanish but still process the rules more confidently in Russian.",
      category: "Preparation",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo prepararte para la DGT si piensas en ruso pero examinas en español",
      description: "Una estrategia bilingüe: glosario, apoyo de traducción y tests mixtos.",
      excerpt: "Un enfoque práctico para alumnos que leen el examen en español pero aún procesan mejor las normas en ruso.",
      category: "Preparación",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "ispanskie-znaki-kotorye-pytayut",
    categorySlug: "tips",
    publishedAt: "2025-03-06",
    readTime: 13,
    ru: {
      title: "5 испанских дорожных знаков, которые путают русскоязычных",
      description: "Короткий гид по самым коварным знакам и способам их запомнить.",
      excerpt: "Собрали пять знаков, на которых чаще всего ошибаются наши пользователи, и подсказали, как их запомнить за вечер.",
      category: "Советы",
      author: "Команда Skilyapp",
    },
    en: {
      title: "5 Spanish Road Signs That Confuse Russian Speakers",
      description: "A quick guide to signs that look familiar but mean something else entirely.",
      excerpt: "Five road signs that cause the most mistakes among our users, with simple memory hooks for each one.",
      category: "Tips",
      author: "Skilyapp Team",
    },
    es: {
      title: "5 señales españolas que confunden a los rusohablantes",
      description: "Una guía rápida sobre señales que parecen familiares pero significan algo diferente.",
      excerpt: "Cinco señales en las que más fallan nuestros usuarios, con trucos simples para memorizarlas.",
      category: "Consejos",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "motivaciya-dgt-gamifikaciya",
    categorySlug: "tips",
    publishedAt: "2025-03-10",
    readTime: 14,
    ru: {
      title: "Геймификация подготовки: как держать темп 60 дней подряд",
      description: "План на два месяца с дуэлями, наградами и антивыгоранием.",
      excerpt: "Показываем, как превращать подготовку в игру: рейтинги, награды и напоминания Skilyapp.",
      category: "Советы",
      author: "Команда Skilyapp",
    },
    en: {
      title: "Gamifying Preparation: How to Keep the Pace for 60 Days",
      description: "Use streaks, duels and seasonal challenges so your preparation does not collapse halfway through.",
      excerpt: "A practical guide to motivation systems that help students keep showing up for DGT preparation week after week.",
      category: "Tips",
      author: "Skilyapp Team",
    },
    es: {
      title: "Gamificación de la preparación: cómo mantener el ritmo 60 días",
      description: "Usa rachas, duelos y retos de temporada para no abandonar la preparación a mitad de camino.",
      excerpt: "Una guía práctica de sistemas de motivación que ayudan a mantener la constancia en la preparación DGT.",
      category: "Consejos",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "kak-gotovitsya-dgt-pri-plotnom-grafike",
    categorySlug: "preparation",
    publishedAt: "2025-02-15",
    readTime: 15,
    ru: {
      title: "Как готовиться к экзамену DGT, если времени почти нет",
      description: "Пошаговая стратегия для занятых кандидатов: короткие тренировки, адаптивный фокус на слабых темах и умные напоминания Skilyapp.",
      excerpt: "Узнайте, как вписать изучение теории DGT в плотный график: короткие тренировки, адаптивные тесты и использование Skilyapp с ИИ-подсказками.",
      category: "Подготовка",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How to Study DGT Theory Effectively with a Busy Schedule",
      description: "A step-by-step strategy for students balancing work, family and preparation.",
      excerpt: "How to fit DGT theory into a crowded routine using micro-sessions, focus blocks and adaptive practice.",
      category: "Preparation",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo estudiar la teoría DGT con un horario muy apretado",
      description: "Una estrategia paso a paso para quienes combinan trabajo, familia y preparación.",
      excerpt: "Cómo encajar la teoría DGT en una agenda llena usando micro-sesiones, bloques de foco y práctica adaptativa.",
      category: "Preparación",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "kak-trenirovat-vospriyatie-riska-dgt",
    categorySlug: "tips",
    publishedAt: "2025-02-18",
    readTime: 14,
    ru: {
      title: "Как тренировать восприятие риска перед экзаменом DGT",
      description: "Методика для подготовки к новому формату вопросов DGT: сценарии, чек-листы и игровые режимы Skilyapp.",
      excerpt: "Разбираем, почему восприятие риска стало ключевой частью экзамена DGT и как Skilyapp помогает натренировать реакцию через сценарии и дуэли.",
      category: "Советы",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How to Train Risk Perception Before the DGT Exam",
      description: "Practical techniques to spot danger earlier than the examiner expects.",
      excerpt: "Why risk perception matters so much on the DGT exam and how to train it through scenarios, timing and review loops.",
      category: "Tips",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo entrenar la percepción del riesgo antes del examen DGT",
      description: "Técnicas prácticas para detectar el peligro antes de que el examinador lo espere.",
      excerpt: "Por qué la percepción del riesgo importa tanto en la DGT y cómo entrenarla con escenarios, tiempo y revisión.",
      category: "Consejos",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "mikrotreningi-dgt-na-telefone",
    categorySlug: "preparation",
    publishedAt: "2025-02-20",
    readTime: 12,
    ru: {
      title: "Микротренировки на телефоне: путь к стабильному результату DGT",
      description: "Как строить 5-минутные занятия в Skilyapp, чтобы прогресс не зависел от расписания автошколы.",
      excerpt: "Рассказываем, как строить микротренировки на телефоне, чтобы прогресс не зависел от расписания автошколы. Везде с вами — Skilyapp.",
      category: "Подготовка",
      author: "Команда Skilyapp",
    },
    en: {
      title: "Phone Micro-Training: The Path to Stable DGT Results",
      description: "How to turn spare 5-minute windows into real progress with mobile learning.",
      excerpt: "A simple system for building DGT progress from short sessions on your phone instead of waiting for long study blocks.",
      category: "Preparation",
      author: "Skilyapp Team",
    },
    es: {
      title: "Microentrenamientos en el móvil: camino a un resultado estable en DGT",
      description: "Cómo convertir huecos de 5 minutos en progreso real con aprendizaje móvil.",
      excerpt: "Un sistema simple para construir progreso DGT desde sesiones cortas en el móvil en lugar de esperar grandes bloques de estudio.",
      category: "Preparación",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "tehnologii-skilyapp",
    categorySlug: "news",
    publishedAt: "2025-03-08",
    readTime: 20,
    ru: {
      title: "Как Skilyapp сочетает тесты, игры, сезоны и ИИ ради вашего результата",
      description: "20-минутное путешествие по платформе: карта обучения, микротренировки, дуэли, сезоны, Skily и вся геймификация, которая помогает сдавать DGT без стресса.",
      excerpt: "Погружаемся в экосистему Skilyapp: карта обучения, микротренировки, игры, сезоны, Telegram-бот и AI-компаньон Skily — всё в одной заботливой связке.",
      category: "Новости",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How Skilyapp Combines Tests, Games, Seasons and AI",
      description: "A big-picture article on how the learning map, Skily, duels and micro-training work together.",
      excerpt: "A guided tour of the Skilyapp ecosystem: learning map, micro-training, games, seasons, Telegram and AI support in one system.",
      category: "News",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo Skilyapp combina tests, juegos, temporadas e IA",
      description: "Una visión completa de cómo el mapa de aprendizaje, Skily, los duelos y el microentrenamiento funcionan juntos.",
      excerpt: "Un recorrido por el ecosistema Skilyapp: mapa de aprendizaje, microentrenamiento, juegos, temporadas, Telegram y ayuda IA en un solo sistema.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
    categorySlug: "preparation",
    publishedAt: "2024-12-19",
    readTime: 18,
    ru: {
      title: "Как сдать экзамен DGT с первого раза",
      description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
      excerpt: "Теория DGT может показаться сложной, но с правильным подходом вы можете освоить её быстро. Узнайте, как эффективно учиться и избежать распространенных ошибок.",
      category: "Подготовка",
      author: "Команда Skilyapp",
    },
    en: {
      title: "How to Master DGT Theory Efficiently",
      description: "A practical guide to studying DGT theory in Spain with fewer mistakes and more structure.",
      excerpt: "A complete beginner-friendly guide to learning DGT theory efficiently and building exam-ready confidence.",
      category: "Preparation",
      author: "Skilyapp Team",
    },
    es: {
      title: "Cómo dominar la teoría DGT de forma eficiente",
      description: "Una guía práctica para estudiar la teoría DGT en España con menos errores y más estructura.",
      excerpt: "Una guía completa y clara para aprender teoría DGT con eficacia y llegar al examen con confianza real.",
      category: "Preparación",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "ai-repetitor-dgt-kak-iskusstvennyj-intellekt-pomogaet-sdat-ekzamen",
    categorySlug: "news",
    publishedAt: "2026-03-28",
    readTime: 10,
    ru: {
      title: "AI-репетитор DGT: как искусственный интеллект помогает сдать экзамен с первого раза",
      description: "Как AI-технологии в Skilyapp анализируют ваши ошибки, адаптируют обучение и помогают подготовиться к теории DGT быстрее и эффективнее.",
      excerpt: "Искусственный интеллект в Skilyapp — это не просто чат-бот. Он анализирует ваши слабые места, объясняет сложные вопросы на русском и создаёт персональный план подготовки к экзамену DGT.",
      category: "Новости",
      author: "Команда Skilyapp",
    },
    en: {
      title: "AI DGT Tutor: How Artificial Intelligence Helps You Pass the Exam",
      description: "How AI in Skilyapp analyses mistakes, adapts training and accelerates preparation.",
      excerpt: "Why AI support is more than a chatbot and how it can shorten the path from repeated mistake to stable understanding.",
      category: "News",
      author: "Skilyapp Team",
    },
    es: {
      title: "Tutor IA para la DGT: cómo la inteligencia artificial te ayuda a aprobar",
      description: "Cómo la IA en Skilyapp analiza errores, adapta el entrenamiento y acelera la preparación.",
      excerpt: "Por qué la ayuda IA es mucho más que un chatbot y cómo puede acortar el camino entre error y comprensión estable.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
    },
  },
  {
    slug: "top-10-oshibok-na-ekzamene-dgt",
    categorySlug: "tips",
    publishedAt: "2024-12-19",
    readTime: 16,
    ru: {
      title: "Топ-10 ошибок на экзамене DGT",
      description: "Самые распространенные ошибки при подготовке и сдаче экзамена DGT. Узнайте, как их избежать и увеличить свои шансы на успех.",
      excerpt: "Многие кандидаты повторяют одни и те же ошибки. Мы собрали топ-10 самых частых промахов и рассказали, как их избежать.",
      category: "Советы",
      author: "Команда Skilyapp",
    },
    en: {
      title: "Top 10 Mistakes When Studying DGT Theory",
      description: "The most common mistakes students make when learning DGT traffic rules and how to avoid them.",
      excerpt: "Ten repeated preparation mistakes that slow students down and how to correct each one before exam day.",
      category: "Tips",
      author: "Skilyapp Team",
    },
    es: {
      title: "Top 10 errores al estudiar la teoría DGT",
      description: "Los fallos más comunes al estudiar las normas DGT y cómo evitarlos.",
      excerpt: "Diez errores repetidos de preparación que frenan a muchos alumnos y cómo corregirlos antes del examen.",
      category: "Consejos",
      author: "Equipo Skilyapp",
    },
  },
];

export function getArticle(slug: string): ArticleMeta | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getLocalizedArticle(article: ArticleMeta, lang: Lang) {
  return article[lang];
}

export const sortedArticles = [...articles].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
);
