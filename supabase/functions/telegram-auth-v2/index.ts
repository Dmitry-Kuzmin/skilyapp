// telegram-auth-v2: Обмен Telegram initData на полноценную Supabase сессию
// Это фундаментальное решение для интеграции Telegram Mini App с Supabase Auth

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Вспомогательная функция: Uint8Array -> hex
function bufToHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Получаем фото пользователя через Telegram Bot API
async function getTelegramProfilePhoto(telegramId: number): Promise<string | null> {
    try {
        // Используем метод getUserProfilePhotos для получения фото
        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
        );

        if (!response.ok) {
            console.log('[telegram-auth-v2] ⚠️ Failed to get profile photos:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.ok || !data.result?.photos?.[0]?.[0]) {
            console.log('[telegram-auth-v2] ⚠️ No profile photos found');
            return null;
        }

        // Берём самую большую версию фото (последний элемент массива)
        const photos = data.result.photos[0];
        const largestPhoto = photos[photos.length - 1];
        const fileId = largestPhoto.file_id;

        // Получаем direct URL файла
        const fileResponse = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
        );

        if (!fileResponse.ok) {
            console.log('[telegram-auth-v2] ⚠️ Failed to get file path');
            return null;
        }

        const fileData = await fileResponse.json();

        if (!fileData.ok || !fileData.result?.file_path) {
            console.log('[telegram-auth-v2] ⚠️ No file path in response');
            return null;
        }

        const photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
        console.log('[telegram-auth-v2] ✅ Got profile photo URL');
        return photoUrl;

    } catch (error) {
        console.error('[telegram-auth-v2] ⚠️ Error fetching profile photo:', error);
        return null;
    }
}

