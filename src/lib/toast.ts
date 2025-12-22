/**
 * Unified Toast System
 * 
 * Wrapper над sonner который поддерживает legacy синтаксис useToast
 * и новый синтаксис sonner. Это позволяет постепенно мигрировать код.
 * 
 * Legacy: toast({ title: "...", description: "...", variant: "destructive" })
 * Sonner: toast.error("title", { description: "..." })
 */

import { toast as sonnerToast } from 'sonner';

type ToastVariant = 'default' | 'destructive' | 'success' | 'info' | 'warning';

interface LegacyToastOptions {
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastOptions {
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

// Определяем, это legacy вызов или новый
function isLegacyCall(args: any[]): args is [LegacyToastOptions] {
    return args.length === 1 &&
        typeof args[0] === 'object' &&
        args[0] !== null &&
        ('title' in args[0] || 'variant' in args[0]);
}

// Основная функция toast
function toast(messageOrOptions: string | LegacyToastOptions, options?: ToastOptions): string | number {
    // Legacy синтаксис: toast({ title, description, variant })
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
        const { title, description, variant, duration } = messageOrOptions;
        const message = title || '';
        const toastOptions = { description, duration };

        switch (variant) {
            case 'destructive':
                return sonnerToast.error(message, toastOptions);
            case 'success':
                return sonnerToast.success(message, toastOptions);
            case 'info':
                return sonnerToast.info(message, toastOptions);
            case 'warning':
                return sonnerToast.warning(message, toastOptions);
            default:
                // default variant - используем обычный toast
                return sonnerToast(message, toastOptions);
        }
    }

    // Новый синтаксис: toast("message", { description })
    return sonnerToast(messageOrOptions, options);
}

// Добавляем методы sonner
toast.success = (message: string, options?: ToastOptions) => sonnerToast.success(message, options);
toast.error = (message: string, options?: ToastOptions) => sonnerToast.error(message, options);
toast.info = (message: string, options?: ToastOptions) => sonnerToast.info(message, options);
toast.warning = (message: string, options?: ToastOptions) => sonnerToast.warning(message, options);
toast.loading = (message: string, options?: ToastOptions) => sonnerToast.loading(message, options);
toast.promise = sonnerToast.promise;
toast.dismiss = sonnerToast.dismiss;
toast.custom = sonnerToast.custom;
toast.message = sonnerToast.message;

// Legacy хук для совместимости (deprecated, но работает)
export function useToast() {
    return { toast };
}

export { toast };
