import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import {
  Settings, X, Volume2, Music, Bell, Sun, Moon,
  Languages, Type, Globe, Palette
} from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playClickSound } from '@/services/audioService';

interface QuickSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({
  open,
  onOpenChange
}) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { profileId } = useUserContext();

  const [settings, setSettings] = useState({
    voiceOver: true,
    ambientMusic: false,
    notifications: true,
    fontSize: 1, // 0 = small, 1 = default, 2 = large
  });

  useEffect(() => {
    if (open && profileId) {
      loadSettings();
    }
  }, [open, profileId]);

  const loadSettings = async () => {
    if (!profileId) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      if (data?.settings) {
        const userSettings = data.settings as any;
        setSettings({
          voiceOver: userSettings.voiceOver ?? true,
          ambientMusic: userSettings.ambientMusic ?? false,
          notifications: userSettings.notifications ?? true,
          fontSize: userSettings.fontSize ?? 1,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    playClickSound();

    setSettings(prev => ({ ...prev, [key]: value }));

    if (!profileId) {
      // Сохраняем в localStorage если нет профиля
      const localSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
      localSettings[key] = value;
      localStorage.setItem('app_settings', JSON.stringify(localSettings));
      return;
    }

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .single();

      const currentSettings = (currentProfile?.settings as Record<string, any>) || {};

      await supabase
        .from('profiles')
        .update({
          settings: { ...currentSettings, [key]: value },
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Не удалось сохранить настройку');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    playClickSound();
    setTheme(newTheme);
    updateSetting('theme', newTheme);
  };

  const handleLanguageChange = (lang: 'ru' | 'es' | 'en') => {
    playClickSound();
    setLanguage(lang);
    updateSetting('language', lang);
  };

  const languages = [
    { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
    { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  ];

  const fontSizes = [
    { value: 0, label: 'Мелкий', size: 'text-sm' },
    { value: 1, label: 'Обычный', size: 'text-base' },
    { value: 2, label: 'Крупный', size: 'text-lg' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Панель управления</h2>
                  <p className="text-xs text-slate-400">Быстрые настройки</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Theme Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Тема</span>
                </div>
                <SegmentedControl
                  options={[
                    { id: 'light', label: 'Светлая', icon: <Sun className="w-4 h-4" /> },
                    { id: 'dark', label: 'Тёмная', icon: <Moon className="w-4 h-4" /> },
                  ]}
                  value={theme || 'light'}
                  onChange={(val) => handleThemeChange(val as any)}
                  className="bg-slate-800/50 border-slate-700/50"
                />
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Язык</span>
                </div>
                <SegmentedControl
                  options={[
                    { id: 'ru', label: 'RU', icon: <span className="text-base">🇷🇺</span> },
                    { id: 'en', label: 'EN', icon: <span className="text-base">🇬🇧</span> },
                    { id: 'es', label: 'ES', icon: <span className="text-base">🇪🇸</span> },
                  ]}
                  value={language}
                  onChange={(val) => handleLanguageChange(val as any)}
                  className="bg-slate-800/50 border-slate-700/50"
                />
              </div>

              {/* Audio Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Звук</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">Озвучка</span>
                    </div>
                    <Switch
                      checked={settings.voiceOver}
                      onCheckedChange={(checked) => updateSetting('voiceOver', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Music className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">Фоновая музыка</span>
                    </div>
                    <Switch
                      checked={settings.ambientMusic}
                      onCheckedChange={(checked) => updateSetting('ambientMusic', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Уведомления</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <span className="text-sm text-slate-300">Включить уведомления</span>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => updateSetting('notifications', checked)}
                  />
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">Размер шрифта</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {fontSizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => updateSetting('fontSize', size.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${settings.fontSize === size.value
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                        }`}
                    >
                      <div className={`${size.size} font-medium mb-1 ${settings.fontSize === size.value ? 'text-indigo-300' : 'text-slate-400'}`}>
                        Aa
                      </div>
                      <span className={`text-xs ${settings.fontSize === size.value ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {size.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

