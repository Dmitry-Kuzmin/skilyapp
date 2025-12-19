/**
 * Умный переключатель контекста (Страна | Категория)
 * Ultra Modern UX - одна кнопка-пилюля для выбора обоих параметров
 */

import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, getLicenseCategory, LicenseCategoryConfig, LicenseCategory } from '@/types/pdd';
import { ChevronDown, Car, Truck, Bus, Bike, Globe, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextSettingsSheet } from './ContextSettingsSheet';
import { usePDDContext } from '@/contexts/PDDContext';

interface ContextSwitcherProps {
  className?: string;
}

export function ContextSwitcher({ className }: ContextSwitcherProps) {
  const { resolvedTheme } = useTheme();
  const { selectedCountry, selectedCategory, setSelectedCountry, setSelectedCategory } = usePDDContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Определяем тему для адаптивных стилей
  const isDarkTheme = useMemo(() => (resolvedTheme ?? 'dark') !== 'light', [resolvedTheme]);
  
  // Используем значения из контекста
  const currentCountry = selectedCountry;
  const currentCategory = selectedCategory;
  
  const countryData = COUNTRIES_CONFIG[currentCountry];
  const categoryData = getLicenseCategory(currentCountry, currentCategory);
  
  // Если категория не найдена, используем первую доступную
  const availableCategories = getLicenseCategoriesForCountry(currentCountry);
  const displayCategory = categoryData || availableCategories[0] || { code: 'B', name: 'B', nameFull: 'Легковая', icon: '🚗' };

  // Маппинг категорий на иконки из lucide-react
  const getCategoryIcon = (categoryCode: string): LucideIcon => {
    const code = categoryCode.toUpperCase();
    if (code.startsWith('A') || code === 'AM' || code === 'M') return Bike;
    if (code === 'B' || code === 'B1' || code === 'BE') return Car;
    if (code.startsWith('C') || code === 'CE' || code === 'C1') return Truck;
    if (code.startsWith('D') || code === 'DE' || code === 'D1') return Bus;
    return Car; // по умолчанию
  };

  const CategoryIcon = getCategoryIcon(displayCategory.code);

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
        'h-10 px-3 sm:px-4 py-2 rounded-lg',
        'bg-zinc-900 border border-white/5',
        'hover:border-white/10 hover:bg-zinc-800/50',
        'flex items-center gap-2 text-xs font-medium',
        'transition-all duration-200',
        'text-zinc-200',
        'backdrop-blur-sm',
        className
      );
    } else {
      return cn(
        'h-10 px-3 sm:px-4 py-2 rounded-lg',
        'bg-white border border-zinc-200',
        'hover:border-zinc-300 hover:bg-zinc-50',
        'flex items-center gap-2 text-xs font-medium',
        'transition-all duration-200',
        'text-zinc-700',
        'shadow-sm',
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
        <Globe className={cn('w-3.5 h-3.5', isDarkTheme ? 'text-zinc-400' : 'text-zinc-500')} />
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-tight">
          {getCountryCode(currentCountry)}
        </span>
        <span className={isDarkTheme ? 'text-white/10' : 'text-zinc-300'}>•</span>
        <CategoryIcon className={cn('w-3.5 h-3.5', isDarkTheme ? 'text-zinc-400' : 'text-zinc-500')} />
        <span className="whitespace-nowrap text-xs font-semibold">
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

