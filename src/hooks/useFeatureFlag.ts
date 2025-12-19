import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хук для проверки Feature Flags
 * Позволяет быстро отключать фичи при перегрузке через админ-панель
 * Автоматически обновляется при изменении флага в админке (через broadcast)
 */
export function useFeatureFlag(flagKey: string, defaultValue: boolean = true) {
  const queryClient = useQueryClient();
  
  // Слушаем события обновления feature flags
  useEffect(() => {
    const handleFlagUpdate = (event: CustomEvent) => {
      if (event.detail?.key === flagKey) {
        // Мгновенно инвалидируем кэш для этого флага
        queryClient.invalidateQueries({ queryKey: ['feature-flag', flagKey] });
      }
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `feature-flag-${flagKey}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          // Инвалидируем кэш если данные свежие (менее 5 секунд назад)
          if (Date.now() - data.timestamp < 5000) {
            queryClient.invalidateQueries({ queryKey: ['feature-flag', flagKey] });
          }
        } catch (err) {
          // Игнорируем ошибки парсинга
        }
      }
    };
    
    window.addEventListener('feature-flag-updated', handleFlagUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('feature-flag-updated', handleFlagUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [flagKey, queryClient]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', flagKey)
        .maybeSingle(); // Используем maybeSingle вместо single для обработки отсутствующих записей
      
      // Если ошибка доступа (403) или запись не найдена - возвращаем значение по умолчанию
      if (error) {
        // Логируем только если это не 404 (запись не найдена) и не 403 (RLS блокирует)
        // 403 - это нормально, если пользователь не авторизован или нет доступа
        if (error.code !== 'PGRST116' && error.code !== 'PGRST301') {
          // Логируем только в dev режиме
          if (import.meta.env.DEV) {
            console.debug(`[useFeatureFlag] Error fetching flag "${flagKey}":`, error.message);
          }
        }
        return defaultValue;
      }
      
      if (!data) {
        return defaultValue;
      }
      
      // Поддерживаем разные форматы: {enabled: true} или просто true
      const value = data.value;
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'object' && 'enabled' in value) {
        return value.enabled === true;
      }
      if (typeof value === 'string') {
        return value === 'true';
      }
      
      return defaultValue;
    },
    staleTime: 10 * 1000, // Кэш 10 секунд (для быстрого отключения фич)
    refetchInterval: 15 * 1000, // Обновлять каждые 15 секунд (для мгновенного отключения)
  });
  
  return { enabled: data ?? defaultValue, isLoading };
}

