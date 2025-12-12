import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
// ОПТИМИЗАЦИЯ: Убрали статический импорт supabase - он грузится только когда нужен profileId
// Это критично для лендинга - supabase не должен грузиться на /
import { UserContext } from "./UserContext";
import { helpCenterTranslations } from "@/translations/helpCenter";

export type Language = 'es' | 'en' | 'ru';

const SUPPORTED_LANGUAGES: Language[] = ['es', 'en', 'ru'];
const DEFAULT_LANGUAGE: Language = 'en';

const isBrowser = typeof window !== 'undefined';

const normalizeLanguage = (lang?: string | null): Language | null => {
  if (!lang) return null;
  const short = lang.split('-')[0]?.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(short as Language) ? (short as Language) : null;
};

const getStoredLanguage = (): Language | null => {
  if (!isBrowser) return null;
  const saved = localStorage.getItem('app_language');
  return normalizeLanguage(saved);
};

const detectNavigatorLanguage = (): Language | null => {
  if (!isBrowser || typeof navigator === 'undefined') return null;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
};

const detectPreferredLanguage = (): Language => {
  return (
    getStoredLanguage() ||
    detectNavigatorLanguage() ||
    DEFAULT_LANGUAGE
  );
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations object
const translations: Record<Language, Record<string, any>> = {
  es: {
    // Navigation
    home: "Inicio",
    tests: "Pruebas",
    learning: "Aprendizaje",
    games: "Juegos",
    profile: "Perfil",
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    
    // Profile
    editProfile: "Editar perfil",
    changeName: "Cambiar nombre",
    changeAvatar: "Cambiar avatar",
    uploadPhoto: "Subir foto",
    deleteAvatar: "Eliminar avatar",
    save: "Guardar",
    cancel: "Cancelar",
    email: "Correo electrónico",
    linkAccount: "Vincular cuenta",
    accountLinked: "Cuenta vinculada ✅",
    loginWithEmail: "Iniciar sesión con email",
    
    // Settings
    settings: "Configuración",
    language: "Idioma",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    sound: "Sonido",
    notifications: "Notificaciones",
    
    // Links
    achievements: "Mis logros",
    duelHistory: "Historia de duelos",
    support: "Soporte",
    
    // Messages
    nameSaved: "Nombre guardado",
    avatarUploaded: "Avatar subido",
    avatarDeleted: "Avatar eliminado",
    languageChanged: "Idioma cambiado",
    themeChanged: "Tema cambiado",
    notificationsEnabled: "Notificaciones activadas",
    notificationsDisabled: "Notificaciones desactivadas",
    loggedOut: "Sesión cerrada",
    fileTooLarge: "Archivo demasiado grande (máx. 3MB)",
    onlyImages: "Solo se pueden subir imágenes",
    accountsLinked: "Cuentas vinculadas exitosamente",
    
    // Account & Auth
    accountsAndLogin: "Cuentas y acceso",
    telegramLinked: "Telegram vinculado",
    emailLinked: "Email vinculado",
    linkEmailAccount: "Vincular cuenta de email",
    authPrompt: "Inicia sesión con email para guardar tu progreso",
    
    // Auth Modal
    auth: {
      identification: "Identificación",
      welcomeBack: "Bienvenido de nuevo",
      welcomeBackWithName: "Bienvenido de nuevo, {{name}}",
      createAccount: "Crear cuenta",
      emailPrompt: "Introduce tu email — iniciaremos sesión o crearemos una cuenta.",
      accountVerified: "Tu cuenta está verificada en este dispositivo.",
      newUser: "Parece que eres nuevo aquí.",
      emailPlaceholder: "nombre@empresa.com",
      tapArrow: "Pulsa la flecha para continuar",
      password: "Contraseña",
      passwordPlaceholder: "Introduce tu contraseña",
      signIn: "Iniciar sesión",
      createAccountButton: "Crear cuenta",
      changeEmail: "Cambiar",
      forgotPassword: "¿Olvidaste tu contraseña?",
      alternativeLogin: "O usa otros métodos de inicio arriba",
      deviceLogin: "Iniciar sesión con Face ID / Touch ID",
      deviceLoginFallback: "Iniciar sesión con tu dispositivo",
      noDeviceAccess: "¿Sin acceso al dispositivo? Usa email o redes sociales.",
      orContinueWith: "O continuar con",
      footerText: "Usamos tu email o dispositivo para iniciar sesión o crear una nueva cuenta Skily. Sin pasos extras.",
      errors: {
        invalidEmail: "Por favor, introduce un email válido.",
        checkFailed: "No se pudo verificar el email. Inténtalo de nuevo.",
        alreadyRegistered: "Este email ya está registrado. Intenta iniciar sesión.",
        invalidCredentials: "Email o contraseña incorrectos",
        validationError: "Error de validación",
        genericError: "Ocurrió un error. Inténtalo de nuevo.",
        minPassword: "La contraseña debe tener al menos 6 caracteres",
        incompleteUserData: "Error: datos de usuario incompletos",
        widgetLoadFailed: "No se pudo cargar el widget de autorización. Verifica tu conexión a internet.",
      },
      legalFooter: "Al continuar, aceptas los",
      terms: "Términos",
      privacy: "Política de privacidad",
      success: {
        registered: "Registro exitoso",
        loggedIn: "Sesión iniciada",
        welcome: "¡Bienvenido!",
        welcomeUser: "¡Bienvenido, {{name}}!",
      },
      passkey: {
        loginSuccess: "✅ Sesión iniciada",
        loginSuccessDesc: "¡Bienvenido de nuevo!",
        loginInProgress: "Iniciando sesión...",
        notConfigured: "Passkey no configurado",
        notConfiguredDesc: "Inicia sesión con email y agrega el dispositivo en Configuración → Seguridad",
        cancelled: "Inicio de sesión cancelado",
        cancelledDesc: "Puedes iniciar sesión con email o intentar Passkey de nuevo",
        tooManyAttempts: "Demasiados intentos",
        tooManyAttemptsDesc: "Espera un minuto o inicia sesión con email",
        loginFailed: "No se pudo iniciar sesión",
        loginFailedDesc: "Intenta de nuevo o usa el inicio de sesión con email",
        error: "Error de inicio de sesión",
        errorDesc: "No se pudo iniciar sesión con Passkey. Usa el inicio de sesión con email",
        or: "O",
        noDeviceAccess: "¿Sin acceso al dispositivo? Usa el inicio de sesión con email arriba",
        deviceTypes: "Face ID • Touch ID • Windows Hello",
      },
      partner: {
        specialOffer: "¡Oferta especial del socio!",
        getPremium: "Obtener Premium",
        premium30Days: "Premium por 30 días gratis",
        onRegistration: "al registrarse",
        campaign: "Campaña",
        close: "Cerrar",
      },
    },
    
    // Other
    version: "v1.0.0 © 2025 Sdadim",
    dashboard: {
      onlineStatus: "Sistema en línea",
      licenseStatus: "Licencia B",
      cockpitButton: "Cabina",
      heroGreeting: "¡Hola, piloto!",
      heroEfficiencyPrefix: "Tu eficiencia es",
      heroStatus: {
        ready: "Los sensores indican que estás listo para la nueva sesión.",
        progress: "Sigue entrenando para subir la puntuación.",
        start: "Haz más tests para aumentar tu preparación.",
      },
      stats: {
        xp: "Experiencia",
        tests: "Tests",
        coins: "Monedas",
      },
      startButton: "Comenzar",
      level: "Nivel",
    },
    online: "En línea",
    xpProgress: "XP hasta siguiente nivel",
    
    // Tests Page
    practiceTests: "Pruebas de práctica",
    practiceMode: "Modo práctica",
    examMode: "Modo examen",
    random: "Aleatorio",
    randomDesc: "Elige entre 10, 20, 30 o 40 preguntas aleatorias",
    incorrectlyAnswered: "Respondidas incorrectamente",
    incorrectlyAnsweredDesc: "Preguntas que has respondido incorrectamente (guardadas automáticamente)",
    savedQuestions: "Preguntas guardadas",
    savedQuestionsDesc: "Preguntas que guardaste manualmente o automáticamente",
    challengeBankAdded: "Hemos añadido esta pregunta a tu Banco de Preguntas™",
    challengeBankDesc: "Todas las preguntas que respondiste incorrectamente se guardan automáticamente para práctica adicional",
    dontShowAgain: "No mostrar",
    // Skily AI Assistant
    lumiGreeting: "¡Hola! Soy Skily 💡",
    lumiWelcome: "¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!",
    lumiHintButton: "Dame una pista",
    lumiHelpButton: "Ayúdame a entender esto",
    lumiPlaceholder: "Haz tu pregunta aquí...",
    skilyChat: {
      title: "Asistente IA",
      subtitle: "Asistente inteligente",
      placeholder: "Hacer una pregunta...",
      neuralCore: "Núcleo Neural IA",
      online: "EN LÍNEA",
      processing: "PROCESANDO...",
      ready: "Sistemas listos.",
      description: "Acceso a la base de datos DGT en tiempo real. Haz tu pregunta.",
      modelInfo: "MODELO: GEMINI-2.5-FLASH // LATENCIA: 24ms",
      inputPlaceholder: "Escribe tu pregunta...",
      analyzing: "Analizando reglas...",
    },
    cryptomusPayment: {
      title: "Confirmación de pago",
      description: "Verifique los detalles del pago antes de proceder al pago",
      detailsTitle: "Detalles del pago",
      item: "Artículo",
      amount: "Cantidad",
      orderId: "ID de pedido",
      copyOrderId: "Copiar ID de pedido",
      orderIdCopied: "ID de pedido copiado",
      checkingStatus: "Verificando estado del pago...",
      paymentCompleted: "¡Pago completado con éxito!",
      paymentFailed: "Pago no completado",
      securityInfo: "El pago se procesa a través del servicio seguro Cryptomus. Sus datos están protegidos.",
      cancel: "Cancelar",
      proceedToPayment: "Proceder al pago",
      navigating: "Redirigiendo...",
    },
    lumiCollapse: "Contraer",
    lumiExpand: "Expandir",
    lumiShowOriginal: "Mostrar original",
    lumiShowTranslation: "Mostrar traducción al ruso",
    hardestQuestions: "Preguntas difíciles",
    hardestQuestionsDesc: "Las preguntas que la mayoría de usuarios suelen responder incorrectamente",
    masteryMode: "Modo maestría",
    masteryModeDesc: "Repite hasta responder todo correctamente. Las incorrectas se repiten",
    examSimulator: "Simulador de examen",
    examSimulatorDesc: "Realiza una prueba cronometrada. Diseñada para imitar el examen real",
    moduleTest: "Prueba de módulo",
    moduleTestDesc: "Prueba tus conocimientos en un módulo específico",
    finalTest: "Prueba final",
    finalTestDesc: "La prueba final cubre todos los módulos y es la prueba definitiva de tus conocimientos",
    level: "Nivel",
    points: "Puntos",
    lessons: "Lecciones",
    correctOnFirstTry: "Correcto al primer intento",
    answeredQuestions: "Preguntas respondidas",
    correctAnswers: "Respuestas correctas",
    moreStatistics: "MÁS ESTADÍSTICAS",
    leaderboard: "Tabla de clasificación",
    you: "Tú",
    inviteFriends: "INVITAR AMIGOS",
    selectQuestionCount: "Elige el número de preguntas",
    startTest: "Comenzar test",
    testsPage: {
      title: "Centro de pruebas",
      subtitle: "Elige el modo y mejora tus habilidades",
      randomTest: "Prueba aleatoria",
      randomTestDesc: "Elige la cantidad de preguntas para una verificación rápida de conocimientos",
      questionCount: "Cantidad de preguntas:",
      startButton: "Comenzar prueba",
      exam: "Examen",
      examDesc: "Simulador de examen oficial DGT",
      blitz: "Blitz",
      blitzDesc: "20 preguntas en 5 minutos",
      marathon: "Maratón",
      marathonDesc: "Hasta que respondas perfectamente",
      challengeBank: "Errores",
      challengeBankDesc: "{{count}} preguntas",
      hardest: "Difíciles",
      hardestDesc: "TOP-50",
      topicsTitle: "Temas del curso",
      questions: "preguntas",
      stats: {
        accuracy: "Precisión",
        answered: "Respondidas",
        errors: "Errores",
        level: "Nivel",
      },
    },
    
    // Learning map / curriculum
    completed: "Completado",
    in_progress: "En progreso",
    locked: "Bloqueado",
    coming_soon: "Próximamente",
    module: "Módulo",
    progress: "Progreso",
    continue_topic: "Continuar módulo",
    block: "Bloque",
    
    // Footer
    footer: {
      companyDescription: "Plataforma educativa para la preparación de exámenes DGT en España",
      address: "España, Tarragona",
      contact: "Contacto: support@skilyapp.com",
      legal: "Legal",
      blog: "Blog",
      help: "Ayuda",
      about: "Acerca de",
      terms: "Términos y condiciones",
      privacy: "Política de privacidad",
      subscriptionTerms: "Términos de suscripción",
      pricing: "Precios",
      refundPolicy: "Política de reembolso",
      resources: "Recursos",
      becomePartner: "Conviértete en afiliado",
      partnerPending: "Solicitud en revisión",
      partnerDashboard: "Panel de afiliado",
      support: "Soporte",
      supportEmail: "support@skilyapp.com",
      copyright: "© 2025 Sdadim. Todos los derechos reservados.",
      rightsReserved: "Todos los derechos reservados",
    },
    boostShop: {
      title: "Tienda",
      tabs: {
        boosts: "Impulsos",
        coins: "Monedas",
        premium: "Premium",
        history: "Historial",
      },
      sections: {
        popular: "Impulsos populares",
        premium: "Impulsos premium",
        premiumBadge: "Premium",
        empty: "Los impulsos llegarán pronto",
      },
      boostNames: {
        fifty_fifty: {
          name: "50/50",
          description: "Elimina dos respuestas incorrectas",
        },
        time_extend: {
          name: "+30 segundos",
          description: "Añade tiempo extra para preguntas difíciles",
        },
        hint: {
          name: "Pista",
          description: "Muestra una explicación al instante",
        },
        skip: {
          name: "Saltar",
          description: "Pasa la pregunta sin perder la racha",
        },
        translate: {
          name: "Traducción",
          description: "Traduce la pregunta y las respuestas",
        },
      },
      coins: {
        topUpTitle: "Recarga tu saldo de monedas",
        packLabel: "{{amount}} monedas",
        bonusLabel: "+{{bonus}} bonus",
        buyButton: "Comprar",
        premiumHint: "💡 Consigue más monedas con Premium",
        successTitle: "✅ Pago exitoso!",
        successDescription: "Recibiste {{amount}} monedas",
        purpose: "Para boosts, duelos y entradas premium",
        perCoin: "€{{price}} / moneda",
        deliveryHint: "Entrega instantánea · Pagos seguros",
        buyPackAria: "Comprar paquete de {{amount}} monedas",
        tags: {
          starter: "Ideal para empezar",
          bestValue: "Mejor oferta",
        },
        descriptions: {
          starter: "Recarga rápida para boosts de última hora",
          grinder: "Ideal para duelos diarios y rachas",
          pro: "Mantente listo durante sesiones largas",
          elite: "Control total para torneos y skins premium",
        },
        helpers: {
          starter: "Empieza pequeño y sube cuando quieras",
          grinder: "Suficiente para probar cada boost y compartir",
          pro: "Pack equilibrado para progresar toda la semana",
          elite: "Desbloquea paquetes premium y cosméticos raros al instante",
        },
      },
      premium: {
        title: "Suscripción Premium",
        subtitle: "Obtén el máximo de tu aprendizaje",
        activeBadge: "Activa",
        benefits: {
          unlimitedTests: "Acceso ilimitado a todos los tests",
          bonusCoins: "+50% de monedas al estudiar",
          duelPassRewards: "Recompensas Premium de Duel Pass",
          instantHints: "Sin anuncios y pistas instantáneas",
        },
        monthlyLabel: "Mes",
        yearlyLabel: "Año",
        lifetimeLabel: "Para siempre",
        yearlySuffix: "/año",
        lifetimeSuffix: "Una vez para siempre",
        savingsLabel: "Ahorro 50%",
        bestBadge: "Mejor",
        popularBadge: "Popular",
        chooseButton: "Elegir",
        activeButton: "Activa",
      },
      duelPass: {
        title: "Duel Pass",
        description: "Obtén recompensas exclusivas por cada nivel. Premium duplica todas las recompensas.",
        button: "Abrir Duel Pass",
        toastTitle: "Duel Pass",
        toastDescription: "Abre Duel Pass en la página principal",
      },
      history: {
        title: "Historial de monedas",
        operationsCount: "{{count}} operaciones",
        filters: {
          all: "Todo",
          earn: "Ingresos",
          spend: "Gastos",
          purchase: "Compras",
          reward: "Recompensas",
        },
        empty: {
          all: {
            title: "Aquí aparecerán tus transacciones",
            description: "Empieza a ganar monedas haciendo tests y duelos.",
            premiumHint: "💡 Premium duplica las recompensas",
          },
          earn: {
            title: "Sin ingresos",
            description: "Haz tests, gana duelos y reclama bonos diarios.",
          },
          spend: {
            title: "Sin gastos",
            description: "Compra impulsos y mejora tus resultados.",
          },
          purchase: {
            title: "Sin compras",
            description: "Recarga monedas o consigue Premium para más opciones.",
          },
          reward: {
            title: "Sin recompensas",
            description: "Consigue recompensas por Duel Pass, referidos y logros.",
          },
        },
        tryOtherFilter: "Prueba otro filtro",
        badges: {
          purchase: "Compra",
          reward: "Recompensa",
        },
      },
      buttons: {
        buy: "Comprar",
        select: "Elegir",
        active: "Activa",
        insufficient: "No alcanza",
        premium: "Premium",
      },
      toasts: {
        errorTitle: "❌ Error",
        needLogin: "Debes iniciar sesión",
        sessionError: "No se pudo obtener el enlace de pago",
        historyError: "Error al cargar el historial",
        paymentSuccessTitle: "✅ Pago exitoso!",
        paymentSuccessDescription: "Recibiste {{amount}} monedas",
        purchaseSuccessTitle: "✅ Compra exitosa!",
        purchaseSuccessDescription: "{{name}} se agregó al inventario",
        purchaseErrorTitle: "❌ Error de compra",
        purchaseErrorDescription: "No se pudo completar la compra. Inténtalo de nuevo.",
        rlsError: "Error de acceso. Actualiza la página e inicia sesión.",
        insufficientCoins: "Necesitas {{amount}} monedas más",
      },
      transactions: {
        coinsPurchasePaddle: "Compra de monedas: {{amount}}",
        premiumPurchase: "Suscripción Premium ({{type}})",
        premiumType: {
          monthly: "mes",
          yearly: "año",
          forever: "para siempre",
        },
        duelPassPurchase: "Compra de Duel Pass",
        duelPassReward: "Recompensa de Duel Pass{{level}}{{premium}}",
        duelPassRewardLevelSuffix: " (nivel {{level}})",
        duelPassRewardPremiumSuffix: " [Premium]",
        referralReward: "Recompensa de referidos: {{name}}",
        referralJoined: "Bono por registro con referido",
        referralFallbackName: "amigo",
        coinsEarnedTest: "Recompensa por test",
        coinsEarnedDuel: "Recompensa por duelo",
        coinsEarnedDaily: "Bono diario",
        coinsEarnedPremiumBonus: "Bono Premium",
        coinsSpentBoost: "Compra de impulso: {{name}}",
        coinsSpentSkin: "Compra de skin",
        coinsSpentDuelEntry: "Entrada a duelo",
        bet: "Apuesta en duelo",
        win: "Victoria en duelo",
        refund: "Devolución de apuesta",
        commission: "Comisión del sistema",
      },
    },
    profileMenu: {
      title: "Perfil",
      loading: "Cargando perfil...",
      notFound: "Perfil no encontrado",
      xpLabel: "XP",
      xpDescription: "Puntos de experiencia",
      notifications: "Notificaciones",
      achievements: "Mis logros",
      invite: "Invitar",
      inventory: "Inventario",
      achievementsDesc: "Sigue tu progreso y desbloquea nuevas recompensas",
      blog: "Blog",
      legal: "Información legal",
      connectedAccounts: "Cuentas conectadas",
      helpCenter: "Centro de ayuda",
      adminPanel: "Panel de administrador",
      connect: "Conectar",
      connected: "Conectado",
      notConnected: "No conectado",
      appearance: "Apariencia",
      proBadge: "PRO",
      toasts: {
        settingsSaved: "Configuración guardada",
        settingsFailed: "No se pudo guardar la configuración",
        avatarUploadError: "No se pudo subir el avatar",
        nameChangeError: "No se pudo cambiar el nombre",
        googleRedirect: "Redirigiendo a Google...",
        googleLinkError: "No se pudo vincular la cuenta de Google",
      },
    },
    achievementsModal: {
      title: "Logros",
      description: "Rastrea tu progreso y desbloquea recompensas — todo en una ventana",
      totalXP: "Experiencia total",
      xpToNextLevel: "Hasta el siguiente nivel: {{xp}} XP",
      currentLevel: "Nivel actual",
      xpRemaining: "Quedan {{xp}} XP",
      unlockedCount: "Logros desbloqueados",
      progress: "Progreso",
      progressLabel: "Progreso",
      unlocked: "Desbloqueado",
      categories: {
        beginner: "Principiante",
        master: "Maestro",
        streak: "Racha",
        accuracy: "Precisión",
        games: "Juegos",
        learning: "Aprendizaje",
        other: "Otro",
      },
      list: {
        leader_of_roads: {
          title: "Líder de carreteras",
          description: "Ocupar el primer lugar en el ranking entre estudiantes",
        },
        spanish_driver: {
          title: "Conductor español",
          description: "Pasar el test final de normas de tráfico",
        },
        photomodel: {
          title: "Fotomodelo",
          description: "Añadir foto al perfil",
        },
        novice: {
          title: "Novato",
          description: "Completar la primera lección de normas de tráfico",
        },
        weekend_warrior: {
          title: "Guerrero de fin de semana",
          description: "Pasar un test el sábado y domingo",
        },
        enthusiast: {
          title: "Entusiasta",
          description: "Estudiar 3 días seguidos",
        },
        social_butterfly: {
          title: "Alma de la fiesta",
          description: "Invitar 3 amigos a la aplicación",
        },
        strategist: {
          title: "Estratega",
          description: "Completar todos los tests adicionales",
        },
        true_student: {
          title: "Verdadero estudiante",
          description: "Completar 10 días seguidos sin faltar",
        },
        flawless_driver: {
          title: "Conductor impecable",
          description: "Pasar 20 lecciones sin errores",
        },
        examiner: {
          title: "Examinador",
          description: "Pasar 20 tests de examen",
        },
        sign_sniper: {
          title: "Francotirador de señales",
          description: "Aprender 50 señales sin errores",
        },
        pdd_genius: {
          title: "Genio de normas",
          description: "Obtener 100% de respuestas correctas en un test de examen",
        },
        sign_master: {
          title: "Maestro de señales",
          description: "Aprender 100 señales de tráfico",
        },
        pdd_master: {
          title: "Maestro de normas",
          description: "Obtener 4000 puntos de experiencia",
        },
      },
    },
    wallet: {
      duelPassTooltipMobile: "Nivel Duel Pass {{level}} - {{xp}} SP",
      duelPassTooltipDesktop: "Nivel Duel Pass {{level}} - haz clic para ver la temporada",
      duelPassRewardReady: "¡Recompensa lista! Toca para reclamarla",
    },
    duelPass: {
      title: "Duel Pass",
      rarity: {
        common: "Común",
        rare: "Raro",
        epic: "Épico",
        legendary: "Legendario",
      },
      rewardTypes: {
        coins: { label: "Monedas", subtitle: "Se acreditan al instante" },
        skin: { label: "Aspecto", subtitle: "Nuevo estilo para el perfil" },
        badge: { label: "Insignia", subtitle: "Colección de logros" },
        boost: { label: "Impulso", subtitle: "Acelera el progreso" },
        sticker: { label: "Sticker", subtitle: "Expresiones en duelos" },
        trophy: { label: "Trofeo", subtitle: "Reconocimiento exclusivo" },
      },
      fallbackRewardName: "Recompensa",
      countdown: {
        label: "Hasta el fin de la temporada",
        dateTbc: "Fechas por confirmar",
        urgent: "¡La temporada termina pronto, no pierdas tus recompensas!",
        units: { days: "días", hours: "horas", minutes: "min", seconds: "seg" },
      },
      hero: {
        seasonLabel: "TEMPORADA №{{number}}",
        specialTheme: "Operación Asphalt",
        defaultDescription: "Consigue monedas, boosts y cosméticos exclusivos mientras la temporada esté activa.",
        featuredTitle: "Recompensas clave",
        featuredEmpty: "Habrá recompensas exclusivas en la próxima actualización",
        countdownLabel: "Hasta el fin de la temporada",
        daysLeft: "{{count}} días restantes",
        levelsRemaining: "Quedan {{count}} niveles para completar el pase",
      },
      progress: {
        currentLevelLabel: "Nivel actual",
        seasonPointsLabel: "SP actuales",
        seasonPoints: "Puntos de temporada",
        summary: "Total {{total}} SP",
        nextLevel: "Próximo nivel en {{sp}} SP",
        toNext: "{{sp}} SP para el nivel {{level}}",
        max: "Nivel máximo alcanzado",
        loading: "Cargando...",
        levelOf: "/ {{total}}",
      },
      highlights: {
        pace: {
          title: "Ritmo de temporada",
          value: "{{current}}/{{total}} nivel",
          descriptionToNext: "Faltan {{sp}} SP para el nivel {{level}}",
          descriptionMax: "¡Vas primero! Sigue sumando SP por gloria",
          descriptionLoading: "Actualizando progreso...",
        },
        collection: {
          title: "Colección Asphalt",
          value: "{{claimed}}/{{total}} recompensas",
          description: "Completa la línea para desbloquear el título de temporada",
        },
        limit: {
          title: "Límite",
          valueFallback: "Pronto",
          descriptionDays: "Quedan unos {{days}} días",
          descriptionFallback: "Consulta el calendario para más fechas",
        },
      },
      filters: {
        all: "Todo",
        available: "Disponibles",
      },
      table: {
        title: "Recompensas por nivel",
        remaining: "Quedan {{days}}d",
        columns: {
          level: "Nivel",
          free: "Gratis",
          premium: "Premium",
          sp: "SP",
          status: "Estado",
        },
        status: {
          current: "Actual",
          claimed: "Reclamado",
          locked: "Bloqueado",
        },
        spBadge: "+{{sp}} SP",
        buttons: {
          claim: "Reclamar",
          claimPremium: "Obtener recompensa",
          premiumOnly: "Premium",
          default: "Tomar",
        },
        lockedBadge: "Bloqueado",
      },
      premiumBanner: {
        title: "Premium Duel Pass",
        freeBadge: "Gratis",
        descriptionForever: "Ya tienes Premium Forever: ¡el Pase está desbloqueado!",
        descriptionQuestion: "¿Qué es Duel Pass?",
        descriptionText: "Sistema de temporada con recompensas extra. La versión Premium duplica todo.",
        buyCta: "Comprar por 7.99€",
        benefits: {
          double: { title: "Recompensas x2", description: "Monedas y XP duplicadas" },
          exclusive: { title: "Exclusivos", description: "Cosméticos únicos" },
          fastStart: { title: "Empieza rápido", description: "+5 niveles al instante" },
          allSeasons: { title: "Todas las temporadas", description: "Accede a cada recompensa" },
        },
      },
      premiumForever: {
        title: "Premium Forever activo",
        description: "Duel Pass desbloqueado para todas las temporadas",
      },
      toasts: {
        rewardError: "No se pudo reclamar la recompensa",
        rewardErrorDescription: "Intenta de nuevo más tarde",
        rewardClaimed: "¡Recompensa conseguida!",
        premiumReward: "🎉 ¡Recompensa premium conseguida!",
        rewardDescription: "Nivel {{level}}: {{reward}}",
        genericReward: "¡Recompensa desbloqueada!",
      },
      onboarding: {
        slide1: {
          title: "¡Bienvenido a<br />Duel Pass!",
          description: "Sistema de temporadas con recompensas por tu actividad. Gana SP, sube de nivel y obtén recompensas exclusivas!",
        },
        slide2: {
          title: "¿Qué son los SP?",
          subtitle: "Season Points — tu moneda de temporada",
          tests: "Tests",
          duels: "Duelos",
          daily: "Ingreso diario",
          spPerAction: "SP por acción",
          premiumBonus: "Premium: +20% SP",
          premiumDescription: "Con Premium obtienes más SP por cada acción",
        },
        slide3: {
          title: "30 niveles de recompensas únicas",
          subtitle: "Más SP = nivel más alto = más recompensas!",
          coins: "Monedas",
          skins: "Skins",
          badges: "Insignias",
          boosts: "Boosts",
          progressTitle: "Progreso por niveles",
          progressDescription: "Cada nivel desbloquea nuevas recompensas exclusivas",
        },
        slide4: {
          title: "Desbloquea la temporada completa",
          subtitle: "Premium Pass abre lo mejor",
          freePass: "Free Pass",
          premiumPass: "Premium Pass",
          freeFeatures: {
            missions: "Acceso a misiones",
            basicRewards: "Recompensas básicas",
            levelProgress: "Progreso por niveles",
          },
          premiumFeatures: {
            doubleRewards: "Recompensas x2",
            exclusive: "Cosméticos exclusivos",
            instantLevels: "+5 niveles al instante",
            allSeasons: "Todas las temporadas",
          },
        },
        slide5: {
          title: "¡La temporada es limitada!",
          description: "Las recompensas desaparecerán en {{days}}",
          day: "día",
          days: "días",
          daysFew: "días",
        },
        button: "Entendido, ¡vamos!",
        skip: "Saltar",
        next: "Siguiente",
        back: "Atrás",
        dontShowAgain: "No mostrar de nuevo",
        dialogDescription: "Bienvenido a Duel Pass - sistema de recompensas por actividad",
      },
      migration: {
        title: "Duel Pass",
        description: "Sistema de temporadas",
        warningTitle: "⚠️ Falta ejecutar la migración",
        warningDescription: "Aplica la migración en Supabase para activar la temporada:",
        steps: [
          "Abre el SQL Editor en Supabase Dashboard",
          "Pega el contenido de APPLY_SEASON_MIGRATION_NOW.sql",
          "Ejecuta la consulta SQL",
        ],
        noSeason: "No hay una temporada activa",
      },
    },
    learningMap: {
      loading: "Cargando mapa de aprendizaje...",
      errors: {
        title: "Error de carga",
        retry: "Intentar de nuevo",
        generic: "No pudimos cargar el mapa. Actualiza la página e inténtalo nuevamente.",
      },
      hero: {
        badge: "Mapa estructurada del curso de tráfico",
        title: "Mapa de aprendizaje",
        description: "Todos los temas y subtemas en un solo lugar. Empieza por el primer subtema pendiente o elige cualquier módulo.",
      },
      variants: {
        radial: "Variante A · Progreso radial",
        ribbons: "Variante B · Cintas de progreso",
      },
      stats: {
        overallTitle: "Progreso total",
        overallAverage: "Promedio entre {{count}} temas",
        topicsLabel: "Temas",
        subtopicsLabel: "Subtemas",
        topicProgress: "Avance de temas",
        subtopicProgress: "Avance de subtemas",
      },
      actions: {
        continue: "Continuar",
        start: "Empezar aprendizaje",
        selectModule: "Selecciona cualquier módulo disponible",
      },
      empty: {
        title: "Temas aún no añadidos",
        description: "Estamos preparando el contenido. Vuelve más tarde para ver la ruta completa.",
      },
      additionalMaterials: "Material adicional",
      tests: {
        sectionTitle: "Pruebas del módulo",
        trainingTest: "Test de entrenamiento por tema",
        finalTest: "Test final del módulo",
      },
    },
    learningPage: {
      badge: "Aprendizaje",
      badgeSubtext: "Mapa + recursos",
      title: "Mapa de aprendizaje y todos los materiales",
      subtitle: "Construye tu ruta, conecta guías, diccionarios y módulos adicionales sin salir de una sola página.",
      materials: {
        title: "Materiales",
        quickAccess: "Acceso rápido",
        newBadge: "+ nuevos",
        dgtExams: "Exámenes DGT",
        dgtExamsDesc: "4000+ preguntas reales de categorías A1, B, D con pistas adaptativas",
        updateBadge: "Actualización",
        roadSigns: "Señales de tráfico",
        roadSignsDesc: "Catálogo de señales con ejemplos de situaciones y búsqueda rápida",
        dictionary: "Diccionario de términos",
        dictionaryDesc: "Términos españoles de tráfico con traducción y audio",
        videoCourse: "Curso de video",
        videoCourseDesc: "Serie de análisis cortos de los temas más complejos de la teoría",
        comingSoon: "Próximamente",
      },
      support: {
        title: "Ayuda",
        helpAndGuides: "Ayuda y guías",
        appGuide: "Guía de la aplicación",
        appGuideDesc: "Cómo funcionan los niveles, XP, recompensas y suscripciones",
        helpSupport: "Ayuda y soporte",
        helpSupportDesc: "FAQ, instrucciones y acceso rápido al soporte",
      },
      blog: {
        title: "Blog",
        freshMaterials: "Materiales frescos",
        readMore: "Leer",
        allArticles: "Todos los artículos",
        guides: "guía",
        tips: "consejos",
        statistics: "estadísticas",
        articles: "15+ artículos",
        fullGuide: "Guía completa",
        mapGuide: "Cómo usar el mapa de aprendizaje para aprobar la teoría a la primera",
        habitsGuide: "5 hábitos que aceleran la preparación para el examen DGT",
        topErrors: "Top 10 errores en el examen DGT",
      },
      ideas: {
        title: "Ideas",
        expressModes: "Modos exprés",
        gamesDuels: "Juegos y duelos",
        gamesDuelsDesc: "Entrena tu reacción y atención cuando estés cansado de la teoría",
        challengeBank: "Banco de desafíos",
        challengeBankDesc: "Crea colecciones de preguntas sobre puntos débiles y compártelas con amigos",
        sequentialTests: "Tests secuenciales",
        sequentialTestsDesc: "Pasa los tests en el orden correcto, como en el examen",
      },
      quickActions: {
        title: "Rápido",
        additional: "Adicional",
        blog: "Blog",
        blogDesc: "Artículos, guías y consejos para la preparación",
        guide: "Guía",
        guideDesc: "Documentación completa de la aplicación",
      },
    },
    article: {
      nav: {
        back: "← Todos los artículos",
        home: "Inicio",
      },
      meta: {
        publishedOn: "Publicado el {{date}}",
        inCategory: "en {{category}}",
        readTime: "{{minutes}} min de lectura",
      },
      share: {
        title: "Compartir",
        button: "Compartir",
        copied: "Enlace copiado al portapapeles",
      },
      relatedTitle: "Artículos relacionados",
      toc: {
        title: "Contenido",
      },
      cta: {
        title: "Prepárate para el examen DGT con Skilyapp",
        description: "Activa entrenamientos, pruebas y duelos en una sola app.",
        button: "Comenzar gratis",
      },
    },
  },
  en: {
    // Navigation
    home: "Home",
    tests: "Tests",
    learning: "Learning",
    games: "Games",
    profile: "Profile",
    login: "Login",
    logout: "Logout",
    
    // Profile
    editProfile: "Edit profile",
    changeName: "Change name",
    changeAvatar: "Change avatar",
    uploadPhoto: "Upload photo",
    deleteAvatar: "Delete avatar",
    save: "Save",
    cancel: "Cancel",
    email: "Email",
    linkAccount: "Link account",
    accountLinked: "Account linked ✅",
    loginWithEmail: "Login with email",
    
    // Settings
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    sound: "Sound",
    notifications: "Notifications",
    
    // Links
    achievements: "My achievements",
    duelHistory: "Duel history",
    support: "Support",
    
    // Messages
    nameSaved: "Name saved",
    avatarUploaded: "Avatar uploaded",
    avatarDeleted: "Avatar deleted",
    languageChanged: "Language changed",
    themeChanged: "Theme changed",
    notificationsEnabled: "Notifications enabled",
    notificationsDisabled: "Notifications disabled",
    loggedOut: "Logged out",
    fileTooLarge: "File too large (max 3MB)",
    onlyImages: "Only images allowed",
    accountsLinked: "Accounts linked successfully",
    
    // Account & Auth
    accountsAndLogin: "Accounts & Login",
    telegramLinked: "Telegram linked",
    emailLinked: "Email linked",
    linkEmailAccount: "Link email account",
    authPrompt: "Login with email to save your progress",
    
    // Auth Modal
    auth: {
      identification: "Identification",
      welcomeBack: "Welcome back",
      welcomeBackWithName: "Welcome back, {{name}}",
      createAccount: "Create account",
      emailPrompt: "Enter your email — we'll log you in or create an account.",
      accountVerified: "Your account is verified on this device.",
      newUser: "Looks like you're new here.",
      emailPlaceholder: "name@company.com",
      tapArrow: "Tap arrow to continue",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      signIn: "Sign In",
      createAccountButton: "Create Account",
      changeEmail: "Change",
      forgotPassword: "Forgot password?",
      alternativeLogin: "Or use other login methods above",
      deviceLogin: "Sign in with Face ID / Touch ID",
      deviceLoginFallback: "Sign in with your device",
      noDeviceAccess: "No device access? Use email or social networks.",
      orContinueWith: "Or continue with",
      footerText: "We use your email or device to log you in or create a new Skily account. No extra steps.",
      errors: {
        invalidEmail: "Please enter a valid email address.",
        checkFailed: "Failed to check email. Please try again.",
        alreadyRegistered: "This email is already registered. Try logging in.",
        invalidCredentials: "Invalid email or password",
        validationError: "Validation error",
        genericError: "An error occurred. Please try again.",
        minPassword: "Password must be at least 6 characters",
        incompleteUserData: "Error: incomplete user data",
        widgetLoadFailed: "Failed to load authorization widget. Check your internet connection.",
      },
      legalFooter: "By continuing, you accept the",
      terms: "Terms",
      privacy: "Privacy Policy",
      success: {
        registered: "Registration successful",
        loggedIn: "Logged in",
        welcome: "Welcome!",
        welcomeUser: "Welcome, {{name}}!",
      },
      passkey: {
        loginSuccess: "✅ Logged in",
        loginSuccessDesc: "Welcome back!",
        loginInProgress: "Logging in...",
        notConfigured: "Passkey not configured",
        notConfiguredDesc: "Log in with email and add device in Settings → Security",
        cancelled: "Login cancelled",
        cancelledDesc: "You can log in with email or try Passkey again",
        tooManyAttempts: "Too many attempts",
        tooManyAttemptsDesc: "Wait a minute or log in with email",
        loginFailed: "Failed to log in",
        loginFailedDesc: "Try again or use email login",
        error: "Login error",
        errorDesc: "Failed to log in with Passkey. Use email login",
        or: "Or",
        noDeviceAccess: "No device access? Use email login above",
        deviceTypes: "Face ID • Touch ID • Windows Hello",
      },
      partner: {
        specialOffer: "Special offer from partner!",
        getPremium: "Get Premium",
        premium30Days: "Premium for 30 days free",
        onRegistration: "on registration",
        campaign: "Campaign",
        close: "Close",
      },
    },
    
    // Other
    version: "v1.0.0 © 2025 Sdadim",
    online: "Online",
    xpProgress: "XP to next level",
    dashboard: {
      onlineStatus: "System online",
      licenseStatus: "License B",
      cockpitButton: "Cockpit",
      heroGreeting: "Welcome, Pilot!",
      heroEfficiencyPrefix: "Your efficiency is",
      heroStatus: {
        ready: "Sensors show you're ready for the next session.",
        progress: "Keep training to push the score higher.",
        start: "Run more tests to boost your readiness.",
      },
      stats: {
        xp: "XP",
        tests: "Tests",
        coins: "Coins",
      },
      startButton: "Start",
    },
    
    // Tests Page
    practiceTests: "Practice Tests",
    practiceMode: "Practice mode",
    examMode: "Exam mode",
    random: "Random",
    randomDesc: "Choose between 10, 20, 30 or 40 random questions",
    incorrectlyAnswered: "Incorrectly answered",
    incorrectlyAnsweredDesc: "Questions you have answered incorrectly (saved automatically)",
    savedQuestions: "Saved Questions",
    savedQuestionsDesc: "Questions you saved manually or automatically",
    challengeBankAdded: "We've added this question to your Challenge Bank™",
    challengeBankDesc: "All questions you answered incorrectly are saved automatically for extra practice",
    dontShowAgain: "Don't show",
    // Skily AI Assistant
    lumiGreeting: "Hello! I'm Skily 💡",
    lumiWelcome: "Need a hint or a quick explanation? Just press the button or ask your question, and I'll help on the spot. Ready when you are ready!",
    lumiHintButton: "Give me a hint",
    lumiHelpButton: "Help me understand this",
    lumiPlaceholder: "Ask your question here...",
    skilyChat: {
      title: "AI Assistant",
      subtitle: "Intelligent assistant",
      placeholder: "Ask a question...",
      neuralCore: "AI Neural Core",
      online: "ONLINE",
      processing: "PROCESSING...",
      ready: "Systems ready.",
      description: "Real-time access to DGT database. Ask your question.",
      modelInfo: "MODEL: GEMINI-2.5-FLASH // LATENCY: 24ms",
      inputPlaceholder: "Type your question...",
      analyzing: "Analyzing rules...",
    },
    cryptomusPayment: {
      title: "Payment Confirmation",
      description: "Check payment details before proceeding to payment",
      detailsTitle: "Payment Details",
      item: "Item",
      amount: "Amount",
      orderId: "Order ID",
      copyOrderId: "Copy Order ID",
      orderIdCopied: "Order ID copied",
      checkingStatus: "Checking payment status...",
      paymentCompleted: "Payment completed successfully!",
      paymentFailed: "Payment not completed",
      securityInfo: "Payment is processed through the secure Cryptomus service. Your data is protected.",
      cancel: "Cancel",
      proceedToPayment: "Proceed to payment",
      navigating: "Redirecting...",
    },
    lumiCollapse: "Collapse",
    lumiExpand: "Expand",
    lumiShowOriginal: "Show original",
    lumiShowTranslation: "Show Russian translation",
    hardestQuestions: "Hardest questions",
    hardestQuestionsDesc: "The questions that most users tend to answer incorrectly",
    masteryMode: "Mastery mode",
    masteryModeDesc: "Repeat until you answer everything correctly. Wrong answers repeat",
    examSimulator: "Exam simulator",
    examSimulatorDesc: "Take a timed test. Designed to mimic the real test",
    moduleTest: "Module test",
    moduleTestDesc: "Test your knowledge on a specific module",
    finalTest: "Final test",
    finalTestDesc: "The final test covers all of the modules, and is the ultimate test of your knowledge",
    level: "Level",
    points: "Points",
    lessons: "Lessons",
    correctOnFirstTry: "Correct on the 1st try",
    answeredQuestions: "Answered Questions",
    correctAnswers: "Correct Answers",
    moreStatistics: "MORE STATISTICS",
    leaderboard: "Leaderboard",
    you: "You",
    inviteFriends: "INVITE FRIENDS",
    selectQuestionCount: "Select number of questions",
    startTest: "Start test",
    testsPage: {
      title: "Test Center",
      subtitle: "Choose a mode and improve your skills",
      randomTest: "Random test",
      randomTestDesc: "Choose the number of questions for a quick knowledge check",
      questionCount: "Number of questions:",
      startButton: "Start test",
      exam: "Exam",
      examDesc: "Official DGT exam simulator",
      blitz: "Blitz",
      blitzDesc: "20 questions in 5 minutes",
      marathon: "Marathon",
      marathonDesc: "Until you answer perfectly",
      challengeBank: "Errors",
      challengeBankDesc: "{{count}} questions",
      hardest: "Hardest",
      hardestDesc: "TOP-50",
      topicsTitle: "Course topics",
      questions: "questions",
      stats: {
        accuracy: "Accuracy",
        answered: "Answered",
        errors: "Errors",
        level: "Level",
      },
    },
    
    // Learning map / curriculum
    completed: "Completed",
    in_progress: "In progress",
    locked: "Locked",
    coming_soon: "Coming soon",
    module: "Module",
    progress: "Progress",
    continue_topic: "Continue module",
    block: "Block",
    
    // Footer
    footer: {
      companyDescription: "Interactive learning platform for road safety education in Spain",
      address: "Spain, Tarragona",
      contact: "Contact: support@skilyapp.com",
      legal: "Legal",
      blog: "Blog",
      help: "Help",
      about: "About",
      terms: "Terms and conditions",
      privacy: "Privacy policy",
      subscriptionTerms: "Subscription terms",
      pricing: "Pricing",
      refundPolicy: "Refund Policy",
      resources: "Resources",
      becomePartner: "Become a partner",
      partnerPending: "Application under review",
      partnerDashboard: "Partner dashboard",
      support: "Support",
      supportEmail: "support@skilyapp.com",
      copyright: "© 2025 Sdadim. All rights reserved.",
      rightsReserved: "All rights reserved",
    },
    boostShop: {
      title: "Shop",
      tabs: {
        boosts: "Boosts",
        coins: "Coins",
        premium: "Premium",
        history: "History",
      },
      sections: {
        popular: "Popular boosts",
        premium: "Premium boosts",
        premiumBadge: "Premium",
        empty: "Boosts are coming soon",
      },
      boostNames: {
        fifty_fifty: {
          name: "50/50",
          description: "Removes two incorrect answers",
        },
        time_extend: {
          name: "+30 seconds",
          description: "Adds extra time for tough questions",
        },
        hint: {
          name: "Hint",
          description: "Shows an instant explanation",
        },
        skip: {
          name: "Skip",
          description: "Skip a question without losing your streak",
        },
        translate: {
          name: "Translation",
          description: "Translates the question and answers",
        },
      },
      coins: {
        topUpTitle: "Top up your coin balance",
        packLabel: "{{amount}} coins",
        bonusLabel: "+{{bonus}} bonus",
        buyButton: "Buy",
        premiumHint: "💡 Get more coins with Premium",
        successTitle: "✅ Payment successful!",
        successDescription: "You received {{amount}} coins",
        purpose: "For boosts, duels and premium entries",
        perCoin: "€{{price}} / coin",
        deliveryHint: "Instant delivery · Secure payments",
        buyPackAria: "Buy {{amount}} coin pack",
        tags: {
          starter: "Starter pack",
          bestValue: "Best value",
        },
        descriptions: {
          starter: "Quick refill for last-minute boosts",
          grinder: "Perfect for daily duels and streaks",
          pro: "Stay ready for long study sessions",
          elite: "Full control for tournaments and premium skins",
        },
        helpers: {
          starter: "Start small and upgrade any time",
          grinder: "Enough to test every boost and help friends",
          pro: "Balanced pack for a full week of progress",
          elite: "Unlock premium bundles and rare cosmetics instantly",
        },
      },
      premium: {
        title: "Premium subscription",
        subtitle: "Get the most out of your learning",
        activeBadge: "Active",
        benefits: {
          unlimitedTests: "Unlimited access to every test",
          bonusCoins: "+50% coins for studying",
          duelPassRewards: "Premium Duel Pass rewards",
          instantHints: "No ads and instant hints",
        },
        monthlyLabel: "Month",
        yearlyLabel: "Year",
        lifetimeLabel: "Lifetime",
        yearlySuffix: "/year",
        lifetimeSuffix: "One time forever",
        savingsLabel: "Save 50%",
        bestBadge: "Best value",
        popularBadge: "Popular",
        chooseButton: "Choose",
        activeButton: "Active",
      },
      duelPass: {
        title: "Duel Pass",
        description: "Earn exclusive rewards for every level! Premium doubles all rewards.",
        button: "Open Duel Pass",
        toastTitle: "Duel Pass",
        toastDescription: "Open Duel Pass on the home page",
      },
      history: {
        title: "Coin history",
        operationsCount: "{{count}} operations",
        filters: {
          all: "All",
          earn: "Income",
          spend: "Spending",
          purchase: "Purchases",
          reward: "Rewards",
        },
        empty: {
          all: {
            title: "Your transactions will appear here",
            description: "Start earning coins by taking tests and duels!",
            premiumHint: "💡 Premium doubles rewards",
          },
          earn: {
            title: "No income",
            description: "Take tests, win duels and claim daily bonuses.",
          },
          spend: {
            title: "No spending",
            description: "Buy boosts and use them to improve your results.",
          },
          purchase: {
            title: "No purchases",
            description: "Top up coins or get Premium for more options.",
          },
          reward: {
            title: "No rewards",
            description: "Earn rewards from Duel Pass, referrals and achievements.",
          },
        },
        tryOtherFilter: "Try another filter",
        badges: {
          purchase: "Purchase",
          reward: "Reward",
        },
      },
      buttons: {
        buy: "Buy",
        select: "Choose",
        active: "Active",
        insufficient: "Not enough",
        premium: "Premium",
      },
      toasts: {
        errorTitle: "❌ Error",
        needLogin: "Please log in",
        sessionError: "Couldn't get a payment link",
        historyError: "Failed to load history",
        paymentSuccessTitle: "✅ Payment successful!",
        paymentSuccessDescription: "You received {{amount}} coins",
        purchaseSuccessTitle: "✅ Purchase successful!",
        purchaseSuccessDescription: "{{name}} added to inventory",
        purchaseErrorTitle: "❌ Purchase error",
        purchaseErrorDescription: "Couldn't complete the purchase. Try again.",
        rlsError: "Access error. Refresh the page and log in again.",
        insufficientCoins: "You need {{amount}} more coins",
      },
      transactions: {
        coinsPurchasePaddle: "Coin top-up: {{amount}}",
        premiumPurchase: "Premium subscription ({{type}})",
        premiumType: {
          monthly: "month",
          yearly: "year",
          forever: "forever",
        },
        duelPassPurchase: "Duel Pass purchase",
        duelPassReward: "Duel Pass reward{{level}}{{premium}}",
        duelPassRewardLevelSuffix: " (level {{level}})",
        duelPassRewardPremiumSuffix: " [Premium]",
        referralReward: "Referral reward: {{name}}",
        referralJoined: "Referral signup bonus",
        referralFallbackName: "friend",
        coinsEarnedTest: "Test reward",
        coinsEarnedDuel: "Duel reward",
        coinsEarnedDaily: "Daily bonus",
        coinsEarnedPremiumBonus: "Premium bonus",
        coinsSpentBoost: "Boost purchase: {{name}}",
        coinsSpentSkin: "Skin purchase",
        coinsSpentDuelEntry: "Duel entry",
        bet: "Duel bet",
        win: "Duel win",
        refund: "Bet refund",
        commission: "System fee",
      },
    },
    profileMenu: {
      title: "Profile",
      loading: "Loading profile...",
      notFound: "Profile not found",
      xpLabel: "XP",
      xpDescription: "Experience points",
      notifications: "Notifications",
      achievements: "Achievements",
      invite: "Invite",
      inventory: "Inventory",
      achievementsDesc: "Track your progress and unlock new rewards",
      blog: "Blog",
      legal: "Legal",
      connectedAccounts: "Connected accounts",
      helpCenter: "Help Center",
      adminPanel: "Admin panel",
      connect: "Connect",
      connected: "Connected",
      notConnected: "Not connected",
      appearance: "Appearance",
      proBadge: "PRO",
      toasts: {
        settingsSaved: "Settings saved",
        settingsFailed: "Couldn't save settings",
        avatarUploadError: "Couldn't upload avatar",
        nameChangeError: "Couldn't change the name",
        googleRedirect: "Redirecting to Google...",
        googleLinkError: "Couldn't link Google account",
      },
    },
    achievementsModal: {
      title: "Achievements",
      description: "Track your progress and unlock rewards — all in one window",
      totalXP: "Total XP",
      xpToNextLevel: "To next level: {{xp}} XP",
      currentLevel: "Current level",
      xpRemaining: "{{xp}} XP remaining",
      unlockedCount: "Unlocked achievements",
      progress: "Progress",
      progressLabel: "Progress",
      unlocked: "Unlocked",
      categories: {
        beginner: "Beginner",
        master: "Master",
        streak: "Streak",
        accuracy: "Accuracy",
        games: "Games",
        learning: "Learning",
        other: "Other",
      },
      list: {
        leader_of_roads: {
          title: "Road Leader",
          description: "Take first place in the ranking among students",
        },
        spanish_driver: {
          title: "Spanish Driver",
          description: "Pass the final traffic rules test",
        },
        photomodel: {
          title: "Photomodel",
          description: "Add photo to profile",
        },
        novice: {
          title: "Novice",
          description: "Complete the first traffic rules lesson",
        },
        weekend_warrior: {
          title: "Weekend Warrior",
          description: "Take a test on Saturday and Sunday",
        },
        enthusiast: {
          title: "Enthusiast",
          description: "Study for 3 days in a row",
        },
        social_butterfly: {
          title: "Social Butterfly",
          description: "Invite 3 friends to the app",
        },
        strategist: {
          title: "Strategist",
          description: "Complete all additional tests",
        },
        true_student: {
          title: "True Student",
          description: "Complete 10 days in a row without missing",
        },
        flawless_driver: {
          title: "Flawless Driver",
          description: "Pass 20 lessons without errors",
        },
        examiner: {
          title: "Examiner",
          description: "Pass 20 exam tests",
        },
        sign_sniper: {
          title: "Sign Sniper",
          description: "Learn 50 signs without errors",
        },
        pdd_genius: {
          title: "Traffic Rules Genius",
          description: "Get 100% correct answers in an exam test",
        },
        sign_master: {
          title: "Sign Master",
          description: "Learn 100 traffic signs",
        },
        pdd_master: {
          title: "Traffic Rules Master",
          description: "Earn 4000 experience points",
        },
      },
    },
    wallet: {
      duelPassTooltipMobile: "Duel Pass level {{level}} - {{xp}} SP",
      duelPassTooltipDesktop: "Duel Pass level {{level}} - click to view the season",
      duelPassRewardReady: "Reward ready — tap to claim",
    },
    duelPass: {
      title: "Duel Pass",
      rarity: {
        common: "Common",
        rare: "Rare",
        epic: "Epic",
        legendary: "Legendary",
      },
      rewardTypes: {
        coins: { label: "Coins", subtitle: "Instantly added to balance" },
        skin: { label: "Skin", subtitle: "New profile look" },
        badge: { label: "Badge", subtitle: "Achievement collection" },
        boost: { label: "Boost", subtitle: "Speed up your progress" },
        sticker: { label: "Sticker", subtitle: "Express yourself in duels" },
        trophy: { label: "Trophy", subtitle: "Exclusive accolade" },
      },
      fallbackRewardName: "Reward",
      countdown: {
        label: "Until season ends",
        dateTbc: "Dates coming soon",
        urgent: "Season ends soon — don't delay your rewards!",
        units: { days: "days", hours: "hrs", minutes: "min", seconds: "sec" },
      },
      hero: {
        seasonLabel: "SEASON №{{number}}",
        specialTheme: "Operation Asphalt",
        defaultDescription: "Collect coins, boosts and exclusive cosmetics while the season is live.",
        featuredTitle: "Key rewards",
        featuredEmpty: "Exclusive rewards arrive with the next update",
        countdownLabel: "Until the season ends",
        daysLeft: "{{count}} days left",
        levelsRemaining: "{{count}} levels until full pass",
      },
      progress: {
        currentLevelLabel: "Current level",
        seasonPointsLabel: "Current SP",
        seasonPoints: "Season Points",
        summary: "Total {{total}} SP",
        nextLevel: "Next level in {{sp}} SP",
        toNext: "{{sp}} SP to level {{level}}",
        max: "Max level reached",
        loading: "Loading...",
        levelOf: "/ {{total}}",
      },
      highlights: {
        pace: {
          title: "Season pace",
          value: "{{current}}/{{total}} level",
          descriptionToNext: "{{sp}} SP until level {{level}}",
          descriptionMax: "You're on top! Keep farming SP for glory",
          descriptionLoading: "Updating progress...",
        },
        collection: {
          title: "Asphalt collection",
          value: "{{claimed}}/{{total}} rewards",
          description: "Complete the track to unlock the seasonal title",
        },
        limit: {
          title: "Deadline",
          valueFallback: "Soon",
          descriptionDays: "About {{days}} days left",
          descriptionFallback: "Check the calendar for season dates",
        },
      },
      filters: {
        all: "All",
        available: "Available",
      },
      table: {
        title: "Level rewards",
        remaining: "{{days}}d left",
        columns: {
          level: "Level",
          free: "Free",
          premium: "Premium",
          sp: "SP",
          status: "Status",
        },
        status: {
          current: "Current",
          claimed: "Claimed",
          locked: "Locked",
        },
        spBadge: "+{{sp}} SP",
        buttons: {
          claim: "Claim",
          claimPremium: "Claim reward",
          premiumOnly: "Premium",
          default: "Collect",
        },
        lockedBadge: "Locked",
      },
      premiumBanner: {
        title: "Premium Duel Pass",
        freeBadge: "Free",
        descriptionForever: "You already own Premium Forever — Duel Pass is unlocked!",
        descriptionQuestion: "What is Duel Pass?",
        descriptionText: "Season system with extra rewards. Premium doubles everything.",
        buyCta: "Buy for €7.99",
        benefits: {
          double: { title: "2x rewards", description: "Double coins and XP" },
          exclusive: { title: "Exclusives", description: "Unique cosmetics" },
          fastStart: { title: "Fast start", description: "+5 levels instantly" },
          allSeasons: { title: "All seasons", description: "Access every reward" },
        },
      },
      premiumForever: {
        title: "Premium Forever active",
        description: "Duel Pass unlocked for every season",
      },
      toasts: {
        rewardError: "Failed to claim the reward",
        rewardErrorDescription: "Please try again later",
        rewardClaimed: "Reward claimed!",
        premiumReward: "🎉 Premium reward claimed!",
        rewardDescription: "Level {{level}}: {{reward}}",
        genericReward: "Reward unlocked!",
      },
      onboarding: {
        slide1: {
          title: "Welcome to<br />Duel Pass!",
          description: "Season system with rewards for your activity. Farm SP, level up and get exclusive rewards!",
        },
        slide2: {
          title: "What are SP?",
          subtitle: "Season Points — your season currency",
          tests: "Tests",
          duels: "Duels",
          daily: "Daily login",
          spPerAction: "SP per action",
          premiumBonus: "Premium: +20% SP",
          premiumDescription: "With Premium subscription you get more SP for every action",
        },
        slide3: {
          title: "30 levels of unique rewards",
          subtitle: "More SP = higher level = more rewards!",
          coins: "Coins",
          skins: "Skins",
          badges: "Badges",
          boosts: "Boosts",
          progressTitle: "Level progress",
          progressDescription: "Each level unlocks new exclusive rewards",
        },
        slide4: {
          title: "Unlock the full season",
          subtitle: "Premium Pass opens the best",
          freePass: "Free Pass",
          premiumPass: "Premium Pass",
          freeFeatures: {
            missions: "Access to missions",
            basicRewards: "Basic rewards",
            levelProgress: "Level progress",
          },
          premiumFeatures: {
            doubleRewards: "Rewards x2",
            exclusive: "Exclusive cosmetics",
            instantLevels: "+5 levels instantly",
            allSeasons: "All seasons",
          },
        },
        slide5: {
          title: "Season is time-limited!",
          description: "Rewards will disappear in {{days}}",
          day: "day",
          days: "days",
          daysFew: "days",
        },
        button: "Got it, let's start!",
        skip: "Skip",
        next: "Next",
        back: "Back",
        dontShowAgain: "Don't show again",
        dialogDescription: "Welcome to Duel Pass - activity reward system",
      },
      migration: {
        title: "Duel Pass",
        description: "Season system",
        warningTitle: "⚠️ Migration not applied",
        warningDescription: "Run the migration in Supabase to enable seasons:",
        steps: [
          "Open the SQL Editor in Supabase Dashboard",
          "Paste the contents of APPLY_SEASON_MIGRATION_NOW.sql",
          "Execute the SQL query",
        ],
        noSeason: "No active season",
      },
    },
    learningMap: {
      loading: "Loading learning map...",
      errors: {
        title: "Loading error",
        retry: "Try again",
        generic: "We couldn't load the learning map. Please refresh and try again.",
      },
      hero: {
        badge: "Structured traffic course map",
        title: "Learning map",
        description: "All topics and subtopics in one place. Start with the first incomplete subtopic or pick any module.",
      },
      variants: {
        radial: "Variant A · Radial progress",
        ribbons: "Variant B · Ribbon badges",
      },
      stats: {
        overallTitle: "Overall progress",
        overallAverage: "Average across {{count}} topics",
        topicsLabel: "Topics",
        subtopicsLabel: "Subtopics",
        topicProgress: "Topic progress",
        subtopicProgress: "Subtopic progress",
      },
      actions: {
        continue: "Continue",
        start: "Start learning",
        selectModule: "Choose any available module",
      },
      empty: {
        title: "Topics not added yet",
        description: "We're preparing the content. Come back later to see the full path.",
      },
      additionalMaterials: "Additional material",
      tests: {
        sectionTitle: "Module tests",
        trainingTest: "Training test by topic",
        finalTest: "Final module test",
      },
    },
    learningPage: {
      badge: "Learning",
      badgeSubtext: "Map + resources",
      title: "Learning map and all materials",
      subtitle: "Build your route, connect guides, dictionaries and additional modules without leaving a single page.",
      materials: {
        title: "Materials",
        quickAccess: "Quick access",
        newBadge: "+ new",
        dgtExams: "DGT Exams",
        dgtExamsDesc: "4000+ real questions from categories A1, B, D with adaptive hints",
        updateBadge: "Update",
        roadSigns: "Road signs",
        roadSignsDesc: "Catalog of signs with situation examples and quick search",
        dictionary: "Term dictionary",
        dictionaryDesc: "Spanish traffic terms with translation and audio",
        videoCourse: "Video course",
        videoCourseDesc: "Series of short breakdowns of the most complex theory topics",
        comingSoon: "Coming soon",
      },
      support: {
        title: "Help",
        helpAndGuides: "Help and guides",
        appGuide: "App guide",
        appGuideDesc: "How levels, XP, rewards and subscriptions work",
        helpSupport: "Help and support",
        helpSupportDesc: "FAQ, instructions and quick access to support",
      },
      blog: {
        title: "Blog",
        freshMaterials: "Fresh materials",
        readMore: "Read",
        allArticles: "All articles",
        guides: "guide",
        tips: "tips",
        statistics: "statistics",
        articles: "15+ articles",
        fullGuide: "Full guide",
        mapGuide: "How to use the learning map to pass theory the first time",
        habitsGuide: "5 habits that speed up DGT exam preparation",
        topErrors: "Top 10 mistakes on the DGT exam",
      },
      ideas: {
        title: "Ideas",
        expressModes: "Express modes",
        gamesDuels: "Games and duels",
        gamesDuelsDesc: "Train your reaction and attention when tired of theory",
        challengeBank: "Challenge bank",
        challengeBankDesc: "Create question collections on weak points and share with friends",
        sequentialTests: "Sequential tests",
        sequentialTestsDesc: "Take tests in the correct order, like on the exam",
      },
      quickActions: {
        title: "Quick",
        additional: "Additional",
        blog: "Blog",
        blogDesc: "Articles, guides and preparation tips",
        guide: "Guide",
        guideDesc: "Complete application documentation",
      },
    },
    article: {
      nav: {
        back: "← All articles",
        home: "Home",
      },
      meta: {
        publishedOn: "Published on {{date}}",
        inCategory: "in {{category}}",
        readTime: "{{minutes}} min read",
      },
      share: {
        title: "Share",
        button: "Share",
        copied: "Link copied to clipboard",
      },
      relatedTitle: "Related articles",
      toc: {
        title: "Table of contents",
      },
      cta: {
        title: "Get ready for the DGT exam with Skilyapp",
        description: "Launch adaptive tests, duels and analytics in one app.",
        button: "Start for free",
      },
    },
  },
  ru: {
    // Navigation
    home: "Главная",
    tests: "Тесты",
    learning: "Обучение",
    games: "Игры",
    profile: "Профиль",
    login: "Войти",
    logout: "Выйти",
    
    // Profile
    editProfile: "Редактировать профиль",
    changeName: "Изменить имя",
    changeAvatar: "Изменить аватар",
    uploadPhoto: "Загрузить фото",
    deleteAvatar: "Удалить аватар",
    save: "Сохранить",
    cancel: "Отмена",
    email: "Email",
    linkAccount: "Связать аккаунт",
    accountLinked: "Аккаунт связан ✅",
    loginWithEmail: "Войти через email",
    
    // Settings
    settings: "Настройки",
    language: "Язык",
    theme: "Тема",
    light: "Светлая",
    dark: "Тёмная",
    system: "Системная",
    sound: "Звук",
    notifications: "Уведомления",
    
    // Links
    achievements: "Мои достижения",
    duelHistory: "История дуэлей",
    support: "Поддержка",
    
    // Messages
    nameSaved: "Имя сохранено",
    avatarUploaded: "Аватар загружен",
    avatarDeleted: "Аватар удалён",
    languageChanged: "Язык изменён",
    themeChanged: "Тема изменена",
    notificationsEnabled: "Уведомления включены",
    notificationsDisabled: "Уведомления выключены",
    loggedOut: "Вы вышли из аккаунта",
    fileTooLarge: "Файл слишком большой (макс. 3MB)",
    onlyImages: "Можно загружать только изображения",
    accountsLinked: "Аккаунты успешно связаны",
    
    // Account & Auth
    accountsAndLogin: "Аккаунты и вход",
    telegramLinked: "Telegram связан",
    emailLinked: "Email связан",
    linkEmailAccount: "Связать email аккаунт",
    authPrompt: "Войдите через email, чтобы сохранить прогресс",
    
    // Auth Modal
    auth: {
      identification: "Идентификация",
      welcomeBack: "С возвращением",
      welcomeBackWithName: "С возвращением, {{name}}",
      createAccount: "Создание аккаунта",
      emailPrompt: "Введите email — мы войдем или создадим аккаунт.",
      accountVerified: "Ваш аккаунт подтвержден на этом устройстве.",
      newUser: "Похоже, вы здесь впервые.",
      emailPlaceholder: "name@company.com",
      tapArrow: "Нажмите стрелку для продолжения",
      password: "Пароль",
      passwordPlaceholder: "Введите ваш пароль",
      signIn: "Войти",
      createAccountButton: "Создать аккаунт",
      changeEmail: "Изменить",
      forgotPassword: "Забыли пароль?",
      alternativeLogin: "Или используйте другие способы входа выше",
      deviceLogin: "Войти с Face ID / Touch ID",
      deviceLoginFallback: "Войти с устройством",
      noDeviceAccess: "Нет доступа к этому устройству? Используйте email или соцсети.",
      orContinueWith: "Или продолжить с",
      footerText: "Мы используем ваш email или устройство для входа или создания нового аккаунта Skily. Никаких лишних шагов.",
      errors: {
        invalidEmail: "Пожалуйста, введите корректный email.",
        checkFailed: "Не удалось проверить email. Попробуйте снова.",
        alreadyRegistered: "Этот email уже зарегистрирован. Попробуйте войти.",
        invalidCredentials: "Неверный email или пароль",
        validationError: "Ошибка валидации",
        genericError: "Произошла ошибка. Попробуйте снова.",
        minPassword: "Пароль должен быть минимум 6 символов",
        incompleteUserData: "Ошибка: неполные данные пользователя",
        widgetLoadFailed: "Не удалось загрузить виджет авторизации. Проверьте подключение к интернету.",
      },
      legalFooter: "Продолжая, вы принимаете",
      terms: "Условия",
      privacy: "Политику конфиденциальности",
      success: {
        registered: "Регистрация успешна",
        loggedIn: "Вход выполнен",
        welcome: "Добро пожаловать!",
        welcomeUser: "Добро пожаловать, {{name}}!",
      },
      passkey: {
        loginSuccess: "✅ Вход выполнен",
        loginSuccessDesc: "Добро пожаловать обратно!",
        loginInProgress: "Вход...",
        notConfigured: "Passkey не настроен",
        notConfiguredDesc: "Войдите через email и добавьте устройство в Настройках → Безопасность",
        cancelled: "Вход отменён",
        cancelledDesc: "Вы можете войти через email или попробовать Passkey снова",
        tooManyAttempts: "Слишком много попыток",
        tooManyAttemptsDesc: "Подождите минуту или войдите через email",
        loginFailed: "Не удалось войти",
        loginFailedDesc: "Попробуйте снова или используйте вход через email",
        error: "Ошибка входа",
        errorDesc: "Не удалось войти через Passkey. Используйте вход через email",
        or: "Или",
        noDeviceAccess: "Нет доступа к устройству? Используйте вход через email выше",
        deviceTypes: "Face ID • Touch ID • Windows Hello",
      },
      partner: {
        specialOffer: "Специальное предложение от партнера!",
        getPremium: "Получить Premium",
        premium30Days: "Premium на 30 дней бесплатно",
        onRegistration: "при регистрации",
        campaign: "Кампания",
        close: "Закрыть",
      },
    },
    
    // Other
    version: "v1.0.0 © 2025 Sdadim",
    online: "Онлайн",
    xpProgress: "XP до следующего уровня",
    
    // Tests Page
    practiceTests: "Тесты для практики",
    practiceMode: "Режим практики",
    examMode: "Режим экзамена",
    random: "Случайные",
    randomDesc: "Выбери 10, 20, 30 или 40 случайных вопросов",
    incorrectlyAnswered: "Неправильные ответы",
    incorrectlyAnsweredDesc: "Вопросы, на которые ты ответил неправильно (сохранены автоматически)",
    savedQuestions: "Сохранённые вопросы",
    savedQuestionsDesc: "Вопросы, которые ты сохранил вручную или автоматически",
    challengeBankAdded: "Добавили этот вопрос в твой Банк Вопросов™",
    challengeBankDesc: "Все вопросы, на которые ты ответил неправильно, сохраняются автоматически для дополнительной практики",
    dontShowAgain: "Не показывать",
    // Skily AI Assistant
    lumiGreeting: "Привет! Я Skily 💡",
    lumiWelcome: "Нужна подсказка или быстрое объяснение? Просто нажми кнопку или задай свой вопрос, и я помогу на месте. Готов, когда ты готов!",
    lumiHintButton: "Дай мне подсказку",
    lumiHelpButton: "Помоги понять это",
    lumiPlaceholder: "Задай свой вопрос здесь...",
    skilyChat: {
      title: "AI Помощник",
      subtitle: "Интеллектуальный ассистент",
      placeholder: "Задать вопрос...",
      neuralCore: "AI Neural Core",
      online: "ОНЛАЙН",
      processing: "ОБРАБОТКА...",
      ready: "Системы готовы.",
      description: "Доступ к базе данных DGT в реальном времени. Задай свой вопрос.",
      modelInfo: "MODEL: GEMINI-2.5-FLASH // LATENCY: 24ms",
      inputPlaceholder: "Напиши свой вопрос...",
      analyzing: "Анализирую правила...",
    },
    cryptomusPayment: {
      title: "Подтверждение оплаты",
      description: "Проверьте детали платежа перед переходом к оплате",
      detailsTitle: "Детали платежа",
      item: "Товар",
      amount: "Сумма",
      orderId: "ID заказа",
      copyOrderId: "Скопировать ID заказа",
      orderIdCopied: "ID заказа скопирован",
      checkingStatus: "Проверка статуса оплаты...",
      paymentCompleted: "Оплата успешно завершена!",
      paymentFailed: "Оплата не завершена",
      securityInfo: "Оплата обрабатывается через защищенный сервис Cryptomus. Ваши данные защищены.",
      cancel: "Отмена",
      proceedToPayment: "Перейти к оплате",
      navigating: "Переход...",
    },
    lumiCollapse: "Свернуть",
    lumiExpand: "Развернуть",
    lumiShowOriginal: "Показать оригинал",
    lumiShowTranslation: "Показать перевод на русский",
    hardestQuestions: "Сложные вопросы",
    hardestQuestionsDesc: "Вопросы, на которые большинство пользователей отвечают неправильно",
    masteryMode: "Режим мастерства",
    masteryModeDesc: "Повторяй пока не ответишь на всё правильно. Неправильные вопросы повторяются",
    examSimulator: "Симулятор экзамена",
    examSimulatorDesc: "Пройди тест с таймером. Точная копия реального экзамена",
    moduleTest: "Тест по модулю",
    moduleTestDesc: "Проверь свои знания по конкретному модулю",
    finalTest: "Финальный тест",
    finalTestDesc: "Финальный тест охватывает все модули и является главной проверкой твоих знаний",
    level: "Уровень",
    points: "Очки",
    lessons: "Уроки",
    correctOnFirstTry: "Правильно с первого раза",
    answeredQuestions: "Отвеченные вопросы",
    correctAnswers: "Правильные ответы",
    moreStatistics: "БОЛЬШЕ СТАТИСТИКИ",
    leaderboard: "Таблица лидеров",
    you: "Ты",
    inviteFriends: "ПРИГЛАСИТЬ ДРУЗЕЙ",
    selectQuestionCount: "Выбери количество вопросов",
    startTest: "Начать тест",
    testsPage: {
      title: "Центр тестирования",
      subtitle: "Выбирайте режим и улучшайте свои навыки",
      randomTest: "Случайный тест",
      randomTestDesc: "Выберите количество вопросов для быстрой проверки знаний",
      questionCount: "Количество вопросов:",
      startButton: "Начать тест",
      exam: "Экзамен",
      examDesc: "Полная симуляция официального экзамена",
      blitz: "Блиц",
      blitzDesc: "5 мин · 20 вопросов",
      marathon: "Марафон",
      marathonDesc: "Пока не ответишь идеально",
      challengeBank: "Ошибки",
      challengeBankDesc: "{{count}} вопросов",
      hardest: "Сложные",
      hardestDesc: "ТОП-50",
      topicsTitle: "Темы курса",
      questions: "вопросов",
      stats: {
        accuracy: "Точность",
        answered: "Ответов",
        errors: "Ошибок",
        level: "Уровень",
      },
    },
    
    // Learning map / curriculum
    completed: "Изучено",
    in_progress: "В процессе",
    locked: "Закрыто",
    coming_soon: "Скоро",
    module: "Модуль",
    progress: "Прогресс",
    continue_topic: "Продолжить тему",
    block: "Блок",
    
    // Footer
    footer: {
      companyDescription: "Образовательная платформа для подготовки к экзаменам DGT в Испании",
      address: "Испания, Таррагона",
      contact: "Контакты: support@skilyapp.com",
      legal: "Правовая информация",
      blog: "Блог",
      help: "Помощь",
      about: "О нас",
      terms: "Условия использования",
      privacy: "Политика конфиденциальности",
      subscriptionTerms: "Условия подписки",
      pricing: "Цены",
      refundPolicy: "Политика возврата",
      resources: "Ресурсы",
      becomePartner: "Стать партнером",
      partnerPending: "Заявка на рассмотрении",
      partnerDashboard: "Кабинет партнера",
      support: "Поддержка",
      supportEmail: "support@skilyapp.com",
      copyright: "© 2025 Sdadim. Все права защищены.",
      rightsReserved: "Все права защищены",
    },
    boostShop: {
      title: "Магазин",
      tabs: {
        boosts: "Бусты",
        coins: "Монеты",
        premium: "Premium",
        history: "История",
      },
      sections: {
        popular: "Популярные бусты",
        premium: "Премиум бусты",
        premiumBadge: "Premium",
        empty: "Бусты скоро появятся",
      },
      boostNames: {
        fifty_fifty: {
          name: "50/50",
          description: "Убирает два неправильных ответа",
        },
        time_extend: {
          name: "+30 секунд",
          description: "Добавляет время на сложные вопросы",
        },
        hint: {
          name: "Подсказка",
          description: "Моментально показывает объяснение",
        },
        skip: {
          name: "Пропустить",
          description: "Пропускает вопрос без потери серии",
        },
        translate: {
          name: "Перевод",
          description: "Переводит вопрос и ответы",
        },
      },
      coins: {
        topUpTitle: "Пополните баланс монет",
        packLabel: "{{amount}} монет",
        bonusLabel: "+{{bonus}} бонус",
        buyButton: "Купить",
        premiumHint: "💡 Получайте больше монет с Premium",
        successTitle: "✅ Оплата успешна!",
        successDescription: "Вы получили {{amount}} монет",
        purpose: "Для бустов, дуэлей и премиум-доступа",
        perCoin: "€{{price}} за монету",
        deliveryHint: "Мгновенное зачисление · Безопасная оплата",
        buyPackAria: "Купить пакет на {{amount}} монет",
        tags: {
          starter: "Быстрый старт",
          bestValue: "Выгоднее всего",
        },
        descriptions: {
          starter: "Быстрый заряд перед тестом или дуэлью",
          grinder: "Идеален для ежедневных дуэлей и серий",
          pro: "Хватает на полноценную неделю прогресса",
          elite: "Полный контроль над турнирами и премиум-скинами",
        },
        helpers: {
          starter: "Начни с малого — переходи на большие пакеты в любой момент",
          grinder: "Хватит, чтобы попробовать каждый буст и поделиться с друзьями",
          pro: "Сбалансированный пакет для стабильного роста",
          elite: "Мгновенно открывай премиум-наборы и редкую косметику",
        },
      },
      premium: {
        title: "Premium подписка",
        subtitle: "Получите максимум от обучения",
        activeBadge: "Активна",
        benefits: {
          unlimitedTests: "Безлимитный доступ ко всем тестам",
          bonusCoins: "+50% монет за обучение",
          duelPassRewards: "Duel Pass Premium награды",
          instantHints: "Без рекламы и мгновенные подсказки",
        },
        monthlyLabel: "Месяц",
        yearlyLabel: "Год",
        lifetimeLabel: "Навсегда",
        yearlySuffix: "/год",
        lifetimeSuffix: "Один раз навсегда",
        savingsLabel: "Экономия 50%",
        bestBadge: "Лучшее",
        popularBadge: "Популярно",
        chooseButton: "Выбрать",
        activeButton: "Активна",
      },
      duelPass: {
        title: "Duel Pass",
        description: "Получайте эксклюзивные награды за каждый уровень! Premium удваивает все награды.",
        button: "Открыть Duel Pass",
        toastTitle: "Duel Pass",
        toastDescription: "Откройте Duel Pass на главной странице",
      },
      history: {
        title: "История монет",
        operationsCount: "{{count}} операций",
        filters: {
          all: "Все",
          earn: "Доходы",
          spend: "Расходы",
          purchase: "Покупки",
          reward: "Награды",
        },
        empty: {
          all: {
            title: "Здесь появятся твои транзакции",
            description: "Начни зарабатывать монеты, проходя тесты и дуэли!",
            premiumHint: "💡 Premium удваивает награды",
          },
          earn: {
            title: "Нет доходов",
            description: "Проходи тесты, выигрывай дуэли и получай ежедневные бонусы!",
          },
          spend: {
            title: "Нет расходов",
            description: "Покупай бусты и используй их для улучшения результатов!",
          },
          purchase: {
            title: "Нет покупок",
            description: "Пополни баланс монет или получи Premium для больше возможностей!",
          },
          reward: {
            title: "Нет наград",
            description: "Получай награды за Duel Pass, рефералов и достижения!",
          },
        },
        tryOtherFilter: "Попробуйте другой фильтр",
        badges: {
          purchase: "Покупка",
          reward: "Награда",
        },
      },
      buttons: {
        buy: "Купить",
        select: "Выбрать",
        active: "Активна",
        insufficient: "Недостаточно",
        premium: "Premium",
      },
      toasts: {
        errorTitle: "❌ Ошибка",
        needLogin: "Необходимо войти в систему",
        sessionError: "Не удалось получить ссылку на оплату",
        historyError: "Ошибка загрузки истории",
        paymentSuccessTitle: "✅ Оплата успешна!",
        paymentSuccessDescription: "Вы получили {{amount}} монет",
        purchaseSuccessTitle: "✅ Покупка успешна!",
        purchaseSuccessDescription: "{{name}} добавлен в инвентарь",
        purchaseErrorTitle: "❌ Ошибка покупки",
        purchaseErrorDescription: "Не удалось совершить покупку. Попробуйте ещё раз.",
        rlsError: "Ошибка доступа. Попробуйте обновить страницу и войти снова.",
        insufficientCoins: "Вам нужно ещё {{amount}} монет",
      },
      transactions: {
        coinsPurchasePaddle: "Покупка монет: {{amount}}",
        premiumPurchase: "Premium подписка ({{type}})",
        premiumType: {
          monthly: "месяц",
          yearly: "год",
          forever: "навсегда",
        },
        duelPassPurchase: "Покупка Duel Pass",
        duelPassReward: "Награда Duel Pass{{level}}{{premium}}",
        duelPassRewardLevelSuffix: " (уровень {{level}})",
        duelPassRewardPremiumSuffix: " [Premium]",
        referralReward: "Реферальная награда: {{name}}",
        referralJoined: "Бонус за регистрацию по реферальной ссылке",
        referralFallbackName: "друг",
        coinsEarnedTest: "Награда за тест",
        coinsEarnedDuel: "Награда за дуэль",
        coinsEarnedDaily: "Ежедневный бонус",
        coinsEarnedPremiumBonus: "Premium бонус",
        coinsSpentBoost: "Покупка буста: {{name}}",
        coinsSpentSkin: "Покупка скина",
        coinsSpentDuelEntry: "Вход в дуэль",
        bet: "Ставка в дуэли",
        win: "Выигрыш в дуэли",
        refund: "Возврат ставки",
        commission: "Комиссия системы",
      },
    },
    profileMenu: {
      title: "Профиль",
      loading: "Загрузка профиля...",
      notFound: "Профиль не найден",
      xpLabel: "XP",
      xpDescription: "Очки опыта",
      notifications: "Уведомления",
      achievements: "Мои достижения",
      invite: "Пригласить",
      inventory: "Инвентарь",
      achievementsDesc: "Следите за прогрессом и открывайте новые награды",
      blog: "Блог",
      legal: "Правовые документы",
      connectedAccounts: "Подключённые аккаунты",
      helpCenter: "Центр помощи",
      adminPanel: "Админ-панель",
      connect: "Подключить",
      connected: "Подключено",
      notConnected: "Не подключено",
      appearance: "Внешний вид",
      proBadge: "PRO",
      toasts: {
        settingsSaved: "Настройки сохранены",
        settingsFailed: "Не удалось сохранить настройки",
        avatarUploadError: "Не удалось загрузить аватар",
        nameChangeError: "Не удалось изменить имя",
        googleRedirect: "Перенаправляем в Google...",
        googleLinkError: "Не удалось связать Google-аккаунт",
      },
    },
    achievementsModal: {
      title: "Достижения",
      description: "Отслеживайте прогресс и открывайте награды — всё в одном окне",
      totalXP: "Всего опыта",
      xpToNextLevel: "До следующего уровня: {{xp}} XP",
      currentLevel: "Текущий уровень",
      xpRemaining: "Осталось {{xp}} XP",
      unlockedCount: "Открыто достижений",
      progress: "Прогресс",
      progressLabel: "Прогресс",
      unlocked: "Получено",
      categories: {
        beginner: "Новичок",
        master: "Мастер",
        streak: "Серия",
        accuracy: "Точность",
        games: "Игры",
        learning: "Обучение",
        other: "Другое",
      },
      list: {
        leader_of_roads: {
          title: "Лидер дорог",
          description: "Занять первое место в рейтинге среди учеников",
        },
        spanish_driver: {
          title: "Испанский водитель",
          description: "Пройти финальный тест по ПДД",
        },
        photomodel: {
          title: "Фотомодель",
          description: "Добавить фото в профиль",
        },
        novice: {
          title: "Новичок",
          description: "Завершить первый урок по ПДД",
        },
        weekend_warrior: {
          title: "Воин выходного дня",
          description: "Пройти тест в субботу и воскресенье",
        },
        enthusiast: {
          title: "Энтузиаст",
          description: "Заниматься 3 дня подряд",
        },
        social_butterfly: {
          title: "Душа компании",
          description: "Пригласить 3 друзей в приложение",
        },
        strategist: {
          title: "Стратег",
          description: "Завершить все дополнительные тесты",
        },
        true_student: {
          title: "Настоящий ученик",
          description: "Завершить 10 дней подряд без пропусков",
        },
        flawless_driver: {
          title: "Безошибочный водитель",
          description: "Пройти 20 уроков без ошибок",
        },
        examiner: {
          title: "Экзаменатор",
          description: "Пройти 20 экзаменационных тестов",
        },
        sign_sniper: {
          title: "Снайпер знаков",
          description: "Узнать 50 знаков без ошибок",
        },
        pdd_genius: {
          title: "Гений ПДД",
          description: "Набрать 100% правильных ответов в экзаменационном тесте",
        },
        sign_master: {
          title: "Знаток знаков",
          description: "Выучить 100 дорожных знаков",
        },
        pdd_master: {
          title: "Мастер ПДД",
          description: "Набрать 4000 очков опыта",
        },
      },
    },
    wallet: {
      duelPassTooltipMobile: "Duel Pass уровень {{level}} - {{xp}} SP",
      duelPassTooltipDesktop: "Duel Pass уровень {{level}} - нажмите, чтобы открыть сезон",
      duelPassRewardReady: "Награда ждёт — нажми, чтобы забрать",
    },
    duelPass: {
      title: "Duel Pass",
      rarity: {
        common: "Обычный",
        rare: "Редкий",
        epic: "Эпик",
        legendary: "Легенда",
      },
      rewardTypes: {
        coins: { label: "Монеты", subtitle: "Моментально на баланс" },
        skin: { label: "Скин", subtitle: "Новый образ профиля" },
        badge: { label: "Бейдж", subtitle: "Коллекция достижений" },
        boost: { label: "Буст", subtitle: "Ускорение прогресса" },
        sticker: { label: "Стикер", subtitle: "Эмоции в дуэлях" },
        trophy: { label: "Трофей", subtitle: "Эксклюзивная награда" },
      },
      fallbackRewardName: "Награда",
      countdown: {
        label: "До финала сезона",
        dateTbc: "Даты уточняются",
        urgent: "Сезон скоро завершится — не откладывай награды!",
        units: { days: "дни", hours: "часы", minutes: "мин", seconds: "сек" },
      },
      hero: {
        seasonLabel: "СЕЗОН №{{number}}",
        specialTheme: "Операция Асфальт",
        defaultDescription: "Собирай монеты, бусты и эксклюзивные косметики, пока сезон открыт.",
        featuredTitle: "Ключевые награды",
        featuredEmpty: "Эксклюзивные награды появятся после обновления сезона",
        countdownLabel: "До финала сезона",
        daysLeft: "{{count}} дней до закрытия",
        levelsRemaining: "Осталось {{count}} уровней до полного пропуска",
      },
      progress: {
        currentLevelLabel: "Текущий уровень",
        seasonPointsLabel: "Текущие SP",
        seasonPoints: "Сезонные очки",
        summary: "Всего {{total}} SP",
        nextLevel: "След. уровень через {{sp}} SP",
        toNext: "{{sp}} SP до уровня {{level}}",
        max: "Максимальный уровень достигнут",
        loading: "Загрузка...",
        levelOf: "/ {{total}}",
      },
      highlights: {
        pace: {
          title: "Темп сезона",
          value: "{{current}}/{{total}} уровень",
          descriptionToNext: "Еще {{sp}} SP до {{level}}-го уровня",
          descriptionMax: "Ты на вершине! Продолжай фармить SP ради славы",
          descriptionLoading: "Обновляем прогресс...",
        },
        collection: {
          title: "Коллекция Asphalt",
          value: "{{claimed}}/{{total}} наград",
          description: "Собери всю линию и разблокируй сезонный титул",
        },
        limit: {
          title: "Ограничение",
          valueFallback: "Скоро",
          descriptionDays: "Осталось примерно {{days}} дней",
          descriptionFallback: "Проверь даты сезона в календаре",
        },
      },
      filters: {
        all: "Все",
        available: "Доступные",
      },
      table: {
        title: "Награды по уровням",
        remaining: "До конца {{days}}д",
        columns: {
          level: "Уровень",
          free: "Бесплатно",
          premium: "Premium",
          sp: "SP",
          status: "Статус",
        },
        status: {
          current: "Текущий",
          claimed: "Получено",
          locked: "Заблокировано",
        },
        spBadge: "+{{sp}} SP",
        buttons: {
          claim: "Получить",
          claimPremium: "Забрать награду",
          premiumOnly: "Premium",
          default: "Забрать",
        },
        lockedBadge: "Заблокировано",
      },
      premiumBanner: {
        title: "Premium Duel Pass",
        freeBadge: "Бесплатно",
        descriptionForever: "У тебя Premium Forever — Duel Pass уже открыт!",
        descriptionQuestion: "Что такое Duel Pass?",
        descriptionText: "Сезонная система наград. Premium версия удваивает каждую награду.",
        buyCta: "Купить за 7.99€",
        benefits: {
          double: { title: "2x награды", description: "Удвоенные монеты и XP" },
          exclusive: { title: "Эксклюзивы", description: "Уникальные косметики" },
          fastStart: { title: "Быстрый старт", description: "+5 уровней сразу" },
          allSeasons: { title: "Все сезоны", description: "Доступ ко всем наградам" },
        },
      },
      premiumForever: {
        title: "Premium Forever активен",
        description: "Duel Pass открыт для всех сезонов",
      },
      toasts: {
        rewardError: "Ошибка при получении награды",
        rewardErrorDescription: "Попробуйте позже",
        rewardClaimed: "Награда получена!",
        premiumReward: "🎉 Премиум награда получена!",
        rewardDescription: "Уровень {{level}}: {{reward}}",
        genericReward: "Награда разблокирована!",
      },
      onboarding: {
        slide1: {
          title: "Добро пожаловать в<br />Duel Pass!",
          description: "Сезонная система наград за твою активность. Фарми SP, поднимай уровни и получай эксклюзивные награды!",
        },
        slide2: {
          title: "Что такое SP?",
          subtitle: "Season Points — твоя валюта сезона",
          tests: "Тесты",
          duels: "Дуэли",
          daily: "Ежедневка",
          spPerAction: "SP за действие",
          premiumBonus: "Premium: +20% к SP",
          premiumDescription: "С Premium подпиской получай больше SP за каждое действие",
        },
        slide3: {
          title: "30 уровней уникальных наград",
          subtitle: "Больше SP = выше уровень = больше наград!",
          coins: "Монеты",
          skins: "Скины",
          badges: "Бейджи",
          boosts: "Бусты",
          progressTitle: "Прогресс по уровням",
          progressDescription: "Каждый уровень открывает новые эксклюзивные награды",
        },
        slide4: {
          title: "Раскрывай сезон полностью",
          subtitle: "Premium Pass открывает лучшее",
          freePass: "Free Pass",
          premiumPass: "Premium Pass",
          freeFeatures: {
            missions: "Доступ к миссиям",
            basicRewards: "Базовые награды",
            levelProgress: "Прогресс по уровням",
          },
          premiumFeatures: {
            doubleRewards: "Награды x2",
            exclusive: "Эксклюзивные косметики",
            instantLevels: "+5 уровней сразу",
            allSeasons: "Все сезоны",
          },
        },
        slide5: {
          title: "Сезон ограничен по времени!",
          description: "Награды исчезнут через {{days}}",
          day: "день",
          days: "дней",
          daysFew: "дня",
        },
        button: "Понятно, начать!",
        skip: "Пропустить",
        next: "Далее",
        back: "Назад",
        dontShowAgain: "Не показывать снова",
        dialogDescription: "Добро пожаловать в Duel Pass - систему наград за активность",
      },
      migration: {
        title: "Duel Pass",
        description: "Система сезонов",
        warningTitle: "⚠️ Миграция не применена",
        warningDescription: "Примените миграцию в Supabase, чтобы включить сезоны:",
        steps: [
          "Откройте SQL Editor в Supabase Dashboard",
          "Вставьте содержимое файла APPLY_SEASON_MIGRATION_NOW.sql",
          "Выполните SQL запрос",
        ],
        noSeason: "Нет активного сезона",
      },
    },
    learningMap: {
      loading: "Загрузка карты обучения...",
      errors: {
        title: "Ошибка загрузки",
        retry: "Попробовать снова",
        generic: "Не удалось загрузить карту обучения. Попробуйте обновить страницу.",
      },
      hero: {
        badge: "Структурированная карта курса ПДД",
        title: "Карта обучения",
        description: "Все темы и подтемы в одном месте. Начните с первой незавершённой подтемы или выберите любой модуль.",
      },
      variants: {
        radial: "Вариант A · Кольцевая диаграмма",
        ribbons: "Вариант B · Лентовые бейджи",
      },
      stats: {
        overallTitle: "Общий прогресс",
        overallAverage: "Среднее по {{count}} темам",
        topicsLabel: "Темы",
        subtopicsLabel: "Подтемы",
        topicProgress: "Прогресс тем",
        subtopicProgress: "Прогресс подтем",
      },
      actions: {
        continue: "Продолжить",
        start: "Начать обучение",
        selectModule: "Перейдите к первому доступному модулю",
      },
      empty: {
        title: "Темы пока не добавлены",
        description: "Мы уже собираем контент. Зайдите позже, чтобы увидеть полный маршрут.",
      },
      additionalMaterials: "Дополнительные материалы",
      tests: {
        sectionTitle: "Тесты по модулю",
        trainingTest: "Тренировочный тест по теме",
        finalTest: "Итоговый тест по модулю",
      },
    },
    learningPage: {
      badge: "Обучение",
      badgeSubtext: "Карта + ресурсы",
      title: "Карта обучения и все материалы",
      subtitle: "Строй маршрут, подключай справочники, словари и дополнительные модули, не выходя из одной страницы.",
      materials: {
        title: "Материалы",
        quickAccess: "Быстрый доступ",
        newBadge: "+ новые",
        dgtExams: "Экзамены DGT",
        dgtExamsDesc: "4000+ реальных вопросов по категориям A1, B, D с адаптивными подсказками",
        updateBadge: "Обновление",
        roadSigns: "Дорожные знаки",
        roadSignsDesc: "Каталог знаков с примерами ситуаций и быстрым поиском",
        dictionary: "Словарь терминов",
        dictionaryDesc: "Испанские термины ПДД с переводом и озвучкой",
        videoCourse: "Видеокурс",
        videoCourseDesc: "Серия коротких разборов самых сложных тем теории",
        comingSoon: "Скоро",
      },
      support: {
        title: "Справка",
        helpAndGuides: "Помощь и гайды",
        appGuide: "Справочник приложения",
        appGuideDesc: "Как устроены уровни, XP, награды и подписки",
        helpSupport: "Помощь и поддержка",
        helpSupportDesc: "FAQ, инструкции и быстрый выход на поддержку",
      },
      blog: {
        title: "Блог",
        freshMaterials: "Свежие материалы",
        readMore: "Читать",
        allArticles: "Все статьи",
        guides: "гайд",
        tips: "советы",
        statistics: "статистика",
        articles: "15+ статей",
        fullGuide: "Полный гайд",
        mapGuide: "Как использовать карту обучения, чтобы пройти теорию с первого раза",
        habitsGuide: "5 привычек, которые ускоряют подготовку к экзамену DGT",
        topErrors: "Топ-10 ошибок на экзамене DGT",
      },
      ideas: {
        title: "Идеи",
        expressModes: "Экспресс-режимы",
        gamesDuels: "Игры и дуэли",
        gamesDuelsDesc: "Разминай реакцию и внимательность, когда устал от теории",
        challengeBank: "Банк челленджей",
        challengeBankDesc: "Собери подборки вопросов по слабым местам и делись с друзьями",
        sequentialTests: "Последовательные тесты",
        sequentialTestsDesc: "Проходи тесты в правильном порядке, как на экзамене",
      },
      quickActions: {
        title: "Быстро",
        additional: "Дополнительно",
        blog: "Блог",
        blogDesc: "Статьи, гайды и советы по подготовке",
        guide: "Справочник",
        guideDesc: "Полная документация по приложению",
      },
    },
    article: {
      nav: {
        back: "← Все статьи",
        home: "Главная",
      },
      meta: {
        publishedOn: "Опубликовано {{date}}",
        inCategory: "в {{category}}",
        readTime: "{{minutes}} мин чтения",
      },
      share: {
        title: "Поделиться",
        button: "Поделиться",
        copied: "Ссылка скопирована в буфер обмена",
      },
      relatedTitle: "Связанные статьи",
      toc: {
        title: "Содержание",
      },
      cta: {
        title: "Подготовьтесь к экзамену DGT в Skilyapp",
        description: "Откройте тренировки, тесты, дуэли и аналитику в одном приложении.",
        button: "Начать бесплатно",
      },
    },
  },
};

const languageOverrides: Partial<Record<Language, Record<string, any>>> = {
  ru: {
    dashboard: {
      onlineStatus: "Система онлайн",
      licenseStatus: "Лицензия B",
      cockpitButton: "Панель пилота",
      heroGreeting: "Привет, пилот!",
      heroEfficiencyPrefix: "Твоя эффективность составляет",
      heroStatus: {
        ready: "Датчики показывают, что ты готов к новой сессии.",
        progress: "Продолжай тренироваться для лучшего результата.",
        start: "Рекомендуем пройти больше тестов для улучшения готовности.",
      },
      stats: {
        xp: "Опыт",
        tests: "Тестов",
        coins: "Монеты",
      },
      startButton: "Старт",
      level: "Уровень",
    },
  },
  en: {
    dashboard: {
      onlineStatus: "System online",
      licenseStatus: "License B",
      cockpitButton: "Cockpit",
      heroGreeting: "Welcome, Pilot!",
      heroEfficiencyPrefix: "Your efficiency is",
      heroStatus: {
        ready: "Sensors show you're ready for the next session.",
        progress: "Keep training to push the score higher.",
        start: "Run more tests to boost your readiness.",
      },
      stats: {
        xp: "XP",
        tests: "Tests",
        coins: "Coins",
      },
      startButton: "Start",
      level: "Level",
    },
  },
};

const resolveFromObject = (source: Record<string, any> | undefined, key: string): any => {
  if (!source) return undefined;
  const keys = key.split('.');
  let value: any = source;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  // Это позволяет LanguageProvider работать на лендинге (где UserProvider отсутствует)
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const [language, setLanguageState] = useState<Language>(() => detectPreferredLanguage());

  const applyLanguage = useCallback((lang: Language, persist: boolean = true) => {
    setLanguageState(lang);
    if (persist && isBrowser) {
      localStorage.setItem('app_language', lang);
    }
  }, []);

  // Load language from profile on mount
  useEffect(() => {
    const loadLanguage = async () => {
      if (!profileId) {
        applyLanguage(detectPreferredLanguage());
        return;
      }

      // ОПТИМИЗАЦИЯ: Динамически создаем клиент только при наличии profileId
      const supabase = await getSupabaseClient();

      const { data } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      const lang = (data?.settings as Record<string, unknown> | null)?.language as Language | undefined;
      if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
        applyLanguage(lang);
        return;
      }

      applyLanguage(detectPreferredLanguage());
    };

    loadLanguage();
  }, [profileId, applyLanguage]);

  const setLanguage = async (lang: Language) => {
    applyLanguage(lang);

    // Save to database if user is logged in
    if (profileId) {
      // ОПТИМИЗАЦИЯ: Динамически создаем клиент только при наличии profileId
      const supabase = await getSupabaseClient();
      
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      const currentSettings = (currentProfile?.settings as Record<string, any>) || {};

      await supabase
        .from('profiles')
        .update({
          settings: {
            ...currentSettings,
            language: lang,
          },
        })
        .eq('id', profileId);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    // First try helpCenter translations (flat structure)
    if (helpCenterTranslations[language] && key in helpCenterTranslations[language]) {
      const value = helpCenterTranslations[language][key];
      return typeof value === 'string' ? applyParams(value, params) : key;
    }
    
    // Then check language overrides (for partial locales)
    const overrideValue = resolveFromObject(languageOverrides[language], key);
    if (typeof overrideValue === 'string') {
      return applyParams(overrideValue, params);
    }
    
    // Fallback to base translations (Spanish as base)
    const baseTranslations = translations[language] || translations.es;
    const resolved = resolveFromObject(baseTranslations, key);
    return typeof resolved === 'string' ? applyParams(resolved, params) : key;
  };

  const applyParams = (text: string, params?: Record<string, string | number>): string => {
    if (!params) return text;
    return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
      const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      return acc.replace(regex, String(paramValue));
    }, text);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
