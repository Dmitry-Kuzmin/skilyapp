import { useModalStore, type ModalType, getModalUrlKey } from '@/store/modalStore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import React from 'react';

// Импорты всех модалок
import { AuthModal } from '@/components/AuthModal';
import { ProfileModal } from '@/components/ProfileModal';
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { DuelPassSeasonModal } from '@/components/monetization/DuelPassSeasonModal';
import { FlashCardsModal } from '@/components/FlashCardsModal';
import { TermProgressModal } from '@/components/TermProgressModal';
import { HallOfFameModal } from '@/components/HallOfFameModal';
import { DuelPassLeaderboardModal } from '@/components/leaderboard/DuelPassLeaderboardModal';
import { LeaderboardRewardsModal } from '@/components/leaderboard/LeaderboardRewardsModal';
import { ReferralModal } from '@/components/ReferralModal';
import { ActivatePremiumKeyModal } from '@/components/ActivatePremiumKeyModal';
import { DuelJoinModal } from '@/components/duel/DuelJoinModal';
import { DuelCreateModal } from '@/components/duel/DuelCreateModal';
import { HelpFeedbackModal } from '@/components/HelpFeedbackModal';
import { ReportProblemModal } from '@/components/ReportProblemModal';
import { ReminderConnectModal } from '@/components/notifications/ReminderConnectModal';
import { CelebrationModal } from '@/components/dashboard-new/CelebrationModal';

/**
 * Маппинг типов модалок на компоненты
 * Поддерживает разные интерфейсы модалок (onClose vs onOpenChange)
 */
const MODAL_COMPONENTS: Record<ModalType, React.ComponentType<any> | null> = {
  AUTH: AuthModal,
  PROFILE: ProfileModal,
  BOOST_SHOP: BoostShopModal,
  PAYWALL: PaywallModal,
  DUEL_PASS: DuelPassSeasonModal,
  FLASH_CARDS: FlashCardsModal,
  TERM_PROGRESS: TermProgressModal,
  HALL_OF_FAME: HallOfFameModal,
  DUEL_PASS_LEADERBOARD: DuelPassLeaderboardModal,
  LEADERBOARD_REWARDS: LeaderboardRewardsModal,
  REFERRAL: ReferralModal,
  ACTIVATE_PREMIUM_KEY: ActivatePremiumKeyModal,
  DUEL_JOIN: DuelJoinModal,
  DUEL_CREATE: DuelCreateModal,
  HELP_FEEDBACK: HelpFeedbackModal,
  REPORT_PROBLEM: ReportProblemModal,
  REMINDER_CONNECT: ReminderConnectModal,
  CELEBRATION: CelebrationModal,
};

/**
 * Глобальный менеджер модалок
 * 
 * Особенности:
 * - Централизованный рендеринг всех модалок через Portal
 * - Поддержка стека модалок с автоматическим z-index
 * - Обработка кнопки "Назад" на Android
 * - Блокировка скролла body при открытых модалках
 * - Рендеринг только верхней модалки из стека
 */
export const GlobalModalManager = () => {
  const { stack, closeModal, openModal } = useModalStore();
  const [searchParams] = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  // Проверяем, что компонент смонтирован и DOM готов
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Синхронизация URL -> модалки при монтировании и изменении URL
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (!modalParam) {
      // Если в URL нет модалки, но в стеке есть - закрываем все (URL имеет приоритет)
      if (stack.length > 0) {
        // Но не закрываем автоматически, чтобы не ломать работу
        // URL может быть очищен пользователем, но модалки должны остаться открытыми
      }
      return;
    }

    // Находим тип модалки по URL-ключу (обратный поиск)
    const modalType = (Object.keys(MODAL_COMPONENTS) as ModalType[]).find(
      (type) => {
        const urlKey = getModalUrlKey(type);
        return urlKey === modalParam;
      }
    );

    if (modalType && !stack.some(m => m.type === modalType)) {
      // Извлекаем параметры из URL
      const props: Record<string, any> = {};
      searchParams.forEach((value, key) => {
        if (key !== 'modal') {
          props[key] = value;
        }
      });

      // Открываем модалку без синхронизации URL (чтобы не дублировать)
      openModal(modalType, props, false);
    }
  }, [searchParams, stack, openModal]);

  // Обработка кнопки "Назад" на Android/PWA
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (stack.length > 0) {
        // Закрываем верхнюю модалку (URL уже обновлен браузером)
        closeModal(undefined, false); // Не синхронизируем URL, т.к. браузер уже обновил его
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stack.length, closeModal]);

  // Блокировка скролла body при открытых модалках
  useEffect(() => {
    if (stack.length > 0) {
      const scrollY = window.scrollY;
      document.body.setAttribute('data-scroll-y', scrollY.toString());
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Восстанавливаем скролл
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
    }
  }, [stack.length]);

  // Рендерим только на клиенте и после монтирования
  if (typeof window === 'undefined' || !isMounted) return null;
  
  // Проверяем, что document.body существует и готов
  if (!document.body) return null;

  // Если модалок нет, ничего не рендерим
  if (stack.length === 0) return null;

  // Рендерим только верхнюю модалку из стека
  const topModal = stack[stack.length - 1];
  if (!topModal) return null;

  const Component = MODAL_COMPONENTS[topModal.type];
  
  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[GlobalModalManager] Unknown modal type: ${topModal.type}`);
    }
    return null;
  }

  // Адаптер для разных интерфейсов модалок
  // AuthModal использует onClose, остальные - onOpenChange
  const modalProps: any = {
    ...topModal.props,
    open: true,
    zIndex: topModal.zIndex || 1000 + stack.length - 1,
  };

  // Поддержка разных интерфейсов модалок
  if (topModal.type === 'AUTH') {
    modalProps.onClose = () => closeModal(topModal.id, true); // Синхронизируем URL
  } else if (topModal.type === 'CELEBRATION') {
    // CelebrationModal использует show и onClose
    modalProps.show = true;
    modalProps.onClose = () => closeModal(topModal.id, true); // Синхронизируем URL
  } else {
    // Остальные модалки используют open и onOpenChange
    modalProps.onOpenChange = (open: boolean) => {
      if (!open) {
        closeModal(topModal.id, true); // Синхронизируем URL
      }
    };
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: topModal.zIndex || 1000 + stack.length - 1,
      }}
    >
      <Component {...modalProps} />
    </div>,
    document.body
  );
};

