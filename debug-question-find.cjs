
const fs = require('fs').promises;
const path = require('path');
const { v5: uuidv5 } = require('uuid');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // URL namespace

async function testLogic() {
    const queryId = 'topic-02_test-002_87bdf18f-9876-4c79-a6a3-d88e202f09cc';
    console.log('Testing Query ID:', queryId);

    try {
        const testIdMatch = queryId.match(/(topic-[^_]+)_test-([^_]+)/);
        if (!testIdMatch) {
            console.log('❌ Logic failed: Regex did not match');
            return;
        }

        const topic = testIdMatch[1];
        const testNumber = testIdMatch[2];
        const testName = `${topic}_test-${testNumber}`;
        console.log(`Parsed: Topic=${topic}, TestName=${testName}`);

        const p = path.join(process.cwd(), 'data', 'parsed', topic, `${testName}-enriched.json`);
        console.log('Checking file:', p);

        const content = await fs.readFile(p, 'utf8');
        const json = JSON.parse(content);
        const questions = Array.isArray(json) ? json : json.questions;
        console.log(`Loaded ${questions.length} questions.`);

        const q = questions.find((item, index) => {
            let itemId = item.external_id || item.id;

            if (!itemId && item.image_url) {
                const match = item.image_url.match(/\/question\/([a-f0-9-]{36})/);
                if (match) itemId = match[1];
            }

            if (!itemId) {
                if (item.question_number) {
                    itemId = uuidv5(`${testName}_q-${item.question_number}`, NAMESPACE);
                } else {
                    itemId = `${testName}_q${index + 1}`;
                }
            }

            // Debug prints for matching logic
            const directMatch = String(itemId) === String(queryId);
            const compositeMatch = queryId.includes(testName) && queryId.endsWith(itemId);

            if (itemId === '87bdf18f-9876-4c79-a6a3-d88e202f09cc') {
                console.log(`🎯 Found Candidate Question #${index + 1}:`);
                console.log(`   - Derived ItemID: ${itemId}`);
                console.log(`   - Direct Match: ${directMatch}`);
                console.log(`   - Composite Match: ${compositeMatch}`);
            }

            if (directMatch) return true;
            if (compositeMatch) return true;

            return false;
        });

        if (q) {
            console.log('✅ SUCCESS: Question found!');
        } else {
            console.log('❌ FAILURE: Question not found.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testLogic();
