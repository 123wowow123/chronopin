import { Icon } from '@/components/ui/Icon';
import { CitedText } from './CitedText';
import { orderEvidence } from '@/lib/citations';
import type { DateClaim, DateRange } from '@/lib/dateClaims';
import { type Evidence, HALF_LIFE_DAYS, weighReferences } from '@/lib/referenceConfidence';
import { formatDay } from './DateRanges';
import { EditReferencesLink } from './EditReferencesLink';
import { ExpandableList } from './ExpandableList';
import { confidenceClass, PinConfidence } from './PinConfidence';

// Beyond this many, the rest of the list folds away.
const VISIBLE = 5;

// publishedDate is a calendar date, so it reads in UTC; when a link was added
// or posted is an instant, read in the viewer's time zone.
const formatDate = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone }).format(new Date(value));

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Everything backing a pin - its source, then its references newest first -
// with how much each counts toward the pin's overall confidence. Row n has the
// id ref-n, which the [n] citations in the pin's reasoning link to.
export function PinReferences({
  pinId,
  authorId,
  evidence,
  sourceReasoning,
  dateRanges,
  timeZone,
}: {
  pinId: number;
  authorId?: number;
  evidence: Evidence[];
  // The source's reasoning is the pin's dateConfidenceReasoning.
  sourceReasoning?: string;
  dateRanges: { start?: DateRange; end?: DateRange };
  timeZone: string;
}) {
  const linked = orderEvidence(evidence);
  const shares = new Map(weighReferences(linked).map(({ reference, share }) => [reference, share]));
  const added = linked.filter((e) => !e.isSource).length;
  const ids = linked.map((_, index) => `ref-${index + 1}`);

  const rows = linked.map((reference, index) => {
    const share = shares.get(reference);
    const reasoning = reference.isSource ? sourceReasoning : reference.reasoning;
    // The start and end this row gives, if any; the source's come from the pin.
    const claimOf = (range?: DateRange) => range?.claims.find((c) => (reference.isSource ? c.isSource : c.url === reference.url));
    const dates = [
      ['Starts', claimOf(dateRanges.start)],
      ['Ends', claimOf(dateRanges.end)],
    ].filter(([, claim]) => claim) as [string, DateClaim][];
    const site = hostname(reference.url);
    const dated = reference.publishedDate
      ? `Published ${formatDate(reference.publishedDate, 'UTC')}`
      : reference.utcCreatedDateTime
        ? `${reference.isSource ? 'Posted' : 'Added'} ${formatDate(reference.utcCreatedDateTime, timeZone)}`
        : null;
    return (
      <li key={ids[index]} id={ids[index]} className="-mx-2 flex scroll-mt-24 items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-500 data-cited:bg-link/15">
        <span className="mt-0.5 w-6 shrink-0 text-right text-xs text-subtle tabular-nums">[{index + 1}]</span>
        <span
          className={`mt-0.5 w-12 shrink-0 rounded-full py-px text-center text-[11px] font-semibold tabular-nums ring-1 ring-inset ${confidenceClass(reference.confidence)}`}
          title={
            reference.confidence == null
              ? 'Not scored: the source has no date confidence'
              : reference.isSource
                ? 'From the date confidence the source was rated with'
                : 'How strongly this reference supports the pin'
          }
        >
          {reference.confidence == null ? '—' : `${reference.confidence}%`}
        </span>
        <div className="min-w-0 flex-1">
          <a href={reference.url} target="_blank" rel="noopener nofollow" className="flex items-center gap-1.5 font-medium">
            {reference.isSource ? <span className="shrink-0 rounded bg-raised px-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Source</span> : null}
            <span className="truncate">{reference.title || reference.url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}</span>
            <Icon name="external" className="size-3.5 shrink-0 opacity-70" />
          </a>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-subtle">
            <span className="truncate">{site}</span>
            {dated ? <span>· {dated}</span> : null}
            {dates.map(([label, claim]) => (
              <span key={label} className={claim.used ? 'font-medium text-muted' : undefined} title={claim.used ? 'The pin uses this date: it is the most confident' : undefined}>
                · {label} {formatDay(claim.day)}
                {claim.used ? ' ✓' : ''}
              </span>
            ))}
            {share !== undefined ? (
              <span className="tabular-nums" title="Share of the overall confidence; newer references count more">
                · {Math.round(share * 100)}% of score
              </span>
            ) : null}
          </div>
          {reasoning ? (
            <p className="mt-1 text-xs leading-relaxed text-muted italic">
              <CitedText text={reasoning} evidence={linked} omit={index + 1} />
            </p>
          ) : null}
        </div>
      </li>
    );
  });

  return (
    <section aria-labelledby="references-heading" className="surface mt-6 px-4 py-3">
      <h2 id="references-heading" className="flex flex-wrap items-center gap-2 text-base font-semibold">
        References <span className="text-sm font-normal text-subtle tabular-nums">{rows.length}</span>
        <PinConfidence evidence={linked} />
        <EditReferencesLink pinId={pinId} authorId={authorId} hasReferences={added > 0} />
      </h2>
      {rows.length ? (
        <>
          <p className="mt-1 text-xs text-subtle">
            Overall confidence is a weighted average of how firmly each reference supports the start and end times used above; a reference counts half as much for every {HALF_LIFE_DAYS} days older than the newest.
          </p>
          <ExpandableList items={rows} itemIds={ids} visible={VISIBLE} noun="references" className="mt-1 divide-y divide-line" />
        </>
      ) : (
        <p className="mt-1 pb-1 text-sm text-subtle">No references yet. Links backing up this pin, each with a confidence, show here.</p>
      )}
    </section>
  );
}
