// A word-level diff of two texts, for the pin page's Updates pane: what a
// rewrite removed and what it added, with the unchanged stretches between
// trimmed to a few words of context.

export type DiffSegment = { op: 'eq' | 'del' | 'ins'; text: string };

// Past this many words a side is too long for the quadratic match; the pane
// then shows the whole old text struck and the whole new one added.
const MAX_WORDS = 2500;
// Words of unchanged text kept either side of a change.
const CONTEXT = 8;

const tokens = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];

function push(out: DiffSegment[], op: DiffSegment['op'], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.op === op) last.text += text;
  else out.push({ op, text });
}

export function wordDiff(before: string, after: string): DiffSegment[] {
  const a = tokens(before);
  const b = tokens(after);
  const out: DiffSegment[] = [];
  // Strip what both ends share, so the match only runs over the middle.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  push(out, 'eq', a.slice(0, head).join(''));
  if (midA.length > MAX_WORDS || midB.length > MAX_WORDS) {
    push(out, 'del', midA.join(''));
    push(out, 'ins', midB.join(''));
  } else {
    // Longest common subsequence table, filled from the ends.
    const n = midA.length;
    const m = midB.length;
    const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] = midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        push(out, 'eq', midA[i]);
        i++;
        j++;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        push(out, 'del', midA[i++]);
      } else {
        push(out, 'ins', midB[j++]);
      }
    }
    while (i < n) push(out, 'del', midA[i++]);
    while (j < m) push(out, 'ins', midB[j++]);
  }
  push(out, 'eq', a.slice(a.length - tail).join(''));
  return joinChanges(out);
}

// A lone space between two changes belongs to both ("December 8" -> "January
// 6" is one change, not two words and a shared space): each run of changes
// becomes its removed text then its added text.
function joinChanges(segments: DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = [];
  let del = '';
  let ins = '';
  const flush = () => {
    push(out, 'del', del);
    push(out, 'ins', ins);
    del = ins = '';
  };
  segments.forEach((segment, i) => {
    const gap = segment.op === 'eq' && !segment.text.trim() && (del || ins) && segments[i + 1] && segments[i + 1].op !== 'eq';
    if (segment.op === 'del' || gap) del += segment.text;
    if (segment.op === 'ins' || gap) ins += segment.text;
    if (segment.op === 'eq' && !gap) {
      flush();
      push(out, 'eq', segment.text);
    }
  });
  flush();
  return out;
}

// The diff with each long unchanged stretch cut to CONTEXT words either side
// of a change, "…" where it was cut; an unchanged start or end keeps only its
// side next to a change.
export function diffWithContext(segments: DiffSegment[]): DiffSegment[] {
  return segments.map((segment, index) => {
    if (segment.op !== 'eq') return segment;
    const words = tokens(segment.text);
    const first = index === 0;
    const last = index === segments.length - 1;
    const keepHead = first ? 0 : CONTEXT * 2;
    const keepTail = last ? 0 : CONTEXT * 2;
    if (words.length <= keepHead + keepTail + 2) return segment;
    const head = words.slice(0, keepHead).join('');
    const tail = words.slice(words.length - keepTail).join('');
    return { op: 'eq', text: `${head}…${tail}` };
  });
}

// How many words a diff added and removed.
export function diffCounts(segments: DiffSegment[]): { added: number; removed: number } {
  const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
  let added = 0;
  let removed = 0;
  for (const s of segments) {
    if (s.op === 'ins') added += words(s.text);
    else if (s.op === 'del') removed += words(s.text);
  }
  return { added, removed };
}
