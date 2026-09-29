// Text split into its sentences, for the blurbs and key points drawn from a
// page's or an article's prose. A full stop after an initial or an
// abbreviation - "C. S. Lewis", "Samuel L. Jackson", "U.S.", "Dr. Robotnik",
// "Sept. 18" - is not the end of a sentence: splitting there cut the film
// pins' Wikipedia leads off mid-name ("by C.").

// A piece ending in one of these has not ended its sentence. An initial is a
// single capital, alone or in a run ("J.R.R.", "U.S.").
const ABBREVIATION =
  /(?:^|[\s("“'])(?:[A-Z]\.)*(?:[A-Z]|Inc|Ltd|Co|Corp|Cos|Pte|Pty|Plc|Bros|St|Ste|Mt|Ft|Mr|Mrs|Ms|Dr|Prof|Gen|Lt|Col|Sgt|Capt|Gov|Sen|Rep|Rev|Hon|Jr|Sr|vs|etc|al|approx|est|no|Nos|No|Vol|vol|pp|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.$/;

const BREAK = /(?<=[.!?]["”’')\]]?)\s+(?=[A-Z0-9"“‘'(])/;

export function splitSentences(text: string): string[] {
  const pieces = text.replace(/\s+/g, ' ').trim().split(BREAK);
  return pieces
    .reduce<string[]>((all, piece) => {
      const last = all[all.length - 1];
      if (last && ABBREVIATION.test(last)) all[all.length - 1] = `${last} ${piece}`;
      else all.push(piece);
      return all;
    }, [])
    .filter(Boolean);
}

// The opening sentences of a text, as many whole ones as fit in `max`
// characters; a first sentence longer than that is cut at the last whole
// word and ellipsed. Rather than slicing prose mid-sentence.
export function leadSentences(text: string, max: number): string {
  let lead = '';
  for (const sentence of splitSentences(text)) {
    const next = lead ? `${lead} ${sentence}` : sentence;
    if (lead && next.length > max) break;
    lead = next;
  }
  if (lead.length <= max) return lead;
  const cut = lead.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`;
}
