#!/usr/bin/env node

/**
 * Скрипт для настройки Supabase CLI и применения миграций
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'ijijcrucqqnnjbkclqhb';

console.log('🔧 Настройка Supabase CLI...\n');

try {
  // Проверяем, установлен ли Supabase CLI
  console.log('1️⃣ Проверяю установку Supabase CLI...');
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    console.log('✅ Supabase CLI установлен\n');
  } catch (error) {
    console.log('❌ Supabase CLI не установлен');
    console.log('📦 Устанавливаю Supabase CLI через npm...\n');
    execSync('npm install -g supabase', { stdio: 'inherit' });
    console.log('✅ Supabase CLI установлен\n');
  }

  // Проверяем авторизацию
  console.log('2️⃣ Проверяю авторизацию...');
  try {
    execSync('supabase projects list', { stdio: 'ignore' });
    console.log('✅ Авторизован в Supabase\n');
  } catch (error) {
    console.log('⚠️  Не авторизован. Выполните:');
    console.log('   supabase login');
    console.log('   Затем запустите этот скрипт снова\n');
    process.exit(1);
  }

  // Проверяем связь с проектом
  console.log('3️⃣ Проверяю связь с проектом...');
  try {
    const result = execSync('supabase projects list', { encoding: 'utf-8' });
    if (result.includes(PROJECT_ID)) {
      console.log('✅ Проект найден\n');
    } else {
      console.log('⚠️  Проект не найден. Связываю проект...\n');
      execSync(`supabase link --project-ref ${PROJECT_ID}`, { stdio: 'inherit' });
      console.log('✅ Проект связан\n');
    }
  } catch (error) {
    console.log('⚠️  Ошибка при проверке проекта');
    console.log('🔗 Связываю проект...\n');
    execSync(`supabase link --project-ref ${PROJECT_ID}`, { stdio: 'inherit' });
    console.log('✅ Проект связан\n');
  }

  console.log('✅ Настройка завершена!');
  console.log('\n📝 Теперь вы можете применять миграции:');
  console.log('   npm run supabase:apply-migrations');
  console.log('\n🚀 Или деплоить функции:');
  console.log('   npm run supabase:deploy');

} catch (error) {
  console.error('❌ Ошибка настройки:', error.message);
  process.exit(1);
}


