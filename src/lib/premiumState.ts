/**
 * Module-level premium state for non-React contexts (e.g. strategy classes).
 * Updated by PremiumStateSync component on every render cycle.
 */
let _isPremium = false;
let _hasFullQuestionPool = false;

export const setPremiumForStrategy = (v: boolean): void => {
  _isPremium = v;
};

export const isPremiumForStrategy = (): boolean => _isPremium;

/**
 * Whether the current user can see the full question pool (2157 Q).
 * False for free AND trial users — trial gets premium tools but limited pool.
 */
export const setHasFullQuestionPoolForStrategy = (v: boolean): void => {
  _hasFullQuestionPool = v;
};

export const hasFullQuestionPoolForStrategy = (): boolean => _hasFullQuestionPool;

/** Number of free questions visible per topic for non-premium users (30 per topic × 10 topics) */
export const FREE_QUESTION_LIMIT = 300;
