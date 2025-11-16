import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";

/**
 * EdgeSwipeBack
 * Узкая невидимая зона слева, которая распознает горизонтальный свайп вправо
 * и выполняет навигацию назад. Активна в Telegram Mini App и/или на мобильных экранах.
 */
export const EdgeSwipeBack: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const areaRef = useRef<HTMLDivElement | null>(null);

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isSmallScreen = window.matchMedia?.("(max-width: 768px)")?.matches ?? true;
    return isTelegramMiniApp() || isSmallScreen;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      const isSmallScreen = window.matchMedia?.("(max-width: 768px)")?.matches ?? true;
      setEnabled(isTelegramMiniApp() || isSmallScreen);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Не показываем на корневом экране, чтобы не провоцировать ложные назад
  const isRoot = location.pathname === "/";
  if (!enabled || isRoot) return null;

  let startX = 0;
  let startY = 0;
  let active = false;

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    active = true;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!active) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    // Порог по горизонтали и ограничение вертикального отклонения
    if (dx > 80 && dy < 40) {
      active = false;
      navigate(-1);
    }
  };

  const onTouchEnd = () => {
    active = false;
  };

  return (
    <div
      ref={areaRef}
      // Узкая зона захвата у левого края. Высокий z-index, но pointer-events только на область.
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 24,
        height: "100vh",
        zIndex: 9999,
        // Разрешаем вертикальную прокрутку, чтобы не блокировать скролл;
        // горизонтальные жесты остаются детектируемыми
        touchAction: "pan-y",
        // Невидимая зона
        background: "transparent",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-hidden="true"
    />
  );
};



