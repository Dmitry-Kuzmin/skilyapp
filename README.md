<div align="center">

# 🚗 Skily — Agentic AI Driving Coach on TON

**Production-ready Telegram Mini App · Live in 2026 · Real users · Real TON payments**

[![Live Demo](https://img.shields.io/badge/Try%20it%20live-%40skilyapp__bot-blue?style=for-the-badge&logo=telegram)](https://t.me/skilyapp_bot)
[![Track](https://img.shields.io/badge/IdentityHub%20Hackathon-User--Facing%20AI%20Agents-purple?style=for-the-badge)](https://identityhub.app/contests/ai-hackathon)
[![TON](https://img.shields.io/badge/Built%20on-TON%20Blockchain-0098EA?style=for-the-badge)](https://ton.org)

> *The world's most accessible, personalized driving exam coach —
> powered by Gemini 3.1 Pro, monetized via TON, delivered through Telegram.*

</div>

---

## 🎯 What Is Skily?

Skily is not a quiz app. It's an **autonomous AI agent** that coaches students through government driving exams step by step — remembering their weaknesses, sending proactive reminders, and adapting to their progress in real time.

**Zero friction**: open Telegram → start learning. No install, no signup, no password.

Live across **2 markets** with **3000+ real exam scenarios** and **3 languages (EN / ES / RU)**.

---

## 🧠 The AI Agent

| Capability | Detail |
|-----------|--------|
| **Model** | Gemini 3.1 Pro (primary) + Gemini 1.5 Flash (vision) + Llama 3.1/Groq (fallback) |
| **Memory** | Persistent contextual memory across sessions stored in Supabase |
| **Vision** | Analyzes road sign photos, intersection situations in real time |
| **Tool-calling** | Queries exam history, readiness score, weak zones, builds drill plans |
| **Streaming** | Live token streaming via `sendMessageDraft` — feels like a real instructor |
| **Proactive** | Sends autonomous reminders: *"2 days inactive. Exam in 5 days. Train now."* |
| **Avatar** | Bot avatar evolves as user levels up — visible proof of progress in every message |

---

## 💎 TON Ecosystem Integration

- **`@ton/appkit` v0.0.4-alpha** — bleeding-edge official TON App Kit, production-proven
- **TonConnect 2.0** — one-tap wallet connect (Tonkeeper, MyTonWallet, any TON wallet)
- **Direct on-chain payments** via `sendTransaction()` — no intermediaries
- **Telegram CloudStorage** as TonConnect session backend — solved the wallet restoration race-condition that breaks other TON Mini Apps
- **Wallet-aware UI** — shop, pricing, CTAs adapt in real-time to wallet state
- **Multi-provider checkout**: TON · Telegram Stars · Cryptomus · Paddle

---

## ⚔️ Gamification Engine

- Live **1v1 PvP exam duels** via Supabase Realtime (`<100ms` sync)
- Combo streaks · XP system · Seasonal leaderboards
- **Daily AI quests** · Coin rewards · Boost shop
- Server-side answer validation — zero cheating architecturally possible

---

## 🔐 Authentication

- **Telegram OIDC** (OpenID Connect) — newest Telegram Login standard, JWT verified via `oauth.telegram.org` JWKS
- **WebAuthn Passkeys** — biometric login, zero passwords, hardware-level security
- **Supabase RLS** — full data isolation per user

---

## 🛠 Tech Stack

```
Frontend    React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
AI          Gemini 3.1 Pro · Gemini 1.5 Flash (vision) · Llama 3.1 via Groq (fallback)
Backend     Supabase — Postgres + Realtime + RLS + Edge Functions (Deno)
Web3        @ton/appkit alpha · TonConnect UI v2 · Telegram CloudStorage
Auth        Telegram OIDC · WebAuthn Passkeys
Infra       Vercel · Supabase Edge Runtime · GitHub Actions (cron jobs)
```

---

## 📊 Scale

| Metric | Value |
|--------|-------|
| Markets | Spain (DGT) + Russia (PDD) |
| Exam scenarios | 3000+ with AI-generated branded visuals |
| Languages | EN · ES · RU |
| Payment methods | 4 (TON · Stars · Crypto · Card) |
| Status | **Live in production** |

---

## 🚀 Quick Start

```bash
npm install
npm run dev          # Vite (port 8080) + validator server (port 3030)
```

Required env vars:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## 🗂 Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route architecture (public / authenticated split) |
| `src/components/shop/BoostShopModal.tsx` | Full shop with TON/Stars/Crypto payments |
| `supabase/functions/ai-chat/` | Gemini streaming Edge Function |
| `supabase/functions/notification-cron/` | Autonomous reminder agent |
| `src/hooks/useDuelGame.ts` | Real-time PvP logic |
| `src/lib/ton-appkit.ts` | TonConnect session management |

---

<div align="center">

**[@skilyapp_bot](https://t.me/skilyapp_bot) · [skilyapp.com](https://skilyapp.com)**

*IdentityHub AI Hackathon 2026 · User-Facing AI Agents · $10K track*

</div>
