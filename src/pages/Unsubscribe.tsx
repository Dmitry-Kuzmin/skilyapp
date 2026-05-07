import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Status = "loading" | "success" | "already" | "error";

const copy: Record<string, Record<string, string>> = {
  ru: {
    loading:   "Отписываем...",
    success:   "Готово — больше не побеспокоим",
    already:   "Ты уже отписан от этих писем",
    error:     "Что-то пошло не так. Попробуй ещё раз.",
    body:      "Напоминания о баллах отключены. Войти в Skily можно в любой момент.",
    cta:       "Открыть Skily",
    resubscribe: "Включить напоминания снова",
  },
  es: {
    loading:   "Dándote de baja...",
    success:   "Listo — no te molestaremos más",
    already:   "Ya estás dado de baja de estos correos",
    error:     "Algo salió mal. Inténtalo de nuevo.",
    body:      "Los recordatorios de puntos están desactivados. Puedes entrar a Skily cuando quieras.",
    cta:       "Abrir Skily",
    resubscribe: "Volver a activar recordatorios",
  },
  en: {
    loading:   "Unsubscribing...",
    success:   "Done — we won't bother you again",
    already:   "You're already unsubscribed from these emails",
    error:     "Something went wrong. Please try again.",
    body:      "Point reminders are disabled. You can log in to Skily anytime.",
    cta:       "Open Skily",
    resubscribe: "Re-enable reminders",
  },
};

function getBrowserLang(): string {
  const l = navigator.language?.toLowerCase().split("-")[0];
  if (l === "ru" || l === "uk") return "ru";
  if (l === "es") return "es";
  return "en";
}

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const type  = params.get("type") ?? "points-reminder";
  const lang  = params.get("lang") ?? getBrowserLang();
  const t = copy[lang] ?? copy.en;

  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!email) { setStatus("error"); return; }

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const ANON_KEY     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ email, type }),
    })
      .then(r => r.json())
      .then(d => setStatus(d.already ? "already" : d.ok ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [email, type]);

  const isSuccess = status === "success" || status === "already";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        maxWidth: 400,
        width: "100%",
        background: "#1e293b",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        textAlign: "center",
      }}>
        <div style={{ height: 4, background: isSuccess ? "#22c55e" : status === "loading" ? "#6366f1" : "#ef4444" }} />

        <div style={{ padding: "36px 32px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {status === "loading" ? "⏳" : isSuccess ? "✅" : "❌"}
          </div>

          <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800, color: "#f8fafc", lineHeight: 1.3 }}>
            {status === "loading" ? t.loading : isSuccess ? t[status] : t.error}
          </h1>

          {isSuccess && (
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              {t.body}
            </p>
          )}

          {status === "error" && (
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
              {t.error}
            </p>
          )}

          {isSuccess && (
            <>
              <a
                href="https://skilyapp.com/dashboard"
                style={{
                  display: "block",
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  borderRadius: 12,
                  padding: "13px 24px",
                  marginBottom: 12,
                }}
              >
                {t.cta}
              </a>
              <button
                onClick={() => {
                  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
                  const ANON_KEY     = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
                  fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
                    body: JSON.stringify({ email, type, resubscribe: true }),
                  }).then(() => setStatus("error")); // переиспользуем error как "отписка отменена"
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#475569",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {t.resubscribe}
              </button>
            </>
          )}
        </div>

        <div style={{ padding: "12px 32px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <a href="https://skilyapp.com" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none" }}>
            skilyapp.com
          </a>
        </div>
      </div>
    </div>
  );
}
