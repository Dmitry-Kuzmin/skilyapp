import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'data', 'parsed', 'topic-01', 'topic-01_test-001-enriched.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const report = {
    total_questions: data.length,
    missing_fields: [],
    suspicious_lengths: [],
    formatting_issues: [],
    mixed_language_candidates: [],
    ru_structure_check: {
        matches_template: 0,
        mismatches: []
    }
};

data.forEach((item, index) => {
    const qNum = item.question_number;
    const prefix = `Q${qNum}`;

    // 1. Basic Field Check
    ['es', 'en', 'ru'].forEach(lang => {
        if (!item.question[lang]) report.missing_fields.push(`${prefix} question.${lang}`);
        // Answers
        item.answers.forEach((a, aIdx) => {
            if (!a.text[lang]) report.missing_fields.push(`${prefix} answer[${aIdx}].${lang}`);
        });

        // Explanation
        if (!item.explanation[lang]) {
            report.missing_fields.push(`${prefix} explanation.${lang}`);
        } else {
            // 2. Length Checks
            if (lang === 'ru') {
                if (item.explanation.ru.length < 50) report.suspicious_lengths.push(`${prefix} RU Exp too short`);
                if (item.explanation.ru.length > 2000) report.suspicious_lengths.push(`${prefix} RU Exp too long`);
            }
        }
    });


    // 3. Formatting & Hallucinations
    const ruExp = item.explanation.ru || "";

    // Check for weird characters (replacement chars)
    if (ruExp.includes('')) report.formatting_issues.push(`${prefix} RU Exp contains replacement char`);

    // Check for broken markdown bold
    if ((ruExp.match(/\*\*/g) || []).length % 2 !== 0) report.formatting_issues.push(`${prefix} RU Exp broken bold tags`);

    // 4. Structure Check
    // Template expects: 1️⃣ ... 2️⃣ ... 3️⃣ ...
    const has1 = ruExp.includes('1️⃣');
    const has2 = ruExp.includes('2️⃣');
    const has3 = ruExp.includes('3️⃣');

    if (has1 && has2 && has3) {
        report.ru_structure_check.matches_template++;
    } else {
        report.ru_structure_check.mismatches.push(`${prefix} Missing structure emojis (Has 1:${has1} 2:${has2} 3:${has3})`);
    }
});

console.log(JSON.stringify(report, null, 2));
