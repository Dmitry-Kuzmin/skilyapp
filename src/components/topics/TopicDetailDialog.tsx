import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Lock, Play, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useModalStore } from '@/store/modalStore';
import { useLanguage } from '@/contexts/LanguageContext';

interface TopicDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topicId: string;
    topicName: string;
    topicCount: number;
    freeQuestionIds: string[];
    country: string;
    isPremium: boolean;
}

const QUESTIONS_PER_TICKET = 30;

interface Ticket {
    index: number;
    start: number;
    end: number;
    locked: boolean;
    questionIds: string[];
}

export function TopicDetailDialog({
    open,
    onOpenChange,
    topicId,
    topicName,
    topicCount,
    freeQuestionIds,
    country,
    isPremium,
}: TopicDetailDialogProps) {
    const navigate = useNavigate();
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const openModal = useModalStore((s) => s.openModal);
    const { language } = useLanguage();

    const isSpain = country === 'spain';

    const tickets = useMemo((): Ticket[] => {
        const total = Math.max(topicCount, 1);
        const count = Math.ceil(total / QUESTIONS_PER_TICKET);
        return Array.from({ length: count }, (_, i) => {
            const start = i * QUESTIONS_PER_TICKET;
            const end = Math.min(start + QUESTIONS_PER_TICKET, total);
            const locked = isSpain && !isPremium && i > 0;
            const questionIds = locked ? [] : freeQuestionIds.slice(start, end);
            return { index: i, start, end, locked, questionIds };
        });
    }, [topicCount, freeQuestionIds, isSpain, isPremium]);

    const handleTicketClick = (ticket: Ticket) => {
        if (ticket.locked) {
            openModal('PAYWALL');
            return;
        }
        const levelParam = ticket.index > 0 ? `&level=${ticket.index + 1}` : '';
        navigate(`/test/by-topic?topicId=${topicId}&topic=${encodeURIComponent(topicName)}&count=${QUESTIONS_PER_TICKET}&country=${country}${levelParam}`);
        onOpenChange(false);
    };

    const freeCount = tickets.filter(t => !t.locked).length;
    const lockedCount = tickets.filter(t => t.locked).length;

    const label = (key: string) => {
        const labels: Record<string, Record<string, string>> = {
            ticket: { ru: 'Билет', es: 'Test', en: 'Ticket' },
            questions: { ru: 'вопросов', es: 'preguntas', en: 'questions' },
            tickets: { ru: 'билетов', es: 'tests', en: 'tickets' },
            free: { ru: 'бесплатно', es: 'gratis', en: 'free' },
            locked: { ru: 'заблокировано', es: 'bloqueado', en: 'locked' },
            start: { ru: 'Начать', es: 'Empezar', en: 'Start' },
            premium: { ru: 'Премиум', es: 'Premium', en: 'Premium' },
            unlockAll: { ru: 'Разблокировать всё', es: 'Desbloquear todo', en: 'Unlock all' },
        };
        return labels[key]?.[language] ?? labels[key]?.['en'] ?? key;
    };

    const content = (
        <div className="flex flex-col gap-5">
            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="w-4 h-4" />
                    <span className="font-semibold">{topicCount} {label('questions')}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-semibold">{tickets.length} {label('tickets')}</span>
                </div>
                {lockedCount > 0 && (
                    <>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex items-center gap-1.5 text-amber-500">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="font-semibold text-xs">{lockedCount} {label('locked')}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Ticket grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {tickets.map((ticket) => (
                    <button
                        key={ticket.index}
                        onClick={() => handleTicketClick(ticket)}
                        className={cn(
                            "relative aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1",
                            "transition-all duration-150 active:scale-95",
                            ticket.locked
                                ? "bg-muted/30 border-border/50 opacity-60 hover:opacity-80"
                                : "bg-card border-border hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                        )}
                    >
                        {ticket.locked ? (
                            <>
                                <Lock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs font-bold text-muted-foreground">{ticket.index + 1}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-2xl font-black text-foreground">{ticket.index + 1}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {label('ticket')}
                                </span>
                            </>
                        )}
                        {ticket.index === 0 && !isPremium && isSpain && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Upsell banner for free users */}
            {lockedCount > 0 && (
                <button
                    onClick={() => openModal('PAYWALL')}
                    className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 hover:from-amber-500/15 hover:to-orange-500/15 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15">
                            <Lock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-foreground text-sm">{lockedCount} {label('tickets')} {label('locked')}</p>
                            <p className="text-xs text-muted-foreground">{label('unlockAll')}</p>
                        </div>
                    </div>
                    <span className="text-sm font-bold text-amber-500 shrink-0">{label('premium')} →</span>
                </button>
            )}
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-background">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                        <DialogTitle className="text-xl font-black text-foreground leading-snug">
                            {topicName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto px-6 py-5">
                        {content}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-background max-h-[85vh]">
                <DrawerHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
                    <DrawerTitle className="text-xl font-black text-foreground leading-snug text-left">
                        {topicName}
                    </DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-5 py-5 pb-8">
                    {content}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
