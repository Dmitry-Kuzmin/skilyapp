/**
 * PWA Version Check - проверка версий и обновление
 * 
 * Решает проблему: старый index.html пытается загрузить новые chunks.
 * 
 * Стратегия:
 * 1. Защита от двойных reload через флаг
 * 2. Показываем баннер "Обновить сейчас / Позже" (optional, можно добавить)
 * 3. Автообновление только для критических ошибок (chunk loading)
 */

// Флаг для защиты от повторных reload
let hasReloaded = false;

// Callback для показа UI уведомления
let onUpdateAvailable: (() => void) | null = null;

export function initPWAVersionCheck(callbacks?: {
  onUpdateAvailable?: () => void;
}) {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA Version] Service Worker not supported');
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[PWA Version] Skipping version check in dev mode');
    return;
  }

  // Сохраняем callback если передан
  if (callbacks?.onUpdateAvailable) {
    onUpdateAvailable = callbacks.onUpdateAvailable;
  }

  // ВАЖНО: controllerchange срабатывает когда новый SW активируется
  // Это единственное место где делаем reload
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA Version] 🔄 New Service Worker activated');
    
    // Защита от повторных reload
    if (hasReloaded) {
      console.log('[PWA Version] Already reloaded, skipping');
      return;
    }
    
    // КРИТИЧНО: Проверяем что это НЕ первая регистрация
    const isFirstActivation = !navigator.serviceWorker.controller;
    
    if (!isFirstActivation) {
      console.log('[PWA Version] 🔄 Reloading page for new version');
      hasReloaded = true;
      window.location.reload();
    }
  });

  // КРИТИЧНО: Если chunk не загружается - это version mismatch
  // Только здесь делаем принудительный reload
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLScriptElement | null;
    
    // Проверяем ошибки загрузки скриптов
    if (target && target.tagName === 'SCRIPT') {
      const src = target.src || '';
      
      // Если это наш chunk (содержит /assets/) и не загрузился
      if (src.includes('/assets/') && src.includes(window.location.origin)) {
        console.error('[PWA Version] ❌ Failed to load chunk:', src);
        
        // Защита от повторных reload
        if (hasReloaded) {
          console.error('[PWA Version] Already reloaded, cannot recover');
          return;
        }
        
        console.log('[PWA Version] This might be a version mismatch. Checking...');
        
        // Проверяем Service Worker
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting) {
            console.log('[PWA Version] 🔄 New SW waiting - activating');
            // Активируем waiting SW (это вызовет controllerchange)
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else if (navigator.onLine) {
            console.log('[PWA Version] 🔄 Online and chunk failed - hard reload');
            hasReloaded = true;
            window.location.reload();
          } else {
            console.error('[PWA Version] ❌ Offline and chunk failed - cannot recover');
            console.error('[PWA Version] Please reconnect and reload manually');
          }
        });
      }
    }
  }, true);

  console.log('[PWA Version] ✅ Version check initialized');
}

/**
 * Функция для ручного обновления (для UI баннера)
 * Можно вызвать из компонента "Обновить сейчас"
 */
export function reloadForUpdate() {
  if (hasReloaded) {
    console.warn('[PWA Version] Already reloaded, skipping manual reload');
    return;
  }
  
  console.log('[PWA Version] 🔄 Manual reload triggered');
  hasReloaded = true;
  window.location.reload();
}

