# Restaurant pins on the timeline

Restaurant venue pins have 0.1 times the normal sampling weight. On the main timeline they are eligible only when the viewer’s calendar date has no other eligible event pins. Empty card slots on a date with news do not admit restaurants. Date markers and holidays are not event pins and do not block the fallback.

The database applies this rule before pagination and day counts. It checks the whole date, including pins outside the current cursor/page, using the same confidence, posting-window and proximity filters. All-day pins retain their UTC calendar date; timed pins use the viewer’s time zone. Cached initial pages include that zone in their cache key, and the timeline remounts when the server-rendered zone changes.

The client applies the same candidate rule before sampling, including days with only one or two cards. A directly focused pin is kept, and explicit search/watch views retain their pins. Restaurant guides and native pin details remain available. Live broadcasts update existing fallback cards in place; newly added, newly tagged or moved restaurant cards wait for server selection so a partially loaded day cannot admit them incorrectly. This change requires a normal application deployment; none was performed while implementing it.

Validation: full TypeScript check, 44 focused unit tests, targeted ESLint, eight PostgreSQL fixture assertions and local initial/forward/backward/count queries in UTC, Los Angeles and Tokyo. The fixture runner is `npx tsx scripts/restaurants/checkTimelineFallback.ts`; it refuses remote database URLs and rolls back its temporary tables. Local `/api/main` returns HTTP 200 with cursor links in each tested zone.

## Second review

Venue eligibility is now decided before duplicate stacking, so a more popular restaurant cannot conceal a non-restaurant event in the same duplicate group. Live saved or edited events can join any already loaded calendar date, including the portion before its first card or after its last card, and displace restaurant fallback cards. Their creation dates must pass the active posting window; engagement broadcasts cannot insert cards. The day-range comparison handles historical dates with the shared calendar comparator.

Validation after this review: 55 focused unit tests, full TypeScript check, targeted ESLint and the eight rolled-back PostgreSQL fixtures passed. No production deployment.
