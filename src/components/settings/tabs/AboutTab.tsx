/**
 * AboutTab - Вкладка "О приложении"
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, MessageSquare, ChevronRight, BookOpen, Users, Building, Coins, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { triggerHaptic } from '@/lib/haptics';
import { useSettingsStore } from '@/store/settingsStore';

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

    const handleNavigate = (path: string) => {
        closeSettings();
        navigate(path);
    };

    return (
        <div className="space-y-6">
            {/* Ресурсы (бывшее меню футера) */}
            <div>
                <SectionTitle title="Меню" />
                <div className="space-y-1">
                    <SettingRow
                        icon={<BookOpen className="w-4 h-4 text-purple-500" />}
                        label="Блог"
                        description="Новости и статьи"
                        onClick={() => handleNavigate('/blog')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Users className="w-4 h-4 text-blue-500" />}
                        label="Партнеры"
                        description="Стать партнером"
                        onClick={() => handleNavigate('/partners')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Building className="w-4 h-4 text-emerald-500" />}
                        label="О нас"
                        description="Наша миссия"
                        onClick={() => handleNavigate('/about')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<Coins className="w-4 h-4 text-amber-500" />}
                        label="Цены"
                        description="Тарифы и планы"
                        onClick={() => handleNavigate('/pricing')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Юридическая информация */}
            <div>
                <SectionTitle title="Правовая информация" />
                <div className="space-y-1">
                    <SettingRow
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        label="Документы"
                        description="Оферта, Приватность, Возврат"
                        onClick={() => handleNavigate('/legal')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Помощь */}
            <div>
                <SectionTitle title="Помощь" />
                <div className="space-y-1">
                    <SettingRow
                        icon={<ExternalLink className="w-4 h-4 text-slate-400" />}
                        label="Центр помощи"
                        onClick={() => handleNavigate('/help')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                    <SettingRow
                        icon={<MessageSquare className="w-4 h-4 text-slate-400" />}
                        label="Связаться с поддержкой"
                        onClick={() => window.open('https://t.me/skilyapp_bot', '_blank')}
                    >
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Версия */}
            <div>
                <SectionTitle title="Приложение" />
                <div className="space-y-1">
                    <SettingRow label="Версия" description="1.0.0-beta">
                        <span className="text-xs text-slate-400">22.12.2025</span>
                    </SettingRow>
                </div>
            </div>
        </div>
    );
};

export default AboutTab;
