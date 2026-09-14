import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3 text-muted">That pin or page doesn&apos;t exist, or it was removed.</p>
      <p className="mt-6">
        <Link href="/">Back to the timeline</Link>
      </p>
    </main>
  );
}
