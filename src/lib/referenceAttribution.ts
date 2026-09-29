import { urlKey } from './citations';

type Attributed = { url: string; addedByUserId?: number | null; addedByUserName?: string | null; addedByUserPictureUrl?: string | null };

// Sets who added each of a pin's references, on the server, whatever the
// request said: one the pin already had (the same page) keeps its contributor;
// a new one is credited to the editor, or to nobody when the editor is the
// pin's author. Changes the references in place and returns them.
export function attributeReferences<R extends Attributed>(
  references: R[],
  { existing, editorId, authorId }: { existing: Attributed[]; editorId: number; authorId: number | null | undefined },
): R[] {
  const before = new Map(existing.map((r) => [urlKey(r.url), r]));
  const editorIsAuthor = authorId != null && Number(authorId) === Number(editorId);
  for (const reference of references) {
    const key = urlKey(reference.url);
    const had = key ? before.get(key) : undefined;
    reference.addedByUserId = had ? (had.addedByUserId ?? null) : editorIsAuthor ? null : editorId;
    // Names come from the view on the next read.
    reference.addedByUserName = undefined;
    reference.addedByUserPictureUrl = undefined;
  }
  return references;
}
