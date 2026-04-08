import { Language } from "@/contexts/LanguageContext";
import { currentYear, examYear } from "@/utils/dateUtils";

export interface LandingCopy {
  controls: {
    studentAccess: string;
    telegramApp: string;
    languageLabel: string;
  };
  hero: {
    badge: string;
    titleTop: string;
    titleBottom: string;
    descriptionHighlight: string;
    descriptionRest: string;
    pressStart: string;
  };
  stats: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  ecosystem: {
    title: string;
    description: string;
    cards: {
      totalQuestions: string;
      totalQuestionsDescription: string;
      categoriesTitle: string;
      categoriesDescription: string;
      simulationTitle: string;
      simulationDescription: string;
      timer: string;
      passRate: string;
    };
  };
  aiSection: {
    title: string;
    poweredBy: string;
    description: string;
    bullets: string[];
    challengeBank: string;
    challengeBankDescription: string;
    telegramTitle: string;
    telegramDescription: string;
    telegramCTA: string;
  };
  comparison: {
    label: string;
    title: string;
    featureLabel: string;
    traditional: string;
    skily: string;
    rows: Array<{
      feature: string;
      traditional: string;
      skily: string;
      skilyDesc?: string;
    }>;
  };
  arena: {
    bannerLabel: string;
    bannerTitle: string;
    bannerDescription: string;
    levels: string;
    rewards: string;
    gamesTitle: string;
    games: Array<{
      title: string;
      description: string;
    }>;
    onlineText: string;
    eventTimerLabel: string;
    seasonRewards: Array<{
      title: string;
      description: string;
    }>;
  };
  liveClass: {
    badge: string;
    title: string;
    description: string;
    schedule: string;
    features: string[];
    cta: string;
  };
  pricing: {
    title: string;
    description: string;
    plans: {
      cadet: {
        title: string;
        price: string;
        features: string[];
        cta: string;
      };
      monthly: {
        title: string;
        price: string;
        note: string;
        badge?: string;
        features: string[];
        cta: string;
      };
      quarterly: {
        title: string;
        price: string;
        note: string;
        badge?: string;
        features: string[];
        cta: string;
      };
      biannual: {
        title: string;
        price: string;
        note: string;
        badge?: string;
        features: string[];
        cta: string;
      };
      yearly: {
        title: string;
        price: string;
        note: string;
        badge?: string;
        features: string[];
        cta: string;
      };
    };
  };
  footer: {
    menu: Array<{
      label: string;
      href: string;
      external?: boolean;
    }>;
    note: string;
  };
  about: {
    mission: string;
    heroTitle: string;
    heroSubtitle: string;
    storyTitle: string;
    storyHighlight: string;
    storyParagraph1: string;
    storyParagraph2: string;
    storyQuote: string;
    goodLuck: string;
    founders: string;
  };
  referral: {
    badge: string;
    invitesYou: string;
    coinsOnRegistration: string;
    join: string;
  };
}

export const LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
];

// Spain landing: только ES и EN (всегда EUR)
export const SPAIN_LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
];

// Russia landing: только RU (всегда RUB)
export const RUSSIA_LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: "ru", label: "RU" },
];

