'use client';

// What any page under [lang] shows while streaming its content. Next.js prefetches
// this loading screen for dynamic routes, displaying it at once upon navigation
// rather than waiting for the server render to finish.
export default function RootLoading() {
  const block = 'animate-pulse rounded-xl bg-panel border border-line motion-reduce:animate-none';
  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 pt-6 pb-20 sm:px-6" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-raised motion-reduce:animate-none" />
      <div className="mb-8 h-4 w-96 max-w-full animate-pulse rounded bg-raised motion-reduce:animate-none" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-64 ${block}`} />
        ))}
      </div>
    </main>
  );
}
