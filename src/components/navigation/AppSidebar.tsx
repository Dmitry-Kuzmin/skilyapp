import { memo, Suspense, lazy, useCallback, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import {
  Home, FileText, BookOpen, Gamepad2, Swords, SignpostBig,
  Newspaper, BookMarked, Settings, PanelLeftClose, PanelLeftOpen,
  Trophy, Shield as AdminShield,
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
import { AchievementsWidget } from "./AchievementsWidget";
import { ActiveDuelWidget } from "./ActiveDuelWidget";
import { useActiveDuel } from "@/hooks/useActiveDuel";
import { triggerHaptic } from "@/lib/haptics";

const UserProfilePopover = lazy(() =>
  import("@/components/UserProfilePopover").then((m) => ({ default: m.UserProfilePopover }))
);

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  isActiveDuel?: boolean;
  badge?: string;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const isPathActive = (pathname: string, item: NavItem) => {
  const candidates = item.matchPaths?.length ? item.matchPaths : [item.href];
  return candidates.some((base) => pathname === base || pathname.startsWith(`${base}/`));
};

// Single nav item row
const SidebarNavItem = memo(({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/70 hover:bg-white/5 hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Active indicator bar */}
      {active && (
        <motion.div
          layoutId="sidebar-active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      <Icon
        className={cn("w-[18px] h-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/70")}
        strokeWidth={active ? 2.25 : 1.75}
      />

      {!collapsed && (
        <span className="truncate leading-tight">{item.name}</span>
      )}

      {/* Active duel pulse */}
      {item.isActiveDuel && (
        <motion.div
          className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Tooltip on collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-popover border border-border/50 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
          {item.name}
        </div>
      )}
    </NavLink>
  );
});

SidebarNavItem.displayName = "SidebarNavItem";

// Group label
const GroupLabel = memo(({ label, collapsed }: { label: string; collapsed: boolean }) => {
  if (collapsed) {
    return <div className="mx-auto h-px w-6 bg-border/40 my-2" />;
  }
  return (
    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 select-none">
      {label}
    </p>
  );
});

GroupLabel.displayName = "GroupLabel";

export const AppSidebar = memo(({
  notificationsApi,
  onOpenNotifications,
  onOpenAuth,
}: {
  notificationsApi: any;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserContext();
  const { t } = useLanguage();
  const { sidebarCollapsed, toggleSidebarCollapsed, openSettings } = useSettingsStore();
  const { isAdmin } = useIsAdmin();
  const { activeDuel } = useActiveDuel();

  const handleToggle = useCallback(() => {
    triggerHaptic("light");
    toggleSidebarCollapsed();
  }, [toggleSidebarCollapsed]);

  const coreItems = useMemo<NavItem[]>(() => [
    { name: t("home"), href: "/dashboard", icon: Home, matchPaths: ["/dashboard"] },
    { name: t("tests"), href: "/tests", icon: FileText, matchPaths: ["/tests", "/test"] },
    { name: t("learning"), href: "/learning", icon: BookOpen, matchPaths: ["/learning", "/learning-map", "/topic", "/subtopic"] },
    activeDuel && activeDuel.mode !== "result"
      ? { name: "Дуэль", href: `/games/duel?duelId=${activeDuel.duelId}`, icon: Swords, isActiveDuel: true, matchPaths: ["/games/duel"] }
      : { name: t("games"), href: "/games", icon: Gamepad2, matchPaths: ["/games"] },
  ], [t, activeDuel]);

  const resourceItems = useMemo<NavItem[]>(() => [
    { name: "Знаки ПДД", href: "/road-signs", icon: SignpostBig, matchPaths: ["/road-signs"] },
    { name: "Блог", href: "/blog", icon: Newspaper, matchPaths: ["/blog"] },
    { name: "Словарь", href: "/dictionary", icon: BookMarked, matchPaths: ["/dictionary"] },
    { name: "Рейтинг", href: "/hall-of-fame", icon: Trophy, matchPaths: ["/hall-of-fame"] },
  ], []);

  const w = sidebarCollapsed ? 64 : 220;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className={cn(
        "fixed left-0 top-0 z-50 h-full hidden md:flex flex-col",
        "border-r border-border/40 bg-background/95 backdrop-blur-xl",
        "overflow-hidden"
      )}
      style={{ width: w }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div className={cn(
        "flex items-center shrink-0 border-b border-border/30",
        sidebarCollapsed ? "h-16 justify-center px-2" : "h-16 px-4 gap-2"
      )}>
        {sidebarCollapsed ? (
          <NavLink to="/dashboard" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <LandingLogo variant="bold" showText={false} />
          </NavLink>
        ) : (
          <>
            <NavLink to="/dashboard" className="min-w-0 flex-1 flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <LandingLogo variant="bold" showText={true} />
            </NavLink>
            {/* Collapse toggle */}
            <button
              onClick={handleToggle}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors"
              title="Свернуть"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Context Switcher (expanded only) ─────────── */}
      <AnimatePresence>
        {!sidebarCollapsed && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="px-3 pt-2 pb-1 border-b border-border/20 shrink-0 overflow-hidden"
          >
            <ContextSwitcher embedded className="w-full px-1.5 shadow-none text-xs" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 scrollbar-none">
        {/* Core group */}
        <div className="space-y-0.5">
          {!sidebarCollapsed && <GroupLabel label="Навигация" collapsed={sidebarCollapsed} />}
          {coreItems.map((item) => (
            <SidebarNavItem key={item.name} item={item} collapsed={sidebarCollapsed} pathname={location.pathname} />
          ))}
        </div>

        {/* Resources group */}
        <div className="space-y-0.5 pt-2">
          <GroupLabel label="Материалы" collapsed={sidebarCollapsed} />
          {resourceItems.map((item) => (
            <SidebarNavItem key={item.name} item={item} collapsed={sidebarCollapsed} pathname={location.pathname} />
          ))}
        </div>

        {/* Admin */}
        {isAuthenticated && isAdmin && (
          <div className="space-y-0.5 pt-2">
            <GroupLabel label="Система" collapsed={sidebarCollapsed} />
            <SidebarNavItem
              item={{ name: "Админ", href: "/admin", icon: AdminShield, matchPaths: ["/admin"] }}
              collapsed={sidebarCollapsed}
              pathname={location.pathname}
            />
          </div>
        )}
      </nav>

      {/* ── Wallet + Achievements ─────────────────────── */}
      {isAuthenticated && (
        <div className={cn(
          "shrink-0 border-t border-border/30 px-2 py-2",
          sidebarCollapsed ? "flex flex-col items-center gap-1.5" : "space-y-1.5"
        )}>
          {!sidebarCollapsed && (
            <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 select-none pb-0.5">
              Аккаунт
            </p>
          )}
          <div className={cn(sidebarCollapsed ? "w-full flex justify-center" : "")}>
            <WalletWidget />
          </div>
          <div className={cn(sidebarCollapsed ? "w-full flex justify-center" : "")}>
            <AchievementsWidget variant={sidebarCollapsed ? "mobile" : undefined} />
          </div>
          <div className={cn(sidebarCollapsed ? "w-full flex justify-center" : "")}>
            <ActiveDuelWidget />
          </div>
        </div>
      )}

      {/* ── Bottom: Settings + Profile ───────────────── */}
      <div className={cn(
        "shrink-0 border-t border-border/30 px-2 py-2",
        sidebarCollapsed ? "flex flex-col items-center gap-1.5" : "space-y-0.5"
      )}>
        {/* Settings button */}
        <button
          onClick={() => openSettings("general")}
          title={sidebarCollapsed ? "Настройки" : undefined}
          className={cn(
            "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
            "text-muted-foreground/70 hover:bg-white/5 hover:text-foreground",
            sidebarCollapsed && "justify-center px-2"
          )}
        >
          <Settings className="w-[18px] h-[18px] shrink-0 text-muted-foreground/60 group-hover:text-foreground/70" strokeWidth={1.75} />
          {!sidebarCollapsed && <span className="truncate">Настройки</span>}
          {sidebarCollapsed && (
            <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-popover border border-border/50 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
              Настройки
            </div>
          )}
        </button>

        {/* Profile / Login */}
        {isAuthenticated ? (
          <div className={cn(
            "flex items-center",
            sidebarCollapsed ? "justify-center" : "px-1 py-1"
          )}>
            <Suspense fallback={null}>
              <UserProfilePopover
                notificationsApi={notificationsApi}
                onOpenNotifications={onOpenNotifications}
                compact={sidebarCollapsed}
              />
            </Suspense>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              "bg-primary/10 text-primary hover:bg-primary/20",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            {!sidebarCollapsed && <span>Войти</span>}
          </button>
        )}
      </div>

      {/* ── Expand toggle (collapsed state) ──────────── */}
      {sidebarCollapsed && (
        <button
          onClick={handleToggle}
          className="absolute top-[18px] right-2 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors"
          title="Развернуть"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}
    </motion.aside>
  );
});

AppSidebar.displayName = "AppSidebar";
