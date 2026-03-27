/**
 * useTonStreaming — TON Center Streaming API v2
 *
 * Provides real-time transaction status updates via SSE.
 * Implements sub-second finality feedback for Catchain 2.0 (April 2026).
 *
 * Status flow: idle → pending → confirmed → finalized
 *                                         ↘ trace_invalidated (rollback)
 *
 * Docs: https://docs.ton.org/ecosystem/subsecond
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type TonTxStatus =
    | 'idle'
    | 'pending'
    | 'confirmed'
    | 'finalized'
    | 'trace_invalidated'
    | 'error';

const SSE_MAINNET = 'https://toncenter.com/api/streaming/v2/sse';
const SSE_TESTNET = 'https://testnet.toncenter.com/api/streaming/v2/sse';

// Grace period before giving up (mainnet finality ~10s today, ~1s post-Catchain 2.0)
const STREAM_TIMEOUT_MS = 45_000;

export function useTonStreaming() {
    const [status, setStatus] = useState<TonTxStatus>('idle');
    const abortRef = useRef<AbortController | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const unsubscribe = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        unsubscribe();
        setStatus('idle');
    }, [unsubscribe]);

    /**
     * Subscribe to transaction updates for a given address.
     * Uses POST-based SSE (native EventSource doesn't support POST).
     *
     * @param address  TON address to watch (sender or recipient)
     * @param apiKey   Optional TON Center API key (free tier: 2 concurrent connections)
     * @param testnet  Use testnet endpoint (default: false)
     */
    const subscribe = useCallback(async (
        address: string,
        apiKey?: string,
        testnet = false,
    ) => {
        unsubscribe();
        setStatus('idle');

        const controller = new AbortController();
        abortRef.current = controller;

        const url = testnet ? SSE_TESTNET : SSE_MAINNET;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-Api-Key'] = apiKey;

        // Safety timeout — prevent hanging forever
        timeoutRef.current = setTimeout(() => {
            if (abortRef.current) {
                setStatus(prev => (prev === 'idle' || prev === 'pending' || prev === 'confirmed') ? 'error' : prev);
                unsubscribe();
            }
        }, STREAM_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    accounts: [address],
                    min_finality: 'pending', // Receive all 4 status updates
                }),
                signal: controller.signal,
            });

            if (!response.ok || !response.body) {
                console.warn('[TonStreaming] Bad response:', response.status);
                setStatus('error');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));

                        // TON Center v2 sends status in different shapes depending on event type
                        // Normalize: check both top-level `status` and nested fields
                        const txStatus: string =
                            data?.status ??
                            data?.finality_state ??
                            data?.type ??
                            '';

                        switch (txStatus) {
                            case 'pending':
                                setStatus('pending');
                                break;
                            case 'confirmed':
                                setStatus('confirmed');
                                break;
                            case 'finalized':
                                setStatus('finalized');
                                unsubscribe(); // Done — clean up
                                return;
                            case 'trace_invalidated':
                                setStatus('trace_invalidated');
                                unsubscribe();
                                return;
                        }
                    } catch {
                        // Ignore malformed SSE lines (keepalive comments etc.)
                    }
                }
            }
        } catch (err: unknown) {
            if ((err as { name?: string })?.name !== 'AbortError') {
                console.warn('[TonStreaming] Stream error:', err);
                setStatus('error');
            }
        }
    }, [unsubscribe]);

    // Cleanup on unmount
    useEffect(() => () => unsubscribe(), [unsubscribe]);

    return { status, subscribe, unsubscribe, reset };
}
