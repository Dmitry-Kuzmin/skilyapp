# 🔧 Troubleshooting: Проблемы с ежедневным бонусом

## Проблемы обнаружены

1. **Super RPC возвращает 400** - `get_dashboard_super` падает с ошибкой
2. **Edge Function возвращает 503** - `claim-daily-bonus` недоступна

## Диагностика

### 1. Проверка Super RPC (400 ошибка)

**Возможные причины:**
- Функция не существует в базе (миграция не применена)
- Неправильный тип параметра `p_user_id` (ожидает UUID)
- Ошибка внутри SQL функции (например, проблема с JOIN или подзапросом)

**Как проверить:**

1. Откройте Supabase Dashboard → SQL Editor
2. Выполните:
```sql
-- Проверка существования функции
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname = 'get_dashboard_super';

-- Проверка вызова функции (замените UUID на ваш)
SELECT get_dashboard_super('532aae3f-0282-469a-be1c-a073ef6c870b'::UUID);
```

3. Если функция не существует - примените миграцию:
   - Файл: `supabase/migrations/20250110_extend_super_dashboard_rpc.sql`
   - Скопируйте содержимое в SQL Editor и выполните

4. Если функция существует, но падает - проверьте логи:
   - Supabase Dashboard → Logs → Postgres Logs
   - Ищите ошибки с `get_dashboard_super`

### 2. Проверка Edge Function (503 ошибка)

**Возможные причины:**
- Edge Function не задеплоена
- Edge Function упала с ошибкой
- Проблемы с переменными окружения
- Проблемы с инфраструктурой Supabase

**Как проверить:**

1. Проверьте, что Edge Function задеплоена:
```bash
# В терминале проекта
cd supabase
supabase functions list
# Должна быть функция claim-daily-bonus
```

2. Если функции нет - задеплойте:
```bash
supabase functions deploy claim-daily-bonus
```

3. Проверьте логи Edge Function:
   - Supabase Dashboard → Edge Functions → claim-daily-bonus → Logs
   - Ищите ошибки при вызове

4. Проверьте переменные окружения:
   - Supabase Dashboard → Edge Functions → claim-daily-bonus → Settings
   - Должны быть: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Временное решение

Пока проблемы не решены, приложение использует fallback:

1. **Super RPC** → Fallback на `get_dashboard_complete` → Fallback на старый метод
2. **Edge Function** → Показывает ошибку пользователю

## Исправления в коде

Добавлено детальное логирование:

1. **`useDashboardData.ts`** - логирует детали ошибки Super RPC
2. **`Index.tsx`** - улучшена обработка ошибок Edge Function с понятными сообщениями

## Следующие шаги

1. ✅ Проверьте логи в Supabase Dashboard
2. ✅ Убедитесь, что миграция применена
3. ✅ Убедитесь, что Edge Function задеплоена
4. ✅ Проверьте переменные окружения Edge Function
5. ✅ Если проблема сохраняется - проверьте права доступа (RLS policies)

## Проверка в браузере

После исправлений проверьте в консоли:

```
[useDashboardData] ❌ Super RPC error: { ...детали ошибки... }
[handleClaimBonus] Edge Function error: { ...детали ошибки... }
```

Эти логи помогут понять точную причину проблемы.

