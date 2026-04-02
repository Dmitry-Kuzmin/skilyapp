import React from 'react';
import type { PartnershipExpansionPortalProps } from './PartnershipExpansionPortal';

const PartnershipExpansionPortalLazy = React.lazy(() =>
  import('./PartnershipExpansionPortal').then((module) => ({
    default: module.PartnershipExpansionPortal,
  })),
);

export const PartnershipExpansionPortal: React.FC<PartnershipExpansionPortalProps> = (props) => (
  <React.Suspense fallback={null}>
    <PartnershipExpansionPortalLazy {...props} />
  </React.Suspense>
);
