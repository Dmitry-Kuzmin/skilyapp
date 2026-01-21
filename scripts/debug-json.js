
import fs from 'fs';
import path from 'path';

const p = 'data/parsed/topic-02/topic-02_test-002-enriched.json'; // Check test-002 as per user complaint
if (!fs.existsSync(p)) {
    console.log('Enriched file not found:', p);
    const pRaw = 'data/parsed/topic-02/topic-02_test-002.json';
    if (fs.existsSync(pRaw)) {
        console.log('Raw file found:', pRaw);
        const content = fs.readFileSync(pRaw, 'utf8');
        const json = JSON.parse(content);
        const questions = Array.isArray(json) ? json : json.questions;
        console.log('Raw Question 1:', questions[0].question);
    } else {
        console.log('No file found for test-002');
    }
} else {
    console.log('Enriched file found:', p);
    const content = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(content);
    const questions = Array.isArray(json) ? json : json.questions;
    console.log('Enriched Question 1:', questions[0].question);
    console.log('Enriched Question 1 Type:', typeof questions[0].question);
}
