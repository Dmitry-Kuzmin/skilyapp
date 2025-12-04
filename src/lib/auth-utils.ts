import { supabase } from "@/integrations/supabase/client";

/**
 * Проверяет существует ли пользователь с указанным email
 * @param email Email для проверки
 * @returns true если пользователь существует, false если нет
 * 
 * ВАЖНО: Используем попытку входа с неправильным паролем для проверки.
 * Это единственный надежный способ без Edge Function.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    // Пытаемся войти с заведомо неверным паролем
    // Если email существует - получим ошибку "Invalid login credentials"
    // Если email не существует - получим ошибку "User not found" или просто другую ошибку
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: '___impossible_password_that_does_not_exist_12345___'
    });

    if (!error) {
      // Если нет ошибки (что маловероятно), пользователь существует
      return true;
    }

    // Проверяем тип ошибки
    const errorMessage = error.message.toLowerCase();
    
    // Если ошибка "Invalid login credentials" - пользователь существует (просто пароль неверный)
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid email or password')) {
      return true;
    }

    // Если ошибка "Email not confirmed" - пользователь существует
    if (errorMessage.includes('email not confirmed')) {
      return true;
    }

    // Любые другие ошибки считаем как несуществующий пользователь
    console.log('[checkEmailExists] Email does not exist:', errorMessage);
    return false;
  } catch (error) {
    console.error('[checkEmailExists] Exception:', error);
    // В случае исключения считаем пользователя новым (безопаснее)
    return false;
  }
}

/**
 * Получает IP адрес клиента
 * @returns IP адрес или null если не удалось получить
 */
export async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

