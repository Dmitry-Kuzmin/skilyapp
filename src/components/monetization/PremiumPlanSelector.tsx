import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { 
  Crown, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Star, 
  Gift, 
  Infinity,
  Trophy,
  Coins,
  Shield,
  Clock,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface PremiumPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerSource?: 'duel_pass' | 'settings' | 'paywall';
}

export function PremiumPlanSelector({ open, onOpenChange, triggerSource = 'duel_pass' }: PremiumPlanSelectorProps) {
  const { profileId } = useUserContext();
  const { isPremium, refresh: refreshPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'lifetime' | 'monthly' | 'duel_pass' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Цены (в центах для Stripe, в Stars для Telegram)
  const PRICES = {
    lifetime: { cents: 5999, stars: 6000, display: "59.99€" },
    monthly: { cents: 999, stars: 1000, display: "9.99€" },
    duel_pass: { cents: 799, stars: 800, display: "7.99€" },
  };

  // Планы с описанием
  const plans = [
    {
      id: 'lifetime' as const,
      name: 'Premium Forever',
      subtitle: 'Лучшее предложение',
      icon: Infinity,
      price: PRICES.lifetime.display,
      priceStars: PRICES.lifetime.stars,
      badge: 'ПОПУЛЯРНО',
      badgeColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      features: [
        'Все функции навсегда',
        'Автоматический Duel Pass каждый сезон',
        '+500 монет при покупке',
        'Эксклюзивный бейдж "Lifetime Member"',
        'Приоритетная поддержка',
        'Ранний доступ к новым функциям',
        'Все будущие обновления',
      ],
      highlight: true,
    },
    {
      id: 'monthly' as const,
      name: 'Premium на месяц',
      subtitle: 'Для краткосрочной подготовки',
      icon: Clock,
      price: PRICES.monthly.display,
      priceStars: PRICES.monthly.stars,
      badge: null,
      badgeColor: '',
      gradient: 'from-blue-500 to-cyan-500',
      features: [
        'Все функции на 30 дней',
        'Duel Pass текущего сезона',
        'Премиум награды',
        'Безлимитные бусты',
      ],
      highlight: false,
    },
    {
      id: 'duel_pass' as const,
      name: 'Duel Pass (сезон)',
      subtitle: 'Только для текущего сезона',
      icon: Trophy,
      price: PRICES.duel_pass.display,
      priceStars: PRICES.duel_pass.stars,
      badge: 'ЭКОНОМИЯ',
      badgeColor: 'bg-green-500',
      gradient: 'from-yellow-500 to-orange-500',
      features: [
        'Premium награды на 28 дней',
        'Эксклюзивные скины и бейджи',
        'Ускоренная прогрессия',
        'Доступ только к текущему сезону',
      ],
      highlight: false,
    },
  ];

  const handlePurchase = async (planId: 'lifetime' | 'monthly' | 'duel_pass') => {
    if (!profileId) {
      toast.error('Ошибка: пользователь не найден');
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      if (planId === 'duel_pass') {
        // Покупка Duel Pass через Edge Function
        const { data, error } = await supabase.functions.invoke('duel-pass-purchase', {
          body: {
            user_id: profileId,
            payment_method: 'telegram_stars', // TODO: Реальная интеграция с Telegram Stars
          },
        });

        if (error) throw error;

        if (data?.success) {
          // Вау-эффект!
          triggerConfetti();
          toast.success('🎉 Duel Pass Premium активирован!', {
            description: 'Теперь у тебя есть доступ ко всем Premium наградам!',
            duration: 5000,
          });
          
          setTimeout(() => {
            onOpenChange(false);
            // Обновляем данные Premium
            refreshPremium();
          }, 2000);
        }
      } else {
        // Покупка Premium Forever или Monthly
        // TODO: Интеграция с Telegram Stars или Stripe
        toast.info('Интеграция с платежной системой в разработке', {
          description: 'Скоро можно будет купить Premium Forever!',
        });
        
        // Симуляция успешной покупки для тестирования UI
        if (planId === 'lifetime') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_type: 'lifetime',
              subscription_status: 'pro',
              premium_forever_purchased_at: new Date().toISOString(),
            })
            .eq('id', profileId);

          if (updateError) throw updateError;

          triggerConfetti();
          toast.success('🎉 Premium Forever активирован!', {
            description: 'Теперь у тебя есть доступ ко всем функциям навсегда!',
            duration: 5000,
          });

          setTimeout(() => {
            onOpenChange(false);
            refreshPremium();
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('[PremiumPlanSelector] Purchase error:', error);
      toast.error('Ошибка при покупке', {
        description: error.message || 'Попробуй еще раз',
      });
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#8A2BE2'],
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF6347', '#FF1493'],
      });
    }, 250);

    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Проверяем, имеет ли пользователь Premium Forever
  const [hasPremiumForever, setHasPremiumForever] = useState(false);
  
  useEffect(() => {
    if (open && profileId) {
      checkPremiumForever();
    }
  }, [open, profileId]);

  const checkPremiumForever = async () => {
    if (!profileId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_status')
      .eq('id', profileId)
      .single();
    
    const isLifetime = 
      (data?.subscription_type === 'lifetime' && data?.subscription_status === 'pro') ||
      data?.subscription_status === 'lifetime';
    
    setHasPremiumForever(isLifetime);
  };

  // Если у пользователя уже есть Premium Forever, показываем сообщение
  if (hasPremiumForever && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Premium Forever активен!
            </DialogTitle>
            <DialogDescription>
              У тебя уже есть Premium Forever подписка
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Infinity className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">Все функции навсегда</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Duel Pass Premium автоматически открывается для каждого сезона!
              </p>
            </div>
            
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Выбери свой план Premium
            </DialogTitle>
            <DialogDescription className="text-center">
              Получи максимум от обучения с Premium подпиской
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              const isPurchasing = loading && isSelected;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "relative rounded-xl border-2 p-6 transition-all cursor-pointer",
                    plan.highlight
                      ? "border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 shadow-lg scale-105"
                      : "border-border hover:border-primary/50",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => !loading && setSelectedPlan(plan.id)}
                >
                  {plan.badge && (
                    <Badge
                      className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2",
                        plan.badgeColor,
                        "text-white font-bold px-3 py-1"
                      )}
                    >
                      {plan.badge}
                    </Badge>
                  )}

                  <div className="text-center mb-4">
                    <div className={cn(
                      "inline-flex items-center justify-center w-16 h-16 rounded-full mb-3",
                      `bg-gradient-to-br ${plan.gradient}`
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold mb-1">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">
                      {plan.id === 'lifetime' ? 'Одна покупка навсегда' : 
                       plan.id === 'monthly' ? 'В месяц' : 
                       'За сезон'}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full font-semibold",
                      plan.highlight && "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(plan.id);
                    }}
                    disabled={loading}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        Купить
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            <p>
              💳 Оплата через Telegram Stars или банковскую карту
            </p>
            <p className="mt-1">
              🔒 Безопасные платежи. Возврат средств в течение 14 дней.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          />
        )}
      </AnimatePresence>
    </>
  );
}

