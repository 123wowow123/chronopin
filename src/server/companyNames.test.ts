import { describe, expect, it } from 'vitest';
import { localNamesOf, nameIndex, withCompanyNames } from './companyNames';

describe('localNamesOf', () => {
  it('keeps names in other scripts, with and without a company suffix', () => {
    const names = localNamesOf({
      labels: { 'zh-hans': { value: '甲骨文公司' }, ru: { value: 'Oracle' }, ar: { value: 'شركة أبل' }, ja: { value: 'グッチ (企業)' } },
      aliases: { ko: [{ value: 'PPR' }, { value: '구찌' }], zh: [{ value: '古' }] },
    });
    expect(names).toEqual(['甲骨文公司', '甲骨文', 'グッチ', '구찌', 'شركة أبل', 'أبل']);
  });
});

describe('withCompanyNames', () => {
  const index = nameIndex([
    { name: 'Apple', localNames: ['苹果', '苹果公司', 'أبل', 'एप्पल'] },
    { name: 'Gucci', localNames: ['古驰', '구찌', 'غوتشي', 'Гуччи'] },
    { name: 'Disney+', localNames: ['迪士尼'] },
    { name: 'TSMC', localNames: ['台积电', '迪士尼'] },
  ]);

  it('names the company beside its name in another script', () => {
    expect(withCompanyNames('古驰新任首席执行官', index)).toBe('古驰新任首席执行官 Gucci');
    expect(withCompanyNames('구찌 신임 최고경영자', index)).toBe('구찌 신임 최고경영자 Gucci');
    expect(withCompanyNames('الرئيس التنفيذي الجديد لغوتشي', index)).toBe('الرئيس التنفيذي الجديد لغوتشي Gucci');
    expect(withCompanyNames('новый директор Гуччи', index)).toBe('новый директор Гуччи Gucci');
  });

  it('counts a name inside a longer one once', () => {
    expect(withCompanyNames('苹果公司 台积电', index)).toBe('苹果公司 台积电 Apple TSMC');
  });

  it('finds a two-character name only where a word starts', () => {
    const bell = nameIndex([{ name: 'Bell Textron', localNames: ['贝尔'] }]);
    expect(withCompanyNames('诺贝尔医学奖', bell)).toBe('诺贝尔医学奖');
    expect(withCompanyNames('贝尔直升机', bell)).toBe('贝尔直升机 Bell Textron');
    expect(withCompanyNames('新款 贝尔直升机', bell)).toBe('新款 贝尔直升机 Bell Textron');
  });

  it('does not find a name inside a longer word', () => {
    const more = nameIndex([
      { name: "McDonald's", localNames: ['マック'] },
      { name: 'Dell', localNames: ['ديل', 'デル'] },
      { name: 'Bungie', localNames: ['번지'] },
    ]);
    expect(withCompanyNames('ポトマック川の橋', more)).toBe('ポトマック川の橋');
    expect(withCompanyNames('マックの新メニュー', more)).toBe("マックの新メニュー McDonald's");
    expect(withCompanyNames('مخبز في غلينديل', more)).toBe('مخبز في غلينديل');
    expect(withCompanyNames('حاسوب من ديل', more)).toBe('حاسوب من ديل Dell');
    expect(withCompanyNames('بديل', more)).toBe('بديل');
    expect(withCompanyNames('번지 신작', more)).toBe('번지 신작 Bungie');
    expect(withCompanyNames('유럽에번지다', more)).toBe('유럽에번지다');
  });

  it('gives a shared name to the first company that has it', () => {
    expect(withCompanyNames('迪士尼乐园', index)).toBe('迪士尼乐园 Disney+');
  });

  it('leaves Latin text, and text already naming the company, alone', () => {
    expect(withCompanyNames('Gucci CEO', index)).toBe('Gucci CEO');
    expect(withCompanyNames('Gucci 古驰', index)).toBe('Gucci 古驰');
  });

  it('wants a spaced-script name to end a word', () => {
    expect(withCompanyNames('Гуччиони', index)).toBe('Гуччиони');
    expect(withCompanyNames('एप्पलो', index)).toBe('एप्पलो');
    expect(withCompanyNames('एप्पल का फ़ोन', index)).toBe('एप्पल का फ़ोन Apple');
  });
});
