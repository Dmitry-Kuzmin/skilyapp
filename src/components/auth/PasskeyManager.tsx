/**
 * PasskeyManager
 * 
 * Управление Passkeys в Settings
 * Регистрация новых устройств + удаление старых
 * Премиальный дизайн (Linear/Vercel стиль)
 */

import { useState, useEffect } from 'react';
import { Fingerprint, Smartphone, Laptop, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  registerPasskey,
  listPasskeys,
  deletePasskey,
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
  type PasskeyCredential,
} from '@/lib/passkey';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Автогенерация названия устройства
function getAutoDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Macintosh/.test(ua)) {
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Mac (Safari)';
    if (/Chrome/.test(ua)) return 'Mac (Chrome)';
    return 'Mac';
  }
  if (/Windows/.test(ua)) {
    if (/Edge/.test(ua)) return 'Windows (Edge)';
    if (/Chrome/.test(ua)) return 'Windows (Chrome)';
    return 'Windows';
  }
  if (/Android/.test(ua)) return 'Android';
  return 'Устройство';
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PasskeyCredential | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();

  // Проверка поддержки
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPasskeySupported();
      setIsSupported(supported);

      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
        
        // Загружаем passkeys только если доступен platform authenticator
        if (available) {
          loadPasskeys();
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  const loadPasskeys = async () => {
    setIsLoading(true);
    const result = await listPasskeys();
    
    if (result.success && result.passkeys) {
      setPasskeys(result.passkeys);
    } else {
      toast({
        title: 'Ошибка',
        description: result.error || 'Не удалось загрузить список',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  const handleRegister = async () => {
    setIsRegistering(true);

    // Автогенерация названия если не указано
    const finalDeviceName = deviceName.trim() || getAutoDeviceName();
    
    const result = await registerPasskey({ deviceName: finalDeviceName });

    if (result.success) {
      toast({
        title: '✅ Passkey добавлен',
        description: `Устройство "${deviceName}" успешно зарегистрировано`,
      });

      setDeviceName('');
      setShowRegisterForm(false);
      loadPasskeys();
    } else {
      toast({
        title: 'Ошибка регистрации',
        description: result.error || 'Не удалось добавить Passkey',
        variant: 'destructive',
      });
    }

    setIsRegistering(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const result = await deletePasskey(deleteTarget.id);

    if (result.success) {
      toast({
        title: '✅ Passkey удалён',
        description: `Устройство "${deleteTarget.device_name || 'Без названия'}" удалено`,
      });

      setPasskeys((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } else {
      toast({
        title: 'Ошибка удаления',
        description: result.error || 'Не удалось удалить Passkey',
        variant: 'destructive',
      });
    }

    setDeleteTarget(null);
  };

  // Определяем иконку по транспорту
  const getDeviceIcon = (transports: string[] | null) => {
    if (!transports || transports.includes('internal')) {
      return <Fingerprint className="w-5 h-5 text-blue-400" />;
    }
    if (transports.includes('usb')) {
      return <Laptop className="w-5 h-5 text-violet-400" />;
    }
    return <Smartphone className="w-5 h-5 text-emerald-400" />;
  };

  // Форматирование даты
  const formatDate = (date: string | null) => {
    if (!date) return 'Никогда';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
  };

  // Не поддерживается
  if (!isSupported) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-zinc-200">Passkeys не поддерживаются</h3>
            <p className="text-sm text-zinc-400">
              Ваш браузер не поддерживает WebAuthn. Попробуйте обновить браузер или используйте Chrome/Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Не доступен platform authenticator
  if (!isAvailable) {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-zinc-200">Биометрия не доступна</h3>
            <p className="text-sm text-zinc-400">
              На этом устройстве нет Face ID, Touch ID или Windows Hello. Passkeys недоступны.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-200">
            Passkeys
          </h3>
          <p className="text-sm text-zinc-500">
            Вход без пароля через биометрию
          </p>
        </div>

        {!showRegisterForm && (
          <Button
            onClick={() => setShowRegisterForm(true)}
            className="h-9 bg-white text-black hover:bg-white/90 font-medium shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all duration-200 hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить устройство
          </Button>
        )}
      </div>

      {/* Форма регистрации */}
      {showRegisterForm && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Название устройства
            </label>
            <Input
              type="text"
              placeholder="MacBook Pro, iPhone 15, Windows PC..."
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              maxLength={50}
              className="h-12 bg-zinc-900 border-zinc-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              disabled={isRegistering}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="flex-1 h-10 bg-white text-black hover:bg-white/90 font-medium disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Зарегистрировать
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setShowRegisterForm(false);
                setDeviceName('');
              }}
              variant="outline"
              className="px-4 h-10 border-zinc-800 bg-transparent hover:bg-zinc-800"
              disabled={isRegistering}
            >
              Отмена
            </Button>
          </div>

          <p className="text-xs text-zinc-500">
            Название опционально (автоматически определится). После нажатия браузер запросит Face ID, Touch ID или Windows Hello
          </p>
        </div>
      )}

      {/* Список устройств */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-xl p-12 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/50">
            <Fingerprint className="w-6 h-6 text-zinc-500" />
          </div>
          <div className="space-y-1">
            <h4 className="font-medium text-zinc-300">Нет зарегистрированных устройств</h4>
            <p className="text-sm text-zinc-500">
              Добавьте первое устройство для быстрого входа
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/50">
                    {getDeviceIcon(passkey.transports)}
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-sm text-zinc-200">
                      {passkey.device_name || 'Устройство без названия'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {passkey.last_used_at ? (
                        <>Использовалось {formatDate(passkey.last_used_at)}</>
                      ) : (
                        <>Добавлено {formatDate(passkey.created_at)}</>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setDeleteTarget(passkey)}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Диалог удаления */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-200">
              Удалить Passkey?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Вы уверены, что хотите удалить устройство "
              {deleteTarget?.device_name || 'Без названия'}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-800 bg-transparent hover:bg-zinc-800">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

