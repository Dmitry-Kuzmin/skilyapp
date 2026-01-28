/**
 * AccountTab - Вкладка "Аккаунт"
 * 
 * Профиль, подключённые сервисы, выход
 */

import React, { useContext, useState, useEffect } from 'react';
import { User, Camera, LogOut, Check, MessageSquare, Mail, Pencil, Save, X, ExternalLink, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { UserContext } from '@/contexts/UserContext';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { useProfileData } from '@/hooks/useProfileData';
import { cn } from "@/lib/utils";

// Google icon
const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// === COMPONENTS ===
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

const SettingRow: React.FC<{
    icon?: React.ReactNode;
    label: string;
    description?: string;
    children: React.ReactNode;
}> = ({ icon, label, description, children }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">{label}</span>
                {description && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">{description}</span>
                )}
            </div>
        </div>
        <div className="shrink-0 ml-3">{children}</div>
    </div>
);

export const AccountTab: React.FC = () => {
    const { closeSettings, userLevel } = useSettingsStore();
    const userContext = useContext(UserContext);
    const { profileData, refresh: refreshProfile } = useProfileData();

    const user = userContext?.user;
    const logout = userContext?.logout || (() => { });
    const supabaseUser = userContext?.supabaseUser;

    // Редактирование имени
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedFirstName, setEditedFirstName] = useState('');
    const [editedLastName, setEditedLastName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Telegram Link State
    const [telegramLinkToken, setTelegramLinkToken] = useState<string | null>(null);
    const [generatingToken, setGeneratingToken] = useState(false);
    const telegramBotUsername = 'skilyapp_bot';

    // Синхронизируем локальный стейт при получении данных
    useEffect(() => {
        if (profileData && !isEditingName) {
            setEditedFirstName(profileData.first_name || '');
            setEditedLastName(profileData.last_name || '');
        }
    }, [profileData, isEditingName]);

    // КРИТИЧНО: Используем ту же логику что и в ProfileModal
    const photoUrl =
        profileData?.photo_url ||
        user?.photo_url ||
        supabaseUser?.user_metadata?.avatar_url ||
        supabaseUser?.user_metadata?.picture;

    const firstName = profileData?.first_name || user?.first_name || supabaseUser?.user_metadata?.full_name?.split(' ')[0] || 'Пользователь';
    const lastName = profileData?.last_name || user?.last_name || supabaseUser?.user_metadata?.full_name?.split(' ')[1] || '';
    const username = profileData?.username || user?.username || supabaseUser?.email?.split('@')[0] || 'user';

    const handleLogout = () => {
        triggerHaptic('medium');
        closeSettings();
        logout();
        toast.success('До встречи! 👋');
    };

    const handleSaveName = async () => {
        if (!profileData?.id) {
            toast.error('Профиль не найден');
            return;
        }

        setIsSaving(true);
        triggerHaptic('medium');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: editedFirstName.trim(),
                    last_name: editedLastName.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', profileData.id);

            if (error) throw error;

            toast.success('Имя обновлено');
            setIsEditingName(false);
            refreshProfile();
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error('Не удалось сохранить');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedFirstName(profileData?.first_name || '');
        setEditedLastName(profileData?.last_name || '');
        setIsEditingName(false);
    };

    const handleConnectGoogle = async () => {
        triggerHaptic('medium');
        try {
            // КРИТИЧНО: Используем стандартный редирект для максимальной совместимости на мобильных
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    skipBrowserRedirect: false,
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google connect error:', error);
            toast.error('Ошибка подключения Google');
        }
    };

    const getTelegramDeepLink = (token?: string | null) => {
        if (token) {
            return `https://t.me/${telegramBotUsername}?start=link_${token}`;
        }
        return `https://t.me/${telegramBotUsername}`;
    };

    const handleConnectTelegram = async () => {
        triggerHaptic('medium');

        if (userContext?.platform === 'telegram' || profileData?.telegram_id) {
            toast.info('Ваш Telegram уже привязан');
            return;
        }

        if (!supabaseUser) {
            toast.error('Необходима авторизация');
            return;
        }

        try {
            setGeneratingToken(true);
            const { data, error } = await supabase.rpc('create_telegram_link_token');

            if (error) throw error;

            if (data) {
                setTelegramLinkToken(data);
                toast.success('Открой Telegram — бот уже ждёт тебя');
                window.open(getTelegramDeepLink(data), '_blank');
            }
        } catch (error: any) {
            console.error('Failed to generate link token:', error);
            toast.error(error.message || 'Не удалось создать токен');
        } finally {
            setGeneratingToken(false);
        }
    };

    const copyTelegramLink = () => {
        if (!telegramLinkToken) return;
        const linkText = `/start link_${telegramLinkToken}`;
        navigator.clipboard.writeText(linkText).then(() => {
            triggerHaptic('light');
            toast.success('Команда скопирована! Отправь её боту');
        }).catch(() => {
            toast.error('Не удалось скопировать');
        });
    };

    const openTelegramBot = () => {
        triggerHaptic('medium');
        window.open(getTelegramDeepLink(telegramLinkToken), '_blank');
    };

    // Avatar Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        triggerHaptic('light');
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // КРИТИЧНО: Используем любой доступный ID источника
        const userId = user?.id || profileData?.id || supabaseUser?.id;

        if (!userId) {
            toast.error('Ошибка: пользователь не найден (нет ID)');
            console.error('Avatar upload failed: No user ID found in user, profileData or supabaseUser');
            return;
        }

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            toast.error('Пожалуйста, выберите изображение');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('Размер изображения не должен превышать 5МБ');
            return;
        }

        try {
            setIsUploading(true);

            // КРИТИЧНО: Обновляем сессию перед загрузкой, чтобы избежать false-positive 401
            const { error: sessionError } = await supabase.auth.refreshSession();
            if (sessionError) {
                console.warn('Session refresh warning:', sessionError);
                // Не прерываем, так как сессия может быть все еще валидна
            }

            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/${Date.now()}.${fileExt}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    photo_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            // 4. Update local state and notify
            toast.success('Аватар обновлен!');
            refreshProfile(); // Refresh context/hooks

        } catch (error: any) {
            console.error('Avatar upload error:', error);
            toast.error('Не удалось загрузить аватар');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
                disabled={isUploading}
            />
            {/* Профиль */}
            <div>
                <SectionTitle title="Профиль" />
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-start gap-4">
                        {/* Аватар */}
                        <div className="relative shrink-0">
                            <UserAvatar
                                profileId={profileData?.id}
                                size="xl"
                                showPremiumGlow={false}
                                className={isUploading ? "opacity-50" : ""}
                            />

                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            <button
                                onClick={handleAvatarClick}
                                disabled={isUploading}
                                className={cn(
                                    "absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-800 flex items-center justify-center hover:bg-indigo-400 transition-all hover:scale-110 shadow-sm",
                                    isUploading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Camera className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>

                        {/* Инфо */}
                        <div className="flex-1 min-w-0">
                            {isEditingName ? (
                                <div className="space-y-2">
                                    <Input
                                        value={editedFirstName}
                                        onChange={(e) => setEditedFirstName(e.target.value)}
                                        placeholder="Имя"
                                        className="h-9 text-sm focus-visible:ring-indigo-500 bg-white dark:bg-slate-900"
                                        disabled={isSaving}
                                        autoFocus
                                    />
                                    <Input
                                        value={editedLastName}
                                        onChange={(e) => setEditedLastName(e.target.value)}
                                        placeholder="Фамилия"
                                        className="h-9 text-sm focus-visible:ring-indigo-500 bg-white dark:bg-slate-900"
                                        disabled={isSaving}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSaveName}
                                            disabled={isSaving}
                                            className="h-8 bg-indigo-500 hover:bg-indigo-600 px-3"
                                        >
                                            <Save className="w-3 h-3 mr-1.5" />
                                            Сохранить
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelEdit}
                                            disabled={isSaving}
                                            className="h-8 px-3"
                                        >
                                            Отмена
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 group">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                            {firstName} {lastName}
                                        </h3>
                                        <button
                                            onClick={() => {
                                                triggerHaptic('light');
                                                setIsEditingName(true);
                                            }}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        @{username}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                            Уровень {userLevel}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Подключённые аккаунты */}
            <div>
                <SectionTitle title="Подключённые аккаунты" />
                <div className="space-y-1">
                    <div className="space-y-2">
                        <SettingRow
                            icon={<MessageSquare className="w-4 h-4 text-sky-500" />}
                            label="Telegram"
                            description={profileData?.telegram_id ? "Аккаунт успешно привязан" : "Подключи бота для уведомлений"}
                        >
                            {profileData?.telegram_id || userContext?.platform === 'telegram' ? (
                                <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <Check className="w-3.5 h-3.5" />
                                    Активно
                                </span>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 hover:border-sky-500 hover:text-sky-500 transition-all rounded-lg"
                                    onClick={handleConnectTelegram}
                                    disabled={generatingToken}
                                >
                                    {generatingToken ? 'Подготовка...' : 'Подключить'}
                                </Button>
                            )}
                        </SettingRow>

                        {/* Расширенная карточка привязки Telegram */}
                        {telegramLinkToken && !profileData?.telegram_id && (
                            <div className="relative overflow-hidden p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="absolute top-0 right-0 p-2">
                                    <button
                                        onClick={() => setTelegramLinkToken(null)}
                                        className="p-1 rounded-full hover:bg-sky-500/10 text-slate-400 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[90%] leading-relaxed">
                                        Мы открыли Telegram. Если не сработало — нажми кнопку ниже или вставь команду в чат вручную:
                                    </p>

                                    <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 group transition-all focus-within:ring-2 focus-within:ring-sky-500/20">
                                        <code className="flex-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 break-all">
                                            /start link_{telegramLinkToken}
                                        </code>
                                        <button
                                            onClick={copyTelegramLink}
                                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-500 transition-all active:scale-90"
                                            title="Копировать"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={openTelegramBot}
                                            variant="default"
                                            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20 h-9 rounded-xl text-xs font-semibold"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                            Открыть бота
                                        </Button>
                                        <Button
                                            onClick={() => setTelegramLinkToken(null)}
                                            variant="outline"
                                            className="px-4 h-9 rounded-xl text-xs border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            Скрыть
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 italic">
                                        Токен действителен 10 минут
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Google */}
                    <SettingRow
                        icon={<GoogleIcon />}
                        label="Google"
                        description={supabaseUser?.app_metadata?.provider === 'google'
                            ? supabaseUser.email
                            : "Не подключено"}
                    >
                        {supabaseUser?.app_metadata?.provider === 'google' ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                                Активно
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 hover:border-indigo-500 hover:text-indigo-500"
                                onClick={handleConnectGoogle}
                            >
                                Подключить
                            </Button>
                        )}
                    </SettingRow>

                    {/* Email */}
                    <SettingRow
                        icon={<Mail className="w-4 h-4 text-blue-500" />}
                        label="Email"
                        description={
                            supabaseUser?.email && !supabaseUser.email.includes('@telegram.skily.app')
                                ? supabaseUser.email
                                : supabaseUser?.app_metadata?.provider === 'google'
                                    ? supabaseUser.email
                                    : "Не подключено"
                        }
                    >
                        {supabaseUser?.email && !supabaseUser.email.includes('@telegram.skily.app') ? (
                            <div className="flex flex-col items-end gap-1">
                                <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                                    <Check className="w-3.5 h-3.5" />
                                    {supabaseUser.email_confirmed_at ? 'Активно' : 'Ожидание'}
                                </span>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={handleConnectGoogle}
                            >
                                Подключить
                            </Button>
                        )}
                    </SettingRow>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* Выход */}
            <div>
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium"
                >
                    <LogOut className="w-4 h-4 mr-3" />
                    Выйти из аккаунта
                </Button>
            </div>
        </div>
    );
};

export default AccountTab;
