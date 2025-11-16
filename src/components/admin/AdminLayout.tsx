import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  FileText,
  Edit,
  Database,
  Upload,
  LogOut,
  Bell,
  FileUp,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

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
    id: "sync",
    label: "Синхронизация",
    icon: Database,
    path: "/admin/sync",
  },
  {
    id: "import",
    label: "Импорт данных",
    icon: Upload,
    path: "/admin/import",
  },
  {
    id: "pdf-upload",
    label: "Загрузка PDF",
    icon: FileUp,
    path: "/admin/pdf-upload",
  },
  {
    id: "help-feedback",
    label: "Отзывы",
    icon: MessageSquare,
    path: "/admin/help-feedback",
  },
  {
    id: "reward-reports",
    label: "Отчеты о наградах",
    icon: AlertTriangle,
    path: "/admin/reward-reports",
  },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [pendingRewardReports, setPendingRewardReports] = useState(0);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    checkAdminAccess();
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Доступ запрещён",
        description: "Необходима авторизация",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setUserName(profile.first_name || profile.username || "Администратор");
    }

    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (error || !data) {
      toast({
        title: "Доступ запрещён",
        description: "Требуются права администратора",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setAuthLoading(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="p-2 rounded-lg bg-primary/10"
                >
                  <Shield className="h-6 w-6 text-primary" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Админ-панель
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {userName && `Добро пожаловать, ${userName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pendingReports > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin/reports")}
                    className="relative"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Отчёты
                    <Badge className="ml-2 bg-orange-500 text-white">
                      {pendingReports}
                    </Badge>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Выход
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <aside className="w-64 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <nav className="space-y-1 pr-4">
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
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                            "hover:bg-muted/70 hover:shadow-md",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold shadow-lg border-l-4 border-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                          {showBadge && (
                            <Badge className="bg-orange-500 text-white text-xs">
                              {badgeCount}
                            </Badge>
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </motion.div>
            </aside>

            <div className="w-px bg-border" />

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
