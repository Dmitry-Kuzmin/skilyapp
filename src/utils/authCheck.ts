/**
 * Легкая проверка авторизации БЕЗ Supabase
 * Используется на лендинге для проверки, залогинен ли пользователь
 * Не требует Supabase в initial bundle
 */

/**
 * Проверяет наличие сессии Supabase в localStorage
 * БЕЗ импорта Supabase (чтобы не тянуть его в initial bundle)
 */
export function checkAuthFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Supabase хранит сессию в localStorage под ключом sb-<project-ref>-auth-token
  // Проверяем все ключи, которые начинаются с 'sb-' и заканчиваются на '-auth-token'
  const keys = Object.keys(localStorage);
  const hasSupabaseToken = keys.some(key => 
    key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  
  // Также проверяем наличие puzzle_user (Telegram авторизация)
  const hasTelegramUser = !!localStorage.getItem('puzzle_user') || !!window.puzzleUser;
  
  return hasSupabaseToken || hasTelegramUser;
}

/**
 * Проверяет авторизацию через Telegram API (без Supabase)
 */
export function checkTelegramAuth(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Проверяем Telegram WebApp
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    // Проверяем, что это не мок
    if (user.id !== 123456789 && user.username !== 'test_user') {
      return true;
    }
  }
  
  // Проверяем window.puzzleUser
  if (window.puzzleUser && 
      window.puzzleUser.id !== 123456789 && 
      window.puzzleUser.username !== 'test_user') {
    return true;
  }
  
  // Проверяем localStorage
  const storedUser = localStorage.getItem('puzzle_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.id !== 123456789 && user.username !== 'test_user') {
        return true;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return false;
}

