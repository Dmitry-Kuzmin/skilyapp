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
  | string; // Для кастомных модалок

export interface ModalItem {
  id: string;
  type: ModalType;
  props?: Record<string, any>;
  zIndex?: number;
}

interface ModalStore {
  stack: ModalItem[];
  openModal: (type: ModalType, props?: Record<string, any>) => string; // Возвращает ID
  closeModal: (id?: string) => void; // Если ID не указан - закрывает верхнюю
  closeAll: () => void;
  getTopModal: () => ModalItem | null;
  isModalOpen: (type: ModalType) => boolean;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  stack: [],
  
  openModal: (type, props) => {
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
      return existing.id;
    }
    
    set({
      stack: [...stack, { id, type, props, zIndex }]
    });
    
    return id;
  },
  
  closeModal: (id) => {
    const stack = get().stack;
    if (id) {
      set({ stack: stack.filter(m => m.id !== id) });
    } else {
      // Закрываем верхнюю
      set({ stack: stack.slice(0, -1) });
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
}));

