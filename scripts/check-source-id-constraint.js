#!/usr/bin/env node

/**
 * Проверка наличия уникального constraint на source_id
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required!');
  console.error('Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkConstraint() {
  console.log('🔍 Проверка уникального constraint на source_id...\n');

  try {
    // Проверяем наличие constraint через SQL запрос
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          conname as constraint_name,
          contype as constraint_type
        FROM pg_constraint
        WHERE conrelid = 'public.questions_new'::regclass
        AND conname = 'questions_new_source_id_key';
      `
    });

    if (error) {
      // Если RPC не работает, пробуем прямой запрос к information_schema
      const { data: constraintData, error: constraintError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'questions_new')
        .eq('constraint_name', 'questions_new_source_id_key');

      if (constraintError) {
        console.log('⚠️  Не удалось проверить через Supabase API');
        console.log('   Попробуйте проверить вручную через SQL Editor:');
        console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
        console.log('\n   SQL запрос для проверки:');
        console.log(`
          SELECT 
            conname as constraint_name,
            contype as constraint_type
          FROM pg_constraint
          WHERE conrelid = 'public.questions_new'::regclass
          AND conname = 'questions_new_source_id_key';
        `);
        return;
      }

      if (constraintData && constraintData.length > 0) {
        console.log('✅ Уникальный constraint найден!');
        console.log(`   Имя: ${constraintData[0].constraint_name}`);
        console.log(`   Тип: ${constraintData[0].constraint_type}`);
      } else {
        console.log('❌ Уникальный constraint НЕ найден');
        console.log('   Нужно применить миграцию вручную');
      }
    } else {
      if (data && data.length > 0) {
        console.log('✅ Уникальный constraint найден!');
        console.log(`   Имя: ${data[0].constraint_name}`);
        console.log(`   Тип: ${data[0].constraint_type}`);
      } else {
        console.log('❌ Уникальный constraint НЕ найден');
        console.log('   Нужно применить миграцию вручную');
      }
    }

    // Проверяем наличие индекса
    console.log('\n🔍 Проверка индекса idx_questions_new_source_id...');
    const { data: indexData, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('schemaname', 'public')
      .eq('tablename', 'questions_new')
      .eq('indexname', 'idx_questions_new_source_id');

    if (indexError) {
      console.log('   ⚠️  Не удалось проверить индекс');
    } else if (indexData && indexData.length > 0) {
      console.log('   ⚠️  Старый индекс все еще существует');
      console.log('   Рекомендуется удалить его вручную');
    } else {
      console.log('   ✅ Старый индекс удален');
    }

  } catch (error) {
    console.log('❌ Ошибка при проверке:', error.message);
    console.log('\n📝 Проверьте вручную через SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`);
  }
}

checkConstraint().catch(console.error);

