/**
 * Умный переключатель контекста (Страна | Категория)
 * Ultra Modern UX - одна кнопка-пилюля для выбора обоих параметров
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [sheetOpen, setSheetOpen] = useState(false);
  
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

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setSheetOpen(true)}
        className={cn(
          'h-9 px-3 rounded-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50',
          'flex items-center gap-2 text-sm font-medium',
          'transition-all duration-200 hover:scale-[1.02]',
          className
        )}
      >
        <span className="text-base">{countryData.flag}</span>
        <span className="text-zinc-200">{countryData.name}</span>
        <span className="text-zinc-500">|</span>
        <span className="text-base">{displayCategory.icon}</span>
        <span className="text-zinc-200">{displayCategory.code}</span>
        <span className="text-zinc-400 text-xs">({displayCategory.nameFull})</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
      </Button>

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

