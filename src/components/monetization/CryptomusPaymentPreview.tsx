import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserContext } from "@/contexts/UserContext";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";
import { createClient } from "@supabase/supabase-js";

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
  const { profileId, platform } = useUserContext();
  const [isNavigating, setIsNavigating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const [checkingInterval, setCheckingInterval] = useState<NodeJS.Timeout | null>(null);

  // Polling для проверки статуса оплаты
  useEffect(() => {
    if (!open || !orderId || !profileId) return;

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
      setPaymentStatus('checking');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('purchases')
        .select('status, cryptomus_order_id')
        .eq('user_id', profileId)
        .eq('cryptomus_order_id', orderId)
        .single();

      if (error) {
        console.error('[CryptomusPaymentPreview] Error checking status:', error);
        return;
      }

      if (data?.status === 'completed') {
        setPaymentStatus('completed');
        if (checkingInterval) {
          clearInterval(checkingInterval);
        }
        
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
      }
    } catch (error) {
      console.error('[CryptomusPaymentPreview] Error checking payment status:', error);
    }
  };

  const handleProceedToPayment = () => {
    setIsNavigating(true);
    
    const webApp = getTelegramWebApp();
    const isTelegram = platform === 'telegram' && isTelegramMiniApp();

    // КРИТИЧНО: В Telegram Mini App используем window.location.href
    // вместо webApp.openLink(), чтобы сохранить контекст приложения
    // openLink() открывает новое Mini App и теряется контекст
    if (isTelegram && webApp) {
      console.log("[CryptomusPaymentPreview] Opening payment in Telegram Mini App (same context)");
      // Используем прямой редирект в том же Mini App
      window.location.href = paymentUrl;
    } else {
      // В обычном браузере тоже используем прямой редирект
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !max-h-none !overflow-visible"
      >
        <DialogHeader>
          <DialogTitle>Подтверждение оплаты</DialogTitle>
          <DialogDescription>
            Проверьте детали платежа перед переходом к оплате
          </DialogDescription>
        </DialogHeader>

        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Детали платежа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Товар:</span>
              <span className="font-medium">{itemName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Сумма:</span>
              <span className="font-bold text-lg">
                {typeof amount === 'number' ? amount.toFixed(2) : Number(amount || 0).toFixed(2)} {currency.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">ID заказа:</span>
              <span className="font-mono text-xs">{orderId}</span>
            </div>

            {/* Статус проверки оплаты */}
            {paymentStatus === 'checking' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Проверка статуса оплаты...</span>
              </div>
            )}

            {paymentStatus === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                <CheckCircle2 className="h-4 w-4" />
                <span>Оплата успешно завершена!</span>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="flex items-center gap-2 text-sm text-red-600 pt-2 border-t">
                <XCircle className="h-4 w-4" />
                <span>Оплата не завершена</span>
              </div>
            )}

            {/* Информация о безопасности */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">
                Оплата обрабатывается через защищенный сервис Cryptomus. 
                Ваши данные защищены.
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-4 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isNavigating || paymentStatus === 'completed'}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            onClick={handleProceedToPayment}
            disabled={isNavigating || paymentStatus === 'completed'}
            className="flex-1"
          >
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Переход...
              </>
            ) : (
              "Перейти к оплате"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

