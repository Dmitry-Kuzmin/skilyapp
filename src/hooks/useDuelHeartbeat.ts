import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDuelHeartbeatOptions {
  duelId: string | null;
  profileId: string | null;
  enabled?: boolean;
  interval?: number; // Интервал в миллисекундах (по умолчанию 5 секунд)
}

/**
 * Хук для автоматического обновления heartbeat в дуэли
 * Обновляет last_heartbeat_at каждые 5-10 секунд для отслеживания активности игрока
 */
export function useDuelHeartbeat({
  duelId,
  profileId,
  enabled = true,
  interval = 5000, // 5 секунд по умолчанию
}: UseDuelHeartbeatOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (!enabled || !duelId || !profileId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isActiveRef.current = false;
      return;
    }

    // Первый heartbeat сразу
    const sendHeartbeat = async () => {
      if (!duelId || !profileId || isActiveRef.current) return;
      
      isActiveRef.current = true;
      try {
        const { error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'heartbeat',
            duel_id: duelId,
            profile_id: profileId,
          },
        });

        if (error) {
          console.error('[useDuelHeartbeat] Error sending heartbeat:', error);
        }
      } catch (error) {
        console.error('[useDuelHeartbeat] Exception sending heartbeat:', error);
      } finally {
        isActiveRef.current = false;
      }
    };

    // Отправляем сразу
    sendHeartbeat();

    // Затем каждые interval миллисекунд
    intervalRef.current = setInterval(sendHeartbeat, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isActiveRef.current = false;
    };
  }, [duelId, profileId, enabled, interval]);
}