// 1. Валидация данных от Telegram (Криптография)
async function validateTelegramData(initData: string): Promise<Record<string, unknown>> {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
        throw new Error("Missing hash in initData");
    }

    urlParams.delete("hash");

    // Сортируем ключи (требование Telegram)
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${key}=${val}`)
        .join("\n");

    // Создаем секретный ключ из "WebAppData" + BOT_TOKEN
    const encoder = new TextEncoder();

    // Шаг 1: HMAC-SHA256("WebAppData", BOT_TOKEN)
    const secretKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode("WebAppData"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const secret = await crypto.subtle.sign(
        "HMAC",
        secretKey,
        encoder.encode(BOT_TOKEN)
    );

    // Шаг 2: HMAC-SHA256(secret, dataCheckString)
    const signingKey = await crypto.subtle.importKey(
        "raw",
        secret,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const calculatedHash = await crypto.subtle.sign(
        "HMAC",
        signingKey,
        encoder.encode(dataCheckString)
    );

    const calculatedHashHex = bufToHex(calculatedHash);

    // Сравниваем хэши
    if (calculatedHashHex !== hash) {
        console.error('[telegram-auth-v2] Hash mismatch:', {
            calculated: calculatedHashHex,
            received: hash,
            dataCheckString: dataCheckString.substring(0, 100) + '...'
        });
        throw new Error("Invalid Telegram Data: hash mismatch");
    }

    // Парсим данные пользователя
    const userStr = urlParams.get("user");
    if (!userStr) {
        throw new Error("Missing user in initData");
    }

    const user = JSON.parse(userStr);

    // Проверяем время auth_date (Telegram рекомендует отклонять данные старше 86400 секунд)
    const authDate = parseInt(urlParams.get("auth_date") || "0");
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (timeDiff > 86400) {
        console.warn('[telegram-auth-v2] ⚠️ initData too old:', {
            authDate: new Date(authDate * 1000).toISOString(),
            timeDiff: `${timeDiff} seconds`,
        });
        throw new Error("initData expired (older than 24 hours)");
    }

    // Логируем ВСЕ данные пользователя
    console.log('[telegram-auth-v2] ✅ Validated Telegram user (full data):', {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
        allows_write_to_pm: user.allows_write_to_pm,
        photo_url: user.photo_url, // Обычно undefined в initData
    });

    return user;
}

Deno.serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { initData } = await req.json();

        if (!initData) {
            throw new Error("Missing initData in request body");
        }

        console.log('[telegram-auth-v2] 🔐 Validating initData...');
        const telegramUser = await validateTelegramData(initData);

        // 🆕 Получаем фото профиля через Bot API (initData его не содержит)
        let photoUrl = telegramUser.photo_url;
        if (!photoUrl) {
            console.log('[telegram-auth-v2] 📷 Fetching profile photo via Bot API...');
            photoUrl = await getTelegramProfilePhoto(telegramUser.id);
        }

        // 2. Инициализируем Admin-клиент (Service Role)
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 3. Формируем email и пароль для Supabase Auth
        const email = `tg_${telegramUser.id}@telegram.skily.app`;
        const password = `tg_secure_${telegramUser.id}_${BOT_TOKEN.substring(0, 10)}`;

        console.log('[telegram-auth-v2] 🔑 Attempting sign in for:', email);

        // Пытаемся залогинить (если юзер уже есть)
        const signInResult = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });
        let { data } = signInResult;
        const { error } = signInResult;

        let isNewUser = false;

        // Если юзера нет — создаем его через Admin API
        if (error) {
            console.log('[telegram-auth-v2] 📝 User not found, creating via Admin API...');
            isNewUser = true;

            const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
                    avatar_url: photoUrl,
                    telegram_id: telegramUser.id,
                    telegram_username: telegramUser.username || null,
                    is_telegram_user: true,
                    language_code: telegramUser.language_code || 'ru',
                    is_premium: telegramUser.is_premium || false,
                    allows_write_to_pm: telegramUser.allows_write_to_pm || false,
                }
            });

            if (createError) {
                console.error('[telegram-auth-v2] ❌ Admin createUser error:', createError);
                throw createError;
            }

            console.log('[telegram-auth-v2] ✅ User created via Admin API:', createData.user?.id);

            // Логинимся под созданным пользователем
            const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.error('[telegram-auth-v2] ❌ SignIn after create error:', signInError);
                throw signInError;
            }

            data = signInData;
        } else {
            console.log('[telegram-auth-v2] ✅ Existing user logged in:', data?.user?.id);

            // 🆕 Обновляем user_metadata для существующих пользователей
            if (data?.user?.id) {
                console.log('[telegram-auth-v2] 🔄 Updating user metadata...');
                await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
                    user_metadata: {
                        full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
                        avatar_url: photoUrl,
                        telegram_id: telegramUser.id,
                        telegram_username: telegramUser.username || null,
                        is_telegram_user: true,
                        language_code: telegramUser.language_code || 'ru',
                        is_premium: telegramUser.is_premium || false,
                        allows_write_to_pm: telegramUser.allows_write_to_pm || false,
                    }
                });
            }
        }

        // 4. Проверяем, что у нас есть сессия
        if (!data?.session) {
            throw new Error("Failed to create session");
        }

        // 5. 🆕 ВСЕГДА обновляем профиль в таблице profiles (при каждом входе!)
        if (data.user) {
            console.log('[telegram-auth-v2] 📊 Syncing profile to database...');

            // Собираем данные для профиля (только существующие колонки!)
            const profileData = {
                user_id: data.user.id,
                telegram_id: telegramUser.id,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name || null,
                username: telegramUser.username || null,
                photo_url: photoUrl,
                language_code: telegramUser.language_code || 'ru',
                updated_at: new Date().toISOString(),
            };

            // Пробуем update по telegram_id (это UNIQUE constraint!)
            const { data: existingProfile, error: selectError } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('telegram_id', telegramUser.id)
                .maybeSingle();

            if (existingProfile) {
                // Профиль существует — обновляем (только существующие колонки!)
                console.log('[telegram-auth-v2] 📝 Updating existing profile by telegram_id...');
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        user_id: data.user.id,
                        first_name: telegramUser.first_name,
                        last_name: telegramUser.last_name || null,
                        username: telegramUser.username || null,
                        photo_url: photoUrl,
                        language_code: telegramUser.language_code || 'ru',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('telegram_id', telegramUser.id);

                if (updateError) {
                    console.warn('[telegram-auth-v2] ⚠️ Profile update error:', updateError);
                } else {
                    console.log('[telegram-auth-v2] ✅ Profile updated successfully');
                }
            } else {
                // Профиль не существует — создаём
                console.log('[telegram-auth-v2] 📝 Creating new profile...');
                const { error: insertError } = await supabaseAdmin
                    .from('profiles')
                    .insert(profileData);

                if (insertError) {
                    console.warn('[telegram-auth-v2] ⚠️ Profile insert error:', insertError);
                } else {
                    console.log('[telegram-auth-v2] ✅ Profile created successfully');
                }
            }
        }

        console.log('[telegram-auth-v2] 🎉 Session created successfully!');

        // 6. Возвращаем сессию клиенту
        return new Response(
            JSON.stringify({
                session: data.session,
                user: data.user,
                telegram_user: {
                    ...telegramUser,
                    photo_url: photoUrl, // Возвращаем полученное фото
                },
                is_new_user: isNewUser
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );

    } catch (err) {
        console.error('[telegram-auth-v2] ❌ Error:', err);
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : 'Unknown error',
                details: err instanceof Error ? err.stack : undefined
            }),
            {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
