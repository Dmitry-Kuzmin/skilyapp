import React, { useState } from "react";
import { X, Volume2, TrendingUp, Music, Type, Keyboard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  fontSize: number; // 0 = small, 1 = default, 2 = large
  onFontSizeChange: (value: number) => void;
  language: 'es' | 'en';
  onLanguageChange: (value: 'es' | 'en') => void;
}

export const TestSettingsMenu = ({
  open,
  onOpenChange,
  voiceOver,
  onVoiceOverChange,
  answerPopularity,
  onAnswerPopularityChange,
  ambientMusic,
  onAmbientMusicChange,
  fontSize,
  onFontSizeChange,
  language,
  onLanguageChange,
}: TestSettingsMenuProps) => {
  const fontSizeLabels = ['Pequeño', 'Default', 'Grande'];

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-background shadow-sm hover:shadow-md hover:bg-muted/50 transition-all active:scale-95 backdrop-blur-sm border-2 border-border/50"
          title="Настройки теста"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical">
            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[280px] p-3 bg-white dark:bg-gray-900 backdrop-blur-xl shadow-lg border border-border/20 rounded-xl"
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

          {/* Ambient music */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
                <Music className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium text-sm">Музыка</span>
            </div>
            <Switch 
              checked={ambientMusic} 
              onCheckedChange={onAmbientMusicChange}
              className="data-[state=checked]:bg-green-500 scale-90"
            />
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

          {/* Keyboard shortcuts */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Клавиши</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border/30 rounded text-foreground font-mono text-[10px]">Shift</kbd>
              <span className="text-muted-foreground">+</span>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border/30 rounded text-foreground font-mono text-[10px]">?</kbd>
            </div>
          </div>

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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


