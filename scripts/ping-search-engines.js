/**
 * Автоматический ping поисковиков при публикации новой статьи
 * Запуск: node scripts/ping-search-engines.js
 */

const https = require('https');

const SITE_URL = 'https://skilyapp.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const NEWS_SITEMAP_URL = `${SITE_URL}/news-sitemap.xml`;

// Ping поисковика
function ping(engine, url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({
            engine,
            success: true,
            message: 'Sitemap успешно отправлен'
          });
        } else {
          resolve({
            engine,
            success: false,
            message: `Ошибка: ${res.statusCode} ${res.statusMessage}`
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        engine,
        success: false,
        message: `Ошибка: ${error.message}`
      });
    });
  });
}

// Главная функция
async function main() {
  console.log('🚀 Отправка ping в поисковики...\n');
  
  const results = await Promise.all([
    ping('Google', `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`),
    ping('Bing', `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`),
  ]);
  
  console.log('📊 Результаты:\n');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.engine}: ${result.message}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Успешно: ${successCount}/${results.length}`);
}

main();

