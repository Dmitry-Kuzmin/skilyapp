import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { usePremium } from "@/hooks/usePremium";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refresh } = usePremium();
  const isPopup = window.opener !== null;

  useEffect(() => {
    // Если открыто в попапе, отправляем сообщение родительскому окну
    if (isPopup) {
      window.opener?.postMessage({ type: 'STRIPE_SUCCESS' }, window.location.origin);
      // Закрываем попап через небольшую задержку
      setTimeout(() => {
        window.close();
      }, 2000);
    }

    // Обновляем Premium статус после успешной оплаты
    refresh();
  }, [refresh, isPopup]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Оплата успешна! 🎉</h1>
            <p className="text-muted-foreground text-lg">
              Спасибо за покупку! {isPopup ? 'Монеты добавлены на ваш баланс.' : 'Ваш Premium доступ активирован.'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
            <h2 className="font-semibold text-lg">Что дальше?</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Полный доступ ко всем курсам и тестам</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>+50% монет за обучение</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Без рекламы и мгновенные подсказки</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Ежемесячный бонус монет</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/")} size="lg">
              На главную
            </Button>
            <Button onClick={() => navigate("/tests")} variant="outline" size="lg">
              Начать обучение
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}



