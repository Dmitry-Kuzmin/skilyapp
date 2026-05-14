/**
 * useAIRequest — единый хук для всех AI-запросов в приложении.
 *
 * Инкапсулирует:
 * - Проверку авторизации (нет сессии → Paywall)
 * - Fetch к Edge Function ai-chat
 * - Обработку 401 (гость/протухший токен → Paywall)
 * - Обработку 429 daily_limit_reached → onLimitReached callback
 * - SSE-стриминг с построчным парсингом
 * - Общую обработку ошибок
 *
 * Каждый виджет управляет своим state (messages, isLoading и т.д.) сам —
 * этот хук отвечает только за транспортный слой.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useModalStore } from '@/store/modalStore';

export async function uploadChatAttachment(file: File, profileId: string): Promise<string | null> {
  const rawExt = file.name.split('.').pop()?.toLowerCase();
  const ext = rawExt || (file.type.startsWith('image/') ? 'jpg' : 'bin');
  const path = `${profileId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('chat-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) { console.error('[chat-attachment] upload error', error); return null; }
  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadChatImage(file: File, profileId: string): Promise<string | null> {
  return uploadChatAttachment(file, profileId);
}

export interface AIRequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequestOptions {
  messages: AIRequestMessage[];
  country?: string;
  language?: string;
  mode?: 'chat' | 'debrief';
  showComparison?: boolean;
  imageUrl?: string | null;
}

export interface AILimitData {
  currentCount: number;
  limit: number;
  message?: string;
}

export interface AIRequestCallbacks {
  /** Called for each streamed text chunk */
  onChunk: (text: string) => void;
  /** Called when the stream ends successfully */
  onDone?: () => void;
  /** Called when daily limit is reached (show limit UI) */
  onLimitReached?: (data: AILimitData) => void;
  /** Called on network/server errors */
  onError?: (error: Error) => void;
}

export function useAIRequest() {
  const openModal = useModalStore(s => s.openModal);

  const sendRequest = useCallback(async (
    options: AIRequestOptions,
    callbacks: AIRequestCallbacks,
  ): Promise<void> => {
    // 1. Auth — require real user session, never fall back to anon key
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      openModal('PAYWALL', { trigger: 'ai_guest' });
      return;
    }

    // 2. Fetch
    let response: Response;
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(options),
        },
      );
    } catch (err) {
      callbacks.onError?.(err instanceof Error ? err : new Error('Network error'));
      return;
    }

    // 3. 401 — expired token or guest sneaking through
    if (response.status === 401) {
      openModal('PAYWALL', { trigger: 'ai_guest' });
      return;
    }

    // 4. 429 — daily limit reached
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error === 'daily_limit_reached') {
        callbacks.onLimitReached?.({
          currentCount: errorData.current_count ?? 5,
          limit: errorData.limit ?? 5,
          message: errorData.message,
        });
        return;
      }
    }

    // 5. Other HTTP errors
    if (!response.ok || !response.body) {
      callbacks.onError?.(new Error(`AI request failed: ${response.status}`));
      return;
    }

    // 6. SSE streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) callbacks.onChunk(text);
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    callbacks.onDone?.();
  }, [openModal]);

  return { sendRequest };
}
