import { useUserContext } from '@/contexts/UserContext';
import { useDailyTestLimit } from '@/hooks/useDailyTestLimit';
import { useModalStore } from '@/store/modalStore';
import { RewardedAdModal } from './RewardedAdModal';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TestLimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL to retry after watching the ad (e.g. the previous /test/<mode>?count=30 URL). */
  retryPath?: string;
}

export function TestLimitReachedModal({ open, onOpenChange, retryPath }: TestLimitReachedModalProps) {
  const { profileId } = useUserContext();
  const { grantFromAdMutation } = useDailyTestLimit(profileId);
  const openModal = useModalStore((s) => s.openModal);
  const navigate = useNavigate();

  const handleRewardClaimed = async () => {
    try {
      await grantFromAdMutation.mutateAsync();
      onOpenChange(false);
      if (retryPath) {
        navigate(retryPath);
      }
    } catch (err) {
      console.error('[TestLimitReachedModal] grant failed:', err);
    }
  };

  return (
    <RewardedAdModal
      open={open}
      onOpenChange={onOpenChange}
      rewardType="test_attempt"
      onRewardClaimed={handleRewardClaimed}
      placement="test_limit_reached"
      title="Дневной лимит — 5 тестов"
      description="Посмотри короткую рекламу — получишь +1 тест. Или открой Premium для безлимита."
      secondaryAction={{
        text: 'Получить Premium',
        subtext: 'Безлимит тестов, AI-память и полная база 2157 вопросов',
        icon: <Crown className="w-3.5 h-3.5" />,
        onClick: () => {
          onOpenChange(false);
          openModal('PAYWALL', { trigger: 'attempt_limit' });
        },
      }}
    />
  );
}
