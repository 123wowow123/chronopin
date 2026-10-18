import * as db from '../db';
import type { CampaignCycle } from '@/lib/campaigns';

const F = (c: string) => `"${c}"::float8 AS "${c}"`;

// Campaign finance per person and cycle (0189), with the race's other
// candidates and the PACs that gave most.
export default class PersonCampaign {
  static async forPerson(personId: number): Promise<CampaignCycle[]> {
    const [cycles, rivals, pacs] = await Promise.all([
      db.query(
        `SELECT "cycle", "fecCandidateId", "office", "state", "district", "status", "party", ${['receipts', 'disbursements', 'cashOnHand', 'individual', 'pac', 'partyCommittee', 'selfFunded', 'debts', 'votePct'].map(F).join(', ')},
                "coverageEnd"::text AS "coverageEnd", "sourceUrl"
         FROM "PersonCampaign" WHERE "personId" = $1 ORDER BY "cycle" DESC`,
        [personId],
      ),
      db.query(
        `SELECT "cycle", "fecCandidateId", "name", "party", "status", ${['receipts', 'disbursements', 'cashOnHand', 'votePct'].map(F).join(', ')}, "general", "sourceUrl"
         FROM "PersonCampaignRival" WHERE "personId" = $1 ORDER BY "votePct" DESC NULLS LAST, "receipts" DESC NULLS LAST`,
        [personId],
      ),
      db.query(`SELECT "cycle", "committeeId", "name", "amount"::float8 AS "amount", "count", "sourceUrl" FROM "PersonCampaignPac" WHERE "personId" = $1 ORDER BY "amount" DESC`, [personId]),
    ]);
    return cycles.map((c) => ({
      ...(c as object),
      rivals: rivals.filter((r) => r.cycle === c.cycle).map(({ cycle: _c, ...r }) => r),
      pacs: pacs.filter((r) => r.cycle === c.cycle).map(({ cycle: _c, ...r }) => r),
    })) as CampaignCycle[];
  }

  // Replaces the person's rows for the cycles given (others are kept).
  static async replace(personId: number, cycles: CampaignCycle[]) {
    await db.transaction(async (q) => {
      for (const c of cycles) {
        await q(`DELETE FROM "PersonCampaign" WHERE "personId" = $1 AND "cycle" = $2`, [personId, c.cycle]);
        await q(
          `INSERT INTO "PersonCampaign" ("personId", "cycle", "fecCandidateId", "office", "state", "district", "status", "party", "receipts", "disbursements", "cashOnHand", "individual", "pac", "partyCommittee", "selfFunded", "debts", "coverageEnd", "votePct", "sourceUrl")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [personId, c.cycle, c.fecCandidateId, c.office, c.state, c.district, c.status, c.party, c.receipts, c.disbursements, c.cashOnHand, c.individual, c.pac, c.partyCommittee, c.selfFunded, c.debts, c.coverageEnd, c.votePct, c.sourceUrl],
        );
        for (const r of c.rivals) {
          await q(
            `INSERT INTO "PersonCampaignRival" ("personId", "cycle", "fecCandidateId", "name", "party", "status", "receipts", "disbursements", "cashOnHand", "votePct", "general", "sourceUrl")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
            [personId, c.cycle, r.fecCandidateId, r.name.slice(0, 120), r.party, r.status, r.receipts, r.disbursements, r.cashOnHand, r.votePct, r.general, r.sourceUrl],
          );
        }
        for (const p of c.pacs) {
          await q(
            `INSERT INTO "PersonCampaignPac" ("personId", "cycle", "committeeId", "name", "amount", "count", "sourceUrl") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [personId, c.cycle, p.committeeId, p.name.slice(0, 200), p.amount, p.count, p.sourceUrl],
          );
        }
      }
    });
  }
}
