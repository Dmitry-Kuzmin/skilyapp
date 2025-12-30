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
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="relative max-w-sm w-full"
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
            className="h-8 w-8 flex-shrink-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
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
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: index * 80 }}
            exit={{ opacity: 0, x: 100 }}
            className="pointer-events-auto"
          >
            <NotificationToast
              {...notification}
              onClose={() => onClose(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
