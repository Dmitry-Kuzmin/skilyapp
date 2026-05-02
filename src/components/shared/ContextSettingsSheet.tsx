/**
 * Модальное окно выбора страны и категории прав
 * Премиальный дизайн с поддержкой светлой/темной темы
 */

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, LicenseCategoryConfig, LicenseCategory } from '@/types/pdd';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';
import { Car, Truck, Bus, Bike, Check, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useProfileData } from '@/hooks/useProfileData';
import { getCountryFlagUrl } from '@/lib/countryFlags';

interface ContextSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry?: CountryCode;
  currentCategory?: LicenseCategory;
  onApply?: (country: CountryCode, category: LicenseCategory) => void;
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
  const { t, setLanguage } = useLanguage();
  const { profileData } = useProfileData();
  
  // Дефолтные значения из профиля или конфига
  const effectiveCountry = currentCountry || (profileData?.preferred_country as CountryCode) || 'spain';
  const effectiveCategory = currentCategory || (profileData?.preferred_license_category as LicenseCategory) || 'B';

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(effectiveCountry);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>(effectiveCategory);

  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  // Обновляем состояние при открытии
  useEffect(() => {
    if (open) {
      setSelectedCountry(effectiveCountry);
      setSelectedCategory(effectiveCategory);
    }
  }, [open, effectiveCountry, effectiveCategory]);

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

  const handleApply = async () => {
    // Сохраняем выбор в базу данных
    if (profileData?.id) {
      try {
        const { error } = await (supabase as any)
          .from('profiles')
          .update({
            preferred_country: selectedCountry,
            preferred_license_category: selectedCategory,
          })
          .eq('id', profileData.id);

        if (error) {
          console.error('[ContextSettings] Failed to save preferences:', error);
        } else {
          console.log('[ContextSettings] Preferences saved:', { country: selectedCountry, category: selectedCategory });
        }
      } catch (err) {
        console.error('[ContextSettings] Error saving preferences:', err);
      }
    }

    // Применяем выбор локально
    onApply?.(selectedCountry, selectedCategory);

    // If switching to Russia, also switch language to Russian automatically
    if (selectedCountry === 'russia') {
      setLanguage('ru');
    }

    onOpenChange(false);
  };

  // Генерируем заголовок
  const getTitle = () => {
    return t('contextSettings.title');
  };

  const titleWithIcon = (
    <span className="flex items-center gap-2">
      <SlidersHorizontal className="w-5 h-5 shrink-0" />
      {getTitle()}
    </span>
  );

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title={titleWithIcon}
      className={cn(
        isDarkTheme ? 'bg-zinc-950' : 'bg-white'
      )}
    >
      <div className={cn(
        'flex flex-col gap-6 px-6 pb-6',
        isDarkTheme ? 'text-zinc-100' : 'text-zinc-900'
      )}>
        {/* Секция 1: Выбор страны */}
        <div>
          <h3 className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-3',
            isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {t('contextSettings.countrySection')}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {availableCountries.map((country) => {
              const isSelected = country.code === selectedCountry;
              const flagUrl = getCountryFlagUrl(country.code);

              return (
                <motion.button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={cn(
                    'relative rounded-xl border-2 p-3 transition-all duration-200',
                    'flex flex-col items-center justify-center gap-2',
                    'active:scale-[0.98]',
                    isSelected
                      ? isDarkTheme
                        ? 'border-white bg-white/10 shadow-lg shadow-black/40'
                        : 'border-zinc-900 bg-zinc-900/5 shadow-lg shadow-zinc-900/10'
                      : isDarkTheme
                        ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <motion.div
                      className={cn(
                        'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center',
                        isDarkTheme ? 'bg-white text-black' : 'bg-zinc-900 text-white'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3 h-3" />
                    </motion.div>
                  )}

                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className={cn(
                        'h-8 w-8 rounded-full',
                        isDarkTheme ? 'bg-zinc-700' : 'bg-zinc-200'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <div className="text-center">
                    <div className={cn(
                      'text-sm font-semibold',
                      isDarkTheme ? 'text-zinc-100' : 'text-zinc-900'
                    )}>
                      {country.data.name}
                    </div>
                    <div className={cn(
                      'text-xs mt-0.5',
                      isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'
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
            'text-xs font-semibold uppercase tracking-wider mb-3',
            isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {t('contextSettings.categorySection')}
          </h3>

          <div className="grid grid-cols-4 gap-2">
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
                    'relative h-[5.5rem] rounded-xl border-2 transition-all duration-200',
                    'flex flex-col items-center justify-center p-2 gap-1',
                    'active:scale-[0.98]',
                    isSelected
                      ? isDarkTheme
                        ? 'border-white bg-white/10 shadow-md shadow-black/40'
                        : 'border-zinc-900 bg-zinc-900/5 shadow-md shadow-zinc-900/10'
                      : isDarkTheme
                        ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <motion.div
                      className={cn(
                        'absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center',
                        isDarkTheme ? 'bg-white text-black' : 'bg-zinc-900 text-white'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-2 h-2" />
                    </motion.div>
                  )}

                  <CategoryIcon className={cn(
                    'w-4 h-4',
                    isSelected
                      ? isDarkTheme ? 'text-white' : 'text-zinc-900'
                      : isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'
                  )} />

                  <div className={cn(
                    'text-base font-bold',
                    isDarkTheme ? 'text-zinc-100' : 'text-zinc-900'
                  )}>
                    {category.code}
                  </div>

                  <div className={cn(
                    'text-[9px] text-center leading-tight line-clamp-1 px-1',
                    isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'
                  )}>
                    {category.nameFull}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Кнопка применения */}
        <div className={cn('pt-2 border-t', isDarkTheme ? 'border-zinc-800' : 'border-zinc-200')}>
          <motion.button
            onClick={handleApply}
            className={cn(
              'w-full h-12 rounded-xl font-semibold transition-all duration-200',
              'flex items-center justify-center gap-2',
              isDarkTheme
                ? 'bg-white text-black hover:bg-zinc-100 shadow-lg shadow-white/10'
                : 'bg-zinc-900 text-white hover:bg-black shadow-lg shadow-zinc-900/20'
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
