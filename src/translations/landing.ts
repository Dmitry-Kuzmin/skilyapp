import { Language } from "@/contexts/LanguageContext";

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
      badge: "Skily AI — Local Edition",
      titleTop: "Domina la carretera",
      titleBottom: "sin miedo al examen",
      descriptionHighlight: "Inteligencia Artificial aplicada a la formación DGT",
      descriptionRest:
        "Simulaciones realistas, música enfocada y un copiloto virtual que traduce todo al momento.",
      pressStart: "Pulsa Start",
    },
    stats: [
      {
        value: "97%",
        label: "Aprobados",
        description: "Nuestros pilotos pasan la teoría en menos de 6 semanas",
      },
      {
        value: "1000+",
        label: "Preguntas",
        description: "Banco oficial actualizado con los cambios de la DGT",
      },
      {
        value: "24/7",
        label: "Disponible",
        description: "Web, Telegram Mini App y soporte en español",
      },
    ],
    ecosystem: {
      title: "Ecosistema DGT",
      description: "Práctica guiada, seguimiento de errores y simulador 1:1 con el examen real.",
      cards: {
        totalQuestions: "1000+ preguntas verificadas",
        categoriesTitle: "Todas las categorías",
        categoriesDescription: "Permisos B, A y pruebas complementarias incluidas.",
        simulationTitle: "Simulación oficial cronometrada",
        simulationDescription: "30 preguntas, máximo 3 fallos. Idéntico al examen real.",
        timer: "30 minutos",
        passRate: "90%",
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
      telegramDescription: "Estudia desde cualquier chat con @sdadimtutbot.",
    },
    comparison: {
      label: "Evolución vs tradición",
      title: "¿Por qué Skily?",
      featureLabel: "Característica",
      traditional: "Autoescuela tradicional",
      skily: "Skilyapp",
      rows: [
        { feature: "Precio medio", traditional: "€300 - €600", skily: "€0 - €60" },
        {
          feature: "Actualización de preguntas",
          traditional: "Libros / PDF anuales",
          skily: "Diaria (cloud)",
        },
        {
          feature: "Explicación de fallos",
          traditional: "Depende del profesor",
          skily: "IA bilingüe en segundos",
        },
        {
          feature: "Disponibilidad",
          traditional: "Horario fijo",
          skily: "Web + Telegram 24/7",
        },
        {
          feature: "Diversión",
          traditional: "Clases teóricas",
          skily: "Gamificación + duelos",
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
        { title: "Matching", description: "Memoria visual turbo" },
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
        { label: "Términos", href: "/terms" },
        { label: "Privacidad", href: "/privacy" },
        { label: "Soporte", href: "https://t.me/sdadimtutbot", external: true },
        { label: "Afiliados", href: "/partners" },
      ],
      note: "© 2025 Skilyapp. La nueva forma de aprobar la DGT.",
    },
  },
  en: {
    controls: {
      studentAccess: "Student access",
      telegramApp: "Telegram App",
      languageLabel: "Language",
    },
    hero: {
      badge: "Skily AI — Local Edition",
      titleTop: "Own the asphalt",
      titleBottom: "without fearing the test",
      descriptionHighlight: "AI copilots built for DGT preparation",
      descriptionRest:
        "Realistic mock exams, focus music and instant bilingual explanations inside your browser.",
      pressStart: "Press Start",
    },
    stats: [
      {
        value: "97%",
        label: "Pass rate",
        description: "Most learners finish theory prep in under 6 weeks",
      },
      {
        value: "1000+",
        label: "Questions",
        description: "Official items refreshed whenever DGT updates",
      },
      {
        value: "24/7",
        label: "Availability",
        description: "Web app + Telegram Mini App with English support",
      },
    ],
    ecosystem: {
      title: "DGT ecosystem",
      description: "Guided practice, error tracking and a 1:1 simulator with the real exam.",
      cards: {
        totalQuestions: "1000+ curated questions",
        categoriesTitle: "Every category",
        categoriesDescription: "Permit B, A and complementary modules included.",
        simulationTitle: "Official timed simulation",
        simulationDescription: "30 questions, max 3 mistakes. Same flow as the real test.",
        timer: "30 minutes",
        passRate: "90%",
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
      telegramDescription: "Study inside any chat with @sdadimtutbot.",
    },
    comparison: {
      label: "Evolution vs tradition",
      title: "Why Skily?",
      featureLabel: "Feature",
      traditional: "Traditional school",
      skily: "Skilyapp",
      rows: [
        { feature: "Average price", traditional: "€300 - €600", skily: "€0 - €60" },
        {
          feature: "Question updates",
          traditional: "Printed books / PDFs",
          skily: "Daily cloud sync",
        },
        {
          feature: "Error explanations",
          traditional: "Ask the teacher",
          skily: "AI answers instantly",
        },
        {
          feature: "Availability",
          traditional: "Fixed schedule",
          skily: "Web + Telegram 24/7",
        },
        {
          feature: "Engagement",
          traditional: "Lectures",
          skily: "Gamified arena",
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
        { title: "Matching", description: "Turbo visual memory" },
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
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Support", href: "https://t.me/sdadimtutbot", external: true },
        { label: "Affiliates", href: "/partners" },
      ],
      note: "© 2025 Skilyapp. The smarter way to pass the DGT exam.",
    },
  },
  ru: {
    controls: {
      studentAccess: "Войти",
      telegramApp: "Telegram",
      languageLabel: "Язык",
    },
    hero: {
      badge: "Skily AI — Испания",
      titleTop: "Сдай теорию DGT",
      titleBottom: "с первого раза",
      descriptionHighlight: "AI‑копилот, адаптированный под русскоязычных учеников",
      descriptionRest:
        "Реальные экзаменационные вопросы, музыка для концентрации и мгновенные переводы объяснений.",
      pressStart: "Нажми Start",
    },
    stats: [
      {
        value: "97%",
        label: "Сдают экзамен",
        description: "Большинство студентов завершают подготовку за 4–6 недель",
      },
      {
        value: "1000+",
        label: "Вопросов",
        description: "Актуальная база DGT с автоматическими обновлениями",
      },
      {
        value: "24/7",
        label: "Доступ",
        description: "Веб + Telegram Mini App + поддержка на русском",
      },
    ],
    ecosystem: {
      title: "Экосистема подготовки",
      description: "Тренажёр, Challenge Bank и симулятор, который повторяет официальный экзамен.",
      cards: {
        totalQuestions: "1000+ проверенных вопросов",
        categoriesTitle: "Все категории",
        categoriesDescription: "B, A и дополнительные модули.",
        simulationTitle: "Тайминг как на экзамене",
        simulationDescription: "30 вопросов, максимум 3 ошибки. Полная имитация процесса.",
        timer: "30 минут",
        passRate: "90%",
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
      telegramDescription: "Учись прямо в чате с ботом @sdadimtutbot.",
    },
    comparison: {
      label: "Эволюция против традиций",
      title: "Почему Skilyapp?",
      featureLabel: "Функция",
      traditional: "Обычная автошкола",
      skily: "Skilyapp",
      rows: [
        { feature: "Стоимость", traditional: "€300 - €600", skily: "€0 - €60" },
        {
          feature: "Обновление вопросов",
          traditional: "Печатные материалы",
          skily: "Ежедневные обновления",
        },
        {
          feature: "Объяснение ошибок",
          traditional: "Когда будет преподаватель",
          skily: "AI мгновенно",
        },
        {
          feature: "Доступ",
          traditional: "Расписание",
          skily: "24/7 из браузера и Telegram",
        },
        {
          feature: "Интерес",
          traditional: "Лекции",
          skily: "Игры, дуэли и сезонные награды",
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
        { label: "Условия", href: "/terms" },
        { label: "Политика", href: "/privacy" },
        { label: "Поддержка", href: "https://t.me/sdadimtutbot", external: true },
        { label: "Партнёрам", href: "/partners" },
      ],
      note: "© 2025 Skilyapp. Мы помогаем русскоязычным ученикам сдать DGT.",
    },
  },
};
