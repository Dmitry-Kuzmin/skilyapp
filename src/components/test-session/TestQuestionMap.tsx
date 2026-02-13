import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { SkilyBrandLogo } from "../SkilyBrandLogo";

interface TestQuestionMapProps {
    open: boolean;
    onClose: () => void;
    questions: any[];
    currentIndex: number;
    answers: any[];
    jumpToQuestion: (index: number) => void;
    mode: string;
}

export const TestQuestionMap = ({
    open,
    onClose,
    questions,
    currentIndex,
    answers,
    jumpToQuestion,
    mode
}: TestQuestionMapProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragCurrentY, setDragCurrentY] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const [contentScrollTop, setContentScrollTop] = useState(0);
    const isClosingRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);

    const handleCloseModal = () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            isClosingRef.current = false;
            setIsDragging(false);
            setDragStartY(0);
            setDragCurrentY(0);
        }, 300);
    };

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) handleCloseModal();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open]);

    if (!open && !isClosing) return null;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging && !isClosing) {
                        handleCloseModal();
                    }
                }}
            />
            <div
                className={`fixed left-1/2 bottom-0 z-[100] bg-card border-t border-border rounded-t-2xl sm:rounded-t-3xl shadow-2xl overflow-hidden flex flex-col ${!isDragging && !isClosing ? 'transition-transform duration-300 ease-out' : isClosing ? 'transition-transform duration-300 ease-in' : ''} ${!isClosing && !isDragging ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxHeight: 'calc(90vh - 40px)',
                    height: 'auto',
                    bottom: '0px',
                    maxWidth: '1370px',
                    width: '100%',
                    left: '50%',
                    transform: isDragging && dragCurrentY > dragStartY
                        ? `translate(-50%, ${dragCurrentY - dragStartY}px)`
                        : 'translateX(-50%)'
                }}
                onTouchStart={(e) => {
                    if (isClosingRef.current || isClosing) return;
                    const touch = e.touches[0];
                    if (touch) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const relativeY = touch.clientY - rect.top;
                        if (relativeY < 120 && contentScrollTop === 0) {
                            e.stopPropagation();
                            setIsDragging(true);
                            setDragStartY(touch.clientY);
                            setDragCurrentY(touch.clientY);
                        }
                    }
                }}
                onTouchMove={(e) => {
                    if (isDragging && !isClosingRef.current && !isClosing) {
                        const touch = e.touches[0];
                        if (touch) {
                            const deltaY = touch.clientY - dragStartY;
                            if (deltaY > 0) {
                                if (animationFrameRef.current !== null) {
                                    cancelAnimationFrame(animationFrameRef.current);
                                }
                                animationFrameRef.current = requestAnimationFrame(() => {
                                    setDragCurrentY(touch.clientY);
                                });
                            }
                        }
                    }
                }}
                onTouchEnd={(e) => {
                    if (isDragging && !isClosingRef.current) {
                        if (animationFrameRef.current !== null) {
                            cancelAnimationFrame(animationFrameRef.current);
                            animationFrameRef.current = null;
                        }
                        const dragDistance = dragCurrentY - dragStartY;
                        const threshold = Math.max(80, window.innerHeight * 0.2);
                        if (dragDistance > threshold) {
                            handleCloseModal();
                        } else {
                            setIsDragging(false);
                            setDragStartY(0);
                            setDragCurrentY(0);
                        }
                    }
                }}
            >
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                <div className="px-4 sm:px-6 pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Карта вопросов</h2>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
                                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background border border-border rounded">Esc</kbd>
                                <span>закрыть</span>
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseModal();
                                }}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                disabled={isClosing}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className="overflow-y-auto px-4 sm:px-6 py-4 bg-card"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                    onScroll={(e) => setContentScrollTop(e.currentTarget.scrollTop)}
                >
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-3">
                        {useMemo(() => {
                            // Create an O(1) lookup map for answers
                            const answersMap = new Map<string, any>();
                            answers.forEach(a => answersMap.set(a.questionId, a));

                            return questions.map((question, idx) => {
                                const answer = answersMap.get(question.id);
                                const isAnswered = answer !== undefined;
                                const isCurrent = idx === currentIndex;
                                const imageUrl = question.image_url;

                                return (
                                    <button
                                        key={question.id || idx}
                                        onClick={() => {
                                            jumpToQuestion(idx);
                                            handleCloseModal();
                                        }}
                                        className={`
                                            relative aspect-square w-full rounded-xl overflow-hidden font-bold transition-all duration-300 group
                                            ${isCurrent
                                                ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background scale-105 shadow-xl z-10"
                                                : "hover:scale-105 hover:shadow-lg"
                                            }
                                            ${!isAnswered
                                                ? "bg-muted/40 border border-white/5"
                                                : mode === "exam"
                                                    ? "border-2 border-blue-500"
                                                    : answer.isCorrect
                                                        ? "border-2 border-emerald-500"
                                                        : "border-2 border-red-500"
                                            }
                                        `}
                                    >
                                        {/* Background Image or Gradient */}
                                        {imageUrl ? (
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundImage: `url(${imageUrl})` }}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 flex items-center justify-center p-2" />
                                        )}

                                        {/* Overlay Gradient for readability */}
                                        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] ${isCurrent ? 'bg-black/20' : ''}`} />

                                        {/* Status Color Overlay (Subtle) */}
                                        {isAnswered && (
                                            <div className={`absolute inset-0 opacity-20 ${mode === "exam" ? "bg-blue-500" :
                                                answer.isCorrect ? "bg-emerald-500" : "bg-red-500"
                                                }`} />
                                        )}

                                        {/* Content (Number & Status Icon) */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-2">
                                            <span className="text-xl text-white drop-shadow-md">
                                                {idx + 1}
                                            </span>

                                            {/* Status Dot */}
                                            {isAnswered && mode !== 'exam' && (
                                                <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full shadow-sm ${answer.isCorrect ? "bg-emerald-400 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                                                    }`} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        }, [questions, answers, currentIndex, mode])}
                    </div>

                    <div className="mt-6 pt-4 border-t border-border pb-6">
                        <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border border-border bg-muted/50" />
                                <span>Не отвечен</span>
                            </div>
                            {mode === "exam" ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border-2 border-blue-500/50 bg-blue-500/20" />
                                    <span>Отвечен</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-emerald-500/50 bg-emerald-500/20" />
                                        <span>Правильно</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-red-500/50 bg-red-500/20" />
                                        <span>Неправильно</span>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded ring-2 ring-accent ring-offset-2 bg-accent text-accent-foreground" />
                                <span>Текущий</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
