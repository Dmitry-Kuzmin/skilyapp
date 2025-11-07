#!/usr/bin/env node

/**
 * Скрипт для проверки правильности GitHub Secrets
 * 
 * Этот скрипт проверяет, что VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
 * правильно настроены и работают с вашим Supabase проектом.
 */

const SUPABASE_PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const EXPECTED_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

console.log('🔍 Проверка GitHub Secrets для Supabase\n');
console.log('='.repeat(80));

// Проверяем, что переменные окружения установлены
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n📋 Текущие значения:\n');

if (supabaseUrl) {
  console.log(`✅ VITE_SUPABASE_URL: ${supabaseUrl}`);
  if (supabaseUrl === EXPECTED_SUPABASE_URL) {
    console.log('   ✅ URL правильный!');
  } else {
    console.log(`   ❌ URL неправильный! Ожидается: ${EXPECTED_SUPABASE_URL}`);
  }
} else {
  console.log('❌ VITE_SUPABASE_URL: не установлен');
}

console.log('');

if (supabaseAnonKey) {
  // Проверяем формат ключа (JWT токен)
  const keyLength = supabaseAnonKey.length;
  const startsWithEy = supabaseAnonKey.startsWith('eyJ');
  
  console.log(`✅ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}... (${keyLength} символов)`);
  
  if (startsWithEy) {
    console.log('   ✅ Формат ключа правильный (JWT токен)');
  } else {
    console.log('   ⚠️  Формат ключа может быть неправильным (должен начинаться с "eyJ")');
  }
  
  if (keyLength > 100 && keyLength < 500) {
    console.log('   ✅ Длина ключа выглядит правильной');
  } else {
    console.log('   ⚠️  Длина ключа может быть неправильной (обычно 200-400 символов)');
  }
} else {
  console.log('❌ VITE_SUPABASE_ANON_KEY: не установлен');
}

console.log('\n' + '='.repeat(80));
console.log('\n📝 Инструкции:\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('1. Установите переменные окружения:');
  console.log(`   export VITE_SUPABASE_URL="${EXPECTED_SUPABASE_URL}"`);
  console.log('   export VITE_SUPABASE_ANON_KEY="ваш_anon_key"');
  console.log('\n2. Или запустите скрипт с переменными:');
  console.log('   VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/check-github-secrets.js');
} else {
  console.log('✅ Переменные окружения установлены!');
  console.log('\n📋 Для проверки в GitHub:');
  console.log('1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/secrets/actions');
  console.log('2. Проверьте, что секреты имеют те же значения, что и выше');
  console.log('\n🔗 Как получить правильный anon key:');
  console.log('1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn');
  console.log('2. Перейдите в Settings → API');
  console.log('3. Скопируйте "anon" "public" ключ (не service_role!)');
  console.log('4. Добавьте его в GitHub Secrets как VITE_SUPABASE_ANON_KEY');
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Проверка завершена!\n');

