import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from '@/components/ui/Link';
import { THIN_REASON_LABELS, THIN_TEXT_CHARS, MIN_SOURCES } from '@/lib/searchQuality';
import { pinPath } from '@/lib/seo';
import { MIN_INDEXED_PINS } from '@/lib/topics';
import { requireAdminViewer } from '@/server/guard';
import { getHideThinPins } from '@/server/model/appSetting';
import * as SearchIssues from '@/server/model/searchIssues';
import { topicIndex } from '@/server/services/topics';
import { AdminTabs } from '../AdminTabs';
import { HideThinPinsForm } from './HideThinPinsForm';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin search' };

const THIN_SHOWN = 300;
const LIST_SHOWN = 100;

// What may keep pin pages out of Google, or count against the whole site
// (AdSense's "low value content"), worst first, with the switch that hides
// thin pins from search.
export default async function AdminSearchPage() {
  await requireAdminViewer('/admin/search');
  const [counts, setting, thin, duplicates, longTitles, noMedia, index] = await Promise.all([
    SearchIssues.counts(),
    getHideThinPins(),
    SearchIssues.thinPins(THIN_SHOWN),
    SearchIssues.duplicateTitles(LIST_SHOWN),
    SearchIssues.longTitles(LIST_SHOWN),
    SearchIssues.noMedia(LIST_SHOWN),
    topicIndex(),
  ]);
  const tagsIndexed = index.tags.filter((t) => t.pins >= MIN_INDEXED_PINS).length;
  const companiesIndexed = index.companies.filter((c) => c.pins >= MIN_INDEXED_PINS).length;
  const pinsInSitemap = setting.enabled ? counts.pins - counts.thin : counts.pins;
  const percent = (n: number) => (counts.pins ? `${Math.round((n / counts.pins) * 100)}%` : '0%');

  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/search" />
      <h1 className="sr-only">Search</h1>
      <p className="mb-6 max-w-3xl text-sm text-subtle">
        Likely Google Search problems, read from live pins. Google judges a site by all the pages it indexes, so a large share of thin or
        near-copy pages can pull the whole site down, and AdSense turns down such a site as &ldquo;low value content&rdquo;. Search Console
        has the real indexing report; this is what the data says ahead of it.
      </p>

      <HideThinPinsForm saved={setting} thin={counts.thin} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Live pins" value={counts.pins} />
        <Stat label={setting.enabled ? 'Thin pins (hidden)' : 'Thin pins (indexed!)'} value={counts.thin} note={percent(counts.thin)} warn={!setting.enabled && counts.thin > 0} />
        <Stat label="Pins in the sitemap" value={pinsInSitemap} />
        <Stat label="Duplicate titles" value={counts.duplicateTitlePins} note={`${counts.duplicateTitleGroups.toLocaleString()} groups`} warn={counts.duplicateTitlePins > 0} />
        <Stat label="No summary at all" value={counts.noDescription} warn={counts.noDescription > 0} />
        <Stat label={`Titles over ${SearchIssues.LONG_TITLE_CHARS} chars`} value={counts.longTitles} note={percent(counts.longTitles)} />
        <Stat label="No picture or video" value={counts.noMedia} note={percent(counts.noMedia)} />
        <Stat label="Tag pages indexed" value={tagsIndexed} note={`of ${index.tags.length.toLocaleString()}`} />
        <Stat label="Company pages indexed" value={companiesIndexed} note={`of ${index.companies.length.toLocaleString()}`} />
      </div>

      <Section
        open
        title={`Thin pins: ${counts.thin.toLocaleString()}`}
        intro={
          <>
            A pin is thin with under {THIN_TEXT_CHARS} characters of summary text ({counts.shortText.toLocaleString()} pins) or fewer than {MIN_SOURCES}{' '}
            cited pages, meaning only its own source ({counts.oneSource.toLocaleString()}); {counts.both.toLocaleString()} are both. Fix one by
            writing a fuller summary or adding references, and it is indexed again on its own. Thinnest first
            {counts.thin > THIN_SHOWN ? `, the first ${THIN_SHOWN}` : ''}.
          </>
        }
      >
        <Table head={['Pin', 'Text', 'Sources', 'Why', 'By']}>
          {thin.map((pin) => (
            <tr key={pin.id} className="border-t border-line">
              <PinCell id={pin.id} title={pin.title} />
              <td className={`py-1.5 pr-3 text-right ${pin.textLength < THIN_TEXT_CHARS ? 'text-danger' : ''}`}>{pin.textLength.toLocaleString()}</td>
              <td className={`py-1.5 pr-3 text-right ${pin.sources < MIN_SOURCES ? 'text-danger' : ''}`}>{pin.sources}</td>
              <td className="py-1.5 pr-3 text-subtle">
                {[pin.textLength < THIN_TEXT_CHARS ? THIN_REASON_LABELS.shortText : null, pin.sources < MIN_SOURCES ? THIN_REASON_LABELS.oneSource : null]
                  .filter(Boolean)
                  .join(', ')}
              </td>
              <td className="truncate py-1.5 text-subtle">{pin.userName ?? ''}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title={`Duplicate titles: ${counts.duplicateTitleGroups.toLocaleString()} groups`}
        intro="Pins with the same title read to Google as copies of one page, and it picks one to index. Merge true duplicates, or make each title say what sets it apart (the year, the season, the city)."
      >
        <Table head={['Title', 'Pins']}>
          {duplicates.map((group) => (
            <tr key={group.ids[0]} className="border-t border-line">
              <td className="max-w-0 truncate py-1.5 pr-3" title={group.title}>
                {group.title}
              </td>
              <td className="py-1.5">
                <span className="flex flex-wrap gap-x-2">
                  {group.ids.map((id) => (
                    <Link key={id} href={pinPath({ id, title: group.title })}>
                      {id}
                    </Link>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title={`Long titles: ${counts.longTitles.toLocaleString()}`}
        intro={`Google shows about ${SearchIssues.LONG_TITLE_CHARS} characters of a title and cuts the rest. Not a penalty, but the end of the title, often the date, goes missing. Longest first.`}
      >
        <Table head={['Pin', 'Length']}>
          {longTitles.map((pin) => (
            <tr key={pin.id} className="border-t border-line">
              <PinCell id={pin.id} title={pin.title} />
              <td className="py-1.5 text-right">{pin.titleLength}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title={`No picture or video: ${counts.noMedia.toLocaleString()}`}
        intro="These share with a generated card and never show in image or video results. Newest first."
      >
        <Table head={['Pin']}>
          {noMedia.map((pin) => (
            <tr key={pin.id} className="border-t border-line">
              <PinCell id={pin.id} title={pin.title} />
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Tag and company pages"
        intro={`A tag or company page needs ${MIN_INDEXED_PINS} pins to be indexed (src/lib/topics.ts); below that it says noindex and stays out of the sitemap. ${tagsIndexed.toLocaleString()} of ${index.tags.length.toLocaleString()} tags and ${companiesIndexed.toLocaleString()} of ${index.companies.length.toLocaleString()} companies are indexed.`}
      />
    </div>
  );
}

function Stat({ label, value, note, warn }: { label: string; value: number; note?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="text-xs text-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? 'text-danger' : ''}`}>{value.toLocaleString()}</div>
      {note ? <div className="text-xs text-subtle">{note}</div> : null}
    </div>
  );
}

function Section({ title, intro, open, children }: { title: string; intro: ReactNode; open?: boolean; children?: ReactNode }) {
  return (
    <details open={open} className="mb-4 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <summary className="cursor-pointer text-base font-semibold">{title}</summary>
      <p className="mt-2 max-w-3xl text-sm text-subtle">{intro}</p>
      {children ? <div className="mt-3 overflow-x-auto">{children}</div> : null}
    </details>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full table-fixed text-left text-sm tabular-nums">
      <thead className="text-subtle">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`py-1 pr-3 font-medium ${i === 0 ? 'w-1/2' : ''} ${h === 'Text' || h === 'Sources' || h === 'Length' ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function PinCell({ id, title }: { id: number; title: string }) {
  return (
    <td className="max-w-0 truncate py-1.5 pr-3" title={title}>
      <Link href={pinPath({ id, title })}>{title}</Link>
    </td>
  );
}
