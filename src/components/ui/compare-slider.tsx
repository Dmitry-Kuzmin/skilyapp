import React, { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MoveHorizontal } from "lucide-react";

interface CompareSliderProps {
    originalUrl: string | null;
    generatedUrl: string | null;
    className?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({
    originalUrl,
    generatedUrl,
    className
}) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const w = rect.width;
        // Clamp between 0 and 100
        const percentage = Math.min(Math.max((x / w) * 100, 0), 100);
        setSliderPosition(percentage);
    }, []);

    const onMouseDown = () => setIsDragging(true);
    const onMouseUp = () => setIsDragging(false);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX);
    }, [handleMove]);

    // Handle global mouse up to stop dragging even if cursor leaves componen
    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isDragging) handleMove(e.clientX);
        };

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousemove', handleGlobalMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
        };
    }, [isDragging, handleMove]);

    if (!originalUrl && !generatedUrl) return <div className="w-full h-full bg-black/10 flex items-center justify-center text-zinc-500">No images</div>;
    // If only one image check
    if (!originalUrl && generatedUrl) return <img src={generatedUrl} className="w-full h-full object-contain" />;
    if (originalUrl && !generatedUrl) return <img src={originalUrl} className="w-full h-full object-contain" />;

    return (
        <div
            ref={containerRef}
            className={cn("relative w-full h-full select-none overflow-hidden group cursor-ew-resize", className)}
            onMouseDown={onMouseDown}
            onTouchStart={() => setIsDragging(true)}
            onTouchMove={onTouchMove}
            onTouchEnd={() => setIsDragging(false)}
        >
            {/* Layer 1: Bottom (AI Generated) */}
            <img
                src={generatedUrl!}
                alt="Generated"
                className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Layer 2: Top (Original) with Clip Path */}
            <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={originalUrl!}
                    alt="Original"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                />
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:bg-white/80 transition-colors"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center text-zinc-800 -ml-[1px]">
                    <MoveHorizontal className="w-4 h-4" />
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/60 rounded px-2 py-1 text-[10px] text-white font-bold backdrop-blur">
                ORIGINAL
            </div>
            <div className="absolute top-4 right-4 bg-purple-600/80 rounded px-2 py-1 text-[10px] text-white font-bold backdrop-blur">
                AI CANDIDATE
            </div>
        </div>
    );
};
