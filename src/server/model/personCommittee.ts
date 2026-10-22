import * as db from '../db';
import type { Seat } from '@/lib/conflicts';

// A sitting member's committee and subcommittee seats (0204), from congress-legislators.
export default class PersonCommittee {
  // Full committees first, each followed by the member's subcommittees of it.
  static forPerson(personId: number): Promise<Seat[]> {
    return db.query<Seat>(
      `SELECT "committeeId", "parentId", "name", "chamber", "title", "rank", "sectors" FROM "PersonCommittee"
       WHERE "personId" = $1 ORDER BY COALESCE("parentId", "committeeId"), "parentId" NULLS FIRST, "committeeId"`,
      [personId],
    );
  }
}
