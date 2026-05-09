import { useMemo } from 'react';
import { useDashboardData } from './useDashboardData';

function getISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useStreak(): number {
  const { data: dashboardData } = useDashboardData();

  return useMemo(() => {
    const dbStreak = Math.max(
      dashboardData?.profile?.streak_days || 0,
      dashboardData?.daily_bonus?.current_streak || 0
    );

    if (!dashboardData?.license_audit || dashboardData.license_audit.length === 0) {
      return dbStreak;
    }

    const activeDates = new Set<string>();
    dashboardData.license_audit.forEach(item => {
      try {
        activeDates.add(getISODate(new Date(item.created_at)));
      } catch (e) {}
    });

    if (dashboardData.daily_bonus?.last_claimed_date) {
      activeDates.add(dashboardData.daily_bonus.last_claimed_date.split('T')[0]);
    }

    let streak = 0;
    let checkDate = new Date();
    while (activeDates.has(getISODate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      if (streak > 365) break;
    }

    if (streak === 0) {
      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      while (activeDates.has(getISODate(yesterday))) {
        streak++;
        yesterday.setDate(yesterday.getDate() - 1);
        if (streak > 365) break;
      }
    }

    return Math.max(streak, dbStreak);
  }, [dashboardData]);
}
