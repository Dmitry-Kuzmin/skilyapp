/**
 * SubscriptionTab - Вкладка "Подписка"
 */

import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

export const SubscriptionTab: React.FC = () => {
    const { closeSettings } = useSettingsStore();

    const handleChangePlan = () => {
        triggerHaptic('light');
        closeSettings();
        window.location.href = '/premium';
    };

    const handleCancel = () => {
        triggerHaptic('warning');
        toast.info('Свяжитесь с поддержкой для отмены подписки', { duration: 2000 });
    };

    return (
        <div className="space-y-6">
            {/* Текущий план */}
            <div>
                <SectionTitle title="Текущий план" />
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200 dark:border-indigo-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">Premium Forever</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Безлимитный доступ ко всем функциям</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Управление */}
            <div>
                <SectionTitle title="Управление" />
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={handleChangePlan}
                    >
                        Изменить план
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-between text-slate-500"
                        onClick={handleCancel}
                    >
                        Отменить подписку
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTab;
