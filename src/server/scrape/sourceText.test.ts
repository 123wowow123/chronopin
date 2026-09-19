import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlTitle, htmlToText } from './sourceText';

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
