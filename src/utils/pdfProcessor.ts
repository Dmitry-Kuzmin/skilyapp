/**
 * Утилита для обработки PDF файлов и создания материалов обучения
 * Извлекает текст, изображения и создает красивую HTML верстку
 */

import * as pdfjsLib from 'pdfjs-dist';

// Настройка worker для pdfjs
// Используем правильный CDN URL с https протоколом
if (typeof window !== 'undefined') {
  // Используем unpkg CDN - более надежный для новых версий
  // Версия 5.4.394 соответствует установленной в package.json
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  images: string[]; // Base64 или URLs изображений
}

export interface PDFSection {
  title: string;
  content: string;
  images: string[];
  pageRange: { start: number; end: number };
}

export interface ProcessedPDF {
  title: string;
  totalPages: number;
  sections: PDFSection[];
  allImages: string[];
}

/**
 * Извлекает текст и изображения из PDF файла
 */
export async function extractPDFContent(file: File | ArrayBuffer): Promise<ProcessedPDF> {
  try {
    let data: Uint8Array;
    
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      data = new Uint8Array(file);
    }

    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const pages: PDFPage[] = [];
    const allImages: string[] = [];

    // Для больших файлов обрабатываем страницы порциями, чтобы не перегружать память
    const BATCH_SIZE = 10; // Обрабатываем по 10 страниц за раз
    
    for (let startPage = 1; startPage <= totalPages; startPage += BATCH_SIZE) {
      const endPage = Math.min(startPage + BATCH_SIZE - 1, totalPages);
      
      // Обрабатываем порцию страниц
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          
          // Извлекаем текст с сохранением структуры
          const textContent = await page.getTextContent();
          
          // Группируем элементы по строкам (используя координаты Y)
          const itemsByLine = new Map<number, string[]>();
          
          textContent.items.forEach((item: any) => {
            if (!item.str || item.str.trim().length === 0) return;
            
            // Округляем Y координату для группировки по строкам
            const lineY = Math.round(item.transform[5] / 10) * 10;
            
            if (!itemsByLine.has(lineY)) {
              itemsByLine.set(lineY, []);
            }
            
            itemsByLine.get(lineY)!.push(item.str);
          });
          
          // Сортируем строки по Y координате (сверху вниз)
          const sortedLines = Array.from(itemsByLine.entries())
            .sort((a, b) => b[0] - a[0]) // Сортируем по Y (больше Y = выше на странице)
            .map(([_, items]) => items.join(' ').trim())
            .filter(line => line.length > 0);
          
          // Объединяем строки в текст, сохраняя структуру
          const pageText = sortedLines.join('\n');

          // Извлекаем изображения (упрощенная версия - в реальности нужна более сложная логика)
          const pageImages: string[] = [];
          // TODO: Реализовать извлечение изображений из PDF
          // Это требует более сложной логики с использованием операторов PDF

          pages.push({
            pageNumber: pageNum,
            text: pageText,
            images: pageImages,
          });
        } catch (pageError) {
          console.warn(`[pdfProcessor] Ошибка обработки страницы ${pageNum}:`, pageError);
          // Продолжаем обработку остальных страниц
          pages.push({
            pageNumber: pageNum,
            text: '',
            images: [],
          });
        }
      }
      
      // Небольшая задержка между порциями для больших файлов
      if (totalPages > 50 && startPage + BATCH_SIZE <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Разбиваем на логические разделы
    const sections = splitIntoSections(pages, allImages);

    // Определяем заголовок (из первой страницы или имени файла)
    const title = extractTitle(pages[0]?.text || 'Материал обучения');

    return {
      title,
      totalPages,
      sections,
      allImages,
    };
  } catch (error) {
    console.error('Ошибка при обработке PDF:', error);
    throw new Error(`Не удалось обработать PDF: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Разбивает страницы PDF на логические разделы
 */
function splitIntoSections(pages: PDFPage[], allImages: string[]): PDFSection[] {
  const sections: PDFSection[] = [];
  let currentSection: PDFSection | null = null;
  
  // Минимальный размер раздела (в символах)
  const MIN_SECTION_SIZE = 200;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const text = page.text.trim();
    
    if (!text) continue; // Пропускаем пустые страницы

    // Определяем, является ли страница началом нового раздела
    const isNewSection = detectSectionStart(text, i === 0);

    // Если это новый раздел и текущий раздел достаточно большой, сохраняем его
    if (isNewSection && currentSection && currentSection.content.length >= MIN_SECTION_SIZE) {
      sections.push(currentSection);
      currentSection = null;
    }

    // Извлекаем заголовок раздела
    const sectionTitle = extractSectionTitle(text, i === 0);

    if (!currentSection) {
      // Начинаем новый раздел
      currentSection = {
        title: sectionTitle,
        content: text,
        images: [...page.images],
        pageRange: { start: page.pageNumber, end: page.pageNumber },
      };
    } else {
      // Добавляем к текущему разделу (просто перенос строки для читаемости)
      currentSection.content += '\n\n' + text;
      currentSection.images.push(...page.images);
      currentSection.pageRange.end = page.pageNumber;
    }
  }

  // Добавляем последний раздел
  if (currentSection) {
    sections.push(currentSection);
  }

  // Если разделов нет или они слишком маленькие, объединяем их
  if (sections.length === 0 && pages.length > 0) {
    sections.push({
      title: 'Материал обучения',
      content: pages.map(p => p.text).join('\n\n'),
      images: allImages,
      pageRange: { start: 1, end: pages.length },
    });
  } else if (sections.length > 0) {
    // Объединяем слишком маленькие разделы с предыдущими
    const mergedSections: PDFSection[] = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      if (section.content.length < MIN_SECTION_SIZE && mergedSections.length > 0) {
        // Объединяем с предыдущим разделом
        const prevSection = mergedSections[mergedSections.length - 1];
        prevSection.content += '\n\n' + section.content;
        prevSection.images.push(...section.images);
        prevSection.pageRange.end = section.pageRange.end;
      } else {
        mergedSections.push(section);
      }
    }
    
    return mergedSections;
  }

  return sections;
}

/**
 * Определяет, является ли текст началом нового раздела
 */
function detectSectionStart(text: string, isFirstPage: boolean): boolean {
  if (isFirstPage) return true;

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return false;

  // Проверяем первые 3 строки на наличие заголовков
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    
    // Проверяем паттерны заголовков
    const headingPatterns = [
      /^[А-ЯЁ][А-ЯЁ\s\d\.\-:]{8,}$/, // Заголовок заглавными буквами (8+ символов)
      /^\d+\.\s+[А-ЯЁ]/, // Нумерованный заголовок (1. Текст)
      /^\d+\.\d+\.\s+[А-ЯЁ]/, // Подзаголовок (1.1. Текст)
      /^[А-ЯЁ][а-яё\s]{4,}$/, // Заголовок с первой заглавной (4+ слова)
      /^ГЛАВА\s+\d+/i, // Глава
      /^РАЗДЕЛ\s+\d+/i, // Раздел
      /^ТЕМА\s+\d+/i, // Тема
      /^[А-ЯЁЁ][А-ЯЁЁ\s]{5,}$/, // Все заглавные (5+ символов)
    ];
    
    // Проверяем, что строка похожа на заголовок
    const isHeading = headingPatterns.some(pattern => pattern.test(line));
    
    // Дополнительные проверки: заголовок обычно короткий и не заканчивается точкой
    if (isHeading && line.length < 100 && !line.endsWith('.') && !line.endsWith(',')) {
      // Проверяем, что следующая строка не является продолжением (не начинается с маленькой буквы)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length > 0 && /^[а-яё]/.test(nextLine)) {
          // Следующая строка начинается с маленькой буквы - это продолжение, не заголовок
          continue;
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Извлекает заголовок раздела из текста
 */
function extractSectionTitle(text: string, isFirstPage: boolean): string {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) return 'Материал обучения';

  // Берем первую значимую строку как заголовок
  const firstLine = lines[0].trim();
  
  // Если это похоже на заголовок (короткая строка или заглавные буквы)
  if (firstLine.length < 100 || /^[А-ЯЁ\s]{5,}$/.test(firstLine)) {
    return firstLine;
  }

  // Иначе используем первые слова
  const words = firstLine.split(' ').slice(0, 10).join(' ');
  return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

/**
 * Извлекает общий заголовок из первой страницы
 */
function extractTitle(firstPageText: string): string {
  const lines = firstPageText.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) return 'Материал обучения';

  // Ищем заголовок в первых строках
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    // Заголовок обычно короткий и содержит заглавные буквы
    if (trimmed.length > 5 && trimmed.length < 100 && /[А-ЯЁ]/.test(trimmed)) {
      return trimmed;
    }
  }

  return 'Материал обучения';
}

/**
 * Определяет, является ли строка таблицей
 */
function isTableLine(line: string): boolean {
  // Проверяем паттерны таблиц: разделители |, табуляция, множественные пробелы
  const tablePatterns = [
    /\|.*\|/, // Содержит разделители |
    /\t.*\t/, // Содержит табуляцию
    /\s{3,}.*\s{3,}/, // Множественные пробелы (колонки)
    /^[А-ЯЁа-яё\d\s]+\s{2,}[А-ЯЁа-яё\d\s]+\s{2,}/, // Две колонки с пробелами
  ];
  
  return tablePatterns.some(pattern => pattern.test(line));
}

/**
 * Преобразует строки таблицы в HTML таблицу
 */
function parseTable(lines: string[], startIndex: number): { html: string; endIndex: number } {
  const tableRows: string[] = [];
  let i = startIndex;
  
  // Собираем строки таблицы
  while (i < lines.length && isTableLine(lines[i].trim())) {
    const line = lines[i].trim();
    
    // Разбиваем на колонки (по |, табуляции или множественным пробелам)
    let cells: string[] = [];
    
    if (line.includes('|')) {
      cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    } else if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
    } else {
      // Разбиваем по множественным пробелам (2+ пробела)
      cells = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
    }
    
    if (cells.length > 0) {
      const isHeader = i === startIndex || /^[А-ЯЁ\s\d]+$/.test(line); // Первая строка или заглавные буквы
      const tag = isHeader ? 'th' : 'td';
      const rowCells = cells.map(cell => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('');
      tableRows.push(`<tr>${rowCells}</tr>`);
    }
    
    i++;
    
    // Останавливаемся если следующая строка не таблица и не пустая
    if (i < lines.length && lines[i].trim() && !isTableLine(lines[i].trim())) {
      break;
    }
  }
  
  if (tableRows.length > 0) {
    return {
      html: `<div class="table-wrapper"><table class="data-table">${tableRows.join('')}</table></div>`,
      endIndex: i - 1
    };
  }
  
  return { html: '', endIndex: startIndex };
}

/**
 * Преобразует текст в красивый HTML с правильной разметкой
 */
export function formatTextAsHTML(text: string): string {
  // Нормализуем текст: убираем лишние пробелы, но сохраняем структуру
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n'); // Максимум 2 переноса подряд
  
  const lines = normalizedText.split('\n');
  const htmlLines: string[] = [];

  let inList = false;
  let inOrderedList = false;
  let listItems: string[] = [];
  let orderedListItems: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      // Пустая строка - закрываем списки и добавляем разделитель
      if (inList) {
        htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (inOrderedList) {
        htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      i++;
      continue;
    }
    
    // Проверяем, является ли строка таблицей
    if (isTableLine(line)) {
      // Закрываем списки перед таблицей
      if (inList) {
        htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (inOrderedList) {
        htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      
      const tableResult = parseTable(lines, i);
      if (tableResult.html) {
        htmlLines.push(tableResult.html);
        i = tableResult.endIndex + 1;
        continue;
      }
    }
    
    // Определяем тип строки
    const isHeading = detectHeading(line);
    const isSubheading = /^\d+\.\s+[А-ЯЁ]/.test(line) || /^[А-ЯЁ][а-яё\s]{3,}$/.test(line) && line.length < 80;
    const isListItem = /^[-•*]\s/.test(line) || /^[○●▪▫]\s/.test(line);
    const isOrderedListItem = /^\d+[\.\)]\s/.test(line) || /^[а-яё]\)\s/i.test(line);
    const isParagraph = !isHeading && !isSubheading && !isListItem && !isOrderedListItem;

    if (isListItem) {
      // Закрываем нумерованный список если был открыт
      if (inOrderedList) {
        htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      
      if (!inList && listItems.length > 0) {
        htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
        listItems = [];
      }
      inList = true;
      const itemText = line.replace(/^[-•*○●▪▫]\s/, '').trim();
      if (itemText) {
        listItems.push(`<li>${escapeHtml(itemText)}</li>`);
      }
    } else if (isOrderedListItem) {
      // Закрываем маркированный список если был открыт
      if (inList) {
        htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      
      if (!inOrderedList && orderedListItems.length > 0) {
        htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
      }
      inOrderedList = true;
      const itemText = line.replace(/^\d+[\.\)]\s/, '').replace(/^[а-яё]\)\s/i, '').trim();
      if (itemText) {
        orderedListItems.push(`<li>${escapeHtml(itemText)}</li>`);
      }
    } else {
      // Закрываем списки если были открыты
      if (inList) {
        htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (inOrderedList) {
        htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }

      if (isHeading) {
        htmlLines.push(`<h2 class="section-heading">${escapeHtml(line)}</h2>`);
      } else if (isSubheading) {
        htmlLines.push(`<h3 class="subsection-heading">${escapeHtml(line)}</h3>`);
      } else if (isParagraph && line.length > 0) {
        // Улучшаем параграфы: выделяем важные части
        const formattedParagraph = formatParagraph(line);
        htmlLines.push(`<p class="content-paragraph">${formattedParagraph}</p>`);
      }
    }
    
    i++;
  }

  // Закрываем списки если остались открытыми
  if (inList && listItems.length > 0) {
    htmlLines.push(`<ul class="styled-list">${listItems.join('')}</ul>`);
  }
  if (inOrderedList && orderedListItems.length > 0) {
    htmlLines.push(`<ol class="styled-list">${orderedListItems.join('')}</ol>`);
  }

  return htmlLines.join('\n');
}

/**
 * Определяет, является ли строка заголовком
 */
function detectHeading(line: string): boolean {
  // Заголовки обычно:
  // - Короткие (до 100 символов)
  // - Заглавные буквы или начинаются с заглавной
  // - Не содержат знаков препинания в конце (кроме двоеточия)
  // - Не являются частью предложения
  
  if (line.length > 100) return false;
  if (line.length < 3) return false;
  
  // Все заглавные буквы (русские)
  if (/^[А-ЯЁ\s\d\.\-:]{5,}$/.test(line) && line.length < 80) {
    return true;
  }
  
  // Начинается с заглавной, короткая, без точки в конце
  if (/^[А-ЯЁ]/.test(line) && line.length < 60 && !line.endsWith('.') && !line.endsWith(',')) {
    // Проверяем, что это не обычное предложение
    const words = line.split(/\s+/);
    if (words.length <= 8 && words.every(w => w.length < 20)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Разбивает длинный текст на параграфы по предложениям
 */
function splitIntoParagraphs(text: string): string[] {
  // Разбиваем по точкам, восклицательным и вопросительным знакам
  // Но сохраняем структуру для аббревиатур и чисел
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const paragraphs: string[] = [];
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    // Если предложение очень короткое, добавляем к текущему параграфу
    if (sentence.length < 30 && currentParagraph) {
      currentParagraph += ' ' + sentence;
    } else {
      // Сохраняем текущий параграф если есть
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
      }
      currentParagraph = sentence;
    }
    
    // Если параграф стал слишком длинным (более 500 символов), разбиваем
    if (currentParagraph.length > 500) {
      const words = currentParagraph.split(' ');
      const midPoint = Math.floor(words.length / 2);
      paragraphs.push(words.slice(0, midPoint).join(' '));
      currentParagraph = words.slice(midPoint).join(' ');
    }
  }
  
  // Добавляем последний параграф
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs.length > 0 ? paragraphs : [text];
}

/**
 * Форматирует параграф: выделяет важные части, цифры, термины
 */
function formatParagraph(text: string): string {
  // Если текст очень длинный, разбиваем на несколько параграфов
  if (text.length > 500) {
    const paragraphs = splitIntoParagraphs(text);
    return paragraphs.map(p => formatSingleParagraph(p)).join('</p><p class="content-paragraph">');
  }
  
  return formatSingleParagraph(text);
}

/**
 * Форматирует один параграф
 */
function formatSingleParagraph(text: string): string {
  let formatted = escapeHtml(text);
  
  // Выделяем важные термины (слова с заглавной буквы в начале предложения или важные понятия)
  // Но не все подряд, только специальные термины
  const importantTerms = [
    'DGT', 'ПДД', 'автомобиль', 'автобус', 'мотоцикл', 'велосипед',
    'пешеход', 'водитель', 'пассажир', 'дорожный', 'знак', 'сигнал',
    'скорость', 'штраф', 'балл', 'лицензия', 'разрешение', 'экзамен'
  ];
  
  importantTerms.forEach(term => {
    const regex = new RegExp(`\\b(${term})\\b`, 'gi');
    formatted = formatted.replace(regex, '<strong class="term">$1</strong>');
  });
  
  // Выделяем цифры с единицами измерения (км/ч, м, €, и т.д.)
  formatted = formatted.replace(/(\d+)\s*(км\/ч|км|м|€|евро|балл|баллов|очк|очков|минут|часов|дней|лет)/gi, '<span class="number">$1 $2</span>');
  
  // Выделяем важные фразы в кавычках
  formatted = formatted.replace(/"([^"]+)"/g, '<span class="quote">"$1"</span>');
  
  // Выделяем испанские термины (обычно в скобках)
  formatted = formatted.replace(/\(([А-ЯЁа-яё\s]+)\)/g, '<span class="translation">($1)</span>');
  
  // Выделяем важные числа (проценты, суммы штрафов)
  formatted = formatted.replace(/(\d+)\s*%/g, '<span class="number">$1%</span>');
  formatted = formatted.replace(/(\d+)\s*(€|евро)/g, '<span class="number">$1 $2</span>');
  
  return formatted;
}

/**
 * Экранирует HTML символы
 */
function escapeHtml(text: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  // Fallback для серверного окружения
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Создает HTML контент для материала с изображениями и улучшенной типографикой
 */
export function createMaterialHTML(section: PDFSection): string {
  let html = '';

  // Добавляем заголовок с улучшенным стилем
  html += `<div class="material-header">\n`;
  html += `  <h1 class="material-title">${escapeHtml(section.title)}</h1>\n`;
  if (section.pageRange) {
    html += `  <p class="material-meta">Страницы ${section.pageRange.start}-${section.pageRange.end}</p>\n`;
  }
  html += `</div>\n\n`;

  // Форматируем текст с улучшенной структурой
  const formattedText = formatTextAsHTML(section.content);
  html += `<div class="material-content-wrapper">\n`;
  html += formattedText;
  html += `</div>\n`;

  // Добавляем изображения если есть
  if (section.images.length > 0) {
    html += '\n<div class="images-gallery">\n';
    section.images.forEach((imageUrl, index) => {
      html += `  <figure class="image-container">\n`;
      html += `    <img src="${imageUrl}" alt="Иллюстрация ${index + 1}" loading="lazy" class="material-image" />\n`;
      html += `    <figcaption>Иллюстрация ${index + 1}</figcaption>\n`;
      html += `  </figure>\n`;
    });
    html += '</div>\n';
  }

  return html;
}

