import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

/**
 * Генерирует HTML preview из JSON TipTap контента
 */
export function generateHTMLPreview(content: any): string {
  if (!content) return "";

  try {
    return generateHTML(content, [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ]);
  } catch (error) {
    console.error("Error generating HTML preview:", error);
    return "";
  }
}

/**
 * Debounce функция для автосохранения
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Хук для автосохранения с debounce
 */
export function useAutoSave(
  saveFn: () => Promise<void>,
  delay: number = 10000
) {
  const debouncedSave = debounce(saveFn, delay);

  return {
    triggerSave: debouncedSave,
    immediateSave: saveFn,
  };
}

