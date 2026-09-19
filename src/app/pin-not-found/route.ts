import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, INTL_LOCALES, localeOr, localizePath } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/messages';
import { createTranslator } from '@/lib/i18n/translate';

// The response for a pin that does not exist (src/proxy.ts rewrites to it,
// with the page's language as ?lang=). A route handler rather than a page,
// because only a handler's own status survives: a page streams its shell with
// a 200 before it could say 404.
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(request: NextRequest) {
  const locale = localeOr(request.nextUrl.searchParams.get('lang'), DEFAULT_LOCALE);
  const t = createTranslator(await getMessages(locale), locale);
  const html = `<!doctype html>
<html lang="${INTL_LOCALES[locale]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(t('notFound.pinHeading'))} · Chronopin</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #222; color: #bbb; font: 16px/1.5 system-ui, sans-serif; text-align: center; }
  h1 { color: #d7dadc; font-weight: 500; }
  a { color: #4a92d1; }
</style>
</head>
<body>
<main>
  <h1>${escape(t('notFound.pinHeading'))}</h1>
  <p>${escape(t('notFound.pinBody'))}</p>
  <p><a href="${localizePath('/', locale)}">${escape(t('common.backToTimeline'))}</a></p>
</main>
</body>
</html>`;
  return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
