import type { Metadata } from 'next';
import { connection } from 'next/server';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import type { MessageKey } from '@/lib/i18n/translate';
import { siteCardImages } from '@/server/services/shareCard';

// Per request: the hreflang list follows the admin's language setting.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const title = t('about.title');
  const description = t('about.description', { site: siteName });
  const images = await siteCardImages();
  const links = await alternates('/about');
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

const FIND: MessageKey[] = ['about.find.screen', 'about.find.games', 'about.find.live', 'about.find.space', 'about.find.markets'];
const MORE: MessageKey[] = ['about.more.threads', 'about.more.delays', 'about.more.map', 'about.more.follow', 'about.more.search'];

export default async function AboutPage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">{t('about.title')}</h1>
      <p className="mb-10 text-lg text-muted">{t('about.lead', { site: siteName })}</p>
      <Section heading={t('about.findHeading')} items={FIND.map((key) => t(key))} />
      <Section heading={t('about.moreHeading')} items={MORE.map((key) => t(key))} />
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">{t('about.trustHeading')}</h2>
        <p className="text-base text-muted">{t('about.trustBody')}</p>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">{t('about.startHeading')}</h2>
        <p className="flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            {t('nav.timeline')}
          </Link>
          <Link href="/map" className="btn btn-secondary">
            {t('nav.map')}
          </Link>
          <Link href="/tags" className="btn btn-secondary">
            {t('topic.tagsTitle')}
          </Link>
          <Link href="/companies" className="btn btn-secondary">
            {t('topic.companiesTitle')}
          </Link>
        </p>
      </section>
    </main>
  );
}

function Section({ heading, items }: { heading: string; items: string[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{heading}</h2>
      <ul className="grid list-disc gap-2 ps-5 text-base text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
