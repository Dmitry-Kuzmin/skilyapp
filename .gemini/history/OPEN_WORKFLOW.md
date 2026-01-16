# 🔗 Как открыть и запустить workflow

## Проблема

Workflow находится в ветке `feature/premium-race-game`, а GitHub Actions показывает workflows из ветки `main` по умолчанию.

## ✅ Решение: Открыть workflow в правильной ветке

### Способ 1: Прямая ссылка на workflow в feature ветке

Откройте эту ссылку в браузере:

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml?query=branch%3Afeature%2Fpremium-race-game
```

Или:

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/blob/feature/premium-race-game/.github/workflows/stars-payment-retry.yml
```

Затем нажмите кнопку **"Actions"** вверху страницы.

---

### Способ 2: Переключиться на ветку в GitHub UI

1. Откройте GitHub → Actions
2. Вверху страницы найдите выпадающий список с ветками
3. Выберите ветку `feature/premium-race-game`
4. Workflow должен появиться в списке

---

### Способ 3: Открыть через файл

1. Откройте файл workflow:
   ```
   https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/blob/feature/premium-race-game/.github/workflows/stars-payment-retry.yml
   ```

2. Нажмите кнопку **"View Runs"** (справа вверху)

3. Или нажмите вкладку **"Actions"** (вверху страницы)

---

### Способ 4: Запустить через API (если UI не работает)

```bash
# Установите GITHUB_TOKEN (Personal Access Token)
export GITHUB_TOKEN="your_token_here"

# Запустить workflow
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml/dispatches \
  -d '{"ref":"feature/premium-race-game"}'
```

---

## 🎯 Рекомендуемый способ

**Откройте эту ссылку:**

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml
```

Если показывает "Not found", добавьте в URL параметр ветки:

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml?branch=feature/premium-race-game
```

---

## ✅ После открытия

1. Нажмите **"Run workflow"** (справа вверху)
2. Выберите ветку `feature/premium-race-game`
3. Нажмите **"Run workflow"**
4. Проверьте логи выполнения

