/**
 * HeaderSkeleton — анимированный скелетон для header
 * Предотвращает layout shift при инициализации приложения
 */

import { cn } from '@/lib/utils';

interface HeaderSkeletonProps {
    className?: string;
}

export const HeaderSkeleton = ({ className }: HeaderSkeletonProps) => {
    return (
        <header
            className={cn(
                'border-b border-border/50 bg-background/95 sticky top-0 z-50 w-full',
                'hidden md:block',
                className
            )}
        >
            <div className="container mx-auto px-4 max-w-[1370px]">
                <div className="flex items-center justify-between h-16">
                    {/* Лого-скелетон */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-muted/60 animate-pulse" />
                        <div className="w-14 h-5 rounded-md bg-muted/60 animate-pulse" />
                    </div>

                    {/* Навигация-скелетон */}
                    <div className="flex items-center gap-1">
                        {[72, 64, 80, 64].map((w, i) => (
                            <div
                                key={i}
                                className="h-9 rounded-lg bg-muted/40 animate-pulse"
                                style={{ width: w, animationDelay: `${i * 60}ms` }}
                            />
                        ))}
                    </div>

                    {/* Правая часть-скелетон */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Wallet */}
                        <div className="hidden lg:flex items-center gap-2">
                            <div className="w-[130px] h-8 rounded-lg bg-muted/40 animate-pulse" />
                            <div className="w-[80px] h-8 rounded-lg bg-muted/40 animate-pulse" style={{ animationDelay: '80ms' }} />
                        </div>
                        {/* Icon buttons */}
                        <div className="w-9 h-9 rounded-lg bg-muted/40 animate-pulse" style={{ animationDelay: '120ms' }} />
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse" style={{ animationDelay: '160ms' }} />
                    </div>
                </div>
            </div>
        </header>
    );
};
