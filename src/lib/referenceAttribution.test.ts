import { describe, expect, it } from 'vitest';
import { attributeReferences } from './referenceAttribution';

describe('attributeReferences', () => {
  const existing = [
    { url: 'https://www.news.example.com/a/', addedByUserId: 7 },
    { url: 'https://author.example.com/b', addedByUserId: null },
  ];

  it('keeps the contributor of a reference the pin already had, however the link is written', () => {
    const [kept, own] = attributeReferences([{ url: 'https://news.example.com/a', addedByUserId: 99 }, { url: 'https://author.example.com/b', addedByUserId: 99 }], {
      existing,
      editorId: 3,
      authorId: 3,
    });
    expect(kept.addedByUserId).toBe(7);
    expect(own.addedByUserId).toBeNull();
  });

  it("credits a new reference to an editor who is not the pin's author", () => {
    const [added] = attributeReferences([{ url: 'https://new.example.com/c' } as { url: string; addedByUserId?: number | null }], { existing, editorId: 1, authorId: 3 });
    expect(added.addedByUserId).toBe(1);
  });

  it("credits nobody for the author's own new references, whatever the request claimed", () => {
    const [added] = attributeReferences([{ url: 'https://new.example.com/c', addedByUserId: 7, addedByUserName: '@forged' }], { existing: [], editorId: 3, authorId: 3 });
    expect(added).toMatchObject({ addedByUserId: null, addedByUserName: undefined });
  });
});
