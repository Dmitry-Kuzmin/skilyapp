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
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
    const { supabaseUser } = useUserContext();
    const { t } = useLanguage();
    const userId = supabaseUser?.id;

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

        // Проверяем подписку только если есть userId
        if (isPushSupported() && userId) {
            isPushSubscribed().then(setPushEnabled);
        }
    }, [userId]);

    const handleDuelNotifications = () => {
        triggerHaptic('medium');
        toggleDuelNotifications();
        toast.success(
            duelNotifications
                ? t('unifiedSettings.notificationsKeys.duelNotificationsOff')
                : t('unifiedSettings.notificationsKeys.duelNotificationsOn'),
            { duration: 1500 }
        );
    };

    const handlePushToggle = async () => {
        if (!userId) {
            console.error('Push toggle failed: No Supabase user ID found');
            toast.error(t('unifiedSettings.notificationsKeys.authRequired'));
            return;
        }

        if (!pushSupported) {
            toast.error(t('unifiedSettings.notificationsKeys.pushNotSupported'));
            return;
        }

        setIsLoading(true);
        triggerHaptic('medium');

        try {
            if (pushEnabled) {
                // Отключаем
                await unsubscribeFromPush(userId);
                setPushEnabled(false);
                toast.success(t('unifiedSettings.notificationsKeys.pushDisabled'));
            } else {
                // Включаем
                if (permission !== 'granted') {
                    const newPermission = await requestNotificationPermission();
                    setPermission(newPermission);

                    if (newPermission !== 'granted') {
                        toast.error(t('unifiedSettings.notificationsKeys.permissionDenied'));
                        return;
                    }
                }

                await subscribeToPush(userId);
                setPushEnabled(true);
                toast.success(t('unifiedSettings.notificationsKeys.pushEnabled'));

                // Отправляем тестовое уведомление
                setTimeout(() => {
                    sendTestNotification().catch(console.error);
                }, 1000);
            }
        } catch (error: any) {
            console.error('[NotificationsTab] Push toggle error:', error);
            toast.error(error.message || t('unifiedSettings.notificationsKeys.settingsChangeFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNotification = async () => {
        triggerHaptic('light');
        try {
            await sendTestNotification();
            toast.success(t('unifiedSettings.notificationsKeys.testSent'));
        } catch (error: any) {
            toast.error(error.message || t('unifiedSettings.notificationsKeys.testFailed'));
        }
    };

    // Определяем iOS, так как там PWA установка обязательна для пушей
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Блокируем свитч ТОЛЬКО если это iOS и не PWA. Для остальных (Deskop/Android) разрешаем.
    const isSwitchDisabled = isLoading || (isIOS && !pwaInstalled);

    return (
        <div className="space-y-6">
            {/* Web Push (iOS/Android PWA) */}
            {pushSupported && (
                <div>
                    <SectionTitle title={t('unifiedSettings.notificationsKeys.webPushTitle')} />

                    {/* Статус PWA - показываем предупреждение ТОЛЬКО на iOS, если не установлено */}
                    {!pwaInstalled && isIOS && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-700 dark:text-amber-400">
                                    <p className="font-semibold mb-1">{t('unifiedSettings.notificationsKeys.pwaInstallTitle')}</p>
                                    <p className="text-amber-600 dark:text-amber-500">
                                        {t('unifiedSettings.notificationsKeys.pwaInstallDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <SettingRow
                            icon={pushEnabled ? <Smartphone className="w-4 h-4 text-emerald-500" /> : <Smartphone className="w-4 h-4 text-slate-400" />}
                            label={t('unifiedSettings.notificationsKeys.pushLabel')}
                            description={
                                pushEnabled
                                    ? t('unifiedSettings.notificationsKeys.pushActiveDesc')
                                    : (isIOS && !pwaInstalled)
                                        ? t('unifiedSettings.notificationsKeys.pushPwaRequired')
                                        : t('unifiedSettings.notificationsKeys.pushEnableDesc')
                            }
                        >
                            <CyberSwitch
                                checked={pushEnabled}
                                onCheckedChange={handlePushToggle}
                                disabled={isSwitchDisabled}
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
                                    {t('unifiedSettings.notificationsKeys.testButton')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Настройки уведомлений */}
            <div>
                <SectionTitle title={t('unifiedSettings.notificationsKeys.settingsTitle')} />
                <div className="space-y-1">
                    <SettingRow
                        icon={duelNotifications ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.notificationsKeys.duelLabel')}
                        description={t('unifiedSettings.notificationsKeys.duelDesc')}
                    >
                        <CyberSwitch
                            checked={duelNotifications}
                            onCheckedChange={handleDuelNotifications}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={<Bell className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.notificationsKeys.remindersLabel')}
                        description={t('unifiedSettings.notificationsKeys.remindersDesc')}
                    >
                        <CyberSwitch
                            checked={false}
                            onCheckedChange={() => {
                                triggerHaptic('warning');
                                toast.info(t('unifiedSettings.notificationsKeys.comingSoon'));
                            }}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={<Mail className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.notificationsKeys.emailLabel')}
                        description={t('unifiedSettings.notificationsKeys.emailDesc')}
                    >
                        <CyberSwitch
                            checked={false}
                            onCheckedChange={() => {
                                triggerHaptic('warning');
                                toast.info(t('unifiedSettings.notificationsKeys.comingSoon'));
                            }}
                        />
                    </SettingRow>
                </div>
            </div>
        </div>
    );
};

export default NotificationsTab;
