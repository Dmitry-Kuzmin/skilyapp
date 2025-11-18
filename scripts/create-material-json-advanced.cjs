const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

/**
 * Улучшенная функция конвертации текста в структурированный HTML
 */
function textToStructuredHTML(text, title) {
  const lines = text.split('\n').map(l => l.trim()).filter(line => line.length > 0);
  let html = '';
  
  let inList = false;
  let inParagraph = false;
  let inQuestionBlock = false;
  
  // Обрабатываем строки с учетом структуры
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Пропускаем служебные строки
    if (line.match(/^(www\.|TEMA|-- \d+ of \d+ --|ÍNDICE|Maniobras\.|Страница \d+ из \d+|PracticaVial)$/i)) {
      continue;
    }
    
    // Заголовки разделов (ВСЕ ЗАГЛАВНЫЕ БУКВЫ, заканчиваются двоеточием, длина 10-100)
    const isSectionHeader = line.match(/^[А-ЯЁA-Z][А-ЯЁA-Z\s:]+:$/) && line.length > 10 && line.length < 100;
    if (isSectionHeader) {
      closeCurrentBlocks();
      const sectionTitle = line.replace(':', '').trim();
      html += `<div class="section-header">\n<h2 class="section-title">${sectionTitle}</h2>\n</div>\n`;
      continue;
    }
    
    // Заголовки подразделов (начинаются с цифры.цифра, но не дубликат заголовка)
    const isSubsection = line.match(/^\d+\.\d+/) && line.length < 100 && !line.includes(title.substring(0, 30));
    if (isSubsection) {
      closeCurrentBlocks();
      html += `<h3 class="subsection-title">${line}</h3>\n`;
      continue;
    }
    
    // Вопросы (начинаются с ¿)
    if (line.startsWith('¿')) {
      closeCurrentBlocks();
      html += `<div class="question-block">\n<h3 class="question-title">${line}</h3>\n`;
      inQuestionBlock = true;
      continue;
    }
    
    // Списки (начинаются с •, цифры с точкой, или дефиса)
    const isListItem = line.match(/^[•\d\-]+\.?\s+/) || (line.match(/^[A-ZА-ЯЁ][a-zа-яё]+\s*:/) && line.length < 60);
    if (isListItem) {
      if (inParagraph) {
        html += '</p>\n';
        inParagraph = false;
      }
      if (!inList) {
        html += '<ul class="material-list">\n';
        inList = true;
      }
      const listItem = line.replace(/^[•\d\-]+\.?\s+/, '').trim();
      html += `<li>${listItem}</li>\n`;
      continue;
    }
    
    // Обычные параграфы
    if (line.length > 0) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (!inParagraph) {
        html += '<p class="material-paragraph">';
        inParagraph = true;
      } else {
        html += ' ';
      }
      html += line;
    }
  }
  
  // Закрываем открытые блоки
  function closeCurrentBlocks() {
    if (inList) {
      html += '</ul>\n';
      inList = false;
    }
    if (inParagraph) {
      html += '</p>\n';
      inParagraph = false;
    }
    if (inQuestionBlock) {
      html += '</div>\n';
      inQuestionBlock = false;
    }
  }
  
  closeCurrentBlocks();
  
  return `<div class="material-content-wrapper">\n<h1 class="material-title">${title}</h1>\n${html}</div>`;
}

/**
 * Извлекает изображения из PDF
 */
