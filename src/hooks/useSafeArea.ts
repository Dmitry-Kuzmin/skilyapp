import { useEffect, useState } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
  platform: string;
  contentTop: number;
  contentBottom: number;
}

export function useSafeArea() {
  const [safeArea, setSafeArea] = useState<SafeArea>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    platform: "unknown",
    contentTop: 0,
    contentBottom: 0,
  });

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) {
      console.warn("[useSafeArea] Telegram WebApp API не найден");
      return;
    }

    webApp.ready();

    const updateSafeArea = () => {
      const platform = webApp.platform || "unknown";
      const isMobile = platform === "ios" || platform === "android";

      // Системные safe areas (Dynamic Island, статус-бар, home indicator)
      // Используем прямые свойства viewportSafeAreaInset* если они доступны, иначе fallback на safeAreaInset
      const top = (webApp as any).viewportSafeAreaInsetTop ?? webApp.safeAreaInset?.top ?? 0;
      const bottom = (webApp as any).viewportSafeAreaInsetBottom ?? webApp.safeAreaInset?.bottom ?? 0;
      const left = (webApp as any).viewportSafeAreaInsetLeft ?? webApp.safeAreaInset?.left ?? 0;
      const right = (webApp as any).viewportSafeAreaInsetRight ?? webApp.safeAreaInset?.right ?? 0;

      // Content safe areas (отступы от нативной панели Telegram)
      // Для мобильных используем contentSafeAreaInset, для десктопа - 0
      // УМЕНЬШАЕМ В 2 РАЗА, как просил пользователь
      let contentTop = 0;
      let contentBottom = 0;

      if (isMobile) {
        if (webApp.contentSafeAreaInset) {
          // Уменьшаем в 2 раза
          contentTop = Math.round((webApp.contentSafeAreaInset.top || 0) / 2);
          contentBottom = Math.round((webApp.contentSafeAreaInset.bottom || 0) / 2);
        } else if (webApp.safeAreaInset) {
          // Fallback: используем safeAreaInset если contentSafeAreaInset недоступен
          // Уменьшаем в 2 раза
          contentTop = Math.round((webApp.safeAreaInset.top || 0) / 2);
          contentBottom = Math.round((webApp.safeAreaInset.bottom || 0) / 2);
        }
      }
      // Для десктопа contentTop и contentBottom остаются 0

      setSafeArea({
        top,
        bottom,
        left,
        right,
        platform,
        contentTop,
        contentBottom,
      });

      // Logging disabled to reduce console noise
      // Logging disabled to reduce console noise
      // console.log("[useSafeArea] ✅ Updated safe area:", {
      //   platform,
      //   isMobile,
      //   top,
      //   bottom,
      //   left,
      //   right,
      //   contentTop: `${contentTop}px (уменьшено в 2 раза)`,
      //   contentBottom: `${contentBottom}px (уменьшено в 2 раза)`,
      //   totalTop: `${top + contentTop}px`,
      //   safeAreaInset: webApp.safeAreaInset,
      //   contentSafeAreaInset: webApp.contentSafeAreaInset,
      //   webAppReady: webApp.isExpanded,
      // });
    };

    // Инициализация
    updateSafeArea();

    // КРИТИЧЕСКИ ВАЖНО: слушаем оба варианта имени события
    // viewport_changed - официальное событие Telegram (iOS/macOS)
    // viewportChanged - альтернативное имя (может использоваться в некоторых версиях)
    webApp.onEvent("viewport_changed", updateSafeArea);
    webApp.onEvent("viewportChanged", updateSafeArea);
    webApp.onEvent("safeAreaChanged", updateSafeArea);
    webApp.onEvent("contentSafeAreaChanged", updateSafeArea);

    return () => {
      webApp.offEvent("viewport_changed", updateSafeArea);
      webApp.offEvent("viewportChanged", updateSafeArea);
      webApp.offEvent("safeAreaChanged", updateSafeArea);
      webApp.offEvent("contentSafeAreaChanged", updateSafeArea);
    };
  }, []);

  return safeArea;
}

