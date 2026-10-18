/**
 * Where a pin's links disagree about its event: one Claude call over the
 * wikis of every link the pin cites (the same input composeSummary reads),
 * for okf:lint to flag for an admin. Nothing is changed on the pin.
 */

import { getClient } from '.';
import { composeInput, structured, type ComposeLink, type ComposePin } from './wiki';

export const CONTRADICTION_PROMPT = `You check an event pin on a timeline for contradictions between the links it cites. You are given the pin (title, description, dates) and a wiki already written about each link, labelled [S] for the pin's source and [1], [2]... for its references.

List only real disagreements of fact about this pin's event: two or more links stating incompatible dates, times, places, figures (cost, capacity, counts), names (who did it, what it is called) or status (happened / cancelled / delayed). Also list where a link contradicts the pin's own title, description or dates, citing it as [P].

Not contradictions: one link giving more detail than another, rounding or different units for the same figure, one instant in different time zones, a range that contains the other's value, or facts about other events a wiki also covers. A link that is simply older than a newer one that updates it (a date that has since moved) is a contradiction of severity "minor" whose note says which is newer.

severity is "major" when the pin's date, place or headline fact is in doubt, else "minor". claims gives each side: the label and what that link says, quoting its wording where the wiki has it. When nothing disagrees, return an empty list.`;

export const CONTRADICTION_SCHEMA = {
  type: 'object',
  properties: {
    contradictions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          severity: { type: 'string', enum: ['major', 'minor'] },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, says: { type: 'string' } },
              required: ['label', 'says'],
              additionalProperties: false,
            },
          },
          note: { type: ['string', 'null'] },
        },
        required: ['subject', 'severity', 'claims', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['contradictions'],
  additionalProperties: false,
};

export type Contradiction = {
  subject: string;
  severity: 'major' | 'minor';
  claims: { label: string; says: string }[];
  note: string | null;
};

// Only well-formed entries with two or more sides, their labels among those given.
export function cleanContradictions(found: unknown, labels: string[]): Contradiction[] {
  const known = new Set([...labels.map((l) => l.toUpperCase()), 'P']);
  const list = (found as { contradictions?: unknown })?.contradictions;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c): c is Contradiction => !!c && typeof c.subject === 'string' && Array.isArray(c.claims))
    .map((c) => ({
      subject: c.subject.trim().slice(0, 300),
      severity: c.severity === 'major' ? ('major' as const) : ('minor' as const),
      claims: c.claims
        .filter((claim) => claim && known.has(String(claim.label).replace(/[[\]]/g, '').toUpperCase()) && typeof claim.says === 'string')
        .map((claim) => ({ label: String(claim.label).replace(/[[\]]/g, '').toUpperCase(), says: claim.says.trim().slice(0, 600) })),
      note: typeof c.note === 'string' && c.note.trim() ? c.note.trim().slice(0, 600) : null,
    }))
    .filter((c) => c.subject && new Set(c.claims.map((claim) => claim.label)).size >= 2);
}

// null when there is no API key; throws (ServiceError for the API's side) on failure.
export async function findContradictions(pin: ComposePin, links: ComposeLink[]): Promise<Contradiction[] | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  const { data } = await structured<unknown>(anthropic, CONTRADICTION_PROMPT, CONTRADICTION_SCHEMA, composeInput(pin, links));
  return cleanContradictions(data, links.map((l) => l.label));
}
