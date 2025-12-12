import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform, initTelegram } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserContextType {
  user: TelegramUser | null;
  supabaseUser: User | null;
  session: Session | null;
  platform: 'telegram' | 'web';
  isAuthenticated: boolean;
  isLoading: boolean; // Состояние загрузки авторизации
  profileId: string | null; // ID профиля из таблицы profiles
  login: (userData: TelegramUser) => Promise<void>;
  logout: () => void;
}

const isUserContextDebug =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_USER_CONTEXT === "true";
const logUserContext = (...args: any[]) => {
  if (isUserContextDebug) {
    console.debug(...args);
  }
};

// КРИТИЧНО: Экспортируем UserContext для безопасного использования в LanguageProvider
// Это позволяет LanguageProvider работать на лендинге (где UserProvider отсутствует)
export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [platform, setPlatform] = useState<'telegram' | 'web'>('web');
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Load profile ID when user changes with optimistic loading and retry
  useEffect(() => {
    let isMounted = true;
    
    const loadProfileId = async () => {
      if (supabaseUser) {
        // For web users - get profile by user_id
        logUserContext("[UserContext] Loading profile for Supabase user:", supabaseUser.id);
        
        // Check cache first - если есть кэш, используем его и НЕ делаем запрос
        const cachedId = localStorage.getItem(`profile_${supabaseUser.id}`);
        if (cachedId) {
          logUserContext("[UserContext] ✅ Using cached profileId (no DB request):", cachedId);
          if (isMounted) setProfileId(cachedId);
          return; // ОПТИМИЗАЦИЯ: Не делаем запрос, если есть кэш
        }
        
        // Только если нет кэша - делаем запрос
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();
        
        if (isMounted && data?.id) {
          setProfileId(data.id);
          localStorage.setItem(`profile_${supabaseUser.id}`, data.id);
          logUserContext("[UserContext] Loaded profile ID for web user:", data.id);
        }
      } else if (user) {
        // For Telegram users - get profile by telegram_id with retry
        logUserContext("[UserContext] Loading profile for Telegram user:", user.id);
        
        // Check cache first - если есть кэш, используем его и НЕ делаем запрос
        const cachedId = localStorage.getItem(`profile_${user.id}`);
        if (cachedId) {
          logUserContext("[UserContext] ✅ Using cached profileId (no DB request):", cachedId);
          if (isMounted) setProfileId(cachedId);
          return; // ОПТИМИЗАЦИЯ: Не делаем запрос, если есть кэш
        }
        
        // Только если нет кэша - делаем запрос с retry
        const queryProfile = async (attempt: number = 1): Promise<void> => {
          if (!isMounted) return;
          
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[UserContext] Error loading profile:', error);
          } else if (data?.id) {
            logUserContext("[UserContext] Loaded profile ID for Telegram user:", data.id);
            if (isMounted) {
              setProfileId(data.id);
              localStorage.setItem(`profile_${user.id}`, data.id);
            }
          } else if (attempt < 3) { // ОПТИМИЗАЦИЯ: Снижаем retry с 5 до 3
            logUserContext(`[UserContext] Profile not found, retry ${attempt}/3 in 1000ms...`);
            setTimeout(() => queryProfile(attempt + 1), 1000);
          } else {
            logUserContext("[UserContext] No profile found after 3 retries");
          }
        };

        queryProfile();
      } else {
        if (isMounted) setProfileId(null);
      }
    };

    loadProfileId();
    
    return () => {
      isMounted = false;
    };
  }, [user, supabaseUser]);

  // Supabase auth listener for web users
  useEffect(() => {
    logUserContext("[UserContext] Setting up Supabase auth listener");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        logUserContext("[UserContext] Auth state changed:", event, newSession?.user?.email);
        
        // КРИТИЧНО: Сохраняем токен в IndexedDB для доступа из Service Worker
        if (newSession?.access_token) {
          const { saveAuthToken } = await import('@/utils/authTokenStorage');
          // Вычисляем expires_in из expires_at
          const expiresAt = newSession.expires_at ? newSession.expires_at * 1000 : Date.now() + 3600000;
          const expiresIn = Math.floor((expiresAt - Date.now()) / 1000);
          await saveAuthToken(newSession.access_token, expiresIn);
        }
        
        // КРИТИЧНО: Если есть реальный пользователь из Supabase, очищаем Telegram mock-данные
        if (newSession?.user) {
          logUserContext("[UserContext] Real Supabase user detected, setting user and clearing Telegram mock");
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Очищаем Telegram mock-данные, если они были установлены
          setUser(prevUser => {
            if (prevUser && (prevUser.id === 123456789 || prevUser.username === 'test_user')) {
              logUserContext("[UserContext] Clearing Telegram mock user");
              window.puzzleUser = null;
              return null;
            }
            return prevUser;
          });
        } else {
          setSession(newSession);
          setSupabaseUser(newSession?.user ?? null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      logUserContext("[UserContext] Existing session:", existingSession?.user?.email);
      if (existingSession?.user) {
        logUserContext("[UserContext] Real Supabase user found in existing session");
        setSession(existingSession);
        setSupabaseUser(existingSession.user);
        // Очищаем Telegram mock-данные, если они были установлены
        setUser(prevUser => {
          if (prevUser && (prevUser.id === 123456789 || prevUser.username === 'test_user')) {
            logUserContext("[UserContext] Clearing Telegram mock user on session check");
            window.puzzleUser = null;
            return null;
          }
          return prevUser;
        });
      } else {
        setSession(existingSession);
        setSupabaseUser(existingSession?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initialize Telegram user with enhanced fallbacks
  useEffect(() => {
    const initializeAuth = async () => {
      logUserContext("[UserContext] Initializing...");
      
      // КРИТИЧНО: Если уже есть реальный пользователь из Supabase, не используем Telegram mock
      // Проверяем сессию Supabase перед инициализацией Telegram
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession?.user) {
        logUserContext("[UserContext] Real Supabase user found, skipping Telegram initialization");
        setSupabaseUser(existingSession.user);
        setSession(existingSession);
        setIsLoading(false);
        return;
      }
      
      // Проверяем, является ли Telegram WebApp моком
      const isMockTelegram = window.Telegram?.WebApp?.initData === 'mock_init_data' ||
                            window.Telegram?.WebApp?.initData?.startsWith('mock_') ||
                            (window.Telegram?.WebApp?.initDataUnsafe?.user?.id === 123456789 && 
                             window.Telegram?.WebApp?.initDataUnsafe?.user?.username === 'test_user');
      
      if (isMockTelegram) {
        logUserContext("[UserContext] Mock Telegram detected, skipping initialization");
        setIsLoading(false);
        return;
      }
      
      // Multiple attempts to get Telegram user data
      let telegramUser = initTelegram();
      
      // Retry mechanism for Telegram WebApp initialization
      if (!telegramUser && window.Telegram?.WebApp && !isMockTelegram) {
        logUserContext("[UserContext] First attempt failed, retrying...");
        await new Promise(resolve => setTimeout(resolve, 300));
        telegramUser = getTelegramUser();
        
        // Проверяем, не мок ли это
        if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
          logUserContext("[UserContext] Mock user detected in retry, skipping");
          telegramUser = null;
        }
        
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 500));
          telegramUser = getTelegramUser();
          
          // Проверяем, не мок ли это
          if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
            logUserContext("[UserContext] Mock user detected in retry, skipping");
            telegramUser = null;
          }
        }
        
        // Additional retry with longer delay
        if (!telegramUser) {
          await new Promise(resolve => setTimeout(resolve, 800));
          telegramUser = getTelegramUser();
          
          // Проверяем, не мок ли это
          if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
            logUserContext("[UserContext] Mock user detected in retry, skipping");
            telegramUser = null;
          }
        }
      }
      
      // Fallback to window.puzzleUser or localStorage (только если не мок)
      if (!telegramUser) {
        logUserContext("[UserContext] Checking fallback sources...");
        if (window.puzzleUser) {
          // Проверяем, не мок ли это
          if (window.puzzleUser.id === 123456789 || window.puzzleUser.username === 'test_user') {
            logUserContext("[UserContext] Mock user in window.puzzleUser, skipping");
          } else {
            logUserContext("[UserContext] Using window.puzzleUser");
            telegramUser = window.puzzleUser;
          }
        } else {
          const storedUserStr = localStorage.getItem('puzzle_user');
          if (storedUserStr) {
            try {
              const parsedUser = JSON.parse(storedUserStr);
              // Проверяем, не мок ли это
              if (parsedUser.id === 123456789 || parsedUser.username === 'test_user') {
                logUserContext("[UserContext] Mock user in localStorage, skipping");
              } else {
                logUserContext("[UserContext] Using stored user from localStorage");
                telegramUser = parsedUser;
              }
            } catch (err) {
              console.error('[UserContext] Failed to parse stored user:', err);
            }
          }
        }
      }
      
      // Check platform after initialization
      const detectedPlatform = getPlatform();
      const isTelegramEnv = isTelegramMiniApp();

      logUserContext("[UserContext] Detected platform:", detectedPlatform);
      logUserContext("[UserContext] Is Telegram Mini App:", isTelegramEnv);
      logUserContext("[UserContext] Telegram User from init:", telegramUser);
      logUserContext("[UserContext] WebApp initDataUnsafe:", window.Telegram?.WebApp?.initDataUnsafe);

      setPlatform(detectedPlatform);

      // Auto-login for Telegram Mini App with user data (только если не мок)
      if (telegramUser && telegramUser.id !== 123456789 && telegramUser.username !== 'test_user') {
        logUserContext("[UserContext] Auto-logging in Telegram user:", telegramUser.first_name);
        
        // Set user immediately for instant UI feedback
        setUser(telegramUser);
        window.puzzleUser = telegramUser;
        window.puzzleCodeData = {
          FIRST_NAME: telegramUser.first_name,
          LAST_NAME: telegramUser.last_name,
          USERNAME: telegramUser.username,
          ID: telegramUser.id,
          LANGUAGE: telegramUser.language_code,
          PLATFORM: detectedPlatform
        };
        
        // Persist to localStorage
        localStorage.setItem('puzzle_user', JSON.stringify(telegramUser));
        
        // Save to backend asynchronously (don't block UI)
        login(telegramUser).catch(err => {
          console.error('[UserContext] Auto-login failed:', err);
        });
      } else {
        // Check for stored token
        const token = localStorage.getItem('telegram_token');
        
        if (!token) {
          logUserContext("[UserContext] No stored session - user needs to login");
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (userData: TelegramUser) => {
    logUserContext("[UserContext] Login started for:", userData.first_name);
    
    // Update local state immediately for instant UI feedback
    setUser(userData);
    window.puzzleUser = userData;
    
    // Determine the actual platform based on current environment
    const isTelegramEnv = isTelegramMiniApp();
    const actualPlatform = isTelegramEnv ? 'telegram' : 'web';
    
    // Set platform immediately
    setPlatform(actualPlatform);
    
    window.puzzleCodeData = {
      ...window.puzzleCodeData,
      FIRST_NAME: userData.first_name,
      LAST_NAME: userData.last_name,
      USERNAME: userData.username,
      ID: userData.id,
      LANGUAGE: userData.language_code,
      PLATFORM: actualPlatform
    };
    
    // Store in localStorage for persistence
    localStorage.setItem('puzzle_user', JSON.stringify(userData));

    try {
      logUserContext("[UserContext] Saving to backend with platform:", actualPlatform);
      
      // Check for referral code from deep link
      const referralCode = sessionStorage.getItem('referral_code');
      if (referralCode) {
        logUserContext("[UserContext] Found referral code:", referralCode);
      }

      // КРИТИЧНО: Проверяем партнерский код из start_param
      const partnerRefCode = sessionStorage.getItem('partner_ref_code');
      if (partnerRefCode) {
        logUserContext("[UserContext] Found partner ref code:", partnerRefCode);
      }
      
      logUserContext("[UserContext] User data:", { 
        id: userData.id, 
        first_name: userData.first_name,
        platform: actualPlatform,
        hasReferralCode: !!referralCode,
        hasPartnerRefCode: !!partnerRefCode
      });
      
      const { data: result, error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          user: userData,
          platform: actualPlatform,
          referred_by_code: referralCode || undefined,
        },
      });

      if (error) {
        console.error('[UserContext] Backend error:', error);
        throw error;
      }

      logUserContext("[UserContext] Backend response:", result);

      // If we got profile data back, immediately set profileId
      if (result?.profile?.id) {
        logUserContext("[UserContext] Setting profileId from backend response:", result.profile.id);
        setProfileId(result.profile.id);
        localStorage.setItem(`profile_${userData.id}`, result.profile.id);

        // КРИТИЧНО: Связываем пользователя с партнером после создания профиля
        if (partnerRefCode) {
          try {
            logUserContext("[UserContext] Linking user to partner:", partnerRefCode);
            const { data: linkResult, error: linkError } = await supabase.rpc(
              'link_user_to_partner_from_start_param',
              {
                p_user_id: result.profile.id,
                p_start_param: partnerRefCode.startsWith('partner_') ? partnerRefCode : `partner_${partnerRefCode}`
              }
            );

            if (linkError) {
              console.error('[UserContext] Failed to link user to partner:', linkError);
            } else if (linkResult && linkResult.length > 0 && linkResult[0].success) {
              logUserContext("[UserContext] User linked to partner:", {
                partner_id: linkResult[0].partner_id,
                partner_code: linkResult[0].partner_code
              });
            } else {
              logUserContext("[UserContext] Partner link result:", linkResult?.[0]?.message || 'Unknown');
            }
          } catch (linkErr) {
            console.error('[UserContext] Exception linking user to partner:', linkErr);
            // Не прерываем процесс из-за ошибки связки с партнером
          }
        }
      }

      // Store token if provided
      if (result?.token) {
        localStorage.setItem('telegram_token', result.token);
      }
      
      // Clear referral code after successful use
      if (referralCode) {
        sessionStorage.removeItem('referral_code');
        logUserContext("[UserContext] Referral code cleared from session");
      }

      // Clear partner ref code after successful use
      if (partnerRefCode) {
        sessionStorage.removeItem('partner_ref_code');
        logUserContext("[UserContext] Partner ref code cleared from session");
      }
      
      logUserContext("[UserContext] User saved to backend successfully");
    } catch (error) {
      console.error('[UserContext] Backend save error:', error);
      // Don't throw - user is already set locally
      // This ensures UI works even if backend is down
    }
  };

  const logout = async () => {
    logUserContext("[UserContext] Logging out");
    
    // Sign out from Supabase if web platform
    if (platform === 'web' && session) {
      await supabase.auth.signOut();
    }
    
    // Очищаем состояние пользователя
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    window.puzzleUser = null;
    window.puzzleCodeData = {
      PLATFORM: platform
    };
    
    // Очищаем localStorage
    localStorage.removeItem('telegram_token');
    localStorage.removeItem('puzzle_user');
    
    // КРИТИЧНО: Очищаем кэш React Query и IndexedDB
    try {
      // Очищаем IndexedDB кэш
      const { del } = await import('idb-keyval');
      await del('SDADIM_REACT_QUERY_OFFLINE_CACHE');
      console.log('[UserContext] ✅ IndexedDB cache cleared');
    } catch (error) {
      console.warn('[UserContext] ⚠️ Failed to clear IndexedDB cache:', error);
    }
    
    // КРИТИЧНО: Перенаправляем на лендинг
    // Используем window.location для гарантированного редиректа
    // Это предотвращает автологин при перезагрузке страницы
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    
    logUserContext("[UserContext] User logged out");
  };

  // Determine if user is authenticated (either Telegram or Supabase)
  const isAuthenticated = !!(user || supabaseUser);

  // ОПТИМИЗАЦИЯ: Мемоизируем значение контекста для предотвращения лишних ре-рендеров
  const contextValue = useMemo(
    () => ({
      user,
      supabaseUser,
      session,
      platform,
      isAuthenticated,
      isLoading,
      profileId,
      login,
      logout,
    }),
    [user, supabaseUser, session, platform, isAuthenticated, isLoading, profileId, login, logout]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
