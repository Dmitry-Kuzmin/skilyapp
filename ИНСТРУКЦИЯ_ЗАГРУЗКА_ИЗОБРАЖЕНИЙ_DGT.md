# 📸 Инструкция по загрузке изображений DGT

## Проблема

Изображения для вопросов DGT **не доступны публично** на GitHub. Их нужно скачать отдельным архивом и загрузить в Supabase Storage.

## 🔽 Шаг 1: Скачать изображения

Согласно README репозитория, изображения доступны по ссылке:

**anki-carnet-imágenes.zip**

Ссылка указана в README: https://github.com/donmerendolo/anki-carnet-conducir

После распаковки структура:
```
images/
  ├── A1/
  │   ├── 1234.jpg
  │   ├── 5678.jpg
  │   └── ...
  ├── B/
  │   ├── 6288.jpg
  │   ├── 10977.JPG
  │   └── ...
  └── D/
      ├── 9876.jpg
      └── ...
```

## 📤 Шаг 2: Создать bucket в Supabase

1. Открой **Supabase Dashboard** → **Storage**
   https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/storage

2. Создай новый bucket:
   - Имя: `dgt-images`
   - Public: ✅ (чтобы изображения были доступны)

3. Примени SQL для настройки политик:

```sql
-- Создаём публичный bucket для DGT изображений
INSERT INTO storage.buckets (id, name, public)
VALUES ('dgt-images', 'dgt-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Разрешаем всем читать изображения
CREATE POLICY "Public Access for DGT images"
ON storage.objects FOR SELECT
USING (bucket_id = 'dgt-images');

-- Разрешаем аутентифицированным пользователям загружать
CREATE POLICY "Authenticated users can upload DGT images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dgt-images' AND auth.role() = 'authenticated');
```

## 📁 Шаг 3: Загрузить изображения

### Вариант А: Через UI (для небольших количеств)

1. В Supabase Dashboard → Storage → `dgt-images`
2. Создай папки: `A1`, `B`, `D`
3. Загрузи изображения в соответствующие папки

### Вариант Б: Через скрипт (рекомендуется)

Создай скрипт `upload-dgt-images.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function uploadImages(category, imagesPath) {
  const files = fs.readdirSync(imagesPath);
  
  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/)) continue;
    
    const filePath = path.join(imagesPath, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from('dgt-images')
      .upload(`${category}/${file}`, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`✅ Uploaded: ${category}/${file}`);
    }
  }
}

async function main() {
  await uploadImages('A1', './images/A1');
  await uploadImages('B', './images/B');
  await uploadImages('D', './images/D');
}

main();
```

Запуск:
```bash
node upload-dgt-images.js
```

## 🔧 Шаг 4: Обновить функцию получения изображений

После загрузки изображения будут доступны по URL:
```
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/dgt-images/B/6288.jpg
```

Код уже настроен использовать `image_filename` из базы!

## ✅ Результат

После загрузки изображения будут:
- 📸 Отображаться в тестах
- 🔍 Увеличиваться по клику
- 📱 Работать на всех устройствах

---

## 📝 Примечание

Если не хочешь загружать изображения, тесты **всё равно работают** без них. Вопросы и AI подсказки доступны в полном объёме.

