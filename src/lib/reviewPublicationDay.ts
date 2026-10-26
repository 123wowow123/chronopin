// Publisher markup occasionally emits 0001-01-01. A research candidate must
// be a real, nonfuture publication day, not merely a syntactically ISO string.
export function reviewPublicationDay(values: string[], today: string): string | null {
  const days = new Set<string>();
  for (const value of values) {
    const day = /^\d{4}-\d{2}-\d{2}(?=$|T|\s)/.exec(value)?.[0];
    if (!day || day < '1800-01-01' || day > today) continue;
    const parsed = new Date(`${day}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day) days.add(day);
  }
  return days.size === 1 ? [...days][0] : null;
}
