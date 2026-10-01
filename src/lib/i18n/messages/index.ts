// Each language's messages, loaded when first asked for. Server-side only:
// a page hands its one language to the client through I18nProvider.

import 'server-only';
import type { Locale } from '../config';
import type { Messages } from '../translate';

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import('./en').then((m) => m.default),
  es: () => import('./es').then((m) => m.default),
  fr: () => import('./fr').then((m) => m.default),
  de: () => import('./de').then((m) => m.default),
  ja: () => import('./ja').then((m) => m.default),
  zh: () => import('./zh').then((m) => m.default),
  ko: () => import('./ko').then((m) => m.default),
  hi: () => import('./hi').then((m) => m.default),
  ar: () => import('./ar').then((m) => m.default),
  th: () => import('./th').then((m) => m.default),
  it: () => import('./it').then((m) => m.default),
  ru: () => import('./ru').then((m) => m.default),
  pt: () => import('./pt').then((m) => m.default),
  ms: () => import('./ms').then((m) => m.default),
  vi: () => import('./vi').then((m) => m.default),
  id: () => import('./id').then((m) => m.default),
};

export function getMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
