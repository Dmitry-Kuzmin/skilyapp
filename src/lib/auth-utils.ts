import { supabase } from "@/integrations/supabase/client";

/**
 * Результат проверки метода аутентификации
 */
export interface AuthMethodCheckResult {
  exists: boolean;
  hasPassword: boolean;
  emailConfirmed: boolean;
}

/**
 * Проверяет метод аутентификации пользователя по email
 * @param email Email для проверки
 * @returns Объект с информацией о пользователе
 * 
 * Используется для "умного входа":
 * - Если exists = false → новый пользователь, регистрация через Magic Link
 * - Если exists = true && hasPassword = true → показать поле пароля
 * - Если exists = true && hasPassword = false → сразу Magic Link (без пароля)
 */
export async function checkUserAuthMethod(email: string): Promise<AuthMethodCheckResult> {
  try {
    const { data, error } = await supabase.rpc('check_user_auth_method', {
      user_email: email.trim().toLowerCase()
    });

    if (error) {
      console.error('[checkUserAuthMethod] RPC error:', error);
      // Fallback на старый метод при ошибке RPC
      const exists = await checkEmailExistsLegacy(email);
      return {
        exists,
        hasPassword: exists, // Предполагаем что есть пароль (безопаснее)
        emailConfirmed: true
      };
    }

    return {
      exists: data?.exists ?? false,
      hasPassword: data?.has_password ?? false,
      emailConfirmed: data?.email_confirmed ?? false
    };
  } catch (error) {
    console.error('[checkUserAuthMethod] Exception:', error);
    // При исключении считаем пользователя новым
    return {
      exists: false,
      hasPassword: false,
      emailConfirmed: false
    };
  }
}

/**
 * LEGACY: Проверяет существует ли пользователь с указанным email
 * Используется как fallback если RPC не работает
 */
async function checkEmailExistsLegacy(email: string): Promise<boolean> {
  try {
    // Пытаемся войти с заведомо неверным паролем
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: '___impossible_password_that_does_not_exist_12345___'
    });

    if (!error) {
      return true;
    }

    const errorMessage = error.message.toLowerCase();

    // "Invalid login credentials" = пользователь существует
    if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid email or password')) {
      return true;
    }

    // "Email not confirmed" = пользователь существует
    if (errorMessage.includes('email not confirmed')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * @deprecated Используйте checkUserAuthMethod вместо этой функции
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const result = await checkUserAuthMethod(email);
  return result.exists;
}

/**
 * Получает IP адрес клиента
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
