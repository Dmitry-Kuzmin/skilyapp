import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "./UserContext";

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
            setLanguageState(settings.language);
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
    return translations[language][key] || key;
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
