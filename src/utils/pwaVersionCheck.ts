/**
 * PWA Version Check - автоматическая проверка версий
 * 
 * Решает проблему: старый index.html пытается загрузить новые chunks.
 * Если Service Worker обновлён - автоматически перезагружаем страницу.
 */

export function initPWAVersionCheck() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA Version] Service Worker not supported');
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[PWA Version] Skipping version check in dev mode');
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA Version] 🔄 New Service Worker activated - reloading page');
    
    // КРИТИЧНО: Проверяем что это НЕ первая регистрация
    // (при первой регистрации тоже срабатывает controllerchange)
    const isFirstActivation = !navigator.serviceWorker.controller;
    
    if (!isFirstActivation) {
      // Новая версия активировалась - перезагружаем
      window.location.reload();
    }
  });

  // Дополнительная проверка: если видим 404 на chunks - это version mismatch
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLScriptElement | null;
    
    // Проверяем ошибки загрузки скриптов
    if (target && target.tagName === 'SCRIPT') {
      const src = target.src || '';
      
      // Если это наш chunk (содержит /assets/) и не загрузился
      if (src.includes('/assets/') && src.includes(window.location.origin)) {
        console.error('[PWA Version] ❌ Failed to load chunk:', src);
        console.log('[PWA Version] This might be a version mismatch. Checking...');
        
        // Проверяем Service Worker
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting) {
            console.log('[PWA Version] 🔄 New SW waiting - activating and reloading');
            // Активируем waiting SW и перезагружаем
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else if (navigator.onLine) {
            console.log('[PWA Version] 🔄 Online and chunk failed - hard reload');
            // Если онлайн - делаем hard reload чтобы получить новую версию
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

