# 🏆 Skily: AI-Powered Driving Instructor (TON AI Hackathon)

## 📌 Project Overview
**Skily** (formerly Sdadim DGT Prep) is a premium **Telegram Mini App (TMA)** designed to help students pass the DGT driving exam in Spain. It's not just a quiz app; it's a **Consumer AI Agent** that acts as a personal co-pilot and tutor.

### 🎯 The Problem
Preparing for driving exams is boring, lonely, and often confusing. Students struggle with complex rules and manual progress tracking.

### 💡 The Solution (Skily)
A gamified, AI-driven ecosystem where:
- **AI Agent (Gemini)** explains rules, analyzes statistics, and suggests personalized learning paths.
- **TON Blockchain** handles premium payments seamlessly via TON Connect.
- **Telegram Native** experience with high-performance streaming and interactive widgets.

---

## 💎 Key Features

### 1. 🤖 Multi-Modal AI Navigator (Agentic AI)
- **AI Vision:** Analyze road sign photos and complex intersection situations in real-time using Gemini 1.5 Flash.
- **Long-Term Memory:** Persistent conversation history stored in Supabase, allowing follow-up questions and personalized coaching.
- **Tool-Calling:** AI can query user stats (XP, coins, readiness) and suggest specific road signs to study.
- **Premium Formatting:** High-fidelity HTML messages with automated sanitization for Telegram's strict parser.
- **Real-Time Streaming:** Ultra-low latency responses using `sendMessageDraft` for an "alive" typing experience.

### 2. 👛 Smart TON Ecosystem
- **Wallet-Aware UI:** Bot proactively knows if a wallet is connected and toggles between "Connect Wallet" and "Direct Payment" buttons.
- **Safe Deep Linking:** Advanced `startapp` routing that bypasses Telegram's alphanumeric restrictions (custom underscore encoding for precise amounts).
- **TON Connect 2.0:** Securely connect Tonkeeper or Wallet in Telegram with immediate redirect to payment on success.
- **Persistent Sessions:** Multi-layered caching of wallet state for instant loads.

### 3. 🎮 Gamified Learning & Social
- **Duels:** Compete against other students in real-time.
- **Learning Map:** Personalized paths based on AI-analyzed test performance.
- **XP & Levels:** Track progress with a beautiful, high-performance dashboard.

---

## 🛠 Technical Architecture

- **Frontend:** React 18 (Vite) + Tailwind CSS + Framer Motion.
- **Backend:** Supabase (Auth, DB, Storage) + Deno Edge Functions.
- **AI Stack:** Google Gemini 1.5 Flash & 3.1 Flash-Lite (Multimodal).
- **TON Integration:** `@ton/appkit`, `@tonconnect/sdk`, `@ton/ton`.
- **Hosting:** Vercel + Supabase Edge Runtime.

---

## 🚀 Почему Skily заслуживает победы

1. **Production-Ready Agent:** Это не игрушка. Это полноценный AI-тренер, который видит, помнит и понимает контекст ученика.
2. **Web3 for Humans:** Мы превратили "крипту" в невидимую технологию — оплата в TON происходит в 2 клика прямо из чата.
3. **Advanced Bot UX:** Использование стриминга, черновиков (drafts) и HTML-виджетов ставит Skily в один ряд с лучшими Premium-ботами Telegram.
4. **Multi-Platform Consistency:** Бесшовный переход между ботом и Mini App через систему умных диплинков.

---

## 📽 Demo & Links
- **Telegram Bot:** [@skilyapp_bot](https://t.me/skilyapp_bot)
- **Website:** [skilyapp.com](https://skilyapp.com)
- **Demo Video:** [Watch on YouTube](YOUR_VIDEO_URL_HERE)

---

*Prepared by Dima & Antigravity AI for IdentityHub AI Hackathon 2026 (IdentityHub.ton).*
