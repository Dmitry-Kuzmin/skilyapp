import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";

export const TelegramNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isTelegramMiniApp()) return;
    
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    const isMainScreen = location.pathname === "/";

    // BackButton handling
    if (isMainScreen) {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(() => {
        navigate(-1);
      });
    }

    // MainButton for "Close" on main screen
    if (isMainScreen) {
      webApp.MainButton.setText("Закрыть");
      webApp.MainButton.show();
      webApp.MainButton.onClick(() => {
        webApp.close();
      });
    } else {
      webApp.MainButton.hide();
    }

    // Cleanup
    return () => {
      webApp.BackButton.offClick(() => {});
      webApp.MainButton.offClick(() => {});
    };
  }, [location.pathname, navigate]);

  return null; // This component only manages Telegram WebApp buttons
};
