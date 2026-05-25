import { memo, Suspense, lazy, useCallback, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import {
  Home, FileText, BookOpen, Gamepad2, Swords, SignpostBig,
  Newspaper, BookMarked, Settings, Pin, PinOff,
  Shield as AdminShield, HelpCircle, GraduationCap,
  LogIn, Bell, LogOut, Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSettingsStore } from "@/store/settingsStore";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { ContextSwitcher } from "@/components/shared/ContextSwitcher";
import { WalletWidget } from "./WalletWidget";
import { useActiveDuel } from "@/hooks/useActiveDuel";
import { triggerHaptic } from "@/lib/haptics";
import { useProfileData } from "@/hooks/useProfileData";
import { usePremium } from "@/hooks/usePremium";
import { UserAvatar } from "@/components/UserAvatar";
import { useQueryClient } from "@tanstack/react-query";

/* ─────────── i18n ─────────── */

const i18n: Record<Language, Record<string, string>> = {
  es: {
    home: "Inicio", tests: "Pruebas", learning: "Aprendizaje", games: "Juegos",
    signs: "Señales", dictionary: "Diccionario", blog: "Blog", handbook: "Manual",
    admin: "Admin", settings: "Configuración", help: "Ayuda", login: "Iniciar sesión",
    library: "Biblioteca", system: "Sistema", notifications: "Notificaciones",
    premium: "Premium", free: "Gratuito", logout: "Cerrar sesión",
    pin: "Fijar panel", unpin: "Desfijar panel",
  },
  ru: {
    home: "Главная", tests: "Тесты", learning: "Обучение", games: "Игры",
    signs: "Знаки ПДД", dictionary: "Словарь", blog: "Блог", handbook: "Справочник",
    admin: "Админ", settings: "Настройки", help: "Помощь", login: "Войти",
    library: "Библиотека", system: "Система", notifications: "Уведомления",
    premium: "Premium", free: "Бесплатный", logout: "Выйти",
    pin: "Закрепить панель", unpin: "Открепить панель",
  },
  en: {
    home: "Home", tests: "Tests", learning: "Learning", games: "Games",
    signs: "Road Signs", dictionary: "Dictionary", blog: "Blog", handbook: "Handbook",
    admin: "Admin", settings: "Settings", help: "Help", login: "Log in",
    library: "Library", system: "System", notifications: "Notifications",
    premium: "Premium", free: "Free", logout: "Log out",
    pin: "Pin sidebar", unpin: "Unpin sidebar",
  },
};

/* ─────────── Types ─────────── */

type SidebarItem = {
  name: string; href: string; icon: LucideIcon;
  matchPaths?: string[]; isActiveDuel?: boolean;
};

const isPathActive = (pathname: string, item: SidebarItem) => {
  const paths = item.matchPaths?.length ? item.matchPaths : [item.href];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

/* ─────────── Nav Item ─────────── */

const SidebarNavItem = memo(({ item, open, pathname }: {
  item: SidebarItem; open: boolean; pathname: string;
}) => {
  const active = isPathActive(pathname, item);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      className={cn(
        "group relative flex items-center rounded-xl transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        open ? "gap-3 px-3 h-9 mx-0" : "justify-center w-9 h-9 mx-auto",
        active
          ? "bg-white/[0.08] text-foreground"
          : "text-muted-foreground/55 hover:text-muted-foreground/90 hover:bg-white/[0.04]",
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {active && (
        <motion.span
          layoutId="sidebar-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r bg-primary"
          style={{ height: 16 }}
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <Icon
        className={cn(
          "shrink-0 transition-colors duration-150",
          open ? "w-4 h-4" : "w-[17px] h-[17px]",
          active ? "text-primary" : "text-inherit",
        )}
        strokeWidth={active ? 2.2 : 1.6}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "truncate text-[13px] leading-none overflow-hidden whitespace-nowrap",
              active ? "font-semibold" : "font-medium",
            )}
          >
            {item.name}
          </motion.span>
        )}
      </AnimatePresence>
      {item.isActiveDuel && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
      )}
      {/* Tooltip только когда закрыт */}
      {!open && (
        <span className="pointer-events-none absolute left-full ml-3 z-[60] whitespace-nowrap rounded-lg bg-popover/95 backdrop-blur-sm border border-border/60 px-2.5 py-1.5 text-[12px] font-medium text-popover-foreground shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
          {item.name}
        </span>
      )}
    </NavLink>
  );
});
SidebarNavItem.displayName = "SidebarNavItem";

