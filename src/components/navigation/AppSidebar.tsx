import { memo, Suspense, lazy, useCallback, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import {
  Home, FileText, BookOpen, Gamepad2, Swords, SignpostBig,
  Newspaper, BookMarked, Settings, ChevronsLeft, ChevronsRight,
  Shield as AdminShield, HelpCircle, GraduationCap,
  LogIn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettingsStore } from "@/store/settingsStore";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { ContextSwitcher } from "@/components/shared/ContextSwitcher";
import { WalletWidget } from "./WalletWidget";
import { useActiveDuel } from "@/hooks/useActiveDuel";
import { triggerHaptic } from "@/lib/haptics";

const UserProfilePopover = lazy(() =>
  import("@/components/UserProfilePopover").then((m) => ({ default: m.UserProfilePopover }))
);

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  isActiveDuel?: boolean;
};

const isPathActive = (pathname: string, item: SidebarItem) => {
  const paths = item.matchPaths?.length ? item.matchPaths : [item.href];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

/* ─────────────────── Nav Item ─────────────────── */

const SidebarNavItem = memo(({
  item, collapsed, pathname,
}: {
  item: SidebarItem;
  collapsed: boolean;
  pathname: string;
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
        collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 h-9",
        active
          ? "bg-white/[0.07] text-foreground"
          : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04]",
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
          collapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
          active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground/80"
        )}
        strokeWidth={active ? 2.2 : 1.6}
      />

      {!collapsed && (
        <span className={cn(
          "truncate text-[13px] leading-none",
          active ? "font-semibold" : "font-medium"
        )}>
          {item.name}
        </span>
      )}

      {item.isActiveDuel && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
      )}

      {/* Tooltip (collapsed) */}
      {collapsed && (
        <span className={cn(
          "pointer-events-none absolute left-full ml-2.5 z-[60] whitespace-nowrap",
          "rounded-md bg-popover/95 backdrop-blur border border-border/60 px-2 py-1",
          "text-[11px] font-medium text-popover-foreground shadow-lg",
          "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-100"
        )}>
          {item.name}
        </span>
      )}
    </NavLink>
  );
});
SidebarNavItem.displayName = "SidebarNavItem";

/* ─────────────────── Divider ─────────────────── */

const Divider = memo(({ label, collapsed }: { label?: string; collapsed: boolean }) => {
  if (collapsed) return <div className="my-2 mx-3 h-px bg-border/20" />;
  if (!label) return <div className="my-2 mx-3 h-px bg-border/20" />;
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/30 select-none">
        {label}
      </span>
      <span className="flex-1 h-px bg-border/15" />
    </div>
  );
});
Divider.displayName = "Divider";

/* ─────────────────── Sidebar Button (non-link) ─ */

