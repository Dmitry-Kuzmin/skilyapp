// =====================================================
// Управление ценами курса DGT — /admin/pricing
// Единый источник правды: бот + лендинг читают отсюда
// =====================================================
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Check, X, Tag, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  label_ru: string;
  price_eur: number;
  original_price_eur: number | null;
  format: string;
  promo_label: string | null;
  promo_until: string | null;
  active: boolean;
};

type Addon = {
  id: number;
  addon_key: string;
  label: string;
  description: string | null;
  price_group: number;
  price_individual: number;
  is_active: boolean;
};

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({
  value,
  onSave,
  type = "text",
  prefix,
}: {
  value: string | number | null;
  onSave: (v: string) => Promise<void>;
  type?: "text" | "number";
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (val === String(value ?? "")) { setEditing(false); return; }
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setVal(String(value ?? "")); setEditing(true); }}
        className="group flex items-center gap-1.5 text-left hover:text-white transition-colors"
      >
        <span>{prefix}{value ?? "—"}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="w-24 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm text-white outline-none focus:border-blue-400"
      />
      <button onClick={save} disabled={saving} className="text-emerald-400 hover:text-emerald-300">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Format badge ──────────────────────────────────────────────────────────────
const FORMAT_LABEL: Record<string, string> = {
  group: "Группа",
  mini_group: "Мини-группа",
  individual: "Индивидуально",
};
const FORMAT_COLOR: Record<string, string> = {
  group: "bg-blue-500/15 text-blue-300",
  mini_group: "bg-violet-500/15 text-violet-300",
  individual: "bg-amber-500/15 text-amber-300",
};

// ─────────────────────────────────────────────────────────────────────────────

export function AdminPricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [plansRes, addonsRes] = await Promise.all([
      (supabase as any).from("course_plans").select("*").order("sort_order"),
      (supabase as any).from("course_addons").select("*").order("sort_order"),
    ]);
    if (plansRes.data) setPlans(plansRes.data);
    if (addonsRes.data) setAddons(addonsRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Plan update helpers ───────────────────────────────────────────────────
  const updatePlan = async (id: string, field: keyof Plan, raw: string) => {
    const value = field === "price_eur" || field === "original_price_eur"
      ? (raw === "" ? null : Number(raw))
      : raw === "" ? null : raw;

    const { error, count } = await (supabase as any)
      .from("course_plans")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id", { count: "exact", head: true });

    if (error) { toast.error(`Ошибка: ${error.message}`); return; }
    if (count === 0) { toast.error("Не сохранено — нет прав доступа"); return; }
    toast.success("Сохранено");
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const togglePlanActive = async (id: string, current: boolean) => {
    await (supabase as any).from("course_plans").update({ active: !current }).eq("id", id);
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, active: !current } : p));
    toast.success(!current ? "Тариф активирован" : "Тариф скрыт");
  };

  // ── Addon update helpers ──────────────────────────────────────────────────
  const updateAddon = async (id: number, field: keyof Addon, raw: string) => {
    const value = field === "price_group" || field === "price_individual"
      ? Number(raw) : raw;
    const { error, count } = await (supabase as any)
      .from("course_addons")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id", { count: "exact", head: true });
    if (error) { toast.error(`Ошибка: ${error.message}`); return; }
    if (count === 0) { toast.error("Не сохранено — нет прав доступа"); return; }
    toast.success("Сохранено");
    setAddons((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
  };

  const toggleAddonActive = async (id: number, current: boolean) => {
    await (supabase as any).from("course_addons").update({ is_active: !current }).eq("id", id);
    setAddons((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Загрузка...</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Цены курса DGT</h1>
        <p className="text-sm text-zinc-500">
          Изменения подхватываются ботом и лендингом автоматически — перезапуск не нужен.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Нажми на любое значение чтобы отредактировать. Изменения сохраняются мгновенно.</span>
      </div>

      {/* ── Plans table ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          Тарифы
        </h2>

        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_90px_90px_160px_100px_60px] bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            <span>Тариф</span>
            <span className="text-center">Цена</span>
            <span className="text-center">Зачёркнутая</span>
            <span>Акция</span>
            <span>Формат</span>
            <span className="text-center">Вкл</span>
          </div>

          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={cn(
                "grid grid-cols-[1fr_90px_90px_160px_100px_60px] items-center px-4 py-3 text-sm",
                i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent",
                "border-t border-white/[0.05]",
                !plan.active && "opacity-50"
              )}
            >
              {/* Label */}
              <EditableCell
                value={plan.label_ru}
                onSave={(v) => updatePlan(plan.id, "label_ru", v)}
              />

              {/* Price */}
              <div className="text-center">
                <EditableCell
                  value={plan.price_eur}
                  type="number"
                  prefix="€"
                  onSave={(v) => updatePlan(plan.id, "price_eur", v)}
                />
              </div>

              {/* Original price */}
              <div className="text-center text-zinc-500">
                <EditableCell
                  value={plan.original_price_eur}
                  type="number"
                  prefix="€"
                  onSave={(v) => updatePlan(plan.id, "original_price_eur", v)}
                />
              </div>

              {/* Promo label */}
              <EditableCell
                value={plan.promo_label}
                onSave={(v) => updatePlan(plan.id, "promo_label", v)}
              />

              {/* Format badge */}
              <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold w-fit", FORMAT_COLOR[plan.format] ?? "bg-zinc-700 text-zinc-300")}>
                {FORMAT_LABEL[plan.format] ?? plan.format}
              </span>

              {/* Toggle active */}
              <div className="flex justify-center">
                <button
                  onClick={() => togglePlanActive(plan.id, plan.active)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    plan.active ? "bg-emerald-500" : "bg-zinc-700"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                    plan.active ? "left-[18px]" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Addons table ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-zinc-400" />
          Аддоны
          <span className="text-xs text-zinc-600 font-normal ml-1">— можно переименовать, не трогая код</span>
        </h2>

        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px_60px] bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            <span>Название</span>
            <span className="text-center">Цена (группа)</span>
            <span className="text-center">Цена (инд.)</span>
            <span className="text-center">Вкл</span>
          </div>

          {addons.map((addon, i) => (
            <div
              key={addon.id}
              className={cn(
                "grid grid-cols-[1fr_120px_120px_60px] items-center px-4 py-3 text-sm",
                i % 2 === 0 ? "bg-white/[0.01]" : "bg-transparent",
                "border-t border-white/[0.05]",
                !addon.is_active && "opacity-50"
              )}
            >
              <div>
                <EditableCell
                  value={addon.label}
                  onSave={(v) => updateAddon(addon.id, "label", v)}
                />
                {addon.description && (
                  <p className="text-[11px] text-zinc-600 mt-0.5">{addon.description}</p>
                )}
              </div>

              <div className="text-center">
                <EditableCell
                  value={addon.price_group}
                  type="number"
                  prefix="€"
                  onSave={(v) => updateAddon(addon.id, "price_group", v)}
                />
              </div>

              <div className="text-center">
                <EditableCell
                  value={addon.price_individual}
                  type="number"
                  prefix="€"
                  onSave={(v) => updateAddon(addon.id, "price_individual", v)}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => toggleAddonActive(addon.id, addon.is_active)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    addon.is_active ? "bg-emerald-500" : "bg-zinc-700"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                    addon.is_active ? "left-[18px]" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
