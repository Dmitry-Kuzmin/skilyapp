// =====================================================
// История чатов с ботом — /admin/bot-chats
// Левая панель: список юзеров по дате последнего сообщения
// Правая панель: переписка в стиле мессенджера
// =====================================================
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MessageSquare, Search, RefreshCw, Bot, User, MousePointerClick, Terminal } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";

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
  created_at: string;
};

// ── Иконка типа сообщения ────────────────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  if (type === "command") return <Terminal className="w-3 h-3 opacity-60" />;
  if (type === "callback") return <MousePointerClick className="w-3 h-3 opacity-60" />;
  if (type === "ai") return <Bot className="w-3 h-3 opacity-60" />;
  return null;
}

// ── Пузырь сообщения ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: BotMessage }) {
  const isUser = msg.direction === "in";
  const isCallback = msg.type === "callback";
  const isAI = msg.type === "ai";

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-blue-500/20" : "bg-violet-500/20"
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-blue-400" />
          : <Bot className="w-3.5 h-3.5 text-violet-400" />
        }
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[70%] group", isUser ? "items-end" : "items-start", "flex flex-col gap-1")}>
        {/* Type badge for special types */}
        {isCallback && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 px-1">
            <MousePointerClick className="w-3 h-3" /> нажал кнопку
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
              : "bg-zinc-800 text-zinc-200 rounded-tl-sm"
        )}>
          {isCallback
            ? <code className="font-mono text-xs text-amber-300">{msg.content}</code>
            : isAI
              ? <div
                  className="prose-sm prose-invert max-w-none [&_b]:font-semibold [&_i]:italic [&_u]:underline"
                  dangerouslySetInnerHTML={{ __html: msg.content ?? "" }}
                />
              : <span className="whitespace-pre-wrap">{msg.content || <span className="opacity-40 italic">пусто</span>}</span>
          }
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-zinc-600 px-1">
          {format(new Date(msg.created_at), "HH:mm · d MMM", { locale: ru })}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminBotChats() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [filtered, setFiltered] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load user list ────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await (supabase as any)
      .from("bot_messages")
      .select("telegram_id, username, created_at")
      .order("created_at", { ascending: false });

    if (!data || error) { setLoadingUsers(false); return; }

    // Group by telegram_id client-side (Supabase doesn't support GROUP BY via JS client)
    const map = new Map<number, ChatUser>();
    for (const row of data as { telegram_id: number; username: string | null; created_at: string }[]) {
      if (!map.has(row.telegram_id)) {
        map.set(row.telegram_id, {
          telegram_id: row.telegram_id,
          username: row.username,
          last_seen: row.created_at,
          msg_count: 1,
        });
      } else {
        map.get(row.telegram_id)!.msg_count++;
        // update username if missing
        if (!map.get(row.telegram_id)!.username && row.username) {
          map.get(row.telegram_id)!.username = row.username;
        }
      }
    }

    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    );

    setUsers(list);
    setFiltered(list);
    setLoadingUsers(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Filter on search ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(users); return; }
    setFiltered(users.filter(u =>
      String(u.telegram_id).includes(q) ||
      (u.username ?? "").toLowerCase().includes(q)
    ));
  }, [search, users]);

  // ── Load messages for selected user ──────────────────────────────────────
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
  };

  // Scroll to bottom when messages load
  useEffect(() => {
    if (!loadingMsgs) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [loadingMsgs, messages.length]);

  return (
    <div className="h-[calc(100vh-3rem)] flex overflow-hidden">

      {/* ── LEFT PANEL: user list ──────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              Чаты с ботом
            </h2>
            <button
              onClick={loadUsers}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Обновить"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск по username / id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* User rows */}
        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">Нет данных</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.telegram_id}
                onClick={() => selectUser(u)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-zinc-900 transition-colors",
                  selected?.telegram_id === u.telegram_id
                    ? "bg-zinc-800"
                    : "hover:bg-zinc-900"
                )}
              >
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
          )}
        </div>

        {/* Footer stats */}
        <div className="p-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          {users.length} уникальных юзеров
        </div>
      </div>

      {/* ── RIGHT PANEL: chat ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#09090b] min-w-0">
        {!selected ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">Выбери юзера слева</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-12 flex-shrink-0 border-b border-zinc-800 flex items-center px-5 gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">
                  {selected.username ? `@${selected.username}` : `ID ${selected.telegram_id}`}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {selected.telegram_id} · {selected.msg_count} сообщений
                </p>
              </div>
              <button
                onClick={() => loadMessages(selected)}
                className="ml-auto text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Обновить"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
                  Загрузка...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
                  Нет сообщений
                </div>
              ) : (
                <>
                  {/* Date separators + messages */}
                  {messages.map((msg, i) => {
                    const prevMsg = messages[i - 1];
                    const currDate = format(new Date(msg.created_at), "d MMMM yyyy", { locale: ru });
                    const prevDate = prevMsg
                      ? format(new Date(prevMsg.created_at), "d MMMM yyyy", { locale: ru })
                      : null;
                    const showDate = currDate !== prevDate;

                    return (
                      <div key={msg.id}>
                        {showDate && (
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
              )}
            </div>

            {/* Legend */}
            <div className="px-5 py-2.5 border-t border-zinc-900 flex items-center gap-5 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-400" /> Пользователь</span>
              <span className="flex items-center gap-1.5"><Bot className="w-3 h-3 text-violet-400" /> ИИ-ответ бота</span>
              <span className="flex items-center gap-1.5"><MousePointerClick className="w-3 h-3" /> Нажатие кнопки</span>
              <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> Команда</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
