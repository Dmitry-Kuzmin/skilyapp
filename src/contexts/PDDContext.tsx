/**
 * Контекст для выбранной страны и категории ПДД
 * Используется для адаптации всего приложения под выбранную страну
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CountryCode, LicenseCategory } from '@/types/pdd';
import { useProfileData } from '@/hooks/useProfileData';

interface PDDContextType {
  selectedCountry: CountryCode;
  selectedCategory: LicenseCategory;
  setSelectedCountry: (country: CountryCode) => void;
  setSelectedCategory: (category: LicenseCategory) => void;
}

const PDDContext = createContext<PDDContextType | undefined>(undefined);

export function PDDProvider({ children }: { children: ReactNode }) {
  const { profileData } = useProfileData();

  // Загружаем из localStorage при инициализации
  const [selectedCountry, setSelectedCountryState] = useState<CountryCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdd_selected_country') as CountryCode | null;
      return saved || 'spain';
    }
    return 'spain';
  });

  const [selectedCategory, setSelectedCategoryState] = useState<LicenseCategory>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdd_selected_category');
      return saved || 'B';
    }
    return 'B';
  });

  // Загружаем сохранённые предпочтения из profileData при появлении
  useEffect(() => {
    if (profileData?.preferred_country && profileData?.preferred_license_category) {
      console.log('[PDDContext] Loading preferences from profile:', {
        country: profileData.preferred_country,
        category: profileData.preferred_license_category
      });

      // Normalize country code (ES -> spain, RU -> russia)
      let normalizedCountry = profileData.preferred_country.toLowerCase();
      if (normalizedCountry === 'es') normalizedCountry = 'spain';
      if (normalizedCountry === 'ru') normalizedCountry = 'russia';

      setSelectedCountryState(normalizedCountry as CountryCode);
      setSelectedCategoryState(profileData.preferred_license_category as LicenseCategory);
      // Обновляем localStorage чтобы синхронизировать
      localStorage.setItem('pdd_selected_country', normalizedCountry);
      localStorage.setItem('pdd_selected_category', profileData.preferred_license_category);
    }
  }, [profileData?.preferred_country, profileData?.preferred_license_category]);

  // Синхронизируем с localStorage
  useEffect(() => {
    localStorage.setItem('pdd_selected_country', selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem('pdd_selected_category', selectedCategory);
  }, [selectedCategory]);

  const setSelectedCountry = (country: CountryCode) => {
    setSelectedCountryState(country);
    localStorage.setItem('pdd_selected_country', country);
  };

  const setSelectedCategory = (category: LicenseCategory) => {
    setSelectedCategoryState(category);
    localStorage.setItem('pdd_selected_category', category);
  };

  return (
    <PDDContext.Provider
      value={{
        selectedCountry,
        selectedCategory,
        setSelectedCountry,
        setSelectedCategory,
      }}
    >
      {children}
    </PDDContext.Provider>
  );
}

export function usePDDContext() {
  const context = useContext(PDDContext);
  if (context === undefined) {
    throw new Error('usePDDContext must be used within a PDDProvider');
  }
  return context;
}





