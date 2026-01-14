
const fs = require('fs');

const filePaths = [
    'data/parsed/topic-01/topic-01_test-001-enriched.json',
    'data/parsed/topic-01/topic-01_test-002-enriched.json'
];

filePaths.forEach(path => {
    if (!fs.existsSync(path)) return;
    console.log(`\n🔍 Checking ${path}...`);
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));

    data.forEach(q => {
        const esText = (q.question.es || '') + (q.explanation.es || '');
        const enText = (q.question.en || '') + (q.explanation.en || '');

        // Check Cyrillic in ES
        if (/[а-яА-ЯёЁ]/.test(esText)) {
            console.log(`⚠️  Question ${q.question_number} (ES) has Cyrillic!`);
            // console.log(esText.substring(0, 50) + '...');
        }
        // Check Cyrillic in EN
        if (/[а-яА-ЯёЁ]/.test(enText)) {
            console.log(`⚠️  Question ${q.question_number} (EN) has Cyrillic!`);
        }
    });
});
