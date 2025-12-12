# Настройки Paddle Checkout для SkilyApp

## 🎯 Важно: Мы используем Overlay mode!

В коде используется `displayMode: "overlay"`, поэтому **основные настройки нужно делать во вкладке "Overlay"**, а не "Inline"!

---

## 📋 Пошаговая инструкция

### 1. Вкладка "General" (Общие настройки)

**Default Payment Link:**
- Установите: `https://skilyapp.com/purchase`
- Это URL, куда Paddle будет редиректить после оплаты

**Success URL:**
- `https://skilyapp.com/purchase/success?transaction_id={transaction_id}`

**Cancel URL:**
- `https://skilyapp.com/purchase/cancel`

---

### 2. Вкладка "Overlay" ⭐ (ОСНОВНАЯ!)

Это главная вкладка для наших настроек, так как мы используем overlay mode.

#### Overall (Общие настройки)

**Background Color (Цвет фона):**
- `#0B0E14` или `#18181B` (zinc-950) - темный фон как в приложении

**Text Color (Цвет текста):**
- `#E4E4E7` или `#F4F4F5` (zinc-100) - светлый текст

#### Fonts (Шрифты)

**Family:**
- Выберите: **"Sans-serif"** или **"Lato"** (современный, читаемый)
- Fallback: **"Sans-serif"**

#### Focus State (Состояние фокуса)

**Focus Color:**
- `#8B5CF6` (violet-500) - фиолетовый цвет при фокусе на поле

**Focus Border Width:**
- `2px` или `3px`

#### Shadow Color (Цвет тени)

**Shadow:**
- `rgba(139, 92, 246, 0.15)` - легкое фиолетовое свечение
- Или `rgba(0, 0, 0, 0.3)` - темная тень

#### Border Color (Цвет границы)

**Border:**
- `rgba(255, 255, 255, 0.1)` - тонкая белая граница (10% прозрачности)
- Или `#3F3F46` (zinc-700) - темная граница

#### Buttons (Кнопки)

**Primary Button Background:**
- `#8B5CF6` (violet-500) - основной фиолетовый цвет
- Или `#10B981` (emerald-500) - мятный цвет для акцента

**Primary Button Text:**
- `#FFFFFF` (белый) - для контраста

**Primary Button Hover:**
- `#7C3AED` (violet-600) - более темный фиолетовый при наведении

**Button Border Radius:**
- `12px` или `0.75rem` - скругленные углы

**Button Padding:**
- Вертикальный: `12px`
- Горизонтальный: `24px`

#### Inputs (Поля ввода)

**Input Background:**
- `#18181B` (zinc-900) - темный фон поля

**Input Border:**
- `rgba(255, 255, 255, 0.1)` - тонкая белая граница

**Input Text:**
- `#E4E4E7` (zinc-100) - светлый текст

**Input Placeholder:**
- `#71717A` (zinc-500) - серый placeholder

**Input Border Radius:**
- `8px` или `0.5rem`

#### Checkout Padding

**Padding:**
- Выберите: **"Yes"** - добавляет отступы для лучшего вида

**Max Width:**
- `800px` или `900px` - максимальная ширина формы

---

### 3. Вкладка "Inline" (Опционально)

Если в будущем понадобится inline mode, настройки аналогичны Overlay.

**Fonts:**
- Family: **"Sans-serif"** или **"Lato"**
- Fallback: **"Sans-serif"**

**Checkout Padding:**
- **"Yes"**

**Max Width:**
- `643px` (можно оставить как есть) или `800px`

---

### 4. Вкладка "Recovery" (Восстановление)

**Recovery Email:**
- Установите email для восстановления платежей

**Recovery Link:**
- `https://skilyapp.com/purchase/recovery`

---

## 🎨 Рекомендуемая цветовая палитра

### Основные цвета:

- **Primary (Основной):** `#8B5CF6` (violet-500)
- **Secondary (Акцентный):** `#10B981` (emerald-500)
- **Background (Фон):** `#0B0E14` (zinc-950) или `#18181B` (zinc-900)
- **Text (Текст):** `#E4E4E7` (zinc-100)
- **Border (Граница):** `rgba(255, 255, 255, 0.1)` или `#3F3F46` (zinc-700)

### Цвета для кнопок:

- **Кнопка "Продолжить":** `#8B5CF6` (violet-500)
- **Hover:** `#7C3AED` (violet-600)
- **Текст кнопки:** `#FFFFFF` (белый)

---

## ✅ Чеклист настройки

- [ ] Вкладка "General": Настроен Default Payment Link
- [ ] Вкладка "Overlay": Настроен Background Color (#0B0E14)
- [ ] Вкладка "Overlay": Настроен Text Color (#E4E4E7)
- [ ] Вкладка "Overlay": Выбран шрифт (Sans-serif или Lato)
- [ ] Вкладка "Overlay": Настроен Focus Color (#8B5CF6)
- [ ] Вкладка "Overlay": Настроен Border Color (rgba(255,255,255,0.1))
- [ ] Вкладка "Overlay": Настроен Primary Button Background (#8B5CF6)
- [ ] Вкладка "Overlay": Настроен Input Background (#18181B)
- [ ] Вкладка "Overlay": Включен Checkout Padding (Yes)
- [ ] Нажата кнопка "Save" для сохранения всех изменений

---

## 🔍 Где проверить результат

После сохранения настроек:

1. Откройте магазин в приложении
2. Нажмите на кнопку покупки (например, "€9.99")
3. Должна открыться форма Paddle с новыми настройками
4. Проверьте:
   - Темный фон
   - Фиолетовая кнопка
   - Светлый текст
   - Скругленные углы

---

## 📝 Примечания

- **Важно:** Настройки применяются только после нажатия кнопки "Save"
- **Кэш:** Может потребоваться очистить кэш браузера или подождать несколько минут
- **Тестирование:** Проверьте в sandbox режиме перед продакшеном
- **Overlay vs Inline:** Мы используем Overlay, поэтому настройки Inline не влияют на наш checkout

---

## 🆘 Если что-то не работает

1. Убедитесь, что нажали "Save" в каждой вкладке
2. Проверьте, что используете правильную вкладку (Overlay, а не Inline)
3. Очистите кэш браузера
4. Проверьте, что в коде используется `theme: "dark"` (уже настроено)

