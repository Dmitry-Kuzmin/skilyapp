// Скрипт для отладки: проверяем, что возвращает usePDDTopics
// Вставь это в консоль браузера на странице /topics

// Вызываем напрямую стратегию
const { getPDDStrategy } = await import('./src/core/pdd/index.ts');
const strategy = getPDDStrategy('russia');
const topics = await strategy.getTopicsWithCounts('russia');
console.log('Темы из стратегии:', topics);
console.table(topics);
