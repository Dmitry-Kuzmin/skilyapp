# 🔌 Supabase MCP Server - Инструкция по подключению

## ✅ Установка завершена!

MCP сервер для Supabase установлен глобально.

---

## 📋 Что нужно сделать ДИМКЕ:

### Шаг 1: Открой настройки Claude Desktop / Cursor

**Для Claude Desktop:**
1. Открой `~/Library/Application Support/Claude/claude_desktop_config.json`

**Для Cursor:**
1. Cmd+Shift+P → "Preferences: Open Settings (JSON)"
2. Или открой `~/.cursor/settings.json`

### Шаг 2: Добавь эту конфигурацию

Вставь в файл конфигурации:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "bash",
      "args": [
        "/Users/dimka/Desktop/Skily/sdadim-dgt-prep/scripts/start-mcp-supabase.sh"
      ]
    }
  }
}
```

**ИЛИ напрямую с переменными окружения:**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "mcp-server-supabase",
      "env": {
        "SUPABASE_URL": "https://vlssvgakpwdjmtlrzilq.supabase.co",
        "SUPABASE_SERVICE_KEY": "[ТВОЙ_SERVICE_ROLE_KEY_ИЗ_.env]"
      }
    }
  }
}
```

### Шаг 3: Перезапусти Cursor/Claude Desktop

Закрой и открой заново.

---

## 🎯 Что это даёт:

После подключения Antigravity сможет:

✅ Видеть **актуальную схему БД** (названия таблиц, колонок, типы данных)  
✅ **Читать данные** из таблиц напрямую  
✅ **Выполнять SQL запросы** для проверки  
✅ **Никогда больше** не ошибаться с названиями полей  

---

## 🧪 Проверка работы:

После перезапуска попроси Antigravity:

```
"Покажи мне схему таблицы questions_new"
```

Если MCP подключен, он сразу покажет список всех колонок с типами.

---

## 🔧 Альтернатива (если не работает):

Если MCP сервер не запускается, можешь дать Antigravity прямой доступ через SQL:

1. Открой Supabase Dashboard → SQL Editor
2. Выполни:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'questions_new'
ORDER BY ordinal_position;
```

3. Скопируй результат и отправь Antigravity

---

**Готово! 🎉**