/* ─────────── Divider ─────────── */

const Divider = memo(({ label, open }: { label?: string; open: boolean }) => {
  if (!open || !label) return <div className="my-1.5 mx-2 h-px bg-white/[0.06]" />;
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <AnimatePresence initial={false}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/30 select-none whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>
      <span className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
});
Divider.displayName = "Divider";

/* ─────────── Sidebar Button ─────────── */

const SidebarButton = memo(({ icon: Icon, label, open, onClick, badge }: {
  icon: LucideIcon; label: string; open: boolean; onClick: () => void; badge?: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative flex items-center rounded-xl transition-all duration-150 select-none w-full",
      "text-muted-foreground/55 hover:text-muted-foreground/90 hover:bg-white/[0.04]",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
      open ? "gap-3 px-3 h-9" : "justify-center w-9 h-9 mx-auto",
    )}
  >
    <Icon className="w-4 h-4 shrink-0 text-inherit transition-colors" strokeWidth={1.6} />
    <AnimatePresence initial={false}>
      {open && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="text-[13px] font-medium truncate overflow-hidden whitespace-nowrap flex-1"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
    {badge != null && badge > 0 && (
      <span className={cn(
        "flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary/20 text-[10px] font-bold text-primary px-1",
        !open && "absolute -top-0.5 -right-0.5",
      )}>
        {badge > 99 ? "99+" : badge}
      </span>
    )}
    {!open && (
      <span className="pointer-events-none absolute left-full ml-3 z-[60] whitespace-nowrap rounded-lg bg-popover/95 backdrop-blur-sm border border-border/60 px-2.5 py-1.5 text-[12px] font-medium text-popover-foreground shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
        {label}
      </span>
    )}
  </button>
));
SidebarButton.displayName = "SidebarButton";

/* ─────────── Profile Row ─────────── */

const SidebarProfileRow = memo(({ open, s, onOpenNotifications, profileId, logout }: {
  open: boolean;
  s: Record<string, string>;
  onOpenNotifications: () => void;
  profileId: string | null;
  logout: () => void;
}) => {
  const { profileData: profile, loading } = useProfileData();
  const { isPremium } = usePremium();
  const { openSettings } = useSettingsStore();
  const queryClient = useQueryClient();

  const displayName = profile?.first_name || profile?.username || "—";
  const isPremiumUser = isPremium
    || profile?.subscription_status === 'pro'
    || profile?.subscription_status === 'lifetime'
    || !!profile?.premium_forever_purchased_at;

  const handleLogout = useCallback(async () => {
    try { queryClient.clear(); } catch (_) {}
    logout();
  }, [logout, queryClient]);

  if (loading && !profile) {
    return (
      <div className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-xl", !open && "justify-center")}>
        <div className="w-7 h-7 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
        {open && <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-2 w-12 rounded bg-white/[0.04] animate-pulse" />
        </div>}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => openSettings("account")}
        title={displayName}
        className="group relative w-9 h-9 mx-auto flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors"
      >
        <div className="w-7 h-7 flex items-center justify-center">
          <UserAvatar profileId={profileId} size="sm" forcePremium={isPremiumUser} />
        </div>
        <span className="pointer-events-none absolute left-full ml-3 z-[60] whitespace-nowrap rounded-lg bg-popover/95 backdrop-blur-sm border border-border/60 px-2.5 py-1.5 text-[12px] font-medium text-popover-foreground shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
          {displayName}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => openSettings("account")}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors group text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
    >
      <div className="shrink-0 w-7 h-7 flex items-center justify-center">
        <UserAvatar profileId={profileId} size="sm" forcePremium={isPremiumUser} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate leading-snug">{displayName}</p>
        <div className="flex items-center gap-1">
          {isPremiumUser && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" strokeWidth={2} />}
          <span className={cn(
            "text-[10px] font-medium leading-none truncate",
            isPremiumUser ? "text-amber-400/80" : "text-muted-foreground/45",
          )}>
            {isPremiumUser ? s.premium : s.free}
          </span>
        </div>
      </div>
      <div
        role="button"
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
        title={s.logout}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/25 hover:text-muted-foreground/60 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
      >
        <LogOut className="w-3 h-3" strokeWidth={1.8} />
      </div>
    </button>
  );
});
SidebarProfileRow.displayName = "SidebarProfileRow";

