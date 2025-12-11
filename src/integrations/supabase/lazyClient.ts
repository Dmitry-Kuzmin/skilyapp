import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let cachedClient: SupabaseClient<Database> | null = null;

const getEnv = () => {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.PUBLIC_SUPABASE_URL ||
    'https://yffjnqegeiorunyvcxkn.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!SUPABASE_URL || SUPABASE_URL === 'undefined') {
    throw new Error('VITE_SUPABASE_URL is required.');
  }

  if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === 'undefined') {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is required.');
  }

  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
};

export const getSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  if (cachedClient) return cachedClient;

  const { createClient } = await import('@supabase/supabase-js');
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getEnv();

  cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'sdadim-dgt-prep',
      },
    },
    db: { schema: 'public' },
    realtime: {
      params: { eventsPerSecond: 10 },
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
    },
  });

  return cachedClient;
};

