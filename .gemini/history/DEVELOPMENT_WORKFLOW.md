# 🛠️ Workflow разработки при активных пользователях

## 🎯 Проблема
- Пользователи уже используют приложение в продакшене
- Нужно экспериментировать с новыми фичами (сезоны, изменения)
- Нельзя ломать работающее приложение

---

## ✅ Решение: Ветки + Preview Deployments

### 📋 Стратегия разработки

#### 1. **Production (main/master)** — стабильная версия для пользователей
- ✅ Только проверенный, стабильный код
- ✅ Деплоится на основной домен (skilyapp.com)
- ✅ Используется реальными пользователями
- ⚠️ **НЕ экспериментируй тут!**

#### 2. **Feature ветки** — экспериментальные фичи
- 🔬 Разработка новых фич (сезоны, улучшения)
- 🧪 Тестирование без влияния на продакшн
- 📦 Автоматические Preview Deployments в Vercel

#### 3. **Preview Deployments** — тестовые версии
- 🚀 Vercel автоматически создаёт preview для каждой ветки
- 🔗 Уникальный URL для каждого деплоя
- ✅ Можно тестировать перед слиянием в main

---

## 🔄 Workflow: Как работать с экспериментами

### Шаг 1: Создать feature ветку

```bash
# Переключись на main и обнови
git checkout main
git pull origin main

# Создай новую ветку для эксперимента
git checkout -b feature/seasons-improvements

# Или для сезонов:
git checkout -b feature/season-experiments
```

### Шаг 2: Делай изменения

```bash
# Работай над изменениями
# Редактируй файлы, экспериментируй

# Коммить регулярно
git add .
git commit -m "feat: эксперимент с сезонами"
```

### Шаг 3: Push в GitHub — Vercel создаст Preview

```bash
# Отправь ветку в GitHub
git push origin feature/seasons-improvements
```

**Что произойдёт автоматически:**
1. ✅ Vercel увидит новую ветку
2. ✅ Создаст **Preview Deployment**
3. ✅ Дам тебе уникальный URL (например: `sdadim-dgt-prep-git-feature-seasons-improvements-...vercel.app`)
4. ✅ Этот URL **НЕ доступен пользователям** — только тебе!

### Шаг 4: Тестируй Preview

1. Открой Preview URL из Vercel Dashboard
2. Протестируй все изменения
3. Убедись, что всё работает
4. Можно дать ссылку другим разработчикам для тестирования

### Шаг 5: Слияние в main (когда готово)

```bash
# Переключись на main
git checkout main
git pull origin main

# Слей feature ветку
git merge feature/seasons-improvements

# Push в main — это запустит Production деплой
git push origin main
```

**Что произойдёт:**
1. ✅ Vercel создаст **Production Deployment**
2. ✅ Обновит основной сайт (skilyapp.com)
3. ✅ Пользователи получат новую версию

---

## 🎛️ Дополнительная защита: Feature Flags

### Что такое Feature Flags?

Переключатели для включения/выключения фич без деплоя.

### Пример использования:

```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  // Новый функционал сезонов
  newSeasonsUI: import.meta.env.VITE_FEATURE_NEW_SEASONS === 'true',
  
  // Экспериментальные изменения
  experimentalFeatures: import.meta.env.VITE_FEATURE_EXPERIMENTAL === 'true',
};

// Использование в коде
if (featureFlags.newSeasonsUI) {
  // Новый код сезонов
} else {
  // Старый код
}
```

### Настройка в Vercel:

1. **Settings** → **Environment Variables**
2. Добавь переменные для Preview/Development:
   - `VITE_FEATURE_NEW_SEASONS=true` (для preview)
   - `VITE_FEATURE_NEW_SEASONS=false` (для production)
3. Или оставь в production `false` пока не готово

**Преимущества:**
- ✅ Можно включить фичу только в preview
- ✅ Быстро отключить если что-то сломалось
- ✅ Постепенный rollout (включить для части пользователей)

---

## 📊 Организация веток

### Рекомендуемая структура:

