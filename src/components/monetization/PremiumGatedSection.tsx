import { Lock } from 'lucide-react';
import { useModalStore } from '@/store/modalStore';
import { usePremium } from '@/hooks/usePremium';

interface PremiumGatedSectionProps {
  children: React.ReactNode;
  label?: string;
}

export function PremiumGatedSection({ children, label = 'Premium' }: PremiumGatedSectionProps) {
  const { isPremium } = usePremium();
  const openModal = useModalStore((s) => s.openModal);

  if (isPremium) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px] cursor-pointer z-10"
        onClick={() => openModal('PAYWALL')}
      >
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-violet-500" />
        </div>
        <p className="text-sm font-bold text-foreground">{label}</p>
      </div>
    </div>
  );
}
