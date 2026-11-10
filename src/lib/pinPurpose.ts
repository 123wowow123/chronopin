// Why a project exists (PinPurpose, 0255): the problem it solves, how, and for whom.
export type PinPurposeJson = {
  problem: string;
  solution: string | null;
  beneficiaries: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};
