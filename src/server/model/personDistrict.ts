// The seat a sitting member of Congress holds, as a map outline (PersonDistrict, 0231).

import * as db from '../db';
import type { PersonDistrictJson } from '@/lib/personDistrict';

export default class PersonDistrict {
  static async forPerson(personId: number): Promise<PersonDistrictJson | null> {
    const [row] = await db.query<PersonDistrictJson>(
      `SELECT "label", "geojson", "vintage", "source", "sourceUrl" FROM "PersonDistrict" WHERE "personId" = $1`,
      [personId],
    );
    return row ?? null;
  }
}
