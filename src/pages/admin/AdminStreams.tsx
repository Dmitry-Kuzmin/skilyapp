// =====================================================
// Управление потоками курса DGT — /admin/streams
// =====================================================
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Check, X, Users, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Stream = {
  id: string;
  number: number;
  start_date: string;
  spots_total: number;
  spots_enrolled: number;
  status: "open" | "closed" | "finished";
  notes: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  first_name: string | null;
  telegram_user: string | null;
  plan_id: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:     { label: "Открыт",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  closed:   { label: "Закрыт",   cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  finished: { label: "Завершён", cls: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  qualified: "Квалифицирован",
  plan_selected: "Выбрал тариф",
  thinking: "Думает",
  paid: "Оплатил",
  lost: "Потерян",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

// ─────────────────────────────────────────────
// Форма добавления/редактирования потока
// ─────────────────────────────────────────────
function StreamForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Stream>;
  onSave: (data: Omit<Stream, "id" | "created_at">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    number: initial?.number ?? 54,
    start_date: initial?.start_date ?? "",
    spots_total: initial?.spots_total ?? 8,
    spots_enrolled: initial?.spots_enrolled ?? 0,
    status: initial?.status ?? "open",
    notes: initial?.notes ?? "",
  });

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Номер потока</span>
          <input
            type="number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: +e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Дата старта</span>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Всего мест</span>
          <input
            type="number"
            value={form.spots_total}
            onChange={(e) => setForm({ ...form, spots_total: +e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Записалось</span>
          <input
            type="number"
            value={form.spots_enrolled}
            onChange={(e) => setForm({ ...form, spots_enrolled: +e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Статус</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Stream["status"] })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="open">Открыт</option>
            <option value="closed">Закрыт</option>
            <option value="finished">Завершён</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Заметки</span>
          <input
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Необязательно"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
          />
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form as Omit<Stream, "id" | "created_at">)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          <Check className="w-4 h-4" /> Сохранить
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-sm transition-colors"
        >
          <X className="w-4 h-4" /> Отмена
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Главная страница AdminStreams
// ─────────────────────────────────────────────
export function AdminStreams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead[]>>({});
  const [expandedStream, setExpandedStream] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Общая сводка по лидам без потока
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ data: streamsData }, { data: leadsData }] = await Promise.all([
        supabase.from("course_streams" as never).select("*").order("start_date", { ascending: true }),
        supabase.from("course_leads" as never).select("id, first_name, telegram_user, plan_id, status, payment_method, stream_id, created_at").order("created_at", { ascending: false }),
      ]);

      if (streamsData) setStreams(streamsData as Stream[]);

      if (leadsData) {
        const byStream: Record<string, Lead[]> = {};
        const unassigned: Lead[] = [];
        for (const lead of leadsData as (Lead & { stream_id: string | null })[]) {
          if (lead.stream_id) {
            if (!byStream[lead.stream_id]) byStream[lead.stream_id] = [];
            byStream[lead.stream_id].push(lead);
          } else {
            unassigned.push(lead);
          }
        }
        setLeads(byStream);
        setUnassignedLeads(unassigned);
      }
    } catch (e) {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNew(data: Omit<Stream, "id" | "created_at">) {
    const { error } = await (supabase.from("course_streams" as never) as any).insert(data);
    if (error) { toast.error("Ошибка: " + error.message); return; }
    toast.success("Поток создан!");
    setShowNewForm(false);
    fetchAll();
  }

  async function handleSaveEdit(id: string, data: Omit<Stream, "id" | "created_at">) {
    const { error } = await (supabase.from("course_streams" as never) as any).update(data).eq("id", id);
    if (error) { toast.error("Ошибка: " + error.message); return; }
    toast.success("Поток обновлён!");
    setEditingId(null);
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить поток? Лиды останутся, но отвяжутся.")) return;
    await (supabase.from("course_streams" as never) as any).delete().eq("id", id);
    toast.success("Удалено");
    fetchAll();
  }

  const totalLeads = Object.values(leads).reduce((s, arr) => s + arr.length, 0) + unassignedLeads.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Потоки курса DGT</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {streams.length} потоков · {totalLeads} лидов всего
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый поток
        </button>
      </div>

      {/* Форма нового потока */}
      {showNewForm && (
        <StreamForm onSave={handleSaveNew} onCancel={() => setShowNewForm(false)} />
      )}

      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {streams.map((stream) => {
            const streamLeads = leads[stream.id] || [];
            const spotsLeft = stream.spots_total - stream.spots_enrolled;
            const paidCount = streamLeads.filter((l) => l.status === "paid").length;
            const isExpanded = expandedStream === stream.id;
            const isEditing = editingId === stream.id;
            const statusInfo = STATUS_LABELS[stream.status] || STATUS_LABELS.open;

            return (
              <div key={stream.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                {isEditing ? (
                  <div className="p-4">
                    <StreamForm
                      initial={stream}
                      onSave={(data) => handleSaveEdit(stream.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <>
                    {/* Stream row */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Expand */}
                      <button
                        onClick={() => setExpandedStream(isExpanded ? null : stream.id)}
                        className="shrink-0"
                      >
                        <ChevronRight className={cn("w-4 h-4 text-zinc-500 transition-transform", isExpanded && "rotate-90")} />
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-white font-semibold">Поток {stream.number}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", statusInfo.cls)}>
                            {statusInfo.label}
                          </span>
                          <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(stream.start_date)}
                          </span>
                        </div>
                        {stream.notes && <p className="text-zinc-600 text-xs mt-1">{stream.notes}</p>}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-5 shrink-0">
                        {/* Spots bar */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-zinc-500">
                            <span className={spotsLeft <= 1 ? "text-rose-400 font-bold" : "text-white"}>{spotsLeft}</span>
                            /{stream.spots_total} мест
                          </span>
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(stream.spots_enrolled / stream.spots_total) * 100}%` }}
                            />
                          </div>
                        </div>
                        {/* Lead count */}
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-sm">{streamLeads.length}</span>
                          {paidCount > 0 && (
                            <span className="text-emerald-400 text-xs font-bold">(+{paidCount} оплатили)</span>
                          )}
                        </div>
                        {/* Actions */}
                        <button
                          onClick={() => setEditingId(stream.id)}
                          className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(stream.id)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-600 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: leads list */}
                    {isExpanded && (
                      <div className="border-t border-white/5 px-5 py-4">
                        {streamLeads.length === 0 ? (
                          <p className="text-zinc-600 text-sm">Лидов для этого потока нет</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
                              Лиды потока ({streamLeads.length})
                            </p>
                            {streamLeads.map((lead) => (
                              <div key={lead.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-sm font-medium">
                                    {lead.first_name || "—"}
                                  </span>
                                  {lead.telegram_user && (
                                    <a
                                      href={`https://t.me/${lead.telegram_user}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-2 text-zinc-500 text-xs hover:text-blue-400"
                                    >
                                      @{lead.telegram_user}
                                    </a>
                                  )}
                                </div>
                                <span className="text-zinc-500 text-xs">
                                  {lead.plan_id ? { basic: "Теория", pro: "Pro 🚀", vip: "VIP 👑" }[lead.plan_id] ?? lead.plan_id : "—"}
                                </span>
                                <span className="text-zinc-600 text-xs">
                                  {lead.payment_method ?? "—"}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                  lead.status === "paid"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                    : "bg-white/5 text-zinc-500 border-white/10"
                                )}>
                                  {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Лиды без привязки к потоку */}
          {unassignedLeads.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5">
              <p className="text-amber-400 text-sm font-semibold mb-3">
                ⚠️ Лиды без потока ({unassignedLeads.length})
              </p>
              <div className="space-y-2">
                {unassignedLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3">
                    <span className="text-white text-sm">{lead.first_name || "—"}</span>
                    {lead.telegram_user && (
                      <a href={`https://t.me/${lead.telegram_user}`} target="_blank" rel="noreferrer"
                        className="text-zinc-500 text-xs hover:text-blue-400">
                        @{lead.telegram_user}
                      </a>
                    )}
                    <span className="text-zinc-600 text-xs ml-auto">
                      {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminStreams;
