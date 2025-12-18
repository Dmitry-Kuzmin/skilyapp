/**
 * Хук для определения рекомендуемой страны на основе IP и языка
 */

import { useState, useEffect } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';
import { CountryCode, CountryDetection, COUNTRIES_CONFIG } from '@/types/pdd';

export function usePDDCountryDetection() {
  const [detection, setDetection] = useState<CountryDetection>({
    recommendedCountry: null,
    detectedBy: null,
    confidence: 'low',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detectCountry() {
      // 1. Проверяем сохраненный выбор пользователя (приоритет #1)
      const savedCountry = localStorage.getItem('pdd_selected_country') as CountryCode | null;
      if (savedCountry && COUNTRIES_CONFIG[savedCountry]?.available) {
        setDetection({
          recommendedCountry: savedCountry,
          detectedBy: 'saved',
          confidence: 'high',
        });
        setLoading(false);
        return;
      }

      // 2. Получаем язык из Telegram или браузера
      const tgWebApp = getTelegramWebApp();
      const tgLang = tgWebApp?.initDataUnsafe?.user?.language_code || 
                     navigator.language?.split('-')[0] || 'ru';

      // 3. Определяем страну по IP
      try {
        // Используем бесплатный API для определения IP
        const ipResponse = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(3000), // таймаут 3 секунды
        });
        
        if (!ipResponse.ok) throw new Error('IP API failed');
        
        const ipData = await ipResponse.json();
        const countryCode = ipData.country_code; // 'ES', 'RU', etc.
        
        // Маппинг ISO кодов на наши идентификаторы
        const isoToCountry: Record<string, CountryCode> = {
          'ES': 'spain',
          'RU': 'russia',
          'UA': 'ukraine',
          'BY': 'belarus',
        };

        const detectedCountry = isoToCountry[countryCode];
        
        if (detectedCountry && COUNTRIES_CONFIG[detectedCountry]?.available) {
          setDetection({
            recommendedCountry: detectedCountry,
            detectedBy: 'ip',
            confidence: 'high',
            ipCountry: countryCode,
            languageCode: tgLang,
          });
          setLoading(false);
          return;
        }

        // Fallback на язык, если IP не определил доступную страну
        const langToCountry: Record<string, CountryCode> = {
          'ru': 'russia',
          'es': 'spain',
          'uk': 'ukraine',
        };
        
        const langCountry = langToCountry[tgLang];
        
        if (langCountry && COUNTRIES_CONFIG[langCountry]?.available) {
          setDetection({
            recommendedCountry: langCountry,
            detectedBy: 'language',
            confidence: 'medium',
            languageCode: tgLang,
          });
        } else {
          // Финальный fallback - первая доступная страна
          const firstAvailable = Object.values(COUNTRIES_CONFIG).find(c => c.available);
          setDetection({
            recommendedCountry: firstAvailable?.code || 'russia',
            detectedBy: 'language',
            confidence: 'low',
            languageCode: tgLang,
          });
        }
      } catch (error) {
        // Fallback на язык при ошибке IP (VPN, таймаут и т.д.)
        console.warn('[CountryDetection] IP detection failed, using language fallback:', error);
        
        const langToCountry: Record<string, CountryCode> = {
          'ru': 'russia',
          'es': 'spain',
          'uk': 'ukraine',
        };
        
        const langCountry = langToCountry[tgLang];
        
        if (langCountry && COUNTRIES_CONFIG[langCountry]?.available) {
          setDetection({
            recommendedCountry: langCountry,
            detectedBy: 'language',
            confidence: 'low',
            languageCode: tgLang,
          });
        } else {
          // Финальный fallback
          const firstAvailable = Object.values(COUNTRIES_CONFIG).find(c => c.available);
          setDetection({
            recommendedCountry: firstAvailable?.code || 'russia',
            detectedBy: 'language',
            confidence: 'low',
            languageCode: tgLang,
          });
        }
      } finally {
        setLoading(false);
      }
    }

    detectCountry();
  }, []);

  const saveCountryChoice = (country: CountryCode) => {
    localStorage.setItem('pdd_selected_country', country);
    setDetection({
      recommendedCountry: country,
      detectedBy: 'saved',
      confidence: 'high',
    });
  };

  return { detection, loading, saveCountryChoice };
}

