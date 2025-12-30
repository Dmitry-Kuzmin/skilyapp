import React, { useState, useEffect } from "react";
import { X, Volume2, TrendingUp, Music, Type, Keyboard, Pause, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "@/components/optimized/Motion";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TestSettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voiceOver: boolean;
  onVoiceOverChange: (value: boolean) => void;
  answerPopularity: boolean;
  onAnswerPopularityChange: (value: boolean) => void;
  ambientMusic: boolean;
  onAmbientMusicChange: (value: boolean) => void;
  selectedMusicTrack: string | null;
  onMusicTrackChange: (value: string | null) => void;
  fontSize: number; // 0 = small, 1 = default, 2 = large
  onFontSizeChange: (value: number) => void;
  language: 'es' | 'en';
  onLanguageChange: (value: 'es' | 'en') => void;
  hideLanguageSelector?: boolean; // Скрыть выбор языка (для русских тестов ПДД)
  smartVocabulary: boolean;
  onSmartVocabularyChange: (value: boolean) => void;
}

import { supabase } from "@/integrations/supabase/client";

export const TestSettingsMenu = ({
  open,
  onOpenChange,
  voiceOver,
  onVoiceOverChange,
  answerPopularity,
  onAnswerPopularityChange,
  ambientMusic,
  onAmbientMusicChange,
  selectedMusicTrack,
  onMusicTrackChange,
  fontSize,
  onFontSizeChange,
  language,
  onLanguageChange,
  hideLanguageSelector = false,
  smartVocabulary,
  onSmartVocabularyChange,
}: TestSettingsMenuProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fontSizeLabels = ['Pequeño', 'Default', 'Grande'];
  const [tracks, setTracks] = useState<string[]>([]);
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase.storage.from('ambient-music').list();
      if (data) {
        setTracks(data.map(f => f.name).filter(n => n.endsWith('.mp3')));
      }
    };
    if (open) fetchTracks();
  }, [open]);

  // Маппинг имен файлов на красивые названия
  const getTrackDisplayName = (fileName: string) => {
    if (fileName.includes('christmas')) return '🎄 Christmas Synthwave';
    if (fileName.includes('dark-synthwave')) return '🌃 Dark Synthwave';
    if (fileName.includes('inspiring')) return '✨ Inspiring Synth';
    if (fileName.includes('midnight')) return '🌙 Midnight Synth';
    if (fileName.includes('80s-retro-back')) return '🎸 80s Retro';
    if (fileName.includes('80s-3211')) return '🏎️ Fast Synth';
    if (fileName.includes('80s-4428')) return '🏙️ City Lights';
    if (fileName.includes('synthwave-retr')) return '📼 VHS Wave';
    if (fileName.includes('ambient-01')) return '☁️ Chill Air';
    if (fileName.includes('ambient-02')) return '🌊 Deep Blue';
    if (fileName.includes('ambient-03')) return '🧘 Zen Moment';
    return fileName.replace('.mp3', '');
  };

  // Предотвращаем скролл страницы при открытии меню
  useEffect(() => {
    if (open) {
      // Сохраняем текущую позицию скролла
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-scroll-y', scrollY.toString());
    } else {
      // Восстанавливаем скролл
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
      // Сбрасываем showAllTracks при закрытии меню
      setShowAllTracks(false);
    }

    return () => {
      // Очистка при размонтировании
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    };
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-background shadow-sm hover:shadow-md hover:bg-muted/50 transition-all active:scale-95 backdrop-blur-sm border-2 border-border/50"
          title="Настройки теста"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical">
            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[280px] p-3 bg-white dark:bg-gray-900 backdrop-blur-xl shadow-lg border border-border/20 rounded-xl max-h-[85vh] overflow-y-auto"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="space-y-2">
          {/* Voice over */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-sm">Озвучка</span>
            </div>
            <Switch
              checked={voiceOver}
              onCheckedChange={onVoiceOverChange}
              className="data-[state=checked]:bg-green-500 scale-90"
            />
          </div>

          {/* Answer popularity */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-medium text-sm">Статистика</span>
            </div>
            <Switch
              checked={answerPopularity}
              onCheckedChange={onAnswerPopularityChange}
              className="data-[state=checked]:bg-green-500 scale-90"
            />
          </div>

          {/* Smart Vocabulary Hints */}
          {!hideLanguageSelector && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">Подсказки слов</span>
                  <span className="text-[9px] text-muted-foreground leading-none">Smart Vocabulary</span>
                </div>
              </div>
              <Switch
                checked={smartVocabulary}
                onCheckedChange={onSmartVocabularyChange}
                className="data-[state=checked]:bg-amber-500 scale-90"
              />
            </div>
          )}

          {/* Ultra Compact Music Player */}
          <div className="px-2 py-2 space-y-2">
            {/* Main Row: Icon + Label + Mini Visualizer + Toggle */}
            <div className="flex items-center gap-2.5">
              {/* Icon with conditional glow */}
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                ambientMusic
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30"
                  : "bg-muted"
              )}>
                {ambientMusic ? (
                  <div className="flex items-end gap-[2px] h-3.5">
                    <motion.div animate={{ height: ['3px', '10px', '5px', '12px', '3px'] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-0.5 bg-white rounded-full" />
                    <motion.div animate={{ height: ['7px', '3px', '11px', '5px', '8px'] }} transition={{ duration: 0.6, repeat: Infinity }} className="w-0.5 bg-white rounded-full" />
                    <motion.div animate={{ height: ['10px', '5px', '7px', '3px', '10px'] }} transition={{ duration: 1, repeat: Infinity }} className="w-0.5 bg-white rounded-full" />
                    <motion.div animate={{ height: ['5px', '12px', '3px', '9px', '6px'] }} transition={{ duration: 0.7, repeat: Infinity }} className="w-0.5 bg-white rounded-full" />
                  </div>
                ) : (
                  <Music className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">
                  {ambientMusic
                    ? (selectedMusicTrack ? getTrackDisplayName(selectedMusicTrack) : '🔀 Shuffle Mix')
                    : 'Музыка выкл.'
                  }
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Ambient Player</div>
              </div>

              {/* Toggle */}
              <Switch
                checked={ambientMusic}
                onCheckedChange={onAmbientMusicChange}
                className="data-[state=checked]:bg-blue-600 scale-90"
              />
            </div>

            {/* Compact Track Selector (horizontal pills) */}
            {ambientMusic && tracks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* Shuffle pill */}
                  <button
                    onClick={() => onMusicTrackChange(null)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 flex items-center gap-1.5",
                      selectedMusicTrack === null
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Shuffle
                  </button>

                  {/* Track pills with emojis */}
                  {(showAllTracks ? tracks : tracks.slice(0, 6)).map(track => {
                    const isActive = selectedMusicTrack === track;
                    const displayName = getTrackDisplayName(track);
                    const emoji = displayName.split(' ')[0]; // Get emoji
                    const shortName = displayName.split(' ').slice(1).join(' ').substring(0, 12);

                    return (
                      <button
                        key={track}
                        onClick={() => onMusicTrackChange(track)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 flex items-center gap-1",
                          isActive
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="truncate max-w-[60px]">{shortName}</span>
                      </button>
                    );
                  })}

                  {/* More indicator if > 6 tracks - теперь кликабельная кнопка */}
                  {tracks.length > 6 && !showAllTracks && (
                    <button
                      onClick={() => setShowAllTracks(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
                      +{tracks.length - 6}
                    </button>
                  )}

                  {/* Кнопка "Свернуть" если показаны все треки */}
                  {showAllTracks && tracks.length > 6 && (
                    <button
                      onClick={() => setShowAllTracks(false)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
                      Свернуть
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/30 my-2" />

          {/* Font size */}
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Шрифт</span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded bg-blue-500/10">
                {fontSizeLabels[fontSize]}
              </span>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-muted-foreground">A</span>
              <Slider
                value={[fontSize]}
                onValueChange={(value) => onFontSizeChange(value[0])}
                min={0}
                max={2}
                step={1}
                className="flex-1"
              />
              <span className="text-base text-muted-foreground">A</span>
            </div>
          </div>

          {/* Keyboard shortcuts - инфо */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-sm">Клавиши</span>
                <span className="text-[9px] text-muted-foreground leading-none">1-6 = ответы, Enter = далее</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border/30 rounded text-foreground font-mono text-[10px]">Shift</kbd>
              <span className="text-muted-foreground">+</span>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border/30 rounded text-foreground font-mono text-[10px]">?</kbd>
            </div>
          </div>

          {/* Language selection - скрываем для русских тестов ПДД */}
          {!hideLanguageSelector && (
            <>
              {/* Divider */}
              <div className="h-px bg-border/30 my-2" />

              {/* Language selection */}
              <div className="px-2 pb-1">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Язык теста</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onLanguageChange('es')}
                    className={cn(
                      "px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                      language === 'es'
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    ES
                  </button>
                  <button
                    onClick={() => onLanguageChange('en')}
                    className={cn(
                      "px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
                      language === 'en'
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-muted/50 hover:bg-muted text-foreground"
                    )}
                  >
                    EN
                  </button>
                </div>
                <div className="mt-2 text-[9px] text-muted-foreground/70 px-1">
                  Русский доступен через кнопку перевода в тесте
                </div>
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


