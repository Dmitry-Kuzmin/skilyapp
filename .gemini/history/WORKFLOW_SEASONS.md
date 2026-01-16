# 🌱 Как безопасно экспериментировать с сезонами

## 🎯 Проблема
- Пользователи уже используют приложение
- Нужно экспериментировать с сезонами
- Нельзя ломать работающее приложение

---

## ✅ Решение: Feature ветки + Preview Deployments

### 📋 Стратегия

#### 1. **main (production)** — стабильная версия для пользователей
- ✅ Только проверенный, рабочий код
- ✅ Деплоится на основной домен (skilyapp.com)
- ✅ Используется реальными пользователями
- ⚠️ **НЕ экспериментируй тут!**

#### 2. **Feature ветки** — экспериментальные фичи
- 🔬 Разработка новых фич (сезоны, улучшения)
- 🧪 Тестирование без влияния на продакшн
- 📦 Vercel CLI создаёт preview для каждой ветки

#### 3. **Preview Deployments** — тестовые версии
- 🚀 Vercel CLI создаёт preview при деплое feature ветки
- 🔗 Уникальный URL для каждого деплоя
- ✅ Можно тестировать перед слиянием в main

---

## 🔄 Workflow: Эксперимент с сезонами

### Шаг 1: Создать feature ветку

```bash
# Переключись на main и обнови
git checkout main
git pull origin main

# Создай новую ветку для эксперимента
git checkout -b feature/seasons-experiments
```

### Шаг 2: Делай изменения

```bash
# Работай над сезонами, экспериментируй
# Редактируй файлы, тестируй идеи

# Коммить регулярно
git add .
git commit -m "feat: эксперимент с UI сезонов"
```

### Шаг 3: Деплой в Preview (для тестирования)

```bash
# Деплой в preview (НЕ production!)
vercel --yes
```

**Что произойдёт:**
1. ✅ Vercel создаст Preview Deployment
2. ✅ Дам тебе уникальный URL (например: `sdadim-dgt-prep-...vercel.app`)
3. ✅ Этот URL **НЕ доступен пользователям** — только тебе!
4. ✅ Можно тестировать все изменения

**Важно:** `vercel` (без `--prod`) = preview, безопасно для тестирования!

### Шаг 4: Тестируй Preview

1. Открой Preview URL из вывода команды
2. Протестируй все изменения с сезонами
3. Убедись, что всё работает
4. Если нужно исправить:
   ```bash
   # Исправь баги
   git add .
   git commit -m "fix: исправление багов в сезонах"
   
   # Задеплой preview снова
   vercel --yes
   # Vercel обновит тот же preview URL
   ```

### Шаг 5: Когда готово — слить в main

```bash
# Переключись на main
git checkout main
git pull origin main

# Слей feature ветку
git merge feature/seasons-experiments

# Push в main
git push origin main

# Деплой в production (теперь пользователи получат изменения)
vercel --prod --yes
```

---

## 🛡️ Дополнительная защита: Feature Flags

### Что такое Feature Flags?

Переключатели для включения/выключения фич без нового деплоя.

### Пример для сезонов:

```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  // Новый UI сезонов
  newSeasonsUI: import.meta.env.VITE_FEATURE_NEW_SEASONS === 'true',
  
  // Экспериментальные функции сезонов
  experimentalSeasonFeatures: import.meta.env.VITE_FEATURE_SEASONS_EXP === 'true',
};

// Использование в коде
if (featureFlags.newSeasonsUI) {
  // Новый код сезонов
  return <NewSeasonsComponent />;
} else {
  // Старый код
  return <OldSeasonsComponent />;
}
```

### Настройка в Vercel:

**Для Preview (эксперименты):**
1. Vercel Dashboard → Settings → Environment Variables
2. Добавь для **Preview**:
   - `VITE_FEATURE_NEW_SEASONS=true`
   - `VITE_FEATURE_SEASONS_EXP=true`

**Для Production (стабильно):**
- `VITE_FEATURE_NEW_SEASONS=false` (выключено для пользователей)
- Или не добавляй вовсе (по умолчанию `false`)

**Преимущества:**
- ✅ Можно включить фичу только в preview для теста
- ✅ Быстро отключить если что-то сломалось
- ✅ Постепенный rollout (включить для части пользователей)

---

## 📊 Пример: Эксперимент с сезонами

### День 1: Начало эксперимента

```bash
# Создай ветку
git checkout main
git pull origin main
git checkout -b feature/seasons-ui-redesign

# Работай над изменениями
# ... редактируй файлы ...

# Коммить
git add .
git commit -m "feat: новый дизайн UI сезонов"

# Деплой в preview (для теста)
vercel --yes
```

### День 2-3: Тестирование

1. Открой Preview URL из Vercel CLI
2. Тестируй изменения
3. Если нужно исправить:
   ```bash
   # Исправь баги
   git add .
   git commit -m "fix: исправление багов в сезонах"
   
   # Обнови preview
   vercel --yes
   ```

### День 4: Готово к Production

```bash
# Всё протестировано и работает
git checkout main
git merge feature/seasons-ui-redesign
git push origin main

# Деплой в production (пользователи получат изменения)
vercel --prod --yes
```

### День 5: Очистка

```bash
# Удали feature ветку (уже не нужна)
git branch -d feature/seasons-ui-redesign
git push origin --delete feature/seasons-ui-redesign
```

---

## 🔐 Защита Production

### Правило №1: main = стабильность

- ✅ Только проверенный код
- ✅ Только после тестирования в preview
- ✅ Только когда уверен, что работает

### Правило №2: Экспериментируй в feature ветках

- ✅ Все эксперименты в отдельных ветках
- ✅ Тестируй в preview перед merge
- ✅ Не мержить, если не готово

---

## 📋 Быстрые команды

```bash
# Создать новую feature ветку
git checkout -b feature/seasons-experiments

# Переключиться на main
git checkout main

# Обновить main
git pull origin main

# Деплой в preview (безопасно для тестов)
vercel --yes

# Деплой в production (для пользователей)
vercel --prod --yes

# Посмотреть все ветки
git branch -a

# Удалить локальную ветку
git branch -d feature/old-feature

# Удалить удалённую ветку
git push origin --delete feature/old-feature
```

---

## 🎯 Чеклист для экспериментов с сезонами

- [ ] Создал feature ветку от main
- [ ] Делаю изменения в feature ветке
- [ ] Деплою в preview через `vercel --yes`
- [ ] Тестирую Preview URL
- [ ] Всё работает → merge в main
- [ ] Деплой в production через `vercel --prod --yes`
- [ ] Пользователи получают изменения безопасно

---

## 💡 Советы

1. **Держи main стабильным** — только проверенный код
2. **Используй preview** — тестируй всё перед production
3. **Маленькие изменения** — проще откатить и протестировать
4. **Feature Flags** — для постепенного включения фич
5. **Коммить часто** — проще найти проблему

---

## 🆘 Если что-то сломалось в Production

### Срочное исправление:

```bash
# Создай hotfix ветку от main
git checkout main
git pull origin main
git checkout -b hotfix/seasons-critical-bug

# Исправь баг
git add .
git commit -m "fix: критический баг в сезонах"

# Сразу merge в main
git checkout main
git merge hotfix/seasons-critical-bug
git push origin main

# Срочный деплой в production
vercel --prod --yes
```

---

**Главное правило:** Production (main) = стабильность. Экспериментируй в feature ветках с preview деплоем! 🎯

