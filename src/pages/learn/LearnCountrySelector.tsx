/**
 * Страница выбора страны для изучения ПДД
 * Ultra Advanced Premium интерфейс с умным определением страны
 */

import { useNavigate } from 'react-router-dom';
import { usePDDCountryDetection } from '@/hooks/usePDDCountryDetection';
import { COUNTRIES_CONFIG, CountryCode } from '@/types/pdd';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Globe, Sparkles, Loader2, CheckCircle2, ArrowRight, Zap, Shield, Clock, Target } from 'lucide-react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function LearnCountrySelector() {
  const navigate = useNavigate();
  const { detection, loading, saveCountryChoice } = usePDDCountryDetection();
  const [hoveredCountry, setHoveredCountry] = useState<CountryCode | null>(null);
  const [isCheckingPreselected, setIsCheckingPreselected] = useState(true);

  // SEAMLESS UX: Проверяем preselected_country из лендинга
  useEffect(() => {
    const preselectedCountry = localStorage.getItem('preselected_country') as CountryCode | null;
    
    if (preselectedCountry && COUNTRIES_CONFIG[preselectedCountry]?.available) {
      // Страна уже выбрана на лендинге - пропускаем экран выбора
      console.log('[LearnCountrySelector] Preselected country found, redirecting:', preselectedCountry);
      // Сохраняем в основной ключ для приложения
      saveCountryChoice(preselectedCountry);
      // Удаляем временный ключ из лендинга
      localStorage.removeItem('preselected_country');
      // Редирект на дашборд страны
      navigate(`/learn/${preselectedCountry}`, { replace: true });
      return;
    }
    
    setIsCheckingPreselected(false);
  }, [navigate, saveCountryChoice]);

  const handleSelect = (countryId: CountryCode) => {
    saveCountryChoice(countryId);
    // Также сохраняем для лендинга (если пользователь вернется)
    localStorage.setItem('preselected_country', countryId);
    navigate(`/learn/${countryId}`);
  };

  // Показываем загрузку пока проверяем preselected_country
  if (isCheckingPreselected) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Фильтруем только доступные страны
  const availableCountries = Object.values(COUNTRIES_CONFIG).filter(
    (country) => country.available
  );

  // Сортируем: рекомендуемая страна первая
  const sortedCountries = [...availableCountries].sort((a, b) => {
    if (a.code === detection.recommendedCountry) return -1;
    if (b.code === detection.recommendedCountry) return 1;
    return 0;
  });

  return (
    <Layout>
      {/* Фоновый градиент с анимацией */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl relative z-10">
        {/* Заголовок с премиум анимацией */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center gap-3 mb-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-xl border border-primary/20 shadow-lg"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-7 h-7 text-primary" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight">
              Где вы хотите получить права?
            </h1>
            <motion.div
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-7 h-7 text-primary" />
            </motion.div>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto"
          >
            Выберите страну для изучения правил дорожного движения
          </motion.p>
          
          {/* Индикатор определения */}
          {!loading && detection.detectedBy && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary"
            >
              {detection.detectedBy === 'ip' && (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Определено по вашему местоположению</span>
                </>
              )}
              {detection.detectedBy === 'language' && (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Определено по языку устройства</span>
                </>
              )}
              {detection.detectedBy === 'saved' && (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Используется ваш сохраненный выбор</span>
                </>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Премиум индикатор загрузки */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg font-medium"
            >
              Определяем вашу страну...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground/70"
            >
              Анализируем IP и язык устройства
            </motion.p>
          </motion.div>
        )}

        {/* Премиум список стран */}
        <AnimatePresence mode="wait">
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 sm:space-y-5"
            >
              {sortedCountries.map((country, index) => {
                const isRecommended = country.code === detection.recommendedCountry;
                const isHovered = hoveredCountry === country.code;
                const confidence = detection.confidence;

                return (
                  <motion.div
                    key={country.code}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    onHoverStart={() => setHoveredCountry(country.code)}
                    onHoverEnd={() => setHoveredCountry(null)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'group relative cursor-pointer rounded-2xl overflow-hidden',
                        'transition-all duration-500',
                        isRecommended
                          ? 'shadow-2xl shadow-primary/30'
                          : 'shadow-lg hover:shadow-xl'
                      )}
                      onClick={() => handleSelect(country.code)}
                    >
                      {/* Градиентный фон с анимацией */}
                      <div className={cn(
                        'absolute inset-0 transition-opacity duration-500',
                        isRecommended
                          ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 opacity-100'
                          : 'bg-gradient-to-br from-background via-background to-primary/5 opacity-0 group-hover:opacity-100'
                      )} />
                      
                      {/* Glassmorphism эффект */}
                      <div className="relative backdrop-blur-xl bg-background/80 border-2 rounded-2xl overflow-hidden"
                        style={{
                          borderColor: isRecommended 
                            ? 'rgba(var(--primary), 0.5)' 
                            : 'rgba(var(--border), 0.5)',
                          boxShadow: isRecommended
                            ? '0 0 40px rgba(var(--primary), 0.2), inset 0 0 40px rgba(var(--primary), 0.05)'
                            : '0 0 20px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        {/* Свечение для рекомендуемой страны */}
                        {isRecommended && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20"
                            animate={{
                              x: ['-100%', '100%'],
                            }}
                            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
                          />
                        )}

                        <div className="relative p-6 sm:p-8">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Левая часть: флаг и информация */}
                            <div className="flex items-start sm:items-center gap-5 flex-1 w-full sm:w-auto">
                              {/* Анимированный флаг */}
                              <motion.div
                                className="relative"
                                whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
                                transition={{ duration: 0.5 }}
                              >
                                <div className="text-6xl sm:text-7xl relative">
                                  {country.flag}
                                  {isRecommended && (
                                    <motion.div
                                      className="absolute -top-2 -right-2"
                                      animate={{ 
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 10, -10, 0]
                                      }}
                                      transition={{ 
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                    >
                                      <Sparkles className="w-5 h-5 text-primary" />
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                    {country.name}
                                  </h3>
                                  {isRecommended && (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary text-xs font-bold shadow-lg"
                                    >
                                      {detection.detectedBy === 'ip' && (
                                        <>
                                          <MapPin className="w-3.5 h-3.5" />
                                          <span>Вы здесь📍</span>
                                        </>
                                      )}
                                      {detection.detectedBy === 'language' && (
                                        <>
                                          <Globe className="w-3.5 h-3.5" />
                                          <span>Рекомендуем⭐</span>
                                        </>
                                      )}
                                      {detection.detectedBy === 'saved' && (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Ваш выбор</span>
                                        </>
                                      )}
                                      {confidence === 'low' && (
                                        <span className="ml-1 opacity-70 text-[10px]">(примерно)</span>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                                
                                <p className="text-base text-muted-foreground mb-4 font-medium">
                                  {country.nameNative}
                                </p>

                                {/* Премиум карточки с информацией об экзамене */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10"
                                  >
                                    <Target className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground">
                                      {country.examRules.questionsCount} вопросов
                                    </span>
                                  </motion.div>
                                  
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10"
                                  >
                                    <Shield className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-semibold text-foreground">
                                      {country.examRules.maxErrors} ошибки
                                    </span>
                                  </motion.div>
                                  
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10"
                                  >
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-semibold text-foreground">
                                      {Math.floor(country.examRules.timeLimit / 60)} мин
                                    </span>
                                  </motion.div>
                                </div>
                              </div>
                            </div>

                            {/* Правая часть: премиум кнопка */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                size="lg"
                                className={cn(
                                  'min-w-[140px] h-14 text-base font-bold rounded-xl transition-all duration-300',
                                  'shadow-lg hover:shadow-xl',
                                  isRecommended
                                    ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-primary/50'
                                    : 'bg-gradient-to-r from-background to-background/80 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelect(country.code);
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  Выбрать
                                  <ArrowRight className={cn(
                                    "w-4 h-4 transition-transform",
                                    isHovered && "translate-x-1"
                                  )} />
                                </span>
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Премиум предупреждение о низкой уверенности */}
        {!loading && detection.confidence === 'low' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent backdrop-blur-xl border-2 border-yellow-500/20 shadow-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 animate-pulse" />
            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl shrink-0"
                >
                  ⚠️
                </motion.div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-yellow-900 dark:text-yellow-100 mb-2">
                    Не удалось точно определить вашу страну
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                    Если вы используете VPN или находитесь в другой стране, выберите страну вручную из списка выше.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Премиум информационный блок */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Вы можете изменить страну в любой момент в настройках</span>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}

