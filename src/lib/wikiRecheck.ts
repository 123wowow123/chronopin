// When the nightly job reads pins' links again to see whether their wikis are
// out of date (src/server/services/wikiRecheckJob.ts,
// docs/okf/playbooks/lint-the-wikis.md). Two separate options, either or
// both on; an admin setting, this is only its default:
//
//   viewed  someone opening a pin's page (a PinView - a click into the pin,
//           not a card seen on the timeline, which is a PinImpression)
//           schedules its links for that midnight, however old they are:
//           the fetches go where readers are.
//   days    links last read this many days ago are read again; null never.
//
// Every read counts as the link's last read, so a read a view brought on
// also moves its next N-day read out to N days after it.
export type WikiRecheckSetting = {
  days: number | null;
  viewed: boolean;
};

export const DEFAULT_WIKI_RECHECK: WikiRecheckSetting = { days: null, viewed: true };

export const MAX_RECHECK_DAYS = 3650;

// Whether the nightly job has anything to do.
export const recheckOff = (setting: WikiRecheckSetting) => !setting.viewed && setting.days == null;

// A stored or submitted value as a setting, or the problem with it.
export function parseWikiRecheck(value: unknown): { setting: WikiRecheckSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { days, viewed }' };
  }
  // onlyViewed is what a row saved before the options were separated calls it.
  const raw = value as Record<string, unknown>;
  const { days } = raw;
  const viewed = raw.viewed ?? raw.onlyViewed ?? DEFAULT_WIKI_RECHECK.viewed;
  if (days !== null && !(Number.isInteger(days) && (days as number) >= 1 && (days as number) <= MAX_RECHECK_DAYS)) {
    return { problem: `days must be null (never) or a whole number from 1 to ${MAX_RECHECK_DAYS}` };
  }
  if (typeof viewed !== 'boolean') {
    return { problem: 'viewed must be true or false' };
  }
  return { setting: { days: days as number | null, viewed } };
}
