import { describe, expect, it } from 'vitest';
import { stackDuplicates } from './duplicates';
import { canJoinTimelineDay, timelineDayCandidates } from './restaurantTimeline';

const restaurant = { id: 1, utcStartDateTime: '2026-11-01T00:00:00Z', allDay: true, tags: [{ name: 'Restaurant', kind: 'topic' as const, source: 'user' as const }] };
const event = { id: 2, utcStartDateTime: '2026-11-01T23:00:00Z', allDay: false, tags: [] };

describe('restaurant fallback before duplicate grouping', () => {
  it('keeps the event even if a restaurant would win its duplicate stack', () => {
    const group = [1, 2];
    const pins = [{ ...restaurant, duplicateGroup: group, viewCount: 1000 }, { ...event, duplicateGroup: group }];
    expect(stackDuplicates(pins)[0].pin.id).toBe(1);
    const stacks = stackDuplicates(timelineDayCandidates(pins));
    expect(stacks.map((stack) => stack.pin.id)).toEqual([2]);
    expect(stacks[0].hidden).toEqual([]);
  });
});

describe('live events on restaurant fallback dates', () => {
  it('admits a saved or edited event later on the last loaded date', () => {
    for (const type of ['pin:save', 'pin:update']) {
      expect(canJoinTimelineDay([restaurant], event, type, 'UTC')).toBe(true);
    }
  });

  it('admits an event earlier on the first loaded date', () => {
    expect(canJoinTimelineDay([event], { ...event, utcStartDateTime: '2026-11-01T01:00:00Z' }, 'pin:update', 'UTC')).toBe(true);
  });

  it('uses local days for timed events and UTC dates for all-day pins', () => {
    const nearMidnight = { ...event, utcStartDateTime: '2026-11-01T06:30:00Z' };
    expect(canJoinTimelineDay([restaurant], nearMidnight, 'pin:update', 'UTC')).toBe(true);
    expect(canJoinTimelineDay([restaurant], nearMidnight, 'pin:update', 'America/Los_Angeles')).toBe(false);
    expect(canJoinTimelineDay([restaurant], { ...nearMidnight, allDay: true }, 'pin:update', 'America/Los_Angeles')).toBe(true);
  });

  it('requires server selection for restaurants and ignores engagement broadcasts', () => {
    expect(canJoinTimelineDay([restaurant], restaurant, 'pin:save', 'UTC')).toBe(false);
    for (const type of ['pin:favorite', 'pin:like', 'pin:remove']) {
      expect(canJoinTimelineDay([restaurant], event, type, 'UTC')).toBe(false);
    }
    expect(canJoinTimelineDay([], event, 'pin:save', 'UTC')).toBe(false);
  });

  it('does not add an event outside the loaded dates', () => {
    expect(canJoinTimelineDay([restaurant], { ...event, utcStartDateTime: '2026-11-02T00:00:00Z' }, 'pin:save', 'UTC')).toBe(false);
  });

  it('does not let an old or undated edit bypass the posting window', () => {
    const since = new Date('2026-10-15T00:00:00Z');
    expect(canJoinTimelineDay([restaurant], event, 'pin:update', 'UTC', since)).toBe(false);
    expect(canJoinTimelineDay([restaurant], { ...event, utcCreatedDateTime: '2026-10-14T00:00:00Z' }, 'pin:update', 'UTC', since)).toBe(false);
    expect(canJoinTimelineDay([restaurant], { ...event, utcCreatedDateTime: '2026-10-15T00:00:00Z' }, 'pin:update', 'UTC', since)).toBe(true);
  });
});
