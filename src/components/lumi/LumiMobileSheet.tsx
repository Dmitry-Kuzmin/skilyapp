import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { LumiChatWidget } from "./LumiChatWidget";
import { cn } from "@/lib/utils";

interface LumiMobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
  initialMessage?: string;
  lastAnswerCorrect?: boolean | null;
  questionExplanation?: string | null;
  showExplanation?: boolean;
}

export const LumiMobileSheet = ({
  open,
  onOpenChange,
  context,
  initialMessage,
  lastAnswerCorrect,
  questionExplanation = null,
  showExplanation = false
}: LumiMobileSheetProps) => {
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setDragCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    setDragCurrentY(currentY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const dragDistance = dragCurrentY - dragStartY;
    
    // Если свайп вниз больше 100px - закрываем
    if (dragDistance > 100) {
      onOpenChange(false);
    }
    
    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);
  };

  const translateY = isDragging ? Math.max(0, dragCurrentY - dragStartY) : 0;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <div className="bg-background rounded-t-3xl shadow-2xl h-[80vh] flex flex-col">
          {/* Handle bar для swipe */}
          <div
            className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <LumiChatWidget
              context={context}
              initialMessage={initialMessage}
              lastAnswerCorrect={lastAnswerCorrect}
              compact={true}
              questionExplanation={questionExplanation}
              showExplanation={showExplanation}
            />
          </div>
        </div>
      </div>
    </>
  );
};

