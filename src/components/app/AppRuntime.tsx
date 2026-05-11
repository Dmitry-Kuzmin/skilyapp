import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { useOfflineAnalytics } from "@/utils/offlineAnalytics";
import { useSession } from "@/hooks/useSession";
import { useCrispChat } from "@/hooks/useCrispChat";

export function AppRuntime() {
  useOfflineAnalytics();
  useSession();
  useBackgroundTasks();
  useCrispChat({ hideWidget: true });

  return null;
}
