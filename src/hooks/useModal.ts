import { useModalStore } from '@/store/modalStore';
import { useCallback } from 'react';

/**
 * Удобный хук для работы с модалками через глобальный store
 * 
 * @example
 * const { openModal, closeModal, isOpen } = useModal('BOOST_SHOP');
 * 
 * // Открыть модалку
 * openModal();
 * 
 * // Открыть с параметрами
 * openModal({ initialTab: 'coins' });
 * 
 * // Закрыть модалку
 * closeModal();
 * 
 * // Проверить, открыта ли модалка
 * if (isOpen) { ... }
 */
export function useModal(type: string) {
  const { openModal: openModalStore, closeModal: closeModalStore, isModalOpen } = useModalStore();

  const openModal = useCallback((props?: Record<string, any>) => {
    return openModalStore(type, props);
  }, [type, openModalStore]);

  const closeModal = useCallback(() => {
    // Закрываем все модалки этого типа
    const stack = useModalStore.getState().stack;
    const modalToClose = stack.find(m => m.type === type);
    if (modalToClose) {
      closeModalStore(modalToClose.id);
    }
  }, [type, closeModalStore]);

  const isOpen = isModalOpen(type);

  return {
    openModal,
    closeModal,
    isOpen,
  };
}

