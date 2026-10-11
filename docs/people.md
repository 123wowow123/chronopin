# Person pages

`/person/<slug>` is a profile page for a senator, representative, member of
the executive branch, governor or other political figure - sitting or former,
presidents included - and for other famous people (business, entertainment,
sports, arts, science, media), the way `/company/<slug>` is for a company.
`/people` lists everyone with a page, grouped by role, with the political
people who have left office (or died) under "Former officeholders".
Schema: `0150_person.sql`, `0151_person_wiki.sql`, `0152_person_left_office.sql`,
`0153_person_kinds.sql` in `scripts/db/schema`; model: `src/server/model/person.ts`;
page: `src/components/person/PersonView.tsx`.

The same facts fit every role: a politician has a salary and laws, a
footballer has prize money and endorsements and records, a founder has pay and
companies. `role` picks the heading ("Laws and contributions" for political
roles, "Work and contributions" otherwise); contribution kinds include `work`,
`company` and `record`, earning kinds `endorsements`, `prize-money` and
`business-income`. Earnings are yearly income, never net worth.

## What a page shows

Main pane: portrait, office, party, age (computed from the birth date, or at
death), when the current unbroken service began, a line on politics, religion,
weight, health. Under it, **earnings as one tile per calendar year** (salary
plus any outside income a disclosure reports; a range stays a range), then laws
and other contributions grouped by kind, property, recent trips, and linked
pins. A field nobody has published is left off the page, never "unknown".

## The wiki under the page

The page does not read the fact tables directly. Every save compiles a
person's sourced facts into an Open Knowledge Format (v0.2) wiki
(`src/lib/personWiki.ts`): an OKF `Person` concept whose statements cite
numbered sources (`[^s1]` footnotes plus a `sources:` list), stored in
`PersonWiki` (0151) beside the compiled profile the page renders. The
`[1]`, `[2]` markers on the page and the Sources list at its foot are the wiki's
own numbering, so what the site shows is what the wiki says and cites.

