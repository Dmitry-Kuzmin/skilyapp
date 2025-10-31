# 📊 Автоматическая синхронизация с Google Sheets

## ✅ Что настроено

### 1. Edge Function `sync-google-sheets`
- ✅ Создана и развернута
- ✅ Подключена к Google Sheets ID (хранится в секретах)
- ✅ Обрабатывает две вкладки: **Topics** и **Questions**
- ✅ Автоматически создает/обновляет данные в базе

### 2. Структура данных

#### Вкладка **Topics**
Столбцы в Google Sheets:
- `number` - Номер темы (1-10)
- `title_ru` - Название на русском
- `title_es` - Название на испанском
- `title_en` - Название на английском
- `cover_image` - URL изображения обложки
- `is_premium` - Премиум тема (TRUE/FALSE или ✔/✗)
- `gradient_from` - Начальный цвет градиента (#00BFFF)
- `gradient_to` - Конечный цвет градиента (#39FF14)

#### Вкладка **Questions**
Столбцы в Google Sheets (основные):
- `topic_number` - Номер темы (1-10)
- `difficulty` - Сложность (easy/medium/hard)
- `is_premium` - Премиум вопрос (TRUE/FALSE или ✔/✗)
- `type` - Тип вопроса (single/multiple)
- `image_url` - URL изображения к вопросу
- `sign_code` - Код дорожного знака (опционально)
- `source` - Источник (например, DGT)
- `question_ru`, `question_es`, `question_en` - Текст вопроса на 3 языках
- `answer_1_ru`, `answer_1_es`, `answer_1_en` - Первый вариант ответа
- `is_correct_1` - Правильный ли первый ответ (TRUE/FALSE или ✔/✗)
- `answer_2_ru`, `answer_2_es`, `answer_2_en` - Второй вариант ответа
- `is_correct_2` - Правильный ли второй ответ
- `answer_3_ru`, `answer_3_es`, `answer_3_en` - Третий вариант ответа
- `is_correct_3` - Правильный ли третий ответ
- `answer_4_ru`, `answer_4_es`, `answer_4_en` - Четвертый вариант ответа (опционально)
- `is_correct_4` - Правильный ли четвертый ответ
- `explanation_ru`, `explanation_es`, `explanation_en` - Объяснение на 3 языках
- `tags` - Теги через запятую (например: "Приоритет,Дорожные знаки")
- `notes` - Заметки (опционально)

### 3. Статус синхронизации

**Последняя синхронизация:** 31.10.2025 11:10:24 UTC
- ✅ Обработано тем: 11
- ✅ Обработано вопросов: 3
- ✅ Пропущено вопросов: 0

---

## 🔄 Как работает автоматическая синхронизация

⚠️ **ВАЖНО:** pg_cron расширение недоступно в текущем плане Supabase.
Для автоматической ежедневной синхронизации вам нужно:

### Вариант 1: Использовать внешний cron сервис
1. Зарегистрируйтесь на [cron-job.org](https://cron-job.org) или [EasyCron](https://www.easycron.com)
2. Создайте новое задание с URL:
   ```
   https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/sync-google-sheets
   ```
3. Установите расписание: каждый день в 03:00 UTC
4. Метод: POST
5. Сохраните задание

### Вариант 2: Ручная синхронизация
Чтобы запустить синхронизацию вручную, выполните в коде:
```typescript
const { data, error } = await supabase.functions.invoke('sync-google-sheets');
console.log(data); // Результат синхронизации
```

Или через curl:
```bash
curl -X POST https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/sync-google-sheets
```

### Вариант 3: Создать кнопку в админ-панели
Добавьте кнопку на страницу `/admin` для ручного запуска синхронизации.

---

## 📝 Как добавлять данные в Google Sheets

### Добавление новой темы
1. Откройте вкладку **Topics** в Google Sheets
2. Добавьте новую строку со следующими данными:
   ```
   number: 11
   title_ru: Новая тема
   title_es: Tema nueva
   title_en: New topic
   cover_image: https://example.com/image.jpg
   is_premium: FALSE (или TRUE)
   gradient_from: #00BFFF
   gradient_to: #39FF14
   ```
3. Запустите синхронизацию (см. выше)

### Добавление нового вопроса
1. Откройте вкладку **Questions** в Google Sheets
2. Добавьте новую строку:
   ```
   topic_number: 1
   difficulty: medium
   is_premium: ✗
   type: single
   image_url: signs/stop.jpg
   question_ru: Что означает этот знак?
   question_es: ¿Qué significa esta señal?
   question_en: What does this sign mean?
   answer_1_ru: Полная остановка
   answer_1_es: Parada completa
   answer_1_en: Full stop
   is_correct_1: ✔
   answer_2_ru: Уступить дорогу
   answer_2_es: Ceder el paso
   answer_2_en: Yield
   is_correct_2: ✗
   ...
   explanation_ru: Знак STOP требует полной остановки
   explanation_es: La señal STOP requiere parada completa
   explanation_en: STOP sign requires full stop
   tags: Приоритет,Дорожные знаки
   ```
3. Запустите синхронизацию

---

## 🎯 Советы по работе

1. **Используйте символы ✔ и ✗** вместо TRUE/FALSE - так нагляднее
2. **Теги пишите на английском** (с маленькой буквы), через запятую без пробелов
3. **Обязательные поля:** question_ru/es/en, хотя бы 2 варианта ответа
4. **Изображения:** загружайте в Supabase Storage или используйте CDN, вставляйте URL
5. **Для вопросов с несколькими правильными ответами** установите `type: multiple` и отметьте несколько `is_correct_X` как TRUE

---

## 🔧 Устранение проблем

### Вопросы не появляются в приложении
1. Проверьте, что синхронизация прошла успешно
2. Проверьте, что `topic_number` существует в таблице Topics
3. Проверьте обязательные поля: question_ru, question_es, question_en

### Темы не отображаются
1. Проверьте уникальность `number` для каждой темы
2. Убедитесь, что все обязательные поля заполнены

### Синхронизация завершается с ошибками
1. Проверьте формат данных в Google Sheets
2. Проверьте логи Edge Function в Supabase Dashboard
3. Убедитесь, что Google Sheets доступен по ссылке (публичный доступ)

---

## 📊 Текущий статус базы данных

После последней синхронизации:
- **Темы:** 11
- **Вопросы:** 3
- **Теги:** 10 (предзаполненные)

---

## 🔗 Полезные ссылки

- [Google Sheets](https://docs.google.com/spreadsheets/d/10TQX3YzteSx-nHFJZMnMejM167fqjAvz6hq-j7dZrUE/edit)
- [Edge Function Logs](https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions/sync-google-sheets/logs)
- [База данных Topics](https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/editor/topics)
- [База данных Questions](https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/editor/questions_new)
