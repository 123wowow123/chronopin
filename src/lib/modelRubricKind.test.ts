import { describe, expect, it } from 'vitest';
import { rubricKind } from './modelRubricKind';

describe('rubricKind', () => {
  it('sends a text model release to the language-model rubric', () => {
    expect(rubricKind('Grok 4.7 Released')).toBe('llm');
    expect(rubricKind('Claude Opus 5.5 Released')).toBe('llm');
  });
  it('sends a video model release to the video rubric', () => {
    expect(rubricKind('Seedance 2.5 Released')).toBe('video');
    expect(rubricKind('Veo 3.1 Lite Released')).toBe('video');
    expect(rubricKind('Grok Imagine Video 1.5 and 1.5 Fast Released')).toBe('video');
  });
  it('skips what is not a scoreable release', () => {
    expect(rubricKind('OpenAI Retires 6 Sora 2 Video Generation Models and Videos API')).toBeNull();
    expect(rubricKind('GPT-Image-2.5 Flare and Sunburst Released With ChatGPT Images 2.5')).toBeNull();
    expect(rubricKind('Gemini 3.8 Flash TTS and 3.8 Flash-Lite TTS Released')).toBeNull();
    expect(rubricKind('Next Seedance Model Expected at Volcano Engine\'s December FORCE')).toBeNull();
  });
});
