/**
 * PasskeyManager
 * 
 * Управление Passkeys в Settings
 * Регистрация новых устройств + удаление старых
 * Премиальный дизайн (Linear/Vercel стиль + Auth Form style)
 */

import { useState, useEffect } from 'react';
import { Fingerprint, Smartphone, Laptop, Trash2, Plus, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/toast';
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
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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
        if (available) loadPasskeys();
        else setIsLoading(false);
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
    triggerHaptic('medium');
    setIsRegistering(true);
    const finalDeviceName = deviceName.trim() || getAutoDeviceName();
    const result = await registerPasskey({ deviceName: finalDeviceName });

    if (result.success) {
      toast.success('Passkey добавлен', {
        description: `Устройство "${finalDeviceName}" успешно зарегистрировано`,
      });
      setDeviceName('');
      setShowRegisterForm(false);
      loadPasskeys();
    } else {
      toast.error('Ошибка регистрации', {
        description: result.error || 'Не удалось добавить Passkey',
      });
    }
    setIsRegistering(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    triggerHaptic('medium');
    const result = await deletePasskey(deleteTarget.id);

    if (result.success) {
      toast.success('Passkey удалён', {
        description: `Устройство "${deleteTarget.device_name || 'Без названия'}" удалено`,
      });
      setPasskeys((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } else {
      toast.error('Ошибка удаления', {
        description: result.error || 'Не удалось удалить Passkey',
      });
    }
    setDeleteTarget(null);
  };

  const getDeviceIcon = (transports: string[] | null) => {
    if (!transports || transports.includes('internal')) {
      return <Fingerprint className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />;
    }
    if (transports.includes('usb')) {
      return <Laptop className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />;
    }
    return <Smartphone className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Никогда';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
  };

  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white tracking-tight">Passkeys не поддерживаются</h3>
            <p className="text-[11px] text-zinc-500 font-medium leading-tight">
              Ваш браузер не поддерживает современную биометрию. Используйте Safari, Chrome или Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <h3 className="text-lg font-black tracking-tight text-white italic">
            Passkeys
          </h3>
          <p className="text-[11px] text-zinc-500 font-medium">
            Вход без пароля через биометрию
          </p>
        </div>

        <AnimatePresence>
          {!showRegisterForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                onClick={() => {
                  triggerHaptic('light');
                  setShowRegisterForm(true);
                }}
                className="h-10 px-5 bg-white text-black hover:bg-zinc-200 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-xl shadow-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Registration Deck */}
      <AnimatePresence>
        {showRegisterForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="group relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-2xl shadow-2xl"
          >
            {/* Ambient Shadow glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-50 pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 ml-1">
                  Название устройства
                </label>
                <Input
                  type="text"
                  placeholder="MacBook Pro, iPhone 15, Windows PC..."
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  maxLength={50}
                  className="h-14 bg-zinc-950/80 border-white/5 focus:border-sky-500/50 rounded-2xl text-white text-center font-medium placeholder:text-zinc-700 transition-all"
                  disabled={isRegistering}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering || (deviceName === '' && !isRegistering)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-black text-sm transition-all shadow-lg",
                    "bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]",
                    "disabled:opacity-50 disabled:grayscale disabled:scale-100"
                  )}
                >
                  {isRegistering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" />
                      <span>Зарегистрировать</span>
                    </div>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowRegisterForm(false);
                    setDeviceName('');
                  }}
                  variant="ghost"
                  className="px-6 h-12 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl font-bold text-sm"
                  disabled={isRegistering}
                >
                  Отмена
                </Button>
              </div>

              <p className="text-[10px] text-center text-zinc-600 font-medium px-4">
                Название опционально. После нажатия браузер запросит Face ID, Touch ID или Windows Hello
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Area */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500/50" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700 transition-pulse animate-pulse">Считывание ключей...</span>
          </div>
        ) : passkeys.length === 0 ? (
          !showRegisterForm && (
            <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-12 text-center space-y-4 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 shadow-inner">
                <Fingerprint className="w-8 h-8 text-zinc-700" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-zinc-400 italic">Нет активных ключей</h4>
                <p className="text-[11px] text-zinc-600 font-medium">
                  Добавьте устройство для сверхбыстрого входа
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 px-1">
              Твои ключи доступа
            </label>
            <div className="grid gap-2">
              {passkeys.map((passkey) => (
                <motion.div
                  layout
                  key={passkey.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 shadow-xl group-hover:border-sky-500/30 transition-colors">
                      {getDeviceIcon(passkey.transports)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white italic tracking-tight uppercase">
                        {passkey.device_name || 'Generic Device'}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {passkey.last_used_at ? (
                          <>Активен {formatDate(passkey.last_used_at)}</>
                        ) : (
                          <>Добавлен {formatDate(passkey.created_at)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      triggerHaptic('light');
                      setDeleteTarget(passkey);
                    }}
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-xl bg-zinc-950/50 border border-white/5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog - Premium UI */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-3xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0" />

          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-white italic tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              Удалить ключ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400 font-medium leading-relaxed pt-2">
              Вы собираетесь отозвать доступ для устройства <span className="text-white font-bold">"{deleteTarget?.device_name}"</span>.
              Для входа с этого девайса потребуется пароль.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
            <AlertDialogCancel className="bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl h-12 font-bold px-6">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-2xl h-12 font-black px-6 shadow-lg shadow-red-500/20"
            >
              Удалить доступ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
