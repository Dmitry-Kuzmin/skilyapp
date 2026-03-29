import type { IStorage } from '@tonconnect/sdk';

/**
 * SupabaseStorage adapter for TonConnect
 * Falls back to localStorage if Supabase is unavailable
 *
 * Used as backup when Telegram CloudStorage fails in Mini App
 */

const TB_PREFIX = 'tc_supabase_';

export class TonSupabaseStorage implements IStorage {
    private static readonly TABLE = 'ton_storage';
    private localCache = new Map<string, string>();

    constructor() {
        console.log('[TON Supabase Storage] Initialized');
    }

    private async ensureProfileSession(): Promise<string | null> {
        try {
            const { data } = await supabase.auth.getSession();
            if (!data?.session?.user?.id) {
                console.warn('[TON Supabase Storage] No session');
                return null;
            }
            return data.session.user.id;
        } catch (e) {
            console.error('[TON Supabase Storage] Session check error:', e);
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        const userId = await this.ensureProfileSession();
        this.localCache.set(key, value);

        // Always save to localStorage as fast fallback
        try {
            localStorage.setItem(TB_PREFIX + key, value);
            console.log('[TON Supabase Storage] Saved to localStorage:', key.slice(0, 50));
        } catch (e) {
            console.warn('[TON Supabase Storage] localStorage failed:', e);
        }

        if (!userId) {
            console.warn('[TON Supabase Storage] No user session, skipping Supabase save');
            return;
        }

        // Also save to Supabase
        try {
            const { error } = await supabase
                .from(TonSupabaseStorage.TABLE)
                .upsert({
                    user_id: userId,
                    key: TB_PREFIX + key,
                    value: value,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,key',
                });

            if (error) {
                console.error('[TON Supabase Storage] Save error:', error);
            } else {
                console.log('[TON Supabase Storage] ✅ Saved to Supabase:', key.slice(0, 50));
            }
        } catch (e) {
            console.error('[TON Supabase Storage] Save exception:', e);
        }
    }

    async getItem(key: string): Promise<string | null> {
        // Try in-memory cache first
        if (this.localCache.has(key)) {
            return this.localCache.get(key) || null;
        }

        // Try localStorage
        try {
            const local = localStorage.getItem(TB_PREFIX + key);
            if (local) {
                this.localCache.set(key, local);
                console.log('[TON Supabase Storage] Got from localStorage:', key.slice(0, 50));
                return local;
            }
        } catch (e) {
            console.warn('[TON Supabase Storage] localStorage read error:', e);
        }

        // Try Supabase
        const userId = await this.ensureProfileSession();
        if (!userId) {
            console.log('[TON Supabase Storage] No session, cannot fetch from Supabase');
            return null;
        }

        try {
            console.log('[TON Supabase Storage] Fetching from Supabase:', key.slice(0, 50));
            const { data, error } = await supabase
                .from(TonSupabaseStorage.TABLE)
                .select('value')
                .eq('user_id', userId)
                .eq('key', TB_PREFIX + key)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // not "no rows" error
                    console.error('[TON Supabase Storage] Fetch error:', error);
                }
                return null;
            }

            if (data?.value) {
                this.localCache.set(key, data.value);
                console.log('[TON Supabase Storage] ✅ Restored from Supabase:', key.slice(0, 50));
                return data.value;
            }
        } catch (e) {
            console.error('[TON Supabase Storage] Fetch exception:', e);
        }

        return null;
    }

    async removeItem(key: string): Promise<void> {
        this.localCache.delete(key);

        // Remove from localStorage
        try {
            localStorage.removeItem(TB_PREFIX + key);
        } catch {
            // silent
        }

        // Remove from Supabase
        const userId = await this.ensureProfileSession();
        if (!userId) return;

        try {
            await supabase
                .from(TonSupabaseStorage.TABLE)
                .delete()
                .eq('user_id', userId)
                .eq('key', TB_PREFIX + key);
            console.log('[TON Supabase Storage] Removed from Supabase:', key.slice(0, 50));
        } catch (e) {
            console.error('[TON Supabase Storage] Remove error:', e);
        }
    }
}
