import { type DateClaim, type DateRange, isLowConfidence } from '@/lib/dateClaims';
import { confidenceClass } from './PinConfidence';

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

export const formatDay = (ymd: string) => dayFormat.format(toDate(ymd));

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function whose(claim: DateClaim) {
  const by = claim.isSource ? 'the source' : hostname(claim.url || '');
  return claim.confidence == null ? by : `${by}, ${claim.confidence}%`;
}

// The best claim's day, its confidence and who gives it, then "possible Mar 1 –
// Jun 5, 2027" when the claims disagree.
function Range({ label, range }: { label: string; range: DateRange }) {
  const { best } = range;
  const spread = range.earliest !== range.latest;
  return (
    <>
      <dt className="text-subtle">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5" title={range.claims.map((c) => `${formatDay(c.day)} (${whose(c)})${c.used ? ' - used' : ''}`).join('\n')}>
        <span className="font-medium text-muted tabular-nums">{formatDay(best.day)}</span>
        {best.confidence != null ? (
          <span
            className={`rounded-full px-2 py-px text-[10px] font-semibold tracking-wider tabular-nums ring-1 ring-inset ${confidenceClass(best.confidence)}`}
            title={range.claims.length > 1 ? `The most confident of the ${range.claims.length} sources giving this date` : 'The only source giving this date'}
          >
            {best.confidence}% CONFIDENCE
          </span>
        ) : null}
        {isLowConfidence(best.confidence) ? (
          <span className="font-medium text-amber-300" title="The best any source gives for this date is below the source rating 'estimated'">
            Low confidence
          </span>
        ) : null}
        <span className="text-subtle">
          from {best.isSource ? 'the source' : hostname(best.url || '')}
          {spread ? <> · possible {dayFormat.formatRange(toDate(range.earliest), toDate(range.latest))}</> : null}
        </span>
      </dd>
    </>
  );
}

// The pin's start and end, each as the most confident claim among its source
// and references, with the range they all give.
export function DateRanges({ start, end }: { start?: DateRange; end?: DateRange }) {
  if (!start && !end) {
    return null;
  }
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-xs">
      {start ? <Range label="Start" range={start} /> : null}
      {end ? <Range label="End" range={end} /> : null}
    </dl>
  );
}
