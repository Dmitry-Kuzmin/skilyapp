import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../data/gemini3_response.json');
const outputPath = path.join(__dirname, '../data/gemini3_pro_result.jpeg');

try {
    const rawData = fs.readFileSync(jsonPath);
    const data = JSON.parse(rawData);

    if (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].inlineData &&
        data.candidates[0].content.parts[0].inlineData.data) {

        const base64Data = data.candidates[0].content.parts[0].inlineData.data;
        const buffer = Buffer.from(base64Data, 'base64');

        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Изображение успешно извлечено и сохранено в: ${outputPath}`);
    } else {
        console.error('❌ Не удалось найти данные изображения в JSON.');
        console.log('Структура JSON:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    }

} catch (error) {
    console.error('❌ Ошибка при обработке файла:', error.message);
}
