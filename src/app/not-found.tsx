import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold tracking-tight text-faint" aria-hidden>
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-subtle">That pin or page doesn&apos;t exist, or it was removed.</p>
      <p className="mt-8">
        <Link href="/" className="btn btn-primary">
          Back to the timeline
        </Link>
      </p>
    </main>
  );
}
