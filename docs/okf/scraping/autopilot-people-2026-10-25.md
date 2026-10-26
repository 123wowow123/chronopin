# Autopilot people coverage — 2026-10-25

Applied to localhost and production through the authenticated People APIs:
54 new profiles and 18 existing profiles enriched, covering 72 people and
public individual creator identities. The directory now contains 1,328 people.
No deployment was needed.

## Image storage correction and Google Images follow-up

The initial image pass mistakenly used the local Azure storage emulator. Its
HTTP URLs were rejected by the People API, leaving the new profiles without
photos. The follow-up uploaded the 53 reviewed portraits and public creator
avatars to the actual `chronopin` Azure account, under
`https://chronopin.blob.core.windows.net/thumb/people/autopilot/`. Every public
file was downloaded, hash-checked and decoded before attaching its URL through
the authenticated People APIs in both environments. The replay now rejects
non-public image URLs before saving. The research catalog and People backup
carry the corrected public URLs and source credits.

Both environments now have photos or published creator avatars for 71 of the
72 people. The remaining person is Julian Baker. Google Images was searched
with his name, middle initial, Madrigal and Baker Brothers. Madrigal's official
board biography has no portrait, Forbes supplies a placeholder, and the
Bloomberg image result identifies his brother Felix. Unrelated namesakes and
an illustration were rejected. The Spiking article uses a Wall Street scene,
not a portrait. Julian's photo stays blank pending a verified photograph.

## Sources and scope

