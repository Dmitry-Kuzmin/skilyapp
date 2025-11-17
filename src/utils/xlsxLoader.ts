/**
 * Lazy loader для XLSX библиотеки
 * Загружается только когда действительно нужна (при импорте Excel файлов)
 * Это уменьшает размер основного bundle на ~137 KB
 */

let xlsxModule: typeof import('xlsx') | null = null;

/**
 * Загружает XLSX библиотеку динамически
 */
export const loadXLSX = async (): Promise<typeof import('xlsx')> => {
  if (xlsxModule) {
    return xlsxModule;
  }

  try {
    xlsxModule = await import('xlsx');
    return xlsxModule;
  } catch (error) {
    console.error('Failed to load XLSX library:', error);
    throw new Error('Не удалось загрузить библиотеку для работы с Excel файлами');
  }
};

/**
 * Получает XLSX модуль (синхронно, если уже загружен)
 */
export const getXLSX = (): typeof import('xlsx') | null => {
  return xlsxModule;
};


