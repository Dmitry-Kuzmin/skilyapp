# 🏆 Skily: AI-Powered Driving Instructor (TON AI Hackathon)

![Skily Banner](https://skilyapp.com/og-image.png)

> **Participating in IdentityHub AI Hackathon 2026** — *The future of AI-driven education on the TON blockchain.*

---

## 📌 О проекте
**Skily** — это премиальное Telegram Mini App (TMA), которое помогает студентам в Испании готовиться к экзамену DGT. Это не просто сборник тестов, а **AI-наставник**, который анализирует ошибки, объясняет правила и ведет по индивидуальному пути обучения.

## 🚀 Ключевые особенности

### 🤖 Агентный ИИ (Gemini 1.5 Flash)
- **Tool-Calling:** ИИ имеет доступ к статистике пользователя (XP, монеты, готовность) и дает персонализированные советы.
- **Стриминг ответов:** Плавный вывод текста в Telegram через `sendMessageDraft`.
- **Интерактивные виджеты:** ИИ может присылать дорожные знаки и кнопки оплаты прямо в чат.

### 💎 Интеграция с TON
- **TON Connect:** Бесшовное подключение кошельков (Tonkeeper, Wallet в TG).
- **Крипто-платежи:** Быстрая покупка Premium и Coins через нативные виджеты.
- **Persistent Storage:** Сессия кошелька надежно хранится в Telegram CloudStorage.

## 🛠 Технологический стек
- **Frontend:** React + Vite + Tailwind CSS + Framer Motion.
- **Backend:** Supabase (Auth, DB, Storage).
- **AI Integration:** Google Gemini (Edge Functions).
- **Web3:** `@ton/appkit`, `@tonconnect/ui`.

---

## ⚡ Быстрый старт

```sh
# Установка зависимостей
npm i

# Запуск в режиме разработки
npm run dev
```

---

## 📄 Спецификация для хакатона
Детальное описание проекта, архитектуры и преимуществ для судей доступно в файле: [HACKATHON.md](./HACKATHON.md)

---

*Разработано Димой и Antigravity AI для IdentityHub AI Hackathon 2026.*
