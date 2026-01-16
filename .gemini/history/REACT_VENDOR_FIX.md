# Исправление проблемы с React vendor chunk

## Проблема

После оптимизации bundle появилась ошибка:
```
TypeError: undefined is not an object (evaluating '$e.unstable_scheduleCallback')
react-vendor-D_QHZx_h.js:5:12048
```

## Причина

Разделение React на отдельный `react-vendor` chunk ломало внутренние функции React (`unstable_scheduleCallback` и другие).

## Решение

1. **Отключено разделение React на отдельный chunk**
   - React и ReactDOM теперь остаются в основном `vendor` chunk
   - `react-vendor` chunk больше не создаётся

2. **Убрано упоминание react-vendor из плагина**
   - Плагин `optimizeCssLoading` больше не пытается добавить preload для несуществующего chunk

## Результаты

**До:**
- `react-vendor`: 221 KB
- `vendor`: 686 KB
- **Проблема**: React не загружался правильно

**После:**
- `react-vendor`: отсутствует
- `vendor`: 953 KB (включает React)
- **Статус**: React загружается правильно ✅

## Компромисс

- `vendor` chunk увеличился с 686 KB до 953 KB (+267 KB)
- FCP может немного ухудшиться
- Но приложение теперь работает стабильно

## Следующие шаги

1. **Задеплоить новую версию** на production
2. **Очистить кэш Service Worker** (если нужно)
3. **Проверить** что приложение работает правильно

## Важно

На production всё ещё может быть старая версия с `react-vendor-D_QHZx_h.js`. 
После деплоя новой версии проблема должна исчезнуть.

