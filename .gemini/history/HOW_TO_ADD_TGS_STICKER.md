# Как добавить анимированный стикер .tgs в качестве иконки звезды

## Вариант 1: Использовать готовую иконку Star (уже добавлено) ✅
Иконка Star из lucide-react уже добавлена в StarsPaymentButton.

## Вариант 2: Добавить анимированный .tgs стикер

### Шаг 1: Установить библиотеку Lottie
```bash
npm install lottie-react
```

### Шаг 2: Конвертировать .tgs в JSON
.tgs файлы - это gzip архивы с JSON внутри. Нужно распаковать:

```bash
# Если у вас есть .tgs файл
gunzip -c sticker.tgs > sticker.json
```

Или используйте онлайн конвертер:
- https://tgs-to-json.com/
- https://ezgif.com/tgs-to-json

### Шаг 3: Добавить JSON файл в проект
Поместите распакованный JSON файл в `public/stickers/star.json`

### Шаг 4: Обновить компонент
```tsx
import Lottie from 'lottie-react';
import starAnimation from '@/public/stickers/star.json';

// В компоненте:
<Lottie 
  animationData={starAnimation} 
  style={{ width: 20, height: 20 }}
  loop={true}
  autoplay={true}
/>
```

## Вариант 3: Использовать готовый SVG/PNG
Если у вас есть SVG или PNG версия звезды, можно использовать её напрямую.

## Рекомендация
Для простоты лучше использовать готовую иконку Star из lucide-react (уже добавлено).
Если нужна именно анимация - используйте вариант 2 с Lottie.
