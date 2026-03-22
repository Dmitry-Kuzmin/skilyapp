/**
 * AppProviders - Провайдеры для приложения (Query, Supabase, UserContext)
 * Lazy loaded только для /app/* роутов
 * Не грузится для лендинга (/)
 */

import { useMemo, ReactNode, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@/lib/queryPersister";
// ОПТИМИЗАЦИЯ: Полный UserProvider загружается lazy только в приложении
// На лендинге используется легкий LandingUserProvider БЕЗ Supabase
import { UserProvider } from "@/contexts/UserContext";
import { PDDProvider } from "@/contexts/PDDContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
// ОПТИМИЗАЦИЯ: Только Sonner для всех уведомлений (унифицированный чёрный стиль)

import { TooltipProvider } from "@/components/ui/tooltip";
import { ReconnectHandler } from "@/components/ReconnectHandler";
import { useAuthEventListener } from "@/hooks/useAuthEventListener.ts";
import { preloadPaddle } from "@/lib/paddle";
import { useIdleInitialization } from "@/hooks/useIdleInitialization";
import { GlobalSettingsManager } from "@/components/settings";
import { AppKitProvider } from "@ton/appkit-react";
import { appKit } from "@/lib/ton-appkit";
import '@ton/appkit-react/styles.css';
import { Motion } from "@/components/optimized/Motion";
import { useSessionManager } from "@/hooks/useSessionManager";

import { SmartOnboardingFlow } from "@/components/onboarding/SmartOnboardingFlow";
import { useTonWalletSync } from "@/hooks/useTonWalletSync";

/**
 * Глобальный обработчик сессий.
 */
const SessionHandler = () => {
  useSessionManager();
  return <SmartOnboardingFlow />;
};

/** Syncs TON wallet address to Supabase (inside AppKitProvider) */
const TonWalletSyncHandler = () => {
  useTonWalletSync();
  return null;
};

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Слушаем Auth события для отправки уведомлений о критичных изменениях
  useAuthEventListener();

  // ОПТИМИЗАЦИЯ: Отложенная инициализация некритичных операций (не блокирует UI)
  useIdleInitialization();

  // ОПТИМИЗАЦИЯ: Предзагружаем Paddle SDK в idle callback (не блокирует рендеринг)
  // Это ускоряет открытие формы оплаты (SDK уже готов, не нужно ждать инициализации)
  useEffect(() => {
    const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window;

    const preloadPaddleIdle = () => {
      preloadPaddle();
    };

    if (hasIdleCallback) {
      window.requestIdleCallback(preloadPaddleIdle, { timeout: 2000 });
    } else {
      // Fallback для браузеров без requestIdleCallback
      setTimeout(preloadPaddleIdle, 100);
    }
  }, []);

  // OFFLINE-FIRST: Создаем QueryClient с длительным кэшированием
  const queryClient = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
          gcTime: 7 * 24 * 60 * 60 * 1000, // 7 дней - данные хранятся в кэше
          refetchOnWindowFocus: false, // Не перезапрашиваем при фокусе окна
          refetchOnMount: false, // Не перезапрашиваем при монтировании, если данные свежие
          // ОПТИМИЗАЦИЯ: refetchOnReconnect отключен для предотвращения мерцаний
          // Вместо этого используем ручной refetch с задержкой через onReconnect callback
          refetchOnReconnect: false, // Отключаем мгновенный refetch
          retry: 1, // Минимум повторных попыток
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          retry: 1,
        },
      },
    });
  }, []);

  // OFFLINE-FIRST: Создаём persister на IndexedDB
  const persister = useMemo(() => createAsyncStoragePersister(), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
        dehydrateOptions: {
          // КРИТИЧНО: Фильтруем что персистим в IndexedDB
          // Сохраняем только "медленные" данные, НЕ ephemeral/realtime
          shouldDehydrateQuery: (query) => {
            // Только успешные запросы
            if (query.state.status !== 'success') {
              return false;
            }

            // КРИТИЧНО: Безопасная проверка типа queryKey
            const root = String(query.queryKey[0] ?? '');

            // Пустой key - не сохраняем
            if (!root) {
              return false;
            }

            // ❌ НЕ сохраняем ephemeral/realtime данные
            const ephemeralKeys = [
              'online-players',
              'duel-notifications',
              'live-game-state',
              'active-duel',
              'duel-players',
              'websocket-status',
              'system-status',
              'active-sessions',
            ];

            if (ephemeralKeys.includes(root)) {
              return false;
            }

            // ✅ Сохраняем "медленные" и стабильные данные
            const persistentRoots = [
              'dashboard',
              'dashboard-complete',
              'topics',
              'subtopics',
              'materials',
              'user-progress',
              'test-questions',
              'road-signs',
              'sequential-tests',
              'premium-status',
              'cosmetics',
              'inventory',
              'boost-inventory',
              'challenge-bank-count',
              'exam-readiness',
              'duel-pass-info',
              'partners',
              'profile',
              'daily-bonus',
            ];

            return persistentRoots.includes(root);
          },
        },
      }}
    >
      <TooltipProvider>

        <UserProvider>
          <LanguageProvider>
            <NotificationProvider>
              <PDDProvider>
                <AppKitProvider appKit={appKit}>
                  <SessionHandler />
                  <TonWalletSyncHandler />
                  <ReconnectHandler />
                  {/* Global Settings Drawer (Zustand controlled) */}
                  <GlobalSettingsManager />
                  {(() => {
                    if (import.meta.env.DEV) {
                      console.debug('[AppProviders] 🚀 Rendering children:', !!children);
                    }
                    return children;
                  })()}
                </AppKitProvider>
              </PDDProvider>
            </NotificationProvider>
          </LanguageProvider>
        </UserProvider>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}
