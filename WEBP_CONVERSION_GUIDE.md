# Руководство по конвертации изображений в WebP

## 📋 Обзор

WebP формат обеспечивает на 25-35% меньший размер файла при том же качестве, что значительно улучшает производительность загрузки изображений.

## ✅ Автоматическая поддержка WebP

Код уже настроен на автоматическое использование WebP:
- `getImageUrl()` автоматически проверяет поддержку WebP в браузере
- Если WebP поддерживается, пытается использовать `.webp` версию
- Если WebP версия не найдена, использует оригинальный формат (fallback)

## 🔧 Конвертация изображений на бэкенде

### Вариант 1: Edge Function для автоматической конвертации

Создайте Edge Function `convert-to-webp`:

```typescript
// supabase/functions/convert-to-webp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { imagePath, bucket } = await req.json();
  
  // Загружаем оригинальное изображение
  const { data: imageData, error: downloadError } = await supabase
    .storage
    .from(bucket)
    .download(imagePath);
  
  if (downloadError) {
    return new Response(JSON.stringify({ error: downloadError.message }), {
      status: 400,
    });
  }
  
  // Конвертируем в WebP (требует установки imagemagick или sharp)
  // Это упрощенный пример - нужна реальная библиотека для конвертации
  const webpData = await convertToWebP(imageData);
  
  // Сохраняем WebP версию
  const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const { error: uploadError } = await supabase
    .storage
    .from(bucket)
    .upload(webpPath, webpData, {
      contentType: 'image/webp',
      upsert: true,
    });
  
  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), {
      status: 500,
    });
  }
  
  return new Response(JSON.stringify({ success: true, path: webpPath }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Вариант 2: Скрипт для массовой конвертации

Создайте скрипт `scripts/convert-images-to-webp.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function convertImageToWebP(imagePath, bucket = 'questions') {
  try {
    // Загружаем оригинальное изображение
    const { data: imageData, error: downloadError } = await supabase
      .storage
      .from(bucket)
      .download(imagePath);
    
    if (downloadError) {
      console.error(`Error downloading ${imagePath}:`, downloadError);
      return;
    }
    
    // Конвертируем в WebP
    const webpBuffer = await sharp(await imageData.arrayBuffer())
      .webp({ quality: 80 })
      .toBuffer();
    
    // Сохраняем WebP версию
    const webpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const { error: uploadError } = await supabase
      .storage
      .from(bucket)
      .upload(webpPath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });
    
    if (uploadError) {
      console.error(`Error uploading ${webpPath}:`, uploadError);
    } else {
      console.log(`✅ Converted: ${imagePath} → ${webpPath}`);
    }
  } catch (error) {
    console.error(`Error converting ${imagePath}:`, error);
  }
}

async function convertAllImages(bucket = 'questions') {
  // Получаем список всех изображений
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
  
  if (error) {
    console.error('Error listing files:', error);
    return;
  }
  
  // Фильтруем только изображения
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png)$/i.test(file.name)
  );
  
  console.log(`Found ${imageFiles.length} images to convert`);
  
  // Конвертируем каждое изображение
  for (const file of imageFiles) {
    await convertImageToWebP(file.name, bucket);
    // Небольшая задержка, чтобы не перегружать сервер
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ Conversion complete!');
}

// Запуск
convertAllImages('questions');
```

### Установка зависимостей

```bash
npm install sharp --save-dev
```

## 📊 Рекомендации

1. **Качество WebP**: Используйте quality: 80 для оптимального баланса размера и качества
2. **Постепенная конвертация**: Конвертируйте изображения постепенно, начиная с самых используемых
3. **Мониторинг**: Отслеживайте использование WebP через аналитику
4. **Fallback**: Всегда сохраняйте оригинальные изображения для fallback

## ✅ Результат

После конвертации:
- Изображения будут автоматически использовать WebP, если браузер поддерживает
- Размер файлов уменьшится на 25-35%
- Время загрузки страниц улучшится
- Пользовательский опыт станет лучше

