import * as db from '../db';
import PinDuplicate from '../model/pinDuplicate';
import { compareDuplicateRank } from '@/lib/duplicates';
import { setParent } from '../scrape/prequel';
import { invalidatePin } from './cache';
import log from '../util/log';
import { prodBase, updatePin } from '../jobs/pinApi';

export type DuplicateRethreadSummary = {
  canonicalId: number;
  detached: number[];
  reparented: { childId: number; from: number; to: number }[];
  adoptedParentId: number | null;
};

type GroupPinRow = {
  id: number;
  parentId: number | null;
  title: string;
  favoriteCount?: number;
  viewCount?: number;
  likeCount?: number;
  utcCreatedDateTime: string;
  author?: string | null;
};

async function syncProdRethread(summary: DuplicateRethreadSummary): Promise<void> {
  if (!prodBase()) return;
  for (const dupId of summary.detached) {
    try {
      await updatePin(dupId, { parentId: null });
    } catch (err) {
      log.warn(`Prod rethread detach failed for pin ${dupId}:`, (err as Error).message);
    }
  }
  for (const { childId, to } of summary.reparented) {
    try {
      await updatePin(childId, { parentId: to });
    } catch (err) {
      log.warn(`Prod rethread reparent failed for pin ${childId}:`, (err as Error).message);
    }
  }
  if (summary.adoptedParentId != null) {
    try {
      await updatePin(summary.canonicalId, { parentId: summary.adoptedParentId });
    } catch (err) {
      log.warn(`Prod rethread adopt parent failed for pin ${summary.canonicalId}:`, (err as Error).message);
    }
  }
}

