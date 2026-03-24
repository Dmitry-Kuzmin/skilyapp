import { useModalStore, type ModalType, getModalUrlKey } from '@/store/modalStore';
import { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import React from 'react';

// ОПТИМИЗАЦИЯ: Все модалки lazy-loaded для уменьшения initial bundle
// Только AuthModal оставляем синхронным, так как он может быть нужен на лендинге
import { AuthModalNew as AuthModal } from '@/components/AuthModalNew';
import { lazy } from 'react';

import { supabase } from '@/integrations/supabase/client';

// Lazy-loaded модалки (загружаются только при открытии)
const BoostShopModal = lazy(() => import('@/components/shop/BoostShopModal').then(m => ({ default: m.BoostShopModal })));
const PaywallModal = lazy(() => import('@/components/monetization/PaywallModal').then(m => ({ default: m.PaywallModal })));
const DuelPassSeasonModal = lazy(() => import('@/components/monetization/DuelPassSeasonModal').then(m => ({ default: m.DuelPassSeasonModal })));
const FlashCardsModal = lazy(() => import('@/components/FlashCardsModal').then(m => ({ default: m.FlashCardsModal })));
const TermProgressModal = lazy(() => import('@/components/TermProgressModal').then(m => ({ default: m.TermProgressModal })));
const LeaderboardRewardsModal = lazy(() => import('@/components/leaderboard/LeaderboardRewardsModal').then(m => ({ default: m.LeaderboardRewardsModal })));
const ReferralModal = lazy(() => import('@/components/ReferralModal').then(m => ({ default: m.ReferralModal })));
const ActivatePremiumKeyModal = lazy(() => import('@/components/ActivatePremiumKeyModal').then(m => ({ default: m.ActivatePremiumKeyModal })));
const DuelJoinModal = lazy(() => import('@/components/duel/DuelJoinModal').then(m => ({ default: m.DuelJoinModal })));
const DuelCreateModal = lazy(() => import('@/components/duel/DuelCreateModal').then(m => ({ default: m.DuelCreateModal })));
const HelpFeedbackModal = lazy(() => import('@/components/HelpFeedbackModal').then(m => ({ default: m.HelpFeedbackModal })));
const ReportProblemModal = lazy(() => import('@/components/ReportProblemModal').then(m => ({ default: m.ReportProblemModal })));
const ReminderConnectModal = lazy(() => import('@/components/notifications/ReminderConnectModal').then(m => ({ default: m.ReminderConnectModal })));
const CelebrationModal = lazy(() => import('@/components/dashboard-new/CelebrationModal').then(m => ({ default: m.CelebrationModal })));
const ContextSettingsSheet = lazy(() => import('@/components/shared/ContextSettingsSheet').then(m => ({ default: m.ContextSettingsSheet })));
const TonPaymentModal = lazy(() => import('@/components/monetization/TonPaymentModal').then(m => ({ default: m.TonPaymentModal })));

/**
 * Маппинг типов модалок на компоненты
 * Поддерживает разные интерфейсы модалок (onClose vs onOpenChange)
 */
const MODAL_COMPONENTS: Record<ModalType, React.ComponentType<any> | null> = {
  AUTH: AuthModal,
  BOOST_SHOP: BoostShopModal,
  PAYWALL: PaywallModal,
  DUEL_PASS: DuelPassSeasonModal,
  FLASH_CARDS: FlashCardsModal,
  TERM_PROGRESS: TermProgressModal,
  LEADERBOARD_REWARDS: LeaderboardRewardsModal,
  REFERRAL: ReferralModal,
  ACTIVATE_PREMIUM_KEY: ActivatePremiumKeyModal,
  DUEL_JOIN: DuelJoinModal,
  DUEL_CREATE: DuelCreateModal,
  HELP_FEEDBACK: HelpFeedbackModal,
  REPORT_PROBLEM: ReportProblemModal,
  REMINDER_CONNECT: ReminderConnectModal,
  CELEBRATION: CelebrationModal,
  CONTEXT_SETTINGS: ContextSettingsSheet,
  TON_PAY: TonPaymentModal,
  PREMIUM: PaywallModal,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  // Проверяем, что компонент смонтирован и DOM готов
  useEffect(() => {
    setIsMounted(true);

    // Слушаем событие сброса пароля (из email ссылки)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        openModal('AUTH', { initialStep: 'reset-password' }, false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [openModal]);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    // Синхронизация URL -> модалки при монтировании и изменении URL
    if (modalParam) {
      // Находим тип модалки по URL-ключу (обратный поиск)
      const modalType = (Object.keys(MODAL_COMPONENTS) as ModalType[]).find(
        (type) => {
          const urlKey = getModalUrlKey(type);
          return urlKey === modalParam;
        }
      );

      // КРИТИЧНО: Проверяем, что модалка еще не открыта и не закрывается
      if (modalType && !stack.some(m => m.type === modalType)) {
        const props: Record<string, any> = {};
        searchParams.forEach((value, key) => {
          if (key !== 'modal') {
            props[key] = value;
          }
        });

        const rafId = requestAnimationFrame(() => {
          const currentStack = useModalStore.getState().stack;
          if (!currentStack.some(m => m.type === modalType)) {
            openModal(modalType, props, false);
          }
        });
      }
    }
  }, [searchParams, openModal]);
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
    modalProps.onClose = () => {
      closeModal(topModal.id, false); // Не синхронизируем через store
      // Синхронизируем URL напрямую через React Router
      const newParams = new URLSearchParams(searchParams);
      const urlKey = getModalUrlKey(topModal.type);
      if (urlKey && newParams.get('modal') === urlKey) {
        newParams.delete('modal');
        setSearchParams(newParams, { replace: true });
      }
    };
  } else if (topModal.type === 'CELEBRATION') {
    // CelebrationModal использует show и onClose
    modalProps.show = true;
    modalProps.onClose = () => {
      closeModal(topModal.id, false); // Не синхронизируем через store
      // Синхронизируем URL напрямую через React Router
      const newParams = new URLSearchParams(searchParams);
      const urlKey = getModalUrlKey(topModal.type);
      if (urlKey && newParams.get('modal') === urlKey) {
        newParams.delete('modal');
        setSearchParams(newParams, { replace: true });
      }
    };
  } else {
    // Остальные модалки используют open и onOpenChange
    modalProps.onOpenChange = (open: boolean) => {
      if (!open) {
        closeModal(topModal.id, false); // Не синхронизируем через store
        // Синхронизируем URL напрямую через React Router для немедленного обновления
        const newParams = new URLSearchParams(searchParams);
        const urlKey = getModalUrlKey(topModal.type);
        if (urlKey && newParams.get('modal') === urlKey) {
          newParams.delete('modal');
          setSearchParams(newParams, { replace: true });
        }
      }
    };
  }

  // ОПТИМИЗАЦИЯ: Все lazy-loaded модалки оборачиваем в Suspense
  // Только AUTH модалка не lazy, остальные - lazy
  const ModalContent = topModal.type === 'AUTH' ? (
    <Component {...modalProps} />
  ) : (
    <Suspense fallback={null}>
      <Component {...modalProps} />
    </Suspense>
  );

  // КРИТИЧНО: Модалки, которые сами создают портал (ResponsiveModal, CelebrationModal и т.д.)
  // не нужно оборачивать в дополнительный div, так как это блокирует клики
  // Проверяем, создает ли модалка свой портал
  const createsOwnPortal = topModal.type === 'BOOST_SHOP' ||
    topModal.type === 'CELEBRATION';

  if (createsOwnPortal) {
    // Модалка сама создает портал, просто рендерим её
    return ModalContent;
  }

  // Для остальных модалок (которые используют Radix UI Dialog/Sheet) 
  // оборачиваем в div для правильного z-index
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: topModal.zIndex || 1000 + stack.length - 1,
        pointerEvents: 'none', // КРИТИЧНО: не блокируем клики, только для z-index
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {ModalContent}
      </div>
    </div>,
    document.body
  );
};

