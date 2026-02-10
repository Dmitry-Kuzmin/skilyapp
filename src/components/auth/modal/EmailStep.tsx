import { useEffect } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { PasskeyLoginButton } from '@/components/auth/PasskeyLoginButton';
import { GoogleIcon, TelegramIcon } from '@/components/icons/SocialIcons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailStepProps {
    email: string;
    setEmail: (val: string) => void;
    emailError: string | null;
    checkingEmail: boolean;
    isValidEmail: boolean;
    isEmailShaking: boolean;
    isPasskeyAvailable: boolean;
    telegramLoading: boolean;
    onContinue: (e: React.FormEvent) => void;
    onGoogleLogin: () => void;
    getPasskeyLabel: () => string;
    onClose: () => void;
}

export function EmailStep({
    email,
    setEmail,
    emailError,
    checkingEmail,
    isValidEmail,
    isEmailShaking,
    isPasskeyAvailable,
    telegramLoading,
    onContinue,
    onGoogleLogin,
    getPasskeyLabel,
    onClose
}: EmailStepProps) {
    const { t } = useLanguage();

    // Inject Telegram Widget
    useEffect(() => {
        const botName = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'skilyapp_bot';
        const container = document.getElementById('telegram-login-container-new');

        if (!container) return;
        if (container.children.length > 0) return; // Already injected

        // Define global callback if not exists
        if (!(window as any).onTelegramAuth) {
            (window as any).onTelegramAuth = async (user: any) => {
                console.log('[Telegram Auth] Widget success:', user);
                // Dispatch custom event to be caught by React
                const event = new CustomEvent('telegram-login-success', { detail: user });
                window.dispatchEvent(event);
            };
        }

        const script = document.createElement('script');
        script.id = 'telegram-widget-script';
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', 'large');
        script.setAttribute('crossorigin', 'anonymous');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;

        container.appendChild(script);

        return () => {
            // Очистка при размонтировании
            if (container) {
                container.innerHTML = '';
            }
        };
    }, []);

    // Handle Telegram Login Success
    useEffect(() => {
        const handleTelegramLogin = async (e: any) => {
            const user = e.detail;
            console.log('[EmailStep] Received Telegram User:', user);

            // Show loading state
            const loadingToast = toast.loading('Вход через Telegram...');

            try {
                // Call our secure Edge Function
                const { data, error } = await supabase.functions.invoke('telegram-widget-verify', {
                    body: { user }
                });

                if (error) throw error;
                if (!data.success || !data.redirectUrl) throw new Error(data.error || 'Login failed');

                // Success! Redirect to the magic link which will log us in
                toast.dismiss(loadingToast);
                toast.success('Успешно! Переходим в приложение...');

                // The magic link acts as a "passwordless sign-in link"
                // It will hit Supabase Auth, set the session, and redirect to dashboard
                window.location.href = data.redirectUrl;

            } catch (err: any) {
                console.error('[EmailStep] Telegram login error:', err);
                toast.dismiss(loadingToast);
                toast.error('Ошибка входа через Telegram. Попробуйте еще раз.');
            }
        };

        window.addEventListener('telegram-login-success', handleTelegramLogin);
        return () => window.removeEventListener('telegram-login-success', handleTelegramLogin);
    }, []);


    return (
        <motion.div
            key="step-email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <form onSubmit={onContinue} className="space-y-4">
                <Input
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={emailError ?? undefined}
                    autoFocus
                    className={cn(
                        "bg-zinc-900/50 border-zinc-800 h-14 text-lg transition-all duration-300",
                        isValidEmail ? "border-blue-500/50 ring-2 ring-blue-500/10" : "",
                        isEmailShaking ? "animate-shake border-red-500/50" : ""
                    )}
                    rightElement={
                        <div className="flex items-center pr-1 scale-110">
                            <motion.button
                                type="submit"
                                disabled={checkingEmail}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                    onContinue(e);
                                }}
                                className="bg-white text-black w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {checkingEmail ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                            </motion.button>
                        </div>
                    }
                />

                {/* Micro-hint under input */}
                {isValidEmail && !emailError && (
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-[11px] text-center text-zinc-500 font-medium"
                    >
                        {t('auth.tapArrow')}
                    </motion.p>
                )}
            </form>

            {/* Divider & Socials */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                className="pt-0"
            >
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-600 text-[11px] font-medium uppercase tracking-wider">
                        {t('auth.orContinueWith')}
                    </span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                <div className={cn(
                    "grid gap-3 mt-1",
                    isPasskeyAvailable ? "grid-cols-3" : "grid-cols-2"
                )}>
                    {isPasskeyAvailable && (
                        <PasskeyLoginButton
                            onSuccess={onClose}
                            variant="inline"
                            label={getPasskeyLabel()}
                        />
                    )}
                    <Button
                        variant="secondary"
                        className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all font-bold"
                        onClick={onGoogleLogin}
                    >
                        <GoogleIcon />
                    </Button>
                    <div className="relative h-11">
                        <Button
                            variant="secondary"
                            disabled={true}
                            className="w-full h-full bg-zinc-900 border-zinc-800 font-bold opacity-50"
                        >
                            <TelegramIcon className="mr-2 h-4 w-4" />
                            Telegram
                        </Button>
                        <div
                            id="telegram-login-container-new"
                            className="absolute inset-0 z-10 flex items-center justify-center [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!max-w-none"
                            style={{ minHeight: '44px' }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
