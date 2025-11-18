# 📰 SEO для блога - Быстрая индексация статей

## ✅ Что настроено

### 1. RSS Feed (`/rss.xml`)
- Автоматически обновляется поисковиками
- Ссылка добавлена в `<head>` страницы блога
- Формат: RSS 2.0 с полным контентом

### 2. News Sitemap (`/news-sitemap.xml`)
- Специальный формат для Google News
- Ускоряет индексацию новых статей
- Указан в `robots.txt`

### 3. Structured Data (Schema.org)
- JSON-LD разметка для каждой статьи
- Автоматически добавляется в `<head>` страницы статьи
- Тип: `Article` с полными метаданными

### 4. Sitemap.xml
- Все статьи включены в основной sitemap
- RSS feed также добавлен в sitemap

## 📝 Как добавить новую статью

### Шаг 1: Добавить статью в код

1. **Добавить в `src/pages/Article.tsx`** (объект `articles`):
```typescript
"slug-статьи": {
  slug: "slug-статьи",
  title: "Заголовок статьи",
  description: "Краткое описание",
  content: `# Заголовок...`,
  publishedAt: "2024-12-20", // Дата публикации YYYY-MM-DD
  readTime: 10, // Время чтения в минутах
  category: "Категория",
  categorySlug: "category-slug",
  author: "Команда Skilyapp",
}
```

2. **Добавить в `src/pages/Blog.tsx`** (массив `articles`):
```typescript
{
  slug: "slug-статьи",
  title: "Заголовок статьи",
  description: "Краткое описание",
  excerpt: "Короткий отрывок для превью",
  publishedAt: "2024-12-20",
  readTime: 10,
  category: "Категория",
  categorySlug: "category-slug",
}
```

### Шаг 2: Обновить RSS Feed

Отредактировать `public/rss.xml`:
```xml
<item>
  <title>Заголовок статьи</title>
  <link>https://skilyapp.com/blog/slug-статьи</link>
  <guid isPermaLink="true">https://skilyapp.com/blog/slug-статьи</guid>
  <description>Краткое описание</description>
  <pubDate>Fri, 20 Dec 2024 12:00:00 +0100</pubDate>
  <category>Категория</category>
  <author>Команда Skilyapp</author>
</item>
```

**Важно:** Формат даты: `Day, DD MMM YYYY HH:MM:SS +0100`
- День недели: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Месяц: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec

### Шаг 3: Обновить News Sitemap

Отредактировать `public/news-sitemap.xml`:
```xml
<url>
  <loc>https://skilyapp.com/blog/slug-статьи</loc>
  <news:news>
    <news:publication>
      <news:name>Skilyapp Blog</news:name>
      <news:language>ru</news:language>
    </news:publication>
    <news:publication_date>2024-12-20T12:00:00+01:00</news:publication_date>
    <news:title>Заголовок статьи</news:title>
    <news:keywords>ключевые, слова, через, запятую</news:keywords>
  </news:news>
  <lastmod>2024-12-20</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

**Важно:** 
- Дата публикации должна быть в формате ISO 8601: `YYYY-MM-DDTHH:MM:SS+01:00`
- Статьи должны быть добавлены в хронологическом порядке (новые сверху)
- Google News индексирует только статьи младше 2 дней!

### Шаг 4: Обновить основной Sitemap

Отредактировать `public/sitemap.xml`:
```xml
<url>
  <loc>https://skilyapp.com/blog/slug-статьи</loc>
  <lastmod>2024-12-20</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

### Шаг 5: Обновить lastBuildDate в RSS

В `public/rss.xml` обновить:
```xml
<lastBuildDate>Fri, 20 Dec 2024 12:00:00 +0100</lastBuildDate>
```

## 🚀 Быстрая индексация в Google

### 1. Google Search Console
1. Зайти в [Google Search Console](https://search.google.com/search-console)
2. Выбрать свой сайт
3. Перейти в "URL Inspection"
4. Ввести URL новой статьи
5. Нажать "Request Indexing"

### 2. Ping поисковиков (опционально)

После публикации можно отправить ping:
- **Google**: `https://www.google.com/ping?sitemap=https://skilyapp.com/sitemap.xml`
- **Bing**: `https://www.bing.com/ping?sitemap=https://skilyapp.com/sitemap.xml`