```
main (production)
  ├── feature/seasons-improvements (эксперименты с сезонами)
  ├── feature/duel-changes (изменения дуэлей)
  ├── fix/dashboard-bug (исправление багов)
  └── refactor/admin-panel (рефакторинг)
```

### Типы веток:

- `feature/*` — новые фичи
- `fix/*` — исправления багов
- `refactor/*` — рефакторинг кода
- `experiment/*` — эксперименты (можно удалить)

---

## 🔐 Защита Production

### 1. Защита ветки main (опционально, но рекомендуется)

В GitHub:
1. **Settings** → **Branches** → **Add branch protection rule**
2. Выбери `main`
3. Включи:
   - ✅ **Require pull request reviews** (нужно одобрение перед merge)
   - ✅ **Require status checks to pass** (проверки должны пройти)
   - ✅ **Require branches to be up to date** (ветка должна быть актуальной)

**Преимущества:**
- Нельзя случайно сломать production
- Нужно создать Pull Request для изменений
- Можно обсудить изменения перед merge

### 2. Pull Requests для изменений

```bash
# Создай PR в GitHub
# 1. Push feature ветку
git push origin feature/seasons-improvements

# 2. В GitHub создай Pull Request:
#    main ← feature/seasons-improvements
# 3. Проверь что Preview Deployment работает
# 4. Обсуди изменения (если нужно)
# 5. Merge PR когда готово
```

---

## 🧪 Тестирование перед Production

### Чеклист перед merge в main:

- [ ] Preview Deployment работает без ошибок
- [ ] Все фичи протестированы
- [ ] Нет ошибок в консоли браузера
- [ ] Нет ошибок в Vercel Build Logs
- [ ] Переменные окружения настроены
- [ ] Проверено на разных устройствах (если важно)

---

## 🚀 Пример: Эксперимент с сезонами

### День 1: Начало эксперимента

```bash
# Создай ветку
git checkout -b feature/season-ui-redesign

# Сделай изменения
# ... работай над кодом ...

# Коммить
git add .
git commit -m "feat: новый дизайн UI сезонов"

# Push - Vercel создаст Preview
git push origin feature/season-ui-redesign
```

### День 2-3: Тестирование

1. Открой Preview URL из Vercel
2. Тестируй изменения
3. Если нужно исправить:
   ```bash
   # Исправь баги
   git add .
   git commit -m "fix: исправление багов в сезонах"
   git push origin feature/season-ui-redesign
   # Vercel обновит Preview автоматически
   ```

### День 4: Готово к Production

```bash
# Создай Pull Request в GitHub
# Проверь что всё работает
# Merge PR в main

# Или вручную:
git checkout main
git merge feature/season-ui-redesign
git push origin main  # Production деплой запустится автоматически
```

### День 5: Очистка

```bash
# Удали feature ветку (уже не нужна)
git branch -d feature/season-ui-redesign
git push origin --delete feature/season-ui-redesign
```

---

## 📋 Быстрые команды

```bash
# Создать новую feature ветку
git checkout -b feature/my-feature

# Переключиться на main
git checkout main

# Обновить main
git pull origin main

# Посмотреть все ветки
git branch -a

# Удалить локальную ветку
git branch -d feature/old-feature

# Удалить удалённую ветку
git push origin --delete feature/old-feature
```

---

## 💡 Советы

1. **Держи main стабильным** — только проверенный код
2. **Используй Preview** — тестируй всё перед production
3. **Маленькие изменения** — проще откатить и протестировать
4. **Коммить часто** — проще найти проблему
5. **Feature Flags** — для постепенного включения фич

---

## 🆘 Если что-то сломалось в Production

### Срочное исправление:

```bash
# Создай hotfix ветку от main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Исправь баг
git add .
git commit -m "fix: критический баг"
git push origin hotfix/critical-bug

# Сразу merge в main
git checkout main
git merge hotfix/critical-bug
git push origin main  # Production обновится
```

---

**Главное правило:** Production (main) = стабильность. Экспериментируй в feature ветках! 🎯

