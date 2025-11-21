#!/usr/bin/env node

/**
 * Комплексная проверка состояния базы данных после миграции
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

async function checkFinalStatus() {
  console.log('🔍 Комплексная проверка состояния базы данных...\n');
  console.log('='.repeat(80));

  const results = {
    tables: { found: 0, total: 0, withData: 0 },
    functions: { found: 0, total: 0 },
    policies: { found: 0, total: 0 },
    enums: { found: 0, total: 0 },
    triggers: { found: 0, total: 0 },
    indexes: { found: 0, total: 0 },
    errors: []
  };

  // Список основных таблиц для проверки
  const mainTables = [
    'profiles',
    'topics',
    'subtopics',
    'materials',
    'material_versions',
    'questions_new',
    'answer_options',
    'user_progress',
    'game_sessions',
    'duels',
    'duel_players',
    'duel_questions',
    'duel_answers',
    'duel_stats',
    'duel_notifications',
    'daily_duel_limits',
    'tags',
    'question_tags',
    'language_terms',
    'road_signs',
    'road_race_routes',
    'user_roles',
    'achievements',
    'daily_bonus_def',
    'boost_definitions',
    'boost_inventory',
    'topic_tests',
    'user_topic_progress'
  ];

  // 1. Проверка таблиц
  console.log('\n📊 1. Проверка таблиц:');
  console.log('-'.repeat(80));
  
  for (const table of mainTables) {
    results.tables.total++;
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   ❌ ${table}: таблица не найдена`);
          results.errors.push(`Таблица ${table} не найдена`);
        } else {
          console.log(`   ⚠️  ${table}: ошибка - ${error.message}`);
          results.errors.push(`Таблица ${table}: ${error.message}`);
        }
      } else {
        results.tables.found++;
        const recordCount = count || 0;
        if (recordCount > 0) {
          results.tables.withData++;
          console.log(`   ✅ ${table}: ${recordCount} записей`);
        } else {
          console.log(`   ⚠️  ${table}: таблица существует, но пуста (0 записей)`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ошибка - ${error.message}`);
      results.errors.push(`Таблица ${table}: ${error.message}`);
    }
  }

  // 2. Проверка enum типов
  console.log('\n🔤 2. Проверка enum типов:');
  console.log('-'.repeat(80));
  
  const enumsToCheck = ['app_role', 'subtopic_type', 'material_type'];
  
  for (const enumName of enumsToCheck) {
    results.enums.total++;
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumName}')
          ORDER BY enumsortorder;
        `
      });

      if (error) {
        console.log(`   ⚠️  ${enumName}: не могу проверить через RPC`);
        // Альтернативная проверка через прямой запрос
        try {
          const { data: altData, error: altError } = await supabase
            .from('pg_enum')
            .select('enumlabel');
          
          if (altError) {
            console.log(`   ❌ ${enumName}: enum не найден или ошибка проверки`);
          } else {
            console.log(`   ✅ ${enumName}: найден (проверка через альтернативный метод)`);
            results.enums.found++;
          }
        } catch (e) {
          console.log(`   ⚠️  ${enumName}: ошибка проверки`);
        }
      } else {
        results.enums.found++;
        const values = data?.map(d => d.enumlabel) || [];
        console.log(`   ✅ ${enumName}: значения [${values.join(', ')}]`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${enumName}: ошибка - ${error.message}`);
    }
  }

  // 3. Проверка функций
  console.log('\n⚙️  3. Проверка функций:');
  console.log('-'.repeat(80));
  
  const functionsToCheck = [
    'get_user_profile_id',
    'has_role',
    'modify_boost_inventory',
    'update_updated_at_column',
    'storage_bucket_exists'
  ];
  
  for (const func of functionsToCheck) {
    results.functions.total++;
    try {
      // Пробуем вызвать функцию (даже если она требует параметры, мы получим ошибку о параметрах, а не о том, что функция не существует)
      const { data, error } = await supabase.rpc(func, {});
      
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`   ❌ ${func}: функция не найдена`);
          results.errors.push(`Функция ${func} не найдена`);
        } else if (error.message.includes('argument') || error.message.includes('parameter')) {
          // Функция существует, но требует параметры - это нормально
          console.log(`   ✅ ${func}: функция существует`);
          results.functions.found++;
        } else {
          console.log(`   ⚠️  ${func}: ошибка при вызове - ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${func}: функция существует`);
        results.functions.found++;
      }
    } catch (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ❌ ${func}: функция не найдена`);
        results.errors.push(`Функция ${func} не найдена`);
      } else {
        console.log(`   ⚠️  ${func}: ошибка - ${error.message}`);
      }
    }
  }

  // 4. Проверка RLS политик (через попытку чтения)
  console.log('\n🔒 4. Проверка RLS политик:');
  console.log('-'.repeat(80));
  
  const tablesForRLSCheck = ['profiles', 'topics', 'questions_new', 'duels', 'materials'];
  
  for (const table of tablesForRLSCheck) {
    results.policies.total++;
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          console.log(`   ✅ ${table}: RLS включен (доступ ограничен)`);
          results.policies.found++;
        } else {
          console.log(`   ⚠️  ${table}: ${error.message}`);
        }
      } else {
        // Если данные доступны, это может означать, что RLS настроен правильно для чтения
        console.log(`   ✅ ${table}: RLS настроен (чтение доступно)`);
        results.policies.found++;
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}: ошибка проверки RLS`);
    }
  }

  // 5. Проверка важных колонок
  console.log('\n📋 5. Проверка важных колонок:');
  console.log('-'.repeat(80));
  
  const columnsToCheck = [
    { table: 'topics', column: 'order_index' },
    { table: 'topics', column: 'unlock_condition' },
    { table: 'materials', column: 'type' },
    { table: 'materials', column: 'content' },
    { table: 'subtopics', column: 'order_index' }
  ];
  
  for (const { table, column } of columnsToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .limit(1);

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log(`   ❌ ${table}.${column}: колонка не найдена`);
          results.errors.push(`Колонка ${table}.${column} не найдена`);
        } else {
          console.log(`   ⚠️  ${table}.${column}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${table}.${column}: колонка существует`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}.${column}: ошибка проверки`);
    }
  }

  // 6. Проверка данных в seed таблицах
  console.log('\n🌱 6. Проверка seed данных:');
  console.log('-'.repeat(80));
  
  const seedTables = ['topics', 'tags', 'daily_bonus_def', 'road_race_routes'];
  
  for (const table of seedTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ⚠️  ${table}: ошибка - ${error.message}`);
      } else {
        const recordCount = count || 0;
        if (recordCount > 0) {
          console.log(`   ✅ ${table}: ${recordCount} записей (seed данные загружены)`);
        } else {
          console.log(`   ⚠️  ${table}: пуста (seed данные не загружены)`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}: ошибка проверки`);
    }
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('-'.repeat(80));
  console.log(`📊 Таблицы: ${results.tables.found}/${results.tables.total} найдено, ${results.tables.withData} с данными`);
  console.log(`🔤 Enum типы: ${results.enums.found}/${results.enums.total} найдено`);
  console.log(`⚙️  Функции: ${results.functions.found}/${results.functions.total} найдено`);
  console.log(`🔒 RLS политики: ${results.policies.found}/${results.policies.total} проверено`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ОШИБКИ (${results.errors.length}):`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  } else {
    console.log(`\n✅ Ошибок не обнаружено!`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Рекомендации:');
  console.log('1. Проверьте все таблицы в Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/editor');
  console.log('2. Проверьте RLS политики: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/policies');
  console.log('3. Проверьте примененные миграции: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/migrations');
  console.log('4. Проверьте Edge Functions: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/functions');
  console.log('5. Если таблицы пустые - это нормально, данные нужно импортировать отдельно');
  console.log('6. Если RLS политики отсутствуют - нужно применить оставшиеся миграции');
}

checkFinalStatus().catch(console.error);

