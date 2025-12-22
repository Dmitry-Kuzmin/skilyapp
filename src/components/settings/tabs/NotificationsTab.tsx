/**
 * NotificationsTab - Вкладка "Уведомления"
 */

import React from 'react';
import { Bell, BellOff, Mail } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { CyberSwitch } from '../ui/CyberSwitch';

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

const SettingRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    description?: string;
    children: React.ReactNode;
}> = ({ icon, label, description, children }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">{label}</span>
                {description && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">{description}</span>
                )}
            </div>
        </div>
        <div className="shrink-0 ml-3">{children}</div>
    </div>
);

export const NotificationsTab: React.FC = () => {
    const { duelNotifications, toggleDuelNotifications } = useSettingsStore();

    const handleDuelNotifications = () => {
        triggerHaptic('medium');
        toggleDuelNotifications();
        toast.success(duelNotifications ? 'Уведомления о дуэлях выключены' : 'Уведомления о дуэлях включены', { duration: 1500 });
    };

    return (
        <div className="space-y-6">
            <div>
                <SectionTitle title="Push-уведомления" />
                <div className="space-y-1">
                    <SettingRow
                        icon={duelNotifications ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                        label="Уведомления о дуэлях"
                        description="Вызовы, результаты, награды"
                    >
                        <CyberSwitch
                            checked={duelNotifications}
                            onCheckedChange={handleDuelNotifications}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={<Bell className="w-4 h-4 text-slate-400" />}
                        label="Напоминания об обучении"
                        description="Ежедневные напоминания"
                    >
                        <CyberSwitch
                            checked={true}
                            onCheckedChange={() => {
                                triggerHaptic('warning');
                                toast.info('Скоро!');
                            }}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={<Mail className="w-4 h-4 text-slate-400" />}
                        label="Email-рассылка"
                        description="Новости и обновления"
                    >
                        <CyberSwitch
                            checked={false}
                            onCheckedChange={() => {
                                triggerHaptic('warning');
                                toast.info('Скоро!');
                            }}
                        />
                    </SettingRow>
                </div>
            </div>
        </div>
    );
};

export default NotificationsTab;
