import Link from 'next/link';
import { citeReasoning, orderEvidence } from '@/lib/citations';
import type { Evidence } from '@/lib/referenceConfidence';

// Text with a superscript [n] after each reference it names, linking to that
// reference in the pin page's References panel. hrefBase is the pin's path
// when shown away from that page.
export function CitedText({ text, evidence, hrefBase }: { text: string; evidence: Evidence[]; hrefBase?: string }) {
  const segments = citeReasoning(text, orderEvidence(evidence));
  return (
    <>
      {segments.map((segment, i) =>
        typeof segment === 'string' ? (
          segment
        ) : (
          <sup key={i} className="ml-px not-italic">
            {segment.cite.map((n) =>
              hrefBase ? (
                <Link key={n} href={`${hrefBase}#ref-${n}`} aria-label={`Reference ${n}`} className="font-medium">
                  [{n}]
                </Link>
              ) : (
                <a key={n} href={`#ref-${n}`} aria-label={`Reference ${n}`} className="font-medium">
                  [{n}]
                </a>
              ),
            )}
          </sup>
        ),
      )}
    </>
  );
}
