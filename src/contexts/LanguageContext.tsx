import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "./UserContext";
import { helpCenterTranslations } from "@/translations/helpCenter";

export type Language = 'es' | 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations object
const translations: Record<Language, Record<string, string>> = {
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
    boostShop: "Tienda de potenciadores",
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
    
    // Other
    version: "v1.0.0 © 2025 Sdadim",
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
    // Lumi AI Assistant
    lumiGreeting: "¡Hola! Soy Lumi 💡",
    lumiWelcome: "¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!",
    lumiHintButton: "Dame una pista",
    lumiHelpButton: "Ayúdame a entender esto",
    lumiPlaceholder: "Haz tu pregunta aquí...",
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
      address: "Rusia, Moscú, Ciudad 122",
      contact: "Contacto: support@sdadim.com",
      legal: "Legal",
      terms: "Términos y condiciones",
      privacy: "Política de privacidad",
      subscriptionTerms: "Términos de suscripción",
      resources: "Recursos",
      support: "Soporte",
      supportEmail: "support@sdadim.com",
      copyright: "© 2025 Sdadim. Todos los derechos reservados.",
      rightsReserved: "Todos los derechos reservados",
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
    boostShop: "Boost shop",
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
    
    // Other
    version: "v1.0.0 © 2025 Sdadim",
    online: "Online",
    xpProgress: "XP to next level",
    
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
    // Lumi AI Assistant
    lumiGreeting: "Hello! I'm Lumi 💡",
    lumiWelcome: "Need a hint or a quick explanation? Just press the button or ask your question, and I'll help on the spot. Ready when you are ready!",
    lumiHintButton: "Give me a hint",
    lumiHelpButton: "Help me understand this",
    lumiPlaceholder: "Ask your question here...",
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
      companyDescription: "Educational platform for DGT exam preparation in Spain",
      address: "Russia, Moscow, City 122",
      contact: "Contact: support@sdadim.com",
      legal: "Legal",
      terms: "Terms and conditions",
      privacy: "Privacy policy",
      subscriptionTerms: "Subscription terms",
      resources: "Resources",
      support: "Support",
      supportEmail: "support@sdadim.com",
      copyright: "© 2025 Sdadim. All rights reserved.",
      rightsReserved: "All rights reserved",
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
    boostShop: "Магазин бустеров",
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
    // Lumi AI Assistant
    lumiGreeting: "Привет! Я Lumi 💡",
    lumiWelcome: "Нужна подсказка или быстрое объяснение? Просто нажми кнопку или задай свой вопрос, и я помогу на месте. Готов, когда ты готов!",
    lumiHintButton: "Дай мне подсказку",
    lumiHelpButton: "Помоги понять это",
    lumiPlaceholder: "Задай свой вопрос здесь...",
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
      address: "Россия, Москва, Сити 122",
      contact: "Контакты: support@sdadim.com",
      legal: "Правовая информация",
      terms: "Условия использования",
      privacy: "Политика конфиденциальности",
      subscriptionTerms: "Условия подписки",
      resources: "Ресурсы",
      support: "Поддержка",
      supportEmail: "support@sdadim.com",
      copyright: "© 2025 Sdadim. Все права защищены.",
      rightsReserved: "Все права защищены",
    },
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profileId } = useUserContext();
  const [language, setLanguageState] = useState<Language>('es');

  // Load language from profile on mount
  useEffect(() => {
    const loadLanguage = async () => {
      if (profileId) {
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', profileId)
          .single();

        if (data?.settings) {
          const settings = data.settings as any;
          if (settings.language) {
            const lang = settings.language as Language;
            setLanguageState(lang);
          }
        }
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('app_language') as Language;
        if (saved && ['es', 'en', 'ru'].includes(saved)) {
          setLanguageState(saved);
        }
      }
    };

    loadLanguage();
  }, [profileId]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);

    // Save to database if user is logged in
    if (profileId) {
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

  const t = (key: string): string => {
    // First try helpCenter translations (flat structure)
    if (helpCenterTranslations[language] && key in helpCenterTranslations[language]) {
      return helpCenterTranslations[language][key];
    }
    
    // Then try main translations (nested structure)
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
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
