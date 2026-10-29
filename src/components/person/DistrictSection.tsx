import Anchor from '@/components/ui/Anchor';
import type { PersonDistrictJson } from '@/lib/personDistrict';
import type { Translator } from '@/lib/i18n/translate';
import { DistrictMapLoader } from './DistrictMapLoader';

// The seat a sitting member of Congress holds, drawn from Census boundaries.
export function DistrictSection({ district, name, t }: { district: PersonDistrictJson; name: string; t: Translator }) {
  return (
    <section id="district" aria-labelledby="district-heading" className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id="district-heading" className="text-2xl font-semibold tracking-tight">
          {t('person.district.title')}: {district.label}
        </h2>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">
          {t('person.district.about', { name, vintage: district.vintage })} <Anchor href={district.sourceUrl}>{district.source}</Anchor>
        </p>
      </div>
      <DistrictMapLoader district={district} />
    </section>
  );
}
