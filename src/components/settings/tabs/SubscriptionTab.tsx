/**
 * SubscriptionTab - Вкладка "Подписка"
 */

import React from 'react';
import { Sparkles, ChevronRight, Crown, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { usePremium } from '@/hooks/usePremium';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

export const SubscriptionTab: React.FC = () => {
    const { closeSettings } = useSettingsStore();
    const { isPremium, isLifetime, isTrial, activeUntil, loading } = usePremium();

    const handleUpgrade = () => {
        triggerHaptic('light');
        closeSettings();
        window.location.href = '/premium';
    };

    const handleCancel = () => {
        triggerHaptic('warning');
        toast.info('Свяжитесь с поддержкой для отмены подписки', { duration: 2000 });
    };

    if (loading) {
        return <div className="p-4 text-center text-slate-500">Загрузка...</div>;
    }

    // Определяем контент карточки плана
    const getPlanDetails = () => {
        if (isLifetime) {
            return {
                title: 'Premium Forever',
                subtitle: 'Вечный доступ ко всем функциям',
                icon: <Sparkles className="w-6 h-6 text-white" />,
                gradient: 'from-amber-500 to-orange-500',
                bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10',
                borderColor: 'border-amber-200 dark:border-amber-500/20'
            };
        }
        if (isTrial) {
            return {
                title: 'Пробный период',
                subtitle: activeUntil ? `До ${format(new Date(activeUntil), 'd MMMM yyyy', { locale: ru })}` : 'Активен',
                icon: <Clock className="w-6 h-6 text-white" />,
                gradient: 'from-blue-500 to-cyan-500',
                bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10',
                borderColor: 'border-blue-200 dark:border-blue-500/20'
            };
        }
        if (isPremium) {
            return {
                title: 'Premium',
                subtitle: activeUntil ? `Активен до ${format(new Date(activeUntil), 'd MMMM yyyy', { locale: ru })}` : 'Активная подписка',
                icon: <Crown className="w-6 h-6 text-white" />,
                gradient: 'from-indigo-500 to-purple-500',
                bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10',
                borderColor: 'border-indigo-200 dark:border-indigo-500/20'
            };
        }
        return {
            title: 'Базовый план',
            subtitle: 'Ограниченный доступ',
            icon: <AlertCircle className="w-6 h-6 text-slate-500" />,
            gradient: 'from-slate-200 to-slate-300', // Иконка bg
            iconColor: 'text-slate-600', // Цвет самой иконки
            bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50',
            borderColor: 'border-slate-200 dark:border-slate-700'
        };
    };

    const plan = getPlanDetails();

    return (
        <div className="space-y-6">
            {/* Текущий план */}
            <div>
                <SectionTitle title="Текущий план" />
                <div className={`p-4 rounded-xl bg-gradient-to-br ${plan.bgGradient} border ${plan.borderColor}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                            {React.cloneElement(plan.icon as React.ReactElement, { className: isPremium ? 'text-white' : 'text-slate-600' })}
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">{plan.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{plan.subtitle}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Управление */}
            <div>
                <SectionTitle title="Управление" />
                <div className="space-y-2">
                    {!isPremium || isTrial ? (
                        <Button
                            variant="default"
                            className="w-full justify-between bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                            onClick={handleUpgrade}
                        >
                            {isTrial ? 'Купить полную версию' : 'Купить Premium'}
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : null}

                    {isPremium && !isLifetime && (
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={handleUpgrade}
                        >
                            Изменить план
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}

                    {isPremium && !isLifetime && (
                        <Button
                            variant="outline"
                            className="w-full justify-between text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                            onClick={handleCancel}
                        >
                            Отменить подписку
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}

                    {isLifetime && (
                        <p className="text-xs text-center text-slate-400 mt-2">
                            У вас активирован максимальный тариф навсегда
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTab;
