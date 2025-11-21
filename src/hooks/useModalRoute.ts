import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback } from "react";

/**
 * Хук для работы с модалками через URL параметры
 * Позволяет открывать/закрывать модалки через URL, как в Instagram
 * 
 * @example
 * const { isOpen, openModal, closeModal } = useModalRoute('profile');
 * 
 * // Открыть модалку
 * openModal(); // URL: ?modal=profile
 * 
 * // Открыть с параметрами
 * openModal({ userId: '123' }); // URL: ?modal=profile&userId=123
 * 
 * // Закрыть модалку
 * closeModal(); // Удаляет ?modal=profile из URL
 */
export function useModalRoute(modalName: string) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const isOpen = searchParams.get('modal') === modalName;
  
  const openModal = useCallback((params?: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', modalName);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        newParams.set(key, value);
      });
    }
    navigate({ search: newParams.toString() }, { replace: true });
  }, [modalName, searchParams, navigate]);
  
  const closeModal = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    // Удаляем все параметры, связанные с модалкой (опционально)
    // Можно добавить логику для удаления специфичных параметров
    navigate({ search: newParams.toString() }, { replace: true });
  }, [searchParams, navigate]);
  
  const params = Object.fromEntries(searchParams);
  
  return { isOpen, openModal, closeModal, params };
}

