# 🔧 Настройка Vercel CLI для деплоя

## ⚠️ Что нужно сделать

Vercel CLI установлен, но нужно авторизоваться и привязать проект.

---

## 📋 Шаг 1: Авторизация в Vercel (один раз)

Выполни в терминале:

```bash
vercel login
```

**Что произойдёт:**
1. Откроется браузер
2. GitHub запросит авторизацию
3. Разреши доступ
4. Vercel CLI сохранит токен

---

## 📋 Шаг 2: Привязать проект к Vercel (один раз)

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
vercel link
```

**Что будет спрашивать:**
1. **Set up and deploy?** → выбери `Y` (Yes)
2. **Which scope?** → выбери свой аккаунт (dmitry-kuzmin)
3. **Link to existing project?** → выбери `Y` (Yes)
4. **What's the name of your existing project?** → выбери `sdadim-dgt-prep`
5. **In which directory is your code located?** → просто нажми Enter (`.` - текущая директория)
6. **Want to override the settings?** → выбери `N` (No)

**После этого проект будет привязан!**

---

## 📋 Шаг 3: Деплой!

После настройки можно деплоить:

```bash
./deploy.sh
```

Или вручную:

```bash
vercel --prod --yes
```

---

## 🔄 Быстрая команда для будущих деплоев

После настройки просто:

```bash
vercel --prod --yes
```

И проект задеплоится!

---

## 🆘 Если что-то не работает

### Проблема: `vercel login` не открывает браузер

**Решение:** Используй токен вручную:

1. Открой: https://vercel.com/account/tokens
2. Создай новый токен
3. Используй в команде:
```bash
vercel --token=твой_токен --prod
```

### Проблема: `vercel link` не находит проект

**Решение:** Создай проект вручную:

```bash
vercel --prod --yes
```

Vercel предложит создать проект, выбери `Y` и настрой.

---

**💡 После настройки (Шаг 1-2) деплой будет работать через одну команду!**

