/**
 * NotificationsTab - Вкладка "Уведомления"
 */

import React, { useState, useEffect, useContext } from 'react';
import { Bell, BellOff, Mail, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { CyberSwitch } from '../ui/CyberSwitch';
import { Button } from '@/components/ui/button';
import { UserContext } from '@/contexts/UserContext';
import {
    isPushSupported,
    isPWAInstalled,
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    isPushSubscribed,
    sendTestNotification,
} from '@/utils/pushNotifications';

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
    const userContext = useContext(UserContext);
    const userId = userContext?.user?.id;

    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pwaInstalled, setPwaInstalled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Проверяем поддержку и статус
        setPushSupported(isPushSupported());
        setPwaInstalled(isPWAInstalled());
        setPermission(getNotificationPermission());

        // Проверяем подписку
        if (isPushSupported()) {
            isPushSubscribed().then(setPushEnabled);
        }
    }, []);

    const handleDuelNotifications = () => {
        triggerHaptic('medium');
        toggleDuelNotifications();
        toast.success(duelNotifications ? 'Уведомления о дуэлях выключены' : 'Уведомления о дуэлях включены', { duration: 1500 });
    };

    const handlePushToggle = async () => {
        if (!userId) {
            toast.error('Необходима авторизация');
            return;
        }

        if (!pushSupported) {
            toast.error('Push-уведомления не поддерживаются');
            return;
        }

        setIsLoading(true);
        triggerHaptic('medium');

        try {
            if (pushEnabled) {
                // Отключаем
                await unsubscribeFromPush(userId);
                setPushEnabled(false);
                toast.success('Push-уведомления отключены');
            } else {
                // Включаем
                if (permission !== 'granted') {
                    const newPermission = await requestNotificationPermission();
                    setPermission(newPermission);

                    if (newPermission !== 'granted') {
                        toast.error('Разрешение на уведомления отклонено');
                        return;
                    }
                }

                await subscribeToPush(userId);
                setPushEnabled(true);
                toast.success('Push-уведомления включены! 🎉');

                // Отправляем тестовое уведомление
                setTimeout(() => {
                    sendTestNotification().catch(console.error);
                }, 1000);
            }
        } catch (error: any) {
            console.error('[NotificationsTab] Push toggle error:', error);
            toast.error(error.message || 'Не удалось изменить настройки');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNotification = async () => {
        triggerHaptic('light');
        try {
            await sendTestNotification();
            toast.success('Тестовое уведомление отправлено!');
        } catch (error: any) {
            toast.error(error.message || 'Не удалось отправить уведомление');
        }
    };

    return (
        <div className="space-y-6">
            {/* Web Push (iOS/Android PWA) */}
            {pushSupported && (
                <div>
                    <SectionTitle title="Web Push (iOS/Android)" />

                    {/* Статус PWA */}
                    {!pwaInstalled && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-700 dark:text-amber-400">
                                    <p className="font-semibold mb-1">Добавьте приложение на экран «Домой»</p>
                                    <p className="text-amber-600 dark:text-amber-500">
                                        Для получения уведомлений на iOS нажмите <strong>Поделиться</strong> → <strong>На экран «Домой»</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <SettingRow
                            icon={pushEnabled ? <Smartphone className="w-4 h-4 text-emerald-500" /> : <Smartphone className="w-4 h-4 text-slate-400" />}
                            label="Push-уведомления"
                            description={
                                pushEnabled
                                    ? "Активно • Вы получаете уведомления"
                                    : pwaInstalled
                                        ? "Включите для получения уведомлений"
                                        : "Требуется установка PWA"
                            }
                        >
                            <CyberSwitch
                                checked={pushEnabled}
                                onCheckedChange={handlePushToggle}
                                disabled={isLoading || !pwaInstalled}
                            />
                        </SettingRow>

                        {pushEnabled && (
                            <div className="pl-12 pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleTestNotification}
                                    className="h-8 text-xs"
                                >
                                    🧪 Отправить тестовое уведомление
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Настройки уведомлений */}
            <div>
                <SectionTitle title="Настройки уведомлений" />
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
                            checked={false}
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
