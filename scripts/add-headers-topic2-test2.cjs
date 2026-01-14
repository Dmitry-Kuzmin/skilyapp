const fs = require('fs');

// Manually add headers to Topic 2, Test 2 questions that have content but no structure
const filePath = 'data/parsed/topic-02/topic-02_test-002.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const questionsToFix = [1, 19, 21, 23, 24, 26, 28, 29, 5, 10, 20, 22, 25, 27, 30];

let fixed = 0;

data.forEach(q => {
    if (!questionsToFix.includes(q.question_number)) return;

    // Check if already has new format
    if (/🧠.*Логика/.test(q.explanation.ru)) return;

    // Add headers to existing explanations
    ['es', 'en', 'ru'].forEach(lang => {
        let text = q.explanation[lang] || '';
        if (!text) return;

        // Split by paragraphs
        const paragraphs = text.split('\\n\\n').filter(p => p.trim());

        if (lang === 'es') {
            q.explanation.es = `🧠 **La Lógica "Por qué"**:\n${paragraphs[0] || text}\n\n💣 **La Trampa / El Truco**:\n${paragraphs[1] || 'Presta atención a los detalles de la pregunta.'}`;
        } else if (lang === 'en') {
            q.explanation.en = `🧠 **The Logic "Why"**:\n${paragraphs[0] || text}\n\n💣 **The Trap / The Trick**:\n${paragraphs[1] || 'Pay attention to the details of the question.'}`;
        } else if (lang === 'ru') {
            q.explanation.ru = `🧠 **Логика "Почему"**:\n${paragraphs[0] || text}\n\n💣 **Ловушка / Трюк**:\n${paragraphs[1] || 'Обрати внимание на детали вопроса.'}`;
        }
    });

    fixed++;
    console.log(`✅ Q${q.question_number}: Added headers`);
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`\n✨ Fixed ${fixed} questions in Topic 2, Test 2`);
