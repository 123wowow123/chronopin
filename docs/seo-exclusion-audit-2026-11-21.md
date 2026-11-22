# Search Console exclusion audit — November 21, 2026

Inspected **all 83 visible robots-blocked examples** and the **first 50 crawled-but-not-indexed examples**, ordered by last crawl descending. The latter sample covers November 14–16 and includes 21 pin URLs, 24 tag URLs, three company URLs, one restaurant guide and one About page. It is not a random sample of all 7,308 URLs. Search Console displayed November 15 as its report update date, including rows whose last-crawled date was November 16; both values are preserved as displayed.

**No unintended robots or `noindex` exclusions were found in this batch.** [Machine-readable evidence and all 50 crawl results](seo-exclusion-audit-2026-11-21.json).

## Robots-blocked examples

| Observed route | Examples | Finding |
| --- | ---: | --- |
| `/login`, including locale-prefixed versions and `?redirect=` variants | 55 | Intentional account-page exclusion |
| `/respond/:id`, including locale-prefixed versions | 28 | Intentional composition-page exclusion |

Matched all 83 observed pathnames against the **current public robots.txt**: each matches the corresponding `Disallow` rule. None of these example URLs is a public pin, tag, company or restaurant page. A pin URL inside a login URL's `redirect` parameter does not make that public pin URL itself robots-blocked.

Fetched the first ten blocked examples with a Googlebot user agent. All returned HTTP 200 with `noindex`; no rule change or “Validate fix” submission was warranted. Pathname evidence covers all 83 report rows; the full query strings and HTTP readbacks are retained for the ten live samples.

## Crawled-but-not-indexed batch

| Current behavior | URLs | Finding |
| --- | ---: | --- |
| Direct HTTP 200, self-canonical, indexing allowed | **47** | No current technical exclusion found; 23 are sitemap `<loc>` entries and 24 are sitemap hreflang alternates |
| Old title slug returning permanent 308 | **1** | Working redirect to the already-sampled current URL |
| Intentional short-pin `noindex` | **1** | German pin 3780; English text is below the existing quality floor |
| Intentional translated-topic `noindex` | **1** | Arabic Discounter topic; below the translated-topic coverage threshold |

All 50 requested URLs are robots-allowed and end at HTTP 200. Every final page has an H1 and a canonical matching its final URL. The 47 direct indexable URLs have neither a robots `noindex` directive nor a missing sitemap-discovery entry. Localized URLs were checked against sitemap alternates as well as `<loc>` entries; they are not missing merely because the sitemap uses the English URL as its primary entry.

Specific results:

- **`/de/pin/2023/9-1-1-season-10-premieres`** returns **308** to `/de/pin/2023/9-1-1-s10e1-that-sinking-feeling-premieres-season-10-on-abc`. The destination is self-canonical and discoverable as a sitemap alternate. The report contains both spellings; the old spelling should consolidate into the current page.
- **`/de/pin/3780/tom-holland-signs-multi-year-deal-as-vuori-global-partner`** intentionally says `noindex`. Its English description plus summary contains **795 visible characters**, against the **900-character minimum**, with five distinct cited URLs. It stays out of sitemap alternates. This is a candidate for substantive, sourced content enrichment; the audit did not rewrite it or relax the gate.
- **`/ar/tag/discounter`** intentionally says `noindex` and stays out of sitemap alternates. The English topic visibly reports **11 pins** and remains indexable. The translated-topic policy requires **50 pins** (`MIN_TRANSLATED_PINS`); this is expected behavior, not an accidental Arabic-language block.
- **Examples with no current technical block:** `/tag/boston`, `/company/shenman-entertainment`, `/restaurants/saskatoon`, `/pin/4051/un-women-s-commission-adopts-its-conclusions-by-vote-for-the-first-time`, `/pin/5459/tom-clancy-s-rainbow-six-siege-launches-on-pc-and-consoles-on-1-december-2015`, `/es/pin/4809/gemini-3-8-flash-tts-and-3-8-flash-lite-tts-released`, and `/de/pin/2404/trump-greets-xi-jinping-at-joint-base-andrews`. The JSON records the complete batch.

The report's historical omission status and today's indexable HTML can coexist. This audit establishes current reachability, metadata, redirects and sitemap discovery; it does **not** establish Google's present per-URL index status or explain its selection decision. Google's documentation says to use URL Inspection for individual current index status and notes that expected blocked, alternate and duplicate URLs need not be indexed. [Google's Page indexing report documentation](https://support.google.com/webmasters/answer/7440203?hl=en).

## Scope and next work

No application code, production data, robots rules or indexing settings changed. No deployment, translation run or extra indexing request was made. The concrete content follow-up from this batch is **pin 3780**. Another **7,258 crawled-but-not-indexed URLs** remain outside this 50-URL sample; no conclusion about all of them is implied. For the 47 currently indexable URLs, a later batch can use individual URL Inspection and content/internal-link review rather than assuming a robots or metadata defect.

Read-only source reports: [robots-blocked examples](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Achronopin.com&item_key=CAMYByAC), [crawled-but-not-indexed examples](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Achronopin.com&item_key=CAMYFyAC). Saved HTML, native pin responses, sitemap, robots.txt and the audit script remain in ignored `.scrape/seo-exclusions-2026-11-21/`.
