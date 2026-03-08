/**
 * GeneralTab - Вкладка "Основные"
 * 
 * Язык, тема, производительность
 */

import React from 'react';
import { Sun, Moon, Smartphone, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type ThemeMode, type LanguageCode } from '@/store/settingsStore';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { CyberSwitch } from '../ui/CyberSwitch';
import { TonConnectButton } from '@tonconnect/ui-react';

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

export const GeneralTab: React.FC = () => {
    const {
        language,
        theme,
        performanceMode,
        setLanguage,
        setTheme,
        togglePerformanceMode,
    } = useSettingsStore();

    const { setTheme: setNextTheme, resolvedTheme, theme: nextTheme } = useTheme();
    const { t, setLanguage: setContextLanguage, language: contextLanguage } = useLanguage();

    // Синхронизация при монтировании (если настройки изменились в другом месте)
    React.useEffect(() => {
        // Синхронизация темы
        const currentTheme = (nextTheme as ThemeMode) || 'system';
        if (currentTheme !== theme) {
            setTheme(currentTheme);
        }

        // Синхронизация языка
        if (contextLanguage !== language) {
            setLanguage(contextLanguage as LanguageCode);
        }
    }, [nextTheme, contextLanguage, setTheme, setLanguage, theme, language]);

    const handleThemeChange = (newTheme: ThemeMode) => {
        triggerHaptic('medium');
        setTheme(newTheme);
        setNextTheme(newTheme);
        const labels = {
            dark: t('settings.themeToast.dark'),
            light: t('settings.themeToast.light'),
            system: t('settings.themeToast.system')
        };
        toast.success(labels[newTheme], { duration: 1500 });
    };

    const handleLanguageChange = (lang: LanguageCode) => {
        triggerHaptic('medium');
        setLanguage(lang);
        setContextLanguage(lang);
        const labels = { ru: 'Русский', en: 'English', es: 'Español' };
        toast.success(`${t('settings.language')}: ${labels[lang]}`, { duration: 1500 });
    };

    const handlePerformanceToggle = () => {
        triggerHaptic('medium');
        togglePerformanceMode();
        toast.success(
            performanceMode
                ? t('settings.performanceToast.off')
                : t('settings.performanceToast.on'),
            { duration: 1500 }
        );
    };

    return (
        <div className="space-y-6">
            {/* Язык */}
            <div>
                <SectionTitle title={t('settings.language')} />
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'ru', label: 'Русский', flag: '🇷🇺' },
                        { id: 'en', label: 'English', flag: '🇬🇧' },
                        { id: 'es', label: 'Español', flag: '🇪🇸' },
                    ].map((lang) => (
                        <button
                            key={lang.id}
                            onClick={() => handleLanguageChange(lang.id as LanguageCode)}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                                "hover:scale-[1.02] active:scale-[0.98]",
                                language === lang.id
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50"
                            )}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <span className={cn(
                                "text-xs font-medium",
                                language === lang.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
                            )}>
                                {lang.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Тема */}
            <div>
                <SectionTitle title={t('settings.appearance')} />
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'light', label: t('settings.themeLight'), icon: <Sun className="w-5 h-5" /> },
                        { id: 'dark', label: t('settings.themeDark'), icon: <Moon className="w-5 h-5" /> },
                        { id: 'system', label: t('settings.themeSystem'), icon: <Smartphone className="w-5 h-5" /> },
                    ].map((t_mode) => (
                        <button
                            key={t_mode.id}
                            onClick={() => handleThemeChange(t_mode.id as ThemeMode)}
                            className={cn(
                                "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                                "hover:scale-[1.02] active:scale-[0.98]",
                                theme === t_mode.id
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50"
                            )}
                        >
                            <span className={cn(
                                theme === t_mode.id ? "text-indigo-500" : "text-slate-400"
                            )}>
                                {t_mode.icon}
                            </span>
                            <span className={cn(
                                "text-xs font-medium",
                                theme === t_mode.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
                            )}>
                                {t_mode.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Производительность */}
            <div>
                <SectionTitle title={t('settings.performance')} />
                <SettingRow
                    icon={<Zap className={performanceMode ? 'w-4 h-4 text-amber-500' : 'w-4 h-4 text-slate-400'} />}
                    label={t('settings.powerSaver')}
                    description={t('settings.powerSaverDesc')}
                >
                    <CyberSwitch
                        checked={performanceMode}
                        onCheckedChange={handlePerformanceToggle}
                    />
                </SettingRow>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* TON integration */}
            <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <img src="https://ton.org/download/ton_symbol.svg" className="w-5 h-5" alt="TON" />
                    </div>
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest tracking-tighter">
                        TON Ecosystem
                    </h3>
                </div>
                <div className="bg-blue-500/5 rounded-2xl border border-blue-500/10 overflow-hidden">
                    <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                <Zap className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Smart Payments</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Подключи кошелек для мгновенных покупок подсказок и Premium в 1 клик через TON.</p>
                            </div>
                        </div>
                        <div className="ton-connect-wrapper w-full flex justify-center">
                            <TonConnectButton />
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
              .ton-connect-wrapper button {
                width: 100% !important;
                min-width: 200px !important;
                border-radius: 12px !important;
                background-color: #0088cc !important;
                color: white !important;
                font-weight: 600 !important;
                justify-content: center !important;
              }
            `}</style>
        </div>
    );
};

export default GeneralTab;
