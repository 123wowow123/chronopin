import Link from '@/components/ui/Link';
import { industrySlug } from '@/lib/industryForecast';
import type { Translator } from '@/lib/i18n/translate';
import { forecastPanels } from '@/server/services/forecasts';

// Links from a pin to the /forecasts/<industry> page of each industry it has a
// forecast panel for. The panel itself loads in the browser, so these are the
// links a crawler (and a reader before it loads) finds in the page.
export async function PinForecastLinks({ slugs, t }: { slugs: string[]; t: Translator }) {
  const industries = [...new Set((await forecastPanels()).filter((f) => slugs.includes(f.slug)).map((f) => f.industry))];
  if (!industries.length) return null;
  return (
    <nav className="my-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t('forecasts.title')}>
      {industries.map((industry) => (
        <Link key={industry} href={`/forecasts/${industrySlug(industry)}`} className="text-accent hover:underline">
          {t('forecasts.industryTitle', { industry })} →
        </Link>
      ))}
    </nav>
  );
}
