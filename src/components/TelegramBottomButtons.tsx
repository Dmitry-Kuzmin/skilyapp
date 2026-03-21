import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { updateTelegramBottomButton, hideTelegramBottomButton, isTelegramMiniApp } from "@/lib/telegram";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModalStore } from "@/store/modalStore";

/**
 * Глобальный компонент для управления кнопкой BottomButton в Telegram.
 * Позволяет реализовывать премиальный UX с кастомными эмодзи.
 */
export const TelegramBottomButtons = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { openModal } = useModalStore();

  useEffect(() => {
    if (!isTelegramMiniApp()) return;

    // Скрываем и очищаем кнопку при каждом переходе, затем настраиваем заново
    hideTelegramBottomButton();

    const path = location.pathname;
    const isDashboard = path === "/dashboard" || path === "/";
    const isGames = path === "/games";
    const isLearning = path.startsWith("/learning");

    // UX: Кнопка "Начать экзамен" на дашборде
    if (isDashboard) {
      updateTelegramBottomButton({
        text: language === 'ru' ? 'Начать экзамен' : 'Start Exam',
        color: '#4f46e5', // Indigo-600
        textColor: '#ffffff',
        isVisible: true,
        isActive: true,
        hasShineEffect: true,
        // Кастомный эмодзи машинки (нужно знать реальный ID из Telegram)
        iconCustomEmojiId: '5465225333595679316', 
        onClick: () => {
          navigate('/tests');
        }
      });
    } 
    // UX: Магазин бустов в разделе игр
    else if (isGames) {
      updateTelegramBottomButton({
        text: language === 'ru' ? 'Магазин бустов' : 'Boost Shop',
        color: '#8b5cf6', // Violet-500
        textColor: '#ffffff',
        isVisible: true,
        isActive: true,
        hasShineEffect: true,
        // Кастомный эмодзи сумки (покупки)
        iconCustomEmojiId: '5465225333595679317',
        onClick: () => {
          openModal('BOOST_SHOP');
        }
      });
    }
    // UX: Продолжить обучение
    else if (isLearning && path === "/learning") {
      updateTelegramBottomButton({
        text: language === 'ru' ? 'Открыть карту' : 'Open Map',
        color: '#10b981', // Emerald-500
        textColor: '#ffffff',
        isVisible: true,
        isActive: true,
        iconCustomEmojiId: '5465225333595679318', // Placeholder для Map/Pin
        onClick: () => {
          navigate('/learning-map');
        }
      });
    }

    return () => {
      hideTelegramBottomButton();
    };
  }, [location.pathname, language, navigate, openModal]);

  return null;
};
