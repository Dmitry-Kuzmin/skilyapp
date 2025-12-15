/**
 * Валидация переменных окружения при старте приложения
 * 
 * Решает проблемы:
 * 1. Отсутствие критичных переменных (Supabase)
 * 2. Отсутствие опциональных переменных (Paddle) - graceful degradation
 * 3. Некорректные значения переменных
 */

interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  paddle: {
    clientToken: string | null;
    enabled: boolean;
  };
}

let envConfig: EnvConfig | null = null;

/**
 * Валидирует и возвращает конфигурацию переменных окружения
 * Вызывается один раз при старте приложения
 */
export function validateEnv(): EnvConfig {
  if (envConfig) {
    return envConfig;
  }

  // Критичные переменные (Supabase)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.PUBLIC_SUPABASE_URL || 
    'https://yffjnqegeiorunyvcxkn.supabase.co';

  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    '';

  // Валидация критичных переменных
  if (!supabaseUrl || supabaseUrl === '' || supabaseUrl === 'undefined') {
    const error = new Error('VITE_SUPABASE_URL is required. Please set it in your environment variables.');
    console.error('❌ [Env Validation]', error.message);
    throw error;
  }

  if (!supabaseAnonKey || supabaseAnonKey === '' || supabaseAnonKey === 'undefined') {
    const error = new Error('VITE_SUPABASE_PUBLISHABLE_KEY is required. Please set it in your environment variables.');
    console.error('❌ [Env Validation]', error.message);
    throw error;
  }

  // Опциональные переменные (Paddle) - graceful degradation
  const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || null;
  const paddleEnabled = !!paddleToken;

  if (!paddleEnabled && import.meta.env.DEV) {
    console.warn('⚠️ [Env Validation] Paddle token not found. Payments will be disabled in DEV mode.');
  }

  envConfig = {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    paddle: {
      clientToken: paddleToken,
      enabled: paddleEnabled,
    },
  };

  if (import.meta.env.DEV) {
    console.log('✅ [Env Validation] Environment variables validated:', {
      supabase: {
        url: supabaseUrl.substring(0, 30) + '...',
        hasKey: !!supabaseAnonKey,
      },
      paddle: {
        enabled: paddleEnabled,
      },
    });
  }

  return envConfig;
}

/**
 * Получить конфигурацию переменных окружения
 * Если еще не валидирована - валидирует автоматически
 */
export function getEnvConfig(): EnvConfig {
  return validateEnv();
}

/**
 * Проверка доступности Paddle
 */
export function isPaddleEnabled(): boolean {
  return getEnvConfig().paddle.enabled;
}

