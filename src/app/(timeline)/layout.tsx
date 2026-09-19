import { Suspense } from 'react';

// The timeline and the search results share one loading boundary, so that
// picking a tag on the timeline - which searches for it - keeps the
// timeline (and the panel the pick was made in) on screen until the results
// are ready. A boundary of their own in each page would be a new one to the
// router on the way over, and React shows a new boundary's fallback at once:
// the page would blink white for as long as the search took.
export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<TimelineSkeleton />}>{children}</Suspense>;
}

// What a cold load shows until the first page of pins arrives.
function TimelineSkeleton() {
  return (
    <div className="px-3 pt-6 lg:pl-[190px]" aria-busy="true" aria-label="Loading timeline">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-3 h-72 max-w-[448px] animate-pulse rounded-xl border border-line bg-panel" />
      ))}
    </div>
  );
}
