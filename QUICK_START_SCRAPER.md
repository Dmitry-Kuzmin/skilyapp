# 🚀 Быстрый старт: Скрапер PracticaVial с Puppeteer

## Шаг 1: Убедитесь, что зависимости установлены

Зависимости уже должны быть установлены. Если нет, выполните:

```bash
npm install
```

## Шаг 2: Проверьте файл .env

Убедитесь, что файл `.env` в корне проекта содержит:

```env
VITE_SUPABASE_URL=ваш-supabase-url
VITE_SUPABASE_ANON_KEY=ваш-supabase-key
```

Или:

```env
SUPABASE_URL=ваш-supabase-url
SUPABASE_SERVICE_ROLE_KEY=ваш-service-role-key
```

## Шаг 3: Запустите скрапер

### Вариант А: Интерактивный режим (проще всего)

```bash
npm run scrape:practicavial
```

Скрипт попросит ввести логин и пароль.

### Вариант Б: С параметрами командной строки

```bash
npm run scrape:practicavial -- --username=ваш-email@example.com --password=ваш-пароль
```

### Вариант В: С видимым браузером (для отладки)

```bash
npm run scrape:practicavial -- --username=ваш-email@example.com --password=ваш-пароль --headless=false
```

### Вариант Г: Только определенные темы

```bash
npm run scrape:practicavial -- --username=ваш-email@example.com --password=ваш-пароль --topics=1,2,3
```

## Что произойдет:

1. ✅ Откроется браузер (в фоновом режиме или видимый)
2. ✅ Автоматически авторизуется на сайте PracticaVial
3. ✅ Загрузит список всех тем и тестов
4. ✅ Пройдет по каждому тесту и извлечет вопросы и ответы
5. ✅ Сохранит данные в базу данных Supabase
6. ✅ Создаст Excel файл `practicavial-scrape.xlsx` с результатами

## Результат:

- **В базе данных**: Все вопросы и ответы сохранены в таблицы `questions_new` и `answer_options`
- **Excel файл**: Файл `practicavial-scrape.xlsx` в корне проекта с двумя листами:
  - `Вопросы` - список всех вопросов
  - `Ответы` - список всех ответов

## Если что-то пошло не так:

1. **Ошибка авторизации**: Проверьте логин и пароль
2. **Не находит темы**: Запустите с `--headless=false` и посмотрите, что происходит в браузере
3. **Ошибка с базой данных**: Проверьте переменные окружения в `.env`

## Подробная документация:

См. файл `SCRAPER_PUPPETEER_README.md` для полной документации.











