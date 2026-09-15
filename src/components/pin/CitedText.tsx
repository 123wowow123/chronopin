import Link from 'next/link';
import { citeReasoning, orderEvidence } from '@/lib/citations';
import type { Evidence } from '@/lib/referenceConfidence';

// Text with a superscript [n] after each reference it names, linking to that
// reference in the pin page's References panel. hrefBase is the pin's path
// when shown away from that page. omit leaves out citations of one reference -
// the one the text is shown next to.
export function CitedText({ text, evidence, hrefBase, omit }: { text: string; evidence: Evidence[]; hrefBase?: string; omit?: number }) {
  const segments = citeReasoning(text, orderEvidence(evidence))
    .map((segment) => (typeof segment === 'string' ? segment : { cite: segment.cite.filter((n) => n !== omit) }))
    .filter((segment) => typeof segment === 'string' || segment.cite.length);
  return (
    <>
      {segments.map((segment, i) =>
        typeof segment === 'string' ? (
          segment
        ) : (
          // A taller tap target than the 13px superscript, without moving the text.
          <sup key={i} className="ml-px not-italic [&_a]:relative [&_a]:after:absolute [&_a]:after:-inset-y-2 [&_a]:after:inset-x-0 [&_a]:after:content-['']">
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