- [Requested landing page](https://www.joinautopilot.com/landing).
- [Official public strategy directory](https://start.joinautopilot.com/strategies).
- [Official structured catalog](https://start.joinautopilot.com/strategies/portfolios.json),
  generated 2026-10-25: 144 portfolios and 50 pilots.
- Each profile's biography, education and portfolio connection has its own
  HTTPS citation in the native contributions, education and compiled wiki.
  Individual pilot biographies are explicitly treated as self-reported.
- Named subjects of trackers, principals of explicitly tracked firms, named
  creators and self-described individual creators' public aliases are included.
  Organizations and AI models are excluded as people. Thematic portfolios
  referencing Swift, Musk or Harris are distinguished from personal-trade trackers.
- Landing-page-only creators Molly Cantillon and Antonio Marrazzo are included.
  Antonio's professional LinkedIn profile was opened in Chrome after the HTTP
  fetch failed. His ongoing Rice study is not represented as a completed degree.

## Saved content and preservation

The reviewed catalog is `scripts/people/data/autopilot.json`; replay using
`npx tsx scripts/people/autopilot.ts` (dry-run), adding `--apply` to save and
`--base https://www.chronopin.com` for production. It authenticates using the
existing admin environment credentials, never records them in the catalog,
merges existing lists and missing scalar fields, checks for concurrent edits,
and verifies the saved profile and compiled wiki. Existing financial research,
legal records, phases and sourced personal facts are preserved.

The People backup was synchronized for these 72 profiles, preserving unrelated
snapshot records. Images were downloaded, decoded and visually inspected, then
53 portraits or public creator avatars were uploaded to Azure Blob Storage and
verified by public download and SHA-256. Source URLs and credits remain in the
catalog; no image binaries were added to Git. The Burry tracker image depicting
Christian Bale was rejected and replaced by Tony Avelar's photograph of Burry.
Steven A. Cohen the investor is distinct from Steve Cohen the congressman.

## Verification and limits

- Both environments' replay dry-runs return 72 unchanged entries, zero creates
  and zero updates after application.
- Every saved profile and compiled wiki was read back and checked for its
  additions and citations. Production People filtering and the Michael Burry
  detail page were also checked in Chrome.
- TypeScript and the replay script's ESLint check passed.
- The official public directory is limited to portfolios above $100,000. It
  cannot prove exhaustive coverage of private or smaller app-only portfolios;
  the landing page also reports more portfolios than the public catalog.
- Julian Baker's sourced biography and education are saved. Forbes supplies a
  placeholder image; no unverified portrait was substituted.
- Antonio Marrazzo's precise Autopilot portfolio details are absent from the
  public catalog. His public professional biography and portrait are saved.
- No private dates, income, property, health or religion were invented. Client
  assets and portfolio returns were never treated as personal income. This
  profile pass does not certify a complete legal/ethics or impact review.

## Full-profile follow-up — all 54 newly added identities

The initial import established directory coverage and brief biographies; it did
not complete a full career research pass. Following the owner's request, all
54 profiles created by that import (IDs 1275–1328) were researched further and
expanded through the authenticated People APIs locally and in production.
There was no deployment.

The reviewed expansion is `scripts/people/data/autopilot-full-profiles.json`:
54 expanded biographies, 254 reviewed career/portfolio/background entries,
124 opened source URLs with verification metadata, and explicit research gaps
for every identity. Some entries replace prior portfolio summaries; total
native contribution rows across the 54 people increased from 148 to 369.
Nine education entries were added or refined (verified education coverage
increased from 21 to 27 profiles). Nine annual earnings estimates were added
for seven fund managers. Institutional Investor's estimates combine gains on
personal invested capital and fee shares; they are labelled estimates, not
salary, fund assets or net worth. Burry's multi-year mortgage-trade profits
were not assigned an invented calendar year.

Cohen's official SEC settlement is saved as a native legal matter, with filing
and resolution dates, the supervisory restriction, and its settled status.
It is distinguished from a criminal conviction and from his companies'
separate proceedings. His CFTC follow-on restriction is described in a sourced
career entry rather than counted as another underlying misconduct incident.
Thompson's NBA suspension is reported as a sports disciplinary career entry.

Run `npx tsx scripts/people/fullProfiles.ts` to preview the expansion, adding
`--apply` to save and `--base https://www.chronopin.com` for production. This
is a second-stage enrichment after the original `autopilot.ts` coverage import;
the original catalog remains the initial coverage snapshot. The full-profile
replay only updates the 54 exact identities and never creates people. It
validates the complete manifest and all merges before writing, saves a
per-environment before-image, checks concurrent edits, preserves existing
images, dates, authored phases, unrelated research and impact assessments,
and verifies saved native fields and compiled wiki citations. It is intended
to reapply the explicitly researched prose and records, unlike the initial
import's fill-missing-only scalar merge. The People seed backup now contains
these expanded native records; unrelated snapshot rows were verified unchanged.

Verification: both environments return 54 unchanged entries on a subsequent
full-profile dry-run. All 108 native detail pages (54 per environment) returned
HTTP 200 and rendered each expanded biography and every reviewed career-entry
title. Profile and compiled-wiki citation readback passed for all 54 saves in
both environments. TypeScript and ESLint passed for the replay script.

Public aliases remain explicit: InTheMoney, Prima Lux and The Rabbit Hole do
not receive guessed civil identities. Litquidity's own published founder
identity is described without changing its established profile URL. The Simple
Side's own page describes a team/business, which the biography makes explicit;
a human identity is not fabricated. Namesake qualifications or legal records
were excluded. Where connected public sources do not establish degrees,
personal income, property, health or travel, those fields stay unknown. This
is researched career coverage with documented gaps, not a certification that
private facts or every legal/ethics matter have been found. Julian Baker's
previously documented portrait gap remains.

| Profile | Native career entries after update | Education supported | Annual earnings records |
| --- | ---: | :---: | ---: |
| [Peter Wolff](https://www.chronopin.com/person/peter-wolff) | 13 | Yes | 0 |
| [InTheMoney](https://www.chronopin.com/person/inthemoney) | 9 | Unknown | 0 |
| [Michael Sikand](https://www.chronopin.com/person/michael-sikand) | 12 | Yes | 0 |
| [Daniel Koss](https://www.chronopin.com/person/daniel-koss) | 6 | Unknown | 0 |
| [Brooker Belcourt](https://www.chronopin.com/person/brooker-belcourt) | 6 | Unknown | 0 |
| [Devika Gehlaut](https://www.chronopin.com/person/devika-gehlaut) | 5 | Unknown | 0 |
| [Dan Dao](https://www.chronopin.com/person/dan-dao) | 5 | Yes | 0 |
| [Nicholas Giannotti](https://www.chronopin.com/person/nicholas-giannotti) | 5 | Unknown | 0 |
| [Litquidity](https://www.chronopin.com/person/litquidity) | 8 | Unknown | 0 |
| [The Simple Side](https://www.chronopin.com/person/the-simple-side) | 6 | Unknown | 0 |
| [Jonathan Bulmer](https://www.chronopin.com/person/jonathan-bulmer) | 5 | Unknown | 0 |
| [Randy Harris](https://www.chronopin.com/person/randy-harris) | 8 | Unknown | 0 |
| [The Rabbit Hole](https://www.chronopin.com/person/the-rabbit-hole) | 6 | Unknown | 0 |
| [Ronnie Shah](https://www.chronopin.com/person/ronnie-shah) | 6 | Yes | 0 |
| [Gannon Breslin](https://www.chronopin.com/person/gannon-breslin) | 6 | Unknown | 0 |
| [Prima Lux](https://www.chronopin.com/person/prima-lux) | 4 | Unknown | 0 |
| [Tom Heberle](https://www.chronopin.com/person/tom-heberle) | 4 | Unknown | 0 |
| [Garth Friesen](https://www.chronopin.com/person/garth-friesen) | 7 | Yes | 0 |
| [Glenn Turner](https://www.chronopin.com/person/glenn-turner) | 4 | Unknown | 0 |
| [Gregory Scott](https://www.chronopin.com/person/gregory-scott) | 4 | Unknown | 0 |
| [Derek Kahn](https://www.chronopin.com/person/derek-kahn) | 4 | Unknown | 0 |
| [Tristan Thompson](https://www.chronopin.com/person/tristan-thompson) | 9 | Unknown | 0 |
| [Jay Patel](https://www.chronopin.com/person/jay-patel) | 4 | Unknown | 0 |
| [Jordan Evans](https://www.chronopin.com/person/jordan-evans) | 4 | Unknown | 0 |
| [Harold Tan](https://www.chronopin.com/person/harold-tan) | 6 | Yes | 0 |
| [Ross Pomerantz](https://www.chronopin.com/person/ross-pomerantz) | 6 | Yes | 0 |
| [Colin Kolano](https://www.chronopin.com/person/colin-kolano) | 4 | Unknown | 0 |
| [Patrick Figueroa](https://www.chronopin.com/person/patrick-figueroa) | 4 | Unknown | 0 |
| [Ryan Schilhab](https://www.chronopin.com/person/ryan-schilhab) | 4 | Unknown | 0 |
| [Jordan Grayson](https://www.chronopin.com/person/jordan-grayson) | 7 | Yes | 0 |
| [Jeffrey M. Welch](https://www.chronopin.com/person/jeffrey-m-welch) | 4 | Yes | 0 |
| [Zack Fincher](https://www.chronopin.com/person/zack-fincher) | 4 | Unknown | 0 |
| [Jay Plourde](https://www.chronopin.com/person/jay-plourde) | 6 | Unknown | 0 |
| [Jim Cramer](https://www.chronopin.com/person/jim-cramer) | 8 | Yes | 0 |
| [Jim Simons](https://www.chronopin.com/person/jim-simons) | 10 | Yes | 2 |
| [Michael Burry](https://www.chronopin.com/person/michael-burry) | 10 | Yes | 0 |
| [Ken Griffin](https://www.chronopin.com/person/ken-griffin) | 7 | Yes | 2 |
| [Leopold Aschenbrenner](https://www.chronopin.com/person/leopold-aschenbrenner) | 8 | Yes | 0 |
| [Steven A. Cohen](https://www.chronopin.com/person/steven-a-cohen) | 9 | Yes | 1 |
| [Jason Calacanis](https://www.chronopin.com/person/jason-calacanis) | 8 | Yes | 0 |
| [Ray Dalio](https://www.chronopin.com/person/ray-dalio) | 8 | Yes | 1 |
| [Bill Ackman](https://www.chronopin.com/person/bill-ackman) | 8 | Yes | 1 |
| [Peter Thiel](https://www.chronopin.com/person/peter-thiel) | 9 | Yes | 0 |
| [Dave Portnoy](https://www.chronopin.com/person/dave-portnoy) | 8 | Yes | 0 |
| [David Tepper](https://www.chronopin.com/person/david-tepper) | 8 | Yes | 1 |
| [Joseph Edelman](https://www.chronopin.com/person/joseph-edelman) | 7 | Yes | 1 |
| [Julian Baker](https://www.chronopin.com/person/julian-baker) | 6 | Yes | 0 |
| [Felix Baker](https://www.chronopin.com/person/felix-baker) | 8 | Yes | 0 |
| [Alejandro Lopez-Lira](https://www.chronopin.com/person/alejandro-lopez-lira) | 15 | Yes | 0 |
| [Travis Hoium](https://www.chronopin.com/person/travis-hoium) | 7 | Yes | 0 |
| [Adam Garcia](https://www.chronopin.com/person/adam-garcia) | 7 | Unknown | 0 |
| [Gav Blaxberg](https://www.chronopin.com/person/gav-blaxberg) | 11 | Yes | 0 |
| [Molly Cantillon](https://www.chronopin.com/person/molly-cantillon) | 6 | Unknown | 0 |
| [Antonio Marrazzo](https://www.chronopin.com/person/antonio-marrazzo) | 6 | Unknown | 0 |
