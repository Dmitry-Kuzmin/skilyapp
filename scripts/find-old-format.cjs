const fs = require('fs');

const files = [
    'data/parsed/topic-01/topic-01_test-001-enriched.json',
    'data/parsed/topic-01/topic-01_test-002-enriched.json',
    'data/parsed/topic-02/topic-02_test-001-enriched.json',
    'data/parsed/topic-02/topic-02_test-002.json'
];

console.log('🔍 Searching for questions in old format...\n');

let totalOld = 0;

files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const oldFormat = [];

    data.forEach(q => {
        const ruExpl = q.explanation.ru || '';
        const isNewFormat = /🧠.*Логика.*Почему/.test(ruExpl) && /💣.*Ловушка/.test(ruExpl);
        if (!isNewFormat && ruExpl.length > 0) {
            oldFormat.push({
                num: q.question_number,
                question: q.question.es.substring(0, 50) + '...',
                correctAnswer: q.answers.find(a => a.is_correct)?.text?.es || 'Unknown'
            });
        }
    });

    if (oldFormat.length > 0) {
        console.log(`📂 ${file}`);
        console.log(`   Found ${oldFormat.length} questions in old format:`);
        oldFormat.forEach(q => {
            console.log(`   - Q${q.num}: ${q.question}`);
        });
        console.log('');
        totalOld += oldFormat.length;
    }
});

console.log(`\n📊 Total questions to fix: ${totalOld}`);
