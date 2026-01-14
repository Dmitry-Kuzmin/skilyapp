
const fs = require('fs');

const filePath = 'data/parsed/topic-02/topic-02_test-002.json';
const rawData = fs.readFileSync(filePath, 'utf8');
let questions = JSON.parse(rawData);

function cleanText(text, lang) {
    if (!text) return text;

    // 1. Убираем упоминания правильных ответов (букв) в начале
    // "La respuesta correcta es la A.", "Правильный ответ - B", etc.
    text = text.replace(/^(La respuesta correcta es la [ABC]\.?\s*)/i, '');
    text = text.replace(/^(The correct answer is [ABC]\.?\s*)/i, '');
    text = text.replace(/^(Правильный ответ[ -]*[ABC]\.?\s*)/i, '');

    // 2. Унифицируем заголовки Логики
    text = text.replace(/(\d+️⃣|\d+\.|###|\*\*)\s*([🧠]?)\s*(La Lógica|The Logic|Логика).+?(\n|:)/gi, "🧠 $3:\n");
    // Удаляем лишние "Por qué" / "Why" в вариациях, оставляем чистый заголовок
    // Но лучше просто переписать стандартный заголовок:
    if (lang === 'ru') text = text.replace(/.*🧠.*\n?/i, "🧠 **Логика \"Почему\"**:\n");
    if (lang === 'es') text = text.replace(/.*🧠.*\n?/i, "🧠 **La Lógica \"Por qué\"**:\n");
    if (lang === 'en') text = text.replace(/.*🧠.*\n?/i, "🧠 **The Logic \"Why\"**:\n");

    // 3. Унифицируем заголовки Ловушки
    text = text.replace(/(\d+️⃣|\d+\.|###|\*\*)\s*([💣]?)\s*(La Trampa|The Trap|The Trick|Ловушка).+?(\n|:)/gi, "\n\n💣 $3:\n");
    if (lang === 'ru') text = text.replace(/\n*.*💣.*\n?/i, "\n\n💣 **Ловушка / Трюк**:\n");
    if (lang === 'es') text = text.replace(/\n*.*💣.*\n?/i, "\n\n💣 **La Trampa / El Truco**:\n");
    if (lang === 'en') text = text.replace(/\n*.*💣.*\n?/i, "\n\n💣 **The Trap / The Trick**:\n");

    // 4. Чистим галлюцинации (кириллица в ES/EN) - очень осторожно
    if (lang === 'es' || lang === 'en') {
        // Простой поиск кириллицы
        // "завязанными" -> [cyrillic chars]
        // Но пока просто залогируем, чтобы не удалить что-то важное
        if (/[а-яА-ЯёЁ]/.test(text)) {
            console.warn(`WARNING: Cyrillic found in ${lang.toUpperCase()} text! Needs manual review:\n${text.substring(0, 50)}...`);
            // Specific fix for Question 4
            text = text.replace('завязанными', 'vendados');
            text = text.replace('обгон запрещен', 'adelantamiento prohibido');
        }
    }

    return text.trim();
}

let fixedCount = 0;
questions = questions.map((q, idx) => {
    // Explanation Check
    ['es', 'en', 'ru'].forEach(lang => {
        if (q.explanation && q.explanation[lang]) {
            const original = q.explanation[lang];
            const cleaned = cleanText(original, lang);
            if (original !== cleaned) {
                q.explanation[lang] = cleaned;
                fixedCount++;
                if (idx === 3) console.log(`Fixed Q4 (${lang}):\nFROM: ${original.substring(0, 60)}...\nTO:   ${cleaned.substring(0, 60)}...`);
            }
        }
    });
    return q;
});

fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
console.log(`\n✨ Polished complete! Modified ${fixedCount} explanation blocks in ${questions.length} questions.`);
