import { describe, expect, it } from 'vitest';
import { unconfirmedReports } from './unconfirmedReports';

describe('unconfirmedReports', () => {
  it('takes the references marked as unconfirmed, newest first, without the prefix', () => {
    expect(
      unconfirmedReports([
        { url: 'https://a.example/1', reasoning: 'Unconfirmed report: Older leak.', publishedDate: '2026-11-01' },
        { url: 'https://b.example/2', reasoning: 'Official page; mentions an unconfirmed report: no.' },
        { url: 'https://c.example/3', title: 'Newer', reasoning: ' unconfirmed report:  Newer leak.', publishedDate: '2026-11-25' },
        { url: 'https://d.example/4', reasoning: 'Unconfirmed report:' },
      ]),
    ).toEqual([
      { url: 'https://c.example/3', title: 'Newer', publishedDate: '2026-11-25', text: 'Newer leak.' },
      { url: 'https://a.example/1', title: null, publishedDate: '2026-11-01', text: 'Older leak.' },
    ]);
    expect(unconfirmedReports(undefined)).toEqual([]);
  });
});
