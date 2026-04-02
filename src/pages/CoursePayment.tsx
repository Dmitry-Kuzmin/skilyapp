import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Check, Loader2, Star, Gem, CreditCard, Smartphone, Banknote } from "lucide-react";

declare global {
  interface Window { Paddle?: any; }
}

// ── Конфиг кошельков ──────────────────────────────────
const WALLET_USDT_TRC20    = "TTxAFggCYnAvfHqZhkbYCgLfKMzG3rU3sd";
const WALLET_TON           = "UQAzTCbe_ctk_sQaFODVLmRaz-Cy4zC75u4OohEHdsOe5EIt";
const BIZUM_PHONE          = "698994997";
const SBP_LINK             = "https://www.tbank.ru/cf/6CoAgRE8Kkp";
const PADDLE_PRODUCT_ID    = "pro_01kn69xq0c5vngwh50mehcskgz";
const SUPABASE_URL         = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON        = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const PADDLE_CLIENT_TOKEN  = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;

type Tab = "stars" | "card" | "usdt" | "ton" | "rub" | "bizum";

interface Rates {
  stars: number;
  usdt: number;
  ton: number;
  rub: number;
}

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

function QRCode({ data, size = 140 }: { data: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(data)}`;
  return (
    <img
      src={src}
      alt="QR"
      width={size}
      height={size}
      className="rounded-xl border border-white/10 mx-auto"
    />
  );
}

function AddressRow({ address, label, copyKey, copied, onCopy }: {
  address: string; label: string; copyKey: string;
  copied: string | null; onCopy: (text: string, key: string) => void;
}) {
  const isCopied = copied === copyKey;
  return (
    <div className="mt-3">
      <div className="text-xs text-white/40 mb-1 font-medium uppercase tracking-wide">{label}</div>
      <button
        onClick={() => onCopy(address, copyKey)}
        className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 transition-colors text-left"
      >
        <span className="text-xs font-mono text-white/80 flex-1 break-all leading-relaxed">{address}</span>
        {isCopied
          ? <Check size={14} className="text-emerald-400 flex-shrink-0" />
          : <Copy size={14} className="text-white/30 flex-shrink-0" />
        }
      </button>
    </div>
  );
}

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
  const [notifyLoading, setNotifyLoading] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // ── Загружаем курсы ──────────────────────────────────
  useEffect(() => {
    if (!amount) { setRatesLoading(false); return; }
    fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
      body: JSON.stringify({ action: "rates", eur_amount: amount }),
    })
      .then(r => r.json())
      .then((data: Rates) => setRates(data))
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, [amount]);

  // ── Оплата Stars ──────────────────────────────────────
  const payWithStars = async () => {
    setStarsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({
          action: "stars_invoice",
          eur_amount: amount,
          tariff_id: tariffId,
          tariff_label: tariffLabel,
          stream_id: streamId,
          stream_label: streamLabel,
          telegram_id: tgId,
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
    } catch (e) {
      console.error(e);
    } finally {
      setStarsLoading(false);
    }
  };

  // ── Уведомление о ручной оплате ───────────────────────
  const notifyManual = async (method: string) => {
    setNotifyLoading(true);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/course-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({
          action: "notify_manual",
          telegram_id: tgId,
          telegram_username: tgUsername,
          tariff_label: tariffLabel,
          stream_label: streamLabel,
          eur_amount: amount,
          method,
        }),
      });
      setConfirmed(true);
    } catch (e) {
      console.error(e);
    } finally {
      setNotifyLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "stars",  label: "Stars",  icon: <Star size={14} /> },
    { id: "usdt",   label: "USDT",   icon: <Gem size={14} /> },
    { id: "ton",    label: "TON",    icon: <Gem size={14} className="text-blue-400" /> },
    { id: "rub",    label: "РФ/СБП", icon: <Banknote size={14} /> },
    { id: "bizum",  label: "Bizum",  icon: <Smartphone size={14} /> },
  ];

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2c488c] to-[#1a1c20] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-sm w-full text-center text-white">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold mb-2">Отличный выбор!</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Мы получили ваш запрос. Менеджер свяжется в течение 15 минут и подтвердит место.
          </p>
          <button
            onClick={() => (window as any).Telegram?.WebApp?.close?.()}
            className="mt-6 w-full bg-white/20 hover:bg-white/30 rounded-2xl py-3 text-sm font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2c488c] to-[#1a1c20] flex flex-col items-center p-4 py-8">
      {/* Карточка */}
      <div className="w-full max-w-md bg-[#f4f5f8] rounded-3xl overflow-hidden shadow-2xl">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 font-extrabold text-[17px] text-black">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#000"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            ES Emigration
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            Secure Pay
          </div>
        </div>

        {/* Сумма */}
        <div className="text-center pb-4 px-5">
          <div className="text-4xl font-extrabold text-gray-900">
            €{amount}
          </div>
          <div className="text-sm text-gray-500 mt-1 font-medium">{tariffLabel}</div>
          {streamLabel && (
            <div className="text-xs text-gray-400 mt-0.5">{streamLabel}</div>
          )}
        </div>

        {/* Табы */}
        <div className="flex gap-1 bg-gray-200 mx-4 p-1 rounded-2xl mb-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Контент таба */}
        <div className="px-4 pb-5">

          {/* ── Stars ── */}
          {tab === "stars" && (
            <div className="space-y-4">
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
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {starsLoading ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className="text-yellow-400 fill-yellow-400" />}
                Оплатить {rates?.stars ? `${rates.stars.toLocaleString()} Stars` : "Stars"}
              </button>
            </div>
          )}

          {/* ── USDT ── */}
          {tab === "usdt" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading ? (
                  <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                ) : (
                  <div className="text-3xl font-extrabold text-gray-900">
                    {rates?.usdt ?? "—"} <span className="text-base text-gray-400 font-medium">USDT</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 mt-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                  Сеть: Tron (TRC-20)
                </div>
              </div>
              <QRCode data={`tron:${WALLET_USDT_TRC20}`} />
              <AddressRow address={WALLET_USDT_TRC20} label="Адрес кошелька" copyKey="usdt" copied={copied} onCopy={copy} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                ⚠ Отправляйте <strong>только USDT</strong> в сети <strong>Tron (TRC-20)</strong>. Другие активы безвозвратно утеряны.
              </div>
              <button
                onClick={() => notifyManual("usdt")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {notifyLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Я оплатил(а) криптой
              </button>
            </div>
          )}

          {/* ── TON ── */}
          {tab === "ton" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading ? (
                  <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                ) : (
                  <div className="text-3xl font-extrabold text-gray-900">
                    {rates?.ton ?? "—"} <span className="text-base text-gray-400 font-medium">TON</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 mt-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                  The Open Network
                </div>
              </div>
              <QRCode data={`ton://transfer/${WALLET_TON}`} />
              <AddressRow address={WALLET_TON} label="Адрес кошелька TON" copyKey="ton" copied={copied} onCopy={copy} />
              <button
                onClick={() => notifyManual("ton")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {notifyLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Я оплатил(а) TON
              </button>
            </div>
          )}

          {/* ── РФ/СБП ── */}
          {tab === "rub" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">К оплате</div>
                {ratesLoading ? (
                  <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                ) : (
                  <div className="text-3xl font-extrabold text-gray-900">
                    {rates?.rub?.toLocaleString("ru-RU") ?? "—"} <span className="text-base text-gray-400 font-medium">₽</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">≈ €{amount} · Курс ЦБ РФ + 5%</div>
              </div>
              <QRCode data={SBP_LINK} />
              <p className="text-center text-xs text-gray-500 font-medium">Отсканируйте для перевода по СБП</p>
              <a
                href={SBP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#FFDD2D] text-gray-900 font-bold py-4 rounded-2xl text-[15px] transition-opacity"
              >
                Перейти к оплате (Tinkoff)
              </a>
              <button
                onClick={() => notifyManual("rub")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {notifyLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Я оплатил(а) рублями
              </button>
            </div>
          )}

          {/* ── Bizum ── */}
          {tab === "bizum" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3 text-center">Сумма к переводу</div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-4">€{amount}</div>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="w-10 h-10 bg-[#00C853] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-extrabold text-lg">B</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Номер Bizum</div>
                    <button
                      onClick={() => copy(BIZUM_PHONE, "bizum")}
                      className="flex items-center gap-1.5 mt-0.5"
                    >
                      <span className="text-xl font-extrabold text-gray-900 tracking-wider">{BIZUM_PHONE}</span>
                      {copied === "bizum"
                        ? <Check size={16} className="text-emerald-500" />
                        : <Copy size={16} className="text-gray-400" />
                      }
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center leading-relaxed">
                  Укажите в комментарии: <strong>{tariffLabel}</strong>
                </div>
              </div>
              <button
                onClick={() => notifyManual("bizum")}
                disabled={notifyLoading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-[15px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              >
                {notifyLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Я отправил(а) Bizum
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Футер */}
      <p className="mt-5 text-white/50 text-sm text-center">
        Проблемы с оплатой?{" "}
        <a href="https://t.me/emigrationpublic" className="text-white font-semibold underline underline-offset-2">
          Напишите нам
        </a>
      </p>
    </div>
  );
}
