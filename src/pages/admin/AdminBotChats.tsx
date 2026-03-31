// =====================================================
// История чатов с ботом — /admin/bot-chats
// =====================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Search, RefreshCw, Bot, User,
  MousePointerClick, Terminal, Send, Zap, Plus,
  Pencil, Trash2, Check, X, CheckCheck, Ban, AlertCircle, Clock,
  Keyboard, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ── Стили для рендера HTML из ИИ-ответов ─────────────────────────────────────
const AI_MSG_STYLES = `
.ai-msg b,.ai-msg strong{font-weight:600;color:#e4e4e7}
.ai-msg i,.ai-msg em{font-style:italic;color:#d4d4d8}
.ai-msg u{text-decoration:underline}
.ai-msg ul{list-style:disc;padding-left:1.2em;margin:6px 0}
.ai-msg ol{list-style:decimal;padding-left:1.2em;margin:6px 0}
.ai-msg li{margin:2px 0}
.ai-msg p{margin:4px 0}
.ai-msg code{font-family:monospace;font-size:.85em;background:rgba(255,255,255,.07);padding:1px 4px;border-radius:3px}
`;

// ── Готовые наборы кнопок ─────────────────────────────────────────────────────
type InlineButton = { text: string; url?: string; callback_data?: string };

const KEYBOARD_PRESETS: { label: string; keyboard: InlineButton[][] }[] = [
  {
    label: "📋 Записаться на курс",
    keyboard: [[
      { text: "📋 Записаться на курс", callback_data: "course_start" },
    ]],
  },
  {
    label: "💰 Цены + Записаться",
    keyboard: [[
      { text: "💰 Узнать цены", callback_data: "course_start" },
      { text: "✅ Записаться", callback_data: "course_start" },
    ]],
  },
  {
    label: "🌐 Открыть платформу",
    keyboard: [[
      { text: "🚀 Открыть Skily", url: "https://skilyapp.com" },
    ]],
  },
  {
    label: "📞 Связаться + платформа",
    keyboard: [[
      { text: "💬 Написать менеджеру", callback_data: "support_start" },
      { text: "🚀 Skily", url: "https://skilyapp.com" },
    ]],
  },
];

// ── Типы ─────────────────────────────────────────────────────────────────────
type ChatUser = {
  telegram_id: number;
  username: string | null;
  last_seen: string;
  msg_count: number;
};

type BotMessage = {
  id: number;
  telegram_id: number;
  direction: "in" | "out";
  type: string;
  content: string | null;
  extra: Record<string, unknown> | null;
  status: string | null;
  created_at: string;
};

type Template = {
  id: number;
  label: string;
  text: string;
  keyboard: InlineButton[][] | null;
  sort_order: number;
};

// ── Иконка статуса доставки ───────────────────────────────────────────────────
function StatusIcon({ status }: { status: string | null }) {
  if (!status || status === "sent")
    return <Clock className="w-3 h-3 text-zinc-600" title="Отправляется..." />;
  if (status === "delivered")
    return <CheckCheck className="w-3 h-3 text-emerald-500" title="Доставлено" />;
  if (status === "blocked")
    return <Ban className="w-3 h-3 text-red-500" title="Бот заблокирован пользователем" />;
  if (status === "failed")
    return <AlertCircle className="w-3 h-3 text-amber-500" title="Ошибка доставки" />;
  return null;
}

