import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TestContentLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    mode: string;
    isTelegramApp: boolean;
    isPracticeLikeMode: boolean;
}

export const TestContentLayout = ({
    children,
    sidebar,
    mode,
    isTelegramApp,
    isPracticeLikeMode
}: TestContentLayoutProps) => {
    const isBlitzMode = mode === 'blitz';
    const isExamMode = mode === 'exam' || mode === 'exam-russia';

    return (
        <div className={cn(
            "mx-auto transition-all duration-300",
            // BLITZ MODE: Centered cockpit layout, no sidebar space
            isBlitzMode
                ? "max-w-3xl px-4"
                // EXAM MODE: Unified container strategy - everything centered
                : isExamMode
                    ? "max-w-3xl px-4"
                    // Grid Layout for Practice Mode on Desktop (with Sidebar)
                    : !isTelegramApp && isPracticeLikeMode
                        ? "flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:items-start lg:gap-3 xl:gap-4 max-w-full lg:max-w-[1370px] px-2 sm:px-4"
                        // Default Container
                        : "container px-2 sm:px-4"
        )}>
            {/* Main Content Column */}
            <div
                data-testid="test-content-block"
                className={cn(
                    // Telegram Layout adjustments
                    isTelegramApp
                        ? "px-2 sm:px-4 pt-0"
                        : "pt-1 pb-2 md:pb-3",
                    // Blitz/Exam mode: minimal padding
                    (isBlitzMode || isExamMode) && "pt-2 pb-0"
                )}
            >
                {children}
            </div>

            {/* Sidebar Column (Desktop Practice Only) - NOT for Blitz/Exam */}
            {sidebar && !isTelegramApp && isPracticeLikeMode && !isBlitzMode && !isExamMode && (
                <div className={cn(
                    "hidden lg:flex lg:flex-col pt-1",
                    "pb-2 md:pb-3"
                )}>
                    <div className="sticky top-4 w-full flex flex-col">
                        {sidebar}
                    </div>
                </div>
            )}
        </div>
    );
};
