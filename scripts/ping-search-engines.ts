/**
 * Автоматический ping поисковиков при публикации новой статьи
 * Запуск: deno run --allow-net scripts/ping-search-engines.ts
 */

const SITE_URL = 'https://skilyapp.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const NEWS_SITEMAP_URL = `${SITE_URL}/news-sitemap.xml`;

interface PingResult {
  engine: string;
  success: boolean;
  message: string;
}

// Ping Google
async function pingGoogle(): Promise<PingResult> {
  try {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      return {
        engine: 'Google',
        success: true,
        message: 'Sitemap успешно отправлен в Google'
      };
    } else {
      return {
        engine: 'Google',
        success: false,
        message: `Ошибка: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      engine: 'Google',
      success: false,
      message: `Ошибка: ${error.message}`
    };
  }
}

// Ping Bing
async function pingBing(): Promise<PingResult> {
  try {
    const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      return {
        engine: 'Bing',
        success: true,
        message: 'Sitemap успешно отправлен в Bing'
      };
    } else {
      return {
        engine: 'Bing',
        success: false,
        message: `Ошибка: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      engine: 'Bing',
      success: false,
      message: `Ошибка: ${error.message}`
    };
  }
}

// Ping Yandex
async function pingYandex(): Promise<PingResult> {
  try {
    const url = `https://webmaster.yandex.ru/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      return {
        engine: 'Yandex',
        success: true,
        message: 'Sitemap успешно отправлен в Yandex'
      };
    } else {
      return {
        engine: 'Yandex',
        success: false,
        message: `Ошибка: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      engine: 'Yandex',
      success: false,
      message: `Ошибка: ${error.message}`
    };
  }
}

// Главная функция
async function main() {
  console.log('🚀 Отправка ping в поисковики...\n');
  
  const results: PingResult[] = [];
  
  // Ping всех поисковиков параллельно
  const [google, bing, yandex] = await Promise.all([
    pingGoogle(),
    pingBing(),
    pingYandex()
  ]);
  
  results.push(google, bing, yandex);
  
  // Выводим результаты
  console.log('📊 Результаты:\n');
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.engine}: ${result.message}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Успешно: ${successCount}/${results.length}`);
}

// Запуск
if (import.meta.main) {
  main();
}

