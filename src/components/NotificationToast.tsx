import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationToastProps {
  title: string;
  message: string;
  icon?: string;
  onClose: () => void;
}

export function NotificationToast({ title, message, icon, onClose }: NotificationToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 400, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.95 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) {
          onClose();
        }
      }}
      className="relative max-w-sm w-full cursor-grab active:cursor-grabbing"
    >
      <div className="bg-card border-2 border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-2xl">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm mb-1 line-clamp-1">{title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/50">
          Свайп →
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
