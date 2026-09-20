import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlTitle, htmlToText, jsonIslandText, looksBlocked } from './sourceText';

describe('htmlToText', () => {
  it('keeps the words, drops scripts and page chrome, breaks at blocks', () => {
    const html = `<html><head><style>p{}</style><script>var a = "<p>no</p>";</script></head>
      <body><nav><a href="/">Home</a></nav><h1>Bridge opens</h1><p>The span opens on <b>18&nbsp;September</b>.</p>
      <!-- tracking --><p>Cost: CA&#36;6.4&nbsp;billion &amp; rising</p><footer>© Site</footer></body></html>`;
    expect(htmlToText(html)).toBe('Bridge opens\n\nThe span opens on 18 September .\n\nCost: CA$6.4 billion & rising');
  });
});

describe('htmlTitle', () => {
  it('prefers og:title and decodes it', () => {
    expect(htmlTitle('<meta property="og:title" content="Tom &amp; Jerry"><title>Site | Tom</title>')).toBe('Tom & Jerry');
    expect(htmlTitle('<title>\n  A  page </title>')).toBe('A page');
    expect(htmlTitle('<p>none</p>')).toBeUndefined();
  });
});

describe('decodeEntities', () => {
  it('decodes numeric and named entities and leaves unknown ones', () => {
    expect(decodeEntities('&#x2014;&#8217;&rsquo;&bogus;')).toBe('—’’&bogus;');
  });
});

describe('looksBlocked', () => {
  it('spots a bot check or error page instead of an article', () => {
    expect(looksBlocked('Just a moment...\nEnable JavaScript and cookies to continue')).toBe(true);
    expect(looksBlocked('Access Denied\nYou don\'t have permission to access this server')).toBe(true);
    expect(looksBlocked('403 Forbidden')).toBe(true);
    expect(looksBlocked('Oops! That page can\'t be found.')).toBe(true);
  });
  it('leaves a real article alone, even one that mentions a 404', () => {
    expect(looksBlocked('The tunnel opens in 2027. '.repeat(100) + 'A 404 Not Found was shown once.')).toBe(false);
    expect(looksBlocked('The bridge opens on 28 September.')).toBe(false);
  });
});

describe('jsonIslandText', () => {
  // A page that renders its article from a JSON island paints only the heading,
  // so both the plain fetch and the browser come back with nothing usable.
  it('reads prose out of a __NEXT_DATA__ island', () => {
    const prose = 'Cosm Atlanta opens this summer at Centennial Yards with an eighty-seven foot dome and shared viewing floors.';
    const html = `<html><body><h1>Cosm Atlanta</h1><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { blocks: [{ kind: 'md', body: prose }] } })}</script></body></html>`;
    expect(jsonIslandText(html)).toContain('Centennial Yards');
  });

  // The same islands carry the page's own compiled code, and a wiki written
  // from that would look full while saying nothing.
  it('leaves compiled MDX and config out', () => {
    const code = 'const {jsx: _jsx} = arguments[0]; function _createMdxContent(props) { return _jsx("div", { className: "flex items-center" }); }';
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ a: code, b: 'hero-image-wide-desktop-variant', c: 'https://example.com/a/very/long/path/that/goes/on/and/on/forever' })}</script>`;
    expect(jsonIslandText(html)).toBe('');
  });

  it('is empty when there is no island', () => {
    expect(jsonIslandText('<html><body><p>Ordinary page.</p></body></html>')).toBe('');
  });
});
