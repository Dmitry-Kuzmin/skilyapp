# Popup Detox - Финальный План

## Текущая ситуация
Попап авторизации перегружен визуальными эффектами - две яркие кнопки конкурируют за внимание, слишком много свечений.

## Изменения:

### 1. Magic Link → Ghost Button ✅
**Было:** Синяя фулл-кнопка с градиентом
**Станет:** Прозрачная кнопка с синим текстом

### 2. Частицы только на Hover ✅  
**Было:** ParticleEmitter всегда активен
**Станет:** `isActive={isButtonHovered && !isInputFocused}`

### 3. Упрощенная аура (без blur) ✅
**Было:** boxShadow + blur который не работает
**Станет:** Простой радиальный градиент + тонкая border

### 4. Backdrop затемнение ✅
**Было:** `bg-black/70`
**Нужно:** Проверить что уже применено

### 5. Убрать TestAuraButton из production
**Только в DEV режиме**

## Файлы для изменения:
1. `src/components/AuthModalNew.tsx` - Magic Link button, header
2. `src/components/ui/responsive-modal.tsx` - backdrop (уже сделано)
3. `src/pages/Landing.tsx` - убрать TestAuraButton (опционально оставить в DEV)