// ── Пузырь сообщения ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: BotMessage }) {
  const isUser     = msg.direction === "in";
  const isCallback = msg.type === "callback";
  const isAI       = msg.type === "ai";
  const isAdmin    = msg.type === "admin";

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-blue-500/20" : isAdmin ? "bg-emerald-500/20" : "bg-violet-500/20"
      )}>
        {isUser   ? <User className="w-3.5 h-3.5 text-blue-400" />
        : isAdmin ? <User className="w-3.5 h-3.5 text-emerald-400" />
                  : <Bot  className="w-3.5 h-3.5 text-violet-400" />}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[70%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {isCallback && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 px-1">
            <MousePointerClick className="w-3 h-3" /> нажал кнопку
          </span>
        )}
        {isAdmin && (
          <span className="text-[10px] text-emerald-600 flex items-center gap-1 px-1">
            ✍️ от команды
          </span>
        )}

        <div className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
          isUser
            ? isCallback
              ? "bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-tr-sm"
              : "bg-blue-600 text-white rounded-tr-sm"
            : isAI
              ? "bg-zinc-800 border border-violet-500/20 text-zinc-200 rounded-tl-sm"
              : isAdmin
                ? "bg-emerald-900/40 border border-emerald-700/30 text-emerald-100 rounded-tl-sm"
                : "bg-zinc-800 text-zinc-200 rounded-tl-sm"
        )}>
          {isCallback
            ? <code className="font-mono text-xs text-amber-300">{msg.content}</code>
            : isAI
              ? <div className="ai-msg" dangerouslySetInnerHTML={{ __html: msg.content ?? "" }} />
              : <span className="whitespace-pre-wrap">{msg.content || <span className="opacity-40 italic">пусто</span>}</span>
          }
          {/* Inline keyboard preview */}
          {isAdmin && msg.extra?.keyboard && (
            <div className="mt-2 space-y-1">
              {(msg.extra.keyboard as InlineButton[][]).map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((btn, bi) => (
                    <span key={bi} className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
                      {btn.text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time + status */}
        <div className={cn("flex items-center gap-1 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[10px] text-zinc-600">
            {format(new Date(msg.created_at), "HH:mm · d MMM", { locale: ru })}
          </span>
          {!isUser && <StatusIcon status={msg.status ?? null} />}
        </div>
      </div>
    </div>
  );
}

// ── Редактор одного шаблона ───────────────────────────────────────────────────
function TemplateRow({
  tpl,
  onSave,
  onDelete,
}: {
  tpl: Template;
  onSave: (id: number, label: string, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel]     = useState(tpl.label);
  const [text, setText]       = useState(tpl.text);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!label.trim() || !text.trim()) return;
    setSaving(true);
    await onSave(tpl.id, label.trim(), text.trim());
    setSaving(false);
    setEditing(false);
  };

  if (!editing) return (
    <div className="flex items-start justify-between gap-2 py-2.5 border-b border-zinc-800 group">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-300">{tpl.label}</p>
        <p className="text-[11px] text-zinc-600 truncate mt-0.5">{tpl.text}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="p-1 text-zinc-500 hover:text-zinc-300">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(tpl.id)} className="p-1 text-zinc-500 hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="py-2.5 border-b border-zinc-800 space-y-1.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Название (emoji + текст)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-zinc-500"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-zinc-500 resize-none"
      />
      <div className="flex gap-1.5">
        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs text-white">
          <Check className="w-3 h-3" /> Сохранить
        </button>
        <button onClick={() => setEditing(false)} className="px-2.5 py-1 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-zinc-200">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function AdminBotChats() {
  const [users,        setUsers]        = useState<ChatUser[]>([]);
  const [filtered,     setFiltered]     = useState<ChatUser[]>([]);
  const [selected,     setSelected]     = useState<ChatUser | null>(null);
  const [messages,     setMessages]     = useState<BotMessage[]>([]);
  const [templates,    setTemplates]    = useState<Template[]>([]);
  const [search,       setSearch]       = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [replyText,    setReplyText]    = useState("");
  const [sending,      setSending]      = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showKeyboards, setShowKeyboards] = useState(false);
  const [selectedKeyboard, setSelectedKeyboard] = useState<InlineButton[][] | null>(null);
  const [addingTemplate,   setAddingTemplate]   = useState(false);
  const [newTplLabel,      setNewTplLabel]       = useState("");
  const [newTplText,       setNewTplText]        = useState("");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inject AI styles
  useEffect(() => {
    if (!document.getElementById("ai-msg-styles")) {
      const s = document.createElement("style");
      s.id = "ai-msg-styles";
      s.textContent = AI_MSG_STYLES;
      document.head.appendChild(s);
    }
    return () => { document.getElementById("ai-msg-styles")?.remove(); };
  }, []);

  // ── Load users ──────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data } = await (supabase as any)
      .from("bot_messages")
      .select("telegram_id, username, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      const map = new Map<number, ChatUser>();
      for (const row of data as { telegram_id: number; username: string | null; created_at: string }[]) {
        if (!map.has(row.telegram_id)) {
          map.set(row.telegram_id, { telegram_id: row.telegram_id, username: row.username, last_seen: row.created_at, msg_count: 1 });
        } else {
          map.get(row.telegram_id)!.msg_count++;
          if (!map.get(row.telegram_id)!.username && row.username)
            map.get(row.telegram_id)!.username = row.username;
        }
      }
      const list = Array.from(map.values()).sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
      setUsers(list);
      setFiltered(list);
    }
    setLoadingUsers(false);
  };

  // ── Load templates ──────────────────────────────────────────────────────
  const loadTemplates = async () => {
    const { data } = await (supabase as any)
      .from("bot_reply_templates")
      .select("*")
      .order("sort_order");
    if (data) setTemplates(data as Template[]);
  };

  useEffect(() => { loadUsers(); loadTemplates(); }, []);

  // ── Filter users ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(!q ? users : users.filter(u =>
      String(u.telegram_id).includes(q) || (u.username ?? "").toLowerCase().includes(q)
    ));
  }, [search, users]);

  // ── Load messages ───────────────────────────────────────────────────────
  const loadMessages = async (user: ChatUser) => {
    setLoadingMsgs(true);
    setMessages([]);
    const { data } = await (supabase as any)
      .from("bot_messages")
      .select("*")
      .eq("telegram_id", user.telegram_id)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data as BotMessage[]) ?? []);
    setLoadingMsgs(false);
  };

  const selectUser = (user: ChatUser) => {
    setSelected(user);
    loadMessages(user);
    setReplyText("");
    setSelectedKeyboard(null);
  };

  useEffect(() => {
    if (!loadingMsgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [loadingMsgs, messages.length]);

  // ── Send reply ──────────────────────────────────────────────────────────
  const sendReply = useCallback(async (text: string) => {
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bot-send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          telegram_id: selected.telegram_id,
          text: text.trim(),
          from_admin_id: session?.user?.id,
          keyboard: selectedKeyboard,
        }),
      });

      const result = await res.json();

      // Optimistic add
      const optimistic: BotMessage = {
        id: Date.now(),
        telegram_id: selected.telegram_id,
        direction: "out",
        type: "admin",
        content: text.trim(),
        status: result.status ?? "delivered",
        extra: { keyboard: selectedKeyboard },
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
      setReplyText("");
      setSelectedKeyboard(null);

      if (result.status === "delivered") {
        toast.success("✅ Доставлено!");
      } else if (result.status === "blocked") {
        toast.error("⛔ Бот заблокирован этим пользователем");
      } else {
        toast.error(`❌ Ошибка: ${result.error ?? "неизвестная"}`);
      }

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      toast.error("Ошибка отправки");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [selected, sending, selectedKeyboard]);

  // ── Template CRUD ───────────────────────────────────────────────────────
  const saveTemplate = async (id: number, label: string, text: string) => {
    await (supabase as any).from("bot_reply_templates").update({ label, text }).eq("id", id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, label, text } : t));
    toast.success("Шаблон сохранён");
  };

  const deleteTemplate = async (id: number) => {
    await (supabase as any).from("bot_reply_templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success("Шаблон удалён");
  };

  const addTemplate = async () => {
    if (!newTplLabel.trim() || !newTplText.trim()) return;
    const { data } = await (supabase as any).from("bot_reply_templates")
      .insert({ label: newTplLabel.trim(), text: newTplText.trim(), sort_order: templates.length + 1 })
      .select().single();
    if (data) setTemplates(prev => [...prev, data as Template]);
    setNewTplLabel(""); setNewTplText(""); setAddingTemplate(false);
    toast.success("Шаблон добавлен");
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-3rem)] flex overflow-hidden">

      {/* ── LEFT: user list ──────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" /> Чаты с ботом
            </h2>
            <button onClick={loadUsers} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text" placeholder="Поиск..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingUsers
            ? <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">Загрузка...</div>
            : filtered.length === 0
              ? <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">Нет данных</div>
              : filtered.map(u => (
                <button key={u.telegram_id} onClick={() => selectUser(u)}
                  className={cn("w-full text-left px-4 py-3 border-b border-zinc-900 transition-colors",
                    selected?.telegram_id === u.telegram_id ? "bg-zinc-800" : "hover:bg-zinc-900"
                  )}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-white truncate">
                      {u.username ? `@${u.username}` : `ID ${u.telegram_id}`}
                    </span>
                    <span className="text-[10px] text-zinc-600 shrink-0 ml-2">
                      {formatDistanceToNow(new Date(u.last_seen), { locale: ru, addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">{u.telegram_id}</span>
                    <span className="text-[10px] text-zinc-700">·</span>
                    <span className="text-[10px] text-zinc-600">{u.msg_count} сообщ.</span>
                  </div>
                </button>
              ))
          }
        </div>
        <div className="p-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          {users.length} уникальных юзеров
        </div>
      </div>

      {/* ── RIGHT: chat ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#09090b] min-w-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">Выбери юзера слева</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-12 flex-shrink-0 border-b border-zinc-800 flex items-center px-5 gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {selected.username ? `@${selected.username}` : `ID ${selected.telegram_id}`}
                </p>
                <p className="text-[10px] text-zinc-600">{selected.telegram_id} · {selected.msg_count} сообщений</p>
              </div>
              <button onClick={() => loadMessages(selected)} className="ml-auto text-zinc-600 hover:text-zinc-300">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {loadingMsgs
                ? <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">Загрузка...</div>
                : messages.length === 0
                  ? <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">Нет сообщений</div>
                  : <>
                    {messages.map((msg, i) => {
                      const prev      = messages[i - 1];
                      const currDate  = format(new Date(msg.created_at), "d MMMM yyyy", { locale: ru });
                      const prevDate  = prev ? format(new Date(prev.created_at), "d MMMM yyyy", { locale: ru }) : null;
                      return (
                        <div key={msg.id}>
                          {currDate !== prevDate && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-zinc-800" />
                              <span className="text-[10px] text-zinc-600">{currDate}</span>
                              <div className="flex-1 h-px bg-zinc-800" />
                            </div>
                          )}
                          <MessageBubble msg={msg} />
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
              }
            </div>

            {/* ── Reply area ────────────────────────────────────────── */}
            <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950">

              {/* ── Шаблоны ─────────────────────────────────────────── */}
              <div className="border-b border-zinc-900">
                <button
                  onClick={() => setShowTemplates(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Шаблоны ({templates.length})</span>
                  {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showTemplates && (
                  <div className="px-4 pb-3 max-h-56 overflow-y-auto">
                    {/* Quick-use buttons */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {templates.map(t => (
                        <button key={t.id}
                          onClick={() => { setReplyText(t.text); if (t.keyboard) setSelectedKeyboard(t.keyboard); textareaRef.current?.focus(); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />{t.label}
                        </button>
                      ))}
                    </div>

                    {/* Редактор шаблонов */}
                    <div className="border border-zinc-800 rounded-xl p-3 space-y-0.5">
                      <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Управление шаблонами</p>
                      {templates.map(t => (
                        <TemplateRow key={t.id} tpl={t} onSave={saveTemplate} onDelete={deleteTemplate} />
                      ))}

                      {/* Add new */}
                      {!addingTemplate ? (
                        <button onClick={() => setAddingTemplate(true)}
                          className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Добавить шаблон
                        </button>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          <input value={newTplLabel} onChange={e => setNewTplLabel(e.target.value)}
                            placeholder="👋 Название кнопки"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-zinc-500" />
                          <textarea value={newTplText} onChange={e => setNewTplText(e.target.value)}
                            rows={2} placeholder="Текст сообщения..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-zinc-500 resize-none" />
                          <div className="flex gap-1.5">
                            <button onClick={addTemplate}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs text-white">
                              <Check className="w-3 h-3" /> Добавить
                            </button>
                            <button onClick={() => setAddingTemplate(false)}
                              className="px-2.5 py-1 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-zinc-200">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Кнопки (keyboard) ───────────────────────────────── */}
              <div className="border-b border-zinc-900">
                <button
                  onClick={() => setShowKeyboards(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-blue-400" />
                    Кнопки под сообщением
                    {selectedKeyboard && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">выбраны</span>}
                  </span>
                  {showKeyboards ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showKeyboards && (
                  <div className="px-4 pb-3 space-y-1.5">
                    <button
                      onClick={() => setSelectedKeyboard(null)}
                      className={cn("w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors",
                        !selectedKeyboard ? "border-zinc-500 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-700")}
                    >
                      — Без кнопок
                    </button>
                    {KEYBOARD_PRESETS.map((p, i) => (
                      <button key={i}
                        onClick={() => setSelectedKeyboard(p.keyboard)}
                        className={cn("w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors",
                          JSON.stringify(selectedKeyboard) === JSON.stringify(p.keyboard)
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200")}
                      >
                        <p className="font-medium">{p.label}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.keyboard.flat().map((btn, bi) => (
                            <span key={bi} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-zinc-400">{btn.text}</span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Input row ───────────────────────────────────────── */}
              <div className="px-4 pt-3 pb-4">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendReply(replyText); } }}
                    placeholder="Написать от команды Skily... (Cmd+Enter)"
                    rows={2}
                    className="flex-1 resize-none bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors leading-relaxed"
                  />
                  <button
                    onClick={() => sendReply(replyText)}
                    disabled={!replyText.trim() || sending}
                    className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                      replyText.trim() && !sending ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed")}
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">Сообщение придёт с пометкой «💬 Команда Skily:» · Cmd+Enter</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
