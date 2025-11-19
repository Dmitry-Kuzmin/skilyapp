import { supabase } from '@/integrations/supabase/client';

interface DispatchOptions {
  overrideTemplateType?: string;
}

export async function dispatchUserEvent(
  userId: string | null | undefined,
  eventType: string,
  payload: Record<string, any> = {},
  options?: DispatchOptions
): Promise<void> {
  if (!userId) return;

  try {
    const { error } = await supabase.functions.invoke('user-event-dispatcher', {
      body: {
        user_id: userId,
        event_type: eventType,
        payload,
        override_template_type: options?.overrideTemplateType,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[notification-events] Failed to dispatch event', {
      eventType,
      payload,
      error,
    });
  }
}


