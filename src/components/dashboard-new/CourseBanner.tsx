import { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, ArrowRight, Play, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/integrations/supabase/lazyClient';
import { useTheme } from 'next-themes';

type StreamData = {
  number: number;
  start_date: string;
  spots_total: number;
  spots_enrolled: number;
  status: string;
};

function useCountdown(targetDate: Date) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const diff = Math.max(0, targetDate.getTime() - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return { d, h, total: diff };
  }, [now, targetDate]);
}

export function CourseBanner() {
  const [stream, setStream] = useState<StreamData | null>(null);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  useEffect(() => {
    getSupabaseClient().then(async (sb) => {
      const { data } = await sb
        .from('course_streams' as never)
        .select('number, start_date, spots_total, spots_enrolled, status')
        .eq('status', 'open')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(1);
      if (data && data.length > 0) setStream(data[0] as StreamData);
    });
  }, []);

  const targetDate = useMemo(
    () => stream ? new Date(stream.start_date + 'T10:00:00') : new Date(Date.now() + 15 * 86400000),
    [stream]
  );

  const { d, h } = useCountdown(targetDate);
  const spotsLeft = stream ? Math.max(0, stream.spots_total - stream.spots_enrolled) : 4;
  const isFew = spotsLeft <= 2;

  return (
    <a
      href="/curso"
      className={cn(
        "h-full rounded-3xl xl:rounded-[2.5rem] p-5 md:p-6 xl:p-8 relative overflow-hidden group cursor-pointer shadow-xl border transition-all duration-500 flex flex-col justify-between",
        isDarkTheme 
          ? "bg-slate-950 border-slate-800 hover:border-blue-500/30" 
          : "bg-white border-slate-200 hover:border-blue-400/30 shadow-[0_20px_45px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Subtle Glow Background */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-700",
        isDarkTheme ? "opacity-20 group-hover:opacity-40" : "opacity-[0.03] group-hover:opacity-10"
      )}>
        <div className="absolute top-[-50%] right-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_70%_30%,#3b82f6,transparent_60%)]" />
      </div>

      {/* Header Row */}
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Rocket className="w-4 h-4 text-blue-500" />
          </div>
          <span className={cn(
            "text-xs font-bold tracking-[0.2em] uppercase",
            isDarkTheme ? "text-blue-400" : "text-blue-600"
          )}>
            Skily Live
          </span>
        </div>
        
        <div className={cn(
            "px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
            isFew 
              ? isDarkTheme ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-600"
              : isDarkTheme ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
          )}>
            {isFew ? "Limited" : "Open"}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col flex-1">
        
        {/* Title */}
        <div className="mb-4">
          <h3 className={cn(
            "text-xl md:text-2xl font-bold leading-tight mb-1",
            isDarkTheme ? "text-white" : "text-slate-900"
          )}>
            Живой курс теории
          </h3>
          <p className={cn(
            "text-xs font-medium uppercase tracking-widest",
            isDarkTheme ? "text-slate-500" : "text-slate-400"
          )}>
            Поток {stream?.number || 52}
          </p>
        </div>

        {/* Compact Timer */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-end gap-1">
            <span className={cn(
              "text-3xl lg:text-4xl font-black leading-none tracking-tighter tabular-nums",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>
              {String(d).padStart(2, '0')}
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              isDarkTheme ? "text-slate-500" : "text-slate-400"
            )}>
              {d === 1 ? 'день' : d >= 2 && d <= 4 ? 'дня' : 'дней'}
            </span>
          </div>
          <div className={cn("text-xl font-black opacity-30", isDarkTheme ? "text-white" : "text-slate-900")}>:</div>
          <div className="flex items-end gap-1">
            <span className={cn(
              "text-3xl lg:text-4xl font-black leading-none tracking-tighter tabular-nums",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>
              {String(h).padStart(2, '0')}
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              isDarkTheme ? "text-slate-500" : "text-slate-400"
            )}>
              {h === 1 ? 'час' : h >= 2 && h <= 4 ? 'часа' : 'часов'}
            </span>
          </div>
        </div>

        {/* Footer Info & Button - perfectly fitting on one line */}
        <div className="mt-auto pt-4 border-t border-slate-500/20 flex items-center justify-between">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-1.5">
                <Users className={cn("w-3 h-3", isDarkTheme ? "text-slate-400" : "text-slate-500")} />
                <span className={cn("text-[11px] font-bold", isDarkTheme ? "text-white/80" : "text-slate-700")}>
                  {spotsLeft} мест свободно
                </span>
             </div>
             <div className="flex items-center gap-1.5">
                <Calendar className={cn("w-3 h-3", isDarkTheme ? "text-slate-400" : "text-slate-500")} />
                <span className={cn("text-[11px] font-bold", isDarkTheme ? "text-white/80" : "text-slate-700")}>
                  {stream ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(stream.start_date + 'T00:00:00')) : 'Скоро'}
                </span>
             </div>
          </div>

          <div className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            isDarkTheme 
              ? "bg-slate-800 text-white hover:bg-blue-600" 
              : "bg-slate-100 text-slate-800 hover:bg-blue-500 hover:text-white"
          )}>
            <span>Записаться</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
        
      </div>
    </a>
  );
}

export default CourseBanner;