- **References are `Source` rows** (0026), the table pins' links use, so a cited
  link can have a link wiki of its own and is shared with any pin citing it
  (`PersonSource` holds each person's footnote number). The "who they
  are" basics cite the person's official Congress biography (bioguide) and
  their Wikipedia article.
- **Read it:** `GET /api/people/:id/wiki?path=page` (markdown) or without
  `path` for an `{ okf_version, files }` bundle; the page links it as "Read the
  wiki". `npm run people:wiki -- --out DIR` writes every wiki as a bundle
  (`people/<slug>.md`, `index.md`, `log.md`), which passes `okf:lint`.
- **Link wikis:** `npm run people:wiki -- --sources` fetches and writes up
  each cited link that has no wiki (a Claude call each; no credit leaves them
  pending, and `wiki:export`/`wiki:apply` is the by-hand route). The titles
  they find replace the host name in the reference list.
- The wikis are compiled, so they are not seeded: `backup:data` restores the
  facts and rebuilds the wikis.

## The sourcing rule

Every fact carries the URL it was read from (`*SourceUrl`, `sourceUrl`). Health,
religion and weight are stored **only with a source** (`readPerson` in
`src/server/personInput.ts` drops them otherwise): weight only where the
person or their physician published it, health only what they or their office
disclosed, religion from Wikidata's entity (P140) or a statement the person
made. No estimates, no commentary from critics, no family members. A source
that is not https is dropped. A correction goes through "Suggest a correction".

## Filling it

All of this runs on the dev machine; prod stores what a local run sends it.

| Command | What it does | Source |
| --- | --- | --- |
| `npm run people:import -- --congress` | every sitting senator and representative: name, office, party, birth date, ids | GovTrack `/api/v2/role?current=true` (keyless) |
| `... --enrich` | Wikipedia link, Commons portrait, religion | Wikidata, matched on bioguide id (P1157) |
| `... --former` | every former president and vice president, and members of Congress who left since 2015 (anyone already here, or still serving, is skipped) | Wikidata P39 terms |
| `... --tenure` | when the member's unbroken service in the chamber began | Wikidata P39 terms |
| `... --salary` | a salary line per year served since 2009, leadership years at the leadership rate | GovTrack terms + CRS 97-1011 pay tables |
| `... --laws` | sponsored bills that became public law | Congress.gov API; set `CONGRESS_API_KEY` (free, https://api.congress.gov/sign-up/); `DEMO_KEY` allows ~10 calls an hour |
| `npm run people:apply -- file.json [--dry-run]` | hand-researched profiles (executive branch, governors, leadership) | any, each with its URL |
| `npm run people:wiki [-- --all] [-- --sources] [-- --out DIR]` | compile the wikis (re-run after changing the compiler), write link wikis for cited sources, export an OKF bundle | the facts above |
| `npm run people:link-pins` | link pins whose tag is exactly the person's name | local DB |
| `npm run people:apply -- --prod --token-file <admin token>` | send local profiles to prod (`POST /api/people`) | needs 0150 deployed first |

Then `npm run backup:data` (writes `scripts/backup/seedPeople.json`).

Pay tables: members of Congress have been paid $174,000 since January 2009; the
Speaker $223,500; majority/minority leaders and the President pro tempore
$193,400 (CRS 97-1011). Years before 2009 are not generated: the earlier rates
are not in the table.

## Legal and ethics record, and the misconduct meter

Ian asked (2026-10-10) for misconduct such as insider trading to be mentioned,
and for a misconduct meter. This is the most sensitive thing a page says about a
real person, so it is built to be fair and checkable (`0154_person_matter.sql`,
`0155_person_matters_checked.sql`):

- **A matter needs official action.** A court or an official body (regulator,
  prosecutor, ethics committee) acted - opened a confirmed investigation,
  charged, found, settled, sanctioned, convicted, acquitted, dismissed, closed
  it - or a reputable outlet reported that action. Rumours, accusations by
  opponents and undecided private suits are not matters.
- **Every matter states its status** (`investigated`, `charged`, `convicted`,
  `pleaded-guilty`, `acquitted`, `dismissed`, `closed-no-action`, `settled`,
  `found-liable`, `sanctioned`, `pardoned`, `overturned`) and has an https source;
  `readMatter` drops a row without either. A charge is never shown as a
  conviction, and matters that ended in the person's favour are listed as such.
- **The meter is a tally, not a verdict** (`misconductMeter`, src/lib/people.ts):
  findings (a conviction, plea, liability finding, sanction, penalty or
  settlement), open matters (investigated, charged) and resolved-in-their-favour.
  None documented / under scrutiny / one finding / several (2-3) / extensive (4+).
  Severity is not weighed; each matter's status and penalty sit beside it.
- **No review, no meter.** `Person.mattersCheckedDate` is the day someone searched
  dockets, SEC/DOJ releases, ethics reports and reporting for the person; while it
  is null the page shows no meter and no record section, so missing research is
  never read as a clean record. "None documented" appears only after a review.
- The record is part of the person's wiki, with the same numbered footnotes.

**State on 2026-10-10.** A partial first review: 87 of the 135 people assigned
were searched (the other 48 ran out of the shared search budget and are
unreviewed), and the file was then cut down by hand to 70 matters for 42
people. A person is marked reviewed only when at least one matter was kept:
the searches were not complete enough to certify "none documented" for anyone,
so nobody shows that level yet. Removed on purpose: allegations by private
persons that ended in no charge, private suits and copyright cases, ballot or
residency rulings, entries whose status did not fit (an "investigated" matter
with a decision date, a civil suit labelled "charged"), and anything resting on
one weak source. Official findings without a penalty (an inspector general,
the Office of Special Counsel, an ethics report) use the `findings-issued`
status (0160), and count as findings on the meter. Governors and the ~800
imported former members of Congress have not been reviewed and show no meter.
Re-run the review with a fresh search budget before treating the record as
complete.

## The "good for society" meter

Ian asked (2026-10-10) for a good-for-society meter "based on proven economic
principles". Economics cannot settle every value trade-off, so this does not
score people: it reads the **documented effects of their contributions** on
standard welfare-economics criteria, from cited evidence (`0156`,
`impactScores` on `PersonContribution`; `societyMeter` in `src/lib/people.ts`).

| Criterion | Question | Evidence it needs |
| --- | --- | --- |
| efficiency | net social benefit by cost-benefit analysis (Kaldor-Hicks) | agency impact analyses, CBO/JCT/GAO, peer-reviewed CBA |
| externalities | does it correct a market failure (externality, public good, information, market power)? | studies of the policy |
| growth | effect on productivity and potential output | CBO/CEA/Fed/peer-reviewed estimates |
| fiscal | effect on long-run fiscal sustainability | CBO/JCT scores |
| distortion | avoids or creates deadweight loss and rent-seeking | studies of tariffs, subsidies, controls |
| distribution | who gains and who loses | CBO distribution tables, incidence studies - **shown, never added in** |

- Each is scored -2..+2 by what the evidence says, with the evidence's URL, a
  confidence (high / medium / low) and a `contested` flag when credible sources
  disagree about the sign. Strongest evidence: the IGM Economic Experts Panel
  consensus, then CBO/JCT/GAO/CEA analyses, then peer-reviewed work. Op-eds and
  advocacy pieces do not count, and an assessment without its evidence URL is
  refused (`readImpact`).
- A contribution's score is the mean of its scored criteria, distribution
  excluded: how much to weigh who gains and who loses is a value judgment.
- The meter is the weighted mean of the assessed contributions (weight =
  importance, a career-defining one counting five times a minor one, times
  confidence 1 / 0.6 / 0.3), and it appears only with **at least 5 assessed
  contributions** (`MIN_ASSESSED`). On 2026-10-10 the first 76 assessments left
  nobody above 4, so no one shows the aggregate yet; each assessment still shows
  on its own contribution. It always shows how many of the person's
  contributions it rests on, how many are contested, and the lowest-to-highest
  range, so the average cannot hide the spread.
- It does not judge intent or character, does not weigh the misconduct record
  (a separate meter), and says nothing about contributions nobody has assessed.
- Fill it with `npm run people:assess -- file.json`, which matches assessments to
  existing contributions by reference or title. Assessments survive a re-save of
  a person's contribution list.

## The life-phase octagon

Ian asked (2026-10-10) for an "octagon chart during different phases of life",
modelled on the Yonsei Annals piece on the "hexagonal human"
(https://annals.yonsei.ac.kr/news/articleView.html?idxno=11210) - six conditions
(appearance, education, wealth, personality, occupation, family background)
plotted on a hexagon - with phases such as Donald Trump's early career,
president first term and president second term, and with misconduct, social
good and economic good as axes (`0161_person_phase.sql`, `OctagonChart.tsx`,
`PersonPhase` in `src/lib/people.ts`).

The article is itself a critique: it argues that scoring people against a
perfect hexagon is a psychological burden. So the chart is built to be a
profile, not a ranking:

- **Eight axes**, each 0-5 against a written rubric from documented evidence:
  education, wealth, position, public standing, health, **misconduct**,
  **social good**, **economic good**. Misconduct maps to the misconduct meter
  (0 none documented ... 5 four or more findings) and reads "more = more", so
  a long spoke is more documented misconduct, not a better score. Economic
  good builds on the good-for-society assessments; social good is the effect
  on health, safety, education, rights and the environment from official
  statistics or peer-reviewed evidence.
- **Not axes:** appearance and personality, which cannot be scored from
  evidence, and family background, which nobody earns (it was in an earlier
  draft and is the part of the original chart its critics object to most).
- **A gap is not a zero.** An axis needs a score, a confidence and an https
  evidence URL, or it is left out and drawn as a dashed spoke (`readPhase`).
- **No total, no area, no ideal shape**, and each axis shows its rubric and its
  source in the table under the chart. The phases and their axes are part of
  the person's wiki, with the same numbered footnotes.
- Fill with `npm run people:apply -- file.json` (a `phases` list).

## Everyone's radar, backed by the wiki

Every person has a radar, generated and stored with their wiki (`0162`):

- **Generated, from documented data only.** When a person's wiki is compiled
  (on every save, and `npm run people:wiki -- --all`), an **Overview** phase is
  built by `generateOverview` (src/lib/people.ts) and stored in `PersonPhase`
  with `origin = 'generated'`. Four axes can be generated mechanically, each by
  a written rule and with the source it rests on; an axis nothing documents is
  left out - a gap, never a guess:

  | Axis | Rule | Source |
  | --- | --- | --- |
  | position | scope of the office: president 5, vice president 4.5, cabinet / senator / governor 4, representative 3 | the person's Congress biography (bioguide) or Wikipedia |
  | wealth | the latest documented year's income against the IRS's percentiles of returns (top 1% = 4 ... below the median = 1); income, never net worth, so it tops out at 4 | the earning line's own source; thresholds from the IRS, tax year 2022, as tabulated by the Tax Foundation |
  | education | the highest degree: associate 2, bachelor's 3, master's or professional (J.D., M.D.) 4, research doctorate 5 | Wikidata's academic degree (P512), else the degrees in the Wikipedia infobox |
  | misconduct | the reviewed legal record as the misconduct meter reads it (0 none documented ... 5 four or more findings); not generated for an unreviewed record | the matters' own sources |

  Standing, health, social good and economic good need research: they are set
  by hand, with evidence, through the update API.
- **A researched person keeps their researched phases.** Overview is generated
  only for a person with no hand-researched phases.
- **Too few axes to draw?** With fewer than three documented axes the chart
  shows the points and says how many of the eight have evidence, instead of
  inventing a shape.
- **The wiki lists them:** the person's OKF page carries a "Life phases"
  section with each axis, its score and its numbered source.

### The wiki's update API

| Endpoint | What it does |
| --- | --- |
| `GET /api/people/:id/wiki?path=radar` | the person's radars as data: the generated overview and any researched phases, each axis with score, confidence, basis and source (public) |
| `GET /api/people/:id/wiki` | the whole wiki as an OKF bundle (`?path=page` for the markdown) |
| `PUT /api/people/:id/wiki` | admin: update the wiki's data. `phases` replaces the researched phases (an axis needs a 0..5 score, a confidence and an https evidence URL or it is dropped); `educationLevel` + `educationNote` + `educationSourceUrl` set the degree; any other profile field or list is accepted as in `PUT /api/people/:id`. What is left out is kept. The wiki is compiled again and the overview regenerated |
| `POST /api/people/:id/wiki` | admin: compile the wiki again and regenerate the overview from what is stored |

Importers that feed the generator (all keyless): `npm run people:import --
--education` (Wikidata degrees), `-- --education-wiki` (infobox degrees),
`-- --salary-current` (this year's statutory salary for sitting members).

## Known gaps

- GovTrack's API (roles by term, used by `--salary`) was not answering on
  2026-10-10 while its website was; `--salary` and `--laws` were not run.
- `--laws` lists bills that became law *as themselves*; a sponsor whose
  provision was folded into an omnibus is not credited for it.
- Outside income and net worth come from annual financial disclosures (House
  Clerk, Senate eFD), which are PDFs: only hand-researched profiles carry them.
- Health, weight, property and trips exist only for people someone researched
  with sources; for most of Congress these sections are absent by design.

## Searching people

The main search box suggests people (a "People" group, by name word-start) and reads two kinds of term:

- `person:"Joe Biden"` - the pins linked to that person (PinPerson).
- Radar-axis bounds - `education`, `wealth`, `position`, `standing`, `health`, `misconduct`, `social`, `economic` (the chart's labels `public-standing`, `social-good`, `economic-good` also work) with the `rating:` operators on the 0-5 scale: `misconduct:>3`, `wealth:>=4`, `social:2-4`, bare `wealth:4` is "4 or more". A person's score is their best across life phases; people with no evidence on the axis never match. Typing a bound also lists the matching people in the suggestions; the term itself searches the pins linked to them.

Code: `searchQuery.ts` (parse), `model/pins.ts` (EXISTS on PinPerson/PersonPhase), `Person.suggest`, `/api/pins/autocomplete` `people`.

## Radar research run (2026-10-10 / 11)

`npm run people:radar -- file.json [--skip-hosts a.com,b.com] [--dry-run]`
(scripts/people/radarMerge.ts) applies researched legal/ethics matters and the
four research axes (standing, health, social, economic) to the radar.

What a research file may add, and what is dropped on the way in:

- **Matters** only when the person (not their campaign committee, staff or
  agency) has an official outcome or action, from a page that was fetched. A
  search that found nothing is **not stored**: a shallow search must not read
  as a clean record, so `mattersCheckedDate` is set only for a person with at
  least one stored matter.
- **Standing** is job approval (not favourability or "excellent/good"), 2024 or
  later, from the pollster's own page; a TV station, newspaper, co-sponsor or
  third-party host relaying a poll is dropped (`--skip-hosts`).
- **Social / economic** need a cited, evidence-based assessment; none was found
  for anyone, so those axes are still empty.
- **Health** stays a gap unless an examination or disclosure is published.

A person with no researched phases gets one hand phase "Overview": the
generated axes as of that day plus the researched ones (it stops regenerating,
so re-run `people:radar` after earnings change). A person with researched
phases (the presidents) gets missing axes added to their latest phase.

Coverage after the run: see the counts in the session notes; the per-axis query
is `SELECT count(DISTINCT "personId") FROM "PersonPhase" WHERE axes ? 'standing'`.
Known limits: Morning Consult publishes per-senator approval as interactive
charts and in paywalled data, so most senators have no standing score; historical
figures before about 1945 have no polling.

### Social/economic good: assessed per contribution, not per person (2026-10-11)

A 120-person research pass looked for cited, evidence-based assessments of what
people did in office. 46 produced one; most were a single study of a single
law, so they were **not** stored as person-level social/economic radar axes
(which one study cannot support, and a score would depend on which law was
picked). Instead the defensible ones are stored as `impact` on the specific
contribution they assess, mapped onto the welfare criteria only where the cited
study measures that criterion (`impactScores`, -2..+2):

| Person | Contribution | Scores | Evidence |
| --- | --- | --- | --- |
| Jefferson | Embargo Act of 1807 | efficiency -2, distortion -2 | Irwin, NBER w8692 |
| Hoover | Smoot-Hawley Tariff Act | distortion -2 | Irwin, RESTAT 1998 |
| Arthur | Pendleton Civil Service Reform Act | efficiency +1 (contested) | Aneja & Xu, AER 2024 |
| Ford | EPCA / CAFE standards | efficiency +1 (contested) | Greene et al., Energy Policy 2020 |
| Eisenhower | Federal-Aid Highway Act of 1956 | growth +1, efficiency 0 | Fernald, AER 1999 |
| Carter | Airline Deregulation Act | efficiency +2 | Morrison & Winston, Brookings 1986 |
| McKinley / B. Harrison | McKinley Tariff Act | efficiency -1, distortion -1 (low, contested) | Irwin, NBER w6835 |

A second pass (2026-10-11, `npm run people:add-assessed`, scripts/people/addAssessed.ts,
which upserts single contribution rows without replacing a person's list) added
the rest that cleared the same bar:

| Person | Contribution | Scores | Evidence |
| --- | --- | --- | --- |
| Washington | Funding Act of 1790 | fiscal +1 | Sylla, NBER chapter |
| Lincoln | Morrill Land-Grant Act | growth +1 | Ehrlich, Cook & Yin, J. Human Capital 2018 |
| Truman | Marshall Plan | growth +1 (low, contested) | De Long & Eichengreen, NBER 3899 |
| Coolidge | Immigration Act of 1924 | distribution -1 | Abramitzky et al., AEJ: Applied 2023 |
| Wilson | Segregation of the federal civil service | distribution -2 | Aneja & Xu, QJE 2022 |
| Johnson | Voting Rights Act of 1965 | distribution +1 | Cascio & Washington, QJE 2014 |
| Nixon | Wage and price controls | distortion -1 (low, contested) | Blinder & Newton, NBER 1981 |
| Clinton | Omnibus Budget Reconciliation Act of 1993 | fiscal +1 | CBO estimate via GAO AIMD-94-79R |
| Trump | 2018 Section 232/301 tariffs | efficiency -1, distortion -1 | Fajgelbaum et al., QJE 2020 |
| Kemp | Georgia Pathways to Coverage | efficiency -1 | GAO-25-108160 |
| Newsom | Project Homekey | efficiency +1 | California State Auditor 2023-102.1 |

`distribution` is shown on the contribution but is never added into the meter.

Left out on purpose: findings that are projections not outcomes (EPA Clean Air
Act, ex-ante tax-reform forecasts), program-level GAO cost findings, health
studies that do not map to the economic criteria (PEPFAR, Medicaid mortality),
and anything cited only through a mirror or relay. The same law appearing for
two people is one finding on two contributions (sponsor and signer), never two
person scores.

## Representatives: official-list sweeps and research notes (2026-10-11)

Searching 829 House members one at a time through a search engine reached the
official pages too rarely to be trustworthy (most agents fetched none), so the
representatives were covered by sweeping the official records themselves and
matching names (`npm run people:sweep`, scripts/people/sweepMerge.ts):

| List | Covered | Notes |
| --- | --- | --- |
| House Ethics Committee press releases | all 493, 1998-12 to 2026-08 | scanned PDFs OCR'd; open reviews and extension notices are not matters |
| Office of Congressional Conduct (OCE) investigations table | all 124 rows, referrals 2009-06 to 2026-03 | matters the board dismissed without referral are not published |
| DOJ prosecutions of members since 2000 | 37 entries, 34 people | quotes machine-checked; justice.gov blocks the fetch tool, so best effort |
| House expulsions, censures and reprimands | 25 entries, 1976-2026 | history.house.gov list |

Names are matched by normalized surname + first name (nicknames and spelling
variants), with the state breaking ties; nobody ambiguous is stored. People who
served only before about 2015 are not in the directory, so their entries are
not matched and no one was added just for a misconduct entry.

Stored: matters with an outcome (and a charge, from DOJ). Not stored: a review
still open, an extension notice, a complaint with no official action. A
pardon before any conviction is stored as `dismissed` with the pardon in the
summary, because `pardoned` counts as a finding in the misconduct meter.

Every representative now has a `legal` research note
(`PersonResearchNote`, 0163) saying which lists were swept, what was found
for them and what was not swept (FEC enforcement, state ethics and bar bodies,
court dockets outside DOJ cases). Coverage is always `partial`: a missing
matter is "nothing in these lists", never "clean". The wiki's "Research notes"
section renders it.

Result: 515 matters on 303 people in total; 148 of the sweep's people have at
least one stored matter. A House security-screening fine (H.Res. 38 / 73) is a
sanctioned matter each time it is levied, so a member fined repeatedly shows
several; the penalty text carries the reason.

### Sparse phases are one entry (2026-10-11)

A researched phase needs at least `MIN_PHASE_AXES` (5) scored axes to draw a
shape of its own. When no phase of a person has that many, the life phases are
shown as **one "Overview" entry** - for each axis the most recent phase that
scored it - on the person page, on the directory's mini radar, and from
`GET /api/people/:id/wiki?path=radar` (`?phases=all` returns every phase as
stored). A person with even one well-evidenced phase keeps their phases apart
(the presidents with a full term). The wiki's "Life phases" text keeps every
phase with its sources: it is the researched record. 27 of the 44 people with
more than one phase are merged. Code: `collapseSparsePhases`, src/lib/people.ts.

### Famous people, partial re-checks and the Senate sweep (2026-10-11)

Three follow-ups to the representative run, all stored through
`people:radar` + `people:notes --topic legal`:

- **Non-political people (79)**: one agent per four people, web search plus
  whatever official pages fetched. 14 matters stored (SEC and court outcomes,
  Spanish tax convictions, a pardon, etc.). Most agents read only search
  results, so their notes are `partial`; nobody is marked clean. Dropped as not
  about the person or not an official outcome: company-level penalties
  (Murdoch's News Corp derivative suit, Nadella's stayed Indian MCA order,
  Arnault's closed Belgian probe) and a league fine (LeBron James).
- **Partial-coverage officials (85 non-senators)**: re-checked in batches of
  three. 41 matters kept after dropping committee-only staff reports, open
  reviews and entries not about the person (Walz staff report, Blanche bar
  referral, Gabbard IG complaint, Kemp lawsuit, the 1860 Buchanan resolution,
  Billy Carter's inquiry, the Morrill committee).
- **Senate sweep (50 senators)**: ethics.senate.gov press releases (2007-2024)
  and public letters (2002-2023), plus the Senate Ethics Manual appendix for
  1990-2001. 23 entries, 6 of today's database people matched (Graham,
  Menendez, Coburn, Vitter, McCain, ...); 15 names are not in the database.
  `sweepMerge` writes House-list notes, so the Senate notes were written by
  hand (`sweeps/senate-notes.json`): only those two Senate pages, not
  congress.gov resolutions or annual reports.


### Missing-rubric run: education, income, standing (2026-10-11)

`npm run people:gap -- files.json [--dry-run]` (scripts/people/gapMerge.ts)
fills only what a person has none of - a degree (`educationLevel`,
`educationNote`, `educationSourceUrl`) or `PersonEarning` rows - without
touching hand lists (`Person.save` would replace them). An existing degree or
earnings row is never replaced.

- **Education**: 218 people had no degree; 200 now have one (levels 1-5 from
  fetched pages, mostly Wikipedia; Bioguide returned 403). Level 1 is "no
  degree documented, secondary school or attended college", only where a page
  says so; 18 stayed null (the page states no degree). Hendricks was dropped:
  English Wikipedia contradicts itself on whether he graduated.
- **Income**: 194 people had no documented income. 100 earnings rows were
  added: statutory salaries from CRS reports (97-1011 Members' pay,
  RS20115 President, OPM Level I Cabinet), SEC proxy summary compensation
  tables (Murdoch, Nadella), Forbes lists via their profile pages or
  reporting on them. Earnings rows take years from 1950 (`readEarning`), so
  every president, vice president and other officeholder who left office
  before 1950 keeps no wealth axis - a schema limit, not a research gap. A
  net worth is never entered as income.
- **Standing**: 200 senators, governors and Cabinet members were searched
  (140 senators, 27 governors, 33 Cabinet). 39 scores stored, each from the
  pollster's own page (Emerson, Quinnipiac, UMass, Suffolk, Winthrop,
  Vanderbilt, PPIC...); score = approve% / 20 to the nearest half. Dropped:
  polls relayed by a sponsor's site (sdnewswatch.org, deseret.com) and two
  2023 polls. Morning Consult publishes per-senator numbers only as chart and
  Pro+ data, so most senators remain without a score; every searched person
  has a `standing` research note (partial when pages were blocked). Presidents
  before Truman have no polling and were not searched.
