/**
 * Тестовый скрипт для проверки лидерборда
 * Запуск: node test-leaderboard.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yffjnqegeiorunyvcxkn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY не установлен!');
  console.log('Установи переменную окружения: export SUPABASE_ANON_KEY="your_key"');
  process.exit(1);
}

async function testLeaderboard() {
  console.log('🧪 Тестирование лидерборда...\n');

  // Тест 1: Топ-10 (глобальный)
  console.log('📊 Тест 1: Получение топ-10 (глобальный)');
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/duel-pass-leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'top',
        limit: 10,
        page: 1,
        page_size: 10,
        filter_type: 'global',
      }),
    });

    const data1 = await response1.json();
    if (response1.ok && data1.leaderboard) {
      console.log('✅ Успешно! Получено записей:', data1.leaderboard.length);
      console.log('   Пагинация:', data1.pagination);
      if (data1.leaderboard.length > 0) {
        console.log('   Первый игрок:', data1.leaderboard[0].profile?.first_name || data1.leaderboard[0].profile?.username);
        console.log('   Уровень:', data1.leaderboard[0].duel_pass_level, 'XP:', data1.leaderboard[0].duel_pass_xp);
      }
    } else {
      console.log('❌ Ошибка:', data1.error || data1);
    }
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }

  console.log('\n');

  // Тест 2: Позиция пользователя (нужен реальный user_id)
  console.log('👤 Тест 2: Получение позиции пользователя');
  console.log('   (Пропущен - нужен реальный user_id)');
  console.log('   Для теста используй:');
  console.log('   { type: "user_position", user_id: "UUID", neighbors_count: 5 }');

  console.log('\n');

  // Тест 3: Фильтр по стране
  console.log('🌍 Тест 3: Фильтр по стране (language_code: "ru")');
  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/duel-pass-leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'top',
        limit: 10,
        page: 1,
        page_size: 10,
        filter_type: 'country',
        filter_value: 'ru',
      }),
    });

    const data3 = await response3.json();
    if (response3.ok && data3.leaderboard) {
      console.log('✅ Успешно! Получено записей:', data3.leaderboard.length);
      console.log('   Пагинация:', data3.pagination);
    } else {
      console.log('❌ Ошибка:', data3.error || data3);
    }
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }

  console.log('\n');

  // Тест 4: Пагинация (страница 2)
  console.log('📄 Тест 4: Пагинация (страница 2)');
  try {
    const response4 = await fetch(`${SUPABASE_URL}/functions/v1/duel-pass-leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'top',
        limit: 10,
        page: 2,
        page_size: 10,
        filter_type: 'global',
      }),
    });

    const data4 = await response4.json();
    if (response4.ok && data4.leaderboard) {
      console.log('✅ Успешно! Получено записей:', data4.leaderboard.length);
      console.log('   Пагинация:', data4.pagination);
      if (data4.pagination.page === 2) {
        console.log('   ✅ Страница корректна!');
      }
    } else {
      console.log('❌ Ошибка:', data4.error || data4);
    }
  } catch (error) {
    console.log('❌ Ошибка запроса:', error.message);
  }

  console.log('\n');

  // Тест 5: SQL функция (через RPC)
  console.log('🔧 Тест 5: Проверка SQL функции get_user_leaderboard_position');
  console.log('   (Пропущен - нужен реальный user_id)');
  console.log('   Для теста в Supabase SQL Editor выполни:');
  console.log('   SELECT get_user_leaderboard_position(\'USER_ID\', 5, \'global\', NULL);');

  console.log('\n✅ Тестирование завершено!');
  console.log('\n📝 Следующие шаги:');
  console.log('   1. Открой приложение и перейди на страницу лидерборда');
  console.log('   2. Проверь работу фильтров (глобальный, друзья, страна)');
  console.log('   3. Проверь поиск по имени');
  console.log('   4. Проверь пагинацию');
  console.log('   5. Проверь блок "Моё место" (если не в топе)');
}

testLeaderboard().catch(console.error);

