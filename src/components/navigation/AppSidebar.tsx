import { memo, Suspense, lazy, useCallback, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import {
  Home, FileText, BookOpen, Gamepad2, Swords, SignpostBig,
  Newspaper, BookMarked, Settings, ChevronsLeft, ChevronsRight,
  Shield as AdminShield, HelpCircle, GraduationCap,
  LogIn, Bell, LogOut, Crown, ChevronRight,
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
  },
  ru: {
    home: "Главная", tests: "Тесты", learning: "Обучение", games: "Игры",
    signs: "Знаки ПДД", dictionary: "Словарь", blog: "Блог", handbook: "Справочник",
    admin: "Админ", settings: "Настройки", help: "Помощь", login: "Войти",
    library: "Библиотека", system: "Система", notifications: "Уведомления",
    premium: "Premium", free: "Бесплатный", logout: "Выйти",
  },
  en: {
    home: "Home", tests: "Tests", learning: "Learning", games: "Games",
    signs: "Road Signs", dictionary: "Dictionary", blog: "Blog", handbook: "Handbook",
    admin: "Admin", settings: "Settings", help: "Help", login: "Log in",
    library: "Library", system: "System", notifications: "Notifications",
    premium: "Premium", free: "Free", logout: "Log out",
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

/* ─────────── SidebarNavItem ─────────── */

const SidebarNavItem = memo(({ item, collapsed, pathname }: {
  item: SidebarItem; collapsed: boolean; pathname: string;
}) => {
  const active = isPathActive(pathname, item);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      title={collapsed ? item.name : undefined}
      className={cn(
        "group relative flex items-center rounded-lg transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-3 px-3 h-9",
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
          collapsed ? "w-[17px] h-[17px]" : "w-4 h-4",
          active ? "text-primary" : "text-inherit",
        )}
        strokeWidth={active ? 2.2 : 1.6}
      />
      {!collapsed && (
        <span className={cn("truncate text-[13px] leading-none", active ? "font-semibold" : "font-medium")}>
          {item.name}
        </span>
      )}
      {item.isActiveDuel && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-[60] whitespace-nowrap rounded-md bg-popover/95 backdrop-blur border border-border/60 px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-100">
          {item.name}
        </span>
      )}
    </NavLink>
  );
});
SidebarNavItem.displayName = "SidebarNavItem";

/* ─────────── Divider ─────────── */

const Divider = memo(({ label, collapsed }: { label?: string; collapsed: boolean }) => {
  if (collapsed) return <div className="my-1.5 mx-2 h-px bg-white/[0.06]" />;
  if (!label) return <div className="my-1.5 mx-2 h-px bg-white/[0.06]" />;
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/30 select-none whitespace-nowrap">
        {label}
      </span>
      <span className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
});
Divider.displayName = "Divider";

/* ─────────── SidebarButton ─────────── */

const SidebarButton = memo(({ icon: Icon, label, collapsed, onClick, badge }: {
  icon: LucideIcon; label: string; collapsed: boolean; onClick: () => void; badge?: number;
}) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      "group relative flex items-center rounded-lg transition-all duration-150 select-none w-full",
      "text-muted-foreground/55 hover:text-muted-foreground/90 hover:bg-white/[0.04]",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
      collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-3 px-3 h-9",
    )}
  >
    <Icon className="w-4 h-4 shrink-0 text-inherit transition-colors" strokeWidth={1.6} />
    {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
    {badge != null && badge > 0 && (
      <span className={cn(
        "flex items-center justify-center min-w-[16px] h-4 rounded-full bg-primary/20 text-[10px] font-bold text-primary",
        collapsed ? "absolute -top-0.5 -right-0.5" : "ml-auto px-1",
      )}>
        {badge > 99 ? "99+" : badge}
      </span>
    )}
    {collapsed && (
      <span className="pointer-events-none absolute left-full ml-2 z-[60] whitespace-nowrap rounded-md bg-popover/95 backdrop-blur border border-border/60 px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-100">
        {label}
      </span>
    )}
  </button>
));
SidebarButton.displayName = "SidebarButton";

/* ─────────── Profile Row ─────────── */