/* ═══════════════════ MAIN SIDEBAR ═══════════════ */

const SIDEBAR_W = 232;
const SIDEBAR_NARROW_W = 56;

export const AppSidebar = memo(({
  notificationsApi,
  onOpenNotifications,
  onOpenAuth,
}: {
  notificationsApi: any;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
}) => {
  const { pathname } = useLocation();
  const { isAuthenticated, profileId, logout } = useUserContext();
  const { language } = useLanguage();
  const { sidebarCollapsed, setSidebarCollapsed, openSettings } = useSettingsStore();
  const { isAdmin } = useIsAdmin();
  const { activeDuel } = useActiveDuel();

  // Pinned = sidebarCollapsed is false (user locked it open)
  // Hover = временно раскрыт наведением
  const isPinned = !sidebarCollapsed;
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar показывает текст если: закреплён открытым ИЛИ наведён
  const isOpen = isPinned || isHovered;
  const w = isOpen ? SIDEBAR_W : SIDEBAR_NARROW_W;

  const s = i18n[language] ?? i18n.en;

  const handleMouseEnter = useCallback(() => {
    if (!isPinned) setIsHovered(true);
  }, [isPinned]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handlePinToggle = useCallback(() => {
    triggerHaptic("light");
    // Закрепляем открытым или возвращаем в hover-режим
    setSidebarCollapsed(isPinned); // если pinned → unpin (collapsed=true), если не pinned → pin (collapsed=false)
  }, [isPinned, setSidebarCollapsed]);

  const mainItems = useMemo<SidebarItem[]>(() => [
    { name: s.home, href: "/dashboard", icon: Home, matchPaths: ["/dashboard"] },
    { name: s.tests, href: "/tests", icon: FileText, matchPaths: ["/tests", "/test"] },
    { name: s.learning, href: "/learning", icon: BookOpen, matchPaths: ["/learning", "/learning-map", "/topic", "/subtopic"] },
    activeDuel && activeDuel.mode !== "result"
      ? { name: s.games, href: `/games/duel?duelId=${activeDuel.duelId}`, icon: Swords, isActiveDuel: true, matchPaths: ["/games/duel"] }
      : { name: s.games, href: "/games", icon: Gamepad2, matchPaths: ["/games"] },
  ], [s, activeDuel]);

  const libraryItems = useMemo<SidebarItem[]>(() => [
    { name: s.signs, href: "/road-signs", icon: SignpostBig, matchPaths: ["/road-signs"] },
    { name: s.dictionary, href: "/dictionary", icon: BookMarked, matchPaths: ["/dictionary"] },
    { name: s.blog, href: "/blog", icon: Newspaper, matchPaths: ["/blog", "/article"] },
    { name: s.handbook, href: "/learn/russia/handbook", icon: GraduationCap, matchPaths: ["/learn/russia/handbook"] },
  ], [s]);

  const unreadCount = notificationsApi?.unreadCount ?? 0;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed left-0 top-0 z-50 h-dvh hidden md:flex flex-col",
        // Скругление правой стороны — как на макетах
        "rounded-r-2xl",
        "border-r border-white/[0.06] bg-background",
        // Тень при hover-overlay (не закреплён, просто наведён)
        isHovered && !isPinned && "shadow-[4px_0_24px_rgba(0,0,0,0.25)]",
        "overflow-hidden",
      )}
      style={{ width: SIDEBAR_NARROW_W }} // начальное значение до hydration
    >
      {/* ── Header ── */}
      <div className={cn(
        "flex items-center shrink-0 h-14",
        isOpen ? "px-3 gap-2" : "justify-center px-1.5",
      )}>
        <NavLink
          to="/dashboard"
          className="shrink-0 flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        >
          <LandingLogo variant="bold" showText={isOpen} />
        </NavLink>

        <AnimatePresence initial={false}>
          {isOpen && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 ml-auto shrink-0"
            >
              <div className="h-5 w-px bg-white/[0.08]" />
              <ContextSwitcher embedded className="shadow-none text-xs !px-1.5 !h-7" />
              {/* Pin toggle */}
              <button
                onClick={handlePinToggle}
                title={isPinned ? s.unpin : s.pin}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-white/[0.06] transition-colors"
              >
                {isPinned
                  ? <PinOff className="w-3 h-3" strokeWidth={2} />
                  : <Pin className="w-3 h-3" strokeWidth={2} />
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1 pb-1 scrollbar-none">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} open={isOpen} pathname={pathname} />
          ))}
        </div>

        <Divider label={s.library} open={isOpen} />

        <div className="space-y-0.5">
          {libraryItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} open={isOpen} pathname={pathname} />
          ))}
        </div>

        {isAuthenticated && isAdmin && (
          <>
            <Divider open={isOpen} />
            <SidebarNavItem
              item={{ name: s.admin, href: "/admin", icon: AdminShield, matchPaths: ["/admin"] }}
              open={isOpen}
              pathname={pathname}
            />
          </>
        )}
      </nav>

      {/* ── Wallet (только раскрытый) ── */}
      {isAuthenticated && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0 px-2.5 py-1.5 border-t border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <WalletWidget />
          </div>
        </motion.div>
      )}

      {/* ── Bottom buttons ── */}
      <div className={cn(
        "shrink-0 border-t border-white/[0.06] px-2 pt-1.5 pb-1 space-y-0.5",
        !isOpen && "flex flex-col items-center",
      )}>
        {isAuthenticated && (
          <SidebarButton icon={Bell} label={s.notifications} open={isOpen} onClick={onOpenNotifications} badge={unreadCount} />
        )}
        <SidebarButton icon={HelpCircle} label={s.help} open={isOpen} onClick={() => window.open("/help", "_self")} />
        <SidebarButton icon={Settings} label={s.settings} open={isOpen} onClick={() => openSettings("general")} />
      </div>

      {/* ── Profile row ── */}
      <div className={cn(
        "shrink-0 border-t border-white/[0.06] px-2 py-2",
        !isOpen && "flex flex-col items-center",
      )}>
        {isAuthenticated ? (
          <SidebarProfileRow
            open={isOpen}
            s={s}
            onOpenNotifications={onOpenNotifications}
            profileId={profileId}
            logout={logout}
          />
        ) : (
          <button
            onClick={onOpenAuth}
            className={cn(
              "flex items-center gap-2.5 rounded-xl h-9 text-[13px] font-semibold transition-all w-full",
              "bg-primary/10 text-primary hover:bg-primary/15",
              !isOpen ? "justify-center w-9 mx-auto" : "px-3",
            )}
          >
            <LogIn className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            {isOpen && <span>{s.login}</span>}
          </button>
        )}
      </div>
    </motion.aside>
  );
});

AppSidebar.displayName = "AppSidebar";