const SidebarButton = memo(({
  icon: Icon, label, collapsed, onClick,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      "group relative flex items-center rounded-lg transition-all duration-150 select-none w-full",
      "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.04]",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
      collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 h-9",
    )}
  >
    <Icon className="w-4 h-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors" strokeWidth={1.6} />
    {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
    {collapsed && (
      <span className="pointer-events-none absolute left-full ml-2.5 z-[60] whitespace-nowrap rounded-md bg-popover/95 backdrop-blur border border-border/60 px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-100">
        {label}
      </span>
    )}
  </button>
));
SidebarButton.displayName = "SidebarButton";

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
  const { isAuthenticated } = useUserContext();
  const { t } = useLanguage();
  const { sidebarCollapsed, toggleSidebarCollapsed, openSettings } = useSettingsStore();
  const { isAdmin } = useIsAdmin();
  const { activeDuel } = useActiveDuel();
  const collapsed = sidebarCollapsed;
  const w = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  const handleToggle = useCallback(() => {
    triggerHaptic("light");
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

  /* ── Navigation groups ──────────────────────── */

  const mainItems = useMemo<SidebarItem[]>(() => [
    { name: t("home"), href: "/dashboard", icon: Home, matchPaths: ["/dashboard"] },
    { name: t("tests"), href: "/tests", icon: FileText, matchPaths: ["/tests", "/test"] },
    { name: t("learning"), href: "/learning", icon: BookOpen, matchPaths: ["/learning", "/learning-map", "/topic", "/subtopic"] },
    activeDuel && activeDuel.mode !== "result"
      ? { name: t("games") + " · Live", href: `/games/duel?duelId=${activeDuel.duelId}`, icon: Swords, isActiveDuel: true, matchPaths: ["/games/duel"] }
      : { name: t("games"), href: "/games", icon: Gamepad2, matchPaths: ["/games"] },
  ], [t, activeDuel]);

  const libraryItems = useMemo<SidebarItem[]>(() => [
    { name: t("roadSigns") || "Знаки", href: "/road-signs", icon: SignpostBig, matchPaths: ["/road-signs"] },
    { name: t("dictionary") || "Словарь", href: "/dictionary", icon: BookMarked, matchPaths: ["/dictionary"] },
    { name: t("blog") || "Блог", href: "/blog", icon: Newspaper, matchPaths: ["/blog", "/article"] },
    { name: "Справочник", href: "/learn/russia/handbook", icon: GraduationCap, matchPaths: ["/learn/russia/handbook"] },
  ], [t]);

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
      {/* ── Header ────────────────────────────── */}
      <div className={cn(
        "flex items-center shrink-0 h-14",
        collapsed ? "justify-center px-1" : "px-4 gap-2"
      )}>
        <NavLink
          to="/dashboard"
          className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        >
          <LandingLogo variant="bold" showText={!collapsed} />
        </NavLink>
      </div>

      {/* ── Context Switcher ─────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-2.5 pb-1.5 shrink-0 overflow-hidden"
          >
            <ContextSwitcher embedded className="w-full shadow-none text-xs" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main nav ─────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-1 space-y-0.5 scrollbar-none">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>

        <Divider label="Библиотека" collapsed={collapsed} />

        <div className="space-y-0.5">
          {libraryItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>

        {isAuthenticated && isAdmin && (
          <>
            <Divider collapsed={collapsed} />
            <SidebarNavItem
              item={{ name: "Админ-панель", href: "/admin", icon: AdminShield, matchPaths: ["/admin"] }}
              collapsed={collapsed}
              pathname={pathname}
            />
          </>
        )}
      </nav>

      {/* ── Wallet (authenticated) ───────────── */}
      {isAuthenticated && (
        <div className={cn(
          "shrink-0 px-2 py-1.5",
          collapsed ? "flex justify-center" : "",
        )}>
          <WalletWidget className={collapsed ? "flex-col gap-1 [&>*]:scale-90" : ""} />
        </div>
      )}

      {/* ── Bottom bar ───────────────────────── */}
      <div className={cn(
        "shrink-0 border-t border-white/[0.06] px-2 py-2 space-y-0.5",
        collapsed && "flex flex-col items-center"
      )}>
        <SidebarButton icon={HelpCircle} label="Помощь" collapsed={collapsed} onClick={() => window.open("/help", "_self")} />
        <SidebarButton icon={Settings} label={t("settings") || "Настройки"} collapsed={collapsed} onClick={() => openSettings("general")} />

        {isAuthenticated ? (
          <div className={cn("pt-1", collapsed ? "flex justify-center" : "px-0.5")}>
            <Suspense fallback={null}>
              <UserProfilePopover
                notificationsApi={notificationsApi}
                onOpenNotifications={onOpenNotifications}
                compact={collapsed}
              />
            </Suspense>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className={cn(
              "flex items-center gap-3 rounded-lg h-9 text-[13px] font-semibold transition-all w-full",
              "bg-primary/10 text-primary hover:bg-primary/15",
              collapsed ? "justify-center w-10 mx-auto" : "px-3",
            )}
          >
            <LogIn className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>Войти</span>}
          </button>
        )}
      </div>

      {/* ── Collapse toggle ──────────────────── */}
      <button
        onClick={handleToggle}
        className={cn(
          "absolute z-10 flex items-center justify-center rounded-full",
          "w-6 h-6 bg-background border border-white/[0.08] shadow-sm",
          "text-muted-foreground/40 hover:text-muted-foreground hover:border-white/[0.15] hover:bg-muted/50",
          "transition-all duration-150",
          "top-[22px]",
          collapsed ? "right-[-12px]" : "right-[-12px]",
        )}
        title={collapsed ? "Развернуть" : "Свернуть"}
      >
        {collapsed
          ? <ChevronsRight className="w-3 h-3" strokeWidth={2} />
          : <ChevronsLeft className="w-3 h-3" strokeWidth={2} />
        }
      </button>
    </motion.aside>
  );
});

AppSidebar.displayName = "AppSidebar";
