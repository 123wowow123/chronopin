// Retired after its fixed IDs overwrote unrelated data-center pins 15801–15803.
// Do not restore this seed: its dates, prices, review quotations and stock
// photos were not verified. Maintain hotels through authenticated pin/hotel
// APIs, find existing records by source URL, and let the database allocate IDs.
// See docs/okf/scraping/resort-collision-repair-2026-10-28.md.
console.error('Retired unsafe resort seed. Use authenticated management APIs and source-URL identity; no database writes were made.');
process.exitCode = 1;
export {};
