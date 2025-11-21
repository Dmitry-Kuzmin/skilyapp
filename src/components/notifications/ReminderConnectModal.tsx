import { UnifiedModal } from '@/components/ui/unified-modal';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, Clock, Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReminderConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReminderConnectModal({ open, onOpenChange }: ReminderConnectModalProps) {
  const handleConnect = () => {
    // TODO: Реализовать подключение к Telegram боту для напоминаний
    // Пока просто закрываем модалку
    onOpenChange(false);
  };

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title="Получайте напоминания"
      showTitleBar={false}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
            <Bell className="w-5 h-5 text-primary" />
            Получайте напоминания
        </div>
        <p className="text-sm text-muted-foreground">
            Подключите Telegram бота, чтобы не пропустить важные события
        </p>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Что вы будете получать:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Ежедневные напоминания о тренировке</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Trophy className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Уведомления о новых наградах Duel Pass</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Предупреждения о потере streak</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Приглашения на дуэли от друзей</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button 
            onClick={handleConnect}
            className="w-full"
            size="lg"
          >
            <Bell className="w-4 h-4 mr-2" />
            Подключить Telegram бота
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Вы сможете отключить уведомления в любой момент в настройках
          </p>
        </div>
    </UnifiedModal>
  );
}

