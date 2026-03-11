import { motion } from '@/components/optimized/Motion';
import { Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface MagicLinkStepProps {
    email: string;
    isSubmitting: boolean;
    magicLinkState: 'idle' | 'sending' | 'sent';
    onBackToEmail: () => void;
    onSendMagicLink: (newAcc: boolean) => void;
    isExistingUser?: boolean;
}

export function MagicLinkStep({
    email,
    isSubmitting,
    magicLinkState,
    onBackToEmail,
    onSendMagicLink,
    isExistingUser = false
}: MagicLinkStepProps) {
    const { t } = useLanguage();

    return (
        <motion.div
            key="step-magic-link"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
        >
            {/* Email Pill */}
            <div className="flex justify-center">
                <div
                    onClick={onBackToEmail}
                    className="group flex items-center justify-center gap-2 bg-zinc-900/50 border border-white/5 rounded-full py-1.5 px-4 cursor-pointer hover:bg-zinc-900 hover:border-white/10 transition-all"
                >
                    <span className="text-zinc-300 text-sm font-medium">{email}</span>
                    <span className="text-[11px] text-sky-400 font-bold group-hover:text-sky-300 transition-colors uppercase tracking-wider">
                        {t('auth.changeEmail')}
                    </span>
                </div>
            </div>

            <div className="pt-2">
                <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    disabled={isSubmitting}
                    onClick={() => onSendMagicLink(false)}
                    className="h-14 text-[16px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all duration-300 active:scale-[0.98] relative overflow-hidden group/btn"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_5s_infinite]" />

                    <span className="flex items-center gap-2 relative z-10">
                        {magicLinkState === 'sending' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> {t('auth.sendingMagicLink')}</>
                        ) : magicLinkState === 'sent' ? (
                            <><ShieldCheck className="w-5 h-5 text-green-300" /> {t('auth.magicLinkSentShort')}</>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 text-amber-200 animate-[pulse_3s_ease-in-out_infinite]" />
                                {isExistingUser 
                                    ? (t('auth.loginButton') || 'Войти в аккаунт') 
                                    : (t('auth.createAccountButton') || 'Создать аккаунт')}
                            </>
                        )}
                    </span>
                </Button>

                <p className="text-[10px] text-zinc-500 text-center mt-6 px-4">
                    Мы отправим письмо с кнопкой для мгновенного входа. Пароль не потребуется — это самый быстрый способ начать.
                </p>
            </div>
        </motion.div>
    );
}
