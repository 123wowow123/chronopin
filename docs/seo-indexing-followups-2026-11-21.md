# SEO and indexing follow-ups — November 21, 2026

Completed the actionable work from `.scrape/todo-seo-2026-11-08.md`. The old checklist and its README reminder are removed. No deployment or translation run was performed. [Verification and credited media](seo-indexing-followups-2026-11-21.json).

## Search Console

Using the owner's signed-in Chrome session for `sc-domain:chronopin.com`:

- Resubmitted both `/sitemap.xml` and `/sitemap-restaurants.xml`; both displayed **Sitemap submitted successfully**. The main sitemap was subsequently read on November 21 and reported **Success, 10,010 discovered pages**. The restaurant sitemap submission date changed to November 21; its displayed last-read date was still October 27 at that observation.
- Inspected the canonical URLs for **20806 (69th Grammys), 21010 (consolidated US chart), and 21020 (consolidated UK chart)**. All three initially said **URL is unknown to Google**. Requested indexing for each, and verified **Indexing requested / URL was added to a priority crawl queue**. These are successful requests, not proof of inclusion in Google's index.
- Rechecked Page indexing, whose latest data was **November 15**, and Crawl stats / host status, whose latest data was **November 18**. These are reporting dates, not November 21 measurements.

| Page indexing | Latest displayed count |
| --- | ---: |
| Indexed | 9,979 |
| Not indexed | 29,396 |
| Excluded by `noindex` | 12,450 |
| Crawled — currently not indexed | 7,308 |
| Blocked by robots.txt | 83 |
| Server error (5xx) | 3; validation already Started |

The November 12 note had 11,730 indexed, 6,094 crawled-but-not-indexed and 79 robots-blocked pages. This follow-up does **not** establish an indexing recovery. Crawl stats show about 548K requests over 90 days, 343 ms average response time and 99% HTTP 200 responses. Host status says Google had no recent difficulty crawling, with acceptable robots/DNS failure rates and acceptable recent server connectivity, but high server-connectivity failures in the past. These 90-day aggregates do not establish a current daily crawl rate. The exclusion-example drilldowns could not be completed reliably through the shared native browser UI; no claim is made that all 83 robots exclusions are intentional or that all 7,308 omitted pages have been individually diagnosed.

## Live technical checks

- Googlebot requests returned 200 for robots.txt, the main sitemap, restaurant sitemap and `/music`.
- Main sitemap parsed successfully: **10,010 entries / 10,009 unique URLs**, approximately 5.5 MB. The single duplicate is `/person/mike-rogers`; it was observed, not changed in this data-maintenance task. Restaurant sitemap parsed with **155 unique URLs**.
- Confirmed all **607 PinRedirect rules** remain present, targeting the 21 consolidated chart pins. Sampled old IDs **16033 → 21010** and **16988 → 21018** return native permanent **308** redirects, then a 200 canonical page; retired sample URLs are absent from the sitemap. This is a rule inventory and live sample, not 607 HTTP checks.
- All eight housing pages inspected return 200, have matching canonical links and lack a `noindex` robots meta tag. The four newly uploaded media files and every saved thumbnail on these pages were downloaded from public Azure URLs.

## Housing media repairs

Saved researched repairs through authenticated APIs locally and on production; expired caches and verified native readbacks. Original titles, text, dates, authors, locations, tags and parent relationships are preserved. Native PUT regenerates reference row IDs; reference content is preserved.

