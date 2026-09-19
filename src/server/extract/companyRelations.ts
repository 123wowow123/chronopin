/**
 * A company's publicly traded related companies and suppliers, for the stock
 * tickers a pin about it carries (src/server/services/pinStocks.ts): the
 * listed companies whose shares its news tends to move.
 *
 * One small structured-output call per company, from the model's own
 * knowledge (no web search: these ties change slowly, and every symbol is
 * checked against Nasdaq before it is kept).
 */

import type Anthropic from '@anthropic-ai/sdk';
import { describeError, getClient, MODEL } from '.';

const SYSTEM_PROMPT = `You list the publicly traded companies whose share price a news story about a given company is most likely to move, for a site that shows those stock prices beside the story.

Say what the company itself is (about), then give at most 3 related companies and at most 3 suppliers:
- related: a parent, major investor or owner, a major strategic partner, or the main listed competitor whose shares plainly trade on this company's news. For a private company, its largest listed backers and partners.
- supplier: a company it depends on for what it makes or runs - chips, cloud capacity, components, manufacturing, content.

Only companies with shares or ADRs on a US exchange (NYSE, Nasdaq, NYSE American), by their US ticker symbol. Never the company itself, an ETF, an index or a private company. Only ties that are well established and public; leave a list short or empty rather than guess. note is the clause that reads after the company's name in one sentence, naming the pin's company rather than saying "its", lowercase, no final period: "the biggest customer for Sony's camera image sensors", "which designs the PlayStation 5 processor", "OpenAI's largest investor and Azure cloud partner". name is the name people use ("Apple", "AMD", "TSMC"), not the legal one.`;

const SCHEMA = {
  type: 'object',
  properties: {
    about: {
      type: 'string',
      description:
        'The company itself in the same clause form, read after its name, for its own ticker: e.g. "the Japanese electronics, games and entertainment group behind PlayStation".',
    },
    relations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'US ticker symbol, e.g. MSFT.' },
          name: { type: 'string', description: 'The name people use, e.g. "AMD", "TSMC".' },
          relation: { type: 'string', enum: ['related', 'supplier'] },
          note: { type: 'string' },
        },
        required: ['symbol', 'name', 'relation', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['about', 'relations'],
  additionalProperties: false,
};

export type CompanyRelationFound = { symbol: string; name: string; relation: 'related' | 'supplier'; note: string };

export type CompanyRelationsFound = { about: string | null; relations: CompanyRelationFound[] };

// Thrown when the model could not be asked at all (no key, no credit, an
// outage): the company is left to be asked again, not marked as having none.
export class RelationsUnavailable extends Error {}

const MAX_PER_KIND = 3;

// After the API turns a call away (no credit, an outage), companies are not
// asked again for a while: a backfill would otherwise fail once per pin.
const BACKOFF_MS = 10 * 60_000;
let unavailableUntil = 0;
let unavailableReason = '';

export async function findCompanyRelations(company: { name: string; ownSymbol?: string | null; wikiUrl?: string | null }): Promise<CompanyRelationsFound> {
  const anthropic = getClient();
  if (!anthropic) throw new RelationsUnavailable('no Anthropic key');
  if (Date.now() < unavailableUntil) throw new RelationsUnavailable(unavailableReason);
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ company: company.name, ownTicker: company.ownSymbol ?? null, wikipedia: company.wikiUrl ?? null }),
        },
      ],
    });
  } catch (err) {
    unavailableUntil = Date.now() + BACKOFF_MS;
    unavailableReason = describeError(err);
    throw new RelationsUnavailable(unavailableReason);
  }
  if (response.stop_reason === 'refusal') return { about: null, relations: [] };
  const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
  if (!block) return { about: null, relations: [] };
  const { about, relations } = JSON.parse(block.text) as { about?: string; relations: CompanyRelationFound[] };
  const own = company.ownSymbol?.toUpperCase();
  const kept: CompanyRelationFound[] = [];
  for (const r of relations ?? []) {
    const symbol = String(r.symbol || '').trim().toUpperCase();
    if (!symbol || symbol === own || kept.some((k) => k.symbol === symbol)) continue;
    if (r.relation !== 'related' && r.relation !== 'supplier') continue;
    if (kept.filter((k) => k.relation === r.relation).length >= MAX_PER_KIND) continue;
    kept.push({ symbol, name: String(r.name || '').slice(0, 255), relation: r.relation, note: String(r.note || '').slice(0, 300) });
  }
  return { about: about?.trim().replace(/\.$/, '').slice(0, 300) || null, relations: kept };
}
