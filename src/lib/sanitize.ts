import sanitizeHtml from 'sanitize-html';

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
