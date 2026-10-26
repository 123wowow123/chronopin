// Research publication dates; never infer them from a URL or dateModified.
// Writes an evidence report only. Review it before replaying through pin APIs.
// npx tsx scripts/products/reviewDates.ts --audit tmp/review-audit.json --output tmp/review-dates.json
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Parser } from 'htmlparser2';
import type { PinReview } from '@/lib/pinReviews';
import { reviewPublicationDay } from '@/lib/reviewPublicationDay';

const { values } = parseArgs({ options: { audit: { type: 'string' }, output: { type: 'string' } } });
if (!values.audit || !values.output) throw new Error('--audit and --output are required');
const audit = JSON.parse(readFileSync(values.audit, 'utf8'));
const targets: { table: string; pinId: number; title: string; review: PinReview }[] = audit.tables.flatMap((t: any) =>
  t.undated.filter((r: any) => !new URL(r.review.url).hostname.includes('michelin')).map((r: any) => ({ table: t.table, ...r })),
);
const urls = [...new Set(targets.map((r) => r.review.url))];
const normalize = (s: string) => s.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const readings = new Map<string, unknown>();
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronopinReviewResearch/1.0)' } });
      if (!response.ok) { readings.set(url, { status: response.status, reason: 'Page could not be opened' }); continue; }
      const dates: { value: string; evidence: string }[] = [];
      function walk(value: any) {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach(walk); return; }
        if (value['@graph']) walk(value['@graph']);
        const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
        if (types.some((t: string) => /^(?:NewsArticle|Article|BlogPosting|Review|TechArticle|ReportageNewsArticle)$/.test(t)) && typeof value.datePublished === 'string') {
          dates.push({ value: value.datePublished, evidence: JSON.stringify({ '@type': value['@type'], headline: value.headline ?? value.name, datePublished: value.datePublished, url: value.url ?? value.mainEntityOfPage }) });
        }
      }
      let title = '', bodyText = '', script = '', scriptType = '', ignored = 0;
      const parser = new Parser({
        onopentag(name, attrs) {
          if (name === 'meta') {
            if (attrs.property === 'og:title') title = attrs.content ?? '';
            if ([attrs.property, attrs.name, attrs.itemprop].some((v) => v === 'article:published_time' || v === 'datePublished') && attrs.content) dates.push({ value: attrs.content, evidence: JSON.stringify(attrs) });
          }
          if (name === 'script') { script = ''; scriptType = attrs.type ?? ''; }
          if (['script','style','noscript'].includes(name)) ignored++;
        },
        ontext(value) { if (scriptType === 'application/ld+json') script += value; if (!ignored) bodyText += value; },
        onclosetag(name) {
          if (name === 'script') { if (scriptType === 'application/ld+json') { try { walk(JSON.parse(script)); } catch { /* malformed publisher markup */ } } scriptType = ''; }
          if (['script','style','noscript'].includes(name)) ignored = Math.max(0, ignored - 1);
          if (!ignored) bodyText += ' ';
        },
      }, { decodeEntities: true });
      parser.end(await response.text());
      const body = normalize(bodyText);
      const days = [...new Set(dates.map((d) => /^\d{4}-\d{2}-\d{2}/.exec(d.value)?.[0]).filter(Boolean))];
      const matches = targets.filter((t) => t.review.url === url).map((t) => ({ table: t.table, pinId: t.pinId, quoteMatches: !!t.review.quote && !/^paraphrase:/i.test(t.review.quote) && body.includes(normalize(t.review.quote)) }));
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
      const publishedDate = reviewPublicationDay(dates.map((d) => d.value), today);
      readings.set(url, { status: response.status, finalUrl: response.url, title, dates, publishedDate, reason: publishedDate ? null : days.length > 1 ? 'Conflicting publication dates' : 'No valid explicit publication date', matches });
    } catch (error) { readings.set(url, { reason: (error as Error).message }); }
  }
}));
writeFileSync(values.output, JSON.stringify({ checkedAt: new Date().toISOString(), targets: targets.length, pages: Object.fromEntries(readings) }, null, 2) + '\n');
console.log(`${targets.length} undated reviews, ${urls.length} unique pages researched; evidence: ${values.output}`);
