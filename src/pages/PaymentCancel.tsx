import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Оплата отменена</h1>
            <p className="text-muted-foreground text-lg">
              Вы отменили процесс оплаты. Ничего не было списано с вашей карты.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
            <h2 className="font-semibold text-lg">Хотите попробовать снова?</h2>
            <p className="text-sm text-muted-foreground">
              Вы можете вернуться и завершить покупку в любое время. Premium открывает все возможности приложения!
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/")} size="lg">
              На главную
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" size="lg">
              Вернуться назад
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}



