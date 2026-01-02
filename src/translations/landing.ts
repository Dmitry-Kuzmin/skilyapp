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
        badge: string;
        features: string[];
        cta: string;
      };
      yearly: {
        title: string;
        price: string;
        note: string;
        badge: string;
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

export const landingTranslations: Record<Language, LandingCopy> = {
  es: {
    controls: {
      studentAccess: "Acceso alumnos",
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
        value: "1000+",
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
      title: "Skily & Lumi AI™",
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
        { feature: "Coste Total", traditional: "€400+", skily: "€19", skilyDesc: "Pago único. Sin sorpresas." },
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
          badge: "Popular",
          features: ["Tests ilimitados", "Skily AI completo", "Sin publicidad"],
          cta: "Suscribirse",
        },
        yearly: {
          title: "Pro anual",
          price: "€59.99",
          note: "/año",
          badge: "-50% OFF",
          features: ["Todo lo de mensual", "2 meses gratis", "Prioridad en duelos"],
          cta: "Ahorrar ahora",
        },
      },
    },
    footer: {
      menu: [
        { label: "Acerca de", href: "/about" },
        { label: "Términos", href: "/terms" },
        { label: "Privacidad", href: "/privacy" },
        { label: "Términos de suscripción", href: "/subscription-terms" },
        { label: "Política de reembolso", href: "/refund-policy" },
        { label: "Precios", href: "/pricing" },
        { label: "Soporte", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Afiliados", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Plataforma de aprendizaje interactivo para la seguridad vial.`,
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
      studentAccess: "Student access",
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
        value: "1000+",
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
      title: "Skily & Lumi AI™",
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
        { feature: "Total Cost", traditional: "€400+", skily: "€19", skilyDesc: "One-time payment." },
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
          badge: "Popular",
          features: ["Unlimited tests", "Full Skily AI", "Ad-free experience"],
          cta: "Subscribe",
        },
        yearly: {
          title: "Pro yearly",
          price: "€59.99",
          note: "/year",
          badge: "-50% OFF",
          features: ["Everything in monthly", "2 free months", "Duel priority"],
          cta: "Save now",
        },
      },
    },
    footer: {
      menu: [
        { label: "About", href: "/about" },
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Subscription Terms", href: "/subscription-terms" },
        { label: "Refund Policy", href: "/refund-policy" },
        { label: "Pricing", href: "/pricing" },
        { label: "Support", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Affiliates", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Interactive learning platform for road safety education.`,
    },
  },
  ru: {
    controls: {
      studentAccess: "Войти",
      telegramApp: "Telegram",
      languageLabel: "Язык",
    },
    hero: {
      badge: `ГИБДД ${examYear} · Официальные вопросы`,
      titleTop: "Твой путь к правам",
      titleBottom: "начинается здесь",
      descriptionHighlight: "Забудь про страх экзамена и языковой барьер",
      descriptionRest:
        "Интерактивная практика, мгновенные переводы и AI-объяснения на русском. Реалистичные сценарии и персонализированное обучение. Сдай с первого раза.",
      pressStart: "Нажми Start",
    },
    stats: [
      {
        value: "97%",
        label: "Сдают",
        description: "Наши студенты сдают экзамен с первого раза благодаря персонализированному AI",
      },
      {
        value: "1000+",
        label: "Вопросов",
        description: "Официальные вопросы с переводами и объяснениями на русском",
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
        simulationDescription: "Полная имитация условий сдачи. Таймеры, лимит ошибок и интерфейс как в ГИБДД.",
        timer: "30 мин",
        passRate: "PRO",
      },
    },
    aiSection: {
      title: "Skily & Lumi AI™",
      poweredBy: "На базе Gemini/Groq",
      description:
        "Технический тренер и эмоциональный наставник, которые объяснят ошибку на русском и испанском.",
      bullets: [
        "Контекстные подсказки к каждому ответу",
        "Двуязычные конспекты за секунды",
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
        { feature: "Бюджет", traditional: "€400+", skily: "€19", skilyDesc: "Платишь один раз." },
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
          price: "€9.99",
          note: "/мес",
          badge: "Популярно",
          features: ["Безлимитные тесты", "Полный Skily AI", "Без рекламы"],
          cta: "Оформить",
        },
        yearly: {
          title: "Pro (год)",
          price: "€59.99",
          note: "/год",
          badge: "-50% OFF",
          features: ["Все из Pro (месяц)", "2 месяца в подарок", "Приоритет в дуэлях"],
          cta: "Сэкономить",
        },
      },
    },
    footer: {
      menu: [
        { label: "О нас", href: "/about" },
        { label: "Условия", href: "/terms" },
        { label: "Политика", href: "/privacy" },
        { label: "Условия подписки", href: "/subscription-terms" },
        { label: "Политика возврата", href: "/refund-policy" },
        { label: "Цены", href: "/pricing" },
        { label: "Поддержка", href: "https://t.me/skilyapp_bot", external: true },
        { label: "Партнёрам", href: "#partnership" },
      ],
      note: `© ${currentYear} Skilyapp. Интерактивная платформа для изучения безопасности дорожного движения.`,
    },
    referral: {
      badge: "Приглашение",
      invitesYou: "приглашает тебя!",
      coinsOnRegistration: "при регистрации",
      join: "Присоединиться",
    },
  },
};