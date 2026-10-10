// The contenders an awards pin lists (PinCandidate, 0146): the Grammys' "big
// four", each candidate linked to the pin for its work.

export const CANDIDATE_CATEGORIES = ['record', 'album', 'song', 'artist'] as const;
export type CandidateCategory = (typeof CANDIDATE_CATEGORIES)[number];

export const isCandidateCategory = (value: unknown): value is CandidateCategory =>
  typeof value === 'string' && (CANDIDATE_CATEGORIES as readonly string[]).includes(value);

export type PinCandidateJson = {
  category: CandidateCategory;
  rank: number;
  name: string;
  artist: string | null;
  // The pin for the candidate's work, already shaped for pinPath().
  work: { id: number; title: string } | null;
  odds: number | null;
  oddsLabel: 'nominee' | 'winner' | null;
  sourceUrl: string | null;
  asOf: string;
};

// A candidate row as it is backed up and restored.
export type StoredPinCandidate = Omit<PinCandidateJson, 'work'> & { pinId: number; workPinId: number | null };
