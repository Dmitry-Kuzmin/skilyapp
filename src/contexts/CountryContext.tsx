/**
 * Country Context - Multi-Country Support
 * 
 * Управляет выбором страны на лендинге и в приложении.
 * Синхронизируется с localStorage для сохранения выбора пользователя.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
    CountryConfig,
    DEFAULT_COUNTRY,
    getCountryByCode,
    COUNTRY_STORAGE_KEY
} from '@/config/countries';

interface CountryContextValue {
    /** Текущая выбранная страна */
    selectedCountry: CountryConfig;

    /** Функция для изменения страны */
    setSelectedCountry: (country: CountryConfig) => void;

    /** Функция для изменения страны по коду */
    setCountryByCode: (code: string) => void;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

interface CountryProviderProps {
    children: ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
    const [selectedCountry, setSelectedCountryState] = useState<CountryConfig>(() => {
        // Пытаемся загрузить сохраненную страну из localStorage
        if (typeof window !== 'undefined') {
            const savedCountryCode = localStorage.getItem(COUNTRY_STORAGE_KEY);
            if (savedCountryCode) {
                const country = getCountryByCode(savedCountryCode);
                if (country && country.isActive) {
                    return country;
                }
            }
        }
        return DEFAULT_COUNTRY;
    });

    // Синхронизация с localStorage при изменении страны
    useEffect(() => {
        localStorage.setItem(COUNTRY_STORAGE_KEY, selectedCountry.code);
    }, [selectedCountry]);

    const setSelectedCountry = (country: CountryConfig) => {
        if (country.isActive) {
            setSelectedCountryState(country);
        } else {
            console.warn(`[CountryContext] Country ${country.code} is not active yet`);
        }
    };

    const setCountryByCode = (code: string) => {
        const country = getCountryByCode(code);
        if (country) {
            setSelectedCountry(country);
        } else {
            console.warn(`[CountryContext] Country with code ${code} not found`);
        }
    };

    const value = useMemo(() => ({
        selectedCountry,
        setSelectedCountry: (country: CountryConfig) => {
            if (country.isActive) {
                setSelectedCountryState(country);
            } else {
                console.warn(`[CountryContext] Country ${country.code} is not active yet`);
            }
        },
        setCountryByCode: (code: string) => {
            const country = getCountryByCode(code);
            if (country) {
                if (country.isActive) {
                    setSelectedCountryState(country);
                }
            } else {
                console.warn(`[CountryContext] Country with code ${code} not found`);
            }
        },
    }), [selectedCountry]);

    return (
        <CountryContext.Provider value={value}>
            {children}
        </CountryContext.Provider>
    );
};

/**
 * Hook для использования Country Context
 */
export const useCountry = (): CountryContextValue => {
    const context = useContext(CountryContext);
    if (!context) {
        throw new Error('useCountry must be used within CountryProvider');
    }
    return context;
};
