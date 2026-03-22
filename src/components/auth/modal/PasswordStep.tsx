import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Eye, EyeOff, Loader2, Sparkles, Wand2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParticleEmitter } from '@/components/ui/ParticleEmitter';
import { useLanguage } from '@/contexts/LanguageContext';

interface PasswordStepProps {
    email: string;
    password: string;
    displayedPassword: string;
    passwordError: string | null;
    isPasswordShaking: boolean;
    isSubmitting: boolean;
    showPassword: boolean;
    isScrambling: boolean;
    isButtonHovered: boolean;
    isInputFocused: boolean;
    userHasPassword: boolean;
    magicLinkState: 'idle' | 'sending' | 'sent';
    onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBackToEmail: () => void;
    onFinalSubmit: (e: React.FormEvent) => void;
    onPasswordRecovery: () => void;
    onSendMagicLink: (newAcc: boolean) => void;
    onStepChange: (step: any) => void;
    toggleShowPassword: () => void;
    setIsButtonHovered: (val: boolean) => void;
    setIsInputFocused: (val: boolean) => void;
}

export function PasswordStep({
    email,
    password,
    displayedPassword,
    passwordError,
    isPasswordShaking,
    isSubmitting,
    showPassword,
    isScrambling,
    isButtonHovered,
    isInputFocused,
    userHasPassword,
    magicLinkState,
    onPasswordChange,
    onBackToEmail,
    onFinalSubmit,
    onPasswordRecovery,
    onSendMagicLink,
    onStepChange,
    toggleShowPassword,
    setIsButtonHovered,
    setIsInputFocused
}: PasswordStepProps) {
    const { t } = useLanguage();
    const passwordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (passwordInputRef.current) {
            passwordInputRef.current.focus();
        }
    }, []);

    return (
        <motion.div
            key="step-password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
        >
            {/* Email Pill */}
            <div className="flex justify-center">
                <div
                    onClick={onBackToEmail}
                    className="group flex items-center justify-center gap-2 bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-white/5 rounded-full py-1.5 px-4 cursor-pointer hover:bg-muted dark:hover:bg-zinc-900 hover:border-border dark:hover:border-white/10 transition-all"
                >
                    <span className="text-foreground dark:text-zinc-300 text-sm font-medium">{email}</span>
                    <span className="text-[11px] text-sky-400 font-bold group-hover:text-sky-300 transition-colors uppercase tracking-wider">
                        {t('auth.changeEmail')}
                    </span>
                </div>
            </div>

            {userHasPassword ? (
                <>
                    <form onSubmit={onFinalSubmit} className="space-y-4">
                        <div className="flex justify-between items-end mb-2 px-1">
                            <label className="text-sm font-medium text-muted-foreground">
                                {t('auth.password')}
                            </label>
                            <button
                                type="button"
                                onClick={onPasswordRecovery}
                                disabled={isSubmitting}
                                className="text-[11px] text-muted-foreground hover:text-blue-400 cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                            >
                                {t('auth.forgotPassword') || 'Забыли?'}
                            </button>
                        </div>

                        <Input
                            ref={passwordInputRef}
                            type={showPassword ? "text" : "password"}
                            placeholder={t('auth.passwordPlaceholder')}
                            value={showPassword || isScrambling ? displayedPassword : password}
                            onChange={onPasswordChange}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            error={passwordError ?? undefined}
                            className={`bg-muted/50 dark:bg-zinc-900/50 border-border dark:border-zinc-800 h-12 text-lg shadow-inner pr-10 ${isPasswordShaking ? 'animate-shake' : ''}`}
                            rightElement={
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={toggleShowPassword}
                                    className="text-muted-foreground/40 dark:text-zinc-500/40 hover:text-foreground dark:hover:text-zinc-300 transition-all duration-300 focus:outline-none relative group pr-2"
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={showPassword ? 'visible' : 'hidden'}
                                            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                                            transition={{ duration: 0.2, ease: "backOut" }}
                                        >
                                            {showPassword ? (
                                                <div className="relative">
                                                    <EyeOff className="w-5 h-5 text-blue-400" />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
                                                        transition={{ duration: 0.6 }}
                                                        className="absolute -inset-1 bg-blue-500/20 rounded-full blur-sm -z-10"
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: [0, 1, 0] }}
                                                        transition={{ duration: 0.4 }}
                                                        className="absolute -top-3 -right-3 pointer-events-none"
                                                    >
                                                        <Wand2 className="w-4 h-4 text-blue-400/60" />
                                                    </motion.div>
                                                </div>
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </button>
                            }
                        />

                        <div className="relative mt-6">
                            <ParticleEmitter isActive={isButtonHovered && !isInputFocused} />
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isSubmitting}
                                onMouseEnter={() => setIsButtonHovered(true)}
                                onMouseLeave={() => setIsButtonHovered(false)}
                                className="
                  relative h-11 text-[15px] font-bold overflow-hidden rounded-xl
                  bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600
                  hover:from-blue-500 hover:via-indigo-500 hover:to-purple-600
                  text-white border-none
                  shadow-[0_4px_20px_rgba(37,99,235,0.3)]
                  hover:shadow-[0_6px_25px_rgba(37,99,235,0.45)]
                  transition-all duration-300 ease-out
                  active:scale-[0.98]
                  before:absolute before:inset-0
                  before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0
                  before:-translate-x-full hover:before:translate-x-full
                  before:transition-transform before:duration-700
                "
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.signIn')}
                                </span>
                            </Button>
                        </div>
                    </form>

                    {/* Magic Link - Ghost Button (Secondary action) */}
                    <button
                        type="button"
                        onClick={() => onStepChange('magic-link-existing')}
                        className="
              group/magic w-full h-10 text-[13px] font-medium rounded-lg
              bg-transparent hover:bg-blue-500/10
              text-blue-400 hover:text-blue-300
              transition-all duration-200
              flex items-center justify-center gap-2 font-bold
            "
                    >
                        <Sparkles className="w-3 h-3 opacity-70" />
                        <span>{t('auth.signInWithoutPassword') || 'Войти без пароля'}</span>
                    </button>
                </>
            ) : (
                /* --- НЕТ ПАРОЛЯ: ТОЛЬКО кнопка Magic Link --- */
                <div className="group/magic relative">
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
                                    {t('auth.signInWithoutPassword') || 'Войти без пароля'}
                                </>
                            )}
                        </span>
                    </Button>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover/magic:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                        {t('auth.magicTooltip')}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
