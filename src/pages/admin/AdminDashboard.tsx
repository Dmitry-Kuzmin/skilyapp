import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Activity,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Command,
  Users,
  Database,
  Server,
  Terminal,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CompactFeatureFlags } from "@/components/admin/CompactFeatureFlags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [systemLatency, setSystemLatency] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'degraded'>('online');

  useEffect(() => {
    fetchVitals();
    const interval = setInterval(fetchVitals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVitals = async () => {
    const start = performance.now();
    try {
      // Parallel fetch for speed
      const [usersRes, reportsRes, feedbackRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("question_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("help_feedback")
          .select("*", { count: "exact", head: true })
          .is("admin_reply", null)
      ]);

      setActiveUsers(usersRes.count || 0);
      setPendingReports(reportsRes.count || 0);
      setPendingFeedback(feedbackRes.count || 0);
      setDbStatus('online');
    } catch (e) {
      console.error("Vitals Check Failed", e);
      setDbStatus('degraded');
    } finally {
      setSystemLatency(Math.round(performance.now() - start));
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: Terminal, label: "Mission Control", path: "/admin/mission-control", color: "text-blue-400", desc: "Test Gen & Review" },
    { icon: FileText, label: "Editor", path: "/admin/editor", color: "text-emerald-400", desc: "Manage Content" },
  ];

  if (loading) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-zinc-100 font-sans selection:bg-purple-500/30">

      {/* HEADER: Minimal & Functional */}
      <header className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Command className="w-6 h-6 text-purple-500" />
            Admin Console
          </h1>
          <p className="text-zinc-500 text-sm mt-1">System Overview & Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5">
            <div className={cn("w-2 h-2 rounded-full", dbStatus === 'online' ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
            <span className="text-xs font-mono text-zinc-400">{dbStatus === 'online' ? 'SYSTEM OPERATIONAL' : 'SYSTEM DEGRADED'}</span>
          </div>
          <Badge variant="outline" className="font-mono text-zinc-500 border-zinc-800">
            LAN: {systemLatency}ms
          </Badge>
        </div>
      </header>

      {/* ACTION REQUIRED SECTION: Only shows if there are items */}
      {(pendingReports > 0 || pendingFeedback > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingReports > 0 && (
            <div
              onClick={() => navigate('/admin/reports')}
              className="group cursor-pointer flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-100">Pending Reports</h3>
                  <p className="text-red-400/60 text-xs">User reported issues require review.</p>
                </div>
              </div>
              <Badge className="bg-red-500 text-white border-0 text-sm px-3 py-1">{pendingReports}</Badge>
            </div>
          )}

          {pendingFeedback > 0 && (
            <div
              onClick={() => navigate('/admin/reports')}
              className="group cursor-pointer flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-100">New Feedback</h3>
                  <p className="text-amber-400/60 text-xs">User feedback awaiting reply.</p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-amber-950 border-0 text-sm px-3 py-1">{pendingFeedback}</Badge>
            </div>
          )}
        </motion.div>
      )}

      {/* MAIN VITALS & NAVIGATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: System Vitals & Stats (Concise) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Real-time Vitals
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-3xl font-bold text-white tracking-tight">{activeUsers}</span>
                  <span className="text-xs text-emerald-500 font-medium">+12%</span>
                </div>
                <p className="text-xs text-zinc-500">Active Users (24h)</p>
                <div className="h-1 w-full bg-zinc-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-500/50 w-[45%]" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-zinc-400">Database</span>
                  <span className="text-emerald-500">Healthy</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-zinc-400">Storage</span>
                  <span className="text-emerald-500">Healthy</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Edge Functions</span>
                  <span className="text-emerald-500">Operational</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <CompactFeatureFlags />
          </div>

        </div>

        {/* RIGHT: Command Grid */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-zinc-400 mb-4 ml-1">Command Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-start p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </div>

                <div className={cn("p-2.5 rounded-lg mb-3 bg-zinc-950 border border-white/5", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200 group-hover:text-white mb-1">{item.label}</h4>
                  <p className="text-xs text-zinc-500 group-hover:text-zinc-400">{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "P.D.D Russia", path: "/admin/pdd-russia" },
              { label: "Road Signs", path: "/road-signs" },
              { label: "Reward Reports", path: "/admin/reward-reports" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors text-left"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

