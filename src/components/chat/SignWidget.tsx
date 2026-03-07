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
                    .select('image_url')
                    .ilike('sign_number', normalized)
                    .maybeSingle() as unknown as { data: { image_url: string } | null, error: any };

                // Fallback: wildcard match (e.g. "R-2%" to handle "R‐2" with non-breaking hyphens)
                if (!data && !e1) {
                    const fallback = await supabase
                        .from('road_signs')
                        .select('image_url')
                        .ilike('sign_number', `%${normalized.replace('-', '')}%`)
                        .maybeSingle() as unknown as { data: { image_url: string } | null, error: any };
                    data = fallback.data;
                }

                if (!data) {
                    console.warn(`[SignWidget] Sign not found: ${code}`);
                    if (mounted) setError(true);
                    return;
                }

                if (mounted && data.image_url) {
                    setImageUrl(data.image_url);
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
        <div className={cn("my-3 p-3 rounded-xl border flex flex-col items-center group transition-all hover:shadow-md",
            isDarkTheme !== undefined
                ? (isDarkTheme ? "bg-indigo-950/20 border-indigo-800/30 hover:bg-slate-800" : "bg-indigo-50/50 border-indigo-100/50 hover:bg-white")
                : "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-800/30 hover:bg-white dark:hover:bg-slate-800"
        )}>
            <div className={cn("w-20 h-20 xl:w-24 xl:h-24 flex items-center justify-center p-2 mb-2 rounded-lg shadow-sm relative overflow-hidden",
                isDarkTheme !== undefined
                    ? (isDarkTheme ? "bg-slate-900" : "bg-white")
                    : "bg-white dark:bg-slate-900"
            )}>
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />}
                {!isLoading && error && (
                    <span className="text-[10px] text-muted-foreground text-center">Изображение<br />отсутствует</span>
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
            <span className={cn("text-[10px] xl:text-xs font-bold px-2.5 py-1 rounded-md tracking-wide uppercase shadow-sm",
                isDarkTheme !== undefined
                    ? (isDarkTheme ? "bg-indigo-900/80 text-indigo-200" : "bg-indigo-100 text-indigo-800")
                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200"
            )}>
                ЗНАК {code.trim()}
            </span>
            {description && <p className={cn("text-[10px] xl:text-xs mt-2 text-center font-medium leading-tight max-w-[90%]",
                isDarkTheme !== undefined
                    ? (isDarkTheme ? "text-slate-300" : "text-slate-600")
                    : "text-slate-600 dark:text-slate-300"
            )}>{description.trim()}</p>}
        </div>
    );
};
