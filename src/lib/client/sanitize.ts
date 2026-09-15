'use client';

// The browser's half of pin HTML sanitising (the server uses sanitize-html in
// src/lib/sanitize.ts): keeps simple formatting and links, drops everything
// else, using the DOM's own parser.

const ALLOWED = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'S', 'U', 'A', 'H3', 'H4', 'BLOCKQUOTE', 'CODE']);

export function safeHtmlInBrowser(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;

  const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED.has(child.tagName)) {
        // Unknown elements keep their text; script-like ones go entirely.
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'].includes(child.tagName)) {
          child.remove();
        } else {
          clean(child);
          child.replaceWith(...Array.from(child.childNodes));
        }
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keep = child.tagName === 'A' && (attr.name === 'href' || attr.name === 'title');
        if (!keep || (attr.name === 'href' && !/^(https?:|mailto:)/i.test(attr.value.trim()))) {
          child.removeAttribute(attr.name);
        }
      }
      if (child.tagName === 'A') {
        child.setAttribute('rel', 'noopener nofollow ugc');
        child.setAttribute('target', '_blank');
      }
      clean(child);
    }
  };
  clean(root);
  return root.innerHTML;
}
