import { LeagueWidget } from "./LeagueWidget";
import { DailyTasksWidget } from "./DailyTasksWidget";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  profileId?: string;
  rank?: string;
  xp?: number;
  className?: string;
}

export const RightSidebar = ({ profileId, rank, xp, className }: RightSidebarProps) => {
  return (
    <aside
      className={cn(
        "hidden lg:block w-80 flex-shrink-0 space-y-6",
        "sticky top-4 self-start",
        "max-h-[calc(100vh-2rem)] overflow-y-auto learning-map-right-sidebar",
        className
      )}
    >
      <LeagueWidget rank={rank} xp={xp} />
      <DailyTasksWidget profileId={profileId} />
    </aside>
  );
};

