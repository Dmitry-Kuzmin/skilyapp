import * as React from "react";
import { ResponsiveModal, ModalSkeleton } from "@/components/ui/responsive-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalRoute } from "@/hooks/useModalRoute";
import { useModalStack } from "@/hooks/useModalStack";
import { type ModalType } from "@/lib/modal-config";
import { cn } from "@/lib/utils";

interface UnifiedModalProps {
  open?: boolean; // Опционально, если используется modalRouteKey
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  modalType?: ModalType;
  hideCloseButton?: boolean;
  snapPoints?: (number | string)[];
  initialSnap?: number | string;
  showTitleBar?: boolean;
  loading?: boolean;
  skeletonVariant?: string; // Для совместимости
  skeleton?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showHandle?: boolean;
  modalRouteKey?: string;
  fullscreen?: boolean;
  preventClose?: boolean;
}

/**
 * 🏆 UNIFIED MODAL (Gold Standard Edition)
 * 
 * Обертка над ResponsiveModal, поддерживающая:
 * 1. Modal Routing (Open/Close via URL)
 * 2. Modal Stack Management
 * 3. Loading Skeletons
 * 4. Desktop/Mobile transition (Vaul/Dialog)
 */
export function UnifiedModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  modalType = 'default',
  hideCloseButton = false,
  snapPoints,
  initialSnap,
  showTitleBar = true,
  loading = false,
  skeleton,
  className,
  contentClassName,
  showHandle = true,
  modalRouteKey,
  fullscreen = false,
  preventClose = false,
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  const route = useModalRoute(modalRouteKey ?? undefined);

  // Определяем конечное состояние открытости (пропс или роут)
  const resolvedOpen = React.useMemo(() => {
    if (open !== undefined) return open;
    if (modalRouteKey && route) return route.isOpen;
    return false;
  }, [modalRouteKey, open, route?.isOpen]);

  const modalId = React.useMemo(() => modalRouteKey || `modal-${Date.now()}-${Math.random()}`, [modalRouteKey]);

  // Регистрация в стеке модалок
  const { isTopModal } = useModalStack(modalId, resolvedOpen, title || modalRouteKey);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);

      if (modalRouteKey && route) {
        if (nextOpen) route.openModal();
        else route.closeModal();
      }
    },
    [modalRouteKey, route, onOpenChange]
  );

  // ОПТИМИЗАЦИЯ: Не рендерим контент когда модалка закрыта
  const renderContent = React.useMemo(() => {
    if (!resolvedOpen) return null;
    if (loading) return skeleton ?? <ModalSkeleton />;
    return children;
  }, [resolvedOpen, loading, skeleton, children]);

  return (
    <ResponsiveModal
      open={resolvedOpen}
      onOpenChange={handleOpenChange}
      title={showTitleBar ? title : undefined}
      description={description}
      className={className}
      contentClassName={contentClassName}
      hideCloseButton={hideCloseButton}
      preventClose={preventClose}
      snapPoints={snapPoints}
      activeSnapPoint={initialSnap}
      hideHandle={!showHandle}
      fullscreen={fullscreen}
    >
      {renderContent}
    </ResponsiveModal>
  );
}
