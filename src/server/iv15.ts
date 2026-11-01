import 'server-only';
import type { Iv15Point } from '@/lib/iv15Map';
import data from './data/personIv15.json';

// The analyst-published P/IV15 points on file for a person, or none.
export function iv15PointsFor(name: string): Iv15Point[] {
  return (data.people.find(p => p.name === name)?.points ?? []) as Iv15Point[];
}
