// The page's language on the server, from the [lang] segment every page
// routes under (src/app/[lang]). Only for server components: route handlers
// read ?lang= or the locale cookie instead (./request.ts).

import { redirect as nextRedirect, permanentRedirect as nextPermanentRedirect } from 'next/navigation';
import { lang } from 'next/root-params';
import { languageAlternates, localeOr, localizePath, type Locale } from './config';
import { getMessages } from './messages';
import { createTranslator, type Translator } from './translate';

export async function getLocale(): Promise<Locale> {
  return localeOr(await lang());
}

export async function getT(): Promise<Translator> {
  const locale = await getLocale();
  return createTranslator(await getMessages(locale), locale);
}

// redirect() to a path in the page's language.
export async function redirect(path: string, type?: Parameters<typeof nextRedirect>[1]): Promise<never> {
  nextRedirect(localizePath(path, await getLocale()), type);
}

export async function permanentRedirect(path: string): Promise<never> {
  nextPermanentRedirect(localizePath(path, await getLocale()));
}

// A page's canonical URL in its language, and the same page in the others
// (hreflang), for its metadata. x-default is the English page.
export { languageAlternates };

export async function alternates(path: string) {
  const locale = await getLocale();
  return languageAlternates(path, locale);
}
