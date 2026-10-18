import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClient, llmPaused, resetLlmPause } from '.';

vi.mock('../config', () => ({ default: { anthropic: { apiKey: 'sk-test' } } }));

describe('no-credit pause', () => {
  afterEach(() => {
    resetLlmPause();
    vi.unstubAllGlobals();
  });

  it('stops handing out the client once Anthropic says the credit is gone', async () => {
    const body = '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 400 })));
    const client = getClient()!;
    expect(client).not.toBeNull();
    await client.messages.create({ model: 'm', max_tokens: 1, messages: [{ role: 'user', content: 'x' }] }).catch(() => {});
    expect(llmPaused()).toBe(true);
    expect(getClient()).toBeNull();
    resetLlmPause();
    expect(getClient()).not.toBeNull();
  });
});
