import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { isTelegramMiniApp } from '@/lib/telegram';

/**
 * Умный PWA-промпт: показывается только на iOS Safari (мобайл).
 * Скрывается на:
 * - десктопе (любой)
 * - Telegram Mini App
 * - Android (там используется BeforeInstallPromptEvent)
 * - если уже установлено (standalone mode)
 * - если пользователь уже закрыл (localStorage)
 */

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_TTL_DAYS = 14; // повторный показ через 2 недели

function isIosSafariMobile(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|od|ad)/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  return isIOS && isSafari;
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true)
  );
}

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const days = (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_TTL_DAYS;
  } catch {
    return false;
  }
}

export function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const shouldShow =
      isIosSafariMobile() &&
      !isStandaloneMode() &&
      !isTelegramMiniApp() &&
      !wasDismissedRecently();

    if (shouldShow) {
      // Показываем через 3 секунды — не сразу, чтобы не пугать
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div
        className="relative rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(15, 16, 20, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Закрыть */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Закрыть"
        >
          <X size={14} className="text-white/70" />
        </button>

        <div className="flex items-start gap-4 p-4 pr-10">
          {/* Иконка */}
          <div
            className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Smartphone size={26} className="text-white" />
          </div>

          {/* Текст */}
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">
              Добавьте Skily на экран «Домой»
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Быстрый доступ без браузера. Работает как приложение.
            </p>

            {/* Инструкция */}
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <span className="shrink-0 text-base">①</span>
                <span>
                  Нажмите{' '}
                  <span className="inline-flex items-center gap-0.5 bg-white/10 rounded px-1 py-0.5 font-mono text-[10px]">
                    ⎙
                  </span>{' '}
                  в панели Safari
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <span className="shrink-0 text-base">②</span>
                <span>
                  Выберите{' '}
                  <span className="text-indigo-400 font-medium">«На экран "Домой"»</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
