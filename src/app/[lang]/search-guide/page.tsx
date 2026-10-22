import type { Metadata } from 'next';
import { connection } from 'next/server';
import { H2, legalMetadata, P } from '@/components/legal/LegalPage';
import Link from '@/components/ui/Link';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { getT } from '@/lib/i18n/server';
import { SEARCH_GUIDE, SEARCH_GUIDE_RULES } from '@/lib/searchGuide';

// Per request: the hreflang list follows the admin's language setting.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return legalMetadata('/search-guide', 'legal.searchTitle', 'legal.searchDescription');
}

function Example({ q }: { q: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(q)}`}
      className="inline-flex items-center rounded-full bg-raised px-2.5 py-0.5 font-mono text-xs text-ink ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:no-underline"
    >
      {q}
    </Link>
  );
}

// Every search term, with examples that open the search. The text is English
// on every language's page, like the legal pages.
export default async function SearchGuidePage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{t('legal.searchTitle')}</h1>
      {t.locale === DEFAULT_LOCALE ? null : <p className="mb-2 text-sm text-subtle">{t('legal.englishOnly')}</p>}
      <div lang="en" dir="ltr" className="text-base leading-relaxed">
        <P>
          Type a term as <code className="font-mono text-ink">field:value</code> in the search box, or click any label on a pin to add it. Click an example below to run it.
        </P>

        {SEARCH_GUIDE.map((group) => (
          <section key={group.heading}>
            <H2>{group.heading}</H2>
            {group.intro ? <P>{group.intro}</P> : null}
            <dl className="grid gap-4">
              {group.entries.map((entry) => (
                <div key={entry.term} className="rounded-xl border border-line bg-raised/40 p-3">
                  <dt className="font-mono text-sm font-semibold text-ink">{entry.term}</dt>
                  <dd className="mt-1 text-sm text-muted">{entry.what}</dd>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {entry.examples.map((q) => (
                      <Example key={q} q={q} />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <H2>Combining terms</H2>
        <dl className="grid gap-4">
          {SEARCH_GUIDE_RULES.map((rule) => (
            <div key={rule.title} className="rounded-xl border border-line bg-raised/40 p-3">
              <dt className="text-sm font-semibold text-ink">{rule.title}</dt>
              <dd className="mt-1 text-sm text-muted">{rule.body}</dd>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {rule.examples.map((q) => (
                  <Example key={q} q={q} />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
