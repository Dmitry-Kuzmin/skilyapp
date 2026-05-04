/**
 * Умный переключатель контекста (Страна | Категория)
 * Ultra Modern UX - одна кнопка-пилюля для выбора обоих параметров
 */

import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CountryCode, getLicenseCategoriesForCountry, getLicenseCategory, LicenseCategory } from '@/types/pdd';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextSettingsSheet } from './ContextSettingsSheet';
import { usePDDContext } from '@/contexts/PDDContext';
import { getCountryFlagUrl } from '@/lib/countryFlags';

interface ContextSwitcherProps {
  className?: string;
  embedded?: boolean;
}

export function ContextSwitcher({ className, embedded = false }: ContextSwitcherProps) {
  const { resolvedTheme } = useTheme();
  const { selectedCountry, selectedCategory, setSelectedCountry, setSelectedCategory } = usePDDContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Определяем тему для адаптивных стилей
  const isDarkTheme = useMemo(() => (resolvedTheme ?? 'dark') !== 'light', [resolvedTheme]);
  
  // Используем значения из контекста
  const currentCountry = selectedCountry;
  const currentCategory = selectedCategory;
  
  const categoryData = getLicenseCategory(currentCountry, currentCategory);
  
  // Если категория не найдена, используем первую доступную
  const availableCategories = getLicenseCategoriesForCountry(currentCountry);
  const displayCategory = categoryData || availableCategories[0] || { code: 'B', name: 'B', nameFull: 'Легковая', icon: '🚗' };

  // Короткие коды стран для отображения
  const getCountryCode = (country: CountryCode): string => {
    const codes: Record<CountryCode, string> = {
      russia: 'RU',
      spain: 'ES',
      ukraine: 'UA',
      belarus: 'BY',
    };
    return codes[country] || country.toUpperCase().slice(0, 2);
  };

  const countryCode = getCountryCode(currentCountry);
  const countryFlagUrl = getCountryFlagUrl(currentCountry);

  const handleApply = (country: CountryCode, category: LicenseCategory) => {
    // Обновляем контекст (он сам сохранит в localStorage)
    setSelectedCountry(country);
    setSelectedCategory(category);
    
    // НЕ делаем редирект - остаёмся на текущей странице
    // Dashboard и другие компоненты автоматически обновятся через usePDDContext
    setSheetOpen(false);
  };

  // Премиальные стили в стиле Linear/Vercel
  const buttonClass = useMemo(() => {
    if (isDarkTheme) {
      return cn(
        embedded
          ? 'h-8 px-2 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
          : 'h-10 px-3 sm:px-4 py-2 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50',
        'flex items-center gap-2 text-xs font-medium',
        'transition-all duration-200',
        'text-zinc-200',
        'backdrop-blur-sm',
        className
      );
    } else {
      return cn(
        embedded
          ? 'h-8 px-2 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300'
          : 'h-10 px-3 sm:px-4 py-2 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
        'flex items-center gap-2 text-xs font-medium',
        'transition-all duration-200',
        'text-zinc-700',
        'shadow-sm',
        className
      );
    }
  }, [embedded, isDarkTheme, className]);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className={buttonClass}
        aria-label={`Change test context: ${countryCode}, category ${displayCategory.code}`}
      >
        {countryFlagUrl ? (
          <img
            src={countryFlagUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
            aria-hidden="true"
          />
        ) : (
          <span
            className={cn(
              'h-5 w-5 rounded-full',
              isDarkTheme ? 'bg-zinc-700' : 'bg-zinc-200'
            )}
            aria-hidden="true"
          />
        )}
        <span className="whitespace-nowrap text-xs font-bold uppercase tracking-tight">
          {countryCode}
        </span>
        <span className={isDarkTheme ? 'text-white/20' : 'text-zinc-400'}>•</span>
        <span
          className={cn(
            'inline-flex h-5 min-w-[1.7rem] items-center justify-center rounded-lg px-1.5 text-[10px] font-bold leading-none',
            isDarkTheme
              ? 'bg-white/[0.1] text-zinc-200'
              : 'bg-zinc-100 text-zinc-700'
          )}
          aria-hidden="true"
        >
          {displayCategory.code}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 ml-0.5', isDarkTheme ? 'text-zinc-400' : 'text-zinc-500')} />
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
