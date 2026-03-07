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

    useEffect(() => {
        let mounted = true;

        async function fetchSign() {
            setIsLoading(true);
            setError(false);
            try {
                const { data, error } = await supabase
                    .from('road_signs')
                    .select('image_url')
                    .ilike('sign_number', code.trim()) // Using ilike to be case-insensitive
                    .maybeSingle() as unknown as { data: { image_url: string } | null, error: any };

                if (error || !data) {
                    console.warn(`Sign not found: ${code}`, error);
                    if (mounted) setError(true);
                    return;
                }

                if (mounted && data.image_url) {
                    setImageUrl(data.image_url);
                } else if (mounted) {
                    setError(true);
                }
            } catch (e) {
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
                    <span className="text-xs text-muted-foreground text-center">Изображение<br />отсутствует</span>
                )}
                {!isLoading && imageUrl && !error && (
                    <img
                        src={imageUrl}
                        alt={`Знак ${code}`}
                        className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                        onError={() => setError(true)}
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
