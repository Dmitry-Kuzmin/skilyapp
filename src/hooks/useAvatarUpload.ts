import { useState, useRef, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserContext } from '@/contexts/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { convertHeicToJpeg } from '@/lib/heicConversion';

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

    const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/jpeg', quality);
                };
                img.onerror = (e) => reject(e);
            };
            reader.onerror = (e) => reject(e);
        });
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
                    console.log('[AvatarUpload] Attempting HEIC conversion...');
                    fileToUpload = await convertHeicToJpeg(file, 0.8);
                } catch (convErr) {
                    console.error('[AvatarUpload] HEIC conversion failed:', convErr);
                    throw new Error('Не удалось подготовить фото HEIC. Откройте фото и сохраните его как JPEG/PNG или сделайте скриншот.');
                }
            }

            // Always compress if file is large or after HEIC conversion to ensure size limits
            if (fileToUpload.size > 1024 * 1024 || isHeic) {
                toast.loading('Оптимизируем размер фото...', { id: toastId });
                fileToUpload = await compressImage(fileToUpload);
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