const SidebarProfileRow = memo(({
  collapsed, s, onOpenNotifications, profileId, logout,
}: {
  collapsed: boolean;
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
  const subscriptionLabel = isPremium ? s.premium : s.free;
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
      <div className={cn(
        "flex items-center gap-2.5 px-2 py-2 rounded-xl",
        collapsed ? "justify-center" : "",
      )}>
        <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
        {!collapsed && <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-2 w-12 rounded bg-white/[0.04] animate-pulse" />
        </div>}
      </div>
    );
  }

  if (collapsed) {
    return (
      <button
        onClick={() => openSettings("account")}
        title={displayName}
        className="group relative w-9 h-9 mx-auto flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
      >
        <UserAvatar profileId={profileId} size="sm" forcePremium={isPremiumUser} />
        <span className="pointer-events-none absolute left-full ml-2 z-[60] whitespace-nowrap rounded-md bg-popover/95 backdrop-blur border border-border/60 px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-100">
          {displayName}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1 rounded-xl hover:bg-white/[0.04] transition-colors group">
      {/* Avatar */}
      <button
        onClick={() => openSettings("account")}
        className="shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-full"
      >
        <UserAvatar profileId={profileId} size="sm" forcePremium={isPremiumUser} />
      </button>

      {/* Name + status */}
      <button
        onClick={() => openSettings("account")}
        className="flex-1 min-w-0 text-left focus-visible:outline-none"
      >
        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
          {displayName}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {isPremiumUser && (
            <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" strokeWidth={2} />
          )}
          <span className={cn(
            "text-[10px] font-medium leading-tight truncate",
            isPremiumUser ? "text-amber-400/80" : "text-muted-foreground/50",
          )}>
            {subscriptionLabel}
          </span>
        </div>
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title={s.logout}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
      >
        <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
});
SidebarProfileRow.displayName = "SidebarProfileRow";

/* ═══════════════════ MAIN SIDEBAR ═══════════════ */

const SIDEBAR_W = 232;
const SIDEBAR_COLLAPSED_W = 56;

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
  const { sidebarCollapsed, toggleSidebarCollapsed, openSettings } = useSettingsStore();
  const { isAdmin } = useIsAdmin();
  const { activeDuel } = useActiveDuel();
  const collapsed = sidebarCollapsed;
  const w = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  const s = i18n[language] ?? i18n.en;

  const handleToggle = useCallback(() => {
    triggerHaptic("light");
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

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
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
      className={cn(
        "fixed left-0 top-0 z-50 h-dvh hidden md:flex flex-col",
        "border-r border-white/[0.06] bg-background",
      )}
      style={{ width: w }}
    >
      {/* ── Header: Logo + Context ── */}
      <div className={cn(
        "flex items-center shrink-0 h-14 overflow-visible",
        collapsed ? "justify-center px-1.5" : "px-3",
      )}>
        <NavLink to="/dashboard" className="shrink-0 flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40">
          <LandingLogo variant="bold" showText={!collapsed} />
        </NavLink>
        {!collapsed && isAuthenticated && (
          <>
            <div className="h-5 w-px bg-white/[0.08] mx-2 shrink-0" />
            <ContextSwitcher embedded className="shrink-0 shadow-none text-xs !px-1.5 !h-7" />
          </>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1 pb-1 scrollbar-none">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>

        <Divider label={s.library} collapsed={collapsed} />

        <div className="space-y-0.5">
          {libraryItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>

        {isAuthenticated && isAdmin && (
          <>
            <Divider collapsed={collapsed} />
            <SidebarNavItem
              item={{ name: s.admin, href: "/admin", icon: AdminShield, matchPaths: ["/admin"] }}
              collapsed={collapsed}
              pathname={pathname}
            />
          </>
        )}
      </nav>

      {/* ── Wallet ── */}
      {isAuthenticated && !collapsed && (
        <div className="shrink-0 px-2.5 py-1.5 border-t border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <WalletWidget />
          </div>
        </div>
      )}

      {/* ── Bottom: utility buttons ── */}
      <div className={cn(
        "shrink-0 border-t border-white/[0.06] px-2 pt-1.5 pb-1 space-y-0.5",
        collapsed && "flex flex-col items-center",
      )}>
        {isAuthenticated && (
          <SidebarButton icon={Bell} label={s.notifications} collapsed={collapsed} onClick={onOpenNotifications} badge={unreadCount} />
        )}
        <SidebarButton icon={HelpCircle} label={s.help} collapsed={collapsed} onClick={() => window.open("/help", "_self")} />
        <SidebarButton icon={Settings} label={s.settings} collapsed={collapsed} onClick={() => openSettings("general")} />
      </div>

      {/* ── Profile row ── */}
      <div className={cn(
        "shrink-0 border-t border-white/[0.06] px-2 py-2",
        collapsed && "flex flex-col items-center",
      )}>
        {isAuthenticated ? (
          <SidebarProfileRow
            collapsed={collapsed}
            s={s}
            onOpenNotifications={onOpenNotifications}
            profileId={profileId}
            logout={logout}
          />
        ) : (
          <button
            onClick={onOpenAuth}
            className={cn(
              "flex items-center gap-2.5 rounded-lg h-9 text-[13px] font-semibold transition-all w-full",
              "bg-primary/10 text-primary hover:bg-primary/15",
              collapsed ? "justify-center w-9 mx-auto" : "px-3",
            )}
          >
            <LogIn className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>{s.login}</span>}
          </button>
        )}
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={handleToggle}
        className="absolute z-[51] flex items-center justify-center rounded-full w-5 h-5 bg-background border border-white/[0.1] shadow-sm text-muted-foreground/40 hover:text-muted-foreground hover:border-white/[0.2] hover:bg-muted/60 transition-all duration-150 top-[23px] -right-[10px]"
        title={collapsed ? "Развернуть" : "Свернуть"}
      >
        {collapsed
          ? <ChevronsRight className="w-2.5 h-2.5" strokeWidth={2.5} />
          : <ChevronsLeft className="w-2.5 h-2.5" strokeWidth={2.5} />
        }
      </button>
    </motion.aside>
  );
});

AppSidebar.displayName = "AppSidebar";
