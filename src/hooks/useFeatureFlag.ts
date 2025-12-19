import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хук для проверки Feature Flags
 * Позволяет быстро отключать фичи при перегрузке через админ-панель
 */
export function useFeatureFlag(flagKey: string, defaultValue: boolean = true) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', flagKey)
        .single();
      
      if (error || !data) {
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
    staleTime: 5 * 60 * 1000, // Кэш 5 минут
    refetchInterval: 60 * 1000, // Обновлять каждую минуту (для быстрого отключения)
  });
  
  return { enabled: data ?? defaultValue, isLoading };
}

