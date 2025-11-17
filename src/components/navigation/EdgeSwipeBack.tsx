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
    startRef.current = { x: t.clientX, y: t.clientY, active: true };
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!startRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = Math.abs(t.clientY - startRef.current.y);
    if (dx > 80 && dy < 40) {
      startRef.current.active = false;
      navigate(-1);
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
        zIndex: 9999,
        touchAction: "pan-y",
        background: "transparent",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={reset}
      onTouchCancel={reset}
      aria-hidden="true"
    />
  );
};






