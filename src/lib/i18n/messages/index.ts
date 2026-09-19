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
};

export function getMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
