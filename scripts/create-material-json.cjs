const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// Функция для конвертации текста в структурированный HTML
function textToHTML(text, title, images = []) {
  const lines = text.split('\n').filter(line => line.trim());
  let html = `<div class="material-content-wrapper">\n`;
  
  // Главный заголовок
  html += `<h1 class="material-title">${escapeHtml(title)}</h1>\n`;
  
  let inList = false;
  let inParagraph = false;
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    
    // Пропускаем служебные строки
    if (line.match(/^(www\.|TEMA|-- \d+ of \d+ --|ÍNDICE|Maniobras\.|Страница \d+ из \d+)$/i)) {
      continue;
    }
    
    // Закрываем предыдущие блоки перед новым разделом
    if (inList) {
      html += '</ul>\n';
      inList = false;
    }
    if (inParagraph) {
      html += '</p>\n';
      inParagraph = false;
    }
    
    // Заголовки разделов (ВСЕ ЗАГЛАВНЫЕ БУКВЫ, длинные)
    if (line.match(/^[A-ZÁÉÍÓÚÑ\s:]+$/) && line.length > 15 && line.length < 150 && !line.match(/^[A-Z]\./)) {
      // Закрываем предыдущий section-header если был
      if (currentSection) {
        html += '</div>\n';
      }
      html += `<div class="section-header">\n<h2 class="section-title">${escapeHtml(line)}</h2>\n</div>\n`;
      currentSection = line;
      continue;
    }
    
    // Вопросы (начинаются с ¿)
    if (line.match(/^¿[A-Z]/)) {
      html += `<div class="question-block">\n<h3 class="question-title">${escapeHtml(line)}</h3>\n`;
      continue;
    }
    
    // Заголовки подразделов (начинаются с цифры и точки)
    if (line.match(/^\d+\.\d+/) && line.length < 100) {
      html += `<h3 class="subsection-title">${escapeHtml(line)}</h3>\n`;
      continue;
    }
    
    // Подзаголовки (начинаются с цифры, точки и еще цифры)
    if (line.match(/^\d+\.\d+\.\d+/) && line.length < 100) {
      html += `<h4 class="sub-subsection-title">${escapeHtml(line)}</h4>\n`;
      continue;
    }
    
    // Списки (начинаются с •, - или цифры с точкой)
    if (line.match(/^[•\-\d]+\.?\s+/) || (line.match(/^[A-Z][a-z]/) && line.length < 80 && nextLine && nextLine.match(/^[•\-\d]+\.?\s+/))) {
      if (!inList) {
        html += '<ul class="material-list">\n';
        inList = true;
      }
      const listItem = line.replace(/^[•\-\d]+\.?\s+/, '').trim();
      if (listItem) {
        html += `<li>${escapeHtml(listItem)}</li>\n`;
      }
      continue;
    }
    
    // Обнаружение таблиц (строки с разделителями или повторяющимися паттернами)
    if (line.includes('EN POBLADO') || line.includes('FUERA DE POBLADO') || 
        line.match(/SITUACIONES|SITUACI[ÓO]NES/i)) {
      // Начинаем таблицу
      html += `<div class="table-wrapper">\n<table class="data-table">\n`;
      html += `<thead>\n<tr>\n<th>Situación</th>\n<th>En poblado</th>\n<th>Fuera de poblado</th>\n</tr>\n</thead>\n<tbody>\n`;
      
      // Пропускаем заголовок таблицы
      i++;
      // Читаем строки таблицы до конца раздела
      while (i < lines.length) {
        const tableLine = lines[i].trim();
        if (!tableLine || tableLine.match(/^\d+\.\d+/)) {
          i--; // Возвращаемся на одну строку назад
          break;
        }
        
        // Пытаемся распарсить строку таблицы
        if (tableLine.match(/Para|Realizar|Vías|avisar/i)) {
          html += `<tr>\n<td>${escapeHtml(tableLine)}</td>\n<td>—</td>\n<td>—</td>\n</tr>\n`;
        }
        i++;
      }
      
      html += `</tbody>\n</table>\n</div>\n`;
      continue;
    }
    
    // Обычные параграфы
    if (line.length > 0) {
      // Проверяем, не является ли это началом нового параграфа после вопроса
      if (line.match(/^[A-Z]/) && !line.match(/^[A-Z]\./) && line.length > 20) {
        if (!inParagraph) {
          html += '<p class="material-paragraph">';
          inParagraph = true;
        } else {
          html += '</p>\n<p class="material-paragraph">';
        }
      } else if (!inParagraph) {
        html += '<p class="material-paragraph">';
        inParagraph = true;
      } else {
        html += ' ';
      }
      html += escapeHtml(line);
    } else {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
    }
  }
  
  // Закрываем незакрытые блоки
  if (inList) html += '</ul>\n';
  if (inParagraph) html += '</p>\n';
  
  // Закрываем question-block если открыт (простой подсчет)
  const questionBlocks = (html.match(/<div class="question-block">/g) || []).length;
  const allDivs = (html.match(/<div/g) || []).length;
  const closedDivs = (html.match(/<\/div>/g) || []).length;
  const openDivs = allDivs - closedDivs;
  for (let i = 0; i < openDivs; i++) {
    html += '</div>\n';
  }
  
  html += '</div>';
  
  return html;
}

