import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


/**
 * Страница обработки Paddle checkout
 * Paddle редиректит на /purchase?_ptxn=txn_xxx после создания транзакции
 * Эта страница проверяет статус транзакции и редиректит на success/cancel
 * 
 * КРИТИЧНО: Не используем Layout, так как эта страница должна работать
 * без авторизации (Paddle редиректит сюда до оплаты)
 */
export default function Purchase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processPurchase = async () => {
      // Paddle использует параметр _ptxn для transaction_id
      const ptxn = searchParams.get("_ptxn");
      const txId = searchParams.get("transaction_id");

      const finalTransactionId = ptxn || txId;

      if (!finalTransactionId) {
        console.warn("[Purchase] No transaction ID in URL");
        navigate("/purchase/cancel", { replace: true });
        return;
      }

      console.log("[Purchase] Processing Paddle transaction:", finalTransactionId);

      // Paddle редиректит на /purchase с параметром _ptxn после создания транзакции
      // После оплаты Paddle редиректит на return_url с transaction_id
      // Мы редиректим на success страницу с transaction_id
      // PaymentSuccess страница сама проверит статус через webhook или API

      // Сохраняем transaction_id для PaymentSuccess (на случай если редирект потеряет параметр)
      sessionStorage.setItem('paddle_transaction_id', finalTransactionId);
      localStorage.setItem('paddle_transaction_id', finalTransactionId);

      // Редиректим на success страницу
      navigate(`/purchase/success?transaction_id=${finalTransactionId}`, { replace: true });
    };

    processPurchase();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <svg className="w-12 h-12 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Обработка платежа...</h1>
          <p className="text-zinc-400">
            Перенаправление на страницу подтверждения...
          </p>
        </div>
      </div>
    </div>
  );
}

