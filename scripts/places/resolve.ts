// Matches pins that are about somewhere you can walk into to their Google
// place id and Yelp business alias, so the pin page can show that place's
// reviews, how busy it is and a way to book (PinPlace, 0059).
//
//   npm run places:resolve                        list what would be matched
//   npm run places:resolve -- --apply             save the matches
//   npm run places:resolve -- --ids 2455,2458 --apply
//   npm run places:resolve -- --category "Food & Beverage"
//
// READ THE DRY RUN. It prints the pin's title and address beside the name and
// address each source matched, because that is the only way to catch a chain
// resolving to the wrong branch - the trap that made the restaurant batch's
// addresses wrong in the first place (see never-type-place-labels). A row
// whose matched address is in another city is a miss, not a match.
//
// A row that a person has already fixed by hand (resolvedBy = 'hand') is
// never overwritten; the model's upsert refuses it.
//
// Needs GOOGLE_PLACES_API_KEY and/or YELP_API_KEY: this is the *matching*
// step, and both search endpoints are keyed. Reading a rating afterwards is
// not - `npm run places:refresh` scrapes that off the Maps page - so with no
// key at all, resolve a place id by hand (the Maps search page hands one out
// keylessly, see docs/okf/scraping/sources.md) and let refresh do the rest.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import config from '@/server/config';
import PinPlace from '@/server/model/pinPlace';
import { findGooglePlaceId, findYelpBusinessId } from '@/server/places';
import { findGooglePlaceIdKeyless } from '@/server/placeScrape';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Only pins tagged with this category. Restaurants are the vertical this
    // was built for; bars, hotels and venues work the same way.
    category: { type: 'string', default: 'Food & Beverage' },
    limit: { type: 'string', default: '200' },
    // Between lookups: both APIs rate-limit, and this is not urgent work.
    pause: { type: 'string', default: '400' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Candidate = {
  id: number;
  title: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  company: string | null;
  googlePlaceId: string | null;
  yelpBusinessId: string | null;
  resolvedBy: string | null;
};

// The name to search for.
//
// **The title comes first, not the company.** The company on a restaurant pin
// is often the operator or the group - "Daniel Humm Hospitality" for Eleven
// Madison Park, "Chubby Group" for Mikiya Wagyu Shabu House - and searching
// that finds a holding company's office or nothing at all. The title starts
// with the restaurant's own name, so it is cut at the first event verb and
// that is what gets searched. The company is only the fallback for a title
// that begins some other way.
export function searchName(pin: Pick<Candidate, 'title' | 'company'>): string {
  const cut = pin.title.split(
    /\s+(?:reopens|reopened|reopening|opens|opened|opening|closes|closed|closing|launches|launched|debuts|debuted|arrives|arrived|relaunches|unveils|serves|served|begins|returns|takes over|moves|adds|earns|wins|loses|drops|becomes)\b/i,
  )[0];
  const name = cut.replace(/[,:–—-]\s*$/, '').trim();
  // A cut that ate the whole title found no verb, so it is not a name.
  const fromTitle = name && name.toLowerCase() !== pin.title.toLowerCase() ? name : '';
  const company = (pin.company || '').trim();
  if (!company) {
    return fromTitle || name;
  }
  // Which of the two names the venue actually is, decided by whether the
  // company appears **in the title**:
  //
  //   "Wolfgang Puck Opens the First Spago..."  company "Spago" IS in the
  //     title, so the company is the venue and the title merely opens with the
  //     chef. Cutting at the verb gave "Wolfgang Puck", which resolved to CUT
  //     Beverly Hills - another of his restaurants.
  //   "Mikiya Wagyu Shabu House Opens on Convoy Street"  company "Chubby
  //     Group" is NOT in the title, so the company is the operator and the
  //     title holds the venue.
  //
  // Checking agreement between the two names instead looks equivalent and is
  // not: it sends the Mikiya case back to the holding company.
  const inTitle = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(pin.title);
  return inTitle || !fromTitle ? company : fromTitle;
}

// Google's match for this pin: through the Places API when a key is set,
// otherwise through the keyless Maps search route. The keyless one takes a
// text query rather than a coordinate bias, so the pin's town is appended -
// without it "Maido" is a common word and the first hit is anyone's guess.
async function googleFor(name: string, pin: Candidate) {
  if (config.googlePlaces.apiKey) {
    return findGooglePlaceId(name, pin.latitude, pin.longitude);
  }
  const where = townOf(pin.address);
  const hit = await findGooglePlaceIdKeyless(where ? `${name} ${where}` : name);
  return hit && { placeId: hit.placeId, name: hit.name ?? name, address: hit.address };
}

// The town and country out of a pin's address label, which is what narrows a
// text search. "2184 Creek Street, Yountville, Napa County, California 94599,
// United States" -> "Yountville, United States".
export function townOf(address: string | null): string | null {
  if (!address) {
    return null;
  }
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  const town = parts.length > 2 ? parts[1] : parts[0];
  const country = parts[parts.length - 1];
  return town === country ? town : `${town}, ${country}`;
}

async function run() {
  const ids = flags.ids?.split(',').map((id) => Number(id.trim())).filter(Boolean);
  const rows = (await db.query<Candidate>(
    `
    SELECT "p"."id",
           "p"."title",
           "p"."address",
           ST_Y("p"."location"::geometry) AS "latitude",
           ST_X("p"."location"::geometry) AS "longitude",
           "c"."name"                     AS "company",
           "pp"."googlePlaceId",
           "pp"."yelpBusinessId",
           "pp"."resolvedBy"
    FROM "Pin" AS "p"
      LEFT JOIN "Company"  AS "c"  ON "c"."id" = "p"."companyId"
      LEFT JOIN "PinPlace" AS "pp" ON "pp"."pinId" = "p"."id"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND "p"."location" IS NOT NULL
      AND ($1::int[] IS NULL OR "p"."id" = ANY($1))
      AND ($1::int[] IS NOT NULL OR EXISTS (
            SELECT 1 FROM "PinTag" AS "t"
            WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category' AND "t"."name" = $2
          ))
    ORDER BY "p"."id"
    LIMIT $3`,
    [ids?.length ? ids : null, flags.category, Number(flags.limit)],
  )) as Candidate[];

  console.log(`${rows.length} pin(s) to look at`);
  console.log(
    `Google: ${config.googlePlaces.apiKey ? 'API key' : 'keyless (Maps search)'}   ` +
      `Yelp: ${config.yelp.apiKey ? 'API key' : 'no key - skipped'}   ${flags.apply ? 'APPLYING' : 'dry run'}\n`,
  );

  let matched = 0;
  let skipped = 0;

  for (const pin of rows) {
    if (pin.resolvedBy === 'hand') {
      console.log(`${pin.id} "${pin.title}" - resolved by hand, left alone`);
      skipped++;
      continue;
    }
    const name = searchName(pin);
    if (!name) {
      console.log(`${pin.id} "${pin.title}" - no name to search for`);
      skipped++;
      continue;
    }

    const [google, yelp] = await Promise.all([
      googleFor(name, pin).catch((err) => {
        console.log(`  google failed: ${err.message}`);
        return null;
      }),
      findYelpBusinessId(name, pin.latitude, pin.longitude).catch((err) => {
        console.log(`  yelp failed: ${err.message}`);
        return null;
      }),
    ]);

    if (!google && !yelp) {
      console.log(`${pin.id} "${pin.title}" as "${name}" - no match`);
      skipped++;
      await sleep(Number(flags.pause));
      continue;
    }

    // The pin's own address beside each match's, so a wrong branch is
    // visible before it is saved.
    console.log(`${pin.id} "${pin.title}" as "${name}"`);
    console.log(`     pin: ${pin.address || '(no address)'}`);
    if (google) console.log(`  google: ${google.name} - ${google.address || '(none)'}  [${google.placeId}]`);
    if (yelp) console.log(`    yelp: ${yelp.name} - ${yelp.address || '(none)'}  [${yelp.businessId}]`);

    if (flags.apply) {
      const place = new PinPlace({
        pinId: pin.id,
        // Keep whichever half already existed when this run only found the
        // other one, so a Yelp-only run does not drop a Google id.
        googlePlaceId: google?.placeId || pin.googlePlaceId || null,
        yelpBusinessId: yelp?.businessId || pin.yelpBusinessId || null,
        resolvedBy: 'auto',
      });
      await place.save();
    }
    matched++;
    await sleep(Number(flags.pause));
  }

  console.log(`\n${matched} matched, ${skipped} skipped`);
  if (matched && !flags.apply) {
    console.log('Dry run - nothing saved. Check the addresses above, then run again with --apply.');
  } else if (matched) {
    console.log('Run `npm run backup:data` to keep this in the seed data.');
  }
}

run()
  .catch((err) => {
    console.log('places resolve err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
