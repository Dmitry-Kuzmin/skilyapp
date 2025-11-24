import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useCockpitSettings } from '@/hooks/useCockpitSettings';
import { Languages, Palette, Volume2, Sparkles, Gauge, Shield, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';

const Section: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  description?: string;
  isDarkTheme?: boolean;
}> = ({
  title,
  icon,
  description,
  children,
  isDarkTheme = true,
}) => {
  const sectionBgClass = isDarkTheme
    ? 'border-white/5 bg-white/2'
    : 'border-slate-200/60 bg-white/80';
  const sectionOverlayClass = isDarkTheme
    ? 'from-white/5'
    : 'from-slate-100/40';
  const iconBgClass = isDarkTheme
    ? 'bg-white/5 border-white/10'
    : 'bg-slate-100/80 border-slate-200/60';
  const titleClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const descClass = isDarkTheme ? 'text-slate-300/80' : 'text-slate-600/80';

  return (
    <div className={`rounded-xl border ${sectionBgClass} p-3 backdrop-blur-sm relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${sectionOverlayClass} to-transparent opacity-40 pointer-events-none`} />
      <div className="relative z-10 space-y-3">
      <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${titleClass}`}>{title}</p>
            {description && <p className={`text-[10px] ${descClass} leading-tight`}>{description}</p>}
          </div>
        </div>
      <div>{children}</div>
    </div>
  </div>
);
};

const PillButton: React.FC<{
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-all ${
      active
        ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
        : 'border-white/10 text-slate-300 hover:border-white/30'
    }`}
  >
    {label}
  </button>
);

