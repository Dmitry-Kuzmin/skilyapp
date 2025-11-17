import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";

// EdgeSwipeBack component handles left-edge swipe gesture to navigate back.
// It is enabled for Telegram Mini App users and mobile screens, except on the root path.
export const EdgeSwipeBack: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [enabled, setEnabled] = useState(() => {
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

  const isRoot = location.pathname === "/";
  if (!enabled || isRoot) return null;

  const startRef = useRef({ x: 0, y: 0, active: false });

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    // Проверяем, что касание началось в левой части экрана (первые 24px)
    if (t.clientX <= 24) {
      startRef.current = { x: t.clientX, y: t.clientY, active: true };
      e.stopPropagation(); // Останавливаем всплытие, чтобы не конфликтовать с другими элементами
    }
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = Math.abs(t.clientY - startRef.current.y);
    // Улучшенная логика: свайп вправо (dx > 60) с небольшим вертикальным отклонением
    if (dx > 60 && dy < 50) {
      startRef.current.active = false;
      e.preventDefault(); // Предотвращаем конфликты с другими жестами
      e.stopPropagation(); // Останавливаем всплытие события
      
      // Специальная обработка для дуэли
      if (location.pathname.includes('/duel') || location.pathname.includes('/games/duel')) {
        console.log('[EdgeSwipeBack] Exiting duel via swipe');
        navigate('/games');
      } else {
        navigate(-1);
      }
    }
  };

  const reset = () => {
    startRef.current.active = false;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 24,
        height: "100vh",
        zIndex: 99999, // Увеличиваем z-index чтобы быть выше всех элементов дуэли
        touchAction: "pan-y", // Разрешаем только вертикальный скролл, горизонтальный обрабатываем сами
        background: "transparent",
        pointerEvents: "auto", // Убеждаемся, что элемент может получать события
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={reset}
      onTouchCancel={reset}
      aria-hidden="true"
    />
  );
};






