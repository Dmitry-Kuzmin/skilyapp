import { loadTiptap } from "./lazyTiptap";

/**
 * Генерирует HTML preview из JSON TipTap контента
 */
export async function generateHTMLPreview(content: any): Promise<string> {
  if (!content) return "";

  try {
    const tiptap = await loadTiptap();
    if (!tiptap.html || !tiptap.starterKit || !tiptap.extensions?.image || !tiptap.extensions?.link) {
      throw new Error("Tiptap modules not loaded");
    }

    return tiptap.html.generateHTML(content, [
      tiptap.starterKit.default,
      tiptap.extensions.image.default,
      tiptap.extensions.link.default.configure({
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

