// =====================================================
// PostHog Analytics — единый сервис
// Фронт: posthog-js SDK (автотрекинг страниц, сессий)
// Бот:   HTTP API (через logBotEvent в course-funnel.ts)
// =====================================================

import posthog from "posthog-js";

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined ?? "https://eu.i.posthog.com";

let _initialized = false;

// ─── Init (вызывается один раз из main.tsx) ───────────────────────────────────
export function initPostHog(): void {
  if (!POSTHOG_KEY || _initialized) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: "https://eu.posthog.com",

      // Автотрекинг
      capture_pageview:        true,   // $pageview на каждый URL
      capture_pageleave:       true,   // $pageleave — как долго сидел
      autocapture:             false,  // отключаем шумный autocapture кликов
      cross_subdomain_cookie:  false,

      // Session Replay — только на лендинге и app (не в Telegram WebApp)
      session_recording: {
        maskAllInputs:     true,   // не пишем что вводит пользователь
        maskTextSelector:  ".sensitive",
      },

      // Персональные данные — не собираем лишнего
      person_profiles: "identified_only",

      // Загружаем чуть позже чтобы не блокировать FCP
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          ph.debug();
          console.log("[PostHog] ✅ Initialized, distinct_id:", ph.get_distinct_id());
        }
      },

      bootstrap: {
        distinctID: undefined, // будет переопределён при identify()
      },
    });
    _initialized = true;
  } catch (e) {
    console.warn("[PostHog] Init failed:", e);
  }
}

// ─── Identify пользователя ────────────────────────────────────────────────────
// Вызывать когда знаем кто юзер (после загрузки профиля)
export function identifyUser(profileId: string, traits?: {
  telegram_id?: number;
  username?: string;
  is_premium?: boolean;
  language?: string;
}): void {
  if (!_initialized) return;
  try {
    posthog.identify(profileId, traits);
  } catch (e) {
    console.warn("[PostHog] identify failed:", e);
  }
}

// ─── Track event ─────────────────────────────────────────────────────────────
// Fire-and-forget: никогда не ломает UI
export function track(event: string, props?: Record<string, unknown>): void {
  if (!_initialized) return;
  try {
    posthog.capture(event, props);
  } catch (e) {
    console.warn("[PostHog] capture failed:", e);
  }
}

// ─── Предопределённые события (типобезопасно) ────────────────────────────────

export const Analytics = {
  // Лендинг /curso
  landingViewed:         ()                              => track("landing_viewed"),
  ctaClicked:            (location: string)              => track("cta_clicked",            { location }),
  pricingTabSwitched:    (tab: "groups" | "individual")  => track("pricing_tab_switched",   { tab }),
  addonToggled:          (addon: string, enabled: boolean, format: string) =>
                                                            track("addon_toggled",           { addon, enabled, format }),
  quizStarted:           ()                              => track("quiz_started"),
  quizCompleted:         (risk: number, plan?: string)   => track("quiz_completed",         { risk, recommended_plan: plan }),
  touristInterstitial:   ()                              => track("tourist_interstitial_shown"),
  bookingFormSubmitted:  (plan: string)                  => track("booking_form_submitted", { plan }),

  // Бот — дублируются для полноты картины (основной трекинг в Edge Function)
  botFunnelStart:        (via: string)                   => track("bot_funnel_start",       { via }),
  botPlanSelected:       (plan: string)                  => track("bot_plan_selected",      { plan }),
};

export { posthog };
