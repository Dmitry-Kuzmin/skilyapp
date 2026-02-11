import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TestContentLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    mode: string;
    isTelegramApp: boolean;
    isPracticeLikeMode: boolean;
    isRedemptionMode?: boolean;
}

export const TestContentLayout = ({
    children,
    sidebar,
    mode,
    isTelegramApp,
    isPracticeLikeMode,
    isRedemptionMode
}: TestContentLayoutProps) => {
    const isBlitzMode = mode === 'blitz';
    const isExamMode = mode === 'exam' || mode === 'exam-russia';

    return (
        <div className={cn(
            "mx-auto transition-all duration-300",
            // BLITZ MODE: Centered cockpit layout, no sidebar space
            isBlitzMode
                ? "max-w-3xl px-4"
                // EXAM MODE: Wide layout like practice but centered (no sidebar)
                : isExamMode
                    ? "max-w-full xl:max-w-[1600px] 2xl:max-w-[1920px] px-2 sm:px-4 lg:px-8"
                    // Grid Layout for Practice Mode on Desktop (with Sidebar)
                    // We only move sidebar to the side on XL (1280px+) to ensure enough room for question content
                    : !isTelegramApp && isPracticeLikeMode
                        ? "flex flex-col xl:grid xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_440px] xl:items-start xl:gap-8 2xl:gap-12 max-w-full xl:max-w-[1600px] 2xl:max-w-[2000px] px-2 sm:px-4 lg:px-8 2xl:px-12"
                        // Default Container
                        : "container px-2 sm:px-4"
        )}>
            {/* Main Content Column */}
            <div
                data-testid="test-content-block"
                className={cn(
                    "w-full min-w-0 transition-all duration-500", // min-w-0 for flex/grid items to allow shrinking
                    // Telegram Layout adjustments
                    isTelegramApp
                        ? "px-2 sm:px-4"
                        : "pt-4 pb-2 md:pb-3",
                    // Blitz/Exam mode: minimal padding
                    (isBlitzMode || isExamMode) && !isTelegramApp && "pt-4 pb-12",
                    // Tactical Mode for Redemption - Simplified
                    isRedemptionMode && !isTelegramApp && "pt-4"
                )}
                style={{
                    paddingTop: isTelegramApp
                        ? 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), 88px)'
                        : undefined
                }}
            >
                {children}
            </div>

            {/* Sidebar Column (Desktop Practice Only) - NOT for Blitz/Exam */}
            {sidebar && !isTelegramApp && isPracticeLikeMode && !isBlitzMode && !isExamMode && (
                <div className={cn(
                    "hidden xl:flex xl:flex-col pt-4",
                    "pb-2 md:pb-3",
                    "xl:min-w-[380px] 2xl:min-w-[420px]"
                )}>
                    <div className="sticky top-6 w-full flex flex-col">
                        {sidebar}
                    </div>
                </div>
            )}
        </div>
    );
};
