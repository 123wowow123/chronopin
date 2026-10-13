'use client';

import { useId, useRef } from 'react';
import { dollars, exampleTracking, packageFor } from '@/lib/sponsoredAds';
import { AdChart } from './AdChart';

// A button and the dialog it opens: the report an advertiser gets for a live
// ad, filled with made-up numbers scaled to the package picked in the form.
// A native <dialog>, so Escape closes it, focus is kept inside it and the page
// behind cannot be reached until it is closed.
export function SampleReport({ impressions, className = '' }: { impressions: number; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The form draws its preview twice (wide and narrow layouts), so ids are made per copy.
  const titleId = useId();
  const bought = packageFor(impressions)?.impressions ?? 1000;
  const sample = exampleTracking(bought);
  const ctr = sample.impressions ? ((sample.clicks / sample.impressions) * 100).toFixed(2) : '0.00';
  const progress = Math.min(100, Math.round((sample.impressions / bought) * 100));
  const perPerson = sample.uniques ? (sample.impressions / sample.uniques).toFixed(1) : '0';

  return (
    <>
      <button type="button" className={`btn btn-secondary px-3 py-1.5 text-sm ${className}`} onClick={() => dialog.current?.showModal()}>
        View sample report
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl bg-raised p-0 text-ink shadow-xl backdrop:bg-black/50"
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-xl font-semibold">
                Sample tracking report
              </h2>
              <p className="mt-1 text-sm text-subtle">
                What you will see for a live ad: a {bought.toLocaleString('en-US')}-impression package ({dollars(packageFor(bought)?.priceCents ?? 0)}).
              </p>
            </div>
            <button type="button" className="btn btn-ghost shrink-0" onClick={() => dialog.current?.close()} aria-label="Close">
              Close
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-subtle">Impressions</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {sample.impressions.toLocaleString('en-US')}
                <span className="text-sm font-normal text-subtle"> / {bought.toLocaleString('en-US')}</span>
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Unique people</dt>
              <dd className="text-lg font-semibold tabular-nums">{sample.uniques.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt className="text-subtle">Clicks</dt>
              <dd className="text-lg font-semibold tabular-nums">{sample.clicks.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt className="text-subtle">Click rate</dt>
              <dd className="text-lg font-semibold tabular-nums">{ctr}%</dd>
            </div>
          </dl>

          <div className="h-2 overflow-hidden rounded bg-raised-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Impressions delivered">
            <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
          </div>

          <AdChart days={sample.byDay} />

          <ul className="list-disc space-y-1 ps-5 text-sm text-subtle">
            <li>Impressions count every time your ad is shown; unique people count each person once, however often they saw it.</li>
            <li>On average each person saw the ad {perPerson} times. Ads are shown first to people who have not seen yours yet.</li>
            <li>The green part of each bar is the day&apos;s clicks, the blue part the rest of its impressions. Hover a bar for the numbers.</li>
            <li>Your ad stops once the impressions you bought have been delivered.</li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
