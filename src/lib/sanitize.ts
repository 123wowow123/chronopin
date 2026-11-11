import sanitizeHtml from 'sanitize-html';
import { numberCitations, orderEvidence } from './citations';
import type { Evidence } from './referenceConfidence';
import { externalLinkAttributes, relativeSiteUrl } from './siteLinks';

// Pin descriptions and summaries are stored as HTML (bulleted key points,
// links). The Angular app rendered them with sanitising turned off; this keeps
// the formatting and drops anything that could run script. Tables carry a
// maker's own results table (a model's benchmarks against its rivals).
export function safeHtml(html: string | null | undefined): string {
  return markTopScores(sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 's', 'u', 'a', 'h3', 'h4', 'blockquote', 'code', 'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...(attribs.title ? { title: attribs.title } : {}), ...(attribs.href ? { href: relativeSiteUrl(attribs.href) } : {}), rel: 'nofollow ugc', ...externalLinkAttributes(attribs.href, 'nofollow ugc') } }),
    },
  }));
}

// In a results table, shades the best (highest) number of each row green so the
// leader reads at a glance. A row needs two or more numeric cells after its
// label; ties all shade. Runs on sanitised HTML, so the class survives.
function markTopScores(html: string): string {
  if (!html.includes('<table')) return html;
  return html.replace(/<tr>([\s\S]*?)<\/tr>/g, (row, inner: string) => {
    const cells = [...inner.matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)];
    const values = cells.map((c, i) => {
      if (i === 0) return NaN;
      const m = c[3].replace(/<[^>]*>/g, '').trim().match(/^[-+]?\d[\d,]*(?:\.\d+)?/);
      return m ? parseFloat(m[0].replace(/,/g, '')) : NaN;
    });
    const nums = values.filter((v) => !Number.isNaN(v));
    if (nums.length < 2) return row;
    const best = Math.max(...nums);
    let k = 0;
    return `<tr>${inner.replace(/<(td|th)([^>]*)>/g, (tag, name: string, attrs: string) => (values[k++] === best ? `<${name}${attrs} class="top-score">` : tag))}</tr>`;
  });
}

// Summary HTML with its stored citations (see numberCitations) shown as [n]
// links to the References panel's rows. The numbers stand in as private-use
// markers while the rest is sanitised, which would otherwise strip <cite>.
export function safeCitedHtml(html: string | null | undefined, evidence: Evidence[]): string {
  const marked = numberCitations((html || '').replace(/[]/g, ''), orderEvidence(evidence), (numbers) => `${numbers.join(',')}`);
  return safeHtml(marked).replace(/([\d,]+)/g, (_, numbers: string) => {
    const links = numbers
      .split(',')
      .map((n) => `<a href="#ref-${n}" aria-label="Reference ${n}" class="font-medium no-underline">[${n}]</a>`)
      .join('');
    return `<sup class="ml-px not-italic">${links}</sup>`;
  });
}

// Pins for cards, with their description sanitised for rendering as HTML. The
// raw description is left out: a card draws only the sanitised one, and the
// two copies were a sixth of the data a timeline page hands the browser.
export function toCardPins<T extends { description?: string }>(pins: T[]): (T & { safeDescription?: string })[] {
  return pins.map(({ description, ...pin }) => ({ ...pin, safeDescription: description ? safeHtml(description) : undefined }) as T & { safeDescription?: string });
}
