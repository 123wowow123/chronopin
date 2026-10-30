import type { Metadata } from 'next';
import { connection } from 'next/server';
import { H2, legalMetadata, P, UL } from '@/components/legal/LegalPage';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getT } from '@/lib/i18n/server';
import { pinPath } from '@/lib/seo';
import { WIDGET_HEIGHT, WIDGET_THEMES, WIDGET_THREAD_LIMIT, widgetSnippets, widgetSrc } from '@/lib/widget';
import Pins from '@/server/model/pins';
import { timelineMinConfidence } from '@/server/services/timeline';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return legalMetadata('/embed', 'legal.embedTitle', 'legal.embedDescription');
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-line bg-raised/40 p-3 font-mono text-xs leading-relaxed text-ink">
      <code>{children}</code>
    </pre>
  );
}

// The embed guide: the two snippets, their options, and a live example on the
// next pin to start. English on every language's page, like the other guides.
export default async function EmbedPage() {
  const t = await getT();
  await connection();
  const [next] = await Pins.upcoming(new Date(), 1, await timelineMinConfidence());
  const id = next ? Number(next.id) : 1;
  const countdown = widgetSnippets(id);
  const thread = widgetSnippets(id, { view: 'thread', theme: 'dark' });
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{t('legal.embedTitle')}</h1>
      {t.locale === DEFAULT_LOCALE ? null : <p className="mb-2 text-sm text-subtle">{t('legal.englishOnly')}</p>}
      <div lang="en" dir="ltr" className="text-base leading-relaxed">
        <P>
          Put a live countdown to any pin, or the whole thread it belongs to, on your blog, newsletter archive or news site. The widget updates itself, and every one links back to the pin page, where the sources and the date&apos;s
          confidence are.
        </P>

        <H2>Quick start</H2>
        <UL>
          <li>
            Open a pin and note its number: <code className="font-mono text-ink">chronopin.com/pin/<b>123</b>/title</code> is pin 123.
          </li>
          <li>Paste the snippet below where you want the widget, with your pin&apos;s number in place of the example one.</li>
        </UL>
        {next ? (
          <>
            <P>
              Live example, for <a href={pinPath(next)}>{next.title}</a>:
            </P>
            <iframe src={widgetSrc(id).replace(/^https?:\/\/[^/]+/, '')} title="Countdown widget example" width="100%" height={WIDGET_HEIGHT.countdown} loading="lazy" className="mb-4 max-w-[520px] border-0" />
          </>
        ) : null}

        <H2>Script snippet (recommended)</H2>
        <P>
          The script draws the widget and keeps it the right height. The link inside the div stays on your page as a plain text link to the pin, and is what shows if a reader has scripts turned off.
        </P>
        <Code>{countdown.script}</Code>

        <H2>Iframe snippet</H2>
        <P>For platforms that allow iframes but not scripts.</P>
        <Code>{countdown.iframe}</Code>

        <H2>Options</H2>
        <P>
          On the script snippet set them as <code className="font-mono text-ink">data-</code> attributes on the div; on the iframe, as query parameters.
        </P>
        <UL>
          <li>
            <code className="font-mono text-ink">view</code>: <code className="font-mono text-ink">countdown</code> (the default) shows days, hours, minutes and seconds to the pin&apos;s start, ticking on the
            reader&apos;s clock, and a note once it has started. <code className="font-mono text-ink">thread</code> lists the pin&apos;s story in order, the pin marked, up to {WIDGET_THREAD_LIMIT} entries and a count of the rest.
            A pin with no thread shows the countdown.
          </li>
          <li>
            <code className="font-mono text-ink">theme</code>: {WIDGET_THEMES.map((theme) => theme).join(', ')}. <code className="font-mono text-ink">auto</code> follows the reader&apos;s light or dark setting.
          </li>
          <li>
            <code className="font-mono text-ink">lang</code>: a language code (<code className="font-mono text-ink">es</code>, <code className="font-mono text-ink">ja</code>, …) for the pin&apos;s title and the date format, when
            the pin is translated. The default is English.
          </li>
        </UL>
        <P>For example, the thread in the dark theme:</P>
        <Code>{thread.script}</Code>

        <H2>Good to know</H2>
        <UL>
          <li>The widget is at most 520 pixels wide and fills the width of its container below that. A countdown is about {WIDGET_HEIGHT.countdown} pixels tall; a thread grows with its entries.</li>
          <li>Pins that are timed count down to the exact moment; all-day pins to midnight at the start of that day on the reader&apos;s clock.</li>
          <li>The widget sets no cookies and loads no ads or trackers. Pages are cached for a few minutes, so a corrected date shows up shortly after the pin is edited.</li>
          <li>If a pin is removed, the widget says so instead of showing an empty box.</li>
          <li>Free to use, including on commercial sites. Please leave the Chronopin link in place.</li>
        </UL>
      </div>
    </main>
  );
}