export const CockpitSettingsPanel: React.FC = () => {
  const { settings, controls, updateSetting } = useCockpitSettings();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  const containerBgClass = isDarkTheme
    ? 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900/90'
    : 'bg-gradient-to-br from-slate-50 via-white to-slate-50/90';
  const textPrimaryClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const noiseOpacity = isDarkTheme ? 'opacity-20' : 'opacity-10';

  return (
    <div className={`relative w-full h-full ${containerBgClass} overflow-hidden`}>
      <div className={`absolute inset-0 ${noiseOpacity}`} style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      <div className={`absolute inset-0 bg-gradient-to-br ${isDarkTheme ? 'from-emerald-500/10 via-transparent to-blue-500/10' : 'from-emerald-500/5 via-transparent to-blue-500/5'} pointer-events-none`} />

      <div className="relative z-10 p-4 md:p-5 w-full flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
            <p className={`text-[9px] uppercase tracking-[0.3em] ${textSecondaryClass}`}>Cockpit</p>
            <h3 className={`text-lg md:text-xl font-semibold ${textPrimaryClass} mt-0.5`}>Настройки пилота</h3>
        </div>
          <div className={`px-2.5 py-1 rounded-full border ${isDarkTheme ? 'border-white/10 text-white/80' : 'border-slate-200/60 text-slate-700'} text-[10px] flex items-center gap-1.5`}>
            <Gauge className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'}`} />
          Custom
        </div>
      </div>

        <div className="grid gap-3 overflow-y-auto">
        <Section title="Язык" icon={<Languages className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-cyan-300' : 'text-cyan-600'}`} />} description="Интерфейс и обучение" isDarkTheme={isDarkTheme}>
          <div className="flex flex-wrap gap-1.5">
            {controls.languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => updateSetting('language', lang.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
                  settings.language === lang.code
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="text-[11px] font-semibold tracking-wide">{lang.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Тема" icon={<Palette className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'}`} />} description="Внешний вид тарелки" isDarkTheme={isDarkTheme}>
          <div className="grid grid-cols-3 gap-1.5">
            {controls.themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => updateSetting('theme', themeOption.value)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  settings.theme === themeOption.value
                    ? 'border-indigo-400/60 bg-indigo-400/10 text-indigo-100'
                    : 'border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <div className="text-lg mb-0.5">{themeOption.icon}</div>
                <div className="text-[10px] font-semibold tracking-wider uppercase leading-tight">{themeOption.label}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Аудио и эффекты"
          icon={<Volume2 className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'}`} />}
          description="Профили звука и WOW-анимации"
          isDarkTheme={isDarkTheme}
        >
          <div className="space-y-3">
            <div className={`flex items-center justify-between rounded-xl border ${isDarkTheme ? 'border-white/10 bg-white/2' : 'border-slate-200/60 bg-white/80'} px-3 py-2`}>
              <div>
                <p className={`text-xs font-semibold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Мастер-звук</p>
                <p className={`text-[10px] ${isDarkTheme ? 'text-slate-300/80' : 'text-slate-600/80'}`}>Включает все аудиосигналы</p>
              </div>
              <Switch checked={settings.masterSound} onCheckedChange={(checked) => updateSetting('masterSound', checked)} />
            </div>

            <div>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Sound Profile</p>
              <div className="flex gap-1.5 flex-wrap">
                {controls.soundProfiles.map((profile) => (
                  <PillButton
                    key={profile.value}
                    label={profile.label}
                    active={settings.soundProfile === profile.value}
                    onClick={() => updateSetting('soundProfile', profile.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Celebration FX</p>
              <div className="flex gap-1.5 flex-wrap">
                {controls.animationModes.map((mode) => (
                  <PillButton
                    key={mode.value}
                    label={mode.label}
                    active={settings.animationMode === mode.value}
                    onClick={() => updateSetting('animationMode', mode.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="HUD & Alerts" icon={<Sparkles className={`w-3.5 h-3.5 ${isDarkTheme ? 'text-amber-300' : 'text-amber-600'}`} />} description="Яркость и подсказки" isDarkTheme={isDarkTheme}>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-xs ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Яркость панели</p>
                <span className={`text-[11px] ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>{Math.round(settings.hudBrightness * 100)}%</span>
              </div>
              <Slider
                value={[settings.hudBrightness * 100]}
                onValueChange={([value]) => updateSetting('hudBrightness', Math.max(0, Math.min(1, value / 100)))}
                className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-300"
                max={100}
                min={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border ${isDarkTheme ? 'border-white/10 bg-white/2' : 'border-slate-200/60 bg-white/80'} px-2.5 py-2`}>
                <div className="flex items-center justify-between mb-1">
                  <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                    <Shield className={`w-3 h-3 ${isDarkTheme ? 'text-cyan-300' : 'text-cyan-600'}`} />
                    ADAS подсказки
                  </div>
                  <Switch checked={settings.adasHints} onCheckedChange={(checked) => updateSetting('adasHints', checked)} />
                </div>
                <p className={`text-[10px] ${isDarkTheme ? 'text-slate-300/80' : 'text-slate-600/80'} leading-tight`}>
                  Дополнительные маркеры удержания полосы и темпа
                </p>
              </div>

              <div className={`rounded-xl border ${isDarkTheme ? 'border-white/10 bg-white/2' : 'border-slate-200/60 bg-white/80'} px-2.5 py-2`}>
                <div className="flex items-center justify-between mb-1">
                  <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                    <Bell className={`w-3 h-3 ${isDarkTheme ? 'text-rose-300' : 'text-rose-600'}`} />
                    Duel alerts
                  </div>
                  <Switch checked={settings.duelAlerts} onCheckedChange={(checked) => updateSetting('duelAlerts', checked)} />
                </div>
                <p className={`text-[10px] ${isDarkTheme ? 'text-slate-300/80' : 'text-slate-600/80'} leading-tight`}>Вибрация и вспышки для дуэлей</p>
              </div>
            </div>

            <div className={`rounded-xl border ${isDarkTheme ? 'border-white/10 bg-white/2' : 'border-slate-200/60 bg-white/80'} px-2.5 py-2 flex items-center justify-between`}>
              <div>
                <p className={`text-xs ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Haptic feedback</p>
                <p className={`text-[10px] ${isDarkTheme ? 'text-slate-300/80' : 'text-slate-600/80'}`}>Лёгкие вибро-анимации интерфейса</p>
              </div>
              <Switch checked={settings.hapticFeedback} onCheckedChange={(checked) => updateSetting('hapticFeedback', checked)} />
            </div>
          </div>
        </Section>
        </div>
      </div>
    </div>
  );
};

