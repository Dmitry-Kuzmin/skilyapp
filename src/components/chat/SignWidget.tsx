import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SignWidgetProps {
    code: string;
    isDarkTheme?: boolean;
}

export const SignWidget: React.FC<SignWidgetProps> = ({ code, isDarkTheme }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [nameFromDb, setNameFromDb] = useState<string | null>(null);
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
                    .select('image_url, name_ru')
                    .ilike('sign_number', normalized)
                    .maybeSingle() as unknown as { data: { image_url: string; name_ru: string } | null, error: any };

                // Fallback: wildcard match (e.g. "R-2%" to handle "R‐2" with non-breaking hyphens)
                if (!data && !e1) {
                    const fallback = await supabase
                        .from('road_signs')
                        .select('image_url, name_ru')
                        .ilike('sign_number', `%${normalized.replace('-', '')}%`)
                        .maybeSingle() as unknown as { data: { image_url: string; name_ru: string } | null, error: any };
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

    return (
        <div className={cn(
            "my-2 px-3 py-2.5 rounded-xl border flex flex-row items-center gap-4 group transition-all hover:shadow-md",
            isDarkTheme !== undefined
                ? (isDarkTheme ? "bg-indigo-950/10 border-indigo-800/20 hover:bg-indigo-900/20" : "bg-indigo-50/30 border-indigo-100/30 hover:bg-white")
                : "bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100/30 dark:border-indigo-800/20 hover:bg-white dark:hover:bg-indigo-900/20"
        )}>
            {/* Левая часть: Знак + Номер под ним */}
            <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-14 h-14 flex items-center justify-center relative overflow-hidden bg-transparent">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                    {!isLoading && error && (
                        <span className="text-[9px] text-muted-foreground text-center leading-tight opacity-50">Нет<br />фото</span>
                    )}
                    {!isLoading && imageUrl && !error && (
                        <img
                            src={imageUrl}
                            alt={`Знак ${code}`}
                            className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                            onError={handleImageError}
                        />
                    )}
                </div>
                <span className={cn(
                    "text-[8px] font-bold tracking-tighter uppercase opacity-30 group-hover:opacity-60 transition-opacity",
                    isDarkTheme !== undefined
                        ? (isDarkTheme ? "text-indigo-200" : "text-indigo-900")
                        : "text-indigo-900 dark:text-indigo-200"
                )}>
                    {code.trim()}
                </span>
            </div>

            {/* Правая часть: Описание из базы */}
            <div className="flex flex-col gap-0.5 min-w-0">
                {nameFromDb ? (
                    <p className={cn(
                        "text-[12px] font-semibold leading-snug tracking-tight",
                        isDarkTheme !== undefined
                            ? (isDarkTheme ? "text-slate-200" : "text-slate-800")
                            : "text-slate-800 dark:text-slate-200"
                    )}>
                        {nameFromDb}
                    </p>
                ) : !isLoading && (
                    <p className="text-[10px] italic opacity-50">Описание загружается...</p>
                )}
            </div>
        </div>
    );
};
