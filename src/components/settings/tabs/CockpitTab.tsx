/**
 * CockpitTab - Вкладка "Кокпит"
 * 
 * Звук, вибрация, игровой HUD
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Vibrate, Sparkles, Bell, BellOff, CalendarClock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { sounds } from '@/lib/sounds';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { CyberSwitch } from '../ui/CyberSwitch';
import { CyberSlider } from '../ui/CyberSlider';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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

const INTENSITY_OPTIONS = [
    {
        value: 'light' as const,
        icon: '🌱',
        label: { ru: 'Лайт', es: 'Suave', en: 'Light' },
        desc: { ru: '1–2 задачи · до 15 мин', es: '1–2 tareas · 15 min', en: '1–2 tasks · 15 min' },
    },
    {
        value: 'standard' as const,
        icon: '⚡',
        label: { ru: 'Стандарт', es: 'Estándar', en: 'Standard' },
        desc: { ru: '3–4 задачи · 30–40 мин', es: '3–4 tareas · 30–40 min', en: '3–4 tasks · 30–40 min' },
    },
    {
        value: 'hardcore' as const,
        icon: '🔥',
        label: { ru: 'Хардкор', es: 'Intensivo', en: 'Hardcore' },
        desc: { ru: '5+ задач · 60+ мин', es: '5+ tareas · 60+ min', en: '5+ tasks · 60+ min' },
    },
];

export const CockpitTab: React.FC = () => {
    const { t, language } = useLanguage();
    const {
        soundEnabled,
        soundVolume,
        hapticEnabled,
        adasHints,
        duelNotifications,
        trackIntensity,
        toggleSound,
        setSoundVolume,
        toggleHaptic,
        toggleAdasHints,
        toggleDuelNotifications,
        setTrackIntensity,
    } = useSettingsStore();

    const [intensityChanged, setIntensityChanged] = useState(false);

    const handleIntensitySelect = async (value: 'light' | 'standard' | 'hardcore') => {
        if (value === trackIntensity) return;
        triggerHaptic('light');
        setTrackIntensity(value); // локальный store — мгновенно
        setIntensityChanged(true);

        // Синк в БД — RPC запишет в profiles.track_intensity
        const { error } = await supabase.rpc('set_track_intensity', { p_intensity: value });
        if (error) {
            console.error('[CockpitTab] set_track_intensity error:', error);
        }

        const msg = language === 'es'
            ? '✅ Guardado — se aplicará mañana'
            : language === 'en'
            ? '✅ Saved — applies from tomorrow'
            : '✅ Сохранено — задания обновятся завтра';
        toast.success(msg, { duration: 3000 });
    };

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
            {/* Трек дня — Интенсивность */}
            <div>
                <SectionTitle title={
                    language === 'es' ? 'Intensidad del día'
                    : language === 'en' ? 'Daily track intensity'
                    : 'Интенсивность трека дня'
                } />
                <div className="flex flex-col gap-2">
                    {INTENSITY_OPTIONS.map((opt) => {
                        const selected = trackIntensity === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleIntensitySelect(opt.value)}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all w-full',
                                    selected
                                        ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 ring-1 ring-indigo-200 dark:ring-indigo-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                )}
                            >
                                <span className="text-lg">{opt.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                                        {opt.label[language as 'ru' | 'es' | 'en'] ?? opt.label.en}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {opt.desc[language as 'ru' | 'es' | 'en'] ?? opt.desc.en}
                                    </span>
                                </div>
                                {selected && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                        <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Hint: applies tomorrow */}
                <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    <CalendarClock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-[1px]" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {language === 'es'
                            ? 'Las misiones de hoy ya están asignadas. El nuevo ritmo se aplicará a partir de mañana.'
                            : language === 'en'
                            ? "Today's tasks are already set. The new intensity applies from tomorrow."
                            : 'Задания на сегодня уже назначены. Новый ритм применится с завтрашнего дня.'}
                    </p>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

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
