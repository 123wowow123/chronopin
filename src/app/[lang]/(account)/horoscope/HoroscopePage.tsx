'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import { compatibleSigns, dailyExtras, SIGN_PROFILE, sunSign } from '@/lib/horoscope';

type Reading = { day: string; text: string | null; personal?: boolean; transits?: { planet: string; aspect: string; natal: string }[] };

export default function HoroscopePage() {
  const t = useT();
  const { user } = useSession();
  const sign = user ? sunSign(user.birthday) : null;
  const [reading, setReading] = useState<Reading | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!sign) return;
    let live = true;
    fetch('/api/horoscope/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: Reading | null) => live && setReading(body))
      .catch(() => {})
      .finally(() => live && setDone(true));
    return () => {
      live = false;
    };
  }, [sign?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;
  if (!sign) {
    return (
      <p className="text-muted">
        <Link href="/profile">{t('horoscope.addBirthday')}</Link>
      </p>
    );
  }
  const day = reading?.day ?? new Date().toISOString().slice(0, 10);
  const extras = dailyExtras(sign.slug, day);
  const fits = compatibleSigns(sign);
  const card = 'rounded-xl border border-line bg-surface p-4';
  return (
    <div className="space-y-4">
      <div className={`${card} flex items-center gap-3`}>
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent">{sign.symbol}</span>
        <div>
          <div className="text-lg font-semibold text-ink">{sign.name}</div>
          <div className="text-sm text-subtle">{sign.element} · {sign.range} · {day}</div>
        </div>
      </div>

      <section className={card}>
        <h2 className="mb-1.5 text-sm font-semibold text-ink">{t('horoscope.today')}</h2>
        {reading?.personal && reading.transits?.length ? (
          <p className="mb-1.5 text-xs text-subtle">
            {reading.transits.map((t) => `${t.planet} ${t.aspect} ${t.natal}`).join(' · ')}
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-muted">
          {reading?.text ?? (done ? t('horoscope.notWritten') : t('horoscope.loading'))}
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-sm font-semibold text-ink">{t('horoscope.about', { name: sign.name })}</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-subtle">{t('horoscope.element')}</dt><dd className="font-semibold text-ink">{sign.element}</dd></div>
          <div><dt className="text-xs text-subtle">{t('horoscope.modality')}</dt><dd className="font-semibold text-ink">{SIGN_PROFILE[sign.slug].modality}</dd></div>
          <div><dt className="text-xs text-subtle">{t('horoscope.ruler')}</dt><dd className="font-semibold text-ink">{SIGN_PROFILE[sign.slug].ruler}</dd></div>
        </dl>
        <p className="mt-2 text-sm text-muted">{SIGN_PROFILE[sign.slug].traits}</p>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-sm font-semibold text-ink">{t('horoscope.luckyDetails')}</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-subtle">{t('horoscope.luckyNumber')}</dt><dd className="font-semibold text-ink">{extras.luckyNumber}</dd></div>
          <div><dt className="text-xs text-subtle">{t('horoscope.luckyColor')}</dt><dd className="font-semibold text-ink">{extras.luckyColor}</dd></div>
          <div><dt className="text-xs text-subtle">{t('horoscope.mood')}</dt><dd className="font-semibold text-ink">{extras.mood}</dd></div>
        </dl>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-sm font-semibold text-ink">{t('horoscope.compatible')}</h2>
        <p className="mb-2 text-xs text-subtle">{t('horoscope.compatibleHint', { element: sign.element })}</p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {fits.map((s) => (
            <li key={s.slug} className="rounded-full bg-raised px-3 py-1 text-ink">{s.symbol} {s.name}</li>
          ))}
        </ul>
      </section>

      <p className="text-sm">
        <a href="https://cafeastrology.com/astrologyof2017horoscopes.html" target="_blank" rel="noopener noreferrer">
          {t('horoscope.calendar')}
        </a>
      </p>
    </div>
  );
}