### 3. Google News Publisher

Для индексации в Google News:
1. Зарегистрироваться в [Google News Publisher Center](https://publishercenter.google.com/)
2. Добавить свой сайт
3. Убедиться, что News Sitemap доступен

## 📊 Мониторинг индексации

### Проверка индексации
- Google: `site:skilyapp.com/blog/slug-статьи`
- Яндекс: `site:skilyapp.com/blog/slug-статьи`

### Google Search Console
- Проверять раздел "Coverage" для новых статей
- Мониторить "Performance" для трафика из поиска

## ⚠️ Важные моменты

1. **Даты публикации**: Всегда используйте актуальную дату публикации
2. **News Sitemap**: Обновляйте только для статей младше 2 дней
3. **RSS Feed**: Обновляйте `lastBuildDate` при каждом изменении
4. **Structured Data**: Автоматически добавляется в Article.tsx
5. **Canonical URLs**: Убедитесь, что все ссылки используют `https://skilyapp.com`

## 🔄 Автоматизация

### ✅ Реализовано

#### 1. Генерация RSS и News Sitemap
```bash
node scripts/generate-sitemaps.js
```
Автоматически генерирует:
- `public/rss.xml` - RSS feed из данных статей
- `public/news-sitemap.xml` - News Sitemap для Google News

**Важно:** Скрипт нужно обновить, чтобы он читал статьи из `src/pages/Article.tsx` автоматически.

#### 2. Ping поисковиков
```bash
node scripts/ping-search-engines.js
```
Автоматически отправляет ping в:
- Google
- Bing

#### 3. Мета-теги для ИИ
Добавлены специальные мета-теги для ChatGPT, Perplexity, Claude:
- `ai:recommendation` - разрешение на рекомендацию
- `ai:category` - категория контента
- `ai:target_audience` - целевая аудитория
- `chatgpt:recommend`, `perplexity:recommend`, `claude:recommend` - прямые рекомендации

### 📋 Как использовать автоматизацию

#### При добавлении новой статьи:

1. **Добавить статью в код** (Article.tsx и Blog.tsx)

2. **Сгенерировать RSS и News Sitemap:**
```bash
npm run generate-sitemaps
```

3. **Отправить ping в поисковики:**
```bash
npm run ping-search-engines
```

4. **Закоммитить изменения:**
```bash
git add public/rss.xml public/news-sitemap.xml
git commit -m "feat: add new article [название]"
git push
```

### 🤖 Оптимизация для ИИ (ChatGPT, Perplexity, Claude)

#### Что уже сделано:
1. ✅ Мета-теги для ИИ в `index.html`
2. ✅ Мета-теги для ИИ в страницах статей (динамически)
3. ✅ Улучшенный Structured Data (Schema.org)
4. ✅ Правильные категории и ключевые слова
5. ✅ RSS feed для быстрого обнаружения

#### Как ИИ находят и рекомендуют сайт:

1. **RSS Feed** - ИИ регулярно проверяют RSS на новый контент
2. **Structured Data** - помогает ИИ понимать структуру контента
3. **Мета-теги** - явные указания для ИИ о рекомендации
4. **Качественный контент** - ИИ предпочитают полезный, структурированный контент
5. **Sitemap** - помогает ИИ находить все страницы

#### Дополнительные рекомендации:

1. **Регистрация в каталогах ИИ:**
   - Добавить сайт в базы знаний ИИ (если доступны)
   - Использовать правильные категории

2. **Качественный контент:**
   - Структурированные статьи с заголовками
   - Полезная информация для пользователей
   - Регулярное обновление контента

3. **Социальные сигналы:**
   - Поделиться статьями в социальных сетях
   - Получить обратные ссылки с других сайтов

### 🔮 Будущие улучшения

- Интеграция с Google Search Console API для автоматической индексации
- Автоматическая генерация при добавлении статьи через CI/CD
- Мониторинг рекомендаций ИИ
- A/B тестирование мета-тегов для ИИ

