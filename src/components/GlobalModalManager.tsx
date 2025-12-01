import { AnimatePresence } from 'framer-motion';
import { useModalStore, type ModalType } from '@/store/modalStore';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 * - Плавные анимации через AnimatePresence
 */
export const GlobalModalManager = () => {
  const { stack, closeModal } = useModalStore();

  // Обработка кнопки "Назад" на Android/PWA
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (stack.length > 0) {
        // Предотвращаем навигацию назад
        event.preventDefault();
        // Закрываем верхнюю модалку
        closeModal();
        // Возвращаем запись в историю для следующего нажатия
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Добавляем запись в историю при открытии первой модалки
    if (stack.length === 1) {
      window.history.pushState({ modal: true }, '', window.location.href);
    }

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

  // Рендерим только на клиенте
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {stack.map((modal, index) => {
        const Component = MODAL_COMPONENTS[modal.type];
        
        if (!Component) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[GlobalModalManager] Unknown modal type: ${modal.type}`);
          }
          return null;
        }

        const isTop = index === stack.length - 1;

        // Адаптер для разных интерфейсов модалок
        // AuthModal использует onClose, остальные - onOpenChange
        const modalProps: any = {
          ...modal.props,
          open: isTop, // Только верхняя модалка активна
          zIndex: modal.zIndex || 1000 + index,
        };

        // Поддержка разных интерфейсов модалок
        if (modal.type === 'AUTH') {
          modalProps.onClose = () => closeModal(modal.id);
        } else if (modal.type === 'CELEBRATION') {
          // CelebrationModal использует show и onClose
          modalProps.show = isTop;
          modalProps.onClose = () => closeModal(modal.id);
        } else {
          // Остальные модалки используют open и onOpenChange
          modalProps.onOpenChange = (open: boolean) => {
            if (!open) {
              closeModal(modal.id);
            }
          };
        }

        return (
          <div
            key={modal.id}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: modal.zIndex || 1000 + index,
              pointerEvents: isTop ? 'auto' : 'none', // Только верхняя модалка интерактивна
            }}
          >
            <Component {...modalProps} />
          </div>
        );
      })}
    </AnimatePresence>,
    document.body
  );
};

