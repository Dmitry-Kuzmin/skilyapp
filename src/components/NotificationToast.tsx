import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { X } from 'lucide-react';

interface NotificationToastProps {
  title: string;
  message: string;
  icon?: string;
  type?: 'opponent-correct' | 'opponent-wrong' | 'opponent-skip' | 'points' | 'combo' | 'info';
  onClose: () => void;
}

const typeStyles: Record<NonNullable<NotificationToastProps['type']>, { border: string; glow: string; iconBg: string }> = {
  'opponent-correct': { border: 'border-amber-400/40', glow: 'shadow-amber-500/20', iconBg: 'bg-amber-500/15' },
  'opponent-wrong':   { border: 'border-emerald-400/40', glow: 'shadow-emerald-500/20', iconBg: 'bg-emerald-500/15' },
  'opponent-skip':    { border: 'border-slate-400/40', glow: 'shadow-slate-500/20', iconBg: 'bg-slate-500/15' },
  'points':           { border: 'border-emerald-400/40', glow: 'shadow-emerald-500/25', iconBg: 'bg-emerald-500/15' },
  'combo':            { border: 'border-orange-400/50', glow: 'shadow-orange-500/30', iconBg: 'bg-orange-500/15' },
  'info':             { border: 'border-primary/30', glow: 'shadow-primary/20', iconBg: 'bg-primary/15' },
};

export function NotificationToast({ title, message, icon, type = 'info', onClose }: NotificationToastProps) {
  const style = typeStyles[type] || typeStyles.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, x: 40, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 60) onClose();
      }}
      onTap={(_, info) => {
        // Tap (no significant drag) anywhere on the card dismisses
        if (Math.abs(info.offset?.x ?? 0) < 8 && Math.abs(info.offset?.y ?? 0) < 8) {
          onClose();
        }
      }}
      className="relative max-w-sm w-full cursor-pointer touch-none select-none"
    >
      <div className={`bg-card border-2 ${style.border} rounded-2xl shadow-2xl ${style.glow} p-3.5 pr-2 backdrop-blur-xl overflow-hidden`}>
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0 text-2xl`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="font-bold text-sm mb-0.5 line-clamp-1 leading-tight">{title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{message}</p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Закрыть"
            className="h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-destructive/15 transition-colors -mr-1 -mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface NotificationToastContainerProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    icon?: string;
  }>;
  onClose: (id: string) => void;
}

export function NotificationToastContainer({ notifications, onClose }: NotificationToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
          >
            <NotificationToast
              {...notification}
              onClose={() => onClose(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
