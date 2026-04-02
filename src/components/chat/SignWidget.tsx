import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SignWidgetProps {
    code: string;
    description?: string;
    isDarkTheme?: boolean;
}

export const SignWidget: React.FC<SignWidgetProps> = ({ code, description, isDarkTheme }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [nameFromDb, setNameFromDb] = useState<string | null>(null);
    const [descriptionFromDb, setDescriptionFromDb] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isFallback, setIsFallback] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function fetchSign() {
            setIsLoading(true);
            setError(false);
            try {
                const normalized = code.trim().toUpperCase();

                // Try exact match first (case-insensitive)
                let { data, error: e1 } = await supabase
                    .from('road_signs')
                    .select('image_url, name_ru, description_ru')
                    .ilike('sign_number', normalized)
                    .maybeSingle() as unknown as { data: { image_url: string; name_ru: string; description_ru: string } | null, error: any };

                // Fallback: wildcard match (e.g. "R-2%" to handle "R‐2" with non-breaking hyphens)
                if (!data && !e1) {
                    const fallback = await supabase
                        .from('road_signs')
                        .select('image_url, name_ru, description_ru')
                        .ilike('sign_number', `%${normalized.replace('-', '')}%`)
                        .maybeSingle() as unknown as { data: { image_url: string; name_ru: string; description_ru: string } | null, error: any };
                    data = fallback.data;
                }

                if (!data) {
                    console.warn(`[SignWidget] Sign not found: ${code}`);
                    if (mounted) setError(true);
                    return;
                }

                if (mounted && data.image_url) {
                    setImageUrl(data.image_url);
                    if (data.name_ru) setNameFromDb(data.name_ru);
                    if (data.description_ru) setDescriptionFromDb(data.description_ru);
                } else if (mounted) {
                    setError(true);
                }
            } catch (e) {
                console.error(`[SignWidget 🚀] Error fetching ${code}:`, e);
                if (mounted) setError(true);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        fetchSign();

        return () => {
            mounted = false;
        };
    }, [code]);

    const handleImageError = () => {
        // Fallback for Wikimedia 429: if thumbnail fails, try original file
        if (imageUrl?.includes('/thumb/') && !isFallback) {
            console.warn(`[SignWidget 🚀] Thumbnail failed for ${code} (possibly 429), trying original...`);
            // Example conversion: 
            // from: .../thumb/path/File.svg/240px-File.svg.png
            // to:   .../path/File.svg
            const parts = imageUrl.split('/');
            const fileNameIdx = parts.findIndex(p => p === 'thumb');
            if (fileNameIdx !== -1) {
                const newParts = parts.filter((_, i) => i !== fileNameIdx);
                // Last part of thumb URL is often the resize parameter (e.g., 200px-...)
                // We remove it to get the original file name
                if (newParts[newParts.length - 1].includes('px-')) {
                    newParts.pop();
                }
                const fallbackUrl = newParts.join('/');
                setIsFallback(true);
                setImageUrl(fallbackUrl);
                return;
            }
        }
        setError(true);
    };

    const finalDescription = descriptionFromDb || description;

    return (
        <div className={cn(
            "my-4 px-5 py-4 rounded-[2rem] border flex flex-row items-center gap-6 group transition-all duration-500 ease-in-out",
            isDarkTheme !== undefined
                ? (isDarkTheme
                    ? "bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                    : "bg-white border-indigo-100/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:border-indigo-200")
                : "bg-white dark:bg-slate-900/40 border-indigo-100/80 dark:border-slate-800/60 hover:shadow-xl"
        )}>
            <div className="flex flex-col items-center gap-3 shrink-0 p-1">
                <div className="w-16 h-16 flex items-center justify-center relative bg-transparent overflow-visible">
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-indigo-400 opacity-50" />}
                    {!isLoading && error && (
                        <div className="flex flex-col items-center opacity-40">
                            <span className="text-[10px] font-bold">DGT</span>
                            <span className="text-[9px] text-center leading-tight">Нет фото</span>
                        </div>
                    )}
                    {!isLoading && imageUrl && !error && (
                        <img
                            src={imageUrl}
                            alt={`Знак ${code}`}
                            className="max-w-full max-h-full object-contain filter drop-shadow-lg transform group-hover:scale-125 transition-transform duration-500"
                            style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                            onError={handleImageError}
                        />
                    )}
                </div>
                <div className={cn(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase transition-all duration-300 border shadow-sm",
                    isDarkTheme !== undefined
                        ? (isDarkTheme ? "bg-slate-950/60 text-slate-500 border-slate-800 group-hover:text-indigo-400 group-hover:border-indigo-500/30" : "bg-indigo-50/50 text-indigo-400 border-indigo-100 group-hover:text-indigo-600 group-hover:border-indigo-200")
                        : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                )}>
                    {code.trim()}
                </div>
            </div>

            {/* Правая часть: Название и Описание */}
            <div className="flex flex-col gap-2 min-w-0 flex-1 overflow-hidden">
                {nameFromDb ? (
                    <div className="max-h-[60px] overflow-y-auto pr-1 scrollbar-hide group-hover:scrollbar-default transition-all">
                        <h4 className={cn(
                            "text-sm sm:text-base font-black leading-tight tracking-tight transition-colors duration-300",
                            isDarkTheme !== undefined
                                ? (isDarkTheme ? "text-white group-hover:text-indigo-200" : "text-slate-900 group-hover:text-indigo-900")
                                : "text-slate-900 dark:text-white"
                        )}>
                            {nameFromDb}
                        </h4>
                    </div>
                ) : !isLoading && (
                    <div className="h-5 w-32 bg-indigo-100/50 dark:bg-indigo-500/10 animate-pulse rounded-lg" />
                )}

                {finalDescription && (
                    <div className={cn(
                        "max-h-[110px] overflow-y-auto pr-2 custom-scrollbar",
                        isDarkTheme ? "scrollbar-dark" : "scrollbar-light"
                    )}>
                        <p className={cn(
                            "text-[11px] sm:text-xs leading-relaxed font-semibold transition-colors duration-500",
                            isDarkTheme !== undefined
                                ? (isDarkTheme ? "text-slate-500 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-600")
                                : "text-slate-500 dark:text-slate-500"
                        )}>
                            {finalDescription}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
