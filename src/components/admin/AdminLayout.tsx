import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  FileText,
  Edit,
  Database,
  Upload,
  FileUp,
  MessageSquare,
  AlertTriangle,
  Image as ImageIcon,
  Calendar,
  Eye,
  Users,
  Flag,
  ToggleLeft,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "@/components/optimized/Motion";

const adminNavItems = [
  {
    id: "dashboard",
    label: "Главная",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    id: "reports",
    label: "Отчёты",
    icon: FileText,
    path: "/admin/reports",
  },
  {
    id: "editor",
    label: "Редактор",
    icon: Edit,
    path: "/admin/editor",
  },

  {
    id: "reward-reports",
    label: "Отчеты о наградах",
    icon: AlertTriangle,
    path: "/admin/reward-reports",
  },

  {
    id: "seasons",
    label: "Сезоны и призы",
    icon: Calendar,
    path: "/admin/seasons",
  },
  {
    id: "security",
    label: "Безопасность",
    icon: Shield,
    path: "/admin/security",
  },
  {
    id: "partners",
    label: "Партнеры",
    icon: Users,
    path: "/admin/partners",
  },
  {
    id: "marketing",
    label: "Рекламные материалы",
    icon: ImageIcon,
    path: "/admin/marketing",
  },
  {
    id: "pdd-russia",
    label: "ПДД Россия",
    icon: Flag,
    path: "/admin/pdd-russia",
  },
  {
    id: "streams",
    label: "Потоки курса DGT",
    icon: Users,
    path: "/admin/streams",
  },
  {
    id: "mission-control",
    label: "Mission Control 🚀",
    icon: Rocket,
    path: "/admin/mission-control",
  },


];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [pendingRewardReports, setPendingRewardReports] = useState(0);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingReports();
      fetchPendingFeedback();
      fetchPendingRewardReports();
      const interval = setInterval(() => {
        fetchPendingReports();
        fetchPendingFeedback();
        fetchPendingRewardReports();
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    console.log("[AdminLayout] 🔐 checkAdminAccess started");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("[AdminLayout] ❌ No user found, redirecting");
      toast.error("Необходима авторизация");
      navigate('/');
      return;
    }

    console.log("[AdminLayout] 👤 User found:", user.email);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      console.log("[AdminLayout] ✅ Profile found:", profile.username);
      setUserName(profile.first_name || profile.username || "Администратор");
    }

    console.log("[AdminLayout] 🔍 Checking admin role...");

    try {
      // 5-second timeout for the RPC call
      const rpcPromise = supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (error || !data) {
        console.error("[AdminLayout] ❌ Admin check failed:", error || "No role data");
        toast.error("Требуются права администратора");
        navigate('/');
        return;
      }

      console.log("[AdminLayout] 👑 Admin access granted");
      setIsAdmin(true);
    } catch (e: any) {
      console.error("[AdminLayout] ❌ Admin check error/timeout:", e.message);
      toast.error("Сервер Supabase не отвечает. Попробуйте обновить страницу.");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchPendingReports = async () => {
    try {
      const { count } = await supabase
        .from("question_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setPendingReports(count || 0);
    } catch (error) {
      console.error("Error fetching pending reports:", error);
    }
  };

  const fetchPendingFeedback = async () => {
    try {
      const { count } = await supabase
        .from("help_feedback")
        .select("*", { count: "exact", head: true })
        .is("admin_reply", null);

      setPendingFeedback(count || 0);
    } catch (error) {
      console.error("Error fetching pending feedback:", error);
    }
  };

  const fetchPendingRewardReports = async () => {
    try {
      const { count } = await supabase
        .from("admin_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      setPendingRewardReports(count || 0);
    } catch (error) {
      console.error("Error fetching pending reward reports:", error);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
            />
            <p className="text-muted-foreground">Проверка доступа...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout hideNavigation={true}>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Toggle Bar / Header */}
        {!location.pathname.includes("/admin/mission-control") && (
          <div className="h-12 border-b border-zinc-900 bg-zinc-950 flex items-center px-4 justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-white"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <ToggleLeft className={cn("h-5 w-5 transition-transform", !isSidebarOpen && "rotate-180")} />
              </Button>
              <h1 className="text-sm font-semibold text-zinc-400">Admin Console</h1>
            </div>
            <div className="text-xs text-zinc-600">
              User: <span className="text-zinc-400">{userName}</span>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          {!location.pathname.includes("/admin/mission-control") && (
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
              className="flex-shrink-0 border-r border-zinc-900 bg-zinc-950/50 overflow-hidden"
            >
              <div className="w-64 p-4">
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <nav className="space-y-1">
                    {adminNavItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.path === "/admin" && location.pathname === "/admin") ||
                        (item.path !== "/admin" && location.pathname.startsWith(item.path));

                      const showBadge =
                        (item.id === "reports" && pendingReports > 0) ||
                        (item.id === "help-feedback" && pendingFeedback > 0) ||
                        (item.id === "reward-reports" && pendingRewardReports > 0);

                      const badgeCount = item.id === "reports" ? pendingReports :
                        item.id === "help-feedback" ? pendingFeedback :
                          item.id === "reward-reports" ? pendingRewardReports : 0;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.path.includes('.html')) {
                              window.location.href = item.path;
                            } else {
                              navigate(item.path);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 text-sm",
                            isActive
                              ? "bg-zinc-800 text-white font-medium"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {showBadge && (
                            <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                              {badgeCount}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </div>
            </motion.aside>
          )}

          {/* Main Content - Full Width */}
          <main className="flex-1 min-w-0 bg-[#09090b] relative">
            <Outlet />
          </main>
        </div>
      </div>
    </Layout>
  );
}

