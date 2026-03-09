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
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { t } = useLanguage();
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

        const labelOn = t('unifiedSettings.cockpitKeys.soundOn');
        const labelOff = t('unifiedSettings.cockpitKeys.soundOff');
        toast.success(soundEnabled ? labelOff : labelOn, { duration: 1500 });
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
        const labelOn = t('unifiedSettings.cockpitKeys.hapticOn');
        const labelOff = t('unifiedSettings.cockpitKeys.hapticOff');
        toast.success(hapticEnabled ? labelOff : labelOn, { duration: 1500 });
    };

    const handleAdasToggle = () => {
        triggerHaptic('medium');
        toggleAdasHints();
        const labelOn = t('unifiedSettings.cockpitKeys.aiHintsOn');
        const labelOff = t('unifiedSettings.cockpitKeys.aiHintsOff');
        toast.success(adasHints ? labelOff : labelOn, { duration: 1500 });
    };

    const handleNotificationsToggle = () => {
        triggerHaptic('medium');
        toggleDuelNotifications();
        const labelOn = t('unifiedSettings.cockpitKeys.duelNotificationsOn');
        const labelOff = t('unifiedSettings.cockpitKeys.duelNotificationsOff');
        toast.success(duelNotifications ? labelOff : labelOn, { duration: 1500 });
    };

    return (
        <div className="space-y-6">
            {/* Аудио */}
            <div>
                <SectionTitle title={t('unifiedSettings.cockpitKeys.audio')} />
                <div className="space-y-4">
                    <SettingRow
                        icon={soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.cockpitKeys.soundEffects')}
                        description={t('unifiedSettings.cockpitKeys.interfaceSounds')}
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
                                label={t('unifiedSettings.cockpitKeys.volume')}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Haptics */}
            <div>
                <SectionTitle title={t('unifiedSettings.cockpitKeys.haptics')} />
                <SettingRow
                    icon={<Vibrate className={hapticEnabled ? 'w-4 h-4 text-purple-500' : 'w-4 h-4 text-slate-400'} />}
                    label={t('unifiedSettings.cockpitKeys.vibration')}
                    description={t('unifiedSettings.cockpitKeys.hapticFeedback')}
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
                <SectionTitle title={t('unifiedSettings.cockpitKeys.gameSettings')} />
                <div className="space-y-1">
                    <SettingRow
                        icon={<Sparkles className={adasHints ? 'w-4 h-4 text-cyan-500' : 'w-4 h-4 text-slate-400'} />}
                        label={t('unifiedSettings.cockpitKeys.aiHints')}
                        description={t('unifiedSettings.cockpitKeys.testHelp')}
                    >
                        <CyberSwitch
                            checked={adasHints}
                            onCheckedChange={handleAdasToggle}
                        />
                    </SettingRow>

                    <SettingRow
                        icon={duelNotifications ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.cockpitKeys.duelNotifications')}
                        description={t('unifiedSettings.cockpitKeys.duelDescription')}
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
