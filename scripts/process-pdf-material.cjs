const fs = require('fs');
const path = require('path');
// pdf-parse экспортирует класс PDFParse
const { PDFParse } = require('pdf-parse');

async function processPDF(pdfPath, topicNumber, subtopicNumbers) {
  try {
    console.log(`📄 Обработка PDF: ${pdfPath}`);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    
    console.log(`✅ PDF загружен: ${pdfData.total} страниц`);
    console.log(`📝 Текст извлечен: ${pdfData.text.length} символов`);
    
    // Разделяем текст на строки для анализа
    const textLines = pdfData.text.split('\n');
    
    // Простой парсинг: ищем заголовки подтем
    // Предполагаем, что подтемы начинаются с номеров типа "2.1", "2.2" и т.д.
    const subtopics = [];
    let currentSubtopic = null;
    let currentContent = [];
    
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i].trim();
      
      // Ищем начало новой подтемы (например, "2.1", "2.2")
      // Может быть в разных форматах: "2.1", "2.1.", "2.1 Манёвры" и т.д.
      const subtopicMatch = line.match(/^(\d+\.\d+)(?:\.|\s+)(.+)$/);
      
      if (subtopicMatch) {
        const [, code, title] = subtopicMatch;
        const cleanTitle = title.trim();
        
        // Если это одна из нужных подтем
        if (subtopicNumbers.includes(code)) {
          // Сохраняем предыдущую подтему если есть
          if (currentSubtopic) {
            subtopics.push({
              code: currentSubtopic.code,
              title: currentSubtopic.title,
              content: currentContent.join('\n').trim()
            });
          }
          
          // Начинаем новую подтему
          currentSubtopic = { code, title: cleanTitle };
          currentContent = [];
          console.log(`  ✓ Найдена подтема: ${code} - ${cleanTitle}`);
        } else if (currentSubtopic) {
          // Если встретили другую подтему, заканчиваем текущую
          subtopics.push({
            code: currentSubtopic.code,
            title: currentSubtopic.title,
            content: currentContent.join('\n').trim()
          });
          currentSubtopic = null;
          currentContent = [];
        }
      } else if (currentSubtopic && line) {
        // Добавляем контент к текущей подтеме (пропускаем пустые строки в начале)
        if (line.length > 0) {
          currentContent.push(line);
        }
      }
    }
    
    // Сохраняем последнюю подтему
    if (currentSubtopic) {
      subtopics.push({
        code: currentSubtopic.code,
        title: currentSubtopic.title,
        content: currentContent.join('\n').trim()
      });
    }
    
    console.log(`\n📚 Найдено подтем: ${subtopics.length}`);
    subtopics.forEach((st, idx) => {
      console.log(`  ${idx + 1}. ${st.code} - ${st.title}`);
      console.log(`     Контент: ${st.content.substring(0, 100)}...`);
    });
    
    return {
      totalPages: pdfData.total,
      subtopics,
      fullText: pdfData.text
    };
    
  } catch (error) {
    console.error('❌ Ошибка обработки PDF:', error);
    throw error;
  }
}

// Основная функция
async function main() {
  const pdfPath = process.argv[2] || '/tmp/topic2-material.pdf';
  const topicNumber = parseInt(process.argv[3]) || 2;
  const subtopicCodes = process.argv[4] ? process.argv[4].split(',') : ['2.1', '2.2'];
  
  console.log('🚀 Начало обработки PDF материала');
  console.log(`📁 Путь к PDF: ${pdfPath}`);
  console.log(`📚 Тема: ${topicNumber}`);
  console.log(`📝 Подтемы: ${subtopicCodes.join(', ')}`);
  console.log('');
  
  const result = await processPDF(pdfPath, topicNumber, subtopicCodes);
  
  // Сохраняем результат
  const outputDir = path.join(__dirname, '..', 'src', 'data', 'materials', `topic-${topicNumber}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Сохраняем полный текст для анализа
  fs.writeFileSync(
    path.join(outputDir, 'full-text.txt'),
    result.fullText,
    'utf-8'
  );
  
  console.log(`\n💾 Результаты сохранены в: ${outputDir}`);
  console.log(`📄 Полный текст: full-text.txt`);
  
  return result;
}

main().catch(console.error);

