/**
 * Утилита для чтения статей из Article.tsx
 * Извлекает данные статей для использования в скриптах
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function extractArticlesFromTSX() {
  const articlePath = path.join(__dirname, "..", "src", "pages", "Article.tsx");
  const content = fs.readFileSync(articlePath, 'utf8');
  
  // Ищем объект articles
  const articlesMatch = content.match(/const articles:\s*Record<string,\s*ArticleData>\s*=\s*\{([\s\S]*?)\};/);
  
  if (!articlesMatch) {
    console.warn('⚠️  Не удалось найти объект articles в Article.tsx');
    return {};
  }
  
  const articlesContent = articlesMatch[1];
  const articles = {};
  
  // Парсим каждую статью (упрощенный парсер)
  const articleRegex = /"([^"]+)":\s*\{([\s\S]*?)\}(?=,\s*"|$)/g;
  let match;
  
  while ((match = articleRegex.exec(articlesContent)) !== null) {
    const slug = match[1];
    const articleData = match[2];
    
    // Извлекаем поля
    const titleMatch = articleData.match(/title:\s*"([^"]+)"/);
    const descMatch = articleData.match(/description:\s*"([^"]+)"/);
    const categoryMatch = articleData.match(/category:\s*"([^"]+)"/);
    const authorMatch = articleData.match(/author:\s*"([^"]+)"/);
    const dateMatch = articleData.match(/publishedAt:\s*"([^"]+)"/);
    
    if (titleMatch && descMatch && categoryMatch && authorMatch && dateMatch) {
      articles[slug] = {
        slug,
        title: titleMatch[1],
        description: descMatch[1],
        category: categoryMatch[1],
        author: authorMatch[1],
        publishedAt: dateMatch[1],
      };
    }
  }
  
  return articles;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const articles = extractArticlesFromTSX();
  console.log(JSON.stringify(articles, null, 2));
}

