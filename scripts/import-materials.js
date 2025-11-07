/**
 * Скрипт для импорта материалов в базу данных Supabase
 * 
 * Требования:
 * - Настроенный Supabase клиент
 * - Файлы HTML материалов в директории
 * 
 * Использование:
 * node scripts/import-materials.js <materials-dir> <topic-id> <subtopic-id>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importMaterial(materialPath, subtopicId, topicId) {
  try {
    console.log(`Импорт материала: ${materialPath}`);
    
    // Читаем HTML файл
    const htmlContent = fs.readFileSync(materialPath, 'utf-8');
    
    // Извлекаем заголовок из HTML или используем имя файла
    const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                      htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(materialPath, '.html');
    
    // Извлекаем изображения из HTML
    const imageMatches = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
    const images = imageMatches.map(match => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      return srcMatch ? srcMatch[1] : null;
    }).filter(Boolean);
    
    // Создаем материал в базе данных
    const { data, error } = await supabase
      .from('materials')
      .insert({
        subtopic_id: subtopicId,
        title_ru: title,
        title_es: title, // Можно обновить позже
        title_en: title, // Можно обновить позже
        content_ru: htmlContent,
        content_es: htmlContent, // Можно обновить позже
        content_en: htmlContent, // Можно обновить позже
        images: images,
        source_pdf: null, // Можно добавить ссылку на оригинальный PDF
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Ошибка импорта материала: ${error.message}`);
      throw error;
    }
    
    console.log(`✓ Материал импортирован: ${data.id}`);
    return data;
  } catch (error) {
    console.error(`Ошибка импорта материала ${materialPath}:`, error);
    throw error;
  }
}

async function importMaterialsFromDir(materialsDir, topicId, subtopicId) {
  try {
    console.log(`Импорт материалов из: ${materialsDir}`);
    
    if (!fs.existsSync(materialsDir)) {
      console.error(`Директория не найдена: ${materialsDir}`);
      process.exit(1);
    }
    
    // Находим все HTML файлы
    const files = fs.readdirSync(materialsDir)
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(materialsDir, file));
    
    if (files.length === 0) {
      console.error('HTML файлы не найдены');
      process.exit(1);
    }
    
    console.log(`Найдено файлов: ${files.length}`);
    
    // Импортируем каждый файл
    for (const file of files) {
      await importMaterial(file, subtopicId, topicId);
    }
    
    console.log(`✓ Импортировано материалов: ${files.length}`);
  } catch (error) {
    console.error('Ошибка импорта материалов:', error);
    throw error;
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Использование: node import-materials.js <materials-dir> <topic-id> <subtopic-id>');
    process.exit(1);
  }
  
  const [materialsDir, topicId, subtopicId] = args;
  
  importMaterialsFromDir(materialsDir, topicId, subtopicId)
    .then(() => {
      console.log('✓ Импорт завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Ошибка:', error);
      process.exit(1);
    });
}

module.exports = { importMaterial, importMaterialsFromDir };

