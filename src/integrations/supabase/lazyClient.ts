import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Always return the singleton client from client.ts to avoid duplicate GoTrueClient instances.
// Two separate createClient() calls with the same storage key cause "Multiple GoTrueClient instances"
// warning, race conditions during token refresh, and duplicate auth state change events.
export const getSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  const { supabase } = await import('./client');
  return supabase;
};

