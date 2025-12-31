/**
 * Country Selector Component
 * 
 * Красивый переключатель стран для навигации.
 * Показывает только активные страны из конфигурации.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Rocket } from 'lucide-react';
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-bold text-white hover:bg-slate-700/70 transition-all duration-300 hover:scale-105 relative group"
                aria-label="Select Country"
            >
                <Globe className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                <span className="hidden md:inline">{selectedCountry.nameEn}</span>

                {/* Chevron */}
                <svg
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
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

                    {/* Partnership CTA */}
                    <button
                        onClick={() => {
                            playClickSound();
                            setIsPartnershipOpen(true);
                            setIsOpen(false);
                        }}
                        className="relative mx-2 mb-2 mt-1 p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-transparent rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] group"
                        style={{
                            backgroundClip: 'padding-box',
                        }}
                    >
                        {/* Animated gradient border */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 -z-10 blur-sm group-hover:blur-md transition-all duration-300" />
                        <div className="absolute inset-[2px] rounded-[10px] bg-slate-900 -z-10" />

                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Rocket className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-black text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-violet-400 group-hover:bg-clip-text transition-all duration-300">
                                    Станьте владельцем Skily в своей стране
                                </div>
                                <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                    Узнать условия партнёрства →
                                </div>
                            </div>
                        </div>
                    </button>
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
