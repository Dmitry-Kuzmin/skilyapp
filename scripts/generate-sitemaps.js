/**
 * Автоматическая генерация RSS и News Sitemap из данных статей
 * Запуск: node scripts/generate-sitemaps.js
 */

const fs = require('fs');
const path = require('path');
const { extractArticlesFromTSX } = require('./read-articles');

// Автоматически извлекаем статьи из Article.tsx
let articles;
try {
  articles = extractArticlesFromTSX();
  if (Object.keys(articles).length === 0) {
    console.warn('⚠️  Не удалось извлечь статьи, используем fallback');
    // Fallback на статический список
    articles = {
      "kak-sdat-ekzamen-dgt-s-pervogo-raza": {
        slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
        title: "Как сдать экзамен DGT с первого раза",
        description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
        category: "Подготовка",
        author: "Команда Skilyapp",
        publishedAt: "2024-12-19",
      },
      "top-10-oshibok-na-ekzamene-dgt": {
        slug: "top-10-oshibok-na-ekzamene-dgt",
        title: "Топ-10 ошибок на экзамене DGT",
        description: "Самые распространенные ошибки при подготовке и сдаче экзамена DGT. Узнайте, как их избежать и увеличить свои шансы на успех.",
        category: "Советы",
        author: "Команда Skilyapp",
        publishedAt: "2024-12-19",
      },
    };
  }
} catch (error) {
  console.error('❌ Ошибка при чтении статей:', error.message);
  process.exit(1);
}

// Форматирование даты для RSS (RFC 822)
function formatRSSDate(dateString) {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = days[date.getUTCDay()];
  const dayNum = String(date.getUTCDate()).padStart(2, '0');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0100`;
}

// Форматирование даты для News Sitemap (ISO 8601)
function formatNewsDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().replace('Z', '+01:00');
}

// Экранирование XML
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Извлечение ключевых слов
function extractKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const commonWords = ['как', 'для', 'что', 'это', 'или', 'и', 'в', 'на', 'с', 'по'];
  const words = text.split(/\s+/).filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  const uniqueWords = [...new Set(words)].slice(0, 10);
  return uniqueWords.join(',');
}

// Генерация RSS Feed
function generateRSS(articles) {
  const now = new Date();
  const buildDate = formatRSSDate(now.toISOString().split('T')[0]);
  
  const items = Object.values(articles)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .map(article => {
      const pubDate = formatRSSDate(article.publishedAt);
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>https://skilyapp.com/blog/${article.slug}</link>
      <guid isPermaLink="true">https://skilyapp.com/blog/${article.slug}</guid>
      <description>${escapeXml(article.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(article.category)}</category>
      <author>${escapeXml(article.author)}</author>
    </item>`;
    }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Skilyapp Blog - Подготовка к экзамену DGT</title>
    <link>https://skilyapp.com/blog</link>
    <description>Полезные статьи о подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.</description>
    <language>ru-RU</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="https://skilyapp.com/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://skilyapp.com/og-image.png</url>
      <title>Skilyapp Blog</title>
      <link>https://skilyapp.com/blog</link>
    </image>
    
${items}
  </channel>
</rss>`;
}

// Генерация News Sitemap
function generateNewsSitemap(articles) {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  const recentArticles = Object.values(articles)
    .filter(article => {
      const pubDate = new Date(article.publishedAt);
      return pubDate >= twoDaysAgo;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const urls = recentArticles.map(article => {
    const pubDate = formatNewsDate(article.publishedAt);
    const keywords = extractKeywords(article.title, article.description);
    
    return `  <url>
    <loc>https://skilyapp.com/blog/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Skilyapp Blog</news:name>
        <news:language>ru</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      <news:keywords>${keywords}</news:keywords>
    </news:news>
    <lastmod>${article.publishedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
}

// Главная функция
function main() {
  try {
    console.log('📝 Генерация RSS и News Sitemap...\n');
    
    const rss = generateRSS(articles);
    const newsSitemap = generateNewsSitemap(articles);
    
    const publicDir = path.join(__dirname, '..', 'public');
    
    fs.writeFileSync(path.join(publicDir, 'rss.xml'), rss, 'utf8');
    fs.writeFileSync(path.join(publicDir, 'news-sitemap.xml'), newsSitemap, 'utf8');
    
    console.log('✅ RSS feed сгенерирован: public/rss.xml');
    console.log('✅ News Sitemap сгенерирован: public/news-sitemap.xml');
    console.log(`\n📊 Обработано статей: ${Object.keys(articles).length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();

