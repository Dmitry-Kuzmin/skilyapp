import type { CountryCode } from '@/types/pdd';

const COUNTRY_FLAG_CODES: Partial<Record<CountryCode, string>> = {
  spain: 'ES',
  russia: 'RU',
  ukraine: 'UA',
  belarus: 'BY',
};

export function getCountryFlagCode(country: CountryCode): string | null {
  return COUNTRY_FLAG_CODES[country] ?? null;
}

export function getCountryFlagUrl(country: CountryCode): string | null {
  const code = getCountryFlagCode(country);
  if (!code) return null;
  return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code}.svg`;
}
