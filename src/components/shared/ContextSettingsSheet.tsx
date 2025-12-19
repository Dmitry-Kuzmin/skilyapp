/**
 * Модальное окно выбора страны и категории прав
 * Премиальный дизайн с поддержкой светлой/темной темы
 */

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, LicenseCategoryConfig, LicenseCategory } from '@/types/pdd';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Globe, Car, Truck, Bus, Bike, Check, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContextSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry: CountryCode;
  currentCategory: LicenseCategory;
  onApply: (country: CountryCode, category: LicenseCategory) => void;
}

// Маппинг категорий на иконки из lucide-react
const getCategoryIcon = (categoryCode: string): LucideIcon => {
  const code = categoryCode.toUpperCase();
  if (code.startsWith('A') || code === 'AM' || code === 'M') return Bike;
  if (code === 'B' || code === 'B1' || code === 'BE') return Car;
  if (code.startsWith('C') || code === 'CE' || code === 'C1') return Truck;
  if (code.startsWith('D') || code === 'DE' || code === 'D1') return Bus;
  return Car; // по умолчанию
};

// Короткие коды стран
const getCountryCode = (country: CountryCode): string => {
  const codes: Record<CountryCode, string> = {
    russia: 'RU',
    spain: 'ES',
    ukraine: 'UA',
    belarus: 'BY',
  };
  return codes[country] || country.toUpperCase().slice(0, 2);
};

export function ContextSettingsSheet({
  open,
  onOpenChange,
  currentCountry,
  currentCategory,
  onApply,
}: ContextSettingsSheetProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(currentCountry);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>(currentCategory);
  
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  
  // Обновляем состояние при открытии
  useEffect(() => {
    if (open) {
      setSelectedCountry(currentCountry);
      setSelectedCategory(currentCategory);
    }
  }, [open, currentCountry, currentCategory]);
  
  // При изменении страны, выбираем первую доступную категорию если текущая недоступна
  useEffect(() => {
    const categories = getLicenseCategoriesForCountry(selectedCountry);
    if (categories.length > 0 && !categories.find(c => c.code === selectedCategory)) {
      setSelectedCategory(categories[0].code);
    }
  }, [selectedCountry, selectedCategory]);
  
  const availableCountries = Object.values(COUNTRIES_CONFIG)
    .filter(c => c.available)
    .map(c => ({ code: c.code, data: c }));
  
  const availableCategories = getLicenseCategoriesForCountry(selectedCountry);
  const selectedCategoryData = availableCategories.find(c => c.code === selectedCategory);
  
  const handleApply = () => {
    onApply(selectedCountry, selectedCategory);
    onOpenChange(false);
  };
  
  // Генерируем заголовок
  const getTitle = () => {
    if (selectedCategoryData) {
      const CategoryIcon = getCategoryIcon(selectedCategoryData.code);
      return (
        <div className="flex items-center gap-2">
          <CategoryIcon className="w-4 h-4" />
          <span>{t('contextSettings.readyToStart', { category: selectedCategoryData.code })}</span>
        </div>
      );
    }
    return t('contextSettings.selectContext');
  };
  
  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      className={cn(
        'max-w-2xl',
        isDarkTheme ? 'bg-zinc-950' : 'bg-white'
      )}
    >
      <div className={cn(
        'space-y-6',
        isDarkTheme ? 'text-zinc-100' : 'text-zinc-900'
      )}>
        {/* Секция 1: Выбор страны */}
        <div>
          <h3 className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-4',
            isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {t('contextSettings.countrySection')}
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableCountries.map((country) => {
              const isSelected = country.code === selectedCountry;
              
              return (
                <motion.button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={cn(
                    'relative rounded-lg border-2 p-4 transition-all duration-200',
                    'flex flex-col items-center justify-center gap-2',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isSelected
                      ? isDarkTheme
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/30'
                        : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/20'
                      : isDarkTheme
                        ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <motion.div
                      className={cn(
                        'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center',
                        isDarkTheme ? 'bg-indigo-500' : 'bg-indigo-600'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  
                  <Globe className={cn(
                    'w-6 h-6',
                    isSelected
                      ? isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'
                      : isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'
                  )} />
                  
                  <div className="text-center">
                    <div className={cn(
                      'text-sm font-semibold',
                      isSelected
                        ? isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'
                        : isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      {country.data.name}
                    </div>
                    <div className={cn(
                      'text-xs mt-0.5',
                      isSelected
                        ? isDarkTheme ? 'text-indigo-400/80' : 'text-indigo-600/80'
                        : isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'
                    )}>
                      {getCountryCode(country.code)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
        
        {/* Секция 2: Выбор категории */}
        <div>
          <h3 className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-4',
            isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {t('contextSettings.categorySection')}
          </h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {availableCategories.map((category, index) => {
              const isSelected = category.code === selectedCategory;
              const CategoryIcon = getCategoryIcon(category.code);
              
              return (
                <motion.button
                  key={category.code}
                  onClick={() => setSelectedCategory(category.code)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  className={cn(
                    'relative aspect-square rounded-lg border-2 transition-all duration-200',
                    'flex flex-col items-center justify-center p-3 gap-2',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isSelected
                      ? isDarkTheme
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/30'
                        : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/20'
                      : isDarkTheme
                        ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <motion.div
                      className={cn(
                        'absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center',
                        isDarkTheme ? 'bg-indigo-500' : 'bg-indigo-600'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                  
                  <CategoryIcon className={cn(
                    'w-5 h-5',
                    isSelected
                      ? isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'
                      : isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'
                  )} />
                  
                  <div className={cn(
                    'text-lg font-bold',
                    isSelected
                      ? isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'
                      : isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'
                  )}>
                    {category.code}
                  </div>
                  
                  <div className={cn(
                    'text-[10px] text-center leading-tight line-clamp-2',
                    isSelected
                      ? isDarkTheme ? 'text-indigo-400/80' : 'text-indigo-600/80'
                      : isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'
                  )}>
                    {category.nameFull}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
        
        {/* Кнопка применения */}
        <div className="pt-4 border-t border-zinc-800">
          <motion.button
            onClick={handleApply}
            className={cn(
              'w-full h-12 rounded-lg font-semibold transition-all duration-200',
              'flex items-center justify-center gap-2',
              isDarkTheme
                ? 'bg-white text-black hover:bg-zinc-100 shadow-lg shadow-white/20'
                : 'bg-black text-white hover:bg-zinc-900 shadow-lg shadow-black/20'
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Check className="w-4 h-4" />
            {t('contextSettings.apply')}
          </motion.button>
        </div>
      </div>
    </UnifiedModal>
  );
}
