/**
 * Country Selector Component
 * 
 * Красивый переключатель стран для навигации.
 * Показывает только активные страны из конфигурации.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { getActiveCountries, CountryConfig } from '@/config/countries';
import { playClickSound } from '@/services/audioService';
import { useCountry } from '@/contexts/CountryContext';
import { PartnershipExpansionPortal } from './LazyPartnershipExpansionPortal';

export const CountrySelector: React.FC = () => {
    const { selectedCountry, setSelectedCountry } = useCountry();
    const [isOpen, setIsOpen] = useState(false);
    const [isPartnershipOpen, setIsPartnershipOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeCountries = getActiveCountries();

    // Закрываем дропдаун при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCountrySelect = (country: CountryConfig) => {
        playClickSound();
        setSelectedCountry(country);
        setIsOpen(false);
    };

    const handleToggle = () => {
        playClickSound();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={handleToggle}
                className="flex items-center gap-1.5 pl-0.5 pr-2 md:px-0 py-2 md:py-1 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
                aria-label="Select Country"
            >
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                <span className="hidden md:inline text-sm">{selectedCountry.nameEn}</span>

                {/* Chevron */}
                <svg
                    className={`h-3 w-3 text-slate-500 group-hover:text-slate-300 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 space-y-0.5 max-h-[60vh] overflow-y-auto">
                        {activeCountries.map((country) => {
                            const isSelected = country.code === selectedCountry.code;

                            return (
                                <button
                                    key={country.code}
                                    onClick={() => handleCountrySelect(country)}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
                    ${isSelected
                                            ? 'text-white'
                                            : 'hover:bg-white/5 text-slate-300 hover:text-white'
                                        }
                  `}
                                >
                                    <span className="text-xl leading-none">{country.flag}</span>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium text-sm text-slate-200">
                                            {country.nameEn}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {country.authority}
                                        </div>
                                    </div>

                                    {/* Checkmark for selected */}
                                    {isSelected && (
                                        <svg
                                            className="h-4 w-4 text-indigo-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Partnership CTA - Premium */}
                    <div className="px-1.5 pb-1.5 pt-0.5 border-t border-white/10">
                        <button
                            onClick={() => {
                                playClickSound();
                                setIsPartnershipOpen(true);
                                setIsOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-2.5">
                                {/* Clean icon - no background circle */}
                                <Rocket className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />

                                <div className="flex-1 text-left">
                                    <div className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors leading-tight">
                                        Запустить Skily в своей стране
                                    </div>
                                </div>

                                {/* Animated arrow */}
                                <div className="text-xs text-slate-500 group-hover:text-indigo-400 transition-all duration-300 group-hover:translate-x-1">
                                    →
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Partnership Modal */}
            <PartnershipExpansionPortal
                isOpen={isPartnershipOpen}
                onClose={() => setIsPartnershipOpen(false)}
            />
        </div>
    );
};
