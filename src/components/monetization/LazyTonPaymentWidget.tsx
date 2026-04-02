import React from 'react';
import { cn } from '@/lib/utils';
import type { TonPaymentWidgetProps as BaseTonPaymentWidgetProps } from './TonPaymentWidget';

const TonPaymentWidgetLazy = React.lazy(() =>
  import('./TonPaymentWidget').then((module) => ({
    default: module.TonPaymentWidget,
  })),
);

export interface TonPaymentWidgetProps extends BaseTonPaymentWidgetProps {
  autoPay?: boolean;
  defaultAmount?: number | string;
  defaultComment?: string;
}

function normalizeAmount(amountTon?: number, defaultAmount?: number | string): number | undefined {
  if (typeof amountTon === 'number' && Number.isFinite(amountTon)) {
    return amountTon;
  }

  if (defaultAmount === undefined) {
    return undefined;
  }

  const parsed = typeof defaultAmount === 'number' ? defaultAmount : Number.parseFloat(defaultAmount);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const TonPaymentWidget: React.FC<TonPaymentWidgetProps> = ({
  autoPay: _autoPay,
  defaultAmount,
  defaultComment,
  amountTon,
  description,
  mode = 'compact',
  className,
  ...rest
}) => (
  <React.Suspense
    fallback={
      mode === 'full' ? (
        <div className={cn('h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse', className)} />
      ) : null
    }
  >
    <TonPaymentWidgetLazy
      {...rest}
      amountTon={normalizeAmount(amountTon, defaultAmount)}
      description={description ?? defaultComment}
      mode={mode}
      className={className}
    />
  </React.Suspense>
);
