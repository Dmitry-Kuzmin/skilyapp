import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { toast } from "@/lib/toast";


interface CryptomusPaymentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentUrl: string;
  orderId: string;
  amount: number;
  currency: string;
  itemName: string;
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export function CryptomusPaymentPreview({
  open,
  onOpenChange,
  paymentUrl,
  orderId,
  amount,
  currency,
  itemName,
  onPaymentComplete,
  onCancel,
}: CryptomusPaymentPreviewProps) {
  const { t } = useLanguage();
  const { profileId, platform } = useUserContext();
  const [isNavigating, setIsNavigating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const [checkingInterval, setCheckingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open || !orderId || !profileId) return;

    console.log("[CryptomusPaymentPreview] Started monitoring payment:", orderId);

    // Начинаем проверку статуса через 5 секунд после открытия
    const startChecking = setTimeout(() => {
      checkPaymentStatus();

      // Проверяем каждые 10 секунд
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 10000);

      setCheckingInterval(interval);
    }, 5000);

    return () => {
      clearTimeout(startChecking);
      if (checkingInterval) {
        clearInterval(checkingInterval);
      }
    };
  }, [open, orderId, profileId]);

  const checkPaymentStatus = async () => {
    if (!profileId || !orderId) return;

    try {
      // Только визуально показываем проверку, не блокируя UI
      setPaymentStatus('checking');

      const { data, error } = await supabase
        .from('purchases')
        .select('status, cryptomus_order_id')
        .eq('user_id', profileId)
        .eq('cryptomus_order_id', orderId)
        .maybeSingle();

      if (error) {
        console.error('[CryptomusPaymentPreview] Error checking status:', error);
        return;
      }

      if (data?.status === 'completed') {
        setPaymentStatus('completed');
        if (checkingInterval) {
          clearInterval(checkingInterval);
        }

        toast({
          title: t('cryptomusPayment.paymentCompleted'),
          variant: "default",
        });

        // Вызываем callback успеха
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete();
          }
          onOpenChange(false);
        }, 2000);
      } else if (data?.status === 'failed' || data?.status === 'cancelled') {
        setPaymentStatus('failed');
        if (checkingInterval) {
          clearInterval(checkingInterval);
        }
      } else {
        // Если статус все еще pending, возвращаем в обычное состояние ожидания
        setPaymentStatus('pending');
      }
    } catch (error) {
      console.error('[CryptomusPaymentPreview] Error checking payment status:', error);
      setPaymentStatus('pending');
    }
  };

  const handleProceedToPayment = () => {
    setIsNavigating(true);

    const webApp = getTelegramWebApp();
    const isTelegram = platform === 'telegram' && isTelegramMiniApp();

    // КРИТИЧНО: В Telegram Mini App используем window.location.href
    // вместо webApp.openLink(), чтобы сохранить контекст приложения
    if (isTelegram && webApp) {
      console.log("[CryptomusPaymentPreview] Opening payment in Telegram Mini App (same context)");
      window.location.href = paymentUrl;
    } else {
      console.log("[CryptomusPaymentPreview] Redirecting to payment");
      window.location.href = paymentUrl;
    }
  };

  const handleCancel = () => {
    if (checkingInterval) {
      clearInterval(checkingInterval);
    }
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('cryptomusPayment.title')}
      description={t('cryptomusPayment.description')}
      className="max-w-md"
    >
      <div className="p-4 sm:p-6 space-y-4">
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('cryptomusPayment.detailsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('cryptomusPayment.item')}:</span>
              <span className="font-medium">{itemName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('cryptomusPayment.amount')}:</span>
              <span className="font-bold text-lg">
                {typeof amount === 'number' ? amount.toFixed(2) : Number(amount || 0).toFixed(2)} {currency.toUpperCase()}
              </span>
            </div>

            {/* Статус проверки оплаты */}
            {paymentStatus === 'checking' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t('cryptomusPayment.checkingStatus')}</span>
              </div>
            )}

            {paymentStatus === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('cryptomusPayment.paymentCompleted')}</span>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="flex items-center gap-2 text-sm text-red-600 pt-2 border-t">
                <XCircle className="h-4 w-4" />
                <span>{t('cryptomusPayment.paymentFailed')}</span>
              </div>
            )}

            {/* Информация о безопасности */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">
                {t('cryptomusPayment.securityInfo')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Кнопки действий */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isNavigating || paymentStatus === 'completed'}
            className="flex-1 h-11"
          >
            {t('cryptomusPayment.cancel')}
          </Button>
          <Button
            onClick={handleProceedToPayment}
            disabled={isNavigating || paymentStatus === 'completed'}
            className="flex-1 h-11"
          >
            {isNavigating ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('cryptomusPayment.navigating')}
              </>
            ) : (
              t('cryptomusPayment.proceedToPayment')
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}


