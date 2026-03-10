import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { loadPKCEState, clearPKCEState } from '@/lib/telegram-oidc';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Страница /auth/telegram/callback
 *
 * Работает в двух режимах:
 * 1. POPUP режим (window.opener существует): шлёт postMessage в родителя и закрывается
 * 2. REDIRECT режим (прямой переход): устанавливает сессию и переходит в dashboard
 */
export default function TelegramOIDCCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const errorParam = params.get('error');
            const errorDescription = params.get('error_description');

            // Обрабатываем ошибки от Telegram
            if (errorParam) {
                const message = errorDescription ?? errorParam;
                if (window.opener) {
                    window.opener.postMessage(
                        { type: 'telegram-oidc-error', error: message },
                        window.location.origin,
                    );
                    window.close();
                } else {
                    setError(message);
                }
                return;
            }

            if (!code || !state) {
                const message = 'Отсутствуют параметры авторизации. Попробуйте снова.';
                if (window.opener) {
                    window.opener.postMessage(
                        { type: 'telegram-oidc-error', error: message },
                        window.location.origin,
                    );
                    window.close();
                } else {
                    setError(message);
                }
                return;
            }

            // POPUP режим: отправляем данные родительскому окну
            // Верификацию state и обмен токенов делает родительское окно
            if (window.opener) {
                window.opener.postMessage(
                    { type: 'telegram-oidc-success', code, state },
                    window.location.origin,
                );
                window.close();
                return;
            }

            // REDIRECT режим: классическая обработка
            const pkce = loadPKCEState();

            if (!pkce) {
                setError('Сессия авторизации истекла. Попробуйте снова.');
                return;
            }

            if (pkce.state !== state) {
                setError('Ошибка безопасности: state не совпадает. Попробуйте снова.');
                return;
            }

            clearPKCEState();

            const redirectUri = `${window.location.origin}/auth/telegram/callback`;

            const { data, error: fnError } = await supabase.functions.invoke('telegram-oidc-auth', {
                body: { code, code_verifier: pkce.verifier, redirect_uri: redirectUri },
            });

            if (fnError || !data?.session) {
                console.error('[TelegramOIDCCallback] Edge Function error:', fnError ?? data);
                setError(data?.error ?? fnError?.message ?? 'Ошибка входа. Попробуйте ещё раз.');
                return;
            }

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });

            if (sessionError) {
                console.error('[TelegramOIDCCallback] setSession error:', sessionError);
                setError('Не удалось установить сессию. Попробуйте снова.');
                return;
            }

            toast.success('Вход выполнен!');
            navigate('/dashboard', { replace: true });
        };

        handleCallback();
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full space-y-6 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white">Ошибка входа</h2>
                        <p className="text-sm text-zinc-400">{error}</p>
                    </div>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Вернуться на главную
                    </button>
                </div>
            </div>
        );
    }

    // В popup-режиме пользователь видит этот экран лишь долю секунды
    return (
        <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-zinc-400">Выполняем вход через Telegram…</p>
        </div>
    );
}
