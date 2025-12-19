/**
 * Кокпит Пилота - Радикальный редизайн модалки выбора контекста
 * Концепция: Пользователь настраивает свой "болид" перед заездом
 * Референсы: Need for Speed, Gran Turismo, киберпанк-стилистика
 */

import { useState, useEffect, useRef } from 'react';
import { CountryCode, COUNTRIES_CONFIG, getLicenseCategoriesForCountry, LicenseCategoryConfig, LicenseCategory } from '@/types/pdd';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface ContextSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry: CountryCode;
  currentCategory: LicenseCategory;
  onApply: (country: CountryCode, category: LicenseCategory) => void;
}

// Компонент живого фона (неоновые линии трассы)
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Размытые неоновые линии, имитирующие движение */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.3) 50%, transparent 100%),
            linear-gradient(0deg, transparent 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)
          `,
          backgroundSize: '200% 200%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Дополнительные световые эффекты */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

// Компонент частиц при выборе
function ParticleBurst({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 w-1 h-1 bg-indigo-400 rounded-full"
          initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
            x: Math.cos((i / 12) * Math.PI * 2) * 60,
            y: Math.sin((i / 12) * Math.PI * 2) * 60,
          }}
          transition={{
            duration: 0.6,
            delay: i * 0.02,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Горизонтальная карусель стран
function CountryCarousel({
  countries,
  selectedCountry,
  onSelect,
}: {
  countries: Array<{ code: CountryCode; data: typeof COUNTRIES_CONFIG[CountryCode] }>;
  selectedCountry: CountryCode;
  onSelect: (code: CountryCode) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [carouselX, setCarouselX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  
  // Находим индекс выбранной страны
  const selectedIndex = countries.findIndex(c => c.code === selectedCountry);
  
  // Прокручиваем к выбранной стране при открытии
  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0) {
      const cardWidth = 280; // ширина карточки + gap
      const centerOffset = (containerRef.current.clientWidth / 2) - (cardWidth / 2);
      const targetX = selectedIndex * cardWidth - centerOffset;
      
      setCarouselX(-targetX);
    }
  }, [selectedIndex]);
  
  // Обработка свайпа/перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.pageX - (carouselRef.current?.offsetLeft || 0);
    scrollLeft.current = carouselX;
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - (carouselRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 1.5;
    setCarouselX(scrollLeft.current - walk);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    // Snap к ближайшей карточке
    if (carouselRef.current && containerRef.current) {
      const cardWidth = 280;
      const centerOffset = containerRef.current.clientWidth / 2;
      const currentCenter = -carouselX + centerOffset;
      const nearestIndex = Math.round((currentCenter - cardWidth / 2) / cardWidth);
      const clampedIndex = Math.max(0, Math.min(countries.length - 1, nearestIndex));
      const targetX = clampedIndex * cardWidth - centerOffset + cardWidth / 2;
      setCarouselX(-targetX);
      
      // Выбираем страну
      if (countries[clampedIndex]) {
        onSelect(countries[clampedIndex].code);
      }
    }
  };
  
  // Touch события для мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].pageX - (carouselRef.current?.offsetLeft || 0);
    scrollLeft.current = carouselX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - (carouselRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 1.5;
    setCarouselX(scrollLeft.current - walk);
  };
  
  const handleTouchEnd = () => {
    handleMouseUp();
  };
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden py-8"
    >
      <div
        ref={carouselRef}
        className="flex gap-4 px-4 cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${carouselX}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {countries.map((country, index) => {
          const isSelected = country.code === selectedCountry;
          const distance = Math.abs(index - selectedIndex);
          const scale = isSelected ? 1 : Math.max(0.7, 1 - distance * 0.15);
          const opacity = isSelected ? 1 : Math.max(0.3, 1 - distance * 0.3);
          
          return (
            <motion.div
              key={country.code}
              className="flex-shrink-0 w-[260px]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale, opacity }}
              transition={{ duration: 0.3 }}
              onClick={() => !isDragging && onSelect(country.code)}
            >
              <button
                className={cn(
                  'relative w-full h-[200px] rounded-2xl border-2 transition-all duration-300',
                  'overflow-hidden cursor-pointer select-none',
                  isSelected
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shadow-[0_0_40px_rgba(99,102,241,0.5)]'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                )}
                style={{
                  transform: `scale(${scale})`,
                  opacity,
                  filter: isSelected ? 'none' : 'blur(2px)',
                }}
              >
                {/* Неоновое свечение для активной карточки */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-violet-500/30"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
                  <motion.div
                    className="text-7xl mb-4"
                    animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {country.data.flag}
                  </motion.div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-zinc-100 mb-1">
                      {country.data.name}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {country.data.nameNative}
                    </div>
                    {isSelected && (
                      <motion.div
                        className="mt-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        DGT, 2025
                      </motion.div>
                    )}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
      
      {/* Индикаторы прокрутки */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 py-2">
        {countries.map((country, index) => (
          <div
            key={country.code}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index === selectedIndex
                ? 'bg-indigo-500 w-8'
                : 'bg-zinc-700 w-2'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Сетка слотов для категорий
function CategorySlots({
  categories,
  selectedCategory,
  onSelect,
  showCategories,
}: {
  categories: LicenseCategoryConfig[];
  selectedCategory: LicenseCategory;
  onSelect: (code: LicenseCategory) => void;
  showCategories: boolean;
}) {
  const [burstActive, setBurstActive] = useState(false);
  
  const handleSelect = (code: LicenseCategory) => {
    setBurstActive(true);
    onSelect(code);
    setTimeout(() => setBurstActive(false), 600);
  };
  
  return (
    <AnimatePresence>
      {showCategories && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mt-8"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-6 text-center">
            2. Категория прав
          </h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {categories.map((category, index) => {
              const isSelected = category.code === selectedCategory;
              
              return (
                <motion.button
                  key={category.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  onClick={() => handleSelect(category.code)}
                  className={cn(
                    'relative aspect-square rounded-xl border-2 transition-all duration-300',
                    'flex flex-col items-center justify-center p-4',
                    'overflow-hidden cursor-pointer group',
                    isSelected
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/30 to-violet-500/30 shadow-[0_0_30px_rgba(99,102,241,0.6)] scale-105'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50'
                  )}
                >
                  {/* Внутреннее свечение для активного слота */}
                  {isSelected && (
                    <>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 to-violet-500/40"
                        animate={{
                          opacity: [0.4, 0.6, 0.4],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <ParticleBurst active={burstActive && isSelected} />
                    </>
                  )}
                  
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <motion.div
                      className="text-4xl mb-2"
                      animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {category.icon}
                    </motion.div>
                    <div className={cn(
                      'text-2xl font-bold',
                      isSelected ? 'text-indigo-300' : 'text-zinc-300'
                    )}>
                      {category.code}
                    </div>
                    <div className={cn(
                      'text-[10px] mt-1 text-center leading-tight',
                      isSelected ? 'text-indigo-400' : 'text-zinc-500'
                    )}>
                      {category.nameFull}
                    </div>
                  </div>
                  
                  {/* Эффект "заряженного" слота */}
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 border-2 border-indigo-400 rounded-xl"
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(99, 102, 241, 0.5)',
                          '0 0 40px rgba(99, 102, 241, 0.8)',
                          '0 0 20px rgba(99, 102, 241, 0.5)',
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ContextSettingsSheet({
  open,
  onOpenChange,
  currentCountry,
  currentCategory,
  onApply,
}: ContextSettingsSheetProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(currentCountry);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>(currentCategory);
  const [showCategories, setShowCategories] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState('Настройка кокпита');
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Обновляем состояние при открытии
  useEffect(() => {
    if (open) {
      setSelectedCountry(currentCountry);
      setSelectedCategory(currentCategory);
      setShowCategories(false);
      setIsFinalizing(false);
      
      // Показываем категории с задержкой после выбора страны
      setTimeout(() => {
        setShowCategories(true);
      }, 500);
    }
  }, [open, currentCountry, currentCategory]);
  
  // Обновляем заголовок при изменении выбора
  useEffect(() => {
    const countryData = COUNTRIES_CONFIG[selectedCountry];
    const categoryData = getLicenseCategoriesForCountry(selectedCountry).find(
      c => c.code === selectedCategory
    );
    
    if (categoryData) {
      setDynamicTitle(`Готов к старту: ${categoryData.icon} Категория ${categoryData.code}!`);
    } else {
      setDynamicTitle(`Выбор региона: ${countryData.flag} ${countryData.name}`);
    }
  }, [selectedCountry, selectedCategory]);
  
  // При изменении страны, выбираем первую доступную категорию
  useEffect(() => {
    const categories = getLicenseCategoriesForCountry(selectedCountry);
    if (categories.length > 0 && !categories.find(c => c.code === selectedCategory)) {
      setSelectedCategory(categories[0].code);
    }
    // Показываем категории с анимацией
    setShowCategories(false);
    setTimeout(() => {
      setShowCategories(true);
    }, 300);
  }, [selectedCountry]);
  
  const availableCountries = Object.values(COUNTRIES_CONFIG)
    .filter(c => c.available)
    .map(c => ({ code: c.code, data: c }));
  
  const availableCategories = getLicenseCategoriesForCountry(selectedCountry);
  
  const handleCategorySelect = (category: LicenseCategory) => {
    setSelectedCategory(category);
    setIsFinalizing(true);
    
    // Автозакрытие через 500мс после вспышки
    setTimeout(() => {
      onApply(selectedCountry, category);
      onOpenChange(false);
    }, 500);
  };
  
  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={dynamicTitle}
        className="bg-zinc-950/95 backdrop-blur-xl border-zinc-800 border-t-white/10"
        contentClassName="relative overflow-hidden"
        snapPoints={[0.85, 1]} // Открывается на 85%, можно потянуть до 100%
        defaultSnap={0} // По умолчанию на 85% (первый snap point)
      >
        {/* Живой фон */}
        <AnimatedBackground />
        
        <div className="relative z-10">
          {/* Секция 1: Карусель стран */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-6 text-center">
              1. Страна ПДД
            </h3>
            <CountryCarousel
              countries={availableCountries}
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
            />
          </div>
          
          {/* Секция 2: Слоты категорий */}
          <CategorySlots
            categories={availableCategories}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            showCategories={showCategories}
          />
        </div>
      </ResponsiveModal>
      
      {/* Эффект финализации */}
      <AnimatePresence>
        {isFinalizing && (
          <motion.div
            className="fixed inset-0 bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-transparent backdrop-blur-md z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  rotate: { duration: 0.6, ease: 'easeOut' },
                  scale: { duration: 0.4, repeat: 1, repeatType: 'reverse' },
                }}
              >
                <Zap className="w-20 h-20 text-indigo-400 fill-indigo-400" />
              </motion.div>
              <motion.p
                className="text-xl font-bold text-indigo-300 uppercase tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Готов!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
