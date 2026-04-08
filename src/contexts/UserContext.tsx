import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from "react";
import { toast } from "sonner";
import { TelegramUser } from "@/types/window";
import { getTelegramUser, getPlatform } from "@/core/TelegramInit";
import { isTelegramMiniApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useTelegram } from "@/contexts/TelegramContext";
import { setGlobalProfileId } from "@/hooks/useRequireProfile";
import { useQueryClient } from "@tanstack/react-query";
import { idbDel } from "@/lib/idbKeyval";
import { ymGoal } from "@/utils/metrika";

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
  const webApp = useTelegram(); // Получаем webApp из контекста для использования в эффектах
  const queryClient = useQueryClient();

  // Ref to track last processed user to prevent redundant fetches
  const lastProcessedUserRef = useRef<string | null>(null);

  // Load profile ID when user changes with optimistic loading and retry
  useEffect(() => {
    let isMounted = true;

    const loadProfileId = async () => {
      if (supabaseUser) {
        // ОПТИМИЗАЦИЯ: Если мы уже загрузили профиль для этого пользователя, не делаем запрос снова
        if (lastProcessedUserRef.current === supabaseUser.id && profileId) {
          return;
        }

        // For web users - get profile by user_id
        console.log("[UserContext] 🔍 Loading profile for Supabase user:", supabaseUser.id);

        // Обновляем ref сразу, чтобы предотвратить параллельные запросы
        lastProcessedUserRef.current = supabaseUser.id;

        // КРИТИЧНО: Всегда запрашиваем актуальный ID и photo_url из базы
        const { data, error } = await supabase
          .from('profiles')
          .select('id, photo_url')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();

        if (error) {
          console.error("[UserContext] Error fetching profile:", error);
          // Fallback на кэш только если база легла
          const cachedId = localStorage.getItem(`profile_${supabaseUser.id}`);
          if (isMounted && cachedId) {
            setProfileId(cachedId);
            setGlobalProfileId(cachedId);
          }
          // Сбрасываем ref при ошибке, чтобы попробовать снова
          lastProcessedUserRef.current = null;
        } else if (isMounted && data && (data as any).id) {
          const actualProfileId = (data as any).id;
          const photoUrl = (data as any).photo_url;

          // Проверяем, изменился ли ID, чтобы избежать лишних ре-рендеров
          if (profileId !== actualProfileId) {
            setProfileId(actualProfileId);
            setGlobalProfileId(actualProfileId);

            // 🎁 Process referral code for Web/Auth users (Google OAuth, Magic Link)
            const refCode = sessionStorage.getItem('referral_code');
            if (refCode) {
              console.log("[UserContext] Processing pending referral code for web user:", refCode);
              (supabase as any).rpc('create_referral', {
                p_referrer_code: refCode,
                p_referred_id: actualProfileId
              }).then(({ data, error }: { data: any, error: any }) => {
                if (!error && data && data[0]?.success) {
                  console.log("[UserContext] ✅ Referral applied successfully!");
                  sessionStorage.removeItem('referral_code');
                  
                  // 🎉 Красивое уведомление
                  toast.success('Начислено +50 монет за приглашение! 🎁', {
                    description: 'Добро пожаловать в Skily! Используйте их для покупки бустов или дуэлей.',
                  });

                  // 🔄 Обновляем данные пользователя в UI
                  queryClient.invalidateQueries({ queryKey: ['profile'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard-complete'] });
                } else if (data && data[0] && (data[0].message === 'Already referred by someone' || data[0].message === 'Cannot refer yourself')) {
                  console.log("[UserContext] Referral skipped:", data[0].message);
                  sessionStorage.removeItem('referral_code');
                } else if (error) {
                  console.error("[UserContext] Error applying referral:", error);
                }
              });
            }
          }
          localStorage.setItem(`profile_${supabaseUser.id}`, actualProfileId);


          // 🔄 SELF-HEALING: Если аватар старый (api.telegram.org) или отсутствует, запускаем синхронизацию
          // Это исправляет проблему с "протухшими" ссылками на аватарки
          if (isTelegramMiniApp() && (!photoUrl || photoUrl.includes('api.telegram.org'))) {
            const initData = window.Telegram?.WebApp?.initData;
            if (initData && !initData.startsWith('mock_')) {
              console.log("[UserContext] 🔄 Detected stale/missing avatar, triggering background sync...");
              // Fire and forget - не блокируем UI
              supabase.functions.invoke('telegram-auth-v2', { body: { initData } })
                .then(({ data: res, error: err }) => {
                  if (!err) console.log("[UserContext] ✅ Avatar sync request sent successfully");
                  else console.error("[UserContext] Avatar sync request failed", err);
                })
                .catch(err => console.error("[UserContext] Avatar sync exception", err));
            }
          }
        } else if (isMounted && !data) {
          // КРИТИЧНО: Если профиля нет, создаем его автоматически для веб-пользователя
          console.log("[UserContext] 🐣 Profile not found, creating new one...");
          // Используем upsert, чтобы избежать ошибок уникальности
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              user_id: supabaseUser.id,
              telegram_id: supabaseUser.user_metadata?.telegram_id ? Number(supabaseUser.user_metadata.telegram_id) : null,
              first_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              photo_url: supabaseUser.user_metadata?.avatar_url || null,
              platform: supabaseUser.user_metadata?.is_telegram_user ? 'telegram' : 'web',
              coins: 0,
              xp: 0
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            })
            .select('id')
            .single();

          if (!createError && newProfile) {
            console.log("[UserContext] ✨ New profile created:", newProfile.id);
            setProfileId(newProfile.id);
            setGlobalProfileId(newProfile.id);
            localStorage.setItem(`profile_${supabaseUser.id}`, newProfile.id);
            ymGoal('registration_complete');
          } else {
            console.error("[UserContext] ❌ Failed to create profile:", createError);

            // EMERGENCY RECOVERY: Если upsert не вернул ID, пробуем финальный SELECT
            // Это спасет от бесконечных скелетонов
            const { data: finalRetry } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', supabaseUser.id)
              .maybeSingle();

            if (finalRetry) {
              setProfileId(finalRetry.id);
              setGlobalProfileId(finalRetry.id);
            } else {
              lastProcessedUserRef.current = null;
            }
          }
        }
      } else if (user) {
        // ОПТИМИЗАЦИЯ: Telegram user handling
        const telegramIdStr = user.id.toString();
        if (lastProcessedUserRef.current === telegramIdStr && profileId) {
          return;
        }

        lastProcessedUserRef.current = telegramIdStr;

        // For Telegram users - get profile by telegram_id with retry
        console.log("[UserContext] Loading profile for Telegram user:", user.id);

        // Check cache first - если есть кэш, используем его и НЕ делаем запрос
        const cachedId = localStorage.getItem(`profile_${user.id}`);
        if (cachedId) {
          console.log("[UserContext] ✅ Using cached profileId (no DB request):", cachedId);
          if (isMounted) {
            if (profileId !== cachedId) {
              setProfileId(cachedId);
              setGlobalProfileId(cachedId);
            }
          }
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
            if (attempt >= 3) lastProcessedUserRef.current = null;
          } else if (data && (data as any).id) {
            console.log("[UserContext] Loaded profile ID for Telegram user:", (data as any).id);
            if (isMounted) {
              const pid = (data as any).id;
              if (profileId !== pid) {
                setProfileId(pid);
                setGlobalProfileId(pid);
              }
              localStorage.setItem(`profile_${user.id}`, pid);
            }
          } else if (attempt < 3) { // ОПТИМИЗАЦИЯ: Снижаем retry с 5 до 3
            console.log(`[UserContext] Profile not found, retry ${attempt}/3 in 1000ms...`);
            setTimeout(() => queryProfile(attempt + 1), 1000);
          } else {
            console.log("[UserContext] No profile found after 3 retries");
            lastProcessedUserRef.current = null;
          }
        };

        queryProfile();
      } else {
        if (isMounted) {
          setProfileId(null);
          lastProcessedUserRef.current = null;
        }
      }
    };

    loadProfileId();

    return () => {
      isMounted = false;
    };
  }, [user, supabaseUser]);

  // Supabase auth listener for web users
  useEffect(() => {
    console.log("[UserContext] Setting up Supabase auth listener");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[UserContext] Auth state changed:", event, newSession?.user?.email);

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
          console.log("[UserContext] Real Supabase user detected, setting user and clearing Telegram mock");
          setSession(newSession);
          setSupabaseUser(newSession.user);
          // Очищаем Telegram mock-данные, если они были установлены
          setUser(prevUser => {
            if (prevUser && (prevUser.id === 123456789 || prevUser.username === 'test_user')) {
              console.log("[UserContext] Clearing Telegram mock user");
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
      console.log("[UserContext] Existing session:", existingSession?.user?.email);
      if (existingSession?.user) {
        console.log("[UserContext] Real Supabase user found in existing session");
        setSession(existingSession);
        setSupabaseUser(existingSession.user);
        // Очищаем Telegram mock-данные, если они были установлены
        setUser(prevUser => {
          if (prevUser && (prevUser.id === 123456789 || prevUser.username === 'test_user')) {
            console.log("[UserContext] Clearing Telegram mock user on session check");
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
      console.log("[UserContext] 🚀 initializeAuth started");
      // АРХИТЕКТУРА: Зависим от TelegramProvider (webApp)
      // Если WebApp еще не инициализирован, ждем
      // НО: Только если мы действительно в Telegram Mini App
      if (!webApp && window.Telegram?.WebApp && isTelegramMiniApp()) {
        console.log("[UserContext] ⏳ Waiting for TelegramProvider...");
        return;
      }
      console.log("[UserContext] 🔐 Initializing...");

      // КРИТИЧНО: Если уже есть реальный пользователь из Supabase, не используем Telegram mock
      // Проверяем сессию Supabase перед инициализацией Telegram
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession?.user) {
        console.log("[UserContext] Real Supabase user found, restoring session...");
        setSupabaseUser(existingSession.user);
        setSession(existingSession);

        // КРИТИЧНО: При раннем return из-за кэшированной сессии (реальный Telegram, не dev-режим)
        // user (TelegramUser) всё равно должен быть установлен — иначе StarsPaymentButton
        // видит user=null и показывает "Необходимо войти в аккаунт"
        const tgWebappUser =
          webApp?.initDataUnsafe?.user ??
          window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgWebappUser && tgWebappUser.id !== 123456789 && tgWebappUser.username !== 'test_user') {
          console.log("[UserContext] ✅ TelegramUser restored from WebApp on session restore:", tgWebappUser.first_name);
          setUser(tgWebappUser as TelegramUser);
          window.puzzleUser = tgWebappUser as TelegramUser;
        }

        // КРИТИЧНО: Восстанавливаем profileId из кэша ДО снятия флага загрузки
        // Это предотвращает мигание/блокировку кнопки оплаты
        const cachedProfileId = localStorage.getItem(`profile_${existingSession.user.id}`);
        if (cachedProfileId) {
          console.log("[UserContext] ✅ profileId restored from cache:", cachedProfileId);
          setProfileId(cachedProfileId);
          setGlobalProfileId(cachedProfileId);
        }

        setIsLoading(false);
        return;
      }

      // Проверяем, является ли Telegram WebApp моком
      const isMockTelegram = window.Telegram?.WebApp?.initData === 'mock_init_data' ||
        window.Telegram?.WebApp?.initData?.startsWith('mock_') ||
        (window.Telegram?.WebApp?.initDataUnsafe?.user?.id === 123456789 &&
          window.Telegram?.WebApp?.initDataUnsafe?.user?.username === 'test_user');

      /* 
      if (isMockTelegram) {
        console.log("[UserContext] Mock Telegram detected, skipping initialization");
        setIsLoading(false);
        return;
      }
      */

      // АРХИТЕКТУРА: Используем TelegramProvider (Singleton) вместо прямого вызова initTelegram()
      // WebApp уже инициализирован через TelegramProvider, просто получаем пользователя
      let telegramUser: TelegramUser | null = null;

      // Получаем пользователя из WebApp (уже инициализированного через TelegramProvider)
      if (webApp?.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user;
        // Проверяем, не мок ли это
        if (userData.id !== 123456789 && userData.username !== 'test_user') {
          telegramUser = userData as TelegramUser;
          console.log("[UserContext] User from TelegramProvider:", telegramUser.first_name);
        }
      }

      // Fallback: если пользователя нет в WebApp, проверяем другие источники
      if (!telegramUser) {
        telegramUser = getTelegramUser();

        // Проверяем, не мок ли это
        if (telegramUser && (telegramUser.id === 123456789 || telegramUser.username === 'test_user')) {
          console.log("[UserContext] Mock user detected, skipping");
          telegramUser = null;
        }
      }

      // Fallback to window.puzzleUser or localStorage (только если не мок)
      if (!telegramUser) {
        console.log("[UserContext] Checking fallback sources...");
        if (window.puzzleUser) {
          // Проверяем, не мок ли это
          if (window.puzzleUser.id === 123456789 || window.puzzleUser.username === 'test_user') {
            console.log("[UserContext] Mock user in window.puzzleUser, skipping");
          } else {
            console.log("[UserContext] Using window.puzzleUser");
            telegramUser = window.puzzleUser;
          }
        } else {
          const storedUserStr = localStorage.getItem('puzzle_user');
          if (storedUserStr) {
            try {
              const parsedUser = JSON.parse(storedUserStr);
              // Проверяем, не мок ли это
              if (parsedUser.id === 123456789 || parsedUser.username === 'test_user') {
                console.log("[UserContext] Mock user in localStorage, skipping");
              } else {
                console.log("[UserContext] Using stored user from localStorage");
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

      console.log("[UserContext] Detected platform:", detectedPlatform);
      console.log("[UserContext] Is Telegram Mini App:", isTelegramEnv);
      console.log("[UserContext] Telegram User from init:", telegramUser);
      console.log("[UserContext] WebApp initDataUnsafe:", window.Telegram?.WebApp?.initDataUnsafe);

      setPlatform(detectedPlatform);

      // Auto-login for Telegram Mini App with user data (только если не мок)
      if (telegramUser && telegramUser.id !== 123456789 && telegramUser.username !== 'test_user') {
        console.log("[UserContext] Auto-logging in Telegram user:", telegramUser.first_name);

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

        // 🚀 NEW: Обмениваем Telegram initData на Supabase сессию
        // Это фундаментальное решение для интеграции Telegram с Supabase Auth
        const initData = webApp?.initData || window.Telegram?.WebApp?.initData;
        if (initData && initData !== '' && !initData.startsWith('mock_')) {
          try {
            console.log("[UserContext] 🔐 Exchanging Telegram initData for Supabase session...");

            const { data: authData, error: authError } = await supabase.functions.invoke('telegram-auth-v2', {
              body: { initData }
            });

            if (authError) {
              console.error('[UserContext] telegram-auth-v2 error:', authError);
              toast.error('Сбой быстрой авторизации', { description: 'Пробуем обычный вход...' });
              await login(telegramUser).catch(err => {
                console.error('[UserContext] Fallback login failed:', err);
              });
            } else if (authData?.session) {
              console.log("[UserContext] ✅ Got Supabase session from Telegram auth!");

              toast.warning('Авторизация успешна!', {
                id: 'auth-success-toast',
                duration: 2000
              });

              // ФУНДАМЕНТАЛЬНЫЙ МОМЕНТ: Устанавливаем сессию в Supabase клиент
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
              });

              if (sessionError) {
                console.error('[UserContext] setSession error:', sessionError);
                if (sessionError.message.includes('refresh_token_not_found') || sessionError.status === 400) {
                  console.warn('[UserContext] Invalid session detected, clearing storage and falling back...');
                  localStorage.removeItem('sb-yffjnqegeiorunyvcxkn-auth-token');
                  await login(telegramUser).catch(err => console.error('[UserContext] Fallback login failed:', err));
                }
              } else {
                console.log("[UserContext] 🎉 Supabase session set successfully!");
                setSession(authData.session);
                setSupabaseUser(authData.user);

                // КРИТИЧНО: profileId устанавливается СИНХРОННО до setIsLoading(false)
                // Это предотвращает ситуацию когда StarsPaymentButton видит profileId=null
                if (authData.profile_id) {
                  console.log("[UserContext] ✅ profileId from auth function:", authData.profile_id);
                  setProfileId(authData.profile_id);
                  setGlobalProfileId(authData.profile_id);
                  localStorage.setItem(`profile_${telegramUser.id}`, authData.profile_id);
                }
              }

            } else {
              console.warn('[UserContext] telegram-auth-v2 returned no session');
              await login(telegramUser).catch(err => {
                console.error('[UserContext] Fallback login failed:', err);
              });
            }
          } catch (err) {
            console.error('[UserContext] telegram-auth-v2 exception:', err);
            await login(telegramUser).catch(err2 => {
              console.error('[UserContext] Fallback login failed:', err2);
            });
          }
        } else {
          // initData отсутствует или мок — используем старый метод
          await login(telegramUser).catch(err => {
            console.error('[UserContext] Auto-login failed:', err);
          });
        }
      } else {
        console.log("[UserContext] No Telegram user - user needs to login manually");
      }

      // КРИТИЧНО: setIsLoading(false) вызывается ТОЛЬКО ЗДЕСЬ — после завершения ВСЕЙ цепочки
      // Это гарантирует что profileId, session, supabaseUser установлены до рендера
      setIsLoading(false);
    };

    initializeAuth();
  }, [webApp]); // АРХИТЕКТУРА: webApp добавлен в зависимости для корректного перезапуска после инициализации

  const login = useCallback(async (userData: TelegramUser) => {
    console.log("[UserContext] Login started for:", userData.first_name);

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
      console.log("[UserContext] Saving to backend with platform:", actualPlatform);

      // Check for referral code from deep link
      const referralCode = sessionStorage.getItem('referral_code');
      if (referralCode) {
        console.log("[UserContext] Found referral code:", referralCode);
      }

      // КРИТИЧНО: Проверяем партнерский код из start_param
      const partnerRefCode = sessionStorage.getItem('partner_ref_code');
      if (partnerRefCode) {
        console.log("[UserContext] Found partner ref code:", partnerRefCode);
      }

      console.log("[UserContext] User data:", {
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
        toast.error('Ошибка авторизации', { description: 'Не удалось сохранить профиль' });
        throw error;
      }

      console.log("[UserContext] Backend response:", result);

      // If we got profile data back, immediately set profileId
      if (result?.profile?.id) {
        console.log("[UserContext] Setting profileId from backend response:", result.profile.id);
        setProfileId(result.profile.id);
        setGlobalProfileId(result.profile.id); // 🔒 Синхронизация с глобальным синглтоном
        localStorage.setItem(`profile_${userData.id}`, result.profile.id);

        // КРИТИЧНО: Связываем пользователя с партнером после создания профиля
        if (partnerRefCode) {
          try {
            console.log("[UserContext] Linking user to partner:", partnerRefCode);
            const { data: linkResult, error: linkError } = await supabase.rpc(
              'link_user_to_partner_from_start_param',
              {
                p_user_id: result.profile.id,
                p_start_param: partnerRefCode.startsWith('partner_') ? partnerRefCode : `partner_${partnerRefCode}`
              }
            );

            if (linkError) {
              console.error('[UserContext] Failed to link user to partner:', linkError);
            } else if (linkResult && (linkResult as any).length > 0 && (linkResult as any)[0].success) {
              console.log("[UserContext] User linked to partner:", {
                partner_id: (linkResult as any)[0].partner_id,
                partner_code: (linkResult as any)[0].partner_code
              });
            } else {
              console.log("[UserContext] Partner link result:", (linkResult as any)?.[0]?.message || 'Unknown');
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
        console.log("[UserContext] Referral code cleared from session");
      }

      // Clear partner ref code after successful use
      if (partnerRefCode) {
        sessionStorage.removeItem('partner_ref_code');
        console.log("[UserContext] Partner ref code cleared from session");
      }

      console.log("[UserContext] User saved to backend successfully");
    } catch (error) {
      console.error('[UserContext] Backend save error:', error);
      // Don't throw - user is already set locally
      // This ensures UI works even if backend is down
    }
  }, [platform]);

  const logout = useCallback(async () => {
    console.log("[UserContext] Logging out");

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
      await idbDel('SDADIM_REACT_QUERY_OFFLINE_CACHE');
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

    console.log("[UserContext] User logged out");
  }, [platform, session]);

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
