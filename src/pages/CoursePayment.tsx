import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Check, Loader2, Star, CreditCard, Smartphone, Banknote, ChevronDown } from "lucide-react";

declare global {
  interface Window { Paddle?: any; }
}

// ── Конфиг ──────────────────────────────────────────────
const WALLET_USDT_TRC20   = "TTxAFggCYnAvfHqZhkbYCgLfKMzG3rU3sd";
const WALLET_USDT_BSC     = "0x73527FCC577229Bc3C022fadB8Fa3a8dCB7C4530";
const WALLET_USDT_ERC20   = "0x73527FCC577229Bc3C022fadB8Fa3a8dCB7C4530";
const WALLET_TON          = "UQAzTCbe_ctk_sQaFODVLmRaz-Cy4zC75u4OohEHdsOe5EIt";
const BIZUM_PHONE         = "698994997";
const SBP_LINK            = "https://www.tbank.ru/cf/6CoAgRE8Kkp";
const PAYPAL_EMAIL        = "Kuzmin.public@gmail.com";
const PADDLE_PRODUCT_ID   = "pro_01kn69xq0c5vngwh50mehcskgz";
const SUPABASE_URL        = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON       = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const TIMER_SECONDS       = 15 * 60; // 15 минут

type Tab = "stars" | "card" | "usdt" | "ton" | "rub" | "bizum" | "paypal";

interface Rates { stars: number; usdt: number; ton: number; rub: number; }

const API_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "apikey": SUPABASE_ANON,
};

// ── Helpers ──────────────────────────────────────────────
function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);
  return { copied, copy };
}

