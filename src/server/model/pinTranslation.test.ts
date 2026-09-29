import { describe, expect, it } from 'vitest';
import { changedFields, fieldHashes, hasWords, sourceHash, translatesAll, translationState, wholeTranslation } from './pinTranslation';

describe('hasWords', () => {
  it('counts letters and digits in any script', () => {
    expect(hasWords('OpenAI 自家的弃用页面')).toBe(true);
    expect(hasWords('关闭')).toBe(true);
    expect(hasWords('2026')).toBe(true);
  });

  it('is false for punctuation, space, empty or not a string', () => {
    expect(hasWords(',')).toBe(false);
    expect(hasWords('，。 ')).toBe(false);
    expect(hasWords('')).toBe(false);
    expect(hasWords(null)).toBe(false);
    expect(hasWords(undefined)).toBe(false);
  });
});

describe('translatesAll', () => {
  const pin = { title: 'OpenAI Retires 6 Sora 2 Models', description: 'OpenAI switches off 6 models.', dateConfidenceReasoning: "OpenAI's own page", delayReasoning: null };

  it('wants words for every field the pin has words in', () => {
    expect(translatesAll(pin, { title: 'OpenAI 停用', description: 'OpenAI 关停 6 个模型。', dateConfidenceReasoning: 'OpenAI 自家的页面' })).toBe(true);
    expect(translatesAll(pin, { title: 'OpenAI 停用', description: 'OpenAI 关停 6 个模型。', dateConfidenceReasoning: ',' })).toBe(false);
    expect(translatesAll(pin, { title: 'OpenAI 停用', description: 'OpenAI 关停 6 个模型。', dateConfidenceReasoning: null })).toBe(false);
  });

  it('asks nothing of a field the pin leaves empty', () => {
    expect(translatesAll({ title: 'A pin', description: null }, { title: '一个图钉' })).toBe(true);
  });
});

describe('wholeTranslation', () => {
  it('wants the same bullets and citations as the English', () => {
    const en = '<ul><li>One<cite data-ref="a"></cite></li><li>Two, called "sunset"<cite data-ref="a"></cite></li></ul>';
    expect(wholeTranslation(en, '<ul><li>一<cite data-ref="a"></cite></li><li>二，称为“sunset”<cite data-ref="a"></cite></li></ul>')).toBe(true);
    expect(wholeTranslation(en, '<ul><li>一<cite data-ref="a"></cite></li><li>二，称为')).toBe(false);
  });

  it('turns down a text cut off mid-sentence', () => {
    const en = 'Tracker features lone-wolf survivalist Colter Shaw, who roams the country as a "reward seeker," using his expert tracking skills to help private citizens and law enforcement solve all manner of mysteries.';
    expect(wholeTranslation(en, '《Tracker》讲述独来独往的生存专家Colter Shaw，他以')).toBe(false);
    expect(wholeTranslation(en, '《Tracker》讲述独来独往的生存专家 Colter Shaw，他以“赏金猎人”身份走遍全国，运用高超的追踪技能帮助民众和执法部门破解各种谜团。')).toBe(true);
  });

  it('lets a title end on a word', () => {
    expect(wholeTranslation('OpenAI Retires 6 Sora 2 Video Generation Models and Videos API', 'OpenAI 下线 6 个 Sora 2 视频生成模型及 Videos API')).toBe(true);
  });

  it('reads a shape the database worked out', () => {
    expect(wholeTranslation('<ul><li>One</li></ul>', { head: '<ul><li>一</li></ul>', length: 15, li: 1, cite: 0, end: '>' })).toBe(true);
    expect(wholeTranslation('<ul><li>One</li><li>Two</li></ul>', { head: '<ul><li>一</li></ul>', length: 15, li: 1, cite: 0, end: '>' })).toBe(false);
  });
});

describe('changedFields', () => {
  const before = { title: 'Pin', description: 'Old words.', longFormSummary: null };
  const made = fieldHashes(before);

  it('names the fields edited since the translation was made', () => {
    expect(changedFields(before, made)).toEqual([]);
    expect(changedFields({ ...before, description: 'New words.' }, made)).toEqual(['description']);
    expect(changedFields({ ...before, delayReasoning: 'Pushed back.' }, made)).toEqual(['delayReasoning']);
  });

  it('reads an empty field as an empty string, as sourceHash does', () => {
    expect(changedFields({ title: 'Pin', description: 'Old words.', longFormSummary: '' }, made)).toEqual([]);
  });

  it('is null when the row has no field hashes', () => {
    expect(changedFields(before, null)).toBeNull();
  });
});

describe('translationState', () => {
  const pin = { title: 'Pin', description: 'Words.' };
  const hash = sourceHash(pin);

  it('tells missing, outdated, incomplete and current apart', () => {
    expect(translationState(pin, hash, undefined)).toBe('missing');
    expect(translationState(pin, hash, { sourceHash: sourceHash({ title: 'Old pin', description: 'Words.' }), title: '图钉', description: '词。' })).toBe('outdated');
    expect(translationState(pin, hash, { sourceHash: hash, title: '图钉', description: ',' })).toBe('incomplete');
    expect(translationState(pin, hash, { sourceHash: `${hash}`, title: '图钉', description: '词。' })).toBe('current');
  });
});
