/**
 * ServiceWorkerDebug - Debug панель для проверки SW статуса
 * 
 * Показывает детальную информацию о Service Worker в Telegram WebView.
 * Помогает диагностировать проблемы с offline режимом.
 */

import { useEffect, useState } from 'react';
import { Info, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SWStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  installing: boolean;
  waiting: boolean;
  scope?: string;
  scriptURL?: string;
  updateViaCache?: string;
  cacheCount?: number;
  idbAvailable?: boolean;
  online: boolean;
  userAgent: string;
}

export const ServiceWorkerDebug = () => {
  const [status, setStatus] = useState<SWStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const supported = 'serviceWorker' in navigator;
      const online = navigator.onLine;
      const userAgent = navigator.userAgent;
      
      let registered = false;
      let active = false;
      let installing = false;
      let waiting = false;
      let scope: string | undefined;
      let scriptURL: string | undefined;
      let updateViaCache: string | undefined;
      let cacheCount = 0;
      let idbAvailable = true;

      // Проверяем SW
      if (supported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registered = true;
            active = !!registration.active;
            installing = !!registration.installing;
            waiting = !!registration.waiting;
            scope = registration.scope;
            scriptURL = registration.active?.scriptURL;
            updateViaCache = registration.updateViaCache;
          }
        } catch (error) {
          console.error('[SW Debug] Failed to check SW:', error);
        }

        // Проверяем кэш
        try {
          const cacheNames = await caches.keys();
          cacheCount = cacheNames.length;
        } catch (error) {
          console.error('[SW Debug] Failed to check caches:', error);
        }
      }

      // Проверяем IndexedDB
      try {
        await indexedDB.databases();
      } catch (error) {
        idbAvailable = false;
      }

      setStatus({
        supported,
        registered,
        active,
        installing,
        waiting,
        scope,
        scriptURL,
        updateViaCache,
        cacheCount,
        idbAvailable,
        online,
        userAgent,
      });
    };

    checkStatus();

    // Обновляем статус при изменении online/offline
    const handleOnline = () => checkStatus();
    const handleOffline = () => checkStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Только в dev режиме или при localStorage flag
  if (import.meta.env.PROD && !localStorage.getItem('debug_sw')) {
    return null;
  }

  if (!status) return null;

  return (
    <>
      {/* Floating debug button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-zinc-800 border border-zinc-700 rounded-full shadow-lg hover:bg-zinc-700 transition-colors"
        aria-label="Service Worker Debug"
      >
        <Info className="w-5 h-5 text-white" />
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Service Worker Debug
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Online status */}
              <StatusRow
                label="Network"
                value={status.online ? 'Online' : 'Offline'}
                status={status.online ? 'success' : 'warning'}
              />

              {/* SW support */}
              <StatusRow
                label="SW Supported"
                value={status.supported ? 'Yes' : 'No'}
                status={status.supported ? 'success' : 'error'}
              />

              {/* SW registered */}
              <StatusRow
                label="SW Registered"
                value={status.registered ? 'Yes' : 'No'}
                status={status.registered ? 'success' : 'warning'}
              />

              {/* SW active */}
              <StatusRow
                label="SW Active"
                value={status.active ? 'Yes' : 'No'}
                status={status.active ? 'success' : 'error'}
              />

              {/* SW installing */}
              {status.installing && (
                <StatusRow
                  label="SW Installing"
                  value="Yes"
                  status="warning"
                />
              )}

              {/* SW waiting */}
              {status.waiting && (
                <StatusRow
                  label="SW Waiting"
                  value="Yes"
                  status="warning"
                />
              )}

              {/* Scope */}
              {status.scope && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Scope</p>
                  <p className="text-sm text-zinc-200 break-all font-mono">
                    {status.scope}
                  </p>
                </div>
              )}

              {/* Script URL */}
              {status.scriptURL && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-400">Script URL</p>
                  <p className="text-sm text-zinc-200 break-all font-mono">
                    {status.scriptURL}
                  </p>
                </div>
              )}

              {/* Cache count */}
              <StatusRow
                label="Cache Stores"
                value={`${status.cacheCount} stores`}
                status={status.cacheCount > 0 ? 'success' : 'warning'}
              />

              {/* IndexedDB */}
              <StatusRow
                label="IndexedDB"
                value={status.idbAvailable ? 'Available' : 'Blocked'}
                status={status.idbAvailable ? 'success' : 'error'}
              />

              {/* User Agent */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">User Agent</p>
                <p className="text-xs text-zinc-300 break-all font-mono">
                  {status.userAgent}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <button
                  onClick={async () => {
                    if (confirm('Clear all caches? This will force reload.')) {
                      const keys = await caches.keys();
                      await Promise.all(keys.map(key => caches.delete(key)));
                      window.location.reload();
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                  Clear All Caches
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(status, null, 2));
                    alert('Status copied to clipboard!');
                  }}
                  className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm font-medium"
                >
                  Copy Debug Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface StatusRowProps {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error';
}

const StatusRow = ({ label, value, status }: StatusRowProps) => {
  const Icon = status === 'success' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle;
  const color = status === 'success' ? 'text-emerald-500' : status === 'warning' ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-200">{value}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  );
};

