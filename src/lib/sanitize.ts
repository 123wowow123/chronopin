import sanitizeHtml from 'sanitize-html';
import { numberCitations, orderEvidence } from './citations';
import type { Evidence } from './referenceConfidence';

// Pin descriptions and summaries are stored as HTML (bulleted key points,
// links). The Angular app rendered them with sanitising turned off; this keeps
// the formatting and drops anything that could run script.
export function safeHtml(html: string | null | undefined): string {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 's', 'u', 'a', 'h3', 'h4', 'blockquote', 'code'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow ugc', target: '_blank' }),
    },
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

// Embeds (tweets, YouTube players) come from the providers' own APIs; only
// their markup and the iframe/script they need survive. An iframe needs a
// title to be named for screen readers; the YouTube API's embedHtml has none
// (oEmbed's does), so frameTitle fills it in.
export function safeEmbedHtml(html: string | null | undefined, frameTitle?: string): string {
  return sanitizeHtml(html || '', {
    allowedTags: ['iframe', 'blockquote', 'p', 'a', 'br'],
    allowedAttributes: {
      iframe: ['src', 'width', 'height', 'title', 'frameborder', 'allow', 'allowfullscreen', 'referrerpolicy'],
      blockquote: ['class', 'data-*'],
      p: ['lang', 'dir'],
      a: ['href'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
    transformTags: {
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: attribs.title?.trim() || !frameTitle ? attribs : { ...attribs, title: frameTitle },
      }),
    },
  });
}

// Pins for cards, with their description sanitised for rendering as HTML.
export function toCardPins<T extends { description?: string }>(pins: T[]): (T & { safeDescription?: string })[] {
  return pins.map((pin) => ({ ...pin, safeDescription: pin.description ? safeHtml(pin.description) : undefined }));
}
