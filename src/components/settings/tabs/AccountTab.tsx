/**
 * AccountTab - Вкладка "Аккаунт"
 * 
 * Профиль, подключённые сервисы, выход
 */

import React, { useContext, useState, useEffect } from 'react';
import { User, Camera, LogOut, Check, MessageSquare, Mail, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { UserContext } from '@/contexts/UserContext';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { useProfileData } from '@/hooks/useProfileData';

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
    const { profileData, refresh: refreshProfile, loading: profileLoading } = useProfileData();

    const user = userContext?.user;
    const logout = userContext?.logout || (() => { });
    const supabaseUser = userContext?.supabaseUser;

    // Редактирование имени
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedFirstName, setEditedFirstName] = useState('');
    const [editedLastName, setEditedLastName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Синхронизируем локальный стейт при получении данных
    useEffect(() => {
        if (profileData && !isEditingName) {
            setEditedFirstName(profileData.first_name || '');
            setEditedLastName(profileData.last_name || '');
        }
    }, [profileData, isEditingName]);

    // КРИТИЧНО: Расширенный поиск фото
    const photoUrl =
        profileData?.photo_url ||
        profileData?.avatar_url ||
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
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname,
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google connect error:', error);
            toast.error('Ошибка подключения Google');
        }
    };

    const handleConnectTelegram = () => {
        triggerHaptic('medium');
        if (userContext?.platform === 'telegram') {
            toast.info('Вы уже используете Telegram');
            return;
        }

        // Открываем бота для привязки аккаунта
        const botUsername = 'sdadimtutbot';
        window.open(`https://t.me/${botUsername}?start=link_account`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Профиль */}
            <div>
                <SectionTitle title="Профиль" />
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-start gap-4">
                        {/* Аватар */}
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-slate-700 shadow-lg">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt="Аватар"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.warn('Avatar image failed to load:', photoUrl);
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : profileData?.equipped_avatar && profileData.equipped_avatar.length <= 4 ? (
                                    <span className="text-4xl">
                                        {profileData.equipped_avatar}
                                    </span>
                                ) : (
                                    <span className="text-2xl font-bold text-white">
                                        {firstName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    triggerHaptic('light');
                                    toast.info('Аватары можно менять в магазине скинов');
                                }}
                                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-800 flex items-center justify-center hover:bg-indigo-400 transition-all hover:scale-110"
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
                                        className="h-9 text-sm focus-visible:ring-indigo-500"
                                        disabled={isSaving}
                                    />
                                    <Input
                                        value={editedLastName}
                                        onChange={(e) => setEditedLastName(e.target.value)}
                                        placeholder="Фамилия"
                                        className="h-9 text-sm focus-visible:ring-indigo-500"
                                        disabled={isSaving}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSaveName}
                                            disabled={isSaving}
                                            className="h-8 bg-indigo-500 hover:bg-indigo-600"
                                        >
                                            <Save className="w-3 h-3 mr-1" />
                                            Сохранить
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={isSaving}
                                            className="h-8"
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Отмена
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                            {firstName} {lastName}
                                        </h3>
                                        <button
                                            onClick={() => {
                                                triggerHaptic('light');
                                                setIsEditingName(true);
                                            }}
                                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        @{username}
                                    </p>
                                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 font-medium">
                                        Уровень {userLevel}
                                    </p>
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
                    {/* Telegram */}
                    <SettingRow
                        icon={<MessageSquare className="w-4 h-4 text-sky-500" />}
                        label="Telegram"
                        description={user?.id ? `@${user.username || 'подключено'}` : "Не подключено"}
                    >
                        {user?.id ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                                Активно
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 hover:border-sky-500 hover:text-sky-500"
                                onClick={handleConnectTelegram}
                            >
                                Подключить
                            </Button>
                        )}
                    </SettingRow>

                    {/* Google */}
                    <SettingRow
                        icon={<GoogleIcon />}
                        label="Google"
                        description={supabaseUser?.app_metadata?.provider === 'google'
                            ? supabaseUser.email
                            : "Не подключено"}
                    >
                        {supabaseUser?.app_metadata?.provider === 'google' ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
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
                        description={supabaseUser?.email || "Не подключено"}
                    >
                        {supabaseUser?.email ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                                {supabaseUser.email_confirmed_at ? 'Подтверждён' : 'Не подтверждён'}
                            </span>
                        ) : (
                            <Button variant="outline" size="sm" className="text-xs h-8">
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
