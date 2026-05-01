/**
 * AboutTab - Вкладка «О приложении»
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, MessageSquare, ChevronRight, BookOpen, Users, Building, Coins, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { triggerHaptic } from '@/lib/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguage } from '@/contexts/LanguageContext';

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

const SettingRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    description?: string;
    children?: React.ReactNode;
    onClick?: () => void;
}> = ({ icon, label, description, children, onClick }) => (
    <div
        onClick={() => {
            if (onClick) {
                triggerHaptic('light');
                onClick();
            }
        }}
        className={`flex items-center justify-between py-3 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
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
        {children && <div className="shrink-0 ml-3">{children}</div>}
    </div>
);

export const AboutTab: React.FC = () => {
    const navigate = useNavigate();
    const { closeSettings } = useSettingsStore();
    const { t } = useLanguage();

    // Динамическая версия из глобальной переменной (обновляется при каждом деплое)
    const appVersion = (window as unknown as Record<string, string>)['APP_VERSION'] ?? '—';

    const handleNavigate = (path: string) => {
        closeSettings();
        navigate(path);
    };

    return (
        <div className="space-y-6">
            {/* Ресурсы */}
            <div>
                <SectionTitle title={t('unifiedSettings.aboutKeys.menu')} />
                <div className="space-y-1">
                    <SettingRow
                        icon={<BookOpen className="w-4 h-4 text-purple-500" />}
                        label={t('unifiedSettings.aboutKeys.blog')}
                        description={t('unifiedSettings.aboutKeys.blogDesc')}
                        onClick={() => handleNavigate('/blog')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Users className="w-4 h-4 text-blue-500" />}
                        label={t('unifiedSettings.aboutKeys.partners')}
                        description={t('unifiedSettings.aboutKeys.partnersDesc')}
                        onClick={() => handleNavigate('/partners')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Building className="w-4 h-4 text-emerald-500" />}
                        label={t('unifiedSettings.aboutKeys.aboutProject')}
                        description={t('unifiedSettings.aboutKeys.aboutProjectDesc')}
                        onClick={() => handleNavigate('/about')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Coins className="w-4 h-4 text-amber-500" />}
                        label={t('unifiedSettings.aboutKeys.pricing')}
                        description={t('unifiedSettings.aboutKeys.pricingDesc')}
                        onClick={() => handleNavigate('/pricing')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Юридическая информация */}
            <div>
                <SectionTitle title={t('unifiedSettings.aboutKeys.legal')} />
                <div className="space-y-1">
                    <SettingRow
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.aboutKeys.privacy')}
                        description={t('unifiedSettings.aboutKeys.privacyDesc')}
                        onClick={() => handleNavigate('/legal/privacy')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.aboutKeys.terms')}
                        description={t('unifiedSettings.aboutKeys.termsDesc')}
                        onClick={() => handleNavigate('/legal/terms')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.aboutKeys.cookies')}
                        description={t('unifiedSettings.aboutKeys.cookiesDesc')}
                        onClick={() => handleNavigate('/legal/cookies')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Помощь */}
            <div>
                <SectionTitle title={t('unifiedSettings.aboutKeys.help')} />
                <div className="space-y-1">
                    <SettingRow
                        icon={<ExternalLink className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.aboutKeys.helpCenter')}
                        onClick={() => handleNavigate('/help')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<MessageSquare className="w-4 h-4 text-slate-400" />}
                        label={t('unifiedSettings.aboutKeys.contactSupport')}
                        onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Версия и обновления */}
            <div>
                <SectionTitle title={t('unifiedSettings.aboutKeys.app')} />
                <div className="space-y-1">
                    {/* Что нового */}
                    <SettingRow
                        icon={
                            <span className="text-base" role="img" aria-label="spark">✨</span>
                        }
                        label={t('unifiedSettings.aboutKeys.whatsNew')}
                        description={t('unifiedSettings.aboutKeys.whatsNewDesc')}
                        onClick={() => handleNavigate('/help/changelog')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                {t('unifiedSettings.aboutKeys.newBadge')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                    </SettingRow>

                    {/* Текущая версия */}
                    <SettingRow label={t('unifiedSettings.aboutKeys.version')} description={appVersion || '1.0.0-beta'}>
                        <span className="text-xs text-slate-400">{t('unifiedSettings.aboutKeys.versionCurrent')}</span>
                    </SettingRow>
                </div>
            </div>
        </div>
    );
};

export default AboutTab;
