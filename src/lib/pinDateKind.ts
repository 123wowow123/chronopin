// What a pin's start and end are called, by kind: a build starts at groundbreaking and ends at completion; a
// hardware pin with a production timeline starts when announced and ends at commercialization. Other pins keep
// Start/End.
export type PinDateKind = 'construction' | 'hardware';

export const DATE_KIND_KEYS = {
  construction: { start: 'dateRanges.groundbreaking', end: 'dateRanges.completion', ends: 'countdown.completion' },
  hardware: { start: 'dateRanges.announced', end: 'dateRanges.commercialization', ends: 'countdown.commercialization' },
} as const;

export const BUILD_STATUSES = ['Proposed', 'In Progress', 'Completed', 'Withdrawn'];

export const pinDateKind = (tags: { name: string }[] | undefined, hasTimeline: boolean): PinDateKind | undefined =>
  tags?.some((tag) => BUILD_STATUSES.includes(tag.name)) ? 'construction' : hasTimeline ? 'hardware' : undefined;
