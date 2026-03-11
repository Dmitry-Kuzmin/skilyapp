import { useState, useRef, useEffect } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface VerifyOtpStepProps {
    email: string;
    isSubmitting: boolean;
    onVerify: (otp: string) => void;
    onResend: () => void;
    resendCooldown: number;
    onBackToEmail: () => void;
}

export function VerifyOtpStep({
    email,
    isSubmitting,
    onVerify,
    onResend,
    resendCooldown,
    onBackToEmail
}: VerifyOtpStepProps) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const { t } = useLanguage();

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        if (newOtp.every(digit => digit !== '')) {
            onVerify(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = [...otp];
        data.split('').forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        
        const nextIndex = Math.min(data.length, 5);
        inputs.current[nextIndex]?.focus();

        if (newOtp.every(digit => digit !== '')) {
            onVerify(newOtp.join(''));
        }
    };

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    return (
        <motion.div
            key="step-otp-verify"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 py-4"
        >
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                    {t('auth.enterOtpTitle') || 'Введите код'}
                </h3>
                <p className="text-sm text-zinc-400">
                    {t('auth.otpSentTo') || 'Мы отправили 6-значный код на'} <br/>
                    <span className="text-blue-400 font-semibold">{email}</span>
                </p>
                <button 
                  onClick={onBackToEmail}
                  className="text-[11px] text-zinc-500 hover:text-blue-400 font-bold uppercase tracking-wider transition-colors pt-1"
                >
                  {t('auth.changeEmail')}
                </button>
            </div>

            <div className="flex justify-between gap-2 max-w-[300px] mx-auto">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={el => inputs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onFocus={() => inputs.current[index]?.select()}
                        onChange={e => handleChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={isSubmitting}
                        className="w-11 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                ))}
            </div>

            <div className="pt-2">
              <Button
                  onClick={() => onVerify(otp.join(''))}
                  disabled={isSubmitting || otp.some(d => d === '')}
                  className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_8px_25px_rgba(37,99,235,0.3)]"
              >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      {t('auth.verifyCode') || 'Подтвердить'}
                    </span>
                  )}
              </Button>

              <div className="text-center mt-6">
                {resendCooldown > 0 ? (
                  <p className="text-[11px] text-zinc-500">
                    Отправить повторно через <span className="text-zinc-300 font-mono">{resendCooldown}с</span>
                  </p>
                ) : (
                  <button
                    onClick={onResend}
                    disabled={isSubmitting}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center justify-center gap-1 mx-auto group"
                  >
                    <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                    <span>Отправить код еще раз</span>
                  </button>
                )}
              </div>
            </div>
        </motion.div>
    );
}
