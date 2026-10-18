import { jsonLdString } from '@/lib/seo';

// Structured data for search engines, rendered into the server HTML.
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
