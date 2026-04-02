import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { useOfflineAnalytics } from "@/utils/offlineAnalytics";
import { useSession } from "@/hooks/useSession";

export function AppRuntime() {
  useOfflineAnalytics();
  useSession();
  useBackgroundTasks();

  return null;
}
