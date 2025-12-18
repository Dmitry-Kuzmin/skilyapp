/**
 * Умный переключатель контекста (Страна | Категория)
 * Ultra Modern UX - одна кнопка-пилюля для выбора обоих параметров
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, getLicenseCategory, LicenseCategoryConfig } from '@/types/pdd';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextSettingsSheet } from './ContextSettingsSheet';

interface ContextSwitcherProps {
  className?: string;
}

export function ContextSwitcher({ className }: ContextSwitcherProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Определяем тему для адаптивных стилей
  const isDarkTheme = useMemo(() => (resolvedTheme ?? 'dark') !== 'light', [resolvedTheme]);
  
  // Получаем текущий выбор из localStorage
  const currentCountry = (localStorage.getItem('pdd_selected_country') || 'russia') as CountryCode;
  const currentCategory = localStorage.getItem('pdd_selected_category') || 'B';
  
  const countryData = COUNTRIES_CONFIG[currentCountry];
  const categoryData = getLicenseCategory(currentCountry, currentCategory);
  
  // Если категория не найдена, используем первую доступную
  const availableCategories = getLicenseCategoriesForCountry(currentCountry);
  const displayCategory = categoryData || availableCategories[0] || { code: 'B', name: 'B', nameFull: 'Легковая', icon: '🚗' };

  const handleApply = (country: CountryCode, category: string) => {
    localStorage.setItem('pdd_selected_country', country);
    localStorage.setItem('pdd_selected_category', category);
    
    // Если страна изменилась, редиректим на новую страну
    if (country !== currentCountry) {
      navigate(`/learn/${country}`, { replace: true });
    }
    
    setSheetOpen(false);
  };

  // Адаптивные стили под тему Dashboard
  const buttonClass = useMemo(() => {
    if (isDarkTheme) {
      return cn(
        'h-9 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full',
        'bg-gradient-to-r from-primary/25 via-primary/20 to-primary/25',
        'border border-primary/40 backdrop-blur-sm',
        'shadow-lg shadow-primary/20',
        'hover:border-primary/60 hover:shadow-xl hover:shadow-primary/30',
        'flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold',
        'transition-all duration-200 hover:scale-[1.02]',
        'text-white',
        className
      );
    } else {
      return cn(
        'h-9 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full',
        'bg-white/95 border border-primary/30',
        'shadow-[0_12px_34px_rgba(139,92,246,0.25)] backdrop-blur-sm',
        'hover:border-primary/50 hover:shadow-[0_16px_40px_rgba(139,92,246,0.35)]',
        'flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold',
        'transition-all duration-200 hover:scale-[1.02]',
        'text-slate-700',
        className
      );
    }
  }, [isDarkTheme, className]);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className={buttonClass}
      >
        <span className="text-base leading-none">{countryData.flag}</span>
        <span className="whitespace-nowrap">{countryData.name}</span>
        <span className={isDarkTheme ? 'text-primary/60' : 'text-primary/40'}>|</span>
        <span className="text-base leading-none">{displayCategory.icon}</span>
        <span className="whitespace-nowrap">{displayCategory.code}</span>
        <span className={cn('text-[10px] sm:text-[11px] whitespace-nowrap', isDarkTheme ? 'text-white/70' : 'text-slate-500')}>
          ({displayCategory.nameFull})
        </span>
        <ChevronDown className={cn('w-3 h-3 ml-0.5', isDarkTheme ? 'text-white/60' : 'text-slate-400')} />
      </button>

      <ContextSettingsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        currentCountry={currentCountry}
        currentCategory={currentCategory}
        onApply={handleApply}
      />
    </>
  );
}

