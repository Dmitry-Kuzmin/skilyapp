import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DuolingoLeagueInfo = () => {
  const { profileId } = useUserContext();
  const [league, setLeague] = useState<string>("Золотая лига");

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

      // Определяем лигу на основе ранга или XP
      if (profile?.rank) {
        setLeague(profile.rank);
      }
    } catch (error) {
      console.error("Error loading league:", error);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">{league}</h2>
        <button className="text-sm font-bold text-info hover:text-info/80 transition-colors">
          ОБЗОР ЛИГИ
        </button>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
          <Trophy className="w-8 h-8 text-warning" />
        </div>
        <p className="text-sm text-muted-foreground">
          Пройдите урок, чтобы войти в недельный рейтинг и сразиться с другими учащимися
        </p>
      </div>
    </Card>
  );
};

