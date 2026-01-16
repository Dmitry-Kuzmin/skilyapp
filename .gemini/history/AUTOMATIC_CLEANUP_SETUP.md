# Автоматическая очистка и оптимизация Cursor/проекта

## ✅ Что настроено

Настроена автоматическая система очистки и оптимизации, которая работает **3 раза в день**:
- **08:00** утра
- **14:00** дня  
- **20:00** вечера

## 📋 Что делает скрипт

Скрипт `scripts/cleanup-and-optimize.sh` автоматически:

1. **Останавливает зависшие процессы** Node/Vite, которые могут загружать систему
2. **Очищает логи Cursor** (удаляет старые > 7 дней, обрезает большие)
3. **Очищает кеши Vite** (.vite, node_modules/.vite, dist)
4. **Оптимизирует npm кеш** (проверяет и сжимает)
5. **Удаляет временные файлы** (.tmp, .DS_Store)
6. **Очищает старые сборки** (> 7 дней)
7. **Очищает старые скриншоты** (> 14 дней) 📸
8. **Проверяет использование диска** и логирует информацию

## 📁 Где находятся файлы

- **Скрипт**: `/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep/scripts/cleanup-and-optimize.sh`
- **LaunchAgent**: `~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist`
- **Логи очистки**: `~/Library/Logs/cursor-cleanup.log`
- **Логи ошибок**: `~/Library/Logs/cursor-cleanup-error.log`

## 🔧 Управление LaunchAgent

### Проверить статус
```bash
launchctl list | grep cursor-cleanup
```

### Остановить автоматический запуск
```bash
launchctl unload ~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist
```

### Запустить снова
```bash
launchctl load ~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist
```

### Запустить скрипт вручную (сейчас)
```bash
cd ~/Desktop/Sdadim/sdadim-dgt-prep
./scripts/cleanup-and-optimize.sh
```

### Очистить большие файлы Cursor (одноразовая очистка)
⚠️ **ВАЖНО**: Этот скрипт удаляет большие файлы Cursor (backup базы данных, старую историю).
Рекомендуется закрыть Cursor перед запуском.

```bash
cd ~/Desktop/Sdadim/sdadim-dgt-prep
./scripts/cleanup-cursor-large-files.sh
```

Этот скрипт:
- Удаляет backup базы данных (`state.vscdb.backup` - ~4.2GB) ✅ Безопасно
- Удаляет старую историю (> 30 дней) ✅ Безопасно
- Удаляет старые рабочие области (> 30 дней) ✅ Безопасно
- Опционально удаляет основную базу данных (`state.vscdb`) ⚠️ С потерей некоторых настроек

**Ожидаемый результат**: Освобождение ~6-8GB дискового пространства

### Посмотреть логи
```bash
tail -f ~/Library/Logs/cursor-cleanup.log
```

## ⚠️ Важно

- Скрипт **не удаляет** важные файлы проекта
- Скрипт **не трогает** `node_modules` (только кеши внутри)
- Скрипт **останавливает** только процессы Vite/Node, не все процессы
- Логи Cursor очищаются аккуратно (только старые > 7 дней)

## 🔍 Текущее состояние системы

- **Использование диска**: 90% (21GB свободно из 228GB)
- **Размер Cursor**: ~12GB (слишком много!)
  - `globalStorage`: 8.8GB (база данных `state.vscdb` - 4.5GB + backup - 4.2GB)
  - `workspaceStorage`: 1.9GB
    - **Скриншоты**: 1.9GB (1354 файла!) 📸
  - `History`: 136MB
- ⚠️ **Рекомендация**: 
  1. Запустите скрипт очистки больших файлов Cursor (см. ниже)
  2. Читайте `HOW_TO_REPORT_ISSUES.md` - как эффективно сообщать о проблемах без избыточных скриншотов

## 🚀 Рекомендации

1. **Регулярно проверяйте логи** очистки, чтобы видеть, что происходит
2. **Если диск заполнен > 95%** - система может тормозить, нужно вручную освободить место
3. **Если нужно изменить расписание** - отредактируйте `.plist` файл и перезагрузите LaunchAgent

## 📝 Изменение расписания

Отредактируйте файл:
```bash
nano ~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist
```

Измените секцию `StartCalendarInterval` для другого времени, например:
```xml
<key>StartCalendarInterval</key>
<array>
    <dict>
        <key>Hour</key>
        <integer>9</integer>  <!-- 9 утра -->
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</array>
```

Затем перезагрузите:
```bash
launchctl unload ~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist
launchctl load ~/Library/LaunchAgents/com.skilyapp.cursor-cleanup.plist
```

## 🆘 Если что-то пошло не так

1. Проверьте логи ошибок: `cat ~/Library/Logs/cursor-cleanup-error.log`
2. Проверьте, что скрипт исполняемый: `chmod +x scripts/cleanup-and-optimize.sh`
3. Запустите скрипт вручную и проверьте вывод
4. Убедитесь, что путь к проекту правильный в скрипте