function QRCode({ data, size = 130 }: { data: string; size?: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(data)}`}
      alt="QR" width={size} height={size}
      className="rounded-xl border border-white/10 mx-auto"
    />
  );
}

function AddressRow({ address, label, copyKey, copied, onCopy }: {
  address: string; label: string; copyKey: string;
  copied: string | null; onCopy: (t: string, k: string) => void;
}) {
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">{label}</div>
      <button
        onClick={() => onCopy(address, copyKey)}
        className="w-full flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-left"
      >
        <span className="text-xs font-mono text-gray-700 flex-1 break-all leading-relaxed">{address}</span>
        {copied === copyKey
          ? <Check size={14} className="text-emerald-500 flex-shrink-0" />
          : <Copy size={14} className="text-gray-300 flex-shrink-0" />}
      </button>
    </div>
  );
}

function CountdownBlock({ timeLeft }: { timeLeft: number }) {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  const timeStr = `${min}:${sec.toString().padStart(2, "0")}`;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 flex-shrink-0 relative">
            <div className="w-7 h-7 rounded-full border-[3px] border-gray-100 border-t-emerald-500 animate-spin" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Статус</div>
            <div className="text-sm font-bold text-emerald-500">Ожидание...</div>
            <div className="text-[10px] text-gray-400 font-medium">Срок: <span className="text-emerald-500 font-bold">{timeStr}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 flex-shrink-0">
            <div className="w-7 h-7 rounded-full border-[3px] border-gray-100" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Подтверждения</div>
            <div className="text-sm font-bold text-emerald-500">0 из 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export default function CoursePayment() {
  const [searchParams] = useSearchParams();
  const amount      = parseFloat(searchParams.get("amount") || "0");
  const tariffId    = searchParams.get("tariff") || "pro";
  const tariffLabel = searchParams.get("label") || "Тариф";
  const streamId    = searchParams.get("stream") || "";
  const streamLabel = searchParams.get("slabel") || "";
  const tgId        = parseInt(searchParams.get("uid") || "0", 10);
  const tgUsername  = searchParams.get("uname") || "";

  const [tab, setTab] = useState<Tab>("stars");
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [starsLoading, setStarsLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [usdtNet, setUsdtNet] = useState<"TRC20" | "BSC" | "ERC20">("TRC20");
  const { copied, copy } = useCopyToClipboard();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown ─────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Paddle.js ─────────────────────────────────────────
  useEffect(() => {
    if (window.Paddle || !PADDLE_CLIENT_TOKEN) return;
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.onload = () => window.Paddle?.Initialize({ token: PADDLE_CLIENT_TOKEN });
    document.head.appendChild(s);
  }, []);

  // ── Загружаем курсы ───────────────────────────────────
  useEffect(() => {
    if (!amount) { setRatesLoading(false); return; }
    fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({ action: "rates", eur_amount: amount }),
    })
      .then(r => r.json())
      .then((d: Rates) => setRates(d))
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, [amount]);

  // ── USDT wallet by network ────────────────────────────
  const usdtWallet = usdtNet === "TRC20" ? WALLET_USDT_TRC20
    : usdtNet === "BSC" ? WALLET_USDT_BSC : WALLET_USDT_ERC20;
  const usdtPrefix = usdtNet === "TRC20" ? "tron:" : "ethereum:";
  const usdtNetLabel: Record<string, string> = {
    TRC20: "Tron (TRC-20)", BSC: "BNB Smart Chain (BEP-20)", ERC20: "Ethereum (ERC-20)"
  };

  // ── Stars ─────────────────────────────────────────────
  const payWithStars = async () => {
    setStarsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({
          action: "stars_invoice", eur_amount: amount,
          tariff_id: tariffId, tariff_label: tariffLabel,
          stream_id: streamId, stream_label: streamLabel, telegram_id: tgId,
        }),
      });
      const data = await res.json();
      if (data.invoice_link) {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openInvoice) {
          tg.openInvoice(data.invoice_link, (status: string) => {
            if (status === "paid") setConfirmed(true);
          });
        } else {
          window.open(data.invoice_link, "_blank");
        }
      }
    } catch (e) { console.error(e); }
    finally { setStarsLoading(false); }
  };

  // ── Paddle card ───────────────────────────────────────
  const payWithCard = async () => {
    setCardLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({
          action: "paddle_checkout", eur_amount: amount,
          tariff_label: tariffLabel, stream_label: streamLabel,
          telegram_id: tgId, paddle_product_id: PADDLE_PRODUCT_ID,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        const tg = (window as any).Telegram?.WebApp;
        tg?.openLink ? tg.openLink(data.checkout_url) : window.open(data.checkout_url, "_blank");
      }
    } catch (e) { console.error(e); }
    finally { setCardLoading(false); }
  };

  // ── PayPal ────────────────────────────────────────────
  const payWithPaypal = () => {
    const url = `https://www.paypal.com/paypalme/${PAYPAL_EMAIL.split("@")[0]}/${amount}EUR`;
    const tg = (window as any).Telegram?.WebApp;
    tg?.openLink ? tg.openLink(url) : window.open(url, "_blank");
  };

  // ── Manual notify ─────────────────────────────────────
  const notifyManual = async (method: string) => {
    setNotifyLoading(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({
          action: "notify_manual", telegram_id: tgId,
          telegram_username: tgUsername, tariff_label: tariffLabel,
          stream_label: streamLabel, eur_amount: amount, method,
        }),
      });
      setConfirmed(true);
    } catch (e) { console.error(e); }
    finally { setNotifyLoading(false); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "stars",  label: "⭐ Stars" },
    { id: "card",   label: "💳 Карта" },
    { id: "usdt",   label: "USDT" },
    { id: "ton",    label: "TON" },
    { id: "rub",    label: "🇷🇺 СБП" },
    { id: "bizum",  label: "Bizum" },
    { id: "paypal", label: "PayPal" },
  ];

  // ── Confirmed screen ──────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2c488c] to-[#1a1c20] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} strokeWidth={3} className="text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Остался один шаг!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Отправьте скриншот чека менеджеру — он подтвердит место в течение 15 минут.
          </p>
          <button
            onClick={() => {
              const msg = `Здравствуйте! Оплатил(а) ${tariffLabel} — €${amount}. Чек прилагаю.`;
              const tg = (window as any).Telegram?.WebApp;
              const url = `https://t.me/emigrationpublic?text=${encodeURIComponent(msg)}`;
              tg?.openLink ? tg.openLink(url) : window.open(url, "_blank");
            }}
            className="mt-5 w-full bg-[#0088cc] text-white font-bold py-4 rounded-2xl text-[15px]"
          >
            Отправить чек в Telegram
          </button>
          <button
            onClick={() => setConfirmed(false)}
            className="mt-3 w-full text-gray-400 text-sm font-medium"
          >
            ← Вернуться к реквизитам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2c488c] to-[#1a1c20] flex flex-col items-center p-4 py-8">
      <div className="w-full max-w-md bg-[#f4f5f8] rounded-3xl overflow-hidden shadow-2xl">

        {/* Шапка */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 font-extrabold text-[17px] text-black">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#000"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            SkilyAPP
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            Secure Pay
          </div>
        </div>

        {/* Сумма */}
        <div className="text-center pb-3 px-5">
          <div className="text-4xl font-extrabold text-gray-900">€{amount}</div>
          <div className="text-sm text-gray-500 mt-1 font-medium">{tariffLabel}</div>
          {streamLabel && <div className="text-xs text-gray-400 mt-0.5">{streamLabel}</div>}
        </div>

        {/* Табы — горизонтальный скролл */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-gray-200 p-1 rounded-2xl overflow-x-auto scrollbar-none">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        <div className="px-4 pb-5 space-y-3">

          {/* ── Stars ── */}
          {tab === "stars" && (
            <>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading ? (
                  <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                ) : (
                  <div className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
                    <Star size={22} className="text-yellow-400 fill-yellow-400" />
                    {rates?.stars?.toLocaleString() ?? "—"}
                    <span className="text-base text-gray-400 font-medium">Stars</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">≈ €{amount} по официальному курсу Telegram</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-center font-medium">
                ⚡ Мгновенно · Без комиссии · Конвертация автоматическая
              </div>
              <button
                onClick={payWithStars}
                disabled={starsLoading || ratesLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {starsLoading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Star size={18} className="text-yellow-400 fill-yellow-400" />}
                Оплатить {rates?.stars ? `${rates.stars.toLocaleString()} Stars` : "Stars"}
              </button>
            </>
          )}

          {/* ── Card (Paddle) ── */}
          {tab === "card" && (
            <>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                <div className="text-3xl font-extrabold text-gray-900">€{amount}</div>
                <div className="text-xs text-gray-400 mt-1">{tariffLabel}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 text-center font-medium">
                🔒 Безопасно через Paddle · Visa, Mastercard, Apple Pay, Google Pay
              </div>
              <div className="grid grid-cols-4 gap-2">
                {["Visa", "MC", "Apple Pay", "G Pay"].map(b => (
                  <div key={b} className="bg-white border border-gray-200 rounded-xl h-9 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {b}
                  </div>
                ))}
              </div>
              <button
                onClick={payWithCard}
                disabled={cardLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {cardLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                Оплатить картой
              </button>
            </>
          )}

          {/* ── USDT ── */}
          {tab === "usdt" && (
            <>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading
                  ? <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                  : <div className="text-3xl font-extrabold text-gray-900">
                      {rates?.usdt ?? "—"} <span className="text-base text-gray-400 font-medium">USDT</span>
                    </div>
                }
                {rates?.usdt && <div className="text-xs text-gray-400 mt-1">≈ €{amount}</div>}
              </div>

              {/* Network selector */}
              <div className="relative">
                <select
                  value={usdtNet}
                  onChange={e => setUsdtNet(e.target.value as typeof usdtNet)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-sm font-bold text-gray-800 outline-none"
                >
                  <option value="TRC20">USDT (TRC-20) — Рекомендуется</option>
                  <option value="BSC">USDT (BEP-20) — Низкая комиссия</option>
                  <option value="ERC20">USDT (ERC-20) — Ethereum</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1 pl-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Вы платите комиссию сети
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                ⚠ Отправляйте <strong>только USDT</strong> в сети <strong>{usdtNetLabel[usdtNet]}</strong>. Другие активы безвозвратно утеряны.
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <QRCode data={`${usdtPrefix}${usdtWallet}`} size={90} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-1 font-semibold">Адрес пополнения</div>
                    <button
                      onClick={() => copy(usdtWallet, "usdt")}
                      className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-left"
                    >
                      <span className="text-[10px] font-mono text-gray-700 flex-1 break-all leading-snug">{usdtWallet}</span>
                      {copied === "usdt" ? <Check size={12} className="text-emerald-500 flex-shrink-0" /> : <Copy size={12} className="text-gray-300 flex-shrink-0" />}
                    </button>
                  </div>
                </div>
                {/* Countdown */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 border-t-emerald-500 animate-spin flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Статус</div>
                      <div className="text-sm font-bold text-emerald-500">Ожидание...</div>
                      <div className="text-[9px] text-gray-400">Срок: <span className="text-emerald-500 font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,"0")}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Подтверждения</div>
                      <div className="text-sm font-bold text-emerald-500">0 из 1</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => notifyManual("usdt")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {notifyLoading && <Loader2 size={18} className="animate-spin" />}
                Я оплатил(а) криптой
              </button>
            </>
          )}

          {/* ── TON ── */}
          {tab === "ton" && (
            <>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading
                  ? <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                  : <div className="text-3xl font-extrabold text-gray-900">
                      {rates?.ton ?? "—"} <span className="text-base text-gray-400 font-medium">TON</span>
                    </div>
                }
                {rates?.ton && <div className="text-xs text-gray-400 mt-1">≈ €{amount} · The Open Network</div>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <QRCode data={`ton://transfer/${WALLET_TON}`} size={90} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-1 font-semibold">Адрес кошелька</div>
                    <button
                      onClick={() => copy(WALLET_TON, "ton")}
                      className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-left"
                    >
                      <span className="text-[10px] font-mono text-gray-700 flex-1 break-all leading-snug">{WALLET_TON}</span>
                      {copied === "ton" ? <Check size={12} className="text-emerald-500 flex-shrink-0" /> : <Copy size={12} className="text-gray-300 flex-shrink-0" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 border-t-blue-500 animate-spin flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Статус</div>
                      <div className="text-sm font-bold text-blue-500">Ожидание...</div>
                      <div className="text-[9px] text-gray-400">Срок: <span className="text-blue-500 font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,"0")}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Подтверждения</div>
                      <div className="text-sm font-bold text-blue-500">0 из 1</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => notifyManual("ton")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {notifyLoading && <Loader2 size={18} className="animate-spin" />}
                Я оплатил(а) TON
              </button>
            </>
          )}

          {/* ── РФ/СБП ── */}
          {tab === "rub" && (
            <>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading
                  ? <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                  : <div className="text-3xl font-extrabold text-gray-900">
                      {rates?.rub?.toLocaleString("ru-RU") ?? "—"} <span className="text-base text-gray-400 font-medium">₽</span>
                    </div>
                }
                {rates?.rub && <div className="text-xs text-gray-400 mt-1">≈ €{amount} · Курс ЦБ РФ + 5%</div>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 text-center">
                  <QRCode data={SBP_LINK} size={140} />
                  <p className="text-xs text-gray-500 font-medium mt-3">Отсканируйте для перевода по СБП</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 border-t-emerald-500 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Ожидание оплаты</div>
                    <div className="text-xs text-gray-500 font-medium">Курс зафиксирован: <span className="text-emerald-500 font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,"0")}</span></div>
                  </div>
                </div>
              </div>

              <a
                href={SBP_LINK} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center bg-[#FFDD2D] text-gray-900 font-bold py-4 rounded-2xl text-[15px]"
              >
                Перейти к оплате (Tinkoff)
              </a>
              <button
                onClick={() => notifyManual("rub")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {notifyLoading && <Loader2 size={18} className="animate-spin" />}
                Я оплатил(а) рублями
              </button>
            </>
          )}

          {/* ── Bizum ── */}
          {tab === "bizum" && (
            <>
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3 text-center">Сумма к переводу</div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-4">€{amount}</div>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                  <div className="w-10 h-10 bg-[#00C853] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-extrabold text-lg">B</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Номер Bizum</div>
                    <button onClick={() => copy(BIZUM_PHONE, "bizum")} className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xl font-extrabold text-gray-900 tracking-wider">{BIZUM_PHONE}</span>
                      {copied === "bizum" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center">Укажите в комментарии: <strong>{tariffLabel}</strong></div>
              </div>

              {/* Countdown */}
              <div className="bg-white border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 border-t-emerald-500 animate-spin flex-shrink-0" />
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Ожидание оплаты</div>
                    <div className="text-xs text-gray-500 font-medium">Курс зафиксирован: <span className="text-emerald-500 font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,"0")}</span></div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => notifyManual("bizum")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {notifyLoading && <Loader2 size={18} className="animate-spin" />}
                Я отправил(а) Bizum
              </button>
            </>
          )}

          {/* ── PayPal ── */}
          {tab === "paypal" && (
            <>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                <div className="text-3xl font-extrabold text-gray-900 mb-4">€{amount}</div>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3">
                  <path d="M7.078 20.485L9.67 4.09H16.2c3.085 0 5.161 1.341 4.707 4.238-.383 2.42-2.128 4.264-4.526 4.264h-2.186l-.234 1.485-.63 3.99-.187 1.183H9.277l-.612 3.882c-.066.417-.428.718-.85.718H4.636c-.63 0-.962-.647-.791-1.246l.462-1.637.28-1.77.702-4.444.622-3.94H2.435v-1.64c0-.776.63-1.405 1.405-1.405h3.048c.63 0 .963.647.792 1.245l-.602 3.81z" fill="#003087"/>
                  <path d="M10.155 20.485L12.747 4.09h6.53c3.085 0 5.162 1.341 4.707 4.238-.382 2.42-2.127 4.264-4.525 4.264h-2.186l-.234 1.485-.63 3.99-.188 1.183h-3.865l-.612 3.882c-.066.417-.427.718-.85.718H7.713c-.63 0-.962-.647-.792-1.246l.462-1.637.28-1.77.702-4.444.623-3.94H5.512v-1.64c0-.776.63-1.405 1.405-1.405h3.048c.63 0 .963.647.792 1.245l-.602 3.81z" fill="#0079C1"/>
                </svg>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Оплата картой зарубежного банка через шлюз PayPal
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="w-6 h-6 rounded-full border-[3px] border-gray-100 border-t-[#0079C1] animate-spin flex-shrink-0" />
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Ожидание оплаты</div>
                    <div className="text-xs text-gray-500 font-medium">Сессия активна: <span className="text-[#0079C1] font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,"0")}</span></div>
                  </div>
                </div>
              </div>

              <button
                onClick={payWithPaypal}
                className="w-full bg-[#0079C1] text-white font-bold py-4 rounded-2xl text-[15px]"
              >
                Оплатить через PayPal
              </button>
              <button
                onClick={() => notifyManual("paypal")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {notifyLoading && <Loader2 size={18} className="animate-spin" />}
                Я оплатил(а) через PayPal
              </button>
            </>
          )}

        </div>
      </div>

      <p className="mt-5 text-white/50 text-sm text-center">
        Проблемы с оплатой?{" "}
        <a href="https://t.me/emigrationpublic" className="text-white font-semibold underline underline-offset-2">
          Напишите нам
        </a>
      </p>
    </div>
  );
}
