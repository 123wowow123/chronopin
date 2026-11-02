// Whether a thread forks at or below a pin: the pin, or a pin under it, has
// more than one main-line response in the thread, or a response marked as a
// subthread (the same rows the Thread pane nests, where a branch point is what
// steps a row in). A plain chain, however long, has none.
type ThreadPin = { id: number; parentId?: number | null; subthread?: boolean };

export function branchesUnder(pins: ThreadPin[], id: number): boolean {
  const responses = new Map<number, ThreadPin[]>();
  for (const pin of pins) {
    if (pin.parentId == null) continue;
    responses.set(pin.parentId, [...(responses.get(pin.parentId) ?? []), pin]);
  }
  const seen = new Set<number>();
  const stack = [id];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    const below = responses.get(next) ?? [];
    if (below.some((pin) => pin.subthread) || below.filter((pin) => !pin.subthread).length > 1) return true;
    stack.push(...below.map((pin) => pin.id));
  }
  return false;
}

// Each row's number in the Thread pane, given the rows in reading order (a
// parent before its responses). A chain counts up; a branch - the responses to
// a pin that has more than one - and a subthread start again at 1, so a side
// line is its own short list and the count does not run on from the pin it
// forks from. A lone main-line reply beside a subthread keeps counting up.
export function threadNumbers(pins: ThreadPin[]): Map<number, number> {
  const inThread = new Set(pins.map((pin) => pin.id));
  const mainLine = new Map<number, number>();
  for (const pin of pins) {
    if (pin.parentId != null && inThread.has(pin.parentId) && !pin.subthread) mainLine.set(pin.parentId, (mainLine.get(pin.parentId) ?? 0) + 1);
  }
  const numbers = new Map<number, number>();
  for (const pin of pins) {
    const parent = pin.parentId;
    const parentNumber = parent != null ? numbers.get(parent) : undefined;
    numbers.set(pin.id, parentNumber === undefined || pin.subthread || (mainLine.get(parent!) ?? 0) > 1 ? 1 : parentNumber + 1);
  }
  return numbers;
}
