import { useMemo } from 'react';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isTelegramMiniApp as isTelegramMiniAppRaw } from '@/lib/telegram';

function safeIsTelegramMiniApp() {
  return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}

const PROGRESS_BAR_HEIGHT = 64;

export interface DuelSafeAreaValues {
  totalTopPadding: number;
  totalBottomPadding: number;
  totalLeftPadding: number;
  totalRightPadding: number;
  progressBarTop: number;
  contentTopPadding: number;
  PROGRESS_BAR_HEIGHT: number;
  isTelegramMobile: boolean;
  isTelegramDesktop: boolean;
  isInTelegramMiniApp: boolean;
}

/**
 * Calculates safe-area layout values for the duel battle screen.
 * Accounts for Telegram Mini App notch, system safe areas, and progress-bar height.
 */
export function useDuelSafeArea(): DuelSafeAreaValues {
  const safeArea = useSafeArea();

  const isTelegramMobile = safeArea.platform === 'ios' || safeArea.platform === 'android';
  const isInTelegramMiniApp = safeIsTelegramMiniApp();
  const isTelegramDesktop = !isTelegramMobile && (
    safeArea.platform === 'tdesktop' ||
    safeArea.platform === 'macos' ||
    safeArea.platform === 'windows' ||
    safeArea.platform === 'linux' ||
    safeArea.platform === 'web'
  );

  const values = useMemo(() => {
    const TELEGRAM_NAV_HEIGHT_MOBILE = 35;
    const telegramNavPadding = isTelegramMobile ? TELEGRAM_NAV_HEIGHT_MOBILE : 0;

    const totalTopPadding = Math.round(safeArea.top + safeArea.contentTop + telegramNavPadding);
    const totalBottomPadding = Math.round(safeArea.bottom + safeArea.contentBottom);
    const totalLeftPadding = Math.round(safeArea.left);
    const totalRightPadding = Math.round(safeArea.right);

    const progressBarTop = isInTelegramMiniApp
      ? Math.round(safeArea.top > 0 ? safeArea.top : 20)
      : isTelegramMobile
        ? totalTopPadding - 15
        : totalTopPadding;

    const progressBarRealHeight = PROGRESS_BAR_HEIGHT + (isTelegramMobile ? 8 : 16);

    const contentTopPadding = isInTelegramMiniApp
      ? progressBarTop + progressBarRealHeight + 4
      : isTelegramMobile
        ? progressBarTop + progressBarRealHeight + 8
        : progressBarTop + progressBarRealHeight + 16;

    return {
      totalTopPadding,
      totalBottomPadding,
      totalLeftPadding,
      totalRightPadding,
      progressBarTop,
      contentTopPadding,
      PROGRESS_BAR_HEIGHT,
    };
  }, [safeArea.top, safeArea.contentTop, safeArea.bottom, safeArea.contentBottom, safeArea.left, safeArea.right, isTelegramMobile, isInTelegramMiniApp]);

  return {
    ...values,
    isTelegramMobile,
    isTelegramDesktop,
    isInTelegramMiniApp,
  };
}
