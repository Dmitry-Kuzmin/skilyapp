const fs = require('fs');
const { Client } = require('pg');

const PROJECT_ID = "yffjnqegeiorunyvcxkn";
const DB_PASSWORD = "345556Ff@?";
const DB_HOST = "aws-1-eu-north-1.pooler.supabase.com";
const DB_PORT = "5432";
const DB_NAME = "postgres";
const DB_USER = `postgres.${PROJECT_ID}`;

const DB_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const SQL_PATH = '/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep/supabase/migrations/categories_fix.sql';

async function applyMigration() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: {
      rejectUnauthorized: false // Для Supabase это часто необходимо при прямом подключении через ноду
    }
  });

  try {
    console.log('🚀 Подключаюсь к базе данных напрямую (SSL fix)...');
    await client.connect();
    console.log('✅ Подключено.');

    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    console.log('📝 Выполняю SQL миграцию...');
    
    await client.query(sql);
    
    console.log('✅ Миграция применена успешно!');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
