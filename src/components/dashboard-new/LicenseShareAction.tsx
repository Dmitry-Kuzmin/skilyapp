import React, { useState } from 'react';
import { Share, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { domToPng } from 'modern-screenshot';
import { toast } from '@/lib/toast';
import { shareToStory, getTelegramWebApp, isTelegramMobilePlatformName, hasTelegramPremium } from '@/lib/telegram';
import { LicenseStoryTemplate } from './LicenseStoryTemplate';
import { supabase } from '@/integrations/supabase/client';

interface LicenseShareActionProps {
    userProfile: any;
    stats: any;
    isDarkTheme: boolean;
    cardContent: React.ReactNode;
    language: string;
}

export const LicenseShareAction: React.FC<LicenseShareActionProps> = ({
    userProfile,
    stats,
    isDarkTheme,
    cardContent,
    language
}) => {
    const [isGenerating, setIsGenerating] = useState(false);

    // Рекурсивная очистка всего объекта от битых UTF-16
    const deepClean = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g, (m, pair) => pair || '');
        }
        if (Array.isArray(obj)) {
            return obj.map(deepClean);
        }
        if (obj !== null && typeof obj === 'object') {
            if (React.isValidElement(obj)) {
                return React.cloneElement(obj as React.ReactElement, deepClean(obj.props));
            }
            const result: any = {};
            for (const key in obj) {
                result[key] = deepClean(obj[key]);
            }
            return result;
        }
        return obj;
    };

    const rawUsername = userProfile?.username || '';
    const cleanUsername = deepClean(rawUsername.replace(/[^\w\sа-яА-ЯёЁ]/gi, '').trim());
    const usernamePart = cleanUsername 
        ? Array.from(cleanUsername).slice(0, 5).join('').toUpperCase() 
        : 'SKILY';
    
    const referralCode = deepClean(userProfile?.referral_code || `${usernamePart}-PRO`);
    const referralLink = deepClean(`${window.location.origin}/join/${referralCode}`);
    const readiness = stats.accuracy || 85;

    const generateImage = async (): Promise<string | null> => {
        const template = document.getElementById('license-story-template');
        if (!template) {
            console.error('[Share] Template #license-story-template not found in DOM');
            toast.error('Template not found');
            return null;
        }

        setIsGenerating(true);

        try {
            if (document.fonts) {
                await document.fonts.ready;
            }

            const sanitizeDOM = (node: Node) => {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
                    node.nodeValue = node.nodeValue.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g, (m, pair) => pair || '');
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        sanitizeDOM(node.childNodes[i]);
                    }
                }
            };
            sanitizeDOM(template);

            await new Promise(resolve => setTimeout(resolve, 300));

            const originalEncode = window.encodeURIComponent;
            window.encodeURIComponent = (str: string | number | boolean) => {
                const s = String(str);
                try {
                    return originalEncode(s);
                } catch (e) {
                    return originalEncode(
                        s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
                    );
                }
            };

            let dataUrl = null;
            try {
                dataUrl = await domToPng(template, {
                    scale: 2.5,
                    backgroundColor: '#0F1014',
                    timeout: 10000,
                });
            } finally {
                window.encodeURIComponent = originalEncode;
            }

            if (!dataUrl || dataUrl.length < 1000) {
                throw new Error('Generated image is empty or too small');
            }

            return dataUrl;
        } catch (error) {
            console.error('[Share] Error generating image:', error);
            toast.error('Не удалось сгенерировать изображение');
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendToBot = async () => {
        if (!userProfile?.telegram_id) {
            toast.error(language === 'ru' ? 'Только для Telegram' : 'Only for Telegram');
            return;
        }

        setIsGenerating(true);
        const loadingToastId = toast.loading(language === 'ru' ? 'Отправляем в бот...' : 'Sending to bot...');

        try {
            const dataUrl = await generateImage();
            if (!dataUrl) throw new Error('Image generation failed');

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            const fileName = `stories/${userProfile?.id || 'anon'}_bot_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: edgeErr } = await supabase.functions.invoke('notification-sender', {
                body: {
                    user_id: userProfile.id,
                    image_url: publicUrl,
                    title: language === 'ru' ? 'Твоя карточка готова! 🏎💨' : 'Your card is ready! 🏎💨',
                    message: language === 'ru' 
                        ? 'Прикольно? Теперь ты можешь сохранить её или выложить в сторис, чтобы бросить вызов друзьям!' 
                        : 'Cool? Now you can save it or post to stories to challenge your friends!',
                    force: true
                }
            });

            if (edgeErr) throw edgeErr;

            toast.dismiss(loadingToastId);
            toast.success(language === 'ru' ? 'Отправили! Проверь сообщения от бота' : 'Sent! Check messages from bot!');
        } catch (error) {
            toast.dismiss(loadingToastId);
            console.error('[SendToBot] Error:', error);
            toast.error(language === 'ru' ? 'Ошибка отправки' : 'Sending failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        setIsGenerating(true);
        const loadingToastId = toast.loading(language === 'ru' ? 'Генерируем вызов...' : 'Generating challenge...');

        try {
            const dataUrl = await generateImage();
            if (!dataUrl) throw new Error('Image generation failed');

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            const webApp = getTelegramWebApp();
            const platform = webApp?.platform;
            const isMobileTG = isTelegramMobilePlatformName(platform);
            const isStoryAvailable = typeof webApp?.shareToStory === 'function';
            const isPremium = hasTelegramPremium();

            let storySuccess = false;

            if (isMobileTG && isStoryAvailable && isPremium) {
                try {
                    // Если мы в мобильном TG и есть функция отправки в Story, только тогда нам нужен Public URL
                    const fileName = `stories/${userProfile?.id || 'anon'}_${Date.now()}.png`;
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(fileName, blob, {
                            contentType: 'image/png',
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);

                    storySuccess = shareToStory(publicUrl, {
                        text: language === 'ru' ? 'Мой шанс сдать теорию в DGT — 100%! А твой? 🏎💨' : 'My chance to pass DGT theory is 100%! What about you? 🏎💨',
                        widget_link: {
                            url: referralLink,
                            name: language === 'ru' ? 'Бросить вызов' : 'Challenge me'
                        }
                    });

                    if (storySuccess) {
                        toast.dismiss(loadingToastId);
                        toast.success(language === 'ru' ? 'Вызов отправлен в сторис!' : 'Challenge sent to stories!');
                        return; // Успешно выложили в сторис
                    }
                } catch (storyErr) {
                    console.error('[Share] Story failed, falling back to native share:', storyErr);
                    // Не бросаем ошибку, идем к следующему способу (native share)
                }
            }

            // FALLBACK TO NATIVE SHARE (системная шторка)
            if (navigator.share && /mobile|iphone|ipad|android/i.test(navigator.userAgent)) {
                const file = new File([blob], 'skily-challenge.png', { type: 'image/png' });
                toast.dismiss(loadingToastId);
                
                try {
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Skily DGT Challenge',
                            text: language === 'ru' ? 'Мой шанс сдать теорию в DGT — 100%! А твой?' : 'My chance to pass DGT theory is 100%! What about you?',
                        });
                        return;
                    }
                } catch (shareErr: any) {
                    if (shareErr.name === 'AbortError') {
                        return; // Пользователь сам закрыл шторку
                    }
                    console.error('[Share] Native share failed:', shareErr);
                }
            }

            // FALLBACK TO DOWNLOAD (десктоп или если всё остальное не сработало)
            const link = document.createElement('a');
            link.download = `Skily_DGT_Pass_${userProfile?.username || 'user'}.png`;
            link.href = dataUrl;
            link.click();

            toast.dismiss(loadingToastId);
            try {
                await navigator.clipboard.writeText(referralLink);
                toast.success(
                    language === 'ru' 
                        ? '✔ Картинка скачана, ссылка скопирована!' 
                        : language === 'es'
                        ? '¡Imagen guardada и enlace copiado!'
                        : '✔ Image saved, link copied!'
                );
            } catch (clipErr) {
                toast.success(language === 'ru' ? 'Картинка сохранена!' : 'Image saved!');
            }
        } catch (error: any) {
            toast.dismiss(loadingToastId);
            console.error('[Share] Error:', error);
            if (error.name !== 'AbortError') {
                toast.error(language === 'ru' ? 'Ошибка шэринга' : 'Sharing failed');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative">
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <LicenseStoryTemplate 
                    cardContent={React.isValidElement(cardContent) ? React.cloneElement(cardContent as React.ReactElement, deepClean(cardContent.props)) : cardContent}
                    referralCode={referralCode}
                    referralLink={referralLink}
                    readiness={readiness}
                    isStatic={true}
                />
            </div>

            <div className="flex items-center gap-2">
                {userProfile?.telegram_id && (
                    <button
                        onClick={handleSendToBot}
                        disabled={isGenerating}
                        className={cn(
                            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 group/bot relative overflow-hidden active:scale-90",
                            isGenerating ? "opacity-70 pointer-events-none" : "hover:scale-110",
                            "bg-gradient-to-tr from-green-400/20 via-emerald-500/20 to-teal-400/20 backdrop-blur-md border border-white/20 shadow-xl"
                        )}
                        title={language === 'ru' ? "Отправить в бот" : "Send to bot"}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/bot:translate-x-[100%] transition-transform duration-1000" />
                        
                        {isGenerating ? (
                            <Loader2 size={18} className="animate-spin text-white" />
                        ) : (
                            <MessageSquare size={18} className={cn(
                                "transition-all group-hover/bot:scale-110",
                                isDarkTheme ? "text-zinc-300" : "text-emerald-600"
                            )} />
                        )}
                    </button>
                )}

                <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 group/share relative overflow-hidden active:scale-90",
                        isGenerating ? "opacity-70 pointer-events-none" : "hover:scale-110",
                        "bg-gradient-to-tr from-cyan-400/20 via-fuchsia-500/20 to-yellow-400/20 backdrop-blur-md border border-white/20 shadow-xl"
                    )}
                    title={language === 'ru' ? "Поделиться" : "Compartir"}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/share:translate-x-[100%] transition-transform duration-1000" />
                    
                    {isGenerating ? (
                        <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                        <Share size={18} className={cn(
                            "transition-all group-hover/share:scale-110",
                            isDarkTheme ? "text-zinc-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" : "text-indigo-500"
                        )} />
                    )}
                </button>
            </div>
        </div>
    );
};
