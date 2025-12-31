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
import { PartnershipExpansionPortal } from './PartnershipExpansionPortal';

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
                className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-bold text-white hover:bg-slate-700/70 transition-all duration-300 hover:scale-105 relative group"
                aria-label="Select Country"
            >
                <span className="text-xl md:text-2xl leading-none">{selectedCountry.flag}</span>
                <span className="hidden lg:inline text-xs md:text-sm">{selectedCountry.nameEn}</span>

                {/* Chevron */}
                <svg
                    className={`h-3.5 md:h-4 w-3.5 md:w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                        {activeCountries.map((country) => {
                            const isSelected = country.code === selectedCountry.code;

                            return (
                                <button
                                    key={country.code}
                                    onClick={() => handleCountrySelect(country)}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                                        }
                  `}
                                >
                                    <span className="text-2xl leading-none">{country.flag}</span>
                                    <div className="flex-1 text-left">
                                        <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                            {country.nameEn}
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                                            {country.authority}
                                        </div>
                                    </div>

                                    {/* Checkmark for selected */}
                                    {isSelected && (
                                        <svg
                                            className="h-5 w-5 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Partnership CTA - Enhanced */}
                    <div className="px-2 pb-2 pt-1 border-t border-white/10">
                        <button
                            onClick={() => {
                                playClickSound();
                                setIsPartnershipOpen(true);
                                setIsOpen(false);
                            }}
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 hover:bg-purple-500/20 border border-slate-700/50 hover:border-purple-500/40 transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Rocket className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-purple-400 transition-colors leading-tight">
                                        Запустить Skily в своей стране
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 group-hover:text-purple-400 transition-colors">
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
