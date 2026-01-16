import fs from 'fs/promises';
import path from 'path';

/**
 * Скрипт для массового исправления номера темы в файлах и именах.
 * Запуск: node scripts/fix-topic-number.js <путь_к_папке> <правильный_номер>
 */

async function fixTopic() {
    const dirPath = process.argv[2];
    const correctTopic = process.argv[3];

    if (!dirPath || !correctTopic) {
        console.log("Использование: node scripts/fix-topic-number.js <путь_к_папке> <номер_темы>");
        return;
    }

    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
        const oldPath = path.join(dirPath, file);

        // 1. Читаем и правим контент
        const data = JSON.parse(await fs.readFile(oldPath, 'utf8'));
        const updatedData = data.map(q => ({
            ...q,
            topic_number: parseInt(correctTopic)
        }));

        // 2. Генерируем новое имя файла и чистим от суффиксов типа -2, -3
        let cleanFileName = file.replace(/-[0-9]+\.json$/, '.json'); // Убираем -2.json
        const newFileName = cleanFileName.replace(/topic-\d+/, `topic-${correctTopic.padStart(2, '0')}`);
        const newPath = path.join(dirPath, newFileName);

        // 3. Сохраняем и удаляем старое (если имя изменилось)
        await fs.writeFile(newPath, JSON.stringify(updatedData, null, 2));
        if (oldPath !== newPath) {
            await fs.unlink(oldPath);
        }

        console.log(`✅ Исправлен: ${file} -> ${newFileName}`);
    }
}

fixTopic().catch(console.error);
