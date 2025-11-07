#!/usr/bin/env node

/**
 * Скрипт для назначения роли администратора пользователю по email
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

async function grantAdminRole(email) {
  console.log(`🔐 Назначение роли администратора для: ${email}\n`);
  console.log('='.repeat(80));

  try {
    // 1. Находим пользователя по email
    console.log('🔍 Поиск пользователя...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.log(`❌ Ошибка поиска пользователей: ${usersError.message}`);
      return;
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`❌ Пользователь с email ${email} не найден`);
      console.log('\n📋 Доступные пользователи:');
      users.users.forEach(u => {
        console.log(`   - ${u.email || 'N/A'} (ID: ${u.id})`);
      });
      return;
    }

    console.log(`✅ Пользователь найден:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Создан: ${user.created_at}`);

    // 2. Проверяем, есть ли уже роль admin
    console.log('\n🔍 Проверка существующих ролей...');
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    if (rolesError) {
      console.log(`⚠️  Ошибка проверки ролей: ${rolesError.message}`);
    } else {
      if (existingRoles && existingRoles.length > 0) {
        console.log(`📋 Существующие роли:`);
        existingRoles.forEach(role => {
          console.log(`   - ${role.role}`);
        });

        // Проверяем, есть ли уже роль admin
        const hasAdmin = existingRoles.some(r => r.role === 'admin');
        if (hasAdmin) {
          console.log(`\n✅ Пользователь уже имеет роль 'admin'`);
          return;
        }
      } else {
        console.log(`   ℹ️  У пользователя нет ролей`);
      }
    }

    // 3. Добавляем роль admin
    console.log('\n➕ Добавление роли admin...');
    const { data: newRole, error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique constraint violation - роль уже существует
        console.log(`⚠️  Роль 'admin' уже существует для этого пользователя`);
      } else {
        console.log(`❌ Ошибка добавления роли: ${insertError.message}`);
        console.log(`   Код ошибки: ${insertError.code}`);
        return;
      }
    } else {
      console.log(`✅ Роль 'admin' успешно добавлена!`);
      console.log(`   - ID записи: ${newRole.id}`);
      console.log(`   - Создана: ${newRole.created_at}`);
    }

    // 4. Проверяем результат
    console.log('\n🔍 Проверка результата...');
    const { data: finalRoles, error: finalError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    if (finalError) {
      console.log(`⚠️  Ошибка проверки: ${finalError.message}`);
    } else {
      console.log(`✅ Текущие роли пользователя:`);
      finalRoles.forEach(role => {
        console.log(`   - ${role.role} (создана: ${role.created_at})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Готово! Пользователь теперь имеет роль администратора.');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Пользователь должен выйти и войти снова, чтобы обновить токен');
    console.log('2. Проверьте доступ к админ-панели: /admin');
    console.log('3. Проверьте доступ к импорту данных: /data-import');

  } catch (error) {
    console.log(`❌ Исключение: ${error.message}`);
    console.error(error);
  }
}

// Получаем email из аргументов командной строки
const email = process.argv[2] || 'Kuzmin.public@gmail.com';

if (!email) {
  console.log('❌ Укажите email пользователя');
  console.log('Использование: node scripts/grant-admin-role.js <email>');
  process.exit(1);
}

grantAdminRole(email).catch(console.error);

