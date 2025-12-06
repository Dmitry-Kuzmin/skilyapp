/**
 * AppProviders - Провайдеры для приложения (Query, Supabase)
 * Lazy loaded только для /app/* роутов
 * Не грузится для лендинга (/)
 */

import { useMemo, ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@/lib/queryPersister";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // OFFLINE-FIRST: Создаем QueryClient с длительным кэшированием
  const queryClient = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
          gcTime: 7 * 24 * 60 * 60 * 1000, // 7 дней - данные хранятся в кэше
          refetchOnWindowFocus: false, // Не перезапрашиваем при фокусе окна
          refetchOnMount: false, // Не перезапрашиваем при монтировании, если данные свежие
          refetchOnReconnect: true, // Перезапрашиваем при восстановлении соединения
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
      {children}
    </PersistQueryClientProvider>
  );
}