// Given a pin id (or two pin ids), checks its confirmed duplicate group for
// thread conflicts: a duplicate pin must never answer another pin in its
// group, and child pins should answer the canonical pin, not a duplicate.
export async function rethreadDuplicateGroup(
  pinId: number,
  otherPinId?: number,
  { apply = true }: { apply?: boolean } = {},
): Promise<DuplicateRethreadSummary | null> {
  const group = await PinDuplicate.group(pinId);
  if (otherPinId && !group.includes(otherPinId)) {
    group.push(otherPinId);
  }
  if (group.length <= 1) return null;

  const groupSet = new Set(group);

  // 1. Load all pins in the duplicate group
  const rows = await db.query<GroupPinRow>(
    `SELECT p."id", p."parentId", p."title",
       (SELECT count(*)::int FROM "Favorite" f WHERE f."pinId" = p.id) AS "favoriteCount",
       (SELECT count(*)::int FROM "PinView" v WHERE v."pinId" = p.id) AS "viewCount",
       (SELECT count(*)::int FROM "Like" l WHERE l."pinId" = p.id) AS "likeCount",
       p."utcCreatedDateTime", u."userName" AS "author"
     FROM "Pin" p
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE p."id" = ANY($1::int[]) AND p."utcDeletedDateTime" IS NULL`,
    [group],
  );
  if (!rows.length) return null;

  // 2. Load all children answering any pin in the group
  const children = await db.query<{ id: number; parentId: number }>(
    `SELECT "id", "parentId"
     FROM "Pin"
     WHERE "parentId" = ANY($1::int[]) AND "utcDeletedDateTime" IS NULL`,
    [group],
  );

  // Check if any pin has parentId set or any child exists
  const hasParent = rows.some((r) => r.parentId != null);
  if (!hasParent && !children.length) {
    return null;
  }

  // 3. Choose the canonical pin
  // Rank pins:
  // - Prefer pins with parentId outside group (+1000)
  // - Prefer pins with children outside group (+100 per child)
  // - compareDuplicateRank
  const childCounts = new Map<number, number>();
  for (const c of children) {
    if (!groupSet.has(c.id)) {
      childCounts.set(c.parentId, (childCounts.get(c.parentId) ?? 0) + 1);
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const aExtParent = a.parentId != null && !groupSet.has(a.parentId) ? 1 : 0;
    const bExtParent = b.parentId != null && !groupSet.has(b.parentId) ? 1 : 0;
    if (bExtParent !== aExtParent) return bExtParent - aExtParent;

    const aExtChildren = childCounts.get(a.id) ?? 0;
    const bExtChildren = childCounts.get(b.id) ?? 0;
    if (bExtChildren !== aExtChildren) return bExtChildren - aExtChildren;

    return compareDuplicateRank(
      { ...a, favoriteCount: a.favoriteCount ?? undefined },
      { ...b, favoriteCount: b.favoriteCount ?? undefined },
    );
  });

  const canonical = sorted[0];
  const duplicates = sorted.slice(1);

  const detached: number[] = [];
  const reparented: { childId: number; from: number; to: number }[] = [];
  let adoptedParentId: number | null = null;

  // If canonical has no parent, but a duplicate had a valid parent outside the group:
  if (canonical.parentId == null) {
    const donor = duplicates.find((d) => d.parentId != null && !groupSet.has(d.parentId));
    if (donor?.parentId != null) {
      adoptedParentId = donor.parentId;
      canonical.parentId = donor.parentId;
      if (apply) {
        await setParent(canonical.id, donor.parentId);
      }
    }
  } else if (canonical.parentId != null && groupSet.has(canonical.parentId)) {
    // Canonical was pointing to one of its duplicates! Clear it.
    detached.push(canonical.id);
    if (apply) {
      await db.query(`UPDATE "Pin" SET "parentId" = NULL WHERE "id" = $1`, [canonical.id]);
    }
    canonical.parentId = null;
  }

  // Detach all duplicate pins and reparent their children
  for (const dup of duplicates) {
    if (dup.parentId != null) {
      detached.push(dup.id);
      if (apply) {
        await db.query(`UPDATE "Pin" SET "parentId" = NULL WHERE "id" = $1`, [dup.id]);
        invalidatePin(dup.id);
      }
    }

    const dupChildren = children.filter((c) => c.parentId === dup.id);
    for (const child of dupChildren) {
      if (groupSet.has(child.id)) {
        // Child is also in duplicate group: clear its parent
        if (apply) {
          await db.query(`UPDATE "Pin" SET "parentId" = NULL WHERE "id" = $1`, [child.id]);
          invalidatePin(child.id);
        }
      } else {
        // Reparent child to canonical
        reparented.push({ childId: child.id, from: dup.id, to: canonical.id });
        if (apply) {
          await setParent(child.id, canonical.id);
          invalidatePin(child.id);
        }
      }
    }
  }

  if (apply) {
    invalidatePin(canonical.id);
    for (const id of group) invalidatePin(id);
  }

  if (!detached.length && !reparented.length && adoptedParentId == null) {
    return null;
  }

  const summary: DuplicateRethreadSummary = {
    canonicalId: canonical.id,
    detached,
    reparented,
    adoptedParentId,
  };

  if (apply) {
    await syncProdRethread(summary);
  }

  return summary;
}

// Scans all confirmed duplicate pairs/groups in the database and rethreads any
// with thread conflicts so duplicate pins do not show up on threads.
export async function rethreadAllDuplicateGroups({ apply = true }: { apply?: boolean } = {}): Promise<DuplicateRethreadSummary[]> {
  const roots = await db.query<{ rootId: number }>(
    `SELECT DISTINCT LEAST(d."pinId", d."otherPinId") AS "rootId"
     FROM "PinDuplicate" d
     JOIN "Pin" a ON a.id = d."pinId" AND a."utcDeletedDateTime" IS NULL
     JOIN "Pin" b ON b.id = d."otherPinId" AND b."utcDeletedDateTime" IS NULL
     WHERE d.status = 'confirmed'
       AND (
         a."parentId" IS NOT NULL
         OR b."parentId" IS NOT NULL
         OR EXISTS (SELECT 1 FROM "Pin" c WHERE c."parentId" IN (a.id, b.id) AND c."utcDeletedDateTime" IS NULL)
       )`,
  );

  const seen = new Set<number>();
  const summaries: DuplicateRethreadSummary[] = [];

  for (const { rootId } of roots) {
    if (seen.has(rootId)) continue;
    const group = await PinDuplicate.group(rootId);
    group.forEach((id) => seen.add(id));

    const result = await rethreadDuplicateGroup(rootId, undefined, { apply });
    if (result) {
      summaries.push(result);
    }
  }

  return summaries;
}
