// The API driver: the job's model runs on the app's own Anthropic key (the
// "Claude credits" half of docs/okf/scraping/daily-jobs.md#drivers). A plain
// loop over the Messages API rather than the SDK's tool runner, because a run
// leans on web_search and web_fetch, whose server-side loop can pause a turn
// (pause_turn) - which the tool runner does not resume - and because the
// loop stops itself at a turn and spending limit.

import Anthropic from '@anthropic-ai/sdk';
import { describeError, getClient, MODEL } from '../../extract';
import log from '../../util/log';
import { runTool, TOOLS, type JobContext } from '../tools';

// Stops a run that is going round in circles.
const MAX_TURNS = 150;
// Stops a run that is spending too much: dollars at list price, estimated
// from the usage each response reports. JOBS_MAX_USD overrides it.
const DEFAULT_MAX_USD = 20;
// Opus 5 list prices per million tokens, and web search per thousand.
const PRICE = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, search: 10 };

export class LlmUnavailable extends Error {}

export type DriverResult = { report: string; usage: Record<string, unknown> };

type Totals = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number; fetches: number; turns: number };

const costOf = (t: Totals) =>
  (t.input * PRICE.input + t.output * PRICE.output + t.cacheRead * PRICE.cacheRead + t.cacheWrite * PRICE.cacheWrite) / 1e6 + (t.searches * PRICE.search) / 1000;

// Whether the key can be used at all: a missing key, a rejected one, or an
// account with no credit sends the run to the session driver instead.
function unavailable(err: unknown): boolean {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return true;
  return err instanceof Anthropic.BadRequestError && /credit balance|billing/i.test(err.message);
}

export async function runWithApi(system: string, kickoff: string, ctx: JobContext): Promise<DriverResult> {
  const client = getClient();
  if (!client) throw new LlmUnavailable('No ANTHROPIC_API_KEY is configured');
  const maxUsd = Number(process.env.JOBS_MAX_USD) || DEFAULT_MAX_USD;

  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 60 },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 120 },
    ...TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: kickoff }];
  const totals: Totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, turns: 0 };
  const usage = () => ({ model: MODEL, ...totals, estimatedUsd: Math.round(costOf(totals) * 100) / 100 });

  let report = '';
  while (true) {
    if (totals.turns >= MAX_TURNS) {
      report = `${report}\n\n[Stopped after ${MAX_TURNS} turns.]`.trim();
      break;
    }
    if (costOf(totals) >= maxUsd) {
      report = `${report}\n\n[Stopped at the $${maxUsd} spending limit for a run (JOBS_MAX_USD).]`.trim();
      break;
    }
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 64000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high' },
          // A policy decline is retried server-side on a fallback model, and
          // old tool results are cleared as the context grows: a run reads
          // dozens of pages it never needs to see again.
          betas: ['server-side-fallback-2026-07-01', 'context-management-2025-06-27'],
          fallbacks: 'default',
          context_management: { edits: [{ type: 'clear_tool_uses_20250919' }] },
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          tools,
          messages,
        })
        .finalMessage();
    } catch (err) {
      if (totals.turns === 0 && unavailable(err)) throw new LlmUnavailable(describeError(err));
      throw new Error(describeError(err));
    }
    totals.turns++;
    const u = response.usage;
    totals.input += u.input_tokens;
    totals.output += u.output_tokens;
    totals.cacheRead += u.cache_read_input_tokens ?? 0;
    totals.cacheWrite += u.cache_creation_input_tokens ?? 0;
    totals.searches += u.server_tool_use?.web_search_requests ?? 0;
    totals.fetches += u.server_tool_use?.web_fetch_requests ?? 0;

    const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) report = text;
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'pause_turn') continue;
    if (response.stop_reason === 'refusal') {
      report = `${report}\n\n[The model declined to continue: ${response.stop_details?.explanation ?? response.stop_details?.category ?? 'no reason given'}]`.trim();
      break;
    }
    if (response.stop_reason !== 'tool_use') {
      if (response.stop_reason === 'max_tokens') {
        // A tool call cut off mid-way has no result to pair with, which the
        // next request would reject; it is dropped and asked for again.
        messages[messages.length - 1] = { role: 'assistant', content: response.content.filter((b) => b.type !== 'tool_use') };
        messages.push({ role: 'user', content: 'You hit the output limit. Continue from where you stopped.' });
        continue;
      }
      break;
    }

    // One at a time: the write tools count against the run's limits, and a
    // run is not in a hurry.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const { text: out, isError } = await runTool(block.name, block.input as Record<string, unknown>, ctx);
      if (isError) log.warn(`job run ${ctx.runId}: ${block.name} failed: ${out.slice(0, 200)}`);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: out, is_error: isError || undefined });
    }
    messages.push({ role: 'user', content: results });
  }
  return { report, usage: usage() };
}
