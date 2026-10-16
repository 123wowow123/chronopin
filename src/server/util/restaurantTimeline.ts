import { RESTAURANT_TIMELINE_TAGS } from '@/lib/restaurantTimeline';

const restaurant = (alias: string) => `EXISTS (SELECT 1 FROM "PinTag" AS "restaurantTag" WHERE "restaurantTag"."pinId" = "${alias}"."id" AND "restaurantTag"."name" = ANY(ARRAY[${RESTAURANT_TIMELINE_TAGS.map((name) => `'${name}'`).join(', ')}]::citext[]))`;
const day = (alias: string, zone: string) => `(CASE WHEN "${alias}"."allDay" THEN "${alias}"."utcStartDateTime" AT TIME ZONE 'UTC' ELSE "${alias}"."utcStartDateTime" AT TIME ZONE ${zone}::text END)::date`;

// Before LIMIT/cursors: a partial page must not mistake a busy day for an
// empty one. The other pin must pass the same posting/confidence/place
// filters. The broad instant bounds keep this a date-index range lookup;
// the exact day comparison handles all-day dates and local midnight/DST.
export function restaurantTimelineClause(alias: string, zone: string, eligibleOther: string): string {
  return `(NOT ${restaurant(alias)} OR NOT EXISTS (
    SELECT 1 FROM "Pin" AS "timelineOther"
    WHERE "timelineOther"."utcDeletedDateTime" IS NULL
      AND "timelineOther"."utcStartDateTime" >= "${alias}"."utcStartDateTime" - interval '2 days'
      AND "timelineOther"."utcStartDateTime" < "${alias}"."utcStartDateTime" + interval '2 days'
      AND ${day('timelineOther', zone)} = ${day(alias, zone)}
      AND NOT ${restaurant('timelineOther')}
      AND ${eligibleOther}
  ))`;
}
