// What a pin's start and end are called, by kind: a build starts at groundbreaking and ends at completion; a
// chip pin with a production timeline starts when announced and ends at commercialization; any other pin with a
// timeline keeps Start/End and calls the bar's end the final milestone. Other pins keep Start/End.
export type PinDateKind = 'construction' | 'completed' | 'hardware' | 'program';

export const DATE_KIND_KEYS = {
  construction: { start: 'dateRanges.groundbreaking', end: 'dateRanges.completion', ends: 'countdown.completion' },
  // A finished build whose only date is when it came online: that one date is the completion, not a groundbreaking.
  completed: { start: 'dateRanges.completion', end: 'dateRanges.completion', ends: 'countdown.completion' },
  hardware: { start: 'dateRanges.announced', end: 'dateRanges.commercialization', ends: 'countdown.commercialization' },
  // Any other staged path (a drug, a spacecraft, a vehicle): the pin's own dates keep Start/End; only the bar's end is named.
  program: { start: 'dateRanges.start', end: 'dateRanges.end', ends: 'countdown.finalMilestone' },
} as const;

export const BUILD_STATUSES = ['Proposed', 'In Progress', 'Completed', 'Withdrawn'];

const CHIP_CATEGORIES = ['Semiconductors', 'Computing'];

export const pinDateKind = (tags: { name: string }[] | undefined, hasTimeline: boolean, categories?: string[], hasEnd = true): PinDateKind | undefined =>
  tags?.some((tag) => tag.name === 'Completed') && !hasEnd
    ? 'completed'
    : tags?.some((tag) => BUILD_STATUSES.includes(tag.name))
      ? 'construction'
      : hasTimeline
        ? categories?.some((c) => CHIP_CATEGORIES.includes(c)) ? 'hardware' : 'program'
        : undefined;
