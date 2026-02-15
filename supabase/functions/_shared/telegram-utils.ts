
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Синхронизирует аватар пользователя из Telegram в Supabase Storage (avatars bucket)
 * @param supabaseAdmin - Клиент Supabase с service_role
 * @param telegramId - ID пользователя в Telegram
 * @param botToken - Токен Telegram бота
 * @returns Публичный URL аватара в Supabase Storage или null
 */
export async function syncTelegramProfilePhoto(
    supabaseAdmin: SupabaseClient,
    telegramId: number,
    botToken: string
): Promise<string | null> {
    try {
        console.log(`[syncTelegramProfilePhoto] Starting sync for ${telegramId}`);
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
        const data = await response.json();

        if (!data.ok || !data.result?.photos?.[0]?.[0]) {
            console.log(`[syncTelegramProfilePhoto] No photos found for ${telegramId}`);
            return null;
        }

        const photos = data.result.photos[0];
        // Берем самую большую версию
        const fileId = photos[photos.length - 1].file_id;

        const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileResponse.json();
        if (!fileData.ok || !fileData.result?.file_path) {
            console.warn(`[syncTelegramProfilePhoto] Failed to get file path for ${fileId}`);
            return null;
        }

        const telegramImageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

        // Скачиваем контент изображения
        const imageResponse = await fetch(telegramImageUrl);
        if (!imageResponse.ok) {
            console.warn(`[syncTelegramProfilePhoto] Failed to download image from Telegram: ${imageResponse.statusText}`);
            return null;
        }

        // Используем ArrayBuffer -> Uint8Array для надежной загрузки в Edge Functions
        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);

        // Формируем имя файла
        const fileName = `${telegramId}.jpg`;

        // Загружаем в Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(fileName, uint8Array, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) {
            console.error('[syncTelegramProfilePhoto] Storage upload error:', uploadError);
            return null;
        }

        // Формируем публичный URL вручную для надежности
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

        console.log(`[syncTelegramProfilePhoto] Successfully synced avatar: ${publicUrl}`);
        return publicUrl;
    } catch (e) {
        console.error('[syncTelegramProfilePhoto] Unexpected error:', e);
        return null;
    }
}
