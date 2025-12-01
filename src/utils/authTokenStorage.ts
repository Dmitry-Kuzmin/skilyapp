/**
 * Хранение Access Token в IndexedDB для доступа из Service Worker
 * КРИТИЧНО: Service Worker не имеет доступа к localStorage
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'SkilyAppAuth';
const STORE_NAME = 'auth_tokens';
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
    });
  }
  return db;
}

interface TokenData {
  key: string;
  token: string;
  expiresAt: number; // Timestamp когда токен протухнет
  updatedAt: number;
}

/**
 * Сохранить Access Token в IndexedDB
 * Вызывается при каждом обновлении токена
 */
export async function saveAuthToken(token: string, expiresIn: number = 3600): Promise<void> {
  try {
    const db = await getDb();
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    const tokenData: TokenData = {
      key: 'supabase_access_token',
      token,
      expiresAt,
      updatedAt: Date.now(),
    };

    await db.put(STORE_NAME, tokenData);
    console.log('[AuthTokenStorage] Token saved to IndexedDB');
  } catch (error) {
    console.error('[AuthTokenStorage] Failed to save token:', error);
  }
}

/**
 * Получить Access Token из IndexedDB
 * Используется Service Worker для отправки аналитики
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const db = await getDb();
    const tokenData = await db.get(STORE_NAME, 'supabase_access_token') as TokenData | undefined;

    if (!tokenData) {
      return null;
    }

    // Проверяем, не протух ли токен
    if (Date.now() >= tokenData.expiresAt) {
      console.warn('[AuthTokenStorage] Token expired');
      return null;
    }

    return tokenData.token;
  } catch (error) {
    console.error('[AuthTokenStorage] Failed to get token:', error);
    return null;
  }
}

/**
 * Проверить, есть ли валидный токен
 */
export async function hasValidToken(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Очистить токен (при logout)
 */
export async function clearAuthToken(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, 'supabase_access_token');
  } catch (error) {
    console.error('[AuthTokenStorage] Failed to clear token:', error);
  }
}

