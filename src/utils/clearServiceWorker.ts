/**
 * Утилита для очистки Service Worker и кэша
 * Используется для сброса кэша при проблемах с устаревшим кодом
 */

/**
 * Очищает все зарегистрированные Service Workers
 */
export async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[ClearSW] Service Workers не поддерживаются в этом браузере');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log('[ClearSW] Нет зарегистрированных Service Workers');
      return;
    }

    console.log(`[ClearSW] Найдено ${registrations.length} Service Worker(s), удаляем...`);

    // Удаляем все регистрации
    await Promise.all(
      registrations.map(async (registration) => {
        const unregistered = await registration.unregister();
        console.log(`[ClearSW] Service Worker ${registration.scope} ${unregistered ? 'удален' : 'не удален'}`);
        return unregistered;
      })
    );

    console.log('[ClearSW] Все Service Workers удалены');
  } catch (error) {
    console.error('[ClearSW] Ошибка при удалении Service Workers:', error);
    throw error;
  }
}

/**
 * Очищает все кэши CacheStorage
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    console.warn('[ClearSW] CacheStorage не поддерживается в этом браузере');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    
    if (cacheNames.length === 0) {
      console.log('[ClearSW] Нет кэшей для очистки');
      return;
    }

    console.log(`[ClearSW] Найдено ${cacheNames.length} кэш(ей), очищаем...`);

    await Promise.all(
      cacheNames.map(async (cacheName) => {
        const deleted = await caches.delete(cacheName);
        console.log(`[ClearSW] Кэш ${cacheName} ${deleted ? 'удален' : 'не удален'}`);
        return deleted;
      })
    );

    console.log('[ClearSW] Все кэши очищены');
  } catch (error) {
    console.error('[ClearSW] Ошибка при очистке кэшей:', error);
    throw error;
  }
}

/**
 * Полная очистка: Service Workers + CacheStorage
 */
export async function clearServiceWorkerAndCache(): Promise<void> {
  console.log('[ClearSW] Начинаем полную очистку Service Worker и кэша...');
  
  try {
    await Promise.all([
      unregisterServiceWorkers(),
      clearAllCaches(),
    ]);
    
    console.log('[ClearSW] ✅ Полная очистка завершена. Перезагрузите страницу.');
    
    // Предлагаем перезагрузить страницу
    if (confirm('Service Worker и кэш очищены. Перезагрузить страницу?')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('[ClearSW] Ошибка при полной очистке:', error);
    throw error;
  }
}

/**
 * Проверяет, есть ли зарегистрированные Service Workers
 */
export async function hasServiceWorkers(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  } catch (error) {
    console.error('[ClearSW] Ошибка при проверке Service Workers:', error);
    return false;
  }
}

/**
 * Глобальный "Супер-сброс": Очищает абсолютно всё
 */
export async function perfectReset(): Promise<void> {
  console.log('[ClearSW] 🚀 Запуск полного сброса данных (Perfect Reset)...');
  
  try {
    // 1. Очищаем хранилища
    localStorage.clear();
    sessionStorage.clear();
    console.log('[ClearSW] LocalStorage & SessionStorage очищены');

    // 2. Очищаем Cookies
    document.cookie.split(";").forEach((c) => {
        document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log('[ClearSW] Cookies очищены');

    // 3. Очищаем IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
        if (db.name) {
            indexedDB.deleteDatabase(db.name);
        }
    }
    console.log('[ClearSW] IndexedDB очищены');

    // 4. Очищаем Service Worker и CacheStorage
    await unregisterServiceWorkers();
    await clearAllCaches();
    
    console.log('[ClearSW] ✅ Полный сброс завершен успешно');
    
    // Перезагрузка без подтверждения (мы уже спросим в UI)
    window.location.href = '/';
  } catch (error) {
    console.error('[ClearSW] Ошибка при полном сбросе:', error);
    throw error;
  }
}
