import { create } from 'zustand';

/**
 * Типы модалок в приложении
 * Можно расширять по мере необходимости
 */
export type ModalType =
  | 'AUTH'
  | 'PROFILE'
  | 'BOOST_SHOP'
  | 'PAYWALL'
  | 'DUEL_PASS'
  | 'FLASH_CARDS'
  | 'TERM_PROGRESS'
  | 'HALL_OF_FAME'
  | 'DUEL_PASS_LEADERBOARD'
  | 'LEADERBOARD_REWARDS'
  | 'REFERRAL'
  | 'ACTIVATE_PREMIUM_KEY'
  | 'DUEL_JOIN'
  | 'DUEL_CREATE'
  | 'HELP_FEEDBACK'
  | 'REPORT_PROBLEM'
  | 'REMINDER_CONNECT'
  | 'CELEBRATION'
  | 'PADDLE_CHECKOUT'
  | 'TON_PAY'
  | 'PREMIUM'
  | string; // Для кастомных модалок

/**
 * Маппинг типов модалок на URL-ключи для синхронизации
 */
const MODAL_URL_MAP: Record<string, string> = {
  AUTH: 'auth',
  PROFILE: 'profile',
  BOOST_SHOP: 'boost-shop',
  PAYWALL: 'paywall',
  DUEL_PASS: 'duel-pass',
  FLASH_CARDS: 'flash-cards',
  TERM_PROGRESS: 'term-progress',
  HALL_OF_FAME: 'hall-of-fame',
  DUEL_PASS_LEADERBOARD: 'duel-pass-leaderboard',
  LEADERBOARD_REWARDS: 'leaderboard-rewards',
  REFERRAL: 'referral',
  ACTIVATE_PREMIUM_KEY: 'activate-premium-key',
  DUEL_JOIN: 'duel-join',
  DUEL_CREATE: 'duel-create',
  HELP_FEEDBACK: 'help-feedback',
  REPORT_PROBLEM: 'report-problem',
  REMINDER_CONNECT: 'reminder-connect',
  CELEBRATION: 'celebration',
  TON_PAY: 'ton-pay',
  PREMIUM: 'premium',
};

/**
 * Получить URL-ключ для типа модалки
 */
export function getModalUrlKey(type: ModalType): string | null {
  return MODAL_URL_MAP[type] || null;
}

export interface ModalItem {
  id: string;
  type: ModalType;
  props?: Record<string, any>;
  zIndex?: number;
}

interface ModalStore {
  stack: ModalItem[];
  openModal: (type: ModalType, props?: Record<string, any>, syncUrl?: boolean) => string; // Возвращает ID
  closeModal: (id?: string, syncUrl?: boolean) => void; // Если ID не указан - закрывает верхнюю
  closeAll: () => void;
  getTopModal: () => ModalItem | null;
  isModalOpen: (type: ModalType) => boolean;
  syncUrl: (type: ModalType, isOpen: boolean, props?: Record<string, any>) => void; // Синхронизация URL
}

export const useModalStore = create<ModalStore>((set, get) => ({
  stack: [],

  openModal: (type, props, syncUrl = true) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stack = get().stack;
    const zIndex = 1000 + stack.length;

    // Проверяем, не открыта ли уже модалка этого типа
    const existingIndex = stack.findIndex(m => m.type === type);
    if (existingIndex !== -1) {
      // Если уже открыта, перемещаем в конец стека (делаем верхней)
      const existing = stack[existingIndex];
      const newStack = [...stack];
      newStack.splice(existingIndex, 1);
      newStack.push({ ...existing, props: { ...existing.props, ...props }, zIndex });
      set({ stack: newStack });

      // Синхронизируем URL
      if (syncUrl) {
        get().syncUrl(type, true, props);
      }

      return existing.id;
    }

    set({
      stack: [...stack, { id, type, props, zIndex }]
    });

    // Синхронизируем URL
    if (syncUrl) {
      get().syncUrl(type, true, props);
    }

    return id;
  },

  closeModal: (id, syncUrl = true) => {
    const stack = get().stack;
    let closedModal: ModalItem | null = null;

    if (id) {
      closedModal = stack.find(m => m.id === id) || null;
      set({ stack: stack.filter(m => m.id !== id) });
    } else {
      // Закрываем верхнюю
      closedModal = stack.length > 0 ? stack[stack.length - 1] : null;
      set({ stack: stack.slice(0, -1) });
    }

    // Синхронизируем URL
    if (syncUrl && closedModal) {
      get().syncUrl(closedModal.type, false);
    }
  },

  closeAll: () => set({ stack: [] }),

  getTopModal: () => {
    const stack = get().stack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  isModalOpen: (type) => {
    const stack = get().stack;
    return stack.some(m => m.type === type);
  },

  syncUrl: (type, isOpen, props) => {
    // Синхронизация URL только на клиенте
    if (typeof window === 'undefined') return;

    const urlKey = getModalUrlKey(type);
    if (!urlKey) return; // Если нет маппинга, не синхронизируем

    const searchParams = new URLSearchParams(window.location.search);

    if (isOpen) {
      // Открываем модалку - добавляем в URL
      searchParams.set('modal', urlKey);

      // Добавляем параметры из props, если они есть
      if (props) {
        Object.entries(props).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
    } else {
      // Закрываем модалку - удаляем из URL
      if (searchParams.get('modal') === urlKey) {
        searchParams.delete('modal');

        // Удаляем параметры модалки (опционально, можно оставить для других целей)
        // Пока оставляем параметры, чтобы не сломать другие функции
      }
    }

    // Обновляем URL без перезагрузки страницы
    const newUrl = `${window.location.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}${window.location.hash}`;
    if (isOpen) {
      window.history.pushState({}, '', newUrl);
    } else {
      window.history.replaceState({}, '', newUrl);
    }
  },
}));

