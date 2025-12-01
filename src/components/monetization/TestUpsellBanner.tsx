import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Crown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useModal } from '@/hooks/useModal';
import { PaywallModal } from './PaywallModal';
import { useState } from 'react';

interface TestUpsellBannerProps {
  trigger: 'low_coins' | 'failed_tests' | 'attempt_limit';
  coins?: number;
  failedCount?: number;
}

export function TestUpsellBanner({ trigger, coins, failedCount }: TestUpsellBannerProps) {
  const { openModal: openBoostShop } = useModal('BOOST_SHOP');
  const [paywallOpen, setPaywallOpen] = useState(false);

  const getContent = () => {
    switch (trigger) {
      case 'low_coins':
        return {
          title: 'Монет не хватает',
          description: `У тебя ${coins || 0} монет. Пополни баланс, чтобы продолжить!`,
          cta: 'Пополнить',
          action: () => openBoostShop(),
          icon: Zap,
          color: 'text-yellow-500'
        };
      case 'failed_tests':
        return {
          title: 'Ты уже близко!',
          description: `Не сдавайся! Premium ускорит твой прогресс и даст больше возможностей.`,
          cta: 'Ускорить прогресс',
          action: () => setPaywallOpen(true),
          icon: TrendingUp,
          color: 'text-primary'
        };
      case 'attempt_limit':
        return {
          title: 'Достигнут лимит попыток',
          description: 'Premium открывает безлимитный доступ ко всем тестам!',
          cta: 'Получить Premium',
          action: () => setPaywallOpen(true),
          icon: Crown,
          color: 'text-yellow-500'
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  const Icon = content.icon;

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-primary/10 ${content.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{content.title}</h4>
              {trigger === 'attempt_limit' && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none text-xs">
                  Premium
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{content.description}</p>
            <Button 
              size="sm" 
              onClick={content.action}
              className="mt-1"
            >
              {content.cta}
            </Button>
          </div>
        </div>
      </Card>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}

