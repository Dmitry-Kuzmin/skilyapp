import { useState, useCallback } from 'react';
import { LumiToast, LumiToastProps } from '@/components/lumi/LumiToast';
import { getDuelJoinErrorMessage, getDuelJoinSuccessMessage, getDuelNotificationMessage, DuelNotificationMessage } from '@/utils/duelNotifications';
import { extractErrorFromResponse } from '@/utils/errorMessages';

export function useLumiToast() {
  const [toasts, setToasts] = useState<LumiToastProps[]>([]);

  const showToast = useCallback((props: Omit<LumiToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    const toast: LumiToastProps = {
      ...props,
      id,
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after duration
    if (props.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, props.duration || 5000);
    }
    
    return id;
  }, []);

  const showDuelJoinError = useCallback((error: any) => {
    const extractedError = extractErrorFromResponse(error);
    const message = getDuelJoinErrorMessage(extractedError);
    return showToast({
      ...message,
      duration: 6000,
    });
  }, [showToast]);

  const showDuelJoinSuccess = useCallback((autoStarted: boolean) => {
    const message = getDuelJoinSuccessMessage(autoStarted);
    return showToast({
      ...message,
      duration: 4000,
    });
  }, [showToast]);

  const showDuelNotification = useCallback((type: string, context?: any) => {
    const message = getDuelNotificationMessage(type, context);
    return showToast({
      ...message,
      duration: 5000,
    });
  }, [showToast]);

  const showSuccess = useCallback((title: string, description?: string) => {
    return showToast({
      title,
      description,
      mood: 'happy',
      variant: 'success',
      duration: 4000,
    });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string) => {
    return showToast({
      title,
      description,
      mood: 'thinking',
      variant: 'error',
      duration: 6000,
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string) => {
    return showToast({
      title,
      description,
      mood: 'encouraging',
      variant: 'warning',
      duration: 5000,
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    return showToast({
      title,
      description,
      mood: 'idle',
      variant: 'info',
      duration: 5000,
    });
  }, [showToast]);

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <LumiToast key={toast.id} {...toast} />
      ))}
    </>
  );

  return {
    showToast,
    showDuelJoinError,
    showDuelJoinSuccess,
    showDuelNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    ToastContainer,
  };
}

