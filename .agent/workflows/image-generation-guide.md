# 🎨 Система Генерации Изображений DGT

## 🏆 Стиль: Премиум 3D Изометрический

На основе анализа оригинальных изображений создана система генерации в едином стиле:

### ✅ Ключевые Характеристики:

**Перспектива:**
- 3D изо метрический вид сверху (bird's eye view)
- Угол: 45-60 градусов
- Чёткая видимость всех элементов

**Транспорт:**
- Современные европейские автомобили
- Цвета: оранжевый (#FF8C00), белый, синий
- Реалистичные 3D модели
- Правильные пропорции

**Дорога:**
- Асфальт: серый (#404040)
- Разметка DGT:
  * Жёлтая сплошная (центр): #FFD700
  * Белая прерывистая (полосы): #FFFFFF
  * Стрелки траектории: оранжевые

**Окружение:**
- Зелёная трава: #228B22
- Реалистичные деревья (сосны, оливы)
- Голубое небо: #87CEEB
- Мягкие тени

**Знаки DGT:**
- Точные испанские стандарты
- Правильные формы и цвета
- Читаемые символы

---

## 📚 Библиотека Знаков DGT

Создана полная библиотека официальных испанских знаков:

### Предупреждающие (треугольники):
- **P-1**: Перекрёсток с приоритетом
- **P-4**: Круговое движение  
- **P-7**: Ж/д переезд с шлагбаумом
- **P-10/P-11**: Опасный поворот
- **P-16**: Дорожные работы
- **P-19**: Пешеходный переход

### Запрещающие (круги красные):
- **R-1**: STOP (восьмиугольник)
- **R-2**: Уступи дорогу (перевёрнутый треугольник)
- **R-100**: Въезд запрещён
- **R-104**: Запрет мотоциклов

### Обязательные (круги синие):
- **R-400**: Обязательное направление
- **R-403**: Обязательное круговое движение

---

## 💰 Сравнение Сервисов:

| Сервис | Цена за изображение | Качество | Контроль стиля |
|--------|---------------------|----------|----------------|
| DALL-E 3 | $0.04 | ⭐⭐⭐⭐⭐ | Средний |
| **Banana.dev** | **$0.008** | **⭐⭐⭐⭐** | **Высокий** |
| Midjourney | $0.02-0.04 | ⭐⭐⭐⭐⭐ | Высокий |

**Для 2000 вопросов:**
- DALL-E 3: **$80**
- **Banana.dev: $16** ← Рекомендуем
- Midjourney: $40-80

---

## 🚀 Использование:

### 1. Тестовая генерация (5 изображений):

```bash
node scripts/generate-images-banana.js data/topic-01.json --limit=5
```

### 2. Полная генерация для темы:

```bash
node scripts/generate-images-banana.js data/topic-01.json
```

### 3. Регенерация всех (даже существующих):

```bash
node scripts/generate-images-banana.js data/topic-01.json --all
```

---

## 📋 Примеры Промптов:

### Сцена 1: Обгон на дороге
```
Professional 3D isometric top-down view of Spanish DGT driving test scenario.

SCENE: Two-lane highway with orange car overtaking white car. 
Curved orange trajectory arrow showing overtaking path.
Yellow continuous center line (no-passing zone).
Clear lane markings.

SIGNS: P-10 (dangerous right curve) visible ahead.

ENVIRONMENT: Green grass verges, pine trees, clear sky.
```

### Сцена 2: Круговое движение
```
Professional 3D isometric top-down view.

SCENE: Roundabout intersection with three entry roads.
Orange car entering roundabout, white car already circulating.
Orange trajectory arrows showing proper entry and exit.

SIGNS: P-4 (roundabout warning), R-2 (yield) at entry.

ENVIRONMENT: Central island with grass and trees.
```

### Сцена 3: Ж/д переезд
```
Professional 3D isometric top-down view.

SCENE: Railroad crossing with barrier arms down.
Orange car stopped before crossing, white car waiting behind.
Train approaching visible in background.
Railroad tracks crossing road at 90 degrees.

SIGNS: P-7 (railroad crossing with barriers), flashing lights.

ENVIRONMENT: Rural setting, trees along tracks.
```

---

## 🎯 Интеллектуальный Анализ Вопросов:

Скрипт автоматически анализирует текст вопроса и определяет:

### Транспорт:
- турismo → car
- motocicleta → motorcycle  
- camión → truck
- bicicleta → bicycle

### Ситуация:
- adelantar → overtaking scene
- incorporar → merging scene
- prioridad → priority conflict
- rotonda → roundabout

### Знаки:
- "paso a nivel" → добавляет P-7
- "curva" → добавляет P-10/P-11
- "STOP" → добавляет R-1

**Результат:** Правильная сцена автоматически!

---

## ⚙️ Настройки `.env.local`:

```bash
# Banana.dev API
BANANA_API_KEY=your_api_key_here
BANANA_MODEL_KEY=flux  # или sdxl, stable-diffusion

# Опционально (если используешь DALL-E)
OPENAI_API_KEY=your_openai_key
```

---

## 📊 Рабочий Process:

### Рекомендуемый workflow для 2000 вопросов:

```bash
# 1. Сначала тест (5 изображений)
node scripts/generate-images-banana.js data/topic-01.json --limit=5

# 2. Проверь качество результата
ls -la data/generated-images/

# 3. Если всё OK - генерируй всю тему
node scripts/generate-images-banana.js data/topic-01.json

# 4. Загрузи в Supabase Storage
node scripts/upload-images-golden.js data/topic-01.json

# 5. Импортируй в БД
node scripts/import-golden.js data/topic-01.json --yes
```

---

## 🛡️ Гарантия Качества:

### Автоматические проверки:

✅ **Перспектива**: Изометрический топ-даун  
✅ **Знаки**: Точные испанские стандарты DGT  
✅ **Разметка**: Жёлтые/белые линии по коду  
✅ **Цвета**: Единая палитра (#FF8C00, #FFFFFF, #4169E1)  
✅ **Стиль**: Образовательный, чистый, профессиональный

### Negative Prompt (исключаем):
❌ Мультяшный стиль  
❌ Текст на изображении  
❌ Американские автомобили  
❌ Левостороннее движение  
❌ Ночные/дождливые сцены  
❌ Размытие, артефакты

---

## 💡 Советы:

1. **Начни с 5-10 изображений** для проверки стиля
2. **Проверь знаки вручную** на первой партии
3. **Донастрой промпт** если нужно (в `generate-images-banana.js`)
4. **Используй батчами** (по 50-100 изображений)
5. **Храни промпты** (автоматически сохраняются в JSON)

---

## 🔄 Интеграция в Конвейер:

Добавь опциональный этап генерации в `pipeline.js`:

```javascript
// Опция A: Оригинальные изображения
node scripts/pipeline.js data/topic-01.json --auto

// Опция B: С генерацией через Banana
node scripts/generate-images-banana.js data/topic-01.json
node scripts/pipeline.js data/topic-01.json --auto
```

---

## 📈 Экономия:

**Для 2000 вопросов:**

| Вариант | Стоимость | Качество | Время |
|---------|-----------|----------|-------|
| Только оригинальные | $0 | 🌟🌟🌟🌟 | 0 |
| Banana (500 важных) | **$4** | 🌟🌟🌟🌟🌟 | ~50 мин |
| Banana (все 2000) | **$16** | 🌟🌟🌟🌟🌟 | ~3 часа |
| DALL-E (все 2000) | $80 | 🌟🌟🌟🌟🌟 | ~6 часов |

**Рекомендация: Banana для ключевых вопросов = $4-8**
