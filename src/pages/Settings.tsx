/**
 * Settings Page
 * 
 * Настройки аккаунта пользователя
 * - Управление Passkeys (Face ID / Touch ID)
 * - Другие настройки профиля
 */

import { User, Shield, Bell, CreditCard, Trash2, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import { PasskeyManager } from '@/components/auth/PasskeyManager';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { clearServiceWorkerAndCache, hasServiceWorkers } from '@/utils/clearServiceWorker';
import { toast } from '@/lib/toast';

export default function Settings() {
  const { isAuthenticated, isLoading, supabaseUser } = useUserContext();
  const navigate = useNavigate();
  const [hasSW, setHasSW] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Редирект если не авторизован
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Проверяем наличие Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      hasServiceWorkers().then(setHasSW);
    }
  }, []);

  const handleClearSW = async () => {
    if (!confirm('Очистить Service Worker и кэш? Это перезагрузит страницу.')) {
      return;
    }

    setClearing(true);
    try {
      await clearServiceWorkerAndCache();
      toast({
        title: 'Очистка завершена',
        description: 'Service Worker и кэш очищены. Страница перезагрузится...',
      });
      // clearServiceWorkerAndCache уже перезагрузит страницу
    } catch (error) {
      console.error('[Settings] Ошибка очистки SW:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось очистить Service Worker. Попробуй через DevTools.',
        variant: 'destructive',
      });
      setClearing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-zinc-500">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Заголовок */}
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-200">
            Настройки
          </h1>
          <p className="text-zinc-500">
            Управление аккаунтом и безопасностью
          </p>
        </div>

        {/* Навигация (табы) */}
        <div className="flex gap-2 mb-8 border-b border-zinc-800 overflow-x-auto">
          <button className="px-4 py-3 text-sm font-semibold text-zinc-200 border-b-2 border-blue-500 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Безопасность
            </div>
          </button>
          
          <button 
            className="px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap cursor-not-allowed opacity-50"
            disabled
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Профиль
            </div>
          </button>

          <button 
            className="px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap cursor-not-allowed opacity-50"
            disabled
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Уведомления
            </div>
          </button>

          <button 
            className="px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap cursor-not-allowed opacity-50"
            disabled
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Подписка
            </div>
          </button>
        </div>

        {/* Контент */}
        <div className="space-y-8">
          {/* Секция: Безопасность */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-zinc-200">
                Безопасность
              </h2>
              <p className="text-sm text-zinc-500">
                Управление методами входа и защита аккаунта
              </p>
            </div>

            {/* Account Info */}
            {supabaseUser?.email && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Email
                  </p>
                  <p className="text-sm font-medium text-zinc-300">
                    {supabaseUser.email}
                  </p>
                </div>
              </div>
            )}

            {/* Passkeys Section */}
            <PasskeyManager />

            {/* Дополнительная информация */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-sm text-zinc-200">
                    Рекомендуем использовать Passkeys
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Вход через биометрию безопаснее паролей и в 10 раз быстрее. 
                    Passkeys защищены от фишинга и утечек данных.
                  </p>
                </div>
              </div>
            </div>

            {/* Разработка: Очистка Service Worker */}
            {(import.meta.env.DEV || hasSW) && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-200">
                      Разработка
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Очистка Service Worker и кэша. Используй при проблемах с устаревшим кодом.
                    </p>
                  </div>
                  
                  {hasSW && (
                    <div className="flex items-center gap-2 text-xs text-amber-500">
                      <RefreshCw className="w-3 h-3" />
                      <span>Обнаружен зарегистрированный Service Worker</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSW}
                    disabled={clearing}
                    className="w-full sm:w-auto"
                  >
                    {clearing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Очистка...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Очистить Service Worker и кэш
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Будущие секции (заглушки) */}
          <section className="space-y-4 opacity-50">
            <h2 className="text-xl font-semibold text-zinc-200">
              Профиль
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <p className="text-sm text-zinc-500">Скоро будет доступно</p>
            </div>
          </section>

          <section className="space-y-4 opacity-50">
            <h2 className="text-xl font-semibold text-zinc-200">
              Уведомления
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <p className="text-sm text-zinc-500">Скоро будет доступно</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

