/**
 * Автоматическая генерация RSS и News Sitemap из данных статей
 * Запуск: deno run --allow-read --allow-write scripts/generate-sitemaps.ts
 * или: npm run generate-sitemaps (если добавить в package.json)
 */

import { articles } from "../src/pages/Article.tsx";

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  author: string;
}

// Форматирование даты для RSS (RFC 822)
function formatRSSDate(date: string): string {
  const d = new Date(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} +0100`;
}

// Форматирование даты для News Sitemap (ISO 8601)
function formatNewsDate(date: string): string {
  const d = new Date(date);
  return d.toISOString().replace('Z', '+01:00');
}

// Генерация RSS Feed
function generateRSS(articles: Record<string, ArticleData>): string {
  const now = new Date();
  const buildDate = formatRSSDate(now.toISOString().split('T')[0]);
  
  const items = Object.values(articles)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
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
function generateNewsSitemap(articles: Record<string, ArticleData>): string {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  // Только статьи младше 2 дней для Google News
  const recentArticles = Object.values(articles)
    .filter(article => {
      const pubDate = new Date(article.publishedAt);
      return pubDate >= twoDaysAgo;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

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

// Генерация основного Sitemap с блогом
function generateMainSitemap(articles: Record<string, ArticleData>): string {
  const blogUrls = Object.values(articles).map(article => 
    `  <url>
    <loc>https://skilyapp.com/blog/${article.slug}</loc>
    <lastmod>${article.publishedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
  ).join('\n\n');

  return `  <!-- Блог -->
  <url>
    <loc>https://skilyapp.com/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
${blogUrls}
  
  <!-- RSS Feed -->
  <url>
    <loc>https://skilyapp.com/rss.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
}

// Извлечение ключевых слов из текста
function extractKeywords(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const commonWords = ['как', 'для', 'что', 'это', 'или', 'и', 'в', 'на', 'с', 'по', 'к', 'от', 'до', 'из', 'за', 'под', 'над', 'при', 'про', 'без', 'через', 'между', 'среди', 'около', 'вокруг', 'перед', 'после', 'во', 'со', 'об', 'обо', 'об', 'обо', 'об', 'обо'];
  const words = text.split(/\s+/).filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  const uniqueWords = [...new Set(words)].slice(0, 10);
  return uniqueWords.join(',');
}

// Экранирование XML
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Главная функция
async function main() {
  try {
    console.log('📝 Генерация RSS и News Sitemap...');
    
    // Импортируем статьи (в реальности нужно будет адаптировать под структуру проекта)
    // Для Deno нужно будет использовать другой способ импорта
    
    // Генерируем файлы
    const rss = generateRSS(articles);
    const newsSitemap = generateNewsSitemap(articles);
    const mainSitemapBlog = generateMainSitemap(articles);
    
    // Записываем файлы
    await Deno.writeTextFile('public/rss.xml', rss);
    await Deno.writeTextFile('public/news-sitemap.xml', newsSitemap);
    
    console.log('✅ RSS feed сгенерирован: public/rss.xml');
    console.log('✅ News Sitemap сгенерирован: public/news-sitemap.xml');
    console.log('\n📋 Добавьте следующий блок в public/sitemap.xml:');
    console.log(mainSitemapBlog);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    Deno.exit(1);
  }
}

// Запуск (для Node.js нужно будет адаптировать)
if (import.meta.main) {
  main();
}