// Функция для экранирования HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function extractSubtopics(pdfPath, topicNumber, subtopicCodes) {
  try {
    console.log(`📄 Обработка PDF: ${pdfPath}`);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    
    console.log(`✅ PDF загружен: ${pdfData.total} страниц`);
    console.log(`📝 Текст извлечен: ${pdfData.text.length} символов\n`);
    
    const textLines = pdfData.text.split('\n');
    const subtopics = [];
    const foundCodes = new Set();
    
    // Находим позиции всех подтем
    // Игнорируем первые 20 строк (оглавление) и ищем реальное начало контента
    const subtopicPositions = [];
    const ignoreFirstLines = 20; // Пропускаем оглавление
    
    for (let i = ignoreFirstLines; i < textLines.length; i++) {
      const line = textLines[i].trim();
      const match = line.match(/^(\d+\.\d+)(?:\.|\s+)(.+)$/);
      
      if (match) {
        const [, code, title] = match;
        // Проверяем что это не просто упоминание в тексте, а начало раздела
        // (следующая строка должна быть не пустой и не быть другой подтемой)
        const nextLine = i + 1 < textLines.length ? textLines[i + 1].trim() : '';
        const isRealStart = nextLine.length > 0 && !nextLine.match(/^\d+\.\d+/);
        
        if (subtopicCodes.includes(code) && !foundCodes.has(code) && isRealStart) {
          subtopicPositions.push({
            code,
            title: title.trim(),
            startIndex: i,
            endIndex: null
          });
          foundCodes.add(code);
        }
      }
    }
    
    // Определяем границы контента для каждой подтемы
    for (let i = 0; i < subtopicPositions.length; i++) {
      const current = subtopicPositions[i];
      const next = subtopicPositions[i + 1];
      
      // Ищем конец контента текущей подтемы
      // Контент заканчивается когда встречаем следующую подтему с другим номером
      let endIdx = next ? next.startIndex : textLines.length;
      
      // Если следующая подтема не найдена, ищем следующую подтему вручную
      if (!next) {
        for (let j = current.startIndex + 1; j < textLines.length; j++) {
          const line = textLines[j].trim();
          // Ищем следующую подтему (начинается с цифры.цифра, но не текущая)
          const match = line.match(/^(\d+\.\d+)(?:\.|\s+)/);
          if (match && match[1] !== current.code) {
            endIdx = j;
            break;
          }
        }
      }
      
      // Извлекаем контент (начинаем со следующей строки после заголовка)
      const contentLines = textLines.slice(current.startIndex + 1, endIdx);
      const contentText = contentLines.join('\n').trim();
      
      subtopics.push({
        code: current.code,
        title: current.title,
        content: contentText,
        startLine: current.startIndex,
        endLine: endIdx
      });
      
      console.log(`✓ Подтема ${current.code}: "${current.title.substring(0, 50)}..."`);
      console.log(`  Строки: ${current.startIndex}-${endIdx}, контент: ${contentText.length} символов\n`);
    }
    
    return {
      totalPages: pdfData.total,
      subtopics
    };
    
  } catch (error) {
    console.error('❌ Ошибка обработки PDF:', error);
    throw error;
  }
}

async function createMaterialJSONs(topicNumber, subtopics) {
  const outputDir = path.join(__dirname, '..', 'src', 'data', 'materials', `topic-${topicNumber}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const materialFiles = [];
  
  for (const subtopic of subtopics) {
    // Создаем HTML контент
    const htmlContent = textToHTML(subtopic.content, subtopic.title);
    
    // Создаем JSON структуру
    const materialJSON = {
      id: `subtopic-${subtopic.code.replace('.', '-')}`,
      code: subtopic.code,
      topic_id: `topic-${topicNumber}`,
      title_ru: subtopic.title,
      title_es: subtopic.title, // Пока одинаковые, потом можно перевести
      title_en: subtopic.title,
      content_ru: htmlContent,
      content_es: htmlContent,
      content_en: htmlContent,
      images: [],
      order: parseInt(subtopic.code.split('.')[1]) || 0,
      source_pdf: `https://drive.google.com/file/d/18bU1gIocXTInDUbvl8d0NedKqYPq1Tev/view`
    };
    
    // Сохраняем JSON файл
    const filename = `subtopic-${subtopic.code.replace('.', '-')}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(materialJSON, null, 2), 'utf-8');
    
    materialFiles.push({
      code: subtopic.code,
      filename,
      title: subtopic.title
    });
    
    console.log(`💾 Создан файл: ${filename}`);
  }
  
  return materialFiles;
}

async function main() {
  const pdfPath = process.argv[2] || '/tmp/topic2-material.pdf';
  const topicNumber = parseInt(process.argv[3]) || 2;
  const subtopicCodes = process.argv[4] ? process.argv[4].split(',') : ['2.1', '2.2'];
  
  console.log('🚀 Создание материалов из PDF\n');
  console.log(`📁 Путь к PDF: ${pdfPath}`);
  console.log(`📚 Тема: ${topicNumber}`);
  console.log(`📝 Подтемы: ${subtopicCodes.join(', ')}\n`);
  console.log('─'.repeat(60) + '\n');
  
  // Извлекаем подтемы
  const result = await extractSubtopics(pdfPath, topicNumber, subtopicCodes);
  
  console.log('─'.repeat(60) + '\n');
  console.log('📝 Создание JSON файлов...\n');
  
  // Создаем JSON файлы
  const files = await createMaterialJSONs(topicNumber, result.subtopics);
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅ Готово! Создано файлов: ${files.length}`);
  console.log(`📂 Директория: src/data/materials/topic-${topicNumber}/\n`);
  
  files.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.filename}`);
    console.log(`     ${file.code} - ${file.title.substring(0, 60)}...`);
  });
}

main().catch(console.error);

