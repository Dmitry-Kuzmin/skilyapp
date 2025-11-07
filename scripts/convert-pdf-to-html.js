/**
 * Скрипт для конвертации PDF в HTML/Markdown
 * 
 * Требования:
 * - npm install pdf-parse pdfjs-dist
 * 
 * Использование:
 * node scripts/convert-pdf-to-html.js <input-pdf> <output-dir>
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function convertPdfToHtml(pdfPath, outputDir) {
  try {
    console.log(`Чтение PDF: ${pdfPath}`);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    // Создаем выходную директорию
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Извлекаем текст
    const text = data.text;
    
    // Простая конвертация текста в HTML
    // В реальном проекте можно использовать более продвинутые библиотеки
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Материал</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 {
      color: #2c3e50;
      margin-top: 1.5em;
    }
    p {
      margin-bottom: 1em;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="content">
    ${text.split('\n').map(line => {
      // Простая обработка: заголовки, параграфы
      if (line.trim().length === 0) return '<br>';
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s/, '');
        return `<h${level}>${text}</h${level}>`;
      }
      return `<p>${line}</p>`;
    }).join('\n')}
  </div>
</body>
</html>
    `.trim();
    
    // Сохраняем HTML
    const outputPath = path.join(outputDir, path.basename(pdfPath, '.pdf') + '.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    console.log(`✓ HTML сохранен: ${outputPath}`);
    console.log(`  Страниц: ${data.numpages}`);
    console.log(`  Символов: ${text.length}`);
    
    // Сохраняем метаданные
    const metadata = {
      title: data.info?.Title || path.basename(pdfPath, '.pdf'),
      pages: data.numpages,
      textLength: text.length,
      createdAt: new Date().toISOString(),
    };
    
    const metadataPath = path.join(outputDir, path.basename(pdfPath, '.pdf') + '.metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    console.log(`✓ Метаданные сохранены: ${metadataPath}`);
    
    return {
      html,
      metadata,
      text,
    };
  } catch (error) {
    console.error('Ошибка конвертации PDF:', error);
    throw error;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Использование: node convert-pdf-to-html.js <input-pdf> <output-dir>');
    process.exit(1);
  }
  
  const [pdfPath, outputDir] = args;
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`Файл не найден: ${pdfPath}`);
    process.exit(1);
  }
  
  convertPdfToHtml(pdfPath, outputDir)
    .then(() => {
      console.log('✓ Конвертация завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { convertPdfToHtml };

