/**
 * Утилита для локального сохранения прогресса теста
 * Сохраняет ответы в IndexedDB для работы в offline режиме
 */

export interface TestAnswer {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface TestProgress {
  testId: string;
  mode: string;
  answers: TestAnswer[];
  currentIndex: number;
  startTime: number;
  lastUpdated: number;
}

const DB_NAME = 'skilyapp-tests';
const DB_VERSION = 1;
const STORE_NAME = 'test-progress';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'testId' });
      }
    };
  });

  return dbPromise;
}

/**
 * Сохранить прогресс теста локально
 */
export async function saveTestProgress(
  testId: string,
  mode: string,
  answers: TestAnswer[],
  currentIndex: number,
  startTime: number
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const progress: TestProgress = {
      testId,
      mode,
      answers,
      currentIndex,
      startTime,
      lastUpdated: Date.now(), // Будет конвертировано в server time при синхронизации
    };

    await store.put(progress);
  } catch (error) {
    console.error('[testStorage] Error saving progress:', error);
    // Fallback на localStorage если IndexedDB недоступен
    try {
      localStorage.setItem(`test-progress-${testId}`, JSON.stringify(progress));
    } catch (e) {
      console.error('[testStorage] Error saving to localStorage:', e);
    }
  }
}

/**
 * Загрузить сохраненный прогресс теста
 */
export async function loadTestProgress(testId: string): Promise<TestProgress | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(testId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(sanitizeTestProgress(result));
        } else {
          // Fallback на localStorage
          try {
            const saved = localStorage.getItem(`test-progress-${testId}`);
            if (saved) {
              resolve(sanitizeTestProgress(JSON.parse(saved)));
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[testStorage] Error loading progress:', error);
    // Fallback на localStorage
    try {
      const saved = localStorage.getItem(`test-progress-${testId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * Удалить сохраненный прогресс теста
 */
export async function clearTestProgress(testId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(testId);
    
    // Также удаляем из localStorage
    localStorage.removeItem(`test-progress-${testId}`);
  } catch (error) {
    console.error('[testStorage] Error clearing progress:', error);
    localStorage.removeItem(`test-progress-${testId}`);
  }
}

/**
 * Получить все сохраненные прогрессы (для синхронизации)
 */
export async function getAllTestProgress(): Promise<TestProgress[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[testStorage] Error getting all progress:', error);
    return [];
  }
}

