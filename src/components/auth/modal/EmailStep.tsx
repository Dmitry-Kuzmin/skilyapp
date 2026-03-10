import { motion } from '@/components/optimized/Motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { PasskeyLoginButton } from '@/components/auth/PasskeyLoginButton';
import { GoogleIcon, TelegramIcon } from '@/components/icons/SocialIcons';

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
    onTelegramLogin: () => void;
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
    onTelegramLogin,
    getPasskeyLabel,
    onClose,
}: EmailStepProps) {
    const { t } = useLanguage();

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
                        'bg-zinc-900/50 border-zinc-800 h-14 text-lg transition-all duration-300',
                        isValidEmail ? 'border-blue-500/50 ring-2 ring-blue-500/10' : '',
                        isEmailShaking ? 'animate-shake border-red-500/50' : '',
                    )}
                    rightElement={
                        <div className="flex items-center pr-1 scale-110">
                            <motion.button
                                type="submit"
                                disabled={checkingEmail}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => onContinue(e)}
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

                {isValidEmail && !emailError && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] text-center text-zinc-500 font-medium"
                    >
                        {t('auth.tapArrow')}
                    </motion.p>
                )}
            </form>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                className="pt-0"
            >
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800" />
                    <span className="flex-shrink-0 mx-4 text-zinc-600 text-[11px] font-medium uppercase tracking-wider">
                        {t('auth.orContinueWith')}
                    </span>
                    <div className="flex-grow border-t border-zinc-800" />
                </div>

                <div className={cn('grid gap-3 mt-1', isPasskeyAvailable ? 'grid-cols-3' : 'grid-cols-2')}>
                    {isPasskeyAvailable && (
                        <PasskeyLoginButton onSuccess={onClose} variant="inline" label={getPasskeyLabel()} />
                    )}

                    <Button
                        variant="secondary"
                        className="bg-zinc-900 h-11 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all font-bold"
                        onClick={onGoogleLogin}
                    >
                        <GoogleIcon />
                    </Button>

                    <Button
                        id="telegram-oidc-login-btn"
                        variant="secondary"
                        disabled={telegramLoading}
                        onClick={onTelegramLogin}
                        className="w-full h-11 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all font-bold"
                    >
                        {telegramLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <TelegramIcon className="h-4 w-4" />
                                <span>Telegram</span>
                            </div>
                        )}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}
