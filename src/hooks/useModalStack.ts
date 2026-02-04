/**
 * Хук для отслеживания стека открытых модалок
 * Предотвращает вложенность модалок и автоматически закрывает предыдущие
 */

import { useEffect, useRef, useCallback } from 'react';

interface ModalInfo {
  id: string;
  name?: string;
  timestamp: number;
}

// Глобальный стек модалок (вне компонента для общего доступа)
const modalStack: ModalInfo[] = [];

// Слушатели изменений стека
const listeners = new Set<() => void>();

/**
 * Уведомить всех слушателей об изменении стека
 */
function notifyListeners() {
  listeners.forEach(listener => listener());
}

/**
 * Добавить модалку в стек
 */
export function pushModal(id: string, name?: string): void {
  // Проверяем, не открыта ли уже эта модалка
  const existingIndex = modalStack.findIndex(m => m.id === id);
  if (existingIndex !== -1) {
    // Если уже открыта, перемещаем в конец стека
    const [existing] = modalStack.splice(existingIndex, 1);
    modalStack.push(existing);
    notifyListeners();
    return;
  }

  modalStack.push({
    id,
    name,
    timestamp: Date.now(),
  });
  notifyListeners();

  // В dev-режиме предупреждаем о вложенности
  if (import.meta.env.DEV && modalStack.length > 1) {
    console.warn(
      '[ModalStack] Открыто несколько модалок:',
      modalStack.map(m => m.name || m.id).join(', '),
      '\nРекомендуется избегать вложенности модалок для лучшего UX'
    );
  }
}

/**
 * Удалить модалку из стека
 */
export function popModal(id: string): void {
  const index = modalStack.findIndex(m => m.id === id);
  if (index !== -1) {
    modalStack.splice(index, 1);
    notifyListeners();
  }
}

/**
 * Получить текущий стек модалок
 */
export function getModalStack(): readonly ModalInfo[] {
  return [...modalStack];
}

/**
 * Проверить, открыта ли модалка
 */
export function isModalOpen(id: string): boolean {
  return modalStack.some(m => m.id === id);
}

/**
 * Получить количество открытых модалок
 */
export function getModalCount(): number {
  return modalStack.length;
}

/**
 * Хук для управления модалкой в стеке
 */
export function useModalStack(modalId: string, isOpen: boolean, modalName?: string) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      pushModal(modalId, modalName);
      registeredRef.current = true;
    } else if (registeredRef.current) {
      popModal(modalId);
      registeredRef.current = false;
    }

    return () => {
      if (registeredRef.current) {
        popModal(modalId);
        registeredRef.current = false;
      }
    };
  }, [isOpen, modalId, modalName]);

  // Функция для принудительного закрытия всех модалок выше текущей
  const closeModalsAbove = useCallback(() => {
    const currentIndex = modalStack.findIndex(m => m.id === modalId);
    if (currentIndex !== -1 && currentIndex < modalStack.length - 1) {
      // Закрываем все модалки выше текущей
      const modalsToClose = modalStack.slice(currentIndex + 1);
      modalsToClose.forEach(modal => {
        popModal(modal.id);
      });

      if (import.meta.env.DEV) {
        console.warn(
          '[ModalStack] Закрыты модалки выше текущей:',
          modalsToClose.map(m => m.name || m.id).join(', ')
        );
      }
    }
  }, [modalId]);

  return {
    modalCount: getModalCount(),
    isTopModal: modalStack.length > 0 && modalStack[modalStack.length - 1]?.id === modalId,
    closeModalsAbove,
  };
}

