import { useState } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/toast';

interface ResetPasswordScreenProps {
    onSuccess: () => void;
    isSubmitting: boolean;
    setIsSubmitting: (val: boolean) => void;
}

export function ResetPasswordScreen({
    onSuccess,
    isSubmitting,
    setIsSubmitting
}: ResetPasswordScreenProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const toast = useToast();

    // Validation State
    const requirements = [
        { id: 'app_len', label: '8+ символов', valid: newPassword.length >= 8 },
        { id: 'app_num', label: 'Цифра', valid: /\d/.test(newPassword) },
        { id: 'app_case', label: 'Aa', valid: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
    ];

    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    const isFormValid = requirements.every(r => r.valid) && passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            onSuccess();
        } catch (error: any) {
            console.error('Password reset failed:', error);
            toast.error(error.message || 'Ошибка обновления пароля');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            key="reset-password-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pt-2"
        >
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Новый пароль</h3>
                <p className="text-sm text-zinc-400">Придумайте надежный пароль для защиты аккаунта</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-2 text-left">
                    <Input
                        type="password"
                        placeholder="Новый пароль"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus:border-blue-500/50 h-12"
                    />

                    {/* Strength Indicator Line */}
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(requirements.filter(r => r.valid).length / requirements.length) * 100}%`
                            }}
                        />
                    </div>
                </div>

                {/* Requirements Checklist */}
                <div className="flex gap-3 justify-center">
                    {requirements.map(req => (
                        <div
                            key={req.id}
                            className={cn(
                                "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border transition-all duration-300",
                                req.valid
                                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                    : "border-transparent bg-zinc-900 text-zinc-600"
                            )}
                        >
                            {req.label}
                        </div>
                    ))}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2 text-left pt-2">
                    <div className={cn(
                        "relative rounded-xl transition-all duration-300",
                        !passwordsMatch && confirmPassword ? "animate-shake" : ""
                    )}>
                        <Input
                            type="password"
                            placeholder="Повторите пароль"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={cn(
                                "bg-black/20 text-white placeholder:text-zinc-600 h-12 transition-all duration-300",
                                !passwordsMatch && confirmPassword
                                    ? "border-red-500/30 focus:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                    : passwordsMatch
                                        ? "border-green-500/30 focus:border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                        : "border-white/10 focus:border-blue-500/50"
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {passwordsMatch && confirmPassword && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <Check className="w-5 h-5 text-green-500" />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    disabled={!isFormValid || isSubmitting}
                    className={cn(
                        "h-12 text-[15px] font-bold mt-4 transition-all duration-300",
                        isFormValid
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            : "bg-zinc-800 text-zinc-500"
                    )}
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить пароль'}
                </Button>
            </form>
        </motion.div>
    );
}