| Pin | Result on production |
| --- | --- |
| 7031 — Bailey at Stassney | Restored the hero's National CORE rendering credit. Added the published historical site/flood map from page 6 of the **2024 TDHCA application**, credited as a historical map with its 2023 USGS basemap. **3 media**. |
| 7047 — 95 Everett | Verified the developer's three distinct rendering views; no duplicate-image removal was warranted. Added the production-only third view to local and normalized the local hero credit. **3 media in both environments**. |
| 7081 — Henderson Place | Restored Mercy Housing's rendering credit. Added a different rendering and site plan from the architect's exact project page. Rejected generic Getty stock interiors on the operator site. **4 media**. |
| 7058 — Courtside II | Downloaded the original RentCafe rendering recorded in the original upload manifest and visually matched it to the saved hero. Restored Housing Trust Group / AM Affordable Housing credit. **3 media**. |
| 7059 — Sol on Park | Reopened the HDC article and matched its hero; the two renderings are different views of the same project. Existing credits and **3 media** retained; no write needed. |
| 7061 — 43 Green East | Verified the hero against LBBA's Phase 2 page. Removed **33995**, which depicts Phase 1, and replaced it with LBBA's explicitly labelled Phases 1/2 site plan. **3 media**. |
| 7071 — Woodhaven ELLA | Matched the ribbon-cutting photo to HDC's exact article and restored its credit. Production's previously rejected **36471** was already absent; removed that stale image locally too. **2 correct, credited media**, preserving the earlier removal decision. |
| 7088 — Viña | Matched the hero to Urban Land Conservancy's `Vina6.jpg` and restored its source credit. **3 media**. |

All **24 production media items across these eight pins** have both attribution fields populated. Four new media files were uploaded to Azure; no photographs or generated thumbnails were added to Git. Detailed before/after responses, source pages, reviewed contact sheets and resumable scripts are retained in ignored `.scrape/seo-closeout-2026-11-21/`.

Primary media evidence: [National CORE](https://nationalcore.org/communities/bailey-at-stassney-2/), [TDHCA application](https://tdhca.legistar.com/View.ashx?GUID=9B726C4D-C6FC-48EC-8278-4391B91319AC&ID=15070630&M=F), [Pennrose](https://www.pennrose.com/apartments/massachusetts/95-everett/), [GVSA](https://gvsa.com/projects/henderson-place-82), [Mercy Housing](https://www.mercyhousing.org/2024/03/newly-developed-housing-in-atlantas-old-fourth-ward/), [Courtside's original operator rendering](https://resource.rentcafe.com/image/upload/s3/2/149426/courtside%202%20-%203d%20rendering%20%282%29.png), [LBBA Phase 2](https://www.lbba.com/projects/13/43-green-phase-2), [HDC Woodhaven ELLA](https://www.nychdc.com/newsroom/smj-development-and-project-partners-celebrate-completion-120-new-affordable-homes-rego), [Urban Land Conservancy](https://urbanlandc.org/place/vina-apartments-nonprofit-and-retail-at-48th-race/).

English text did not change. The older translation batches remain assigned to the translation agent; no translation APIs were called. Google processing and the existing 5xx validation remain asynchronous. Further indexing diagnosis should use the new baseline above rather than the obsolete November 8 checklist.

## Mike Rogers sitemap repair — subsequent code follow-up

The two records are distinct people: IDs **870** (`mike-rogers`, Alabama) and **871** (`mike-rogers-2`, Michigan). The sitemap generated URLs from their identical display names instead of their unique stored slugs. Updated `personPath` to accept a loaded person's stored slug and applied it to the sitemap, canonical metadata, profile redirects, directory/search links, profile structured data, wiki resource URLs and trade push links. Name-only callers retain their existing behavior. No person records were merged or renamed.

Verified after refreshing the local development server: **10,076 sitemap URLs, all unique**, each Mike Rogers URL listed exactly once, both profile pages HTTP 200 with their own canonical URL, and both stored slugs passed to the directory. **44 targeted tests and typecheck pass**. Targeted ESLint passes except for two pre-existing `PeopleDirectory.tsx` hook errors, reproduced against its unchanged HEAD version. Evidence is in `.scrape/seo-mike-rogers-2026-11-21/`. **This code fix is local and has not been deployed**, so the earlier production sitemap observation remains historical evidence of the live defect until a requested deployment.

## Exclusion examples — subsequent audit

The [November 21 exclusion audit](seo-exclusion-audit-2026-11-21.md) completed the previously unfinished drilldowns: all **83 visible robots-blocked examples** are intentional login/composition routes. Of **50 crawled-but-not-indexed URLs** checked live, **47** are directly indexable canonical pages, **one** permanently redirects to its current slug and **two** intentionally say `noindex`. No unintended technical exclusion was found in that batch. Pin **3780** is a specific sourced-enrichment candidate; the audit made no production changes.
