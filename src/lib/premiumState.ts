/**
 * Module-level premium state for non-React contexts (e.g. strategy classes).
 * Updated by PremiumStateSync component on every render cycle.
 */
let _isPremium = false;

export const setPremiumForStrategy = (v: boolean): void => {
  _isPremium = v;
};

export const isPremiumForStrategy = (): boolean => _isPremium;

/** Number of free questions visible per topic for non-premium users (30 per topic × 10 topics) */
export const FREE_QUESTION_LIMIT = 300;
