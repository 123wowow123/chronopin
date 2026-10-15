'use client';

// What a pin page shows while its details stream in: the breadcrumb, followed by
// the card shell with placeholder blocks for its title, media, body, and comments.
export default function PinLoading() {
  const block = 'animate-pulse rounded-xl bg-panel border border-line motion-reduce:animate-none';
  return (
    <main className="mx-auto max-w-5xl px-3 pt-6 pb-20 sm:px-6" role="status" aria-busy="true">
      <span className="sr-only">Loading pin…</span>
      {/* Back to timeline / breadcrumb row */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-6 w-28 animate-pulse rounded bg-raised motion-reduce:animate-none" />
      </div>
      {/* Main pin card */}
      <div className={`p-5 sm:p-8 ${block}`}>
        {/* Date and tags header */}
        <div className="mb-3 flex items-center gap-2">
          <div className="h-5 w-28 animate-pulse rounded bg-raised motion-reduce:animate-none" />
          <div className="h-5 w-20 animate-pulse rounded bg-raised motion-reduce:animate-none" />
        </div>
        {/* Title */}
        <div className="mb-4 h-8 w-4/5 animate-pulse rounded-lg bg-raised motion-reduce:animate-none" />
        {/* Media placeholder */}
        <div className="mb-6 h-64 w-full animate-pulse rounded-xl bg-raised sm:h-96 motion-reduce:animate-none" />
        {/* Description body lines */}
        <div className="mb-8 space-y-2.5">
          <div className="h-4 w-full animate-pulse rounded bg-raised motion-reduce:animate-none" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-raised motion-reduce:animate-none" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-raised motion-reduce:animate-none" />
        </div>
        {/* Section divider */}
        <div className="mb-6 h-px w-full bg-line" />
        {/* Comments / interactions skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-raised motion-reduce:animate-none" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-raised motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}
