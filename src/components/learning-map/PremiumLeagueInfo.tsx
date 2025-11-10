import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PremiumLeagueInfo = () => {
  const { profileId } = useUserContext();
  const [league, setLeague] = useState<string>("Бронзовая лига");

  useEffect(() => {
    if (profileId) {
      loadLeague();
    }
  }, [profileId]);

  const loadLeague = async () => {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("rank")
        .eq("id", profileId)
        .single();

      if (error) throw error;

      if (profile?.rank) {
        setLeague(profile.rank);
      }
    } catch (error) {
      console.error("Error loading league:", error);
    }
  };

  return (
    <Card className="p-6 border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{league}</h2>
        <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
          Обзор
        </button>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200">
          <Trophy className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Пройдите урок, чтобы войти в недельный рейтинг и сразиться с другими учащимися
        </p>
      </div>
    </Card>
  );
};

