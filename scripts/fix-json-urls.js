
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const DATA_FILE = path.resolve(__dirname, '../data/test-results.json');
const BUCKET_NAME = 'dgt-images';

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📖 Читаем JSON...');
    const questions = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));

    console.log('🔗 Обновляем ссылки на Supabase...');

    for (const q of questions) {
        if (q.image_filename) {
            const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(q.image_filename);
            q.image_url = data.publicUrl;
        }
        if (q.schema_filename) {
            const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(q.schema_filename);
            q.schema_url = data.publicUrl;
        }
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(questions, null, 2));
    console.log('✅ Готово! JSON обновлен ссылками из Supabase.');
}

main().catch(console.error);
