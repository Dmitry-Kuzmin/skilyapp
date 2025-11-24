import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useCockpitSettings } from '@/hooks/useCockpitSettings';
import { Languages, Palette, Volume2, Sparkles, Gauge, Shield, Bell } from 'lucide-react';

const Section: React.FC<{ title: string; icon: React.ReactNode; description?: string }> = ({
  title,
  icon,
  description,
  children,
}) => (
  <div className="rounded-2xl border border-white/5 bg-white/2 p-4 backdrop-blur-sm relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-40 pointer-events-none" />
    <div className="relative z-10 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {description && <p className="text-[11px] text-slate-300/80">{description}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  </div>
);

const PillButton: React.FC<{
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
      active
        ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
        : 'border-white/10 text-slate-300 hover:border-white/30'
    }`}
  >
    {label}
  </button>
);

export const CockpitSettingsPanel: React.FC = () => {
  const { settings, controls, updateSetting } = useCockpitSettings();

  return (
    <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/30 border border-slate-800/60 p-6 shadow-[0_30px_80px_rgba(8,15,40,0.55)] overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Cockpit</p>
          <h3 className="text-xl font-semibold text-white mt-1">Настройки пилота</h3>
        </div>
        <div className="px-3 py-1 rounded-full border border-white/10 text-[11px] text-white/80 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-300" />
          Custom
        </div>
      </div>

      <div className="grid gap-4">
        <Section title="Язык" icon={<Languages className="w-4 h-4 text-cyan-300" />} description="Интерфейс и обучение">
          <div className="flex flex-wrap gap-2">
            {controls.languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => updateSetting('language', lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${
                  settings.language === lang.code
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-xs font-semibold tracking-wide">{lang.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Тема" icon={<Palette className="w-4 h-4 text-indigo-300" />} description="Внешний вид тарелки">
          <div className="grid grid-cols-3 gap-2">
            {controls.themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => updateSetting('theme', themeOption.value)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  settings.theme === themeOption.value
                    ? 'border-indigo-400/60 bg-indigo-400/10 text-indigo-100'
                    : 'border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <div className="text-xl mb-1">{themeOption.icon}</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase">{themeOption.label}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Аудио и эффекты"
          icon={<Volume2 className="w-4 h-4 text-emerald-300" />}
          description="Профили звука и WOW-анимации"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/2 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Мастер-звук</p>
                <p className="text-[11px] text-slate-300/80">Включает все аудиосигналы</p>
              </div>
              <Switch checked={settings.masterSound} onCheckedChange={(checked) => updateSetting('masterSound', checked)} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-2">Sound Profile</p>
              <div className="flex gap-2 flex-wrap">
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-2">Celebration FX</p>
              <div className="flex gap-2 flex-wrap">
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

        <Section title="HUD & Alerts" icon={<Sparkles className="w-4 h-4 text-amber-300" />} description="Яркость и подсказки">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white">Яркость панели</p>
                <span className="text-xs text-slate-300">{Math.round(settings.hudBrightness * 100)}%</span>
              </div>
              <Slider
                value={[settings.hudBrightness * 100]}
                onValueChange={([value]) => updateSetting('hudBrightness', Math.max(0, Math.min(1, value / 100)))}
                className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-300"
                max={100}
                min={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/2 px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Shield className="w-3.5 h-3.5 text-cyan-300" />
                    ADAS подсказки
                  </div>
                  <Switch checked={settings.adasHints} onCheckedChange={(checked) => updateSetting('adasHints', checked)} />
                </div>
                <p className="text-[11px] text-slate-300/80">
                  Дополнительные маркеры удержания полосы и темпа
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/2 px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Bell className="w-3.5 h-3.5 text-rose-300" />
                    Duel alerts
                  </div>
                  <Switch checked={settings.duelAlerts} onCheckedChange={(checked) => updateSetting('duelAlerts', checked)} />
                </div>
                <p className="text-[11px] text-slate-300/80">Вибрация и вспышки для дуэлей</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/2 px-3 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Haptic feedback</p>
                <p className="text-[11px] text-slate-300/80">Лёгкие вибро-анимации интерфейса</p>
              </div>
              <Switch checked={settings.hapticFeedback} onCheckedChange={(checked) => updateSetting('hapticFeedback', checked)} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