async function extractImages(pdfPath, topicNumber, subtopicCode) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const imageData = await parser.getImage({ imageDataUrl: true, imageBuffer: false });
    
    const images = [];
    const outputDir = path.join(__dirname, '..', 'public', 'data', 'materials', `topic-${topicNumber}`, 'images');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Извлекаем изображения со страниц, относящихся к подтеме
    // Для подтемы 2.1 - примерно страницы 5-13, для 2.2 - страницы 13-14
    const pageRanges = {
      '2.1': { start: 5, end: 13 },
      '2.2': { start: 13, end: 14 },
    };
    
    const range = pageRanges[subtopicCode] || { start: 1, end: imageData.total };
    
    for (const page of imageData.pages) {
      if (page.pageNumber >= range.start && page.pageNumber <= range.end) {
        for (let idx = 0; idx < page.images.length; idx++) {
          const img = page.images[idx];
          if (img.dataUrl && img.width > 50 && img.height > 50) { // Фильтруем маленькие изображения
            const filename = `subtopic-${subtopicCode.replace('.', '-')}-page-${page.pageNumber}-img-${idx + 1}.png`;
            const filepath = path.join(outputDir, filename);
            
            // Сохраняем изображение из dataUrl
            const base64Data = img.dataUrl.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, base64Data, 'base64');
            
            images.push({
              url: `/data/materials/topic-${topicNumber}/images/${filename}`,
              alt: `Изображение ${idx + 1} со страницы ${page.pageNumber}`,
              caption: `Страница ${page.pageNumber}`,
              width: img.width,
              height: img.height
            });
            
            console.log(`  💾 Сохранено изображение: ${filename} (${img.width}x${img.height})`);
          }
        }
      }
    }
    
    return images;
  } catch (error) {
    console.error('❌ Ошибка извлечения изображений:', error);
    return [];
  }
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
    
    // Находим позиции всех подтем (игнорируем первые 20 строк - оглавление)
    const subtopicPositions = [];
    const ignoreFirstLines = 20;
    
    for (let i = ignoreFirstLines; i < textLines.length; i++) {
      const line = textLines[i].trim();
      const match = line.match(/^(\d+\.\d+)(?:\.|\s+)(.+)$/);
      
      if (match) {
        const [, code, title] = match;
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
      
      let endIdx = next ? next.startIndex : textLines.length;
      
      // Ищем следующую подтему с другим номером
      if (!next) {
        for (let j = current.startIndex + 1; j < textLines.length; j++) {
          const line = textLines[j].trim();
          const match = line.match(/^(\d+\.\d+)(?:\.|\s+)/);
          if (match && match[1] !== current.code) {
            endIdx = j;
            break;
          }
        }
      }
      
      // Извлекаем контент
      const contentLines = textLines.slice(current.startIndex + 1, endIdx);
      const contentText = contentLines.join('\n').trim();
      
      // Извлекаем изображения для этой подтемы
      console.log(`\n🖼️  Извлечение изображений для подтемы ${current.code}...`);
      const images = await extractImages(pdfPath, topicNumber, current.code);
      
      subtopics.push({
        code: current.code,
        title: current.title,
        content: contentText,
        images,
        startLine: current.startIndex,
        endLine: endIdx
      });
      
      console.log(`✓ Подтема ${current.code}: "${current.title.substring(0, 50)}..."`);
      console.log(`  Строки: ${current.startIndex}-${endIdx}, контент: ${contentText.length} символов`);
      console.log(`  Изображений: ${images.length}\n`);
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
    // Создаем структурированный HTML контент
    const htmlContent = textToStructuredHTML(subtopic.content, subtopic.title);
    
    // Создаем JSON структуру
    const materialJSON = {
      id: `subtopic-${subtopic.code.replace('.', '-')}`,
      code: subtopic.code,
      topic_id: `topic-${topicNumber}`,
      title_ru: subtopic.title,
      title_es: subtopic.title,
      title_en: subtopic.title,
      content_ru: htmlContent,
      content_es: htmlContent,
      content_en: htmlContent,
      images: subtopic.images || [],
      order: parseInt(subtopic.code.split('.')[1]) || 0,
      source_pdf: `https://drive.google.com/file/d/18bU1gIocXTInDUbvl8d0NedKqYPq1Tev/view`
    };
    
    // Сохраняем JSON файл
    const filename = `subtopic-${subtopic.code.replace('.', '-')}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(materialJSON, null, 2), 'utf-8');
    
    // Копируем в public
    const publicDir = path.join(__dirname, '..', 'public', 'data', 'materials', `topic-${topicNumber}`);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, filename), JSON.stringify(materialJSON, null, 2), 'utf-8');
    
    materialFiles.push({
      code: subtopic.code,
      filename,
      title: subtopic.title,
      imagesCount: subtopic.images?.length || 0
    });
    
    console.log(`💾 Создан файл: ${filename} (${subtopic.images?.length || 0} изображений)`);
  }
  
  return materialFiles;
}

async function main() {
  const pdfPath = process.argv[2] || '/tmp/topic2-material.pdf';
  const topicNumber = parseInt(process.argv[3]) || 2;
  const subtopicCodes = process.argv[4] ? process.argv[4].split(',') : ['2.1', '2.2'];
  
  console.log('🚀 Создание улучшенных материалов из PDF\n');
  console.log(`📁 Путь к PDF: ${pdfPath}`);
  console.log(`📚 Тема: ${topicNumber}`);
  console.log(`📝 Подтемы: ${subtopicCodes.join(', ')}\n`);
  console.log('─'.repeat(60) + '\n');
  
  // Извлекаем подтемы с изображениями
  const result = await extractSubtopics(pdfPath, topicNumber, subtopicCodes);
  
  console.log('─'.repeat(60) + '\n');
  console.log('📝 Создание JSON файлов со структурированным контентом...\n');
  
  // Создаем JSON файлы
  const files = await createMaterialJSONs(topicNumber, result.subtopics);
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅ Готово! Создано файлов: ${files.length}`);
  console.log(`📂 Директория: src/data/materials/topic-${topicNumber}/\n`);
  
  files.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.filename}`);
    console.log(`     ${file.code} - ${file.title.substring(0, 60)}...`);
    console.log(`     🖼️  Изображений: ${file.imagesCount}`);
  });
}

main().catch(console.error);

