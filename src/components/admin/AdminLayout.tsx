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
    id: "shorts-maker",
    label: "Shorts Generator ⚡",
    icon: VideoIcon,
    path: "http://localhost:3000",
    external: true,
    highlight: true,
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
  {
    id: "test-covers",
    label: "Обложки тестов",
    icon: ImageIcon,
    path: "/admin/test-covers",
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
    id: "feature-flags",
    label: "Настройки заморозок",
    icon: ToggleLeft,
    path: "/admin/feature-flags",
  },
];

// ... (пропускаем код компонента до return) ...

// Измененная логика рендера кнопки
return (
  <motion.button
    key={item.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={() => {
      if ((item as any).external) {
        window.open(item.path, '_blank');
      } else {
        navigate(item.path);
      }
    }}
    className={cn(
      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
      "hover:bg-muted/70 hover:shadow-md",
      isActive
        ? "bg-primary/10 text-primary font-semibold shadow-lg border-l-4 border-primary"
        : "text-muted-foreground hover:text-foreground",
      (item as any).highlight && "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:shadow-indigo-500/20"
    )}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <Icon className={cn("h-5 w-5", (item as any).highlight && "text-indigo-400")} />
      <span className={(item as any).highlight ? "font-bold" : ""}>{item.label}</span>
    </div>
    {showBadge && (
      <Badge className="bg-orange-500 text-white text-xs">
        {badgeCount}
      </Badge>
    )}
  </motion.button>
);
                    })}
                  </nav >
                </ScrollArea >
              </motion.div >
            </aside >

  <div className="w-px bg-border" />

{/* Main Content */ }
<main className="flex-1 min-w-0 overflow-hidden">
  <ScrollArea className="h-[calc(100vh-8rem)]">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pr-4"
    >
      <Outlet />
    </motion.div>
  </ScrollArea>
</main>
          </div >
        </div >
      </div >
    </Layout >
  );
}
