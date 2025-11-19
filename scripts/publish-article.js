/**
 * Автоматическая публикация статьи
 * Запускает генерацию sitemap и ping поисковиков
 * Использование: node scripts/publish-article.js [slug-статьи]
 */

import { execSync } from "child_process";

const articleSlug = process.argv[2];

console.log('🚀 Автоматическая публикация статьи...\n');

if (articleSlug) {
  console.log(`📝 Статья: ${articleSlug}\n`);
}

try {
  // Шаг 1: Генерация RSS и News Sitemap
  console.log('📝 Шаг 1: Генерация RSS и News Sitemap...');
  execSync('node scripts/generate-sitemaps.js', { stdio: 'inherit' });
  console.log('✅ RSS и News Sitemap сгенерированы\n');

  // Шаг 2: Ping поисковиков
  console.log('🔔 Шаг 2: Уведомление поисковиков...');
  execSync('node scripts/ping-search-engines.js', { stdio: 'inherit' });
  console.log('✅ Поисковики уведомлены\n');

  console.log('✨ Статья успешно опубликована!');
  console.log('\n📋 Следующие шаги:');
  console.log('1. Проверьте изменения: git status');
  console.log('2. Добавьте файлы: git add public/rss.xml public/news-sitemap.xml');
  console.log('3. Закоммитьте: git commit -m "feat: add article [название]"');
  console.log('4. Запушьте: git push');

} catch (error) {
  console.error('❌ Ошибка при публикации:', error.message);
  process.exit(1);
}

