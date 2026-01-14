const fs = require('fs');
const path = require('path');

const testFiles = [
    'data/parsed/topic-01/topic-01_test-001-enriched.json',
    'data/parsed/topic-01/topic-01_test-002-enriched.json',
    'data/parsed/topic-02/topic-02_test-001-enriched.json',
    'data/parsed/topic-02/topic-02_test-002.json'
];

console.log('🔍 PRODUCTION READINESS AUDIT\n');
console.log('='.repeat(70));

testFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
        console.log(`\n❌ FILE NOT FOUND: ${filePath}`);
        return;
    }

    console.log(`\n📂 ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate question count
    if (data.length !== 30) {
        console.log(`  ❌ CRITICAL: Expected 30 questions, found ${data.length}!`);
    }

    let stats = {
        total: data.length,
        missingQuestionTranslations: 0,
        missingAnswerTranslations: 0,
        missingExplanations: 0,
        hasAnswerMentions: 0,
        hasCyrillicInES: 0,
        hasOldFormat: 0,
        hasNewFormat: 0,
        fullyReady: 0
    };

    data.forEach((q, idx) => {
        let issues = [];

        // Check question translations
        if (!q.question.ru || !q.question.en) {
            stats.missingQuestionTranslations++;
            issues.push('Missing Q translation');
        }

        // Check answer translations
        q.answers.forEach(a => {
            if (!a.text.ru || !a.text.en) {
                stats.missingAnswerTranslations++;
                issues.push('Missing A translation');
            }
        });

        // Check explanations
        if (!q.explanation.ru || !q.explanation.en || !q.explanation.es) {
            stats.missingExplanations++;
            issues.push('Missing explanation');
        }

        // Check for answer mentions
        const allText = JSON.stringify(q.explanation).toLowerCase();
        if (/respuesta correcta es|correct answer is|правильный ответ|ответ [abc]/i.test(allText)) {
            stats.hasAnswerMentions++;
            issues.push('Mentions answer letter');
        }

        // Check for cyrillic in ES
        if (/[а-яА-ЯёЁ]/.test(q.explanation.es || '')) {
            stats.hasCyrillicInES++;
            issues.push('Cyrillic in ES');
        }

        // Check format style
        const ruExpl = q.explanation.ru || '';
        if (/🧠.*Логика.*Почему/.test(ruExpl) && /💣.*Ловушка/.test(ruExpl)) {
            stats.hasNewFormat++;
        } else if (/1️⃣.*🎓.*Правило/.test(ruExpl) || /2️⃣/.test(ruExpl)) {
            stats.hasOldFormat++;
        }

        // Fully ready?
        if (issues.length === 0 && stats.hasNewFormat > 0) {
            stats.fullyReady++;
        }

        if (issues.length > 0) {
            console.log(`  ⚠️  Q${q.question_number}: ${issues.join(', ')}`);
        }
    });

    console.log('\n📊 STATS:');
    console.log(`  Total Questions: ${stats.total}`);
    console.log(`  ✅ Fully Ready: ${stats.fullyReady}/${stats.total} (${Math.round(stats.fullyReady / stats.total * 100)}%)`);
    console.log(`  🎨 New Format (🧠/💣): ${stats.hasNewFormat}`);
    console.log(`  📜 Old Format (1️⃣/2️⃣): ${stats.hasOldFormat}`);
    console.log(`  ❌ Missing Q Translations: ${stats.missingQuestionTranslations}`);
    console.log(`  ❌ Missing A Translations: ${stats.missingAnswerTranslations}`);
    console.log(`  ❌ Missing Explanations: ${stats.missingExplanations}`);
    console.log(`  ⚠️  Answer Mentions: ${stats.hasAnswerMentions}`);
    console.log(`  ⚠️  Cyrillic in ES: ${stats.hasCyrillicInES}`);

    const readiness = Math.round(stats.fullyReady / stats.total * 100);
    if (readiness === 100) {
        console.log(`\n  🎉 PRODUCTION READY!`);
    } else if (readiness >= 80) {
        console.log(`\n  ⚠️  ALMOST READY (${readiness}%)`);
    } else {
        console.log(`\n  ❌ NOT READY (${readiness}%)`);
    }
    console.log('='.repeat(70));
});
