/**
 * CockpitTab - Вкладка "Кокпит"
 * 
 * Звук, вибрация, игровой HUD
 */

import React from 'react';
import { Volume2, VolumeX, Vibrate, Sparkles, Bell, BellOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { sounds } from '@/lib/sounds';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { CyberSwitch } from '../ui/CyberSwitch';
import { CyberSlider } from '../ui/CyberSlider';

// === COMPONENTS ===
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

export const CockpitTab: React.FC = () => {
    const {
        soundEnabled,
        soundVolume,
        hapticEnabled,
        adasHints,
        duelNotifications,
        toggleSound,
        setSoundVolume,
        toggleHaptic,
        toggleAdasHints,
        toggleDuelNotifications,
    } = useSettingsStore();

    const handleSoundToggle = () => {
        triggerHaptic('medium');
        toggleSound();
        sounds.setEnabled?.(!soundEnabled);
        if (!soundEnabled) sounds.playClick?.(1000, 0.1);
        toast.success(soundEnabled ? 'Звук выключен' : 'Звук включён', { duration: 1500 });
    };

    const handleVolumeChange = (value: number) => {
        setSoundVolume(value);
        sounds.setVolume?.(value / 100);
    };

    const handleHapticToggle = () => {
        toggleHaptic();
        if (!hapticEnabled) {
            triggerHaptic('success');
        }
        toast.success(hapticEnabled ? 'Вибрация выключена' : 'Вибрация включена', { duration: 1500 });
    };

    const handleAdasToggle = () => {
        triggerHaptic('medium');
        toggleAdasHints();
        toast.success(adasHints ? 'AI-подсказки выключены' : 'AI-подсказки включены', { duration: 1500 });
    };

    const handleNotificationsToggle = () => {
        triggerHaptic('medium');
        toggleDuelNotifications();
        toast.success(duelNotifications ? 'Уведомления выключены' : 'Уведомления включены', { duration: 1500 });
    };

    return (
        <div className="space-y-6">
            {/* Аудио */}
            <div>
                <SectionTitle title="Аудио" />
                <div className="space-y-4">
                    <SettingRow
                        icon={soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                        label="Звуковые эффекты"
                        description="Звуки интерфейса и игр"
                    >
                        <CyberSwitch
                            checked={soundEnabled}
                            onCheckedChange={handleSoundToggle}
                        />
                    </SettingRow>

                    {soundEnabled && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <CyberSlider
                                value={soundVolume}
                                onValueChange={handleVolumeChange}
                                label="Громкость"
                            />
                        </div>
                    )}
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Haptics */}
            <div>
                <SectionTitle title="Тактильная отдача" />
                <SettingRow
                    icon={<Vibrate className={hapticEnabled ? 'w-4 h-4 text-purple-500' : 'w-4 h-4 text-slate-400'} />}
                    label="Вибрация"
                    description="Отклик на касания"
                >
                    <CyberSwitch
                        checked={hapticEnabled}
                        onCheckedChange={handleHapticToggle}
                    />
                </SettingRow>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Game HUD */}
            <div>
                <SectionTitle title="Игровые настройки" />
                <div className="space-y-1">
                    <SettingRow
                        icon={<Sparkles className={adasHints ? 'w-4 h-4 text-cyan-500' : 'w-4 h-4 text-slate-400'} />}
                        label="AI-подсказки"
                        description="Помощь в тестах"
                    >
                        <CyberSwitch
                            checked={adasHints}
                            onCheckedChange={handleAdasToggle}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={duelNotifications ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                        label="Уведомления о дуэлях"
                        description="Вызовы и результаты"
                    >
                        <CyberSwitch
                            checked={duelNotifications}
                            onCheckedChange={handleNotificationsToggle}
                        />
                    </SettingRow>
                </div>
            </div>
        </div>
    );
};

export default CockpitTab;
