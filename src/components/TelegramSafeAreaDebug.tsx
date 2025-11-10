import { useEffect, useState } from "react";
import { isTelegramMiniApp } from "@/lib/telegram";

/**
 * Компонент визуальной отладки Safe Area для Telegram Mini App
 * Показывает красные зоны где НЕ должно быть контента
 * УБРАТЬ ПЕРЕД ПРОДАКШЕНОМ!
 */
export function TelegramSafeAreaDebug() {
  const [safeArea, setSafeArea] = useState({ top: '0px', bottom: '0px', left: '0px', right: '0px' });
  const isTelegram = isTelegramMiniApp();

  useEffect(() => {
    if (!isTelegram) return;

    const updateSafeArea = () => {
      const top = getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-top') || '0px';
      const bottom = getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-bottom') || '0px';
      const left = getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-left') || '0px';
      const right = getComputedStyle(document.documentElement).getPropertyValue('--tg-content-safe-area-inset-right') || '0px';
      
      setSafeArea({ top, bottom, left, right });
    };

    updateSafeArea();
    
    // Обновляем при изменении
    const observer = new MutationObserver(updateSafeArea);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, [isTelegram]);

  if (!isTelegram) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Top safe area */}
      {safeArea.top !== '0px' && (
        <div 
          className="absolute top-0 left-0 right-0 bg-red-500/20 border-b-2 border-red-500 flex items-center justify-center"
          style={{ height: safeArea.top }}
        >
          <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-mono">
            TOP: {safeArea.top}
          </div>
        </div>
      )}
      
      {/* Bottom safe area */}
      {safeArea.bottom !== '0px' && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-red-500/20 border-t-2 border-red-500 flex items-center justify-center"
          style={{ height: safeArea.bottom }}
        >
          <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-mono">
            BOTTOM: {safeArea.bottom}
          </div>
        </div>
      )}
      
      {/* Left safe area */}
      {safeArea.left !== '0px' && (
        <div 
          className="absolute top-0 bottom-0 left-0 bg-red-500/20 border-r-2 border-red-500 flex items-center justify-center"
          style={{ width: safeArea.left }}
        >
          <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[10px] font-mono writing-mode-vertical">
            LEFT: {safeArea.left}
          </div>
        </div>
      )}
      
      {/* Right safe area */}
      {safeArea.right !== '0px' && (
        <div 
          className="absolute top-0 bottom-0 right-0 bg-red-500/20 border-l-2 border-red-500 flex items-center justify-center"
          style={{ width: safeArea.right }}
        >
          <div className="bg-red-500 text-white px-1 py-0.5 rounded text-[10px] font-mono writing-mode-vertical">
            RIGHT: {safeArea.right}
          </div>
        </div>
      )}
      
      {/* Info panel */}
      <div className="absolute top-20 left-4 bg-black/80 text-white p-2 rounded text-[10px] font-mono pointer-events-auto">
        <div className="font-bold mb-1">🔍 Safe Area Debug</div>
        <div>Top: {safeArea.top}</div>
        <div>Bottom: {safeArea.bottom}</div>
        <div>Left: {safeArea.left}</div>
        <div>Right: {safeArea.right}</div>
        <div className="mt-1 text-red-300">⚠️ Убрать перед продакшеном!</div>
      </div>
    </div>
  );
}

