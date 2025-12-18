/**
 * Bottom Sheet для настройки контекста обучения (Страна + Категория)
 * Ultra Modern UX - единая панель для выбора обоих параметров
 */

import { useState, useEffect } from 'react';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, LicenseCategoryConfig } from '@/types/pdd';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry: CountryCode;
  currentCategory: string;
  onApply: (country: CountryCode, category: string) => void;
}

export function ContextSettingsSheet({
  open,
  onOpenChange,
  currentCountry,
  currentCategory,
  onApply,
}: ContextSettingsSheetProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(currentCountry);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);

  // Обновляем состояние при открытии
  useEffect(() => {
    if (open) {
      setSelectedCountry(currentCountry);
      setSelectedCategory(currentCategory);
    }
  }, [open, currentCountry, currentCategory]);

  // При изменении страны, выбираем первую доступную категорию
  useEffect(() => {
    const categories = getLicenseCategoriesForCountry(selectedCountry);
    if (categories.length > 0 && !categories.find(c => c.code === selectedCategory)) {
      setSelectedCategory(categories[0].code);
    }
  }, [selectedCountry, selectedCategory]);

  const availableCountries = Object.values(COUNTRIES_CONFIG).filter(c => c.available);
  const availableCategories = getLicenseCategoriesForCountry(selectedCountry);

  const handleApply = () => {
    onApply(selectedCountry, selectedCategory);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t border-zinc-800 bg-zinc-950">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-2xl font-bold text-zinc-100">Настройки обучения</SheetTitle>
          <SheetDescription className="text-zinc-400">
            Выберите страну и категорию прав для изучения
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 pb-6">
          {/* Секция 1: Выбор страны */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              1. Страна ПДД
            </h3>
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                {availableCountries.map((country) => {
                  const isSelected = country.code === selectedCountry;
                  return (
                    <motion.div
                      key={country.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => setSelectedCountry(country.code)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl',
                          'border-2 transition-all duration-200',
                          'hover:scale-[1.01] hover:shadow-lg',
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{country.flag}</span>
                          <div className="text-left">
                            <div className="font-semibold text-zinc-100">{country.name}</div>
                            <div className="text-sm text-zinc-400">{country.nameNative}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-2 rounded-full bg-primary/20"
                          >
                            <Check className="w-5 h-5 text-primary" />
                          </motion.div>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Секция 2: Выбор категории (зависит от страны) */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
              2. Категория прав
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence mode="wait">
                {availableCategories.map((category) => {
                  const isSelected = category.code === selectedCategory;
                  return (
                    <motion.button
                      key={category.code}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedCategory(category.code)}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl',
                        'border-2 transition-all duration-200',
                        'hover:scale-[1.02] hover:shadow-lg',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div className="text-left">
                          <div className="font-semibold text-zinc-100">
                            {category.code} - {category.nameFull}
                          </div>
                          {category.description && (
                            <div className="text-xs text-zinc-400">{category.description}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-1.5 rounded-full bg-primary/20"
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Кнопка применения */}
        <div className="sticky bottom-0 pt-4 pb-6 bg-zinc-950 border-t border-zinc-800">
          <Button
            onClick={handleApply}
            className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.01]"
          >
            Применить
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

