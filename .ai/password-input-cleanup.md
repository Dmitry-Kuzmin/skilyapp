# Password Input Cleanup Plan

## Проблема:
Перебор элементов в Input пароля: иконка ключа (менеджер) + глаз + текст "Забыли?" = каша

## Решение:

### 1. Убрать из Input:
- `additionalRightElement` с текстом "Забыли пароль?"

### 2. Вынести наружу:
```tsx
<div className="flex justify-end mt-1.5">
  <button
    type="button"
    onClick={() => setStep('password-recovery')}
    className="text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
  >
    Забыли?
  </button>
</div>
```

### 3. Изменить padding:
- `pr-10` → `pr-14` чтобы точки/текст не налезали на иконки

### 4. Увеличить spacing:
- `mt-6` → `mt-8` (32px) между блоком пароля и кнопкой "Войти"

## Файлы:
- `src/components/AuthModalNew.tsx` - строки 1130-1163
