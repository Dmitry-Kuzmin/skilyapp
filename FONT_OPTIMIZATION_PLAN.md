# 🔤 План оптимизации шрифтов

**Дата:** 5 декабря 2025  
**Цель:** Улучшить FCP и LCP через оптимизацию загрузки шрифтов

## 📊 Текущая ситуация

### Используемые шрифты:
- Системные шрифты: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Кастомные шрифты: Проверяется

### Текущая оптимизация:
- ✅ `font-display: swap` уже добавлен в CSS
- ✅ `preconnect` для Google Fonts (если используются)
- ⚠️ Нет preload для критичных шрифтов

## 🎯 План действий

### Шаг 1: Определить используемые шрифты
- [ ] Проверить, используются ли Google Fonts
- [ ] Проверить, есть ли кастомные шрифты
- [ ] Определить критичные шрифты (для LCP элемента)

### Шаг 2: Оптимизировать загрузку шрифтов
- [ ] Добавить preload для критичных шрифтов
- [ ] Убедиться, что `font-display: swap` работает
- [ ] Оптимизировать формат шрифтов (woff2)

### Шаг 3: Проверить влияние на метрики
- [ ] Запустить PageSpeed Insights
- [ ] Проверить FCP и LCP
- [ ] Сравнить с предыдущими результатами

## 📝 Технические детали

### Если используются Google Fonts:
```html
<!-- Preconnect для ускорения -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="dns-prefetch" href="https://fonts.gstatic.com" />

<!-- Preload критичного шрифта -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style" />
```

### Если используются кастомные шрифты:
```html
<!-- Preload критичного шрифта -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin />
```

## 🎯 Ожидаемые результаты

После оптимизации:
- **FCP:** Улучшение на 200-500ms
- **LCP:** Улучшение на 300-600ms (если LCP - текст)
- **Performance Score:** +2-5 баллов

