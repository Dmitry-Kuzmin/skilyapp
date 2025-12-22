/**
 * Совместимая обёртка для toast
 * Позволяет использовать как shadcn синтаксис, так и sonner напрямую
 */
import { toast as sonnerToast } from 'sonner';

// Тип для shadcn-совместимого toast
interface ToastOptions {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

// Функция-обёртка для совместимости
export const showToast = (options: ToastOptions) => {
    if (options.variant === 'destructive') {
        sonnerToast.error(options.title, { description: options.description });
    } else {
        sonnerToast.success(options.title, { description: options.description });
    }
};

// Переэкспортируем оригинальные методы sonner для прямого использования
export { sonnerToast as toast };

// Методы для упрощённого использования
export const toastSuccess = (title: string, description?: string) => {
    sonnerToast.success(title, { description });
};

export const toastError = (title: string, description?: string) => {
    sonnerToast.error(title, { description });
};

export const toastInfo = (title: string, description?: string) => {
    sonnerToast.info(title, { description });
};

export const toastWarning = (title: string, description?: string) => {
    sonnerToast.warning(title, { description });
};
