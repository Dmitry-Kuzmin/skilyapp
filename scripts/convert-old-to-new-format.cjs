const fs = require('fs');

const files = [
    'data/parsed/topic-01/topic-01_test-001-enriched.json',
    'data/parsed/topic-01/topic-01_test-002-enriched.json',
    'data/parsed/topic-02/topic-02_test-001-enriched.json',
    'data/parsed/topic-02/topic-02_test-002.json'
];

function convertOldToNewFormat(text, lang) {
    if (!text) return text;

    // Already in new format?
    if (lang === 'ru' && /🧠.*Логика.*Почему/.test(text)) return text;
    if (lang === 'es' && /🧠.*La Lógica/.test(text)) return text;
    if (lang === 'en' && /🧠.*The Logic/.test(text)) return text;

    // Old format patterns
    const oldPatterns = {
        ru: {
            logic: /1️⃣\s*\*\*🎓\s*Правило\*\*\s*/i,
            comparison: /2️⃣\s*\*\*🇷🇺\s*Сравнение с РФ\*\*\s*/i,
            tip: /3️⃣\s*\*\*💡\s*Шпаргалка\*\*\s*/i
        }
    };

    if (lang === 'ru') {
        // Extract sections
        const parts = text.split(/(?=\d️⃣)/);
        let logic = '';
        let trap = '';

        parts.forEach(part => {
            if (/1️⃣.*Правило/.test(part)) {
                logic = part.replace(/1️⃣\s*\*\*🎓\s*Правило\*\*\s*\n?/, '').trim();
            } else if (/3️⃣.*Шпаргалка/.test(part)) {
                trap = part.replace(/3️⃣\s*\*\*💡\s*Шпаргалка\*\*\s*\n?/, '').trim();
            }
        });

        if (logic || trap) {
            return `🧠 **Логика "Почему"**:\n${logic || text}\n\n💣 **Ловушка / Трюк**:\n${trap || 'Будьте внимательны к деталям вопроса.'}`;
        }
    }

    // If can't convert, return original
    return text;
}

console.log('🔄 Converting old format to new format...\n');

let totalConverted = 0;

files.forEach(filePath => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileConverted = 0;

    data.forEach(q => {
        const ruExpl = q.explanation.ru || '';
        const isNewFormat = /🧠.*Логика.*Почему/.test(ruExpl) && /💣.*Ловушка/.test(ruExpl);

        if (!isNewFormat && ruExpl.length > 0) {
            // Convert RU
            const newRu = convertOldToNewFormat(ruExpl, 'ru');
            if (newRu !== ruExpl) {
                q.explanation.ru = newRu;
                fileConverted++;
                console.log(`  ✅ Q${q.question_number}: Converted`);
            }
        }
    });

    if (fileConverted > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`\n📂 ${filePath}: Converted ${fileConverted} questions\n`);
        totalConverted += fileConverted;
    }
});

console.log(`\n✨ Total converted: ${totalConverted} questions`);
