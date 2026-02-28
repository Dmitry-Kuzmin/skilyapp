import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isTelegramMiniApp } from "@/lib/telegram";

const EDGE_ZONE_PX = 16;

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

  const startRef = useRef({ x: 0, y: 0, active: false });

  const isRoot = location.pathname === "/";
  if (!enabled || isRoot) return null;

  const shouldHandle = location.pathname.includes("/duel") || isTelegramMiniApp();
  if (!shouldHandle) return null;

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    // КРИТИЧНО: Исключаем область навигации (нижние 100px экрана) из обработки жестов
    const isInNavArea = t.clientY >= window.innerHeight - 100;
    if (t.clientX <= EDGE_ZONE_PX && !isInNavArea) {
      startRef.current = { x: t.clientX, y: t.clientY, active: true };
      e.stopPropagation();
    }
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = Math.abs(t.clientY - startRef.current.y);
    if (dx > 60 && dy < 50) {
      startRef.current.active = false;
      e.preventDefault();
      e.stopPropagation();
      // Для дуэли - НЕ обрабатываем здесь, DuelBattleFullscreen сам обработает свайп
      // и покажет модалку подтверждения
      if (location.pathname.includes("/duel") || location.pathname.includes("/games/duel")) {
        // Не обрабатываем - DuelBattleFullscreen покажет модалку
        return;
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
        width: EDGE_ZONE_PX,
        height: "calc(100vh - 100px)", // КРИТИЧНО: Исключаем нижние 100px (область навигации)
        zIndex: 5, // КРИТИЧНО: Низкий z-index чтобы НЕ блокировать клики по навигации (z-index: 100)
        touchAction: "pan-y", // Разрешаем вертикальный скролл
        background: "transparent",
        pointerEvents: "auto",
        // КРИТИЧНО: Исключаем область навигации из pointer events
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 100px), 0 calc(100% - 100px))",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={reset}
      onTouchCancel={reset}
      aria-hidden="true"
    />
  );
};






