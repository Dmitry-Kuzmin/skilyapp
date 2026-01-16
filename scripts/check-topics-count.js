/**
 * Скрипт для проверки количества вопросов по темам в БД
 * Запускать в браузере (консоль DevTools) когда открыто приложение
 */

async function checkTopicsCount() {
    try {
        // Получаем все вопросы России
        const { data: questions, error } = await window.supabase
            .from('questions_new')
            .select('metadata')
            .eq('country', 'ru');

        if (error) {
            console.error('Ошибка загрузки вопросов:', error);
            return;
        }

        console.log(`Всего вопросов: ${questions.length}`);

        // Группируем по темам
        const topicsMap = new Map();

        questions.forEach((q) => {
            const topics = q.metadata?.topics;
            if (topics && Array.isArray(topics)) {
                topics.forEach((topic) => {
                    const count = topicsMap.get(topic) || 0;
                    topicsMap.set(topic, count + 1);
                });
            }
        });

        // Преобразуем и сортируем
        const topicsArray = Array.from(topicsMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        console.log('Темы с количеством вопросов:');
        console.table(topicsArray);

        // Проверяем, есть ли темы с 40 вопросами
        const topics40 = topicsArray.filter(t => t.count === 40);
        if (topics40.length > 0) {
            console.warn('⚠️ Найдены темы ровно с 40 вопросами (возможно, захардкожено):');
            console.table(topics40);
        }

        return topicsArray;
    } catch (err) {
        console.error('Ошибка проверки тем:', err);
    }
}

// Запустить проверку
checkTopicsCount();
