import { PARTY_TONE } from '@/lib/elections';

// A chamber's seats as one bar: Democrats from the left, Republicans from the right, the seats
// not yet called (or independent) between them, and a tick where control starts.
export function SeatBar({ democrats, republicans, total, majority, label, className = '' }: { democrats: number; republicans: number; total: number; majority: number; label: string; className?: string }) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div role="img" aria-label={label} className={`relative h-3 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <span className={`absolute inset-y-0 left-0 ${PARTY_TONE.D}`} style={{ width: pct(democrats) }} />
      <span className={`absolute inset-y-0 right-0 ${PARTY_TONE.R}`} style={{ width: pct(republicans) }} />
      <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: pct(majority) }} />
    </div>
  );
}
