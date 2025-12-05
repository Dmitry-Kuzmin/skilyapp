# Диагностика производительности - Резюме

**Дата**: 2025-12-05  
**Статус**: В процессе

## ✅ Шаг 1: Skeleton в production - ПРОВЕРЕНО

### Результаты:
- ✅ **Skeleton найден** в production HTML
- ✅ **CSS inline** в `<style>` теге - правильно
- ✅ **HTML структура** присутствует (app-skeleton, skeleton-header, skeleton-cards)
- ✅ **4 упоминания** "app-skeleton" в HTML

### Проверка:
```bash
curl https://skilyapp.com/ | grep -c "app-skeleton"
# Результат: 4
```

### Вывод:
Skeleton задеплоен в production. **НО** нужно проверить:
- Виден ли он в filmstrip PageSpeed?
- Не скрыт ли он стилями при загрузке?
- Появляется ли он ДО загрузки JS?

## ✅ Шаг 2: Bundle Analysis - ЗАВЕРШЁН

### Критические проблемы найдены:

#### 1. Vendor chunk ОГРОМНЫЙ: **1.9 MB** 🔴
```
dist/assets/vendor-VnlWCuTJ.js    1,982.64 kB │ gzip: 595.00 kB
```

**Это "убийца" FCP на мобильном интернете!**

**Проблема**: Наше разделение на chunks работает частично:
- ✅ `react-vendor` создан (221 KB)
- ✅ `data-vendor` создан (208 KB)
- ✅ `ui-vendor` создан (111 KB)
- ❌ Но `vendor` chunk всё ещё **2MB**!

**Что проверить**:
- Что именно в vendor chunk? (открыть `dist/stats.html`)
- Почему не попали в отдельные chunks?
- Есть ли там recharts? (должен быть в charts chunk)

#### 2. Index chunk большой: **661 KB**
```
dist/assets/index-5AJGQDmP.js    661.28 kB │ gzip: 194.49 kB
```

**Проблема**: Основной код приложения слишком большой.

#### 3. Charts chunk отсутствует
**Ожидалось**: `charts-*.js` с recharts  
**Реальность**: Charts chunk не появился

**Возможные причины**:
- recharts не используется в production
- recharts попал в vendor chunk
- Нужно проверить где используется recharts

### Что работает хорошо:

| Chunk | Размер | Gzip | Статус |
|-------|--------|------|--------|
| `react-vendor` | 221.38 kB | 73.11 kB | ✅ Хорошо |
| `data-vendor` | 208.68 kB | 54.52 kB | ✅ Хорошо |
| `ui-vendor` | 111.37 kB | 36.76 kB | ✅ Хорошо |

**Вывод**: Разделение работает, но **vendor chunk всё ещё огромный**.

## 📊 Суммарный размер критичных chunks

### Initial load (загружаются сразу):
- `vendor` - **1,982.64 kB** (gzip: 595.00 kB) 🔴
- `index` - **661.28 kB** (gzip: 194.49 kB) 🔴
- `react-vendor` - **221.38 kB** (gzip: 73.11 kB) ✅
- `data-vendor` - **208.68 kB** (gzip: 54.52 kB) ✅
- `ui-vendor` - **111.37 kB** (gzip: 36.76 kB) ✅

**Итого initial load**: ~3.2 MB (gzip: ~950 KB)

**Проблема**: На медленном 4G (PageSpeed тестирует) это **убийца FCP**!

## 🎯 Следующие шаги

### 1. Анализ stats.html (СЕЙЧАС)
**Файл**: `dist/stats.html` (открыт в браузере)

**Что искать**:
- Самые тяжёлые зависимости в vendor chunk
- Есть ли recharts в vendor? (должен быть в charts)
- Зависимости которые "жрут" >30-40% vendor chunk
- Что в index chunk? (можно ли что-то вынести)

### 2. Network Waterfall анализ
**Как проверить**:
```bash
Chrome DevTools → Network tab
Throttling: Slow 4G
Reload страницу
Посмотреть waterfall:
- Какие ресурсы грузятся до FCP?
- Что блокирует рендеринг?
- Размеры chunks в сети
```

### 3. Проверка skeleton в filmstrip
**Как проверить**:
- PageSpeed отчёт → Performance → Filmstrip
- Виден ли skeleton в первые секунды?
- Или первые кадры белые?

## 🔍 Гипотезы

### Почему FCP 6.4s?

**Гипотеза 1**: Vendor chunk 2MB блокирует FCP
- На медленном 4G загрузка 2MB занимает ~4-5 секунд
- Браузер ждёт загрузки JS перед рендерингом skeleton?

**Гипотеза 2**: Skeleton не виден из-за render-blocking CSS
- Хотя CSS inline, может быть проблема с другими CSS файлами
- Нужно проверить filmstrip

**Гипотеза 3**: Последовательная загрузка chunks
- Chunks грузятся не параллельно?
- Нужно проверить Network waterfall

## 📝 Выводы

### Что найдено:
1. ✅ Skeleton задеплоен в production
2. 🔴 Vendor chunk огромный (2MB) - критично
3. 🔴 Index chunk большой (661KB)
4. ⚠️ Charts chunk отсутствует (recharts где-то?)

### Что нужно проверить:
1. Что в vendor chunk? (stats.html)
2. Network waterfall (DevTools)
3. Skeleton в filmstrip (PageSpeed)

### Приоритет исправлений:
1. **КРИТИЧНО**: Уменьшить vendor chunk (найти тяжёлые зависимости)
2. **ВАЖНО**: Оптимизировать index chunk
3. **ВАЖНО**: Проверить почему charts не отделился

---

**Следующий шаг**: Анализ stats.html для поиска тяжёлых зависимостей в vendor chunk.

