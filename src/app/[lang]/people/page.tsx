import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { PeopleDirectory, type DirectoryGroup } from '@/components/person/PeopleDirectory';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { foldRoles, isFormer, isPolitical, PERSON_ROLES, type PersonRole } from '@/lib/people';
import { personIndex } from '@/server/services/people';
import { siteCardImages } from '@/server/services/shareCard';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const title = t('person.indexTitle');
  const description = t('person.indexDescription', { site: siteName });
  const images = await siteCardImages();
  const links = await alternates('/people');
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function PeoplePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <People />
      </Suspense>
    </main>
  );
}

async function People() {
  await connection();
  const [t, people] = await Promise.all([getT(), personIndex()]);
  // Sitting officeholders and everyone else by role; political people who
  // have left office, or died, under Former officeholders, newest exit first.
  const card = (p: (typeof people)[number], useOffice: boolean) => ({
    id: p.id,
    name: p.name,
    photoUrl: p.photoUrl,
    radar: p.radar,
    // What the second row of filters groups by.
    role: p.role,
    inOffice: isPolitical(p.role) ? !isFormer(p) : undefined,
    party: p.party,
    trades: p.trades,
    living: p.deathDate == null,
    line: [useOffice ? p.office : null, p.party, useOffice ? null : p.jurisdiction].filter(Boolean).join(' \u00b7 '),
  });
  // The Presidents and Vice President tabs: whoever holds the office and the
  // ten before them, the latest first (a sitting holder has no exit day, so
  // sorts first). The older ones stay with the former officeholders.
  const PAST_HOLDERS = 10;
  const recent = (role: PersonRole) =>
    people
      .filter((p) => p.role === role)
      .sort((a, b) => (b.leftOfficeDate ?? '9999-12-31').localeCompare(a.leftOfficeDate ?? '9999-12-31') || a.name.localeCompare(b.name))
      .slice(0, PAST_HOLDERS + 1);
  const presidents = recent('president');
  const vicePresidents = recent('vice-president');
  const inPresidents = new Set([...presidents, ...vicePresidents].map((p) => p.id));
  const former = people
    .filter((p) => isPolitical(p.role) && isFormer(p) && !inPresidents.has(p.id))
    .sort((a, b) => (b.leftOfficeDate ?? b.deathDate ?? '').localeCompare(a.leftOfficeDate ?? a.deathDate ?? '') || a.name.localeCompare(b.name));
  // A role with a handful of people is not worth a tab of its own (at least
  // MIN_TAB_PEOPLE each): it joins a neighbour, and its cards say which role.
  const current = (role: PersonRole) =>
    role === 'president'
      ? presidents
      : role === 'vice-president'
        ? vicePresidents
        : people.filter((p) => p.role === role && !(isPolitical(role) && isFormer(p)));
  const tabOf = foldRoles(Object.fromEntries(PERSON_ROLES.map((role) => [role, current(role).length])));
  const roleName = (role: PersonRole) => t.dynamic(`person.roles.${role}`, role);
  const groups: DirectoryGroup[] = [
    ...PERSON_ROLES.filter((role) => tabOf.get(role) === role).map((role) => ({
      key: role,
      heading: roleName(role),
      people: PERSON_ROLES.filter((r) => tabOf.get(r) === role).flatMap((r) =>
        current(r).map((p) => {
          const c = { ...card(p, r === 'president' || r === 'vice-president'), roleLabel: roleName(r) };
          return r === role ? c : { ...c, line: [roleName(r), c.line].filter(Boolean).join(' \u00b7 ') };
        }),
      ),
    })),
    { key: 'former', heading: t('person.former'), people: former.map((p) => ({ ...card(p, true), roleLabel: roleName(p.role) })) },
  ].filter((g) => g.people.length);
  // The All tab leads the row and lists everyone once, by name; the
  // Presidents tab (when there is one) is still the one that opens.
  const seen = new Set<number>();
  const everyone = groups
    .flatMap((g) => g.people)
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tabs: DirectoryGroup[] = [{ key: 'all', heading: t('person.all'), people: everyone }, ...groups];
  const defaultKey = groups.find((g) => g.key === 'president')?.key ?? groups[0]?.key;
  return (
    <>
      <PeopleDirectory groups={tabs} defaultKey={defaultKey} title={t('person.indexTitle')} description={t('person.indexDescription', { site: siteName })} />
    </>
  );
}