export const landingTranslations: Record<Language, LandingCopy> = {
  es: {
    controls: {
      studentAccess: "Entrar",
      telegramApp: "Telegram App",
      languageLabel: "Idioma",
    },
    hero: {
      badge: `DGT Approved · ${examYear}`,
      titleTop: "Tu teórico a la primera",
      titleBottom: "Sin dramas",
      descriptionHighlight: "Olvida los manuales aburridos",
      descriptionRest:
        "Nuestra IA detecta tus fallos y personaliza el estudio. Gamificación, preguntas oficiales actualizadas y explicaciones instantáneas. Tu 'L' te está esperando.",
      pressStart: "Pulsa Start",
    },
    stats: [
      {
        value: "97%",
        label: "Aprueban",
        description: "Nuestros alumnos aprenden más rápido con IA que personaliza el contenido",
      },
      {
        value: "3000+",
        label: "Preguntas",
        description: "Banco oficial DGT actualizado en tiempo real",
      },
      {
        value: "24/7",
        label: "Entrena",
        description: "Desde tu móvil, tablet o PC. Sin horarios.",
      },
    ],
    ecosystem: {
      title: "Ecosistema de aprendizaje",
      description: "Plataforma unificada para teoría, práctica y análisis de progreso.",
      cards: {
        totalQuestions: `Base Oficial ${examYear}`,
        totalQuestionsDescription: "100% coincidencia con el examen real. Actualización automática.",
        categoriesTitle: "Todas las categorías",
        categoriesDescription: "Coches, motos y transporte profesional.",
        simulationTitle: "Simulación Real",
        simulationDescription: "Mismo interfaz, tiempos y estrés que en la DGT. Entrena en condiciones de combate.",
        timer: "30 min",
        passRate: "PRO",
      },
    },
    aiSection: {
      title: "Skily & Skily AI™",
      poweredBy: "Impulsado por Gemini/Groq",
      description:
        "Un copiloto técnico y una mentora emocional que explican tus fallos en español y ruso.",
      bullets: [
        "Explicaciones contextuales de cada error",
        "Resúmenes bilingües en segundos",
        "Challenge Bank que prioriza tus puntos débiles",
      ],
      challengeBank: "Challenge Bank™",
      challengeBankDescription:
        "Guarda automáticamente las preguntas falladas y te avisa cuando toca repasarlas.",
      telegramTitle: "Telegram Mini App",
      telegramDescription: "Estudia desde cualquier chat con @skilyapp_bot.",
      telegramCTA: "Abrir bot →",
    },
    comparison: {
      label: "Evolución vs tradición",
      title: "¿Por qué Skily?",
      featureLabel: "Característica",
      traditional: "Métodos tradicionales",
      skily: "Skilyapp",
      rows: [
        { feature: "Coste Total", traditional: "€400+", skily: "€4.99", skilyDesc: "/mes (facturado anualmente)" },
        {
          feature: "Método",
          traditional: "Libros estáticos",
          skily: "IA Gamificada",
          skilyDesc: "Aprende jugando, sin estrés.",
        },
        {
          feature: "Actualizaciones",
          traditional: "Libros viejos",
          skily: "Live Updates",
          skilyDesc: "Preguntas siempre al día.",
        },
        {
          feature: "Dudas",
          traditional: "Preguntar al profe",
          skily: "Tutor IA 24/7",
          skilyDesc: "Explicaciones al instante.",
        },
        {
          feature: "Acceso",
          traditional: "Horario fijo",
          skily: "En tu bolsillo",
          skilyDesc: "Estudia donde quieras.",
        },
      ],
    },
    arena: {
      bannerLabel: "Temporada 1",
      bannerTitle: "Duel Pass Premium",
      bannerDescription: "Skins exclusivos, multiplicadores de XP y nuevos retos semanales.",
      levels: "Niveles",
      rewards: "Recompensas",
      gamesTitle: "Juegos en tu hangar",
      games: [
        { title: "RaceGame", description: "Contrarreloj con señales reales" },
        { title: "Duel PvP", description: "Apuesta monedas contra otros pilotos" },
        { title: "GuessSign", description: "Reconoce señales en 3 segundos" },
        { title: "Matching", description: "Memoria visual mejorada" },
      ],
      onlineText: "🟢 1,204 En línea",
      eventTimerLabel: "El evento termina en 2h",
      seasonRewards: [
        { title: "Skins Únicos", description: "Para tu coche" },
        { title: "Boosts de XP", description: "Sube de nivel rápido" },
        { title: "Copas de Torneo", description: "Conviértete en leyenda" },
      ],
    },
    liveClass: {
      badge: "🔴 CLASES EN VIVO",
      title: "Aprende en directo",
      description: "Sesiones interactivas 2 veces por semana en vivo con el instructor. Resuelve dudas en tiempo real, domina los temas complejos y acelera tu preparación. Primera clase el primer martes del mes.",
      schedule: "Martes y jueves • 19:00 CET",
      features: [
        "Transmisión en directo 2x/semana",
        "Preguntas y respuestas interactivas",
        "Análisis de exámenes reales del DGT",
        "Acceso vitalicio a las grabaciones",
        "PDFs y materiales descargables"
      ],
      cta: "Únete en Telegram"
    },
    pricing: {
      title: "Elige tu plan",
      description: "Comienza gratis y desbloquea funciones avanzadas cuando lo necesites.",
      plans: {
        cadet: {
          title: "Cadete",
          price: "Gratis",
          features: ["Tests básicos ilimitados", "Skily Lite", "Juegos con publicidad"],
          cta: "Comenzar",
        },
        monthly: {
          title: "Pro mensual",
          price: "€9.99",
          note: "/mes",
          badge: "FLEXIBLE",
          features: ["Tests ilimitados", "Skily AI completo", "Sin publicidad"],
          cta: "Suscribirse",
        },
        quarterly: {
          title: "Pro trimestral",
          price: "€24.99",
          note: "/3 meses",
          badge: "AHORRA 17%",
          features: ["Todo lo de Mensual", "Acceso por 90 días", "Soporte prioritario"],
          cta: "Elegir plan",
        },
        biannual: {
          title: "Pro semestral",
          price: "€39.99",
          note: "/6 meses",
          badge: "AHORRA 33%",
          features: ["Todo lo de Trimestral", "Acceso por 180 días", "Pack de inicio AI"],
          cta: "Elegir plan",
        },
        yearly: {
          title: "Pro anual",
          price: "€59.99",
          note: "/año",
          badge: "MEJOR VALOR",
          features: ["Todo lo anterior", "2 meses gratis", "Estatus Gold"],
          cta: "Ahorrar ahora",
        },
      },
    },
    footer: {
      menu: [
        { label: "Acerca de", href: "/about" },
        { label: "Términos", href: "/legal/terms" },
        { label: "Privacidad", href: "/legal/privacy" },
        { label: "Cookies", href: "/legal/cookies" },
        { label: "Términos de suscripción", href: "/legal/subscription" },
        { label: "Política de reembolso", href: "/legal/refund" },
        { label: "Precios", href: "/pricing" },
        { label: "Soporte", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Afiliados", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Plataforma de aprendizaje interactivo para la seguridad vial.`,
    },
    about: {
      mission: "Nuestra misión",
      heroTitle: "Tu carnet sin estrés.",
      heroSubtitle: "Creemos que prepararse para el examen no debe ser aburrido ni intimidante. Hemos creado la herramienta que nosotros mismos echábamos de menos.",
      storyTitle: "Nuestra historia",
      storyHighlight: "frustración",
      storyParagraph1: "Manuales obsoletos, lenguaje burocrático, clases aburridas. Obtener el carnet puede ser una pesadilla.",
      storyParagraph2: "Somos un equipo que pasó por esto. Decidimos arreglarlo con tecnología y gamificación.",
      storyQuote: "Estamos aquí para que apruebes jugando, no sufriendo.",
      goodLuck: "Que tengas suerte",
      founders: "Los fundadores de Skily",
    },
    referral: {
      badge: "Invitación",
      invitesYou: "te invita!",
      coinsOnRegistration: "al registrarse",
      join: "Unirse",
    },
  },
  en: {
    controls: {
      studentAccess: "Sign in",
      telegramApp: "Telegram App",
      languageLabel: "Language",
    },
    hero: {
      badge: `DGT Approved · ${examYear}`,
      titleTop: "Your driving confidence",
      titleBottom: "starts here",
      descriptionHighlight: "Forget exam anxiety and language barriers",
      descriptionRest:
        "Interactive practice, instant translations and AI explanations in English. Realistic scenarios and personalized learning. Pass on your first try.",
      pressStart: "Press Start",
    },
    stats: [
      {
        value: "97%",
        label: "Pass Rate",
        description: "Our students pass the exam on their first attempt with personalized AI",
      },
      {
        value: "3000+",
        label: "Questions",
        description: "Official questions with translations and explanations in English",
      },
      {
        value: "24/7",
        label: "Support",
        description: "In English via Telegram. Always available.",
      },
    ],
    ecosystem: {
      title: "Learning ecosystem",
      description: "Unified platform for theory, practice and progress analysis.",
      cards: {
        totalQuestions: `Official ${examYear} Database`,
        totalQuestionsDescription: "100% match with the real exam. Automatically updated.",
        categoriesTitle: "All Vehicle Classes",
        categoriesDescription: "Cars, motorcycles and professional transport.",
        simulationTitle: "Real Exam Simulation",
        simulationDescription: "Same interface, timers and stress as the real test. Train in combat conditions.",
        timer: "30 min",
        passRate: "PRO",
      },
    },
    aiSection: {
      title: "Skily & Skily AI™",
      poweredBy: "Powered by Gemini/Groq",
      description:
        "A technical coach plus an emotional mentor that break down your mistakes in English and Russian.",
      bullets: [
        "Context-aware explanations for each wrong answer",
        "Bilingual summaries in seconds",
        "Challenge Bank that prioritizes weak topics",
      ],
      challengeBank: "Challenge Bank™",
      challengeBankDescription:
        "Automatically saves missed questions and notifies you when it is time to review.",
      telegramTitle: "Telegram Mini App",
      telegramDescription: "Study inside any chat with @skilyapp_bot.",
      telegramCTA: "Open bot →",
    },
    comparison: {
      label: "Evolution vs tradition",
      title: "Why Skily?",
      featureLabel: "Feature",
      traditional: "Paper-based methods",
      skily: "Skilyapp",
      rows: [
        { feature: "Total Cost", traditional: "€400+", skily: "€4.99", skilyDesc: "/mo (billed yearly)" },
        {
          feature: "Method",
          traditional: "Boring Lectures",
          skily: "Gamified AI",
          skilyDesc: "Learn by playing.",
        },
        {
          feature: "Updates",
          traditional: "Outdated Books",
          skily: "Live Updates",
          skilyDesc: "Always fresh questions.",
        },
        {
          feature: "Support",
          traditional: "Wait for teacher",
          skily: "Instant AI",
          skilyDesc: "Explanations in seconds.",
        },
        {
          feature: "Access",
          traditional: "Fixed Schedule",
          skily: "24/7 Pocket",
          skilyDesc: "Study anywhere, anytime.",
        },
      ],
    },
    arena: {
      bannerLabel: "Season 1",
      bannerTitle: "Duel Pass Premium",
      bannerDescription: "Exclusive skins, XP multipliers and rotating weekly trials.",
      levels: "Levels",
      rewards: "Rewards",
      gamesTitle: "Games in your hangar",
      games: [
        { title: "RaceGame", description: "Beat the clock with real traffic signs" },
        { title: "Duel PvP", description: "Wager coins against other pilots" },
        { title: "GuessSign", description: "Recognize signs in 3 seconds" },
        { title: "Matching", description: "Visual memory training" },
      ],
      onlineText: "🟢 1,204 Online",
      eventTimerLabel: "Event ends in 2h",
      seasonRewards: [
        { title: "Unique Skins", description: "For your ride" },
        { title: "XP Boosts", description: "Level up faster" },
        { title: "Tournament Cups", description: "Become a legend" },
      ],
    },
    liveClass: {
      badge: "🔴 LIVE CLASSES",
      title: "Learn live with an instructor",
      description: "Interactive sessions twice a week streaming live with your instructor. Get your questions answered in real-time, master complex topics, and accelerate your exam prep. First class the first Tuesday of the month.",
      schedule: "Tuesday & Thursday • 19:00 CET",
      features: [
        "Live streaming 2x per week",
        "Interactive Q&A sessions",
        "Real DGT exam analysis",
        "Lifetime access to recordings",
        "PDFs and downloadable resources"
      ],
      cta: "Join on Telegram"
    },
    pricing: {
      title: "Choose your plan",
      description: "Start free, upgrade only if you need extra focus features.",
      plans: {
        cadet: {
          title: "Cadet",
          price: "Free",
          features: ["Unlimited basic tests", "Skily Lite", "Games with ads"],
          cta: "Get started",
        },
        monthly: {
          title: "Pro monthly",
          price: "€9.99",
          note: "/month",
          badge: "FLEXIBLE",
          features: ["Unlimited tests", "Full Skily AI", "Ad-free experience"],
          cta: "Subscribe",
        },
        quarterly: {
          title: "Pro quarterly",
          price: "€24.99",
          note: "/3 months",
          badge: "SAVE 17%",
          features: ["Everything in Monthly", "90 days access", "Priority support"],
          cta: "Get started",
        },
        biannual: {
          title: "Pro biannual",
          price: "€39.99",
          note: "/6 months",
          badge: "SAVE 33%",
          features: ["Everything in Quarterly", "180 days access", "AI Starter Pack"],
          cta: "Get started",
        },
        yearly: {
          title: "Pro yearly",
          price: "€59.99",
          note: "/year",
          badge: "BEST VALUE",
          features: ["Everything above", "2 free months", "Gold status"],
          cta: "Save now",
        },
      },
    },
    footer: {
      menu: [
        { label: "About", href: "/about" },
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
        { label: "Cookies", href: "/legal/cookies" },
        { label: "Subscription Terms", href: "/legal/subscription" },
        { label: "Refund Policy", href: "/legal/refund" },
        { label: "Pricing", href: "/pricing" },
        { label: "Support", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Affiliates", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Interactive learning platform for road safety education.`,
    },
    about: {
      mission: "Our Mission",
      heroTitle: "License without stress.",
      heroSubtitle: "We believe exam preparation shouldn't be boring or scary. We built the tool we wished we had.",
      storyTitle: "Our Story",
      storyHighlight: "pain",
      storyParagraph1: "Outdated textbooks, bureaucratic language, boring lectures. In a new country, getting a license often turns into hell.",
      storyParagraph2: "We are a team of expats who went through this. We decided to fix it with technology and gamification.",
      storyQuote: "We are here to help you pass the exam playfully, not painfully.",
      goodLuck: "Good luck",
      founders: "The Skily Founders",
    },
    referral: {
      badge: "Invitation",
      invitesYou: "invites you!",
      coinsOnRegistration: "on registration",
      join: "Join",
    },
  },
  ru: {
    controls: {
      studentAccess: "Войти",
      telegramApp: "Telegram",
      languageLabel: "Язык",
    },
    hero: {
      badge: `DGT ${examYear} · Официальные вопросы`,
      titleTop: "Твой путь к правам",
      titleBottom: "начинается здесь",
      descriptionHighlight: "Забудь про скучную зубрежку и страх экзамена",
      descriptionRest:
        "Интерактивная практика, разбор ловушек и AI-объяснения на понятном языке. Реалистичные сценарии и персонализированное обучение. Сдай с первого раза.",
      pressStart: "Нажми Start",
    },
    stats: [
      {
        value: "97%",
        label: "Сдают",
        description: "Наши студенты сдают экзамен с первого раза благодаря персонализированному AI",
      },
      {
        value: "3000+",
        label: "Вопросов",
        description: "Официальные вопросы с подробными AI-объяснениями логики правил",
      },
      {
        value: "24/7",
        label: "Поддержка",
        description: "На русском языке в Telegram. Всегда на связи.",
      },
    ],
    ecosystem: {
      title: "Экосистема подготовки",
      description: "Единая платформа для теории, практики и анализа прогресса.",
      cards: {
        totalQuestions: `Официальная база ${examYear}`,
        totalQuestionsDescription: "100% совпадение с реальным экзаменом. Обновляется автоматически.",
        categoriesTitle: "Все категории",
        categoriesDescription: "Легковые, мотоциклы и профессиональный транспорт.",
        simulationTitle: "Симуляция экзамена",
        simulationDescription: "Полная имитация условий сдачи. Таймеры, лимит ошибок и интерфейс как в DGT.",
        timer: "30 мин",
        passRate: "PRO",
      },
    },
    aiSection: {
      title: "Skily & Skily AI™",
      poweredBy: "На базе Gemini/Groq",
      description:
        "Персональный AI-репетитор, который объяснит логику правил дорожного движения простым языком.",
      bullets: [
        "Контекстные подсказки к каждому ответу",
        "Понятные конспекты по каждой теме за секунды",
        "Challenge Bank подсказывает, что повторить",
      ],
      challengeBank: "Challenge Bank™",
      challengeBankDescription:
        "Автоматически сохраняет ошибки и напоминает, когда их повторить.",
      telegramTitle: "Telegram Mini App",
      telegramDescription: "Учись прямо в чате с ботом @skilyapp_bot.",
      telegramCTA: "Открыть бот →",
    },
    comparison: {
      label: "Эволюция против традиций",
      title: "Почему Skilyapp?",
      featureLabel: "Функция",
      traditional: "Традиционные методы",
      skily: "Skilyapp",
      rows: [
        { feature: "Бюджет", traditional: "15,000₽+", skily: "299₽", skilyDesc: "/мес (при оплате за год)" },
        {
          feature: "Метод",
          traditional: "Скучные лекции",
          skily: "AI-Геймификация",
          skilyDesc: "Учись играя, без зубрёжки.",
        },
        {
          feature: "Обновления",
          traditional: "Старые книги",
          skily: "Live Updates",
          skilyDesc: "Всегда актуальные билеты.",
        },
        {
          feature: "Ошибки",
          traditional: "Ждать учителя",
          skily: "AI мгновенно",
          skilyDesc: "Объяснит ошибку за секунду.",
        },
        {
          feature: "Доступ",
          traditional: "По расписанию",
          skily: "24/7 в кармане",
          skilyDesc: "С любого устройства.",
        },
      ],
    },
    arena: {
      bannerLabel: "Сезон 1",
      bannerTitle: "Duel Pass Premium",
      bannerDescription: "Эксклюзивные скины, XP‑бусты и новые испытания каждую неделю.",
      levels: "Уровней",
      rewards: "Награды",
      gamesTitle: "Игры в ангаре",
      games: [
        { title: "RaceGame", description: "Гонка со знаками в реальном формате" },
        { title: "Duel PvP", description: "Ставки на монеты против других пилотов" },
        { title: "GuessSign", description: "Угадай знак за 3 секунды" },
        { title: "Matching", description: "Прокачка визуальной памяти" },
      ],
      onlineText: "🟢 1,204 Online",
      eventTimerLabel: "Событие заканчивается через 2ч",
      seasonRewards: [
        { title: "Уникальные скины", description: "Для твоего авто" },
        { title: "XP Бусты", description: "Качайся быстрее" },
        { title: "Турнирные Кубки", description: "Стань легендой" },
      ],
    },
    liveClass: {
      badge: "🔴 ЖИВЫЕ УРОКИ",
      title: "Учись в прямом эфире",
      description: "Интерактивные занятия 2 раза в неделю прямо с преподавателем. Задавай вопросы в реальном времени, разбирай сложные темы и ускоряй подготовку. Первый класс - в первый вторник месяца.",
      schedule: "Вторник и четверг • 19:00 CET",
      features: [
        "Прямой эфир 2 раза в неделю",
        "Интерактивные вопросы & ответы",
        "Разборы реальных билетов экзамена",
        "Вечный доступ к записям занятий",
        "PDF-материалы и шпаргалки"
      ],
      cta: "Присоединиться в Telegram"
    },
    pricing: {
      title: "Выбери тариф",
      description: "Начни бесплатно. Улучшенные функции можно подключить позже.",
      plans: {
        cadet: {
          title: "Кадет",
          price: "Бесплатно",
          features: ["Базовые тесты без лимита", "Skily Lite", "Игры с рекламой"],
          cta: "Начать",
        },
        monthly: {
          title: "Pro (месяц)",
          price: "299₽",
          note: "/мес",
          badge: "ГИБКИЙ",
          features: ["Безлимитные тесты", "Полный Skily AI", "Без рекламы"],
          cta: "Оформить",
        },
        quarterly: {
          title: "Pro (3 месяца)",
          price: "799₽",
          note: "/3 мес",
          badge: "ВЫГОДНО",
          features: ["Всё из тарифа на месяц", "Экономия 17%", "Приоритетная поддержка"],
          cta: "Выбрать",
        },
        biannual: {
          title: "Pro (6 месяцев)",
          price: "1,499₽",
          note: "/6 мес",
          badge: "ХИТ",
          features: ["Всё из тарифа 3 месяца", "Экономия 33%", "AI Пакет в подарок"],
          cta: "Выбрать",
        },
        yearly: {
          title: "Pro (год)",
          price: "2,499₽",
          note: "/год",
          badge: "ЛУЧШАЯ ЦЕНА",
          features: ["Все функции Premium", "2 месяца в подарок", "Золотой статус"],
          cta: "Сэкономить",
        },
      },
    },
    footer: {
      menu: [
        { label: "О нас", href: "/about" },
        { label: "Живой курс", href: "/curso" },
        { label: "Условия", href: "/legal/terms" },
        { label: "Политика", href: "/legal/privacy" },
        { label: "Cookies", href: "/legal/cookies" },
        { label: "Условия подписки", href: "/legal/subscription" },
        { label: "Политика возврата", href: "/legal/refund" },
        { label: "Цены", href: "/pricing" },
        { label: "Поддержка", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Партнёрам", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Интерактивная платформа для изучения безопасности дорожного движения.`,
    },
    about: {
      mission: "Наша миссия",
      heroTitle: "Права без стресса.",
      heroSubtitle: "Мы верим, что подготовка к экзамену не должна быть скучной или пугающей. Мы создали инструмент, которого нам самим не хватало.",
      storyTitle: "Наша история",
      storyHighlight: "боли",
      storyParagraph1: "Устаревшие учебники, сухой юридический язык, скучные лекции. Получение прав часто превращается в бесконечную зубрежку.",
      storyParagraph2: "Мы — команда, которая прошла через это. Мы решили исправить это с помощью технологий и геймификации.",
      storyQuote: "Мы здесь, чтобы вы сдали экзамен играючи, а не заучивая.",
      goodLuck: "Удачи",
      founders: "Основатели Skily",
    },
    referral: {
      badge: "Приглашение",
      invitesYou: "приглашает тебя!",
      coinsOnRegistration: "при регистрации",
      join: "Присоединиться",
    },
  },
};