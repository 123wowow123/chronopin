// Where the music was produced (artist origin), as opposed to the chart it appeared on.
// The landing page groups by this, west to east, so a US artist charting in Canada sits
// under the United States.
import type { Continent } from './music';

export interface OriginMeta {
  name: string;
  code: string;
  flag: string;
  continent: Continent;
  longitude: number;
}

const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

const rows: [string, string, Continent, number][] = [
  ['Mexico', 'MX', 'North America', -102.55],
  ['United States', 'US', 'North America', -98.58],
  ['Canada', 'CA', 'North America', -96.35],
  ['Jamaica', 'JM', 'Latin America', -77.3],
  ['Puerto Rico', 'PR', 'Latin America', -66.59],
  ['Dominican Republic', 'DO', 'Latin America', -70.16],
  ['Barbados', 'BB', 'Latin America', -59.54],
  ['Trinidad and Tobago', 'TT', 'Latin America', -61.22],
  ['Panama', 'PA', 'Latin America', -80.78],
  ['Colombia', 'CO', 'Latin America', -74.29],
  ['Peru', 'PE', 'Latin America', -75.01],
  ['Ecuador', 'EC', 'Latin America', -78.18],
  ['Venezuela', 'VE', 'Latin America', -66.59],
  ['Chile', 'CL', 'Latin America', -71.54],
  ['Argentina', 'AR', 'Latin America', -63.61],
  ['Uruguay', 'UY', 'Latin America', -55.77],
  ['Brazil', 'BR', 'Latin America', -51.92],
  ['Ireland', 'IE', 'Europe', -8.24],
  ['Spain', 'ES', 'Europe', -3.74],
  ['United Kingdom', 'GB', 'Europe', -1.55],
  ['France', 'FR', 'Europe', 2.21],
  ['Belgium', 'BE', 'Europe', 4.47],
  ['Netherlands', 'NL', 'Europe', 5.29],
  ['Norway', 'NO', 'Europe', 8.47],
  ['Switzerland', 'CH', 'Europe', 8.23],
  ['Denmark', 'DK', 'Europe', 9.5],
  ['Germany', 'DE', 'Europe', 10.45],
  ['Italy', 'IT', 'Europe', 12.56],
  ['Austria', 'AT', 'Europe', 14.55],
  ['Sweden', 'SE', 'Europe', 18.06],
  ['Poland', 'PL', 'Europe', 19.15],
  ['Finland', 'FI', 'Europe', 25.75],
  ['Romania', 'RO', 'Europe', 24.97],
  ['Ukraine', 'UA', 'Europe', 31.17],
  ['Nigeria', 'NG', 'Africa', 8.68],
  ['Ghana', 'GH', 'Africa', -1.02],
  ['South Africa', 'ZA', 'Africa', 22.94],
  ['Tanzania', 'TZ', 'Africa', 34.89],
  ['India', 'IN', 'Asia', 78.96],
  ['Thailand', 'TH', 'Asia', 100.99],
  ['Singapore', 'SG', 'Asia', 103.82],
  ['China', 'CN', 'Asia', 104.2],
  ['Hong Kong', 'HK', 'Asia', 114.17],
  ['Taiwan', 'TW', 'Asia', 120.96],
  ['Philippines', 'PH', 'Asia', 121.77],
  ['South Korea', 'KR', 'Asia', 127.77],
  ['Japan', 'JP', 'Asia', 138.25],
  ['Australia', 'AU', 'Oceania', 133.78],
  ['New Zealand', 'NZ', 'Oceania', 172.89],
];

export const ORIGINS: readonly OriginMeta[] = rows.map(([name, code, continent, longitude]) => ({
  name,
  code,
  flag: flagOf(code),
  continent,
  longitude,
}));

export const ORIGIN_BY_CODE: Record<string, OriginMeta> = Object.fromEntries(ORIGINS.map((o) => [o.code, o]));
