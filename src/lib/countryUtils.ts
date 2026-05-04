/**
 * Single source of truth for country code conversions.
 *
 * App-level code uses: 'spain' | 'russia'
 * questions_new table uses: 'es' | 'russia'
 * profiles.preferred_country uses: 'spain' | 'russia'
 *
 * Rule: always call toQuestionsDbCountry() before querying questions_new.
 */

export type AppCountryCode = 'spain' | 'russia';

/** Convert app country code to questions_new.country DB value */
export function toQuestionsDbCountry(country: string | null | undefined): string {
  if (!country) return 'es';
  const c = country.toLowerCase().trim();
  if (c === 'spain' || c === 'es') return 'es';
  if (c === 'russia' || c === 'ru') return 'russia';
  return c;
}

/** Convert app country code to profiles.preferred_country DB value */
export function toProfileDbCountry(country: string | null | undefined): string {
  if (!country) return 'spain';
  const c = country.toLowerCase().trim();
  if (c === 'es') return 'spain';
  if (c === 'ru') return 'russia';
  return c;
}

/** Convert any DB or app code to the canonical app-level CountryCode */
export function toAppCountry(country: string | null | undefined): AppCountryCode {
  if (!country) return 'spain';
  const c = country.toLowerCase().trim();
  if (c === 'es' || c === 'spain') return 'spain';
  if (c === 'ru' || c === 'russia') return 'russia';
  return 'spain';
}
