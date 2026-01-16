# 📋 Как посмотреть логи GitHub Actions

## 🔍 Просмотр логов

### Способ 1: Развернуть шаг

1. На странице workflow run найдите секцию **"Job Steps"**
2. Найдите шаг **"> Cleanup old test sessions"** (с зеленой галочкой)
3. **Кликните на этот шаг** - он развернется и покажет логи

### Способ 2: Через кнопку "View logs"

1. На странице workflow run
2. Найдите шаг **"> Cleanup old test sessions"**
3. Справа от названия шага должна быть кнопка **"View logs"** или **"View raw logs"**
4. Кликните на неё

## 📊 Что должно быть в логах

После разворачивания шага "Cleanup old test sessions" вы должны увидеть:

```
🧹 Starting cleanup of old test sessions...
Response code: 200
Response body: {"success":true,"deleted_started":0,"deleted_abandoned":0,"timestamp":"..."}
✅ Cleanup completed successfully
{
  "success": true,
  "deleted_started": 0,
  "deleted_abandoned": 0,
  "timestamp": "2025-12-08T20:57:00.000Z"
}
```

## 🔍 Если логов нет

### Вариант 1: Шаг не разворачивается
- Попробуйте обновить страницу (F5 или Cmd+R)
- Убедитесь, что JavaScript включен в браузере

### Вариант 2: Логи пустые
- Проверьте, что секреты `SUPABASE_URL` и `SUPABASE_ANON_KEY` правильно настроены
- Проверьте, что Edge Function задеплоена

### Вариант 3: Ошибка в логах
- Если видите ошибку 401/403 - проверьте `SUPABASE_ANON_KEY`
- Если видите ошибку 404 - проверьте `SUPABASE_URL`
- Если видите другую ошибку - скопируйте её и проверьте логи Edge Function в Supabase Dashboard

## 📸 Скриншот где искать

На вашем скриншоте:
1. Найдите секцию **"Job Steps"** (слева внизу)
2. Найдите **"> Cleanup old test sessions"** (с зеленой галочкой)
3. **Кликните на него** - он развернется и покажет логи

## ✅ Проверка успешного выполнения

Если workflow выполнился успешно (зеленая галочка), значит:
- ✅ Секреты настроены правильно
- ✅ Edge Function доступна
- ✅ Очистка выполнилась

Логи покажут сколько записей было удалено.
