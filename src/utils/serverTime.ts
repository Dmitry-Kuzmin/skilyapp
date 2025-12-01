/**
 * Утилита для работы с серверным временем
 * Защищает от проблем с неверным временем на устройстве пользователя
 */

import { supabase } from '@/integrations/supabase/client';

interface ServerTimeInfo {
  serverTime: number; // Серверное время в миллисекундах
  clientTime: number; // Локальное время в миллисекундах
  offset: number; // Разница между сервером и клиентом (serverTime - clientTime)
  lastSync: number; // Когда был последний синхронизацию
}

const STORAGE_KEY = 'server_time_offset';
const OFFSET_VALIDITY_MS = 60 * 60 * 1000; // 1 час - пересинхронизация

let cachedOffset: ServerTimeInfo | null = null;

/**
 * Получить время сервера через Supabase
 * Используем заголовок Date из ответа сервера
 */
async function fetchServerTime(): Promise<number | null> {
  try {
    // Делаем легкий запрос к Supabase для получения времени сервера
    // Заголовок Date в ответе содержит серверное время
    const startTime = Date.now();
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabase.supabaseKey || '',
      },
    });

    if (!response.ok) {
      return null;
    }

    // Получаем серверное время из заголовка Date
    const dateHeader = response.headers.get('Date');
    if (!dateHeader) {
      return null;
    }

    const serverTime = new Date(dateHeader).getTime();
    const endTime = Date.now();
    
    // Учитываем задержку сети (latency compensation)
    const latency = (endTime - startTime) / 2;
    const adjustedServerTime = serverTime + latency;

    return adjustedServerTime;
  } catch (error) {
    console.error('[serverTime] Error fetching server time:', error);
    return null;
  }
}

/**
 * Синхронизировать время с сервером
 */
async function syncServerTime(): Promise<ServerTimeInfo | null> {
  const serverTime = await fetchServerTime();
  if (!serverTime) {
    return null;
  }

  const clientTime = Date.now();
  const offset = serverTime - clientTime;

  const timeInfo: ServerTimeInfo = {
    serverTime,
    clientTime,
    offset,
    lastSync: clientTime,
  };

  // Кэшируем в памяти
  cachedOffset = timeInfo;

  // Сохраняем в localStorage для использования после перезагрузки
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timeInfo));
  } catch (error) {
    console.warn('[serverTime] Failed to save offset to localStorage:', error);
  }

  console.log(`[serverTime] Synced: offset = ${offset}ms (${(offset / 1000).toFixed(1)}s)`);
  
  return timeInfo;
}

/**
 * Загрузить кэшированный offset из localStorage
 */
function loadCachedOffset(): ServerTimeInfo | null {
  if (cachedOffset) {
    return cachedOffset;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const timeInfo: ServerTimeInfo = JSON.parse(stored);
    
    // Проверяем, не устарел ли offset
    const age = Date.now() - timeInfo.lastSync;
    if (age > OFFSET_VALIDITY_MS) {
      console.log('[serverTime] Cached offset expired, need to re-sync');
      return null;
    }

    cachedOffset = timeInfo;
    return timeInfo;
  } catch (error) {
    console.warn('[serverTime] Failed to load cached offset:', error);
    return null;
  }
}

/**
 * Получить текущее серверное время (синхронная версия для быстрого использования)
 */
export function getServerTimeSync(): number {
  const timeInfo = loadCachedOffset();
  if (!timeInfo) {
    // Если нет offset - возвращаем локальное время (будет исправлено при следующей синхронизации)
    return Date.now();
  }
  
  // Вычисляем текущее серверное время: локальное время + offset
  return Date.now() + timeInfo.offset;
}

/**
 * Получить текущее серверное время (асинхронная версия с синхронизацией)
 */
export async function getServerTime(): Promise<number> {
  // Пытаемся использовать кэшированный offset
  let timeInfo = loadCachedOffset();

  // Если нет кэша или он устарел - синхронизируемся
  if (!timeInfo || needsResync()) {
    timeInfo = await syncServerTime();
  }

  if (!timeInfo) {
    // Если синхронизация не удалась - используем локальное время с предупреждением
    console.warn('[serverTime] Failed to sync, using local time');
    return Date.now();
  }

  // Вычисляем текущее серверное время: локальное время + offset
  const localTime = Date.now();
  return localTime + timeInfo.offset;
}

/**
 * Конвертировать локальное время в серверное
 */
export function toServerTime(localTimestamp: number): number {
  const timeInfo = loadCachedOffset();
  if (!timeInfo) {
    // Если нет offset - возвращаем как есть (может быть неточным)
    console.warn('[serverTime] No offset available, using local time as-is');
    return localTimestamp;
  }

  return localTimestamp + timeInfo.offset;
}

/**
 * Конвертировать серверное время в локальное
 */
export function toLocalTime(serverTimestamp: number): number {
  const timeInfo = loadCachedOffset();
  if (!timeInfo) {
    return serverTimestamp;
  }

  return serverTimestamp - timeInfo.offset;
}

/**
 * Получить offset (разница между сервером и клиентом)
 */
export async function getServerTimeOffset(): Promise<number> {
  const timeInfo = loadCachedOffset();
  if (timeInfo) {
    return timeInfo.offset;
  }

  // Если нет кэша - синхронизируемся
  const synced = await syncServerTime();
  return synced?.offset || 0;
}

/**
 * Принудительная синхронизация времени с сервером
 */
export async function forceSyncServerTime(): Promise<boolean> {
  const timeInfo = await syncServerTime();
  return timeInfo !== null;
}

/**
 * Проверить, нужна ли повторная синхронизация
 */
export function needsResync(): boolean {
  const timeInfo = loadCachedOffset();
  if (!timeInfo) {
    return true;
  }

  const age = Date.now() - timeInfo.lastSync;
  return age > OFFSET_VALIDITY_MS;
}

/**
 * Инициализация: синхронизация времени при старте приложения
 */
export async function initServerTime(): Promise<void> {
  // Если нет кэша или он устарел - синхронизируемся
  if (needsResync()) {
    await syncServerTime();
  } else {
    // Загружаем из кэша
    loadCachedOffset();
  }
}

