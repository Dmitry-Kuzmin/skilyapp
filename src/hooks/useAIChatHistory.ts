import { useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/lazyClient';
import type { AIChatMessage } from '@/stores/useAIChatStore';

const HISTORY_LIMIT = 30;

export function useAIChatHistory() {
  const saveMessage = useCallback(async (
    profileId: string,
    conversationId: string,
    message: AIChatMessage,
  ): Promise<string | null> => {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          profile_id: profileId,
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          image_url: message.imageUrl ?? null,
          rating: message.rating ?? null,
        })
        .select('id')
        .single();
      if (error) { console.error('[chat-history] save error', error); return null; }
      return data?.id ?? null;
    } catch (err) {
      console.error('[chat-history] save exception', err);
      return null;
    }
  }, []);

  const loadHistory = useCallback(async (
    profileId: string,
    conversationId: string,
  ): Promise<AIChatMessage[]> => {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, role, content, image_url, rating, created_at')
        .eq('profile_id', profileId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(HISTORY_LIMIT);
      if (error || !data) return [];
      return data.map((row) => ({
        id: `db_${row.id}`,
        dbId: row.id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        imageUrl: row.image_url ?? undefined,
        rating: row.rating as 1 | -1 | undefined,
        timestamp: new Date(row.created_at).getTime(),
      }));
    } catch (err) {
      console.error('[chat-history] load exception', err);
      return [];
    }
  }, []);

  const updateRating = useCallback(async (dbId: string, rating: 1 | -1): Promise<void> => {
    try {
      const supabase = await getSupabaseClient();
      await supabase
        .from('ai_chat_messages')
        .update({ rating })
        .eq('id', dbId);
    } catch (err) {
      console.error('[chat-history] rating update exception', err);
    }
  }, []);

  return { saveMessage, loadHistory, updateRating };
}
