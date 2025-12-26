/**
 * UnifiedSettingsDrawer - Единый центр настроек
 * 
 * - Desktop: Dialog с sidebar слева
 * - Mobile: Vaul.Drawer
 * - Тактильная отдача
 */

import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Settings, User, Shield, Gauge, Bell, Sparkles, Database, Info } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// === TABS ===
import {
    AccountTab,
    SecurityTab,
    GeneralTab,
    CockpitTab,
    NotificationsTab,
    SubscriptionTab,
    DataTab,
    AboutTab,
} from './tabs';

// === TYPES ===
type SettingsSection = 'account' | 'security' | 'general' | 'cockpit' | 'notifications' | 'subscription' | 'data' | 'about';

interface NavItem {
    id: SettingsSection;
    label: string;
    icon: React.ReactNode;
    description?: string;
}

// === NAVIGATION ===
const navItems: NavItem[] = [
    { id: 'account', label: 'Аккаунт', icon: <User className="w-4 h-4" />, description: 'Профиль и связи' },
    { id: 'security', label: 'Настройки', icon: <Shield className="w-4 h-4" />, description: 'Passkeys и вход' },
    { id: 'general', label: 'Основные', icon: <Settings className="w-4 h-4" />, description: 'Язык и тема' },
    { id: 'cockpit', label: 'Кокпит', icon: <Gauge className="w-4 h-4" />, description: 'Звук и вибрация' },
    { id: 'notifications', label: 'Уведомления', icon: <Bell className="w-4 h-4" />, description: 'Push-уведомления' },
    { id: 'subscription', label: 'Подписка', icon: <Sparkles className="w-4 h-4" />, description: 'Premium' },
    { id: 'data', label: 'Данные', icon: <Database className="w-4 h-4" />, description: 'Кэш и хранилище' },
    { id: 'about', label: 'О приложении', icon: <Info className="w-4 h-4" />, description: 'Версия и помощь' },
];

// === MAIN COMPONENT ===
export const UnifiedSettingsDrawer: React.FC = () => {
    const isMobile = useIsMobile();
    const { isOpen, closeSettings, userLevel, userTitle, activeTab, setActiveTab } = useSettingsStore();

    const handleSectionChange = (section: SettingsSection) => {
        triggerHaptic('light');
        setActiveTab(section);
    };

    const handleClose = () => {
        triggerHaptic('light');
        closeSettings();
    };

    // === RENDER CONTENT ===
    const renderContent = () => {
        switch (activeTab) {
            case 'account': return <AccountTab />;
            case 'security': return <SecurityTab />;
            case 'general': return <GeneralTab />;
            case 'cockpit': return <CockpitTab />;
            case 'notifications': return <NotificationsTab />;
            case 'subscription': return <SubscriptionTab />;
            case 'data': return <DataTab />;
            case 'about': return <AboutTab />;
            default: return null;
        }
    };

    // === SIDEBAR (Desktop) ===
    const Sidebar = () => (
        <div className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">Настройки</span>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group select-none",
                            activeTab === item.id
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                        )}
                    >
                        <span className={cn(
                            "transition-colors",
                            activeTab === item.id ? "text-indigo-500" : "text-slate-400"
                        )}>
                            {item.icon}
                        </span>
                        <span className="text-sm font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );

    // === MOBILE NAV (Horizontal) ===
    const MobileNav = () => (
        <div className="flex overflow-x-auto px-4 py-2 gap-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all shrink-0 select-none",
                        activeTab === item.id
                            ? "bg-indigo-500 text-white"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                >
                    {item.icon}
                </button>
            ))}
        </div>
    );

    // === MOBILE CONTENT ===
    const MobileContent = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white select-none">Настройки</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Уровень {userLevel} • {userTitle}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <MobileNav />

            <ScrollArea className="flex-1">
                <div className="p-4">
                    {renderContent()}
                </div>
            </ScrollArea>
        </div>
    );

    // === DESKTOP CONTENT ===
    const DesktopContent = () => (
        <div className="flex h-[600px] max-h-[80vh]">
            <Sidebar />
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {navItems.find(n => n.id === activeTab)?.label}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {navItems.find(n => n.id === activeTab)?.description}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {renderContent()}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

    if (!isOpen) return null;

    // === RENDER ===
    if (isMobile) {
        return (
            <Drawer
                open={isOpen}
                onOpenChange={(open) => !open && closeSettings()}
                shouldScaleBackground={false}
                dismissible={true}
                dismissibleThreshold={0.2} // Легкое закрытие - 20% свайпа достаточно
            >
                <DrawerContent className="h-[92dvh] max-h-[92dvh]">
                    <MobileContent />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
            <DialogContent
                className="max-w-3xl p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900"
                hideCloseButton
            >
                <DesktopContent />
            </DialogContent>
        </Dialog>
    );
};

export default UnifiedSettingsDrawer;
