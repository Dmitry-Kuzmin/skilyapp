/**
 * AboutTab - Вкладка "О приложении"
 */

import React from 'react';
import { ExternalLink, MessageSquare, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { triggerHaptic } from '@/lib/haptics';

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
    return (
        <div className="space-y-6">
            {/* Версия */}
            <div>
                <SectionTitle title="Приложение" />
                <div className="space-y-1">
                    <SettingRow label="Версия" description="1.0.0-beta">
                        <span className="text-xs text-slate-400">22.12.2025</span>
                    </SettingRow>
                    <SettingRow label="Окружение">
                        <span className="text-xs px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Production
                        </span>
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
                        onClick={() => window.open('/help', '_blank')}
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
        </div>
    );
};

export default AboutTab;
