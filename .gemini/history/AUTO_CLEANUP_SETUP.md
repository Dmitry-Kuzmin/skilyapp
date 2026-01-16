# 🤖 Автоматическая очистка Cursor каждый час

## 📋 Описание

Автоматическая система очистки кэша Cursor и проекта, которая запускается **каждый час** в фоновом режиме.

**Особенности:**
- ✅ Не останавливает Cursor (работает в фоне)
- ✅ Очищает только большие кэши (> 50-100MB)
- ✅ Логирует все действия
- ✅ Безопасная - не трогает важные файлы

---

## 🚀 Установка

### Шаг 1: Установить автоматическую очистку

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
./install-auto-cleanup.sh
```

Это установит задачу, которая будет запускаться каждый час автоматически.

---

## 📊 Что очищается

### Каждый час автоматически:

1. **Кэш TypeScript** (> 50MB)
   - `~/Library/Caches/typescript/*`

2. **Кэш Vite** (> 100MB)
   - `node_modules/.vite`

3. **Кэш Cursor** (> 2GB)
   - `~/Library/Application Support/Cursor/Cache/*`

4. **GPU кэш Cursor** (> 500MB)
   - `~/Library/Application Support/Cursor/GPUCache/*`

5. **Временные файлы**
   - `.DS_Store` файлы
   - `*.tsbuildinfo` файлы

---

## 📝 Логи

Все действия логируются в:

- **Основной лог:** `~/Library/Logs/cursor-auto-cleanup.log`
- **Ошибки:** `~/Library/Logs/cursor-auto-cleanup.error.log`

### Просмотр логов:

```bash
# Последние 50 строк
tail -50 ~/Library/Logs/cursor-auto-cleanup.log

# Следить за логами в реальном времени
tail -f ~/Library/Logs/cursor-auto-cleanup.log

# Посмотреть ошибки
cat ~/Library/Logs/cursor-auto-cleanup.error.log
```

---

## 🛠️ Управление

### Проверить статус:

```bash
launchctl list | grep cursor-cleanup
```

Если видите `com.dimka.cursor-cleanup` - задача работает.

### Остановить автоматическую очистку:

```bash
launchctl unload ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
```

Или используйте скрипт:

```bash
./uninstall-auto-cleanup.sh
```

### Запустить снова:

```bash
launchctl load ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
```

Или переустановите:

```bash
./install-auto-cleanup.sh
```

### Запустить очистку вручную (не дожидаясь часа):

```bash
./auto-cleanup-hourly.sh
```

---

## ⚙️ Настройка

### Изменить интервал очистки:

Отредактируйте файл `com.dimka.cursor-cleanup.plist`:

```xml
<key>StartInterval</key>
<integer>3600</integer>  <!-- 3600 секунд = 1 час -->
```

Варианты:
- `1800` = 30 минут
- `3600` = 1 час (по умолчанию)
- `7200` = 2 часа

После изменения:

```bash
launchctl unload ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
launchctl load ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
```

### Изменить пороги очистки:

Отредактируйте `auto-cleanup-hourly.sh`:

```bash
# Кэш TypeScript очищается если > 50MB
if [ "$TS_CACHE_SIZE" -gt 50 ]; then

# Кэш Vite очищается если > 100MB
if [ "$VITE_CACHE_SIZE" -gt 100 ]; then

# Кэш Cursor очищается если > 2GB
if [ "$CURSOR_CACHE_SIZE" -gt 2048 ]; then
```

---

## 🔍 Проверка работы

### 1. Проверить что задача запущена:

```bash
launchctl list | grep cursor-cleanup
```

Должно показать что-то вроде:
```
12345	0	com.dimka.cursor-cleanup
```

### 2. Проверить логи:

```bash
tail -20 ~/Library/Logs/cursor-auto-cleanup.log
```

Должны быть записи с временными метками.

### 3. Запустить вручную для теста:

```bash
./auto-cleanup-hourly.sh
cat ~/Library/Logs/cursor-auto-cleanup.log | tail -10
```

---

## ❌ Удаление

Если хотите полностью удалить автоматическую очистку:

```bash
./uninstall-auto-cleanup.sh
```

Или вручную:

```bash
launchctl unload ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
rm ~/Library/LaunchAgents/com.dimka.cursor-cleanup.plist
```

---

## 💡 Советы

1. **Проверяйте логи раз в неделю** - убедитесь что все работает
2. **Не удаляйте скрипты** - они нужны для работы автоматической очистки
3. **Можно запускать вручную** - если нужно очистить прямо сейчас
4. **Настройте пороги** - если очистка слишком частая или редкая

---

## 🐛 Решение проблем

### Задача не запускается:

```bash
# Проверить ошибки
cat ~/Library/Logs/cursor-auto-cleanup.error.log

# Переустановить
./uninstall-auto-cleanup.sh
./install-auto-cleanup.sh
```

### Очистка не работает:

```bash
# Проверить права на скрипт
ls -l auto-cleanup-hourly.sh

# Должно быть: -rwxr-xr-x
# Если нет - исправить:
chmod +x auto-cleanup-hourly.sh
```

### Логи не создаются:

```bash
# Создать директорию логов вручную
mkdir -p ~/Library/Logs

# Проверить права
ls -ld ~/Library/Logs
```

---

**Последнее обновление:** 2025-11-23

