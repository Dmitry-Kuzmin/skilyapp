#!/usr/bin/env node

/**
 * 💾 BACKUP БАЗЫ ДАННЫХ
 * 
 * Создает резервную копию questions_new и answer_options
 * перед запуском синхронизации
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function createBackup() {
    console.log('💾 СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ БД');
    console.log('================================\n');

    // Создаем папку для бэкапов
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
    const backupFile = path.join(BACKUP_DIR, `db_backup_${timestamp}.json`);

    console.log('📁 Папка бэкапов:', BACKUP_DIR);
    console.log('📄 Файл бэкапа:', path.basename(backupFile));
    console.log();

    const backup = {
        created_at: new Date().toISOString(),
        tables: {}
    };

    try {
        // Сохраняем questions_new
        console.log('📥 Загружаем questions_new...');
        const { data: questions, error: qError } = await supabase
            .from('questions_new')
            .select('*');

        if (qError) throw qError;

        backup.tables.questions_new = questions;
        console.log(`✅ Сохранено ${questions.length} вопросов`);

        // Сохраняем answer_options
        console.log('📥 Загружаем answer_options...');
        const { data: answers, error: aError } = await supabase
            .from('answer_options')
            .select('*');

        if (aError) throw aError;

        backup.tables.answer_options = answers;
        console.log(`✅ Сохранено ${answers.length} ответов`);

        // Записываем в файл
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        const stats = fs.statSync(backupFile);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log('\n✅ БЭКАП СОЗДАН УСПЕШНО!\n');
        console.log('📍 Путь:', backupFile);
        console.log('📦 Размер:', sizeMB, 'MB');
        console.log('📊 Вопросов:', questions.length);
        console.log('📊 Ответов:', answers.length);
        console.log('\n💡 Для восстановления используй: npm run restore:backup');

    } catch (error) {
        console.error('\n❌ Ошибка создания бэкапа:', error.message);
        process.exit(1);
    }
}

createBackup();
