import 'server-only';
import data from '../data/elections.json';
import { electionSearchYear, summarize, type ElectionYear, type SearchedElection } from '@/lib/elections';

const years = (data as unknown as { years: ElectionYear[] }).years;

export const electionYears = () => years;
export const electionFor = (year: number) => years.find((y) => y.year === year) ?? null;

// The panel a search for "election" opens, or null when the text does not name one.
export function searchedElection(text: string): SearchedElection | null {
  const year = electionSearchYear(text, years.map((y) => y.year));
  const found = year == null ? null : electionFor(year);
  return found ? summarize(found) : null;
}
