#!/usr/bin/env node

/**
 * Проверка состояния базы данных после миграции
 */

import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZmpucWVnZWlvcnVueXZjeGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNDIxNiwiZXhwIjoyMDc4MDgwMjE2fQ.Sfw_uZk-vpBjcfulE-0SJwQr0bhZdRv5RElT89Fe8Nw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabaseStatus() {
  console.log('🔍 Проверка состояния базы данных...\n');
  console.log('='.repeat(60));

  // 1. Проверка таблиц
  console.log('\n📊 1. Проверка таблиц:');
  try {
    const { data: tables, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      // Альтернативный способ - через прямой запрос
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (tablesError) {
        console.log('   ⚠️  Не могу получить список таблиц через RPC');
        console.log('   📝 Проверьте вручную через SQL Editor');
      } else {
        console.log(`   ✅ Найдено таблиц: ${tablesData?.length || 0}`);
        if (tablesData && tablesData.length > 0) {
          console.log('   📋 Основные таблицы:');
          const mainTables = ['profiles', 'topics', 'questions_new', 'user_progress', 'duels', 'duel_notifications'];
          mainTables.forEach(table => {
            const found = tablesData.find(t => t.table_name === table);
            console.log(`      ${found ? '✅' : '❌'} ${table}`);
          });
        }
      }
    } else {
      console.log(`   ✅ Найдено таблиц: ${tables?.length || 0}`);
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка при проверке таблиц:', error.message);
  }

  // 2. Проверка RLS политик
  console.log('\n🔒 2. Проверка RLS политик:');
  try {
    const { data: policies, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });

    if (error) {
      console.log('   ⚠️  Не могу проверить RLS политики через RPC');
      console.log('   📝 Проверьте вручную через SQL Editor:');
      console.log('      SELECT * FROM pg_policies WHERE schemaname = \'public\';');
    } else {
      console.log(`   ✅ Найдено RLS политик: ${policies?.length || 0}`);
      if (policies && policies.length > 0) {
        const tablesWithPolicies = [...new Set(policies.map(p => p.tablename))];
        console.log(`   📋 Таблицы с RLS: ${tablesWithPolicies.length}`);
        tablesWithPolicies.slice(0, 10).forEach(table => {
          const tablePolicies = policies.filter(p => p.tablename === table);
          console.log(`      ✅ ${table}: ${tablePolicies.length} политик`);
        });
      }
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка при проверке RLS:', error.message);
  }

  // 3. Проверка функций
  console.log('\n⚙️  3. Проверка функций:');
  try {
    const { data: functions, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name;
      `
    });

    if (error) {
      console.log('   ⚠️  Не могу проверить функции через RPC');
    } else {
      console.log(`   ✅ Найдено функций: ${functions?.length || 0}`);
      const importantFunctions = ['get_user_profile_id', 'has_role', 'modify_boost_inventory'];
      if (functions && functions.length > 0) {
        importantFunctions.forEach(func => {
          const found = functions.find(f => f.routine_name === func);
          console.log(`      ${found ? '✅' : '❌'} ${func}`);
        });
      }
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка при проверке функций:', error.message);
  }

  // 4. Проверка данных в основных таблицах
  console.log('\n📦 4. Проверка данных в таблицах:');
  const tablesToCheck = ['profiles', 'topics', 'questions_new', 'user_progress'];
  
  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ⚠️  ${table}: ошибка - ${error.message}`);
      } else {
        console.log(`   ${count > 0 ? '✅' : '⚠️ '} ${table}: ${count || 0} записей`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${table}: не удалось проверить`);
    }
  }

  // 5. Проверка миграций
  console.log('\n📝 5. Проверка примененных миграций:');
  try {
    const { data: migrations, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT version, name 
        FROM supabase_migrations.schema_migrations 
        ORDER BY version;
      `
    });

    if (error) {
      console.log('   ⚠️  Не могу проверить миграции через RPC');
      console.log('   📝 Проверьте вручную через SQL Editor:');
      console.log('      SELECT * FROM supabase_migrations.schema_migrations;');
    } else {
      console.log(`   ✅ Применено миграций: ${migrations?.length || 0}`);
      if (migrations && migrations.length > 0) {
        console.log(`   📋 Последние 5 миграций:`);
        migrations.slice(-5).forEach(m => {
          console.log(`      ✅ ${m.name || m.version}`);
        });
      }
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка при проверке миграций:', error.message);
  }

  // 6. Проверка Realtime
  console.log('\n🔄 6. Проверка Realtime:');
  try {
    const { data: realtime, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime';
      `
    });

    if (error) {
      console.log('   ⚠️  Не могу проверить Realtime через RPC');
    } else {
      console.log(`   ✅ Таблиц в Realtime: ${realtime?.length || 0}`);
      if (realtime && realtime.length > 0) {
        realtime.forEach(table => {
          console.log(`      ✅ ${table.tablename}`);
        });
      }
    }
  } catch (error) {
    console.log('   ⚠️  Ошибка при проверке Realtime:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Рекомендации:');
  console.log('1. Проверьте все таблицы в Dashboard: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/editor');
  console.log('2. Проверьте RLS политики: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/policies');
  console.log('3. Проверьте миграции: https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/database/migrations');
  console.log('4. Если что-то отсутствует, примените оставшиеся миграции вручную');
}

checkDatabaseStatus().catch(console.error);

