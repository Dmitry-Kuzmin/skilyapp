import { TonConnectButton as TonConnectUIBtn } from '@ton/appkit-react';
import { Card } from '@/components/ui/card';

export const TonConnectButton = () => {
    return (
        <Card className="p-4 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 shadow-lg backdrop-blur-sm">
            <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-blue-400">TON Wallet</h3>
                <p className="text-xs text-muted-foreground">Подключи кошелек для оплаты звездами и получения бонусов</p>
            </div>
            <div className="ton-connect-wrapper">
                <TonConnectUIBtn />
            </div>
            <style>{`
        .ton-connect-wrapper button {
          background-color: #0088cc !important;
          color: white !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease-in-out !important;
        }
        .ton-connect-wrapper button:hover {
          transform: scale(1.02);
          filter: brightness(1.1);
        }
      `}</style>
        </Card>
    );
};
