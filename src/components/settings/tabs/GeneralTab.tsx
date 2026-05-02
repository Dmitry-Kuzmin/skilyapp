/**
 * GeneralTab - Вкладка "Основные"
 * 
 * Язык, тема, производительность
 */

import React from 'react';
import { Sun, Moon, Smartphone, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type ThemeMode, type LanguageCode } from '@/store/settingsStore';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { CyberSwitch } from '../ui/CyberSwitch';
import { TonPaymentWidget } from '@/components/monetization/LazyTonPaymentWidget';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isBefore, addDays } from 'date-fns';
import { ru, es, enGB } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';

const SPAIN_CITIES = [
    "ALICANTE", "MADRID", "BARCELONA", "VALENCIA", "SEVILLA", "ZARAGOZA", "MÁLAGA", "MURCIA", "PALMA", "LAS PALMAS", "BILBAO",
    "CÓRDOBA", "VALLADOLID", "VIGO", "GIJÓN", "VITORIA", "A CORUÑA", "GRANADA", "ELCHE",
    "OVIEDO", "BADALONA", "TERRASSA", "CARTAGENA", "JEREZ", "SABADELL", "MÓSTOLES", "SANTA CRUZ", "PAMPLONA", "ALMERÍA",
    "CASTELLÓN", "SANTANDER", "BURGOS", "ALBACETE", "LOGROÑO", "BADAJOZ", "SALAMANCA", "HUELVA", "LLEIDA", "TARRAGONA"
].sort();

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
    const { profileId } = useUserContext();
    const { 
        examDate, setExamDate, 
        examCity, setExamCity,
    } = useSettingsStore();


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
            dark: t('unifiedSettings.themeToast.dark'),
            light: t('unifiedSettings.themeToast.light'),
            system: t('unifiedSettings.themeToast.system')
        };
        toast.success(labels[newTheme], { duration: 1500 });
    };

    const handleLanguageChange = (lang: LanguageCode) => {
        triggerHaptic('medium');
        setLanguage(lang);
        setContextLanguage(lang);
        const labels = { ru: 'Русский', en: 'English', es: 'Español' };
        toast.success(`${t('language')}: ${labels[lang]}`, { duration: 1500 });
    };

    const handlePerformanceToggle = () => {
        triggerHaptic('medium');
        togglePerformanceMode();
        toast.success(
            performanceMode
                ? t('unifiedSettings.performanceToast.off')
                : t('unifiedSettings.performanceToast.on'),
            { duration: 1500 }
        );
    };

    const handleExamDateChange = async (date: Date | undefined) => {
        triggerHaptic('medium');
        const newDate = date ? format(date, 'yyyy-MM-dd') : null;
        setExamDate(newDate);

        if (profileId) {
            try {
                const { data: currentProfile } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('id', profileId)
                    .single();

                const currentSettings = ((currentProfile as any)?.settings as Record<string, any>) || {};
                
                await (supabase as any)
                    .from('profiles')
                    .update({ 
                        settings: { 
                            ...currentSettings, 
                            exam_date: newDate 
                        } 
                    })
                    .eq('id', profileId);
                
                toast.success(t('toasts.settingsSaved'), { duration: 1500 });
            } catch (err) {
                console.error('Failed to sync exam date:', err);
            }
        }
    };
    
    const handleExamCityChange = async (city: string) => {
        triggerHaptic('light');
        setExamCity(city);

        if (profileId) {
            try {
                const { data: currentProfile } = await supabase
                    .from('profiles')
                    .select('settings')
                    .eq('id', profileId)
                    .single();

                const currentSettings = ((currentProfile as any)?.settings as Record<string, any>) || {};
                
                await (supabase as any)
                    .from('profiles')
                    .update({ 
                        settings: { 
                            ...currentSettings, 
                            exam_city: city 
                        } 
                    })
                    .eq('id', profileId);
                
                toast.success(t('toasts.settingsSaved'), { duration: 1500 });
            } catch (err) {
                console.error('Failed to sync exam city:', err);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Язык */}
            <div>
                <SectionTitle title={t('unifiedSettings.language')} />
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
                <SectionTitle title={t('unifiedSettings.appearance')} />
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'light', label: t('unifiedSettings.themeLight'), icon: <Sun className="w-5 h-5" /> },
                        { id: 'dark', label: t('unifiedSettings.themeDark'), icon: <Moon className="w-5 h-5" /> },
                        { id: 'system', label: t('unifiedSettings.themeSystem'), icon: <Smartphone className="w-5 h-5" /> },
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
                <SectionTitle title={t('unifiedSettings.performance')} />
                <SettingRow
                    icon={<Zap className={performanceMode ? 'w-4 h-4 text-amber-500' : 'w-4 h-4 text-slate-400'} />}
                    label={t('unifiedSettings.powerSaver')}
                    description={t('unifiedSettings.powerSaverDesc')}
                >
                    <CyberSwitch
                        checked={performanceMode}
                        onCheckedChange={handlePerformanceToggle}
                    />
                </SettingRow>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Дата экзамена */}
            <div id="exam-date-section">
                <SectionTitle title={t('unifiedSettings.examDate')} />
                <SettingRow
                    icon={<CalendarIcon className="w-4 h-4 text-indigo-500" />}
                    label={t('unifiedSettings.examDate')}
                    description={t('unifiedSettings.examDateDesc')}
                >
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal rounded-xl border-2 transition-all",
                                    "hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                    !examDate && "text-muted-foreground",
                                    examDate && "border-indigo-500/30 text-slate-900 dark:text-slate-100"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                                {examDate ? (
                                    format(new Date(examDate), "PPP", {
                                        locale: contextLanguage === 'ru' ? ru : contextLanguage === 'es' ? es : enGB
                                    })
                                ) : (
                                    <span>{t('unifiedSettings.examDate')}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl" align="end">
                            <Calendar
                                mode="single"
                                selected={examDate ? new Date(examDate) : undefined}
                                onSelect={handleExamDateChange}
                                disabled={(date) => isBefore(date, addDays(new Date(), 7))}
                                initialFocus
                                locale={contextLanguage === 'ru' ? ru : contextLanguage === 'es' ? es : enGB}
                            />
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                                <span className="text-[10px] text-slate-500 font-medium italic">
                                    {contextLanguage === 'ru' ? 'Рекомендуем брать +30 дней форы' : 
                                     contextLanguage === 'es' ? 'Recomendamos +30 días de margen' : 
                                     'We recommend +30 days margin'}
                                </span>
                            </div>
                        </PopoverContent>
                    </Popover>
                </SettingRow>
                <p className="text-[10px] text-slate-400 mt-[-4px] ml-12 font-medium opacity-80">
                    {t('unifiedSettings.examDateDesc')}
                </p>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Локация сдачи */}
            <div id="exam-city-section">
                <SectionTitle title={t('unifiedSettings.examCity')} />
                <SettingRow
                    icon={<MapPin className="w-4 h-4 text-emerald-500" />}
                    label={t('unifiedSettings.examCity')}
                    description={t('unifiedSettings.examCityDesc')}
                >
                    <Select value={examCity || ""} onValueChange={handleExamCityChange}>
                        <SelectTrigger className={cn(
                            "w-[180px] rounded-xl border-2 transition-all",
                            "hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                            !examCity && "text-muted-foreground",
                            examCity && "border-emerald-500/30 text-slate-900 dark:text-slate-100"
                        )}>
                            <SelectValue placeholder={t('unifiedSettings.examCity')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-h-[300px]">
                            {SPAIN_CITIES.map((city) => (
                                <SelectItem key={city} value={city} className="rounded-lg">
                                    {city}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SettingRow>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />


            {/* TON_DISABLED: TON Smart Pay section hidden */}
        </div>
    );
};

export default GeneralTab;
