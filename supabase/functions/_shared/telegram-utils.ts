
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Синхронизирует аватар пользователя из Telegram в Supabase Storage (avatars bucket)
 * @param supabaseAdmin - Клиент Supabase с service_role
 * @param telegramId - ID пользователя в Telegram
 * @param botToken - Токен Telegram бота
 * @param hintPhotoUrl - Опциональный URL фото из initData пользователя
 * @returns Публичный URL аватара в Supabase Storage или null
 */
export async function syncTelegramProfilePhoto(
    supabaseAdmin: SupabaseClient,
    telegramId: number,
    botToken: string,
    hintPhotoUrl?: string | null
): Promise<string | null> {
    try {
        console.log(`[syncTelegramProfilePhoto] Starting sync for user ${telegramId}...`);

        let telegramImageUrl: string | null = null;

        // 1. Пытаемся получить фото через Bot API
        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
            const data = await response.json();

            if (data.ok && data.result?.photos?.[0]?.[0]) {
                const photos = data.result.photos[0];
                const fileId = photos[photos.length - 1].file_id; // Берем самое большое

                const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                const fileData = await fileResponse.json();

                if (fileData.ok && fileData.result?.file_path) {
                    telegramImageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                    console.log(`[syncTelegramProfilePhoto] Found photo via Bot API: ${fileId}`);
                }
            } else {
                console.log(`[syncTelegramProfilePhoto] No photos found via Bot API for ${telegramId}`);
            }
        } catch (botErr) {
            console.error(`[syncTelegramProfilePhoto] Bot API error:`, botErr);
        }

        // 2. Если Bot API не дал результат, но есть hint URL - используем его
        if (!telegramImageUrl && hintPhotoUrl) {
            console.log(`[syncTelegramProfilePhoto] Using hint photo URL for ${telegramId}`);
            telegramImageUrl = hintPhotoUrl;
        }

        if (!telegramImageUrl) {
            console.warn(`[syncTelegramProfilePhoto] No image source available for ${telegramId}`);
            return null;
        }

        // 3. Скачиваем изображение
        console.log(`[syncTelegramProfilePhoto] Downloading image from source...`);
        const imageResponse = await fetch(telegramImageUrl);
        if (!imageResponse.ok) {
            console.error(`[syncTelegramProfilePhoto] Failed to download image: ${imageResponse.statusText}`);
            return null;
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        const fileName = `${telegramId}.jpg`;

        // 4. Загружаем в Supabase Storage
        console.log(`[syncTelegramProfilePhoto] Uploading to avatars bucket: ${fileName}`);
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

        // 5. Генерируем публичную ссылку вручную
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // Добавляем timestamp для обхода кэша
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;

        console.log(`[syncTelegramProfilePhoto] Successfully synced avatar: ${publicUrl}`);
        return publicUrl;

    } catch (e) {
        console.error('[syncTelegramProfilePhoto] Global error:', e);
        return null;
    }
}
