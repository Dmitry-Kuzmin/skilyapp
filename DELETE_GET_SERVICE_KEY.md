# 🗑️ Удаление функции get-service-key

## ⚠️ КРИТИЧЕСКИ ВАЖНО!

После получения Service Role Key **НЕМЕДЛЕННО** удалите функцию `get-service-key`, так как она открыто возвращает секретный ключ!

---

## 📋 Способ 1: Через Dashboard (рекомендуется)

1. Откройте: https://supabase.com/dashboard/project/ijijcrucqqnnjbkclqhb/functions
2. Найдите функцию **`get-service-key`**
3. Нажмите **три точки** (⋮) рядом с функцией
4. Выберите **Delete**
5. Подтвердите удаление

---

## 📋 Способ 2: Удаление файлов

Если функция не используется, удалите файлы:

```bash
# Удалить папку функции
rm -rf supabase/functions/get-service-key/

# Удалить секцию из config.toml
# Удалите строки:
# [functions.get-service-key]
# verify_jwt = false
```

Затем закоммитьте изменения:
```bash
git add supabase/config.toml
git commit -m "Remove temporary get-service-key function"
git push
```

---

## ✅ Проверка

После удаления функции:

1. Проверьте, что функция не доступна:
   ```
   https://ijijcrucqqnnjbkclqhb.supabase.co/functions/v1/get-service-key
   ```
   Должна вернуться ошибка 404 или 500

2. Убедитесь, что Service Role Key сохранен в `.env.local` (не в Git!)

---

## 🔒 Безопасность

- **НЕ** коммитьте Service Role Key в Git
- **НЕ** делитесь ключом публично
- **НЕ** используйте ключ в клиентском коде
- **Храните** ключ только в `.env.local` или переменных окружения
- **УДАЛИТЕ** функцию сразу после получения ключа


