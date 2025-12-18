/**
 * Контекст для выбранной страны и категории ПДД
 * Используется для адаптации всего приложения под выбранную страну
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CountryCode, LicenseCategory } from '@/types/pdd';

interface PDDContextType {
  selectedCountry: CountryCode;
  selectedCategory: LicenseCategory;
  setSelectedCountry: (country: CountryCode) => void;
  setSelectedCategory: (category: LicenseCategory) => void;
}

const PDDContext = createContext<PDDContextType | undefined>(undefined);

export function PDDProvider({ children }: { children: ReactNode }) {
  // Загружаем из localStorage при инициализации
  const [selectedCountry, setSelectedCountryState] = useState<CountryCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdd_selected_country') as CountryCode | null;
      return saved || 'russia';
    }
    return 'russia';
  });

  const [selectedCategory, setSelectedCategoryState] = useState<LicenseCategory>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdd_selected_category');
      return saved || 'B';
    }
    return 'B';
  });

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

