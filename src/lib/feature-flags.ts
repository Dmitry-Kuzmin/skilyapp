/**
 * Feature flags — toggle features without deleting code.
 * To re-enable a feature: set the flag to `true` and redeploy.
 */

// Passkey (Face ID / Touch ID) login for web users.
// Disabled: adds a DB query on every dashboard load for web users,
// and our user base is predominantly Telegram where passkeys are irrelevant.
// Re-enable when: we invest in web acquisition and passkey UX polish.
export const PASSKEY_ENABLED = false;

// Duel Pass modal new layout: compact header + leaderboard inline + horizontal rewards track.
// Flip to false to instantly restore the old tabbed layout.
export const DUEL_PASS_NEW_LAYOUT = true;
