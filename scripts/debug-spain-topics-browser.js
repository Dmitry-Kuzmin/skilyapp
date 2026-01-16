// Debug script для проверки работы стратегии Испании
// Вставь это в консоль браузера на странице /topics

// 1. Проверяем, что стратегия создана
const { getPDDStrategy } = await import('./src/core/pdd/index.ts');
const strategy = getPDDStrategy('spain');
console.log('Strategy for Spain:', strategy);

// 2. Вызываем getTopicsWithCounts напрямую  
const topics = await strategy.getTopicsWithCounts('spain');
console.log('Topics from strategy:', topics);
console.table(topics);

// 3. Проверяем, что метод существует
console.log('Has getTopicsWithCounts:', typeof strategy.getTopicsWithCounts);
console.log('Has getQuestionsByTopic:', typeof strategy.getQuestionsByTopic);
