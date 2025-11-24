# 🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ: Cursor тормозит и виснет

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ

1. **Load Average: 191.82** - система полностью перегружена
2. **GPU процесс Cursor: 97.7% CPU** - критическая нагрузка
3. **Renderer процесс: 68.6% CPU, 764MB памяти**
4. **Кэш Cursor: 9.6GB** - огромный размер

---

## ⚡ ЭКСТРЕННЫЕ ДЕЙСТВИЯ (ВЫПОЛНИТЬ СЕЙЧАС)

### Шаг 1: Закройте Cursor полностью

1. Нажмите `Cmd + Q` чтобы полностью закрыть Cursor
2. Или через Activity Monitor: найдите "Cursor" → Quit

### Шаг 2: Очистите кэш Cursor

```bash
# Очистить кэш Cursor (9.6GB!)
rm -rf ~/Library/Application\ Support/Cursor/Cache/*
rm -rf ~/Library/Application\ Support/Cursor/CachedData/*
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache/*
rm -rf ~/Library/Application\ Support/Cursor/GPUCache/*
rm -rf ~/Library/Caches/com.todesktop.230313mzl4w4u92/*
```

### Шаг 3: Очистите кэш TypeScript

```bash
rm -rf ~/Library/Caches/typescript/*
```

### Шаг 4: Очистите кэш проекта

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist
find . -name "*.tsbuildinfo" -delete
```

### Шаг 5: Перезагрузите Mac

Это критично для очистки всей памяти и процессов.

---

## 🛠️ ПОСЛЕ ПЕРЕЗАГРУЗКИ

### 1. Настройте Cursor для меньшего использования ресурсов

**ВАЖНО:** Выполните это ПОСЛЕ перезагрузки Mac!

Создайте/обновите файл настроек Cursor:

**Путь:** `~/Library/Application Support/Cursor/User/settings.json`

**Или через Cursor:** `Cmd + ,` → найдите "settings.json" → "Edit in settings.json"

Добавьте следующие настройки:

```json
{
  "typescript.tsserver.maxTsServerMemory": 2048,
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": [
      "**/node_modules",
      "**/dist",
      "**/.vite",
      "**/data/pdf"
    ]
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.vite/**": true,
    "**/data/pdf/**": true,
    "**/.git/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.vite": true,
    "**/data/pdf": true
  },
  "files.exclude": {
    "**/.vite": true,
    "**/dist": true
  },
  "editor.semanticHighlighting.enabled": false,
  "editor.bracketPairColorization.enabled": false,
  "editor.guides.bracketPairs": false
}
```

### 2. Отключите ненужные расширения

Откройте Cursor → Extensions → отключите:
- Неиспользуемые расширения
- Тяжелые расширения (если не нужны)

### 3. Используйте `.cursorignore`

Убедитесь, что файл `.cursorignore` существует и содержит:

```
# Большие файлы
data/pdf/*.pdf
*.pdf

# Кэш
node_modules/.vite
.vite
dist
.cache

# Логи
*.log
logs/

# Системные
.DS_Store
*.tsbuildinfo
```

### 4. Ограничьте количество открытых файлов

- Не открывайте больше 10-15 файлов одновременно
- Закрывайте неиспользуемые вкладки

---

## 🔍 МОНИТОРИНГ

После перезагрузки проверьте:

```bash
# Load Average должен быть < 4.0
uptime

# Память Cursor должна быть < 500MB
ps aux | grep -i cursor | grep -v grep | awk '{print $6/1024 " MB"}'

# Кэш Cursor должен быть < 1GB
du -sh ~/Library/Application\ Support/Cursor
```

---

## 🚨 ЕСЛИ ПРОБЛЕМЫ ПРОДОЛЖАЮТСЯ

### Вариант 1: Переустановите Cursor

1. Удалите Cursor полностью:
```bash
rm -rf ~/Library/Application\ Support/Cursor
rm -rf ~/Library/Caches/com.todesktop.230313mzl4w4u92
```

2. Скачайте и установите заново с официального сайта

### Вариант 2: Используйте другой редактор

Временно используйте другой редактор (VS Code, Antigravity) пока проблема не решена.

---

## 📊 НОРМАЛЬНЫЕ ЗНАЧЕНИЯ

- **Load Average:** < 4.0
- **CPU Cursor:** < 20%
- **Память Cursor:** < 500MB
- **Кэш Cursor:** < 1GB

---

**ВАЖНО:** Выполните все шаги по порядку, особенно перезагрузку Mac!

