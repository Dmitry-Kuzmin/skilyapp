import { useState, useRef, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/contexts/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';

export function useAvatarUpload() {
    const userContext = useContext(UserContext);
    const queryClient = useQueryClient();
    const { profileData, refresh: refreshProfile } = useProfileData();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabaseUser = userContext?.supabaseUser;

    const handleAvatarClick = () => {
        triggerHaptic('light');
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!supabaseUser?.id || !profileData?.id) {
            toast.error('Ошибка: данные пользователя не загружены');
            console.error('Avatar upload failed: Missing IDs', { supabaseUserId: !!supabaseUser?.id, profileId: !!profileData?.id });
            return;
        }

        let fileToUpload = file;
        const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
        const toastId = 'avatar-upload-global';
        toast.loading(isHeic ? 'Конвертируем HEIC в JPEG...' : 'Загружаем аватар...', { id: toastId });

        try {
            setIsUploading(true);

            if (isHeic) {
                try {
                    try {
                        const heic2anyModule = await import('heic2any');
                        const heic2any = (heic2anyModule as any).default || heic2anyModule;

                        console.log('[AvatarUpload] Attempting heic2any conversion...');
                        const convertedBlob = await heic2any({
                            blob: file,
                            toType: 'image/jpeg',
                            quality: 0.8
                        });

                        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                        if (blob && blob.size > 0) {
                            fileToUpload = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
                            console.log('[AvatarUpload] heic2any success');
                        } else {
                            throw new Error('Empty blob from heic2any');
                        }
                    } catch (libErr) {
                        console.warn('[AvatarUpload] heic2any failed, trying native Safari fallback:', libErr);

                        fileToUpload = await new Promise((resolve, reject) => {
                            const url = URL.createObjectURL(file);
                            const img = new Image();
                            img.onload = () => {
                                URL.revokeObjectURL(url);
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth;
                                canvas.height = img.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                if (!ctx) {
                                    reject(new Error('Canvas context not available'));
                                    return;
                                }
                                ctx.drawImage(img, 0, 0);
                                canvas.toBlob((blob) => {
                                    if (blob) {
                                        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
                                    } else {
                                        reject(new Error('Canvas toBlob failed'));
                                    }
                                }, 'image/jpeg', 0.9);
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Native rendering failed'));
                            };
                            img.src = url;
                            setTimeout(() => reject(new Error('Timeout')), 5000);
                        }) as File;
                        console.log('[AvatarUpload] Native Safari conversion success');
                    }

                    toast.loading('Загружаем подготовленное фото...', { id: toastId });
                } catch (convErr: any) {
                    console.error('[AvatarUpload] All HEIC conversion attempts failed:', convErr);
                    throw new Error('Ваш формат фото слишком новый для обработки. Сделайте скриншот этого фото и загрузите его — это сработает мгновенно!');
                }
            }

            const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
            const filePath = `${supabaseUser.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, fileToUpload, {
                    upsert: true,
                    contentType: fileToUpload.type
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await (supabase as any)
                .from('profiles')
                .update({
                    photo_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profileData.id);

            if (updateError) throw updateError;

            toast.success('Аватар обновлён!', { id: toastId });

            queryClient.invalidateQueries({ queryKey: ['profile-data'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
            refreshProfile();

        } catch (error: any) {
            console.error('Avatar upload error:', error);
            toast.error(`Не удалось загрузить аватар: ${error.message || 'Ошибка сети'}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return {
        isUploading,
        fileInputRef,
        handleAvatarClick,
        handleAvatarUpload
    };
}
