# All-cities menu photo and review inventory

Counted 2026-11-12 from the **local** database through `/api/admin/restaurant-content` and `/api/admin/restaurant-specials` (enabled records only). Read-only; nothing was changed.

Counting rules:
- An item is counted once per record and menu label.
- "photo" means the item has `image` or `images`; "review" means it has at least one `reviews` entry.
- Ordinary menus are grouped by their guide tile's region. "(no tile region)" are menu-only profiles without a tile.
- A specials menu overrides an ordinary menu with the same label, so some items are counted in both. Treat totals as an upper bound on distinct items.
- Production was not checked, and local numeric IDs may differ from production.

```
region                        items  photo    %  review    %  venues  spec.v
sapporo                        7554    368    4       0    0      74      35
tokyo                          7107    657    9       0    0      77      41
nagoya                         4987    195    3       0    0      79      34
osaka                          4805    125    2       0    0      77      32
fukuoka                        4515    193    4       0    0      68      39
san-diego                      4379   1374   31      79    1       6     280
beijing                        1797    257   14       0    0      37      35
shanghai                       1659    328   19       0    0      50      37
(no tile region)               1656    221   13      14    0      53       0
kyoto                          1321     15    1       0    0      75      35
hangzhou                       1122    148   13       0    0      37      22
phoenix                        1080    156   14       3    0       8      59
shenzhen                       1063     13    1       0    0      41      15
miami                          1026    172   16       1    0       4      93
philadelphia                    871     93   10       3    0       6      60
guangzhou                       823     54    6       0    0      36      11
chicago                         815     82   10       7    0       5      63
dallas                          744     83   11       0    0       6      61
suzhou                          738     44    5       0    0      36       8
seattle                         729     67    9       5    0       4      56
new-york                        700    105   15       1    0       6      66
houston                         681    100   14       1    0       6      60
los-angeles                     671     89   13       9    1       5      57
austin                          613     49    7       5    0       6      58
nanjing                         609     32    5       0    0      36       3
qingdao                         581      0    0       0    0      37       2
tianjin                         578      9    1       0    0      35       3
wuhan                           537     16    2       0    0      37       3
xian                            534      0    0       0    0      36       1
busan                           530      0    0       0    0      53      10
zhengzhou                       503      0    0       0    0      36       0
harbin                          497      0    0       0    0      37       3
chengdu                         492      0    0       0    0      37       2
dalian                          480      0    0       0    0      35       2
chongqing                       479      0    0       0    0      36       1
hefei                           479      0    0       0    0      38       1
shenyang                        475      0    0       0    0      36       2
changsha                        472      0    0       0    0      36       1
ningbo                          464      0    0       0    0      37       2
san-jose                        441     13    2       1    0       6      34
sanya                           435      0    0       0    0      36       1
jinan                           434      0    0       0    0      36       3
dongguan                        424      0    0       0    0      36       1
foshan                          423      0    0       0    0      36       0
kunming                         417      0    0       0    0      36       1
xiamen                          411      0    0       0    0      35       1
haikou                          396      0    0       0    0      35       0
seoul                           364      1    0       0    0      56       6
columbus                        309     13    4       0    0       7      44
boston                          266      0    0       0    0       3      24
washington-dc                   266      0    0       0    0       6       2
san-antonio                     258      0    0       0    0       5      23
jacksonville                    256     13    5       0    0       5      21
charlotte                       241      0    0       0    0       4      12
nashville                       232      0    0       0    0       8       1
atlanta                         220      0    0       0    0       7       1
fort-worth                      207      0    0       0    0       4      29
rome                            201      0    0       0    0       3       0
madrid                          195      0    0       0    0       3       0
fort-lauderdale                 190      0    0       0    0       3       1
san-francisco                   183      0    0       0    0       8      35
honolulu                        169      0    0       0    0       6       1
edmonton                        143      0    0       0    0       3       0
barcelona                       140      0    0       0    0       4       0
las-vegas                       139      0    0       0    0       4       1
palm-springs                    133      0    0       0    0       4       1
victoria                        126      0    0       0    0       3       0
hamilton                        123      0    0       0    0       3       0
halifax                         122      0    0       0    0       3       0
london                          107      0    0       0    0       3       0
calgary                         105      0    0       0    0       3       0
vienna                          100      0    0       0    0       4       0
melbourne                        89      0    0       0    0       2       0
lisbon                           86      0    0       0    0       3       0
montreal                         83      0    0       0    0       3       0
brisbane                         78      0    0       0    0       3       0
saskatoon                        74      0    0       0    0       3       0
hong-kong                        73      1    1       0    0       5       1
paris                            72      0    0       0    0       4       0
sacramento                       68      0    0       0    0       3       1
vancouver                        61      0    0       0    0       3       0
winnipeg                         59      0    0       0    0       3       0
dublin                           58      0    0       0    0       2       0
sydney                           56      0    0       0    0       2       0
toronto                          54      0    0       0    0       3       0
taichung                         45      0    0       0    0       2       1
taipei                           42      0    0       0    0       5       1
adelaide                         39      0    0       0    0       2       0
monterrey                        39      0    0       0    0       1       0
berlin                           38      0    0       0    0       3       0
amsterdam                        36      0    0       0    0       3       0
ottawa                           34      0    0       0    0       3       0
mexico-city                      32      0    0       0    0       1       0
wellington                       31      0    0       0    0       1       0
quebec-city                      27      0    0       0    0       3       0
kaohsiung                        24      0    0       0    0       5       1
auckland                         22      0    0       0    0       1       0
christchurch                     21      0    0       0    0       1       0
copenhagen                       21      0    0       0    0       3       0
perth                            19      0    0       0    0       1       0
stockholm                         7      0    0       0    0       2       0
orlando                           2      0    0       0    0       1       1
guadalajara                       1      0    0       0    0       1       0
TOTAL 68733 5086 129 1860 1542
```


## Progress, November 12-13, 2026

Production counts after the photo and review pushes (same counting rules, enabled records, production database):

| Region | Items | With photo | % | Item rows with reviews |
|---|---|---|---|---|
| tokyo | 7,107 | 2,824 | 39 | 0 |
| sapporo | 7,554 | 1,140 | 15 | 0 |
| osaka | 4,805 | 551 | 11 | 0 |
| nagoya | 4,987 | 499 | 10 | 0 |
| fukuoka | 4,515 | 480 | 10 | 0 |
| dallas | 744 | 83 | 11 | 21 |
| houston | 681 | 100 | 14 | 13 |
| austin | 613 | 49 | 7 | 19 |
| san-jose | 441 | 13 | 2 | 14 |
| all regions | 68,733 | 9,042 | 13 | 189 |

Start of the run: 5,086 items with photos and 129 item rows with reviews. Photos were saved locally and pushed with
`syncPhotosToProd.py`; reviews with `syncReviewsToProd.py` (see the restaurant-guide-research skill, "All-cities
photo and review runs"). Doubtful photos removed before or after the push: Toroichi 超炭酸ハイボール (6), Kabutoya
おばんざい３種 and 明太子炙り, TENKU's four December mains, Jonetsu ミノ, Egoya's two weak matches.

Largest remaining photo gaps: Beijing, Shanghai, Kyoto, Shenzhen, Hangzhou, Guangzhou and about 20 other Chinese
cities (0-19% covered); Sapporo, Nagoya, Osaka, Fukuoka drinks and course-only items; venues whose sites carry no
labelled dish photos (Tabelog, Google Maps and Instagram were not tried for most leftovers). Reviews not yet
researched: every region outside the four US cities above (Columbus had no dish-specific coverage); inferred dish
scores in `src/lib/restaurantReviewRatings.ts` were not added for the new excerpts. Weak matches kept: Roost
roasted-versus-fried cauliflower, MARCH description-only matches, Barley Swine "ravioli", Adega blog quotes
(branch confirmed only by heading), Kabutoya/Toroichi leftovers listed above.

## Continuation, November 13, 2026 — local saves

This continuation updates the **local database only**. Azure photographs are publicly stored and verified;
production restaurant records have not been pushed. No translations or production deployment were run.

### Photo work

Added **932 stored item-photo associations**:

- **901 exact mirrors** from existing specials photos onto ordinary menus across 102 profiles: Beijing 257,
  Shanghai 328, Hangzhou 148, Guangzhou 54, Suzhou 44, Nanjing 32, Wuhan 16, Shenzhen 13 and Tianjin 9.
  Matches require the same branch source, menu label and item name, and all public Azure blobs were checked.
- **27 Kyoto associations**: MERCY Vegan Ramen Shijo Kawaramachi 3, Tonkatsu & Soba An 5,
  Qu’il fait bon 8 and Sumiro-man Kyoto Yodobashi 11. These use named operator cards and exact product
  pages. The 27 files contain 26 unique WebP byte hashes: An publishes the same loin-set photograph
  for its morning and dinner sections. Four pre-existing QFB specials photos were also corrected from
  whole tarts to actual slices; whole-tart variants retain their whole photographs.
- **2 Shanghai dishes** at Horse & Cow: fried river shrimp and prawn gnocchi with chilies, verified against
  Rachel Gouk / Nomfluence's [October 21 review](https://rachelgouk.com/horse-and-cow-a-little-wine-bistro-with-good-pasta/).
  A proposed squid-pasta image was removed because the saved generic cream-seafood-pasta item does not
  establish the reviewed preparation.
- **2 San Francisco dishes**: NOVY's labelled official Lamb Gyro photo and Mary Lagier's historical CA State
  Bird with Provisions photograph from [The Infatuation](https://www.theinfatuation.com/san-francisco/reviews/state-bird-provisions).
  The quail caption discloses the pictured four pieces and half/full menu variants.

Stored rows and effective coverage are different. Enabled specials override ordinary menus with the same
label. The 901 China mirrors and QFB's eight ordinary associations therefore add **no new effective
photographed dishes**. Effective photo coverage increases by **23 menu entries**: Kyoto 19, Shanghai 2 and
San Francisco 2. Four additional existing QFB entries now show the correct portion.

### Reviews and editorial estimates

Added **15 newly reviewed item rows** (13 dishes, with Lula's two dishes repeated across lunch and dinner):
Lula Cafe 4, Cariño 3, Café Ba-Ba-Reeba 1, Superiority Burger 2, State Bird Provisions 3,
Florecita's Blue Corn Concha 1 and Lolinda's Croquetas 1. Each review was checked against the original
article and branch address. Criticism is retained, including Lolinda's croquetas and Lula's polarizing pasta.
Prices, photographs, menu check dates, unrelated reviews, enabled flags and specials region slugs are preserved.

Added eight clear dish-assessment estimates in `src/lib/restaurantReviewRatings.ts`; descriptive excerpts
remain unscored. The focused rating suite passes (2 tests). These code changes are not deployed.

The previous weak-match audit retained nine supported associations and removed two ADEGA reviews:
`Lula` referred to tempura rather than the saved cilantro squid salad, and the author could not identify
`Doces` desserts from the different season. ADEGA's swordfish `Peixe` remains unscored. Roost's
[Houstonia source](https://www.houstoniamag.com/eat-and-drink/2014/01/bypassing-the-black-walnut-cafe-january-2014)
explicitly describes the signature cauliflower as both roasted and fried; both praise and criticism remain.
MARCH's named Portugal-season dishes match the saved courses. Barley Swine's liquid-shiitake filling
and scrambled eggs establish the ravioli/dumpling association. Two MARCH excerpts and one Barley
Swine excerpt were shortened; aggregate quotations now fit 25 words per article. These changes affected
no existing editorial score mappings. Review rows increase by 13 net (15 additions, 2 removals).

### Fresh local counts

The local baseline at the start of this continuation contained **68,915** counted item rows, rather than the
historical 68,733 above. This continuation did not add or delete menu items. Counts below deduplicate item
names within each stored record/menu label, matching the original inventory rule; they are not raw array lengths.

| Region | Items | Photos before | Photos after | Reviewed rows after |
|---|---:|---:|---:|---:|
| beijing | 1,797 | 257 | 514 | 0 |
| shanghai | 1,659 | 328 | 658 | 0 |
| hangzhou | 1,122 | 148 | 296 | 0 |
| guangzhou | 823 | 54 | 108 | 0 |
| suzhou | 738 | 44 | 88 | 0 |
| nanjing | 609 | 32 | 64 | 0 |
| wuhan | 537 | 16 | 32 | 0 |
| shenzhen | 1,063 | 13 | 26 | 0 |
| tianjin | 578 | 9 | 18 | 0 |
| kyoto | 1,321 | 15 | 42 | 0 |
| san-francisco | 183 | 0 | 2 | 5 |
| chicago | 815 | 82 | 82 | 15 |
| new-york | 700 | 105 | 105 | 3 |
| san-jose | 441 | 13 | 13 | 12 |
| **All regions** | **68,915** | **9,190** | **10,122** | **202** |

After source normalization and specials-label precedence, effective menus contain **55,103 item entries**:

| Effective coverage | Before | After | Change |
|---|---:|---:|---:|
| With photo | 7,973 | 7,996 | +23 |
| With review | 180 | 193 | +13 |

Effective counts describe stored menu entries after label precedence; they do not imply that every profile
has a backing pin or that every offer is currently available.

### Verification and evidence

Dry runs, fresh-revision saves and full profile readbacks passed. An independent full-inventory before/after
comparison found 119 changed profiles, all limited to item photos and reviews; unrelated profile fields,
branch sources, enabled flags and region slugs were unchanged (`main/whole-run-preservation.json`).
Local State Bird Provisions pin 6731
returns HTTP 200 with its Azure image, Food photos strip and three excerpts in the rendered HTML;
Florecita pin 6689 contains its new excerpt. Kyoto pins 15474, 15475, 15501 and 15492 render the new
photos, and MERCY's enlarged dish viewer was checked with its credit and source link. Horse & Cow pin
15175 returns HTTP 200 with the two accepted images. Hydrated browser verification for the China and
San Francisco work was blocked by a browser tab-creation error; server-rendered checks are recorded
separately from Kyoto's hydrated checks.

NOVY and Lolinda do not resolve local backing pins after exact source, title, operator-host and numeric
source-ID searches. Their profile saves do not establish native-pin coverage; exact-branch pin/opening
research remains pending. Florecita's operator shop returned a Cloudflare block and the browser fallback
could not create a tab; no pastry photo was guessed from the mixed-concha article picture.

Resumable manifests, original source HTML, contact sheets, upload JSONL, before/after snapshots and
readback checks are under `.scrape/menu-inventory-2026-11-13/{china,kyoto,reviews,main}/`.
The main inventory script and full local snapshots are in `main/`; China includes its exact mirror plans,
and Kyoto retains the rejected plain-soba picture and whole/slice repair evidence.

### Remaining research

This is a continuation batch, **not completion of all cities**. China mirrors improve storage consistency;
new-photo research beyond Horse & Cow is still pending. The 18 other mainland China cities with no
mirror candidates have not thereby been shown to lack photographs. They still need the operator,
Google Images/Maps, branch-gallery and exact-dish searches required by the research skill.

Kyoto's next concrete sources are Sukesan's chain menu, rendered/embedded Yayoiken Kyoto Kisshoin
menu data, Gyukaku Aeon Kyoto Rakunan's branch-linked `affordable.pdf`, remaining QFB seasonal products
and drinks, and exact Sumiro-man tsukune photos. Sumiro-man's saved `/foods` URL returned 404, but its
current branch home `/#food` supplied the 11 accepted named images. Generic skewer assortments and a
plain-soba photo were rejected for different portions/sets.

New York Flex Mussels and Mermaid Oyster Bar review candidates refer to previous addresses and were
not attached to the saved current branches. Original sources remain necessary for the unresearched dishes
and regions. Previous-run editorial estimates outside the eight additions above also remain to be assessed.
Translations are left to the translation agent. Production synchronization remains a separate, explicitly
requested step; wrong-photo replacements and review deletions/edits require deliberate audited round-trips,
since the additive sync scripts neither replace existing photos nor remove or update existing reviews.

## All remaining research — started November 13, 2026

Owner requested all remaining research, then said “go”; work continues beyond the earlier continuation batch.
The durable work queue is `.scrape/menu-research-all-2026-11-13/`. Its region lists cover 2,989 normalized
venue sources and 55,103 effective menu entries. At this phase's start, 47,107 effective entries lacked photos
and 54,910 lacked reviews. The five sources without a tile region are San Diego venues and are included in
the US lane. A source/HTML scan is discovery only: item ledgers explicitly retain unperformed deeper avenues,
so these passes must not be reported as all cities completed.

The US lane has inspected 1,335 original operator/menu URLs, 1,520 observed same-operator menu/gallery links
and 310 observed ordering links. Successful HTML alone does not establish dish/branch identity. Operator
background images, named card containers, embedded menu JSON and branch-linked PDF menu photos supplied
verified additions; original-source articles supply reviews. Gyu-Kaku photographs come from the operator's
US chain menu and are explicitly captioned as chain photos, with current branch menu links checked separately.
Logos, icon-only cards, wrong topping/portion photos, unrelated branch pictures and mislabelled cards were
rejected. For example RAMEN-SAN's “Kimchi” image showed beer, Sushi Roka's “Pork Gyoza” picture showed raw
seafood, and Pho Sedona reused an egg-roll image for both vegetarian and meat fillings.

China's saved Trip source pages expose public `restaurantInfo` and `listRestaurantFoodRepl` page data,
including numeric venue identity, street address, bilingual exact dish names and individual photographs.
All 715 Trip-source venues have been queried; 4,050 exact-name photo leads and 483 first-page review leads
are candidates pending individual evidence/visual checks, not accepted results. Beijing and Shanghai also
require their operator/DiningCity sources. Japan's first source pass inspected 701 pages and grouped
candidate image bytes for visual review; logos, repeated pictures assigned to different cuts/grades, incomplete
courses and wrong portions are excluded. International sources cover 215 venues and retain all pending
operator, gallery, original-review and targeted-search avenues in their item ledger.

All saves in this expanded phase remain **local only**, with Azure uploads, dry runs, current revisions and
full readbacks. Production synchronization, deployment and translations have not been run. Browser-only
research is currently constrained by CUA failing to create tabs; accessible HTTP/web/original-source work
continues. See lane ledgers, source pages, reviewed manifests, decisions, uploads and readback JSON under
`us/`, `china/`, `japan/` and `international/`. Counts will be recomputed from the database after the reviewed
batches finish; candidate counts must never be added to coverage totals.

### Expanded-phase verified checkpoint — November 13

A fresh local database snapshot records **12,766/55,103 effective entries with photos** and
**280/55,103 with reviews**: gains of **4,770 photographed entries and 87 reviewed entries** against
this expanded phase's baseline. These are database counts after ordinary/specials precedence and
same-name deduplication, rather than sums of candidate or stored association counts. Additional reviewed
batches were still saving at this checkpoint. The audit compared all pre-existing profiles and found
783 changed profiles, with **no changes outside item photos/reviews**, enabled flags or specials regions.
Evidence: `.scrape/menu-research-all-2026-11-13/checkpoint-audit.json` and the full
`main/expanded-checkpoint.json` snapshot in the earlier inventory directory.

New deeper sources include Braseros' public branch ordering-menu data (exact street-address match,
42 additional visually verified dish photos after its 12 operator-card photos) and Talkin' Tacos'
Nashville ordering menu at 135 2nd Avenue North (72 visually reviewed candidates). Their manifests retain
original labels, source URLs, portion/extra disclosures and rejected variants; save/readback completion
is recorded separately. China batch08 visually checked all 233 candidates, accepted 216 and rejected
17 mismatches/uncertainties, including shellfish presented as sipunculus jelly, poultry wings labelled
smoked fish, and fried balls labelled sea-urchin steamed egg. Japan's deliberately handled identical-name
rows added ten stored associations after verifying identical non-media fields; those do not automatically
add ten effective entries.

The older saved excerpts received 112 further editorial score estimates only where the prose contains
clear dish praise/criticism; descriptions remain unscored. Assessment evidence and reasons are in
`.scrape/menu-research-all-2026-11-13/rating-assessments.json`. The focused rating tests pass (2 tests).
Research remains open across all lanes; source-discovery passes and specific blocked browser galleries
are not exhausted evidence gaps. Production and translations remain untouched.


### Later verified saves and excerpt audit

The later checkpoint above includes China Trip batches01–15 and DiningCity saves, Japan's expanded
source/context batches, the US operator/ordering/PDF batches, and international photos/reviews. China
batch14 accepted422/453 candidates; batch15 accepted380/400. DiningCity's398 source candidates grouped
into325 unique photographs; all325 were visually inspected and544 stored menu associations were saved
using235 selected photographs, with current branch identity and street addresses checked. Multiple
stored associations and alternative photos are not counted as extra effective dishes.

The BAR Shinkai profile's nine held photos were subsequently saved and fully read back after restarting
the local development server to load the current payload limit. Its713k-character request was below
the checked-in1m limit; the old runtime still rejected it. No production restart/deploy occurred.
This nine-row save follows the numbered checkpoint and is not yet included in its totals.

The excerpt audit shortened68 stored review rows across19 profiles, preserving source links, dates,
dish identity, praise and criticism. A fresh whole-inventory audit found no non-Reddit article with more
than25 distinct quoted words across its saved excerpts. Existing score mappings were transferred to
shortened text; descriptive prose remains unscored. Evidence: `excerpt-shortening-plan.json`,
`excerpt-shortening-readbacks.json`, and rating-assessment files in the expanded-phase scratch directory.
Focused rating tests still pass (2tests).

Still pending:601 remaining Trip photo candidates after batch15; exact-item original-source review checks
(including483 Trip review leads); deeper operator/gallery/Google Images/Maps/Yelp research across the
uncovered items in all lanes. China is processing the remaining discovered photos. Japan and international
agents reached their usage limits again; their latest manifests and per-item next steps remain resumable.
CUA's browser tab creation, navigation and DOM inspection still fail, including a fresh retry; browser-only
galleries remain pending, not marked as checked or exhausted. Nothing in this report claims all remaining
research is complete. All saves are local; translation and production synchronization are left separate.

### Resumed local checkpoint — November 13, 2026

This checkpoint supersedes the outstanding-candidate counts immediately above. The saved China lane
evidence already completed Trip batch16: all 601 remaining candidates were screened, 568 saved and
33 rejected. Across the discovered Trip photo queue, 3,782 candidates were accepted, 266 rejected,
and two approved associations remain unset because identical item names need disambiguation.
The 483 first-page review leads were also screened; deeper source research remains open.

A fresh full local snapshot at resume contained **13,382 photographed and 539 reviewed effective
entries**. This continuation saved **20 additional photographed entries**, **55 review associations**
on **39 newly reviewed entries**, and corrected one independently sourced opening date:

- **Quatrefoil, Dundas:** nine previously prepared operator photos saved onto 13 dinner/lunch entries.
  Reading the operator gallery's public Load more feed through page six supplied four further exact
  photographs for five entries: halibut, blueberry tart, charcoal-grilled Selva shrimp and raspberry
  pavlova on dinner/lunch. Seven other leads were rejected for seasonal sides/sauces or ambiguous
  multi-dish captions. The blueberry image is explicitly captioned as a close-up, not a full portion.
  All 18 item photos appear in native pin 6898's server-rendered HTML. The operator's
  [About page](https://quatrefoilrestaurant.com/about/) establishes **May 2010** as its opening month;
  the incorrect October 2026 research date was replaced locally with May 31, 2010, explicitly a
  month-end placeholder, `dateConfidence: estimated`. Author, address, coordinates and other pin
  fields were preserved.
- **Nobu Madrid:** one Yellowtail Jalapeño image from its branch website, explicitly credited and
  captioned as an official chain-menu photograph. Creamy-spicy rock shrimp was not substituted for
  the saved three-sauce preparation.
- **Casa Lucio, Madrid:** one operator-credited huevos estrellados photograph from El Comidista,
  corroborated by the identical photograph's explicit dish caption in El País's April 2026 article.
  Two original minube/Gomi excerpts add shrimp praise with portion criticism and qualified praise
  for the eggs. The existing El Comidista excerpt was preserved. Both minube excerpts together
  use 22 words; dates remain null because the original page does not establish them.
- **China deeper reviews02:** 60 public review-page requests across the next 20 ranked venues
  returned 301 review records and 58 exact-name leads. All leads were screened against original
  Chinese, publisher-provided English, numeric venue identity and address. Eighteen accepted
  excerpts were saved on 13 newly reviewed entries across four profiles: Mianchao Dingcun in
  Haikou, Xiehe Fenghuang Street in Suzhou, DIAN in Wuhan, and Zhang Roasted Duck in Chengdu.
  Overcooked-tofu criticism is retained. Twelve Guiyuan leads are held because the listing names
  Chengdu Road 62 while some original reviews name 101–103, independently listed as a banquet
  venue. Seafood reviews naming Locomotive Market/Tongguling or Bawangling No. 6 were rejected
  for the saved Dingcun Haitangwan No. 2 branch.
- **China deeper reviews03:** a further 120 public page requests across 40 venues returned 808
  review records and 65 exact-name leads. Thirty-five excerpts were saved across 17 profiles on
  25 newly reviewed entries. Positive and negative assessments are retained, including average
  soufflé, disappointing mapo tofu, and worsening pan-fried buns. Six Lianhuan oyster-omelette
  leads are held because the saved venue is at Jukou Heng Alley 6 while the source API names 4.
  Yilaoma reviews explicitly naming Dongchenggen South Street 13 were rejected for the saved
  No. 17 Annex 4 restaurant. Fish-ball noodle toppings, deep-fried dumplings and shrimp-and-eel
  noodles were not transferred to standalone fish balls, pan-fried buns or shrimp-only noodles.

Fifty-two editorial estimates were added for the newly saved evaluative excerpts; descriptive
apple-duck, crab-sauce and Dongpo-pork prose remains unscored. These rating-code changes are local
and undeployed.

| Effective coverage | At resume | After this continuation | Change |
|---|---:|---:|---:|
| Menu entries | 55,103 | 55,103 | 0 |
| With photo | 13,382 | 13,402 | +20 |
| With review | 539 | 578 | +39 |

Against the expanded phase's original baseline, the current gains are **5,406 photographed entries**
and **385 reviewed entries**. These are effective menu counts after normalized branch-source joins,
specials-label precedence and same-name deduplication. Alternative photos and repeated stored
associations are not extra effective dishes.

Full before/after inventory comparison found 24 changed restaurant-content profiles, with no
changes outside item photos/reviews and no enabled/region changes. The separate Quatrefoil pin audit
found changes only to opening date, date confidence and its reasoning. All 24 native pins return
HTTP 200. Their saved item photographs and excerpts were checked in server-rendered HTML and
serialized page data; double-quoted excerpts require decoding the serialized data. This is not
hydrated UI verification: CUA tab creation still fails with `timeoutMs`, and native Chrome access
was not approved. The two focused rating tests pass. A fresh audit of 486 distinct review-source
URLs found no non-Reddit source over the 25-word excerpt budget.

Evidence: `.scrape/menu-research-all-2026-11-13/resumed-audit.json`, `resumed-native-checks.json`,
`china/deep-reviews02/`, `china/deep-reviews03/`, and the new
`international/{quatrefoil-deeper,nobu-yellowtail,casalucio}*`
manifests, source HTML, visual decisions, uploads and readbacks. Full snapshots are
`menu-inventory-2026-11-13/main/resumed-{start,after}.json`; international and China item ledgers
were updated with this continuation's saves and pending source checks.

**Remaining:** 41,701 effective entries lack photos and 54,525 lack reviews. Continue the per-item
operator/detail/gallery, original-review and targeted Google Images/Maps/Yelp avenues in all lanes;
the discovered Trip photo queue is dispositioned, but no region is exhausted. Resolve the two duplicate
photo placements and Guiyuan's per-review street-address identity before attaching those candidates.
At this local checkpoint, production synchronization, deployment and translations had not been run.
The subsequent production push is recorded below; translations remain with the translation agent.

## Production synchronization — November 13, 2026 — complete

The owner explicitly requested that all ready work be pushed to production, including deployment of
the rating code. The rating release **4aac0b2f5fd0992dc57b7810883d661a03096aaa** was built successfully
on GitHub and deployed through `npm run deploy`; no build was run on the VM. The standby was warmed,
the application was verified, and the standby was stopped normally. The production homepage and
`/api/main` return HTTP 200.

The audited content plan covers **1,040 production profiles** matched by exact branch source and
record kind: **7,141 photo additions**, **four photo replacements**, **479 review additions**,
**65 review updates** (64 excerpt edits and one source publication date), and **two review removals**.
All 5,906 distinct image URLs passed public Azure checks. No missing branch/item matches or unresolved
sync conflicts were found. Duplicate-name rows are updated only when counts and identifying fields match.
Existing production prices, menu dates, enabled flags, regions and unrelated fields are preserved.

Quatrefoil's 18-photo pilot passed its production API readback and native-page check. Its opening month
was corrected separately to estimated May 2010, preserving author, title, address and coordinates.
The four Qu’il fait bon Kyoto slice-photo replacements and both ADEGA excerpt removals are already
verified on production. The Coppa Osteria review date is explicitly checked against the original
Infatuation article's October 24, 2023 publication date.

All **1,040 profiles are saved and verified**, with no failed readbacks. A fresh full production
snapshot exactly matches the approved media/review changes. The audit found **zero content
mismatches, zero changes outside item photos/reviews, and zero enabled/region changes**. The
separate Quatrefoil pin audit confirms changes only to its date, confidence and supporting reasoning.
All 486 distinct review-source URLs pass the 25-word aggregate excerpt-budget check.

| Production effective coverage | Before sync | After sync | Change |
|---|---:|---:|---:|
| Menu entries | 55,103 | 55,103 | 0 |
| With photo | 7,973 | 13,402 | +5,429 |
| With review | 180 | 578 | +398 |

Eight live native pages passed HTTP 200 checks for their photos, Food photos strips and excerpts:
Quatrefoil 6898, Casa Lucio 6846, Nobu Madrid 6867, Xiehe 14457, Zhang Roasted Duck 14500,
DIAN 14752, Mianchao Dingcun 14942, and Qu’il fait bon Kyoto 15501. These checks cover
server-rendered HTML and decoded serialized page data; hydrated browser verification remains blocked
by the CUA errors recorded above. Initial cold Quatrefoil and Nobu page checks were slow. Final warm
checks returned HTTP 200 in **0.63 seconds for the homepage**, **0.50 seconds for `/api/main`**, and
**0.36 seconds for Quatrefoil**. The deployed rating file matches commit `4aac0b2` exactly; the two
focused rating tests and GitHub image build passed.

The durable plan, complete before/after snapshots, public-blob checks, deployment log and readbacks
are under `.scrape/menu-inventory-prod-sync-2026-11-13/`. Final evidence includes `final-audit.json`,
`prod-after.json`, `native-checks.json`, and the separate Quatrefoil pin snapshots. Held and
unresearched candidates were excluded; the remaining research queue above is still open.
Translations remain with the translation agent.


## November 14 local continuation

This run continues the open research queue. It does not complete all-city coverage. Production remains
at the November 13 checkpoint; no production synchronization, deployment or translations were run.

| Effective local coverage | Before | After | Gain |
|---|---:|---:|---:|
| Menu entries | 55,103 | 55,103 | 0 |
| With photos | 13,402 | 13,405 | 3 |
| With reviews | 578 | 600 | 22 |

**Reviews:** 120 public original-branch API requests across the next 40 ranked China venues returned
64 exact-name leads. All 64 were screened against original Chinese, publisher English, source venue
identity and saved street address. Saved 34 excerpts across 15 local profiles, including qualified or
negative assessments of stone-pot tofu, seafood freshness, and worsening steamed buns. Nine leads are
held: JiuLong's saved Dagu Road 6 conflicts with the API's 7; Pearl Restaurant's saved Zhenzhu Lane 9
conflicts with Taijian Lane 17. General venue praise, unmatched preparations, untranslated prose and
mixed-branch accounts were not attached. Thirty-one clear assessments received editorial estimates;
three descriptive or generic excerpts remain unscored. These rating-code changes are undeployed.

**Photos:** Sukesan Kyoto Katsura's exact branch still links the autumn B menu. All eight PDF pages
were inspected. Two new, visually verified set photographs were extracted from page 3 and saved with
operator chain-menu credits: the exact mini meat-gobo udon/katsutoji/botamochi combination, and a
representative mini set whose pictured choices are stated. Six other reviewed images were already
present and were preserved. The PDF does not establish a different portion from its pictured one;
ordinary fries were not transferred to doubled fries, and curry/udon toppings were not substituted for
standalone cutlets. The remaining exact-item/gallery/Google Images/Maps/Yelp avenues stay pending.

Both held WEI JIA Liangpi photo associations are now resolved locally. The refreshed exact-branch
public food records distinguish food ID 7766364 at CNY 11 and food ID 7756129 at CNY 5; these match the
two saved same-name rows uniquely. Each photograph was visually inspected, uploaded to Azure and
saved by source, menu label, name **and matching price**, without changing prices or other row fields.
Both stored photos count as only one effective photographed entry after same-name deduplication.

**Historical reconciliation:** the fresh local San Diego snapshot exactly matches all retained photo
and review fields in the November 13 final audited production snapshot: 4,386 enabled menu rows,
1,382 with cover images, four with image galleries, and 82 with reviews; zero field mismatches.
Fifteen current lane0/lane3 associations were folded into the main replay catalog, preserving the later
shortened excerpts. Its 93 entries and the legacy lane0 entry point dry-run to zero changes locally.
The legacy entry point delegates to the main replay to avoid reviving stale excerpts.

One original lane0 candidate remains specifically unresolved: Tracey C.'s Hula pie excerpt is absent
from local data and the audited production snapshot. The old replay keyed replacements only by URL;
Tracey and Frank shared the same Yelp URL, so Frank was the retained review. Tracey was not silently
restored: verify the original review, establish distinct identity and reconcile the shared-URL quote
budget first. The Guiyuan and Lianhuan historical address gaps remain held after further source searches.

**Verification:** complete current-revision profile readbacks and the whole-inventory preservation
audit pass for all 17 changed profiles, with no non-photo/review changes and no enabled/region changes.
All 520 distinct review-source URLs pass the aggregate 25-word excerpt-budget check. The two focused
rating tests and focused ESLint pass. All 17 local native pages return HTTP 200 and contain the saved photos and review-source URLs
in their HTML/serialized data; evidence is in `nov14/native-checks.json`.

Native Chrome now permits partial hydrated verification despite the tab API's `timeoutMs` failure.
Quatrefoil's Food photos strip opens the halibut viewer with its photograph, full caption and original
Instagram credit; Next dish replaces the photograph and credit with Brome Lake Duck Breast. Casa
Lucio's Huevos estrellados viewer shows its photograph, source credit, El Comidista praise and minube
qualified criticism, with their separate inferred-rating labels. Multi-photo within-dish gallery controls
and landing-tile viewers still need a hydrated check; native browser focus changed during this session.

Evidence is under `.scrape/menu-research-all-2026-11-13/nov14/`, with review API records, decisions,
quotes and full readbacks in `china/deep-reviews04/`. The China and Japan per-item ledgers were updated.
Full snapshots: `menu-inventory-2026-11-13/main/nov14-{start,after}.json`.

**Remaining local gaps:** 41,698 effective entries without photos and 54,503 without reviews. No region
is exhausted. New content, ratings and replay changes remain local; translations stay with their agent.


### Further November 14 continuation — local only

A second researched batch adds **17 effective photographed dishes** and **30 newly reviewed dishes**.
Local coverage is now **13,422/55,103 with photos** and **630/55,103 with reviews**. The combined
November 14 gains against the unchanged November 13 production checkpoint are +20 and +52.

The next 40-venue China pass made 120 public review-page requests, discovered 85 exact-name leads,
and screened every lead against original prose, publisher English and saved branch address. Saved
39 excerpts on 14 profiles. Retained bland/oily crispy-chicken criticism and salty drunken-crab criticism
alongside praise. One original-English cheesecake review was used directly, with an original-English
provider label; it was not falsely described as a publisher translation. Twenty-six leads remain held:
Wuliguan's review cluster includes Wulidun Middle Street 99 while the saved branch is Yingkang Road
4-1; Zheng Huang Qi's API omits the saved 17-2 unit; two Lao Wei excerpts contain duplicated scraped
text/ad fragments and an embedded publication date requiring original-review reconciliation. Other
rejections include an abalone preparation, beef plate tendon versus generic tendon, general venue
assessments, absent English translation, duplicate prose and reviews naming a small shop with a move.

APOC COFFEE Hakata Chikushiguchi gained five exact-dish cover photographs and a pasta close-up gallery
image: two operator launch cheesecake photographs and three named dishes from TABERY's exact-branch
September 17 preview. Historical seasonal availability and separately pictured drinks remain explicit.
Three very short original-Japanese tasting excerpts were saved for the preview dishes, without hand
translation; together they contain 25 Japanese characters, conservatively below the source quote budget.
The photograph credit is 博多あや. / TABERY. Coffee remains without a confidently identified photo.

BONTEMPS Minamihorie gained eight individually labelled operator photographs for four twisted donuts
and four drinks, credited as chain-menu photographs from the exact-branch launch release. The two
Halloween drink entries still need exact-photo research. Neo Nice Burger Kyoto Teramachi gained
four photo associations from its explicitly position-captioned five-burger launch photograph. Each
caption identifies the target burger's position, names the others and excludes them from the saved
item price. No expired opening discount was reactivated.

Five L’ATELIER L’ARCHESTE Ginza food photographs were visually checked and held: the loose sweets,
unlabelled flavours and cheesecake slice do not establish the saved pack sizes or cut sizes. The
operator-linked shop returned HTTP 429; a working browser is the next step. Kyoto Yayoiken desserts
were already covered; Gyukaku's remaining portions were not substituted from covered variants.
These checks do not establish that any restaurant or region is exhausted.

This batch saves **42 review associations and 18 photo associations across 17 profiles**, with full
current-revision readbacks. Seventeen additional photo associations close effective gaps; the extra
pasta view adds variety rather than a new dish. Thirty-seven further clear editorial estimates are
ready locally; five descriptive China excerpts remain unscored. All 17 native pages return HTTP 200
and contain the saved photos and review-source URLs. Whole-inventory preservation found no changes
outside photos/reviews and no enabled/region changes. All 560 review-source URLs pass the aggregate
excerpt audit; focused rating tests and ESLint pass.

Evidence: `.scrape/menu-research-all-2026-11-13/nov14b/` (including `final-audit.json`,
`native-checks.json`, source HTML, visual decisions, manifests, Azure upload metadata and full readbacks)
and `china/deep-reviews05/`. China and Japan item ledgers include the new saves and holds. Full snapshots
are `menu-inventory-2026-11-13/main/nov14b-{start,after}.json`.

Hydrated multi-photo and landing-viewer checks remain open: native Chrome rejected navigation when
browser focus changed; the proposed local tab was not available for binding, and isolated in-app
browser creation reported that `iab` is unavailable. None is counted as a successful hydrated check.

**Remaining local gaps:** 41,681 entries without photos and 54,473 without reviews. No production sync,
deployment or translation run occurred. The separate translation agent retains that work.


### Third November 14 continuation — local only

Added **35 review associations and 11 photo associations across 14 profiles**. Effective local
coverage is now **13,433/55,103 with photos** and **652/55,103 with reviews**: +11/+22 this pass,
and +31/+74 against the unchanged November 13 production checkpoint. November 14 cumulative saves
are 111 review associations and 33 photo associations across 48 distinct profiles.

China review pass `deep-reviews06` inspected 83 exact-dish leads across 64 review URLs and saved
32 associations on 12 profiles. Praise and criticism are both retained, including oily eggplant,
fishy shrimp, overpriced rice wine, tough beef offal, disappointing steak and ordinary meat zongzi.
Five associations use short original Chinese excerpts, explicitly labelled as such; the others use
the publisher's English translation. Descriptive fried-bun texture, soup contents and chopped
pig-trotter texture remain unscored. Thirty-six leads are held, chiefly identity conflicts:
Lotus Pavilion versus Soo He 1929 within the Nanyuan Hotel; JinGangShan's saved Zhongshan Road
252-2 versus API 250 (plus another barbecue business named in one review); Mingting's Annex 15
versus explicit Annex 16; and MOUSTACHE seafood reviews naming Xiangshuiwan 3, Train Head or
other stalls instead of the saved Dingcun Haitangwan 2. Fifteen other leads were not selected for
specific assessment, variant, duplication or quote-budget reasons. No uncertain identity was saved.

Yaba Misen Matsuzakaya Nagoya gained eight exact-dish photos: official chain photographs for
Taiwan ramen and stir-fried greens, plus six photographs from Nagoya Jouhou Tsu's firsthand
September 30 branch preview. Credits and captions distinguish chain photography from the branch
preview. The peach buns show the saved two-piece portion. Almond soft serve is a historical menu
illustration, not a reactivated opening gift. Gluten-free substitution and Taiwan minced-meat
steamed bun still lack verified photos; the photographed offal dish called kobukuro was not
substituted for chawanmushi. Three short original Japanese excerpts cover curry, chawanmushi and
soft serve (36 Japanese characters combined, conservatively below the 25-word source budget).
The chawanmushi's salt/spice description remains unscored.

Mr. Fish Sapporo gained three photo associations from the operator's explicitly Mr. Fish branded
launch composite: fish and chips, fish burger and churros. Each caption discloses other dishes
and multiple units as styling, without promising portion sizes or included extras. Nearby
Matsu restaurant lamb photographs were excluded, and Hokkaido milk soft serve remains uncovered.
Q Ramen/Ryoriya and PAIRING × HOKKAIDO release images were inspected but provide logos, chef,
architecture or interiors rather than identified dishes. Operator follow-up food announcements,
branch social galleries and firsthand reports remain specific next steps; neither is exhausted.

Twenty-eight additional editorial estimate keys are ready locally, giving 96 across the three
November 14 passes. They represent interpretations of quoted dish opinions, not publisher ratings.
Full current-revision API readbacks and the whole-inventory preservation comparison pass: no
changes outside photo/review fields, enabled states or specials regions. All 590 saved review-source
URLs pass the distinct-excerpt aggregate quote audit. All 14 affected native restaurant pages
return HTTP 200 and contain the expected saved photos and review-source URLs in server-rendered
HTML. These checks do not claim hydrated interaction verification. The two focused rating tests,
ESLint and diff whitespace checks pass.

Evidence: `.scrape/menu-research-all-2026-11-13/nov14c/` (`final-audit.json`, `native-checks.json`,
source HTML, visual source inventories, photo/review manifests, Azure upload metadata and readbacks),
`china/deep-reviews06/`, and full snapshots
`.scrape/menu-inventory-2026-11-13/main/nov14c-{start,after}.json`. China/Japan ledgers were refreshed
with saves, identity holds and concrete next steps.

**Remaining local gaps:** 41,670 entries without photos and 54,451 without reviews. The overall
queue and hydrated gallery/landing-viewer checks remain open. No production synchronization,
deployment or translation run occurred; translations remain with the separate translation agent.


### November 14 owner-requested production data sync

Pushed all three reviewed November 14 batches through the authenticated restaurant management APIs:
**111 review additions, 32 cover-photo additions and one gallery-photo addition across 48 profiles**.
Exact source, record kind, menu label and item matching found zero conflicts or missing production
records. Duplicate-name rows retained their identifying fields and separate verified photographs.
All 28 distinct public Azure images passed preflight. A pilot venue was saved and its public native
page verified before bulk saves. One 502 followed a completed save; a fresh GET and complete expected
profile comparison established that it was already synced, without a duplicate write.

Full API readbacks and a fresh whole-production snapshot confirm the exact planned result, with no
changes to unrelated data, enabled states or specials regions. All 590 review-source URLs pass the
aggregate excerpt budget audit. A fresh plan converges to zero remaining operations, conflicts or
unmatched records. Production coverage now matches the audited local result:

| Effective menu coverage | November 13 | November 14 production | Change |
| --- | ---: | ---: | ---: |
| Menu entries | 55,103 | 55,103 | 0 |
| With photos | 13,402 | 13,433 | +31 |
| With reviews | 578 | 652 | +74 |

All 48 affected public native pages returned HTTP 200 and contained their saved photo URLs and
review excerpts: 303 distinct-per-page photo URL checks and 149 distinct-per-page excerpt checks.
This verifies server-rendered/serialized content, not hydrated interactions. Gallery and landing-viewer
interaction checks remain queued. The data push did not deploy code; the 96 November 14 editorial
estimate keys remain separate code work. No translation run was performed.

Evidence: `.scrape/menu-inventory-prod-sync-2026-11-14/` contains the exact operation plan, public blob
preflight, pilot/live-page checks, complete per-profile before/after readbacks, production snapshots,
`retry-results.json`, `final-audit.json`, `convergence.json` and `native-checks.json`.
Remaining effective gaps are 41,670 photos and 54,451 reviews; the specific research queue remains open.


### Fourth November 14 continuation — researched and synced to production

Inspected 32 review leads across 25 source URLs on the next 20 China venues. Saved **11 review
associations on five profiles**: Zhong dumplings, Pan Sun Shi garlic pork, GLITTERING grilled eel,
Jiang You Ji beef fried rice and Luban Zhang scallion sea cucumber. Exact saved/API street addresses
match. One shrimp-cake account remains held because it names Huangcuo Beach while the saved Hao Shi
Lai branch is on Hubin South Road. Twenty other leads were not selected: menu lists, generic venue
praise, hearsay, ambiguous publisher translations, and differing dishes such as sea-urchin wontons
versus plain sea urchin or ribs rice versus standalone ribs. All excerpts use the publisher's English
translation, checked against the original Chinese. Eleven additional editorial estimate keys are
ready locally; there was no code deployment or translation run.

Saved **28 photo associations across four profiles**, using 12 distinct operator photographs:
Comenocoto Tenjin's five labelled rice balls in both the English and Japanese menu sections, plus
matching saves in its overriding specials menus (20 associations); Niku to Tamago Shimbashi's three
labelled omurice dishes (three ordinary-menu associations); and new eight's daikon, hamaguri, bottled
craft beer and two position-captioned broth-shochu drinks (five associations). New eight's existing
game-skewer photograph was preserved. The shared drink and beer photographs disclose the other
pictured drink/food and do not promise extras or portion counts. Avocado-salsa omurice was not used
for garlic-tomato variants, and side/topping portions were not inferred.

Sanrio House Nagoya's initial release contains merchandise rather than useful food photographs.
Following the saved menu URL found the October 15 detailed branch-menu release, but the three
four-character menu images and limited Hello Kitty crepe image are illustrations, not photographs.
All four were inspected and held; no illustration closed a photo gap. Original branch food photos
through operator social galleries and firsthand reports remain the next steps.

This batch touched nine profiles and increases effective coverage by **15 photographed entries and
five reviewed entries**. Comenocoto's specials saves make its photos visible; Niku to Tamago's existing
specials photos already won over the newly filled ordinary rows. Production and local coverage now
match at **13,448 photos and 657 reviews out of 55,103 entries**. Since the November 13 checkpoint,
the four November 14 passes have saved 122 review associations and 61 photo associations across
57 profiles, closing 46 effective photo gaps and 79 effective review gaps.

The production plan found no conflicts or unmatched records. All 12 new Azure URLs passed public
preflight; a pilot profile and native page passed before the remaining saves. Full current-revision
readbacks, whole-inventory preservation and all 601 aggregate review-source quote budgets pass.
A fresh comparison converges to zero pending changes. Nine profile-specific native checks across
eight distinct public pins pass (72 photo URL checks and 16 excerpt checks). Native verification now
uses the visible merged menu after enabled specials precedence; hidden ordinary-menu media are
verified through API readbacks instead of falsely requiring them in rendered HTML. These checks
verify server-rendered/serialized content, not hydrated interactions. Two focused rating tests,
ESLint and scoped diff whitespace checks pass.

Evidence: `.scrape/menu-research-all-2026-11-13/nov14d/`, `china/deep-reviews07/`, snapshots
`.scrape/menu-inventory-2026-11-13/main/nov14d-{start,after}.json`, and
`.scrape/menu-inventory-prod-sync-2026-11-14d/` (plan, public blobs, pilot, full readbacks, production
snapshots, final audit, convergence and native checks). China/Japan item ledgers retain the saves,
source checks and specific next steps. Remaining effective gaps: **41,655 photos and 54,446 reviews**.
The broader research queue and hydrated gallery/landing-viewer checks remain open. The 107 November 14
editorial estimate keys remain separate code work; translations remain with the translation agent.


### Fifth November 14 continuation — researched and synced to production

The next 20 China venues produced 22 exact-dish review leads across 20 source URLs. Saved **15 review
associations across seven profiles**, retaining criticism of hard soy-sauce rice-noodle rolls alongside
praise for oysters, seafood fried rice, lamb skewers, crispy Wenchang chicken, beef tripe, soup
dumplings, beef potstickers, braised prawns and cold noodles. All saved/API branch addresses match,
and original Chinese was checked against the publisher's English translation. The two Bali dish
associations from one account share a single short excerpt within its aggregate budget. Fourteen
additional editorial estimate keys are ready locally, including a lower estimate for the hard rolls.

One Ma Xiangxing lead naming downstairs Huiwei Food Court is held for outlet correspondence. Six
other candidates were not selected: a specifically grilled oyster preparation without matching saved
preparation evidence; three accounts discussing peanuts as fish-skin ingredients rather than a
standalone order; a mixed wonton/duck-oil-cake account whose assessment is not isolated; and a
cold-noodle pairing statement that refers back to garlic crayfish. No candidate was converted into
a stronger or more specific claim than its source supports.

Saved **36 photo associations across four profiles**, using **21 distinct operator photographs**:
three named simmered-fish components at Shokudo Hitonitachi; 15 individually labelled donut varieties
at JACK IN THE DONUTS Tenjin Underground Mall, saved in ordinary and overriding specials menus;
and three regular-size tsukemen variants at Rokurinsha Nagoya Station platform 1. Fish captions
explain that rice, soup, small dishes and pickles are outside the close-up. Donut captions explicitly
identify chain product photography and do not reactivate the opening coupon. Tsukemen pictures
preserve regular, seasoned-egg and deluxe identities; frozen take-home noodle and pork products
were excluded. Small original operator press images were retained without claiming extra native
resolution. Silver flounder, mentaiko variants, drinks, shrimp tsukemen, large portions and separate
toppings still need their own precise photographs. An unlabelled complete breakfast-set photo was
held rather than guessing its fish. Twenty-five downloaded source images were visually inspected.

The batch touches 11 profiles and closes **21 effective photo gaps and 10 effective review gaps**.
Production and local now match at **13,469 photographed entries and 667 reviewed entries out of
55,103**. The five November 14 passes total 137 review associations and 97 photo associations across
68 profiles, improving effective coverage by 67 photos and 89 reviews since November 13.

All 21 public Azure URLs passed preflight. The production plan had no conflicts or unmatched records;
a pilot profile and its updated visible menu were checked before the remaining saves. Full profile
readbacks, fresh whole-production preservation, aggregate excerpt budgets across 615 source URLs
and zero-operation convergence pass. Native verification applies specials precedence and checks
new pilot data from its saved readback. Public checks verify serialized/server-rendered content,
not hydrated gallery interaction. Two focused rating tests, ESLint and scoped whitespace checks pass.
The restaurant research skill now records the visible-menu and pilot-readback verification rules.
All 11 profile-specific public checks across 10 distinct pins passed, including expected photo URLs
and review excerpts.

Evidence: `.scrape/menu-research-all-2026-11-13/nov14e/`, `china/deep-reviews08/`,
`.scrape/menu-inventory-2026-11-13/main/nov14e-{start,after}.json`, and
`.scrape/menu-inventory-prod-sync-2026-11-14e/` (plan, blob checks, pilot, full readbacks, snapshots,
final audit, convergence and native checks). China/Japan ledgers retain source checks, saves,
rejections and next steps. Remaining gaps: **41,634 photos and 54,436 reviews**. The 121 November 14
editorial estimate keys remain separate code work; no deployment or translation run occurred.


### Sixth November 14 continuation — researched and synced to production

Inspected exact-dish Trip.com leads for eight China profiles and added **27 review associations**.
The saved excerpts retain both praise and criticism, including a low assessment for West Lake
vinegar fish, mixed opinions about Tianjin jianbing, and portion criticism for pork intestines.
Original Chinese and publisher translations were checked together; street-address identity was
verified, including Chongqing Xiao Peng Fei Chang Ji's Trip.com branch address. Five descriptive
excerpts without an explicit assessment were left unscored. Editorial estimates are derived from
the excerpt and remain distinct from publisher ratings. The sixth continuation adds 22 local
estimate keys.

Added **41 photo associations** from three Japanese operator press releases, using **29 distinct
public Azure images**: eleven Randy's Donuts Solamachi products, sixteen Tou Sakae menu items, and
six Gindaco Highball Sakaba Kita24 images. Eight Randy's items were mirrored into its enabled,
overriding specials profile. Captions identify chain product photography and distinguish menu items,
optional upgrades, portions, and foods or drinks appearing together in composite images. The ended
Randy's giveaway is identified as historical, with no offer reactivated. Tou's cold variant image
was omitted where it conflicted with the warm dish heading; a precise photograph remains a gap.

Production and local effective coverage now agree at **13,498 photographed entries and 683 reviewed
entries out of 55,103**. This pass closes 29 photo gaps and 16 review gaps; since the November 13
checkpoint, the five November 14 continuations have added 138 photo associations and 164 review
associations and closed 96 effective photo gaps and 105 effective review gaps. Remaining effective
gaps are **41,605 photos and 54,420 reviews**. The profile plan had no conflicts or unmatched
records. All 29 public image blobs passed preflight; a pilot write/readback and native page check
passed before the remaining production saves. Full profile readbacks and a fresh whole-inventory
comparison show no non-media review changes or quote-budget violations. The aggregate budget audit
covers 638 review-source URLs. A fresh sync plan converges to zero operations.

All 12 profile-specific native checks across 11 distinct pins returned HTTP 200 and verified 90
photo URLs and 31 review excerpts in server-rendered/serialized content. This does not verify
hydrated gallery interactions. The 143 November 14 editorial estimate keys remain local code work;
no production deployment or translation run occurred. Translations remain with the translation
agent.

Evidence: `.scrape/menu-research-all-2026-11-13/nov14f/` (source inventories, visual photo review,
review/photo manifests, readbacks, final audit and China/Japan ledgers),
`.scrape/menu-inventory-2026-11-13/main/nov14f-{start,after}.json`, and
`.scrape/menu-inventory-prod-sync-2026-11-14f/` (plan, Azure preflight, pilot, full readbacks,
production snapshots, final audit, convergence and native checks).


### Seventh November 14 continuation — exact-dish review sync

Inspected the next 20 ranked China branches and reviewed 11 Trip.com review leads. Saved **seven
exact-dish review associations** on five profiles: LEI GARDEN's lobster bisque with rice and crispy
roasted pork belly, Weijia's seafood pancake, Zhi Coffee's Americano and cheesecake, HUAZHUSHIFU's
garlic beef cubes, and Taolin's Kung Pao chicken. Original Chinese was checked against Trip.com's
English rendering; the original and translated records remain in the evidence manifests. The
Hangzhou pork-belly account was held because it conflicts with LEI GARDEN's Shenzhen branch. The
review mentioning spicy beef noodles was held because the saved dish is standalone spicy beef.
Buffet lists without dish-specific assessment were not used.

Visually inspected **118 Trip.com exact-branch dish-image candidates** from the same 20 branches.
The 113 candidates with a valid dish match already had effective photos, so no duplicate image
associations were added. The five remaining images were held: a whole duck for a sliced-duck item,
an unclear lamb-offal loaf image, plated fish for a packaged fish gift box, a tea-style photograph
for a latte, and a noodle image that does not establish sea urchin. Those five menu entries stay in
the photo queue with exact next steps to seek matching operator or branch-gallery images.

Production and local coverage now match at **13,498 photographed entries and 690 reviewed entries
out of 55,103**. This review-only pass adds seven review associations; cumulative November 14 work
now totals 171 review and 138 photo associations, closing 96 effective photo gaps and 112 effective
review gaps from the November 13 checkpoint. Remaining effective gaps are **41,605 photos and
54,413 reviews**. The five-profile plan had no conflicts or unmatched records. Full readbacks,
whole-inventory preservation, the aggregate quote budget across 645 source URLs, and zero-operation
convergence all pass.

All five affected public pages returned HTTP 200 and contained the saved review excerpts in
server-rendered/serialized content. The profile API readbacks preserve all other fields. These checks
do not verify hydrated gallery interactions. Seven new editorial estimates remain local code work;
no production code deployment or translation run occurred. Translations remain with the separate
agent.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews10/` (20-branch candidate set,
API review pages, original and translated excerpts, selection/rejection decisions, all 118 visual
image decisions, local full-profile readbacks and audit), `.scrape/menu-inventory-prod-sync-2026-11-14g/`
(plan, pilot readback, full production readbacks, snapshots, final audit, convergence and native
checks), and `.scrape/menu-inventory-2026-11-13/main/nov14f-after.json` (pre-pass audited baseline).


### Eighth November 14 continuation — exact-dish review and photo sync

Reviewed 34 Trip.com review leads across the next 20 ranked China branches. Saved **15 exact-dish
review associations across seven profiles**, including salt-and-pepper mantis shrimp; three separate
pan-fried bun reviews; large shrimp dumplings; both criticism and praise for Tao Tao Ju's chilled
sweet-and-sour pork; Xiao Li's crab-roe soup dumplings and Qianlixiang wontons; Peking duck; and
Shaanxi mutton soup. The Xiamen XIAN XIONG QI review accounts that state Longhushan Road 557 were
held because the saved branch is at Houjiangdai Road 29. Semi-finished soup dumplings cooked at home,
generic recommendations and combined meal assessments were not attached to individual dishes.
Original Chinese and Trip.com's English renderings are retained in the evidence.

Visually checked the four Trip.com photos for menu items still without a saved image. Saved three
exact-branch images for whole roast duck, Sipunculus jelly and sheep brain. The fourth, a composite
dessert-like photo for a generic Chinese tofu entry, was held because it does not clearly identify
that dish. The source listing does not identify the photographers; captions disclose Trip.com listing
provenance and avoid claiming the images were taken at the branch.

Production and local coverage now match at **13,501 photographed entries and 699 reviewed entries
out of 55,103**. The batch adds 3 photo and 15 review associations, closing 3 effective photo gaps
and 9 effective review gaps; six added reviews belong to items already counted as reviewed elsewhere
in the merged menus. Across eight November 14 passes, the total is **141 photo associations and 186
review associations**, closing **99 photo gaps and 121 review gaps** since the November 13 checkpoint.
Remaining effective gaps are **41,602 photos and 54,404 reviews**.

All three public Azure blobs passed preflight. The production plan had no conflicts or unmatched
records; a pilot write/readback and native page passed before the remaining changes. Full profile
readbacks and the fresh whole-inventory audit show only the planned image/review changes, no
over-budget excerpts across 660 source URLs, and zero pending operations after sync. All eight
affected public pages returned HTTP 200 and verified 49 photo URLs and 25 review excerpts in
server-rendered/serialized content. This does not verify hydrated gallery interactions.

Fourteen editorial estimate keys were added locally, bringing the November 14 total to 164. They
remain code changes; no production code deployment or translation run occurred. Translations remain
with the separate translation agent.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews11/` (20-branch candidate set,
review API pages, source translations, selection/hold decisions, four visual photo checks, Azure
uploads, local profile readbacks, item-ledger updates and audit), `.scrape/menu-inventory-prod-sync-2026-11-14h/`
(plan, Azure preflight, pilot readback, full production readbacks, snapshots, final audit, convergence
and eight native-page checks), and `.scrape/menu-inventory-prod-sync-2026-11-14g/local-after.json`
(pre-pass audited baseline).


### Ninth November 14 continuation — large exact-dish review and photo sync

Reviewed 46 Trip.com review leads across the next 40 ranked China branches. Saved **28 exact-item review associations from 24 distinct review sources across 10 profiles**. The batch adds specific praise and criticism for molten lava buns, seafood tofu, duck blood vermicelli soup, sauna fish, Thai shrimp cakes, fresh duck blood, salted duck, stir-fried shrimp, square rice cake, sea-urchin tofu, Taihuang tofu, Shunde boneless fish, pan-fried rice rolls, gourd chicken and mini roujiamo. The excerpts are present verbatim in the publisher's English rendering and total no more than 25 words per source. Generic venue praise, list-only dish mentions, ambiguous fish comparisons and promotional copy were screened out; the original Chinese, publisher translations and selection decisions remain in the manifests.

Reconciled 78 named-photo candidates exposed by Trip.com for 13 of the 40 branches against the current item inventory. Visually inspected three candidates still apparently uncovered by the first name match. Saved two new exact-item images: Plum Garden's squirrel-shaped mandarin fish and CHENG DU CHI KE's steamed shrimp. The Maijiazhuang giant river prawn candidate already had a verified image on a duplicate row with a different Chinese rendering, so it was not overwritten. Both new Azure blobs passed public download and media-type checks; source credit and exact-branch listing provenance are recorded.

Production and local coverage now match at **13,503 photographed entries and 714 reviewed entries out of 55,103**. This round adds 2 photo and 28 review associations, closing 2 effective photo gaps and 15 effective review gaps; the other 13 new review associations attach to menu items already counted as reviewed in a merged menu. Across nine November 14 passes, totals are **143 photo associations and 214 review associations**, closing **101 photo gaps and 136 review gaps** since the November 13 checkpoint. Remaining effective gaps are **41,600 photos and 54,389 reviews**.

The production sync plan had no conflicts or unmatched records. The pilot and its native page passed before the remaining writes. Full readbacks show only planned media changes; the whole-inventory audit has no content mismatch, no non-media changes, no over-budget excerpts across 684 source URLs, and zero pending operations. All 11 affected public pages returned HTTP 200 and verified 70 photo URLs and 36 review excerpts in server-rendered/serialized content. This does not verify hydrated gallery interactions.

Twenty-seven exact-dish editorial estimate keys were added locally, bringing the November 14 total to **191**. They remain code changes; no production deployment or translation run occurred. Translations remain with the separate translation agent.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews12/` (40-branch candidate set, review API pages, source translations, selection/hold decisions, three visual photo checks, Azure uploads, local profile readbacks and item ledger); `.scrape/menu-inventory-prod-sync-2026-11-14i/` (production plan, Azure preflight, pilot, full readbacks, snapshots, final audit, convergence and 11 native-page checks); and `.scrape/menu-inventory-prod-sync-2026-11-14h/local-after.json` (pre-pass local baseline).

### November 15 continuation — two research batches, synced to production

Resumed the next 80 ranked China branches (`deep-reviews13` and `deep-reviews14`, rank ranges
`[340:380]` and `[380:420]`). Retrieved three public review pages per branch and manually inspected
57 exact-dish leads against their original Chinese and publisher English. Saved **31 review
associations across 15 profiles**, retaining praise, criticism of burnt and limp beef buns, and a
complaint about jianbing affordability. Original-language branch-address readbacks resolve the
awkward English Houtang address and confirm Halal JinTongJi's Jiankang Road 185 location. Generic
recommendations, ingredient-only matches and size-ambiguous fish accounts were held. Grange Grill's
review mentioning Third Ring Road remains held for correspondence with the saved Shenzhen outlet.

Visually inspected all **34 named-photo candidates still uncovered in these branches**. Only five
passed: Ming Xuan's Wenchang chicken, Long Quan Ren's coconut juice, Mu De Lao Zhou Jia's sesame
flatbread, the Dongguan hotel restaurant's grilled steak, and Authentic Baoluo Noodles' shrimp
dumplings. Fresh exact-branch food IDs and source images were checked before saving. Source-language
Trip.com responses can use a different CDN hostname for the same image: byte comparison confirmed
the three second-batch originals were identical. All five Azure uploads passed public download and
byte checks. Captions disclose companion food, multiple glasses/dumplings, and unresolved serving
counts without altering prices or offers.

The other 29 photos remain held. Examples include white buns labelled as black lava buns, bivalves
labelled as whelks, a green soda bottle labelled as Bingfeng orange soda, raw hotpot beef labelled as
stir-fried beef, and red soup labelled as soy pudding. Named listing records are discovery leads;
visual mismatch overrides the label. Those items retain exact rejection reasons and further
operator/detail-page, Google Images/Maps and Yelp steps in the ledger. No region is exhausted.

The combined local change touches **18 profiles** and closes **five effective photo gaps and 24
effective review gaps**. After enabled-specials precedence and same-name deduplication, local
coverage is **13,508 photographed entries and 738 reviewed entries out of 55,103**, leaving
**41,595 photo gaps and 54,365 review gaps**. The seven other review associations belong to dishes
already counted as reviewed. Production was not written; its last verified November 14 checkpoint
remains 13,503 photos and 714 reviewed entries.

Full current-revision readbacks and a whole-inventory comparison match an expected after-state
constructed from the exact approved manifests. There are no unexpected media changes, no other
profile changes, no enabled/region changes and no quote-budget violations across **711 source URLs**.
Review and photo replays converge to zero changes. All **18 affected local native pages** returned
HTTP 200 and verified **99 photo URLs and 43 review excerpts** against their visible merged menus.
These are server-rendered/serialized checks. Hydrated within-dish and landing-tile checks remain
open: the CUA tab creation API still fails with `timeoutMs`, and native Chrome focus changed during
the Por Favor attempt. The temporary verification tab was closed.

Added **26 editorial estimate keys locally** for explicit dish praise/criticism; the swan pastry
presentation comment and jianbing affordability comment stay unscored. Both focused rating tests
and ESLint pass. No production deployment or translation run occurred; translations remain with
the translation agent.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{13,14}/` contains review pages,
source-language addresses, source excerpts, all selection/hold decisions, visual photo evidence,
uploads and complete local profile readbacks. `deep-reviews13/final-audit.json`, `native-checks.json`,
`new-estimates.json` and `ledger-update.json` record combined verification. Fresh inventory snapshots
are `.scrape/menu-inventory-2026-11-13/main/nov15-{start,after}.json`. The item ledger preserves prior
notes and updates 864 entries, with all 57 review decisions matched. Resume ranked range `[420:460]`
after `deep-reviews14`, including both new manifests in saved-review/source exclusions.

**Production sync completed November 15 after the owner's standing instruction:** push verified, ready
data after every research round without asking again. This supersedes the earlier per-round request
requirement for this menu photo/review work; code deployment and translations remain separate.

Synced all **31 review additions and five photo additions across 18 production profiles**, matched
by exact branch source, record kind, menu label and item name. The fresh plan had no conflicts or
unmatched records. All five public Azure URLs passed preflight; the pilot profile's full readback
and updated native page passed before the remaining saves. A fresh whole-production snapshot
matches the planned after-state with no unrelated profile, enabled-state or region changes. All
**711 source quote budgets** pass, and the final comparison converges to **zero operations or
conflicts**. All **18 affected production native pages** returned HTTP 200, verifying **99 photo URLs
and 43 excerpts** after enabled-specials precedence. These checks cover server-rendered/serialized
content; hydrated gallery checks remain open as described above.

Production and local now agree at **13,508 photographed entries and 738 reviewed entries out of
55,103**, with **41,595 photo gaps and 54,365 review gaps** remaining. New editorial estimates remain
local code changes; this data sync did not deploy code or run translations. Production evidence:
`.scrape/menu-inventory-prod-sync-2026-11-15/` (fresh plan, public-blob checks, pilot, complete
readbacks, whole-inventory snapshots, final audit, convergence and native-page checks). The China
item ledger marks the 29 distinct affected item keys as verified on production. The standing
instruction is recorded in `AGENTS.md`, the restaurant research skill and `ToDo.md`.

### November 15 second round — 89 branches, ready data synced to production

Worked the remaining **49 branches in the 20+ review group**, then the next **40 branches with
5–19 published reviews**. Requested public review pages 1–3 for all 89 branches. This completes
the current high-review group's first-three-page discovery pass, not the independent-source or
deeper-review research. The 12 new exact-item leads produced **10 review associations across seven
profiles**, including osmanthus rice cakes, seafood pasta, steam-pot chicken, seafood platter,
clams, scallops and tiramisu. A mushroom-hotpot affordability complaint and a historical change
from a two-tier to one-tier seafood platter, with missing oysters, were retained unscored. They
do not assert current prices or availability. A descriptive soup passage and venue-wide praise
followed by a chicken-frame order list were held for clearer dish-specific assessment.

Original Chinese and publisher English were inspected together. Fresh source-language branch
addresses match the saved locations. Shared clams/scallops praise uses one identical short
excerpt across both items, remaining within its aggregate source budget. Seven new editorial
estimate keys assess explicit dish opinions; they remain local code changes.

Inspected **33 uncovered named-photo candidates** and saved **four photographs**: De Chao's garlic
shrimp over vermicelli in a clay pot; Crab's minced-pork-and-basil rice; Liu Chang Xing Gulou's
wontons in fish broth; and shiitake mushrooms shown in Xiyuan Temple's noodle bowl. Captions
identify egg/cucumber/crackers, separate steamed dumplings, or noodle-bowl companions and do not
promise those extras or a serving count. Exact branch and food IDs were freshly retrieved; the
fresh source image bytes matched the inspected originals. All public Azure uploads passed byte
and media checks. De Chao's current listing adds unit 004 at the same Hong Kong Middle Road 65
location; it does not conflict with the saved plaza address.

The other **29 photo candidates remain held** for specific mismatches or ambiguity: examples
include raw beef labelled as roasted lamb, wedges/fries swapped, raw clams labelled as spicy
stir-fried snails, scallops labelled as abalone, a rectangular pastry labelled as swan-shaped,
and a bottled drink labelled as freshly squeezed coconut juice. A full-size check resolved two
initially unclear candidates: the clay-pot photo visibly contains vermicelli beneath the shrimp,
and the basil-rice photo shows minced pork with egg/crackers rather than added seafood. The
ledger retains every decision and further operator/detail-page and branch-gallery search step.

The combined change touches **11 profiles**, adding **10 review associations and four photos**
and closing **eight effective review gaps and four photo gaps**. Production and local now agree
at **13,512 photographed entries and 746 reviewed entries out of 55,103**, leaving **41,591 photo
gaps and 54,357 review gaps**. Two review additions are extra accounts for the same seafood
platter and do not close additional effective item gaps.

The production plan had no conflicts or unmatched records. Four public blobs passed preflight;
the pilot save, full readback and updated native page passed before the remaining saves. Fresh
whole-inventory snapshots match the planned after-state, preserving all unrelated profile fields,
enabled states and regions. All **720 aggregate source quote budgets** pass. Local replays and
the final production comparison converge to **zero changes, conflicts or unmatched records**.
All **11 local and 11 production native-page checks** returned HTTP 200 and verified **57 photo
URLs and 11 review excerpts per environment** after specials precedence. These checks cover
server-rendered/serialized data; hydrated gallery work remains open. The two focused rating
tests, ESLint and scoped whitespace checks pass. No code deployment or translations were run.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{15,16}/` retains review API pages,
source-language addresses, original and translated passages, decisions, original photos, fresh
food records, Azure uploads and local profile readbacks. `deep-reviews15/` also contains the
combined final audit, local native checks, seven new estimate keys and ledger checkpoint.
`.scrape/menu-inventory-prod-sync-2026-11-15b/` contains the production plan, preflight, pilot,
full readbacks, snapshots, audit, convergence and native checks. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15b-{start,after}.json`. The ledger updates 1,032 entries,
matches all 12 review decisions and marks 12 distinct new item keys as verified on production.
Resume the 5–19 review group at `[40:80]`, including `deep-reviews15` and `deep-reviews16` in the
saved-review/source exclusions. All regions remain open for independent sources and exact photos.

### November 15 third round — normalized Chinese discovery, 40 branches synced

Worked rank slice `[40:80]` in the 5–19-review group. The old candidate matcher required four
characters and did not normalize traditional/simplified Chinese, missing short dish names and
matching original reviews against a different character form. Re-scanning the same retrieved
pages with OpenCC normalization and short aliases produced **39 candidates from 31 review sources,
versus five initial candidates**. Only discovery text is normalized: original Chinese, publisher
English and saved excerpts remain unchanged. OpenCC is isolated in ignored research tooling,
with no product dependency added. The skill records the method and manual-screening requirements.

Saved **22 review associations across 15 profiles**, including praise and criticism for Hainan
noodles, tofu balls, braised pork bones, pan-fried tofu, pork-offal congee, gabacai, oily beef
noodles, bland mock crab, steamed chicken feet, roasted squab, fish head, salted crab, mantis
shrimp, chicken, pork jowl, sizzling beef, tea, roast goose and Liaobu beef. Two excerpts remain
in their original Chinese where the publisher's English misnames the preparation. Shared-source
quotes for chicken/skewers and beef/goose stay within aggregate budgets. A skewer-quality complaint
is retained without a taste score. Twenty-one explicit dish opinions received local editorial
estimate keys. Both focused rating tests and ESLint pass.

The 17 held review associations include a roll explicitly bought at Ding Ji rather than the saved
Zhengweizhai, miancha discussed among surrounding breakfast shops, taro-filled versus plain pineapple
buns, crab-bone paste versus crab bones, and several generated English names that conflict with
their original preparation. The Haiwei Shijia account naming a Benwei outlet is held for exact
correspondence with the current Jiachang Caiguan Mingzhouli name; the original-language listing
confirms the Haiwei Shijia brand and saved address, but does not by itself resolve that suffix.
Fresh source-language street addresses were retained for all 16 branches with review candidates.

Visually inspected all **17 uncovered named-photo candidates** and saved four: Lishi's fried dough
cake, Su Xiang Xing's crab roe/fat, Shunxingde's lamb with pocket breads, and Island Beer House's
garlic oysters. Captions distinguish the crab bowl from noodles/prawns and the oyster plate from
other dishes/drinks, and do not invent serving counts. Fresh exact-branch food IDs and image bytes
match the inspected originals; all four Azure blobs passed public download and media checks.
Thirteen other photos remain held for mismatched species, cooking method, missing noodle portions,
unresolved fillings or ambiguous cuts. No photo was saved solely on a short alias match.

The combined round touches **17 profiles**, adding **22 review associations and four photos** and
closing **21 effective review gaps and four photo gaps**. One extra review assesses a tofu dish
already newly counted in this round. Production and local agree at **13,516 photographed entries
and 767 reviewed entries out of 55,103**, leaving **41,587 photo gaps and 54,336 review gaps**.

The production plan had no conflicts or unmatched records. Public-image preflight, the pilot's
complete readback and updated native page, and all remaining profile saves pass. Fresh whole-
inventory snapshots contain exactly the approved image/review changes, preserve enabled states,
regions and unrelated profile fields, and pass all **740 aggregate source quote budgets**. Local
replays and production comparison converge to zero changes. All **17 local and 17 production
native-page checks** returned HTTP 200 and verified **105 photo URLs and 28 excerpts per
environment**, applying specials precedence. These are server-rendered/serialized checks; hydrated
gallery work remains open. No deployment or translation run occurred.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews17/` contains both discovery
versions and candidate sets, retrieved review pages, source-language addresses, original/publisher
text, all review/photo decisions, fresh food records, inspected photos, Azure uploads, full local
readbacks, rating checkpoint, preservation audit and native checks. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15c-{start,after}.json`. Production plan, preflight, pilot,
full readbacks, snapshots, audit, convergence and native checks are in
`.scrape/menu-inventory-prod-sync-2026-11-15c/`. The ledger updates 565 entries, matches all 39
review decisions and marks 25 distinct affected item keys as verified on production. Resume
the 5–19 group at `[80:120]`, excluding saved sources from `deep-reviews17`. Earlier cached
batches also need the normalized-alias discovery pass; independent sources and exact photos
remain pending in every region.

### November 15 fourth round — 40 more branches, ready data synced

Worked the next 40 branches in the 5–19-review group, rank slice `[80:120]`, using normalized
traditional/simplified Chinese and short dish aliases. Manually inspected **22 candidates from
18 review sources** and saved **15 review associations across nine profiles**. The excerpts retain
praise for mango pomelo sago, soup dumplings, scallion-braised sea cucumber, spicy chicken,
truffle noodles, Wenchang chicken, kelp/mung-bean soup and chicken mousse. They also retain a
cold-abalone complaint, a mixed oily-mousse opinion and an average assessment of crispy rice
with pork. The bean-paste fritter appearance comment is unscored. Fourteen dish-opinion estimate
keys remain local code; the two focused rating tests and ESLint pass.

Original Chinese and publisher English were inspected together, with fresh source-language
addresses retained for all ten branches with review leads. Two excerpts use original Chinese:
one is a presentation comment and the other avoids the publisher's incorrect soup wording for
chicken mousse. Hui Ji's account explicitly names a Huangxing South Road Pedestrian Street
branch while the current original-language listing is IFS Guojin at Sujia Lane; it remains held
for outlet correspondence, with no missing English translation invented. The other held leads
are venue pitches/lists or comments omitted to keep the shared source within its quote budget.

Inspected **21 uncovered photo candidates** and saved **three photographs**: Wan Yuan Guanqian
Street's egg dumplings and thin noodles, and Nanjing Restaurant Yingbin Road's red rice rolls.
The yellow dumplings, lower-left noodle bowl and rear roll plate are explicitly located in their
captions; other photographed food is excluded and serving counts are not promised. Nanjing's
photo source is **Yingbin Road 238**, distinct from the reviewed **Guitang River branch**. Exact
source/food-ID matching preserves that distinction. Fresh food records and image bytes match
the inspected originals; all three Azure URLs passed public download and media checks. The
other 18 candidates remain held for mismatched dishes, ambiguous species/ingredients, missing
noodle/rice portions, or blurry preparations.

The round touches **11 profiles**, adding **15 review associations and three photos** and closing
**12 effective review gaps and three photo gaps**. Additional accounts of sea cucumber and chicken
mousse explain the three reviews beyond newly covered item counts. Production and local agree
at **13,519 photographed entries and 779 reviewed entries out of 55,103**, leaving **41,584 photo
gaps and 54,324 review gaps**.

The production plan had no conflicts or unmatched records. Image preflight, pilot/full readbacks,
the pilot native page and all remaining saves pass. Fresh whole-inventory audits preserve all
unrelated profile fields, enabled states and regions, and pass all **755 source quote budgets**.
Local replays and final production comparison converge to **zero changes**. All **11 local and
11 production native-page checks** returned HTTP 200 and verified **58 photo URLs and 19 excerpts
per environment**, applying enabled-specials precedence. These are server-rendered/serialized
checks; hydrated gallery work remains open. No deployment or translations were run.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews18/` contains review pages,
source-language addresses, original/publisher text, all decisions, fresh food records, visually
inspected photos, uploads, local readbacks, rating checkpoint, preservation audit and native checks.
Local snapshots are `.scrape/menu-inventory-2026-11-13/main/nov15d-{start,after}.json`.
`.scrape/menu-inventory-prod-sync-2026-11-15d/` contains the production plan, preflight, pilot,
full readbacks, snapshots, audit, convergence and native checks. The ledger updates 391 entries,
matches all 22 review decisions and marks 15 affected item keys as verified on production.
Resume the 5–19-review group at `[120:160]`, including `deep-reviews18` in saved-source exclusions.
Earlier normalized-alias rechecks and independent photo/review sources remain pending.

### November 15 fifth round — final low-review branches and normalized rechecks

The remaining 5–19-review rank slice `[120:160]` contained **21 branches**, producing two new
review leads. Added a normalized recheck of the first **20 high-review branches**, using earlier
page caches for discovery; this produced 41 further leads. In total, inspected **43 associations
from 33 review sources across 41 branches** and selected **26 review associations across 13
profiles**. Before production, all selected review IDs and exact excerpts were confirmed again
against freshly fetched public Trip.com original/publisher text, with fresh responses retained.
The restaurant skill now requires this final fresh check for cached discovery runs.

New excerpts cover roast duck, truffle/egg pizza, sturgeon, soup dumplings, okra/scallops, barbecue,
red-bean double-skin milk, cabbage, salt-baked snails, fish-head rice, clay-pot tofu, duck tendons,
pickled-radish tripe, cured-meat rice and chicken. Shared-source excerpts stay within aggregate
budgets. A coffee-supply complaint and a puff-value comment are retained unscored; no current
availability or price is inferred. Twenty-one explicit dish-opinion keys were added locally.
Several sources have no publisher English: their original Chinese is retained without inventing
a translation. Both focused rating tests and ESLint pass.

Seventeen review candidates remain held. Longxiyuan's account explicitly locates its meal at
**Qinling Road 16**, conflicting with the saved **Shantou Road 5** branch. Other holds include
untasted dumplings, bare dish lists, ingredient/variant substrings, a supplement advertisement
without food assessment, venue-wide nostalgia, and pastry lists whose actual assessment concerns
cheese bread. Fresh source-language listing names/addresses were retained for all 15 branches
with candidates; these never override a contradictory address within an individual account.

Inspected **23 photo candidates** and saved **four photographs**: Silver Pot's orange-peel beef,
AMANO's truffle/onsen-egg pizza, Jiangjun Xinyang Road's listed 清酒 bottle, and Zhi Ci Yi Jia's
quail eggs. Full-size inspection matters: Silver Pot's unusual hot-stone photograph itself labels
the dish `橙皮牛肉配蘸碟`, while the pizza's central egg is visible in the original. The rice-wine
caption identifies the pictured Lotte 清河 bottle and cup without implying a whole-bottle serving;
the raw-egg ingredient photo distinguishes the eggs from the meat and mushrooms. All exact food
IDs and fresh image bytes match the inspected originals. Four public Azure uploads pass download
and media checks. Nineteen other candidates remain held for mismatched species, missing meal
components, unclear variants or different preparations.

The combined round touches **14 profiles**, adding **26 review associations and four photos** and
closing **19 effective review gaps and four photo gaps**. Multiple independent accounts of the
same dishes explain the seven reviews beyond newly covered item counts. Production and local
agree at **13,523 photographed entries and 798 reviewed entries out of 55,103**, leaving **41,580
photo gaps and 54,305 review gaps**.

The production plan had no conflicts or unmatched records. Public-image preflight, pilot and
complete readbacks, pilot native verification and all remaining saves pass. Fresh whole-inventory
audits match only the approved image/review changes, preserve unrelated fields, enabled states
and regions, and pass all **777 source quote budgets**. Local replays and production comparison
converge to **zero operations or conflicts**. All **14 local and 14 production native-page checks**
returned HTTP 200 and verified **123 photo URLs and 36 excerpts per environment**, after specials
precedence. These are server-rendered/serialized checks; hydrated gallery work remains open.
No code deployment or translations were run.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{19,20}/` retains review pages,
fresh original-language addresses, all selection/hold decisions, inspected originals, fresh food
records, Azure uploads and complete local readbacks. `deep-reviews19/` includes combined audits,
local native checks, 21 estimate keys, the ledger checkpoint and `fresh-review-verification.json`
covering all 26 selected associations. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15e-{start,after}.json`. Production evidence is in
`.scrape/menu-inventory-prod-sync-2026-11-15e/` (plan, preflight, pilot, full readbacks, snapshots,
audit, convergence and native checks). The ledger updates 606 entries, matches all 43 decisions
and marks 22 distinct affected item keys as verified on production.

Resume normalized rechecks of the 20+ group at `[20:40]`, including both latest manifests in
saved-source exclusions. The current 5–19 group's first-three-page discovery pass is worked,
but its first 40 branches still need normalization. Independent sources, deeper reviews,
1–4-review venues and the precise photo gaps remain open; no region is exhausted.

### November 15 sixth round — 20 normalized branch rechecks, synced

Rechecked high-review rank slice `[20:40]`, manually inspecting **43 dish leads from 31 review
sources** across 20 branches. Selected **30 review associations across ten profiles**, including
eel sushi, vinegar pork, shrimp-filled lychee, rice cake, cumin meat, eggplant, fish, abalone rice,
pot-lid barbecue, beef noodles, crispy chicken, eel, squirrel fish, fried shrimp, clay-pot vegetables
and lotus root, beef tendon/brisket, pumpkin, prawns, chicken feet and maocai duck. Multiple accounts
of the same dishes close **24 effective review gaps**. Praise and criticism remain separate; the
shrimp criticism is retained in original Chinese rather than the publisher's shrimp-paste wording.

Shared-source excerpt budgets were checked before saving, including three distinct short excerpts
for lychee/rice cake/cumin meat and three for beef/eel/pumpkin. Original Chinese also avoids the
publisher translating tender braised beef (`很烂`) as “very bad,” and avoids misnaming lotus-root
preparations. Twenty-seven new dish-opinion estimate keys remain local code. The two focused
rating tests and ESLint pass.

Thirteen review candidates remain held: chain-wide restaurant guides, availability/reputation lists,
an explicitly untasted chicken-giblet dish, general city popularity or venue praise, and two false
English substring hits (`eel` inside `feeling`). The actual Guiyuan chicken account contains no
contradictory street address; its fresh source-language listing matches the saved Chengdu Road 62
branch. Earlier Guiyuan accounts explicitly naming 101–103 remain held.

Fresh source-language names/addresses were retained for all 11 branches with candidates. All **30
selected review IDs and exact excerpts** were re-fetched before saving. One Minleyuan review was
absent from fresh pages 1–3 and found on page 4. The verifier now records all per-branch results
before asserting completion, so a missing account does not cancel other branches' checks. The
skill records pagination and short-English-alias precautions.

Inspected **11 photo candidates** and saved **one image** for Guiyuan's named cucumber segments
with dressing. Full-size inspection resolves their shape and preparation; the exact food ID and
fresh image bytes match. The fresh branch listing confirms Chengdu Road 62, and the caption does
not invent a serving count or add an ingredient claim. The Azure upload passes public download
and media checks. Ten other images remain held, including two nuggets for a five-piece item,
unresolved dessert variants, raw meat for a braised dish, sushi for tamagoyaki, unshredded chicken,
white strips for duck blood, and preparations whose required components are not established.

The combined round touches **ten profiles**, adding **30 review associations and one photo** and
closing **24 effective review gaps and one photo gap**. Production and local agree at **13,524
photographed entries and 822 reviewed entries out of 55,103**, leaving **41,579 photo gaps and
54,281 review gaps**. Six additional review accounts assess dishes already newly counted this round.

The production plan had no conflicts or unmatched records. Public-image preflight, pilot and full
readbacks, the pilot native page and all remaining saves pass. Fresh whole-inventory preservation
matches exactly the approved additions, with no unrelated profile, enabled-state or region changes.
All **798 aggregate source quote budgets** pass. Local replays and the final production comparison
converge to **zero operations or conflicts**. All **ten local and ten production native-page checks**
returned HTTP 200 and verified **80 photo URLs and 44 excerpts per environment**, after specials
precedence. These checks cover server-rendered/serialized data; hydrated gallery work remains open.
No deployment or translation run occurred.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews21/` contains discovery caches,
fresh review pages through page four, exact-ID verification, original-language addresses, all
review/photo decisions, inspected images, fresh food records, Azure upload, full local readbacks,
27 estimate keys, preservation audit, native checks and ledger checkpoint. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15f-{start,after}.json`. Production plan, preflight,
pilot, full readbacks, snapshots, audit, convergence and native checks are in
`.scrape/menu-inventory-prod-sync-2026-11-15f/`. The ledger updates 395 entries, matches all 43
review decisions and marks 25 affected item keys as verified on production. Resume normalized
high-review rechecks at `[40:60]`, excluding `deep-reviews21` saved sources. The earlier lower-review
normalization gaps and independent photo/review sources remain pending; no region is exhausted.


### November 15 seventh round — 20 normalized branch rechecks, synced

Rechecked high-review branch ranks `[40:60]` using traditional/simplified Chinese aliases and
English word boundaries, excluding previously saved source associations. Inspected 53 review
leads and eight original food photographs across 20 branches; updated 370 resumable ledger items.
Freshly verified all 36 accepted review IDs/excerpts across ten branches and the exact branch,
food ID and downloaded image bytes for four accepted photos. All source-language addresses match
the saved branches. Held 17 review leads and four photo candidates with explicit reasons.

Manual aliases recovered two omitted negative assessments: JiaSan's beef soup dumplings and
Zi Zhou Lou's deboned-fish congee. Retained roast-goose criticism alongside praise. Descriptive
and comparative excerpts remain unscored; 30 new editorial estimate keys stay in local code.
Used original Chinese for the red-bean/glutinous-rice-ball tofu pudding because publisher English
misidentifies rice balls as meatballs. Aquarium stingray references describe animals rather than
a meal and are held for saved-menu identity research. No unsupported menu deletion was made.

Saved photographs show Kunming Huayi Xianyan's Boston lobster, Yushifandao's pork-belly nest,
YiLaoma's chilled rice cake and Zi Zhou Lou's traditional steamed fish head. Captions disclose
separate companions and serving limits; the small lobster source retains its native resolution.
Rejected ambiguous tiramisu, fish labelled as lamb leg, toast/meat labelled as crispy rice, and
unresolved green strips labelled as romaine with sesame paste. Azure files remain outside Git.

Pushed **36 review associations and four photos across 11 production profiles**, closing
**23 review gaps and four photo gaps**. Production and local now agree at **13,528 photographed
entries and 845 reviewed entries out of 55,103**, leaving **41,575 photo gaps and 54,258 review
gaps**. Full-inventory audit verifies exact intended profiles, unchanged non-media fields,
enabled flags and specials regions, and all **825 aggregate source quote budgets**. Public-image
preflight, pilot save/native check, complete readbacks and zero-operation convergence passed.
All 11 affected production native pages passed effective-menu SSR/serialized-data checks,
covering 77 photo URLs and 42 distinct excerpts across those pages. These checks do not claim
hydrated gallery interaction; that remains pending with browser control unavailable.

The two focused rating tests and lint passed. No code deployment or translation run occurred.
Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews22/` holds decisions, manifests,
fresh responses, readbacks, visual files, quote checks and the local audit;
`.scrape/menu-inventory-prod-sync-2026-11-15g/` holds production plans, pilot checks, all readbacks,
whole-inventory audit, convergence and native-page evidence. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15g-{start,after}.json`.

Next: continue normalized high-review rechecks at `[60:80]`, excluding `deep-reviews22` saved
sources. The first 40 branches of the earlier 5–19 group still need normalization. Independent
operator/Google/Yelp source work, 1–4-review venues and recorded branch/variant holds remain open;
no city or region is exhausted.


### November 15 eighth round — 20 normalized branch rechecks, synced

Rechecked high-review branch ranks `[60:80]`, excluding previously saved review sources.
Inspected 51 review leads and ten original photographs across 20 branches; updated 365 ledger
items. Freshly verified all **32 selected review associations across 12 branches** against the
exact review IDs and original/publisher text. Source-language branch addresses match the saved
profiles. Held 19 review leads and six photo candidates with specific evidence gaps.

Retained ordinary noodle criticism, the potsticker reviewer's reported shrimp in a dish named
vegetarian, and the scallion-oil noodles' authenticity criticism. Cost-only, descriptive and
comparative excerpts remain unscored. Twenty-six new editorial estimate keys stay local. Held
Yan Xitang's explicitly named Jinan CBD review rather than copying it to Jinju Alley. Also held
shrimp-added Pianerchuan and shrimp/eel noodle variants instead of attaching them to plain rows,
and used the separate Republican-era rabbit row when the reviewer named that preparation.

Yong Shang Ming Zao's original reviews explicitly identify the saved English “king crab” dish as
crispy egg tofu; its photo also shows tofu. The lizardfish translation conflicts with tofu fish/
Bombay duck, and Lao RenYi's pork-strip translation conflicts with its halal identity. These
remain menu-identity research gaps; this round did not rewrite items without direct menu proof.

Four verified photos show Upper Kitchen's pesto mushroom/chicken pasta, Kiku's garlic scallops,
and Kuiyuanguan's Three-Delicacy Noodles and yellow-croaker noodles. Captions exclude separate
oysters, drinks and side dishes, and distinguish source-screenshot historical pricing from the
current menu. Fresh exact food IDs, branch addresses and downloaded image bytes match the
visually inspected originals. Held unrelated skewers, ambiguous beef knee bone, tofu labelled
king crab, unresolved Lotus Pond preparation and strips labelled as green beans. Photos stay in
Azure and ignored research files, outside Git.

Pushed **32 review associations and four photos across 14 production profiles**, closing
**22 effective review gaps and four photo gaps**. Production and local agree at **13,532
photographed entries and 867 reviewed entries out of 55,103**, leaving **41,571 photo gaps and
54,236 review gaps**. Full-inventory checks found no content mismatches or unrelated changes;
non-media fields, enabled flags and specials regions were preserved. All **854 aggregate source
quote budgets**, public-image preflight, pilot/native verification, full readbacks and
zero-operation convergence passed. All 14 affected native pages passed effective-menu
SSR/serialized-data checks covering 111 photo URLs and 54 excerpts. Hydrated gallery interaction
remains pending; these checks do not claim browser interaction coverage.

The two focused rating tests and lint passed. No code deployment or translation run occurred.
Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews23/` contains decisions, fresh
source responses, manifests, visual evidence, readbacks and local audit;
`.scrape/menu-inventory-prod-sync-2026-11-15h/` contains the production plan, pilot, readbacks,
whole-inventory audit, convergence and native checks. Local snapshots are
`.scrape/menu-inventory-2026-11-13/main/nov15h-{start,after}.json`.

Next: normalized high-review rechecks at `[80:100]`, excluding this batch's saved sources. The
first 40 branches of the 5–19 group still need normalization. Independent operator/Google/Yelp
research, 1–4-review venues and specific branch/variant/identity holds remain open. No region
is exhausted.

### November 15 ninth round — 20 normalized branch rechecks, synced

Rechecked high-review branch ranks `[80:100]`, excluding previously saved review sources.
Inspected 63 review leads and seven original photographs across 20 branches; updated 353 ledger
items. Freshly re-fetched all **29 selected review associations across 10 branches** and verified
each excerpt against the exact review ID. Source-language branch addresses match the saved profiles.
Held 34 review leads and six photo candidates with specific reasons.

Held encyclopedic Huixian Lou descriptions copied into reviews, generic "all delicious" dish lists,
repeat-order mentions with no assessment, an unsold sweet potato, and a review calling Pao Luda a
spicy drink (identity conflict with the saved dish). JiuLong (Dagu Road 6 vs 7) and Pearl Restaurant
(Zhenzhu Lane 9 vs Taijian Lane 17) stay held under the standing address conflicts. Retained
critical assessments: too-sweet nine-turn intestines, plain scallion pastry, too-sweet snow bean
paste, overcooked pan-fried trio meat and merely standard gourd chicken. Twenty-eight new editorial
estimate keys stay in local code.

One verified photo shows Feng Tian's fruit-wood roast duck with pancakes, cucumber and sauce; the
caption discloses that sides may be separate. Held offal rings labelled duck blood curd, unlabelled
beef slices, a tofu-like piece, grilled fish labelled sweet potato, a scallop pan labelled shrimp and
a multi-dish collage. The photo stays in Azure, outside Git.

Pushed **29 review associations and one photo across 10 production profiles**, closing **20
effective review gaps and one photo gap**. Production and local agree at **13,533 photographed
entries and 887 reviewed entries out of 55,103**, leaving **41,570 photo gaps and 54,216 review
gaps**. Public-image preflight, pilot save/native check, complete readbacks, whole-inventory
preservation, all **878 aggregate source quote budgets** and zero-operation convergence passed. All 10
affected native pages passed SSR/serialized-data checks (74 photo URLs and 45 excerpts); hydrated
interaction remains pending. The focused rating tests and lint passed. No code deployment or
translation run occurred.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews24/` and
`.scrape/menu-inventory-prod-sync-2026-11-15i/`; local snapshots `nov15i-{start,after}.json`.

Next: normalized high-review rechecks at `[100:120]`, excluding this batch's saved sources.

### November 15 tenth round — 40 normalized branch rechecks (large run), synced

Rechecked high-review branch ranks `[100:140]` (40 branches, double the usual slice) with the discovery
script now excluding every earlier batch's saved sources and review IDs by glob. Inspected 72 review
leads and 11 original photographs; updated 674 ledger items. Freshly re-fetched the accepted excerpts:
one (DIM DOU DUK's golden-sand red rice roll criticism) no longer appears in the 17-page branch listing,
so it was removed from the local profile and never reached production. The remaining **26 review
associations across nine branches** verified against exact review IDs, and source-language addresses
match the saved branches. Held 46 review leads and ten photo candidates.

Held Zheng Huang Qi and Wuliguan under the standing address conflicts; a Yin Ji review naming its
Wenchang North Road branch; garbled or speculative text; generic dish lists; and extra reviews beyond
three per item (Riyueming sea-intestine rice, Runzeyuan coconut chicken). One verified photo shows
Ningbo Hotel's Ningbo-style smoked fish (small native resolution); ten other listing photos did not match
their dish names.

Pushed **26 review associations and one photo across 10 production profiles**, closing **19 effective
review gaps and one photo gap**. Production and local agree at **13,534 photographed entries and 906
reviewed entries out of 55,103**, leaving **41,569 photo gaps and 54,197 review gaps**. Image preflight,
pilot/native check, complete readbacks, whole-inventory preservation, all **900 aggregate source quote
budgets** and zero-operation convergence passed. All 10 native pages passed SSR/serialized-data checks
(68 photo URLs, 31 excerpts); the check now matches `<`/`>` as the page's `\u003c`/`\u003e` escapes.
Rating tests and lint pass; 26 estimate keys stay in local code. No deployment or translation run.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews25/`,
`.scrape/menu-inventory-prod-sync-2026-11-15j/`, local snapshots `nov15j-{start,after}.json`.

Next: `[140:160]`, excluding saved sources.

### November 15 eleventh round — 50 normalized branch rechecks (large run), synced

Rechecked high-review branch ranks `[140:190]` (50 branches), inspecting 68 review leads and 15 original
photographs. Freshly re-fetched all **22 selected review associations across 13 branches**; source-language
addresses match the saved branches (Feizi Xia Zhuang's saved English address translates the API's Chinese one).
Held 46 leads: Hao Shi Lai (standing branch-identity hold), descriptions, combined dish lists, other-dish
remarks and extra reviews beyond three per item. Retained criticism of bland paper-wrapped siu mai, light
shrimp noodles and a soup that dries the mouth.

One photo shows the braised chicken feet in Star of Canton's steamer (caption notes separate dishes and the
unconfirmed abalone sauce). Held or rejected 14 others: scrambled egg labelled alfalfa sprouts, whole fish
labelled fillets, tofu labelled king crab, and similar.

Pushed **22 review associations and one photo across 14 production profiles**, closing **15 effective review
gaps and one photo gap**. Production and local agree at **13,535 photographed and 921 reviewed entries out of
55,103**, leaving **41,568 photo gaps and 54,182 review gaps**. Preflight, pilot/native check, readbacks,
preservation, all **922 aggregate source quote budgets** and zero-operation convergence passed; all 14 native pages
passed SSR checks (84 photo URLs, 27 excerpts). Rating tests and lint pass; 22 estimate keys stay local. No
deployment or translations.

Evidence: `deep-reviews26/`, `.scrape/menu-inventory-prod-sync-2026-11-15k/`, `nov15k-{start,after}.json`.
Next: `[190:210]`.

### November 15 twelfth round — 50 normalized branch rechecks (large run), synced

Rechecked high-review branch ranks `[190:240]` (50 branches of the 469-branch 20+ review group), inspecting
42 review leads and 14 original photographs. Freshly re-fetched all **15 selected review associations across
eight branches**; source-language addresses match the saved branches. Held 27 leads (encyclopedic or venue
descriptions, combined lists, mismatched items, extras beyond three per item). Retained the criticism of very
small hairy crabs. Yield per round is falling as ranks sort by gap size.

One verified photo shows a matsutake-style mushroom slice in clear broth (Luban Zhang; caption discloses the
variety and portion are not established). Rejected 13 others (clam dish labelled pork, white cake labelled
pan-fried turnip cake, noodle soup labelled meat pie, and similar).

Pushed **15 review associations and one photo across nine production profiles**, closing **11 effective review
gaps and one photo gap**. Production and local agree at **13,536 photographed and 932 reviewed entries out of
55,103**, leaving **41,567 photo gaps and 54,171 review gaps**. Preflight, pilot/native check, readbacks,
preservation, all **936 aggregate quote budgets** and convergence passed; all nine native pages passed SSR checks
(56 photo URLs, 36 excerpts). Rating tests and lint pass; 15 estimate keys stay local. No deployment or
translations.

Evidence: `deep-reviews27/`, `.scrape/menu-inventory-prod-sync-2026-11-15l/`, `nov15l-{start,after}.json`.
Next: `[240:290]`.

### November 15 thirteenth round — 35 photos plus 50 branch review rechecks (large run), synced

**Photos (new all-venue sweep).** Per-slice photo discovery had stopped yielding, so this round scanned every
China Trip venue's listing photos against all 5,835 menu entries still without a photo, with traditional/simplified
normalization and substring matching, excluding the 265 image URLs already rejected in the ledger. Exact-name
matches were already exhausted (2 left); the sweep produced **68 candidates**, all visually inspected. Approved
**35** whose pictures clearly show the named dish; where the listing's own label is a fuller variant (poached
Gei Wai shrimp, rose-smoked salmon, red-wine fermented rice soup, Berry Cream Cheese soufflé pancakes, and so on)
the caption quotes that label and says portion and exact variant are not established. Rejected 33 (a promo
banner, a split hot pot labelled coconut chicken, fried rice labelled grilled fish, salmon sashimi labelled a
sandwich, one duplicate image already used on a sibling item, and similar). Fresh branch food IDs and downloaded
image bytes matched the inspected files for all 35. Photos stay in Azure outside Git.

**Reviews.** Rechecked branch ranks `[240:290]` (50 branches): 70 review leads, **18 accepted** across ten branches
(all freshly re-fetched; source-language addresses match saved branches), 52 held. Retained critical excerpts: the
merely local-specialty carp noodles and the strong-fishy-smelling Spanish seafood fried rice. Eighteen estimate keys
stay in local code.

Pushed **35 photos and 18 review associations across 43 production profiles**, adding **35 photographed entries
and 13 reviewed entries**. Production and local agree at **13,571 photographed and 945 reviewed entries out of
55,103**, leaving **41,532 photo gaps and 54,158 review gaps**. Public-image preflight (35 blobs), pilot/native
check, readbacks, preservation, all **954 aggregate quote budgets** and zero-operation convergence passed; all 43
native pages passed SSR checks (296 photo URLs, 89 excerpts). Rating tests and lint pass. No deployment or
translations.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{28,29}/`,
`.scrape/menu-inventory-prod-sync-2026-11-15m/`, `nov15m-{start,after}.json`.
Next: reviews `[290:340]`; photo sweep next needs a wider source (operator pages, Google, Yelp) since Trip listing
photos are exhausted.

### November 15 fourteenth round — 38 Hot Pepper photos (35 effective) plus 50 branch review rechecks, synced

**Photos (Japan Hot Pepper Gourmet sweep).** With Trip listing photos exhausted, this round re-read the live Hot Pepper
Gourmet menu pages (food and drink) for all 111 menus that still had uncovered items. Matching item names exactly
(Unicode-normalized) against each page's lightbox photos found **54 candidates** we had never captured; a
difference-hash check showed many were one picture shared by several items. All were visually inspected. Saved
**38** with honest captions: an oden assortment photo for daikon, egg, fried tofu, chikuwa and konjac (the caption says
the ingredient is one of several shown); the exact bottle or can label for named sake, shochu and Sapporo products
(captions say the image is a label, not a serving); the partial plum-and-cucumber pickle; the same chain-managed yakiniku
photos for three sibling branches; and a few dish photographs (gizzard, mentaiko, sweet-potato smoothie, tsukune skewers,
beef-tongue stew and nigiri, edamame, message-plate cake). Held 16: promotional price graphics, a gin logo repeated across
five items, drink-menu graphics, an ambiguous soba set, a marron smoothie shown with sweet-potato smoothies, and an item
name that appears twice in one menu (no unambiguous target). Live pages and downloaded bytes were re-verified for all 38
before upload; photos stay in Azure outside Git. Two accepted items sit in a menu a specials record overrides, so the
effective count rose by **35** rather than 38.

**Reviews.** Rechecked branch ranks `[290:340]` (50 branches): 59 review leads, **16 accepted** across 11 branches (all
freshly re-fetched; addresses match), 43 held. Retained the so-so handmade beef fried dumplings. Sixteen estimate keys
stay in local code.

Pushed **38 photo associations and 16 review associations across 22 production profiles**, adding **35 photographed
and 12 reviewed entries**. Production and local agree at **13,606 photographed and 957 reviewed entries out of 55,103**,
leaving **41,497 photo gaps and 54,146 review gaps**. Public-image preflight (38 blobs), pilot/native check, readbacks,
preservation, all **970 aggregate quote budgets** and zero-operation convergence passed; all 22 native pages passed SSR
checks (585 photo URLs, 29 excerpts). Rating tests and lint pass. No deployment or translations.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{30,31}/` (Hot Pepper page cache, candidates, sheets),
`.scrape/menu-inventory-prod-sync-2026-11-15n/`, `nov15n-{start,after}.json`.
Next: reviews `[340:390]`; further photos need operator sites beyond Hot Pepper (most remaining Japan items are PDF or
course menus without per-item images) or Google/Yelp.

### November 15 fifteenth round — Yelp dish-photo pass on non-San-Diego US venues, 123 photos synced

Per the owner's "go" on the Yelp route in the restaurant skill, this round ran the bulk Yelp matcher (inside a Chrome
tab on yelp.com, paced, no 403s) over the 22 US venues with the most uncovered food items outside San Diego
(299 US venues with at least eight uncovered food items remain queued in
`.scrape/menu-research-all-2026-11-13/yelp-us/venues.json`). Yelp's search resolved 19 of 22 businesses (Esther's Kitchen,
Gunny's Pub and Elephante did not resolve; BARA ATL resolved to a different business and was dropped; Sawa's match was a
different branch and its only caption named six dishes, so it was dropped). The matcher required every significant token of
an item in the photo caption's first segment and dropped photos claimed by two items; I then **visually inspected all 125
candidate photographs**. Approved **114** and held **11**: a salad captioned chicken liver mousse, a cheesecake captioned
chocoflan, a strawberry tart captioned lemon tart, a bone-in steak captioned Chateaubriand, a lobster roll captioned
Lobster, a mixed nigiri board captioned Madai, a tartare that looks like steak captioned tuna, and four ambiguous plates.
Captions quote the contributor's caption and disclose accompaniments or shared plates (potted beef with Yorkshire pudding,
gumbo with potato salad, boudin balls on a board, trays with sides). Items that appear twice in one menu (Lincolnshire
Caesar, Turkey) were left alone; items in two different menus received the photograph in each.

Photographs are in Azure under `restaurant-dishes/<yelp-slug>/` and credited "Yelp reviewer photo, <venue>". Venues:
Uchi Austin, Hawksmoor Boston, Bluebonnet & Thyme Dallas, Dauphine's Washington, COTE Miami, Grande Pizzeria San Jose,
Ellizabetta Washington, EggBred Phoenix, Cotto Atlanta, LUNA San Jose, BCN Houston, Kalaya Philadelphia, Escuela Austin,
Tapestry Houston, Fry Bread House Phoenix, Cattleack Dallas. Expect the usual ~10% error rate of caption matching; any wrong
image can be removed by a PUT without it.

Pushed **123 photo associations across 16 production profiles**; production and local agree at **13,729 photographed
and 957 reviewed entries out of 55,103**, leaving **41,374 photo gaps**. Public-image preflight (112 blobs), pilot/native check,
complete readbacks, preservation and zero-operation convergence passed; all 16 native pages passed SSR checks (118 photo
URLs). No deployment or translations. Evidence: `.scrape/menu-research-all-2026-11-13/yelp-us/` (dumps, rows, contact sheets),
`china/deep-reviews32/`, `.scrape/menu-inventory-prod-sync-2026-11-15o/`, `nov15o-{start,after}.json`.
Next: more of the 299 queued US venues in batches of about 14 (about 6 minutes each; the Chrome tab needs the owner's Yelp
session), then reviews `[340:390]`.

### November 15 sixteenth round — queued Yelp venues, batches 3 and 4 (118 photos synced)

Resumed the queued US Yelp pass (`yelp-us/batches.json`, 19 batches of 15 venues; batches 0-2 of the queue are now done).
The matcher is installed once per Chrome tab as `window.RUN/DUMP` helpers, so each batch costs one paste of venue items.
Batch 0 (15 venues) and batch 1+2 (30 venues) ran without any 403. Resolution misses: Esther's Kitchen, Gunny's Pub,
Aogami (no photos), Bellissima, three North Italia branches (Kierland, Arcadia) and Nuri (unresolved), State Bird
Provisions (gallery has no standard heading), Iara (no named photos). Pisco y Nazca resolved to the Doral branch while the saved
record is Kendall, so it was dropped; no photo was copied between branches.

I visually inspected **132 candidates** (48 + 84) and approved **118**, holding 14: a roll that looks like shrimp tempura
captioned spicy tuna, sandwiches captioned as entrées (chicken and eggplant parm), a bundt cake captioned financier, plates
where the named ingredient is not visible, one table shot showing another restaurant's menu card, and similar. Captions quote
the contributor's caption and disclose shared tables, sides and sauces.

The batch included **specials records** (OpenTable-sourced venues). Fifteen of the 30 profiles have no backing pin on
production, so their photographs are saved (and read back) but are not visible on a native pin page until pins exist; this
is the existing "saved specials with no backing pin" gap. The sync script now keys changed records by kind, and the native-page
check records a missing pin instead of failing.

Pushed **118 photo associations across 30 production profiles**; production and local agree at **13,847 photographed and
957 reviewed entries out of 55,103**, leaving **41,256 photo gaps**. Image preflight (118 blobs), pilot, complete readbacks,
preservation and zero-operation convergence passed; the 15 pin-backed pages passed SSR checks (96 photo URLs). No
deployment or translations. Evidence: `yelp-us/` (dump3, dump4, rows, sheets), `china/deep-reviews33/`,
`.scrape/menu-inventory-prod-sync-2026-11-15p/`, `nov15p-{start,after}.json`.
Next: queue batches 3-18 (about 4 left per hour of Chrome time), then reviews `[340:390]`.



### November 15 seventeenth round — 50 China branch rechecks, 44 review associations synced

Rechecked high-review ranks `[340:390]`, examining 72 candidate associations across 50 branches. Accepted
**44 associations across 16 profiles** after inspecting original Chinese and publisher English, freshly
re-fetching every selected review ID/excerpt and checking original-language branch addresses. Held 28 leads:
generic lists/descriptions, redundant praise, apple-flavor soda versus orange soda, a mixed rice-wine/plum
drink, Aihua accounts naming Dongmutou Street 19 or a new two-floor shop instead of the saved Duanlvmen
floor-one branch, Dongzikou accounts explicitly naming Yulin/Raffles or Wuyuegong Street instead of
Wenshuyuan Street, Songhelou reviews with a conflicting Tang Restaurant identity, and Park 1903 address
representations needing exact building correspondence. No excerpts were attached across those conflicts.
Retained criticism of too little snow clam and slightly tough crispy-pork batter alongside praise. Original
Chinese excerpts avoid publisher ingredient/translation errors. Forty-two new editorial estimate keys remain
local code; the noodle-thickness and mild-prawn descriptions remain unscored.

Pushed **44 review associations across 16 production profiles**, closing **25 effective review gaps**.
Production and local agree at **13,847 photographed and 982 reviewed entries out of 55,103**, leaving
**41,256 photo gaps and 54,121 review gaps**. No photos were added in this review round. Public-image preflight
had zero new URLs; pilot/native check, complete readbacks, whole-inventory preservation, all **1,011 source
quote budgets** and zero-operation convergence passed. All 16 native pages passed server-rendered/serialized
checks (**83 photo URLs and 54 excerpts**); hydrated viewer interactions remain pending. The page checker now
decodes escaped ampersands in nested Next.js data before comparing exact quotations. Focused rating/lint tests
(11 tests) and ESLint passed. No deployment or translation run occurred.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews34/`,
`.scrape/menu-inventory-prod-sync-2026-11-15q/`, `nov15q-{start,after}.json`.
The item ledger records all 72 decisions and updates 569 rows; the 25 newly reviewed items are marked
saved and verified on production. Next reviews: `[390:440]`; Yelp photo queue remains at batch index 3.
The 15 round-sixteen specials profiles without backing pins still need opening/identity research and pin linkage.


### November 15 eighteenth round — 79 China branch rechecks, 46 review associations synced

Worked rank slices `[390:440]` and `[440:469]`, examining **68 leads across 79 branches**. Accepted
**46 review associations across 24 profiles**, freshly verifying every selected review ID, exact excerpt
and original-language branch address. Retained mixed praise/criticism of fishy crab roe, less-preferred
beef offal soup and small mango-sago portions. Original Chinese excerpts avoid publisher errors that
called mango sago “mango pudding,” dinner rolls “aperitifs,” or beef offal soup “beef teriyaki.”

Held 22 leads: separate desserts do not identify combined mango-sago double-skin milk; fried dough inside
jianbing or lamb inside paomo do not establish a separate serving; generic lists, unassessed ingredients
and redundant leads remain unsaved. A nuanced vinegar/pungency assessment with corrupt original glyphs
needs a clean source. Damengong's stone-market/highway address still needs correspondence to the saved
Tongxing Road/International Commercial City branch. No review crossed an unresolved branch conflict.
The fresh source-language address resolved Xiao Peng's English “41-1” rendering to the saved
临江门西来寺4号1-1. Forty-three new editorial estimate keys remain local code; the fresh-meat bun's
price/value excerpt and the chicken dish's portion-only excerpt remain unscored.

Pushed **46 review associations across 24 production profiles**, closing **32 effective review gaps**.
Production and local agree at **13,847 photographed and 1,014 reviewed entries out of 55,103**, leaving
**41,256 photo gaps and 54,089 review gaps**. No photos were added. Public-image preflight had zero new
URLs; pilot/native check, complete readbacks, whole-inventory preservation, all **1,051 source quote
budgets** and zero-operation convergence passed. All 24 native pages passed server-rendered/serialized
checks (**90 photo URLs and 78 excerpts**); hydrated viewer interactions remain pending. The 11 focused
rating/lint tests and ESLint passed. No deployment or translation run occurred.

The final rank does **not** mean the normalized recheck is complete: review saves change gap counts and
re-sort the ranking between rounds. Comparing exact sources with normalized batch ledgers found
**393 of 469 branches scanned and 76 missed**. The next queue is now fixed by exact branch source:
`.scrape/menu-research-all-2026-11-13/china/normalized-high-review-remaining.json`. Initial unnormalized
scans are counted separately. Resume that queue and remove sources after recording scans/decisions,
rather than continuing numeric slices. Yelp photos remain queued at batch index 3; no region is exhausted.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews{35,36}/`,
`.scrape/menu-inventory-prod-sync-2026-11-15r/`, `nov15r-{start,after}.json`.
The item ledger records all 68 decisions, updates 642 rows and marks the 32 newly reviewed items
saved and verified on production. The 15 round-sixteen specials profiles without backing pins remain held
for exact opening/identity evidence and pin linkage.


### November 15 nineteenth round — all 76 missed high-review branches checked, 108 associations synced

Worked the 76 exact sources in the normalized high-review queue rather than recomputing numeric ranks.
Inspected **245 dish-review leads**, accepting **108 associations across 35 profiles** and holding 137.
All accepted review IDs and verbatim excerpts were freshly re-fetched; fresh source-language addresses
match the saved branches. The original Chinese addresses resolve the English Dongguan address rendering
and Geji's English 50m versus source-language/saved 100m discrepancy without changing venue fields.

Retained criticism as well as praise: lukewarm eel, ordinary fish soup, shrimp freshness, oily char siu,
dry bun wrappers, overly sweet sago, hard/odd-tasting eggplant wraps, spicy soup preferences, salty fish
head, and disliked pan-fried crab. Used short original-language verbatim excerpts, with original and
publisher-English records retained in provenance. Ninety-five new editorial estimate keys remain local
code; descriptive cod-ball texture and shacha soup excerpts remain unscored.

Specific holds include Wu Ji's Baita West Road main branch versus Xibei Street, Maggie's MixC versus
David City, Laocunzhang 491 versus saved 481, the standing Jin Gang Shan/Mingting address conflicts,
Mingting's new Taikoo Li branch, Moustache's Xiangshui Bay account, Chan Tim Kee's Main Street 4-3 versus
Lane 3 No.2-2, Jin Jia Gang 47 versus 49, and Xin Wu Tang's Zhenbang Road 24 versus Haihou Road 36-105.
Held pea/minced-meat noodles versus plain noodles, wontons mixed into sauce versus clear broth,
separate jar-pork/pancake variants, and red-bean-topped milk pudding. Original 猪肠粉 does not establish
pork-intestine filling, 珍珠肠粉 does not establish shrimp filling, and Ma Xiangxing's duck-pancreas
美人肝 conflicts with the saved gizzard/liver translation; those need direct menu identity repair.

One fish-head alias exceeded the API's six-review-per-item cap during the local save. Its rejected PUT
made no change; two redundant fish-praise associations were held, preserving specific texture/spice
assessments and salt criticism. The resumed save converged and complete preservation audits passed.
The helper now preflights counts across the entire batch before writing, and the skill documents the cap.

Pushed **108 review associations across 35 production profiles**, closing **65 effective review gaps**.
Production and local agree at **13,847 photographed and 1,079 reviewed entries out of 55,103**, leaving
**41,256 photo gaps and 54,024 review gaps**. No photos were added. Public-image preflight had zero new
URLs; pilot/native check, complete readbacks, whole-inventory preservation, all **1,138 source quote
budgets** and zero-operation convergence passed. All 35 native pages passed server-rendered/serialized
checks (**224 photo URLs and 174 excerpts**); hydrated interactions remain pending. Eleven focused tests,
ESLint and diff whitespace checks passed. No deployment or translation run occurred.

The high-review normalized discovery pass is now **469/469 complete**, with its queue emptied only after
scans, decisions and verified saves. This is first-three-page discovery, not venue/source exhaustion.
The next exact-source queue is `.scrape/menu-research-all-2026-11-13/china/normalized-mid-review-remaining.json`:
**40 branches in the 5–19-review group remain; 101/141 have normalized scans**. Yelp photos resume at batch 3.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews37/` (including queue-before, decisions,
fresh verification, address checks and normalized-coverage audit),
`.scrape/menu-inventory-prod-sync-2026-11-15s/`, `nov15s-{start,after}.json`.
The item ledger records all 245 decisions, updates 1,147 rows and marks 65 newly reviewed items saved and
verified on production. The 15 round-sixteen specials profiles without backing pins remain an opening/identity
and pin-linkage gap.


### November 15 twentieth round — remaining 40 mid-review branches checked, 29 associations synced

Completed the exact-source queue for the remaining 40 branches with 5–19 reviews in the inventory snapshot.
Inspected **40 leads**, accepted **29 review associations across 16 profiles**, and held 11. Every selected
review ID/excerpt was freshly verified; fresh original-language addresses match the saved branches.
Lu Yuan Gong's fresh source-language address is the saved Ruanyong Road 40, resolving the apparent conflict
with a cached English Zhenhua Road 103 address without changing venue fields.

Retained the very salty truffle-pork criticism alongside the same reviewer's still-good squirrel fish and
smoked carp; kept eggplant's worse-when-cold caveat unscored. Shared-source excerpts remain within aggregate
quote budgets. Twenty-six new editorial estimate keys remain local code. Held a response-to-photo-style
general guide, non-specific/venue-wide ratings, historical price or view-only comments, bun-order mentions
whose praise actually described noodles, and uncertain prepared-dish identities (Feizi’s Smile translated
as plain Lychee, and 海灵菇 labelled sea mushrooms). Direct-menu identity research remains necessary.

Pushed **29 review associations across 16 production profiles**, closing **26 effective review gaps**.
Production and local agree at **13,847 photographed and 1,105 reviewed entries out of 55,103**, leaving
**41,256 photo gaps and 53,998 review gaps**. No photos were added. Public-image preflight had zero new
URLs; pilot/native check, complete readbacks, whole-inventory preservation, all **1,161 source quote
budgets** and zero-operation convergence passed. All 16 native pages passed server-rendered/serialized
checks (**101 photo URLs and 28 excerpts**); hydrated interactions remain pending. Eleven focused tests,
ESLint and diff whitespace checks passed. No deployment or translations ran.

Both higher-review groups now have normalized first-three-page discovery scans: **20+: 469/469;
5–19: 141/141**. The mid-review queue was archived under `deep-reviews38/queue-before.json` and emptied.
Next: **85 exact sources** with 1–4 reviews in the inventory snapshot, saved at
`.scrape/menu-research-all-2026-11-13/china/normalized-low-review-remaining.json`. This is discovery coverage,
not exhaustion of any venue, source or region; later pages, independent sources and held identities remain.
Yelp photo work resumes at batch index 3.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews38/`,
`.scrape/menu-inventory-prod-sync-2026-11-15t/`, `nov15t-{start,after}.json`.
The item ledger records all 40 decisions, updates 714 rows and marks 26 newly reviewed items saved and
verified on production. The 15 round-sixteen specials profiles without backing pins remain an opening/identity
and pin-linkage gap.


### November 15 priority change — USA-based restaurants first

Owner instruction: prioritize USA-based restaurants for the ongoing menu-photo and exact-dish-review
inventory. Resume the US photo queue at `yelp-us/batches.json` index 3 (15 venues), then remaining batches;
continue operator/detail, branch-gallery, Google Images/Maps and original review research through the US
item ledgers. The next batch includes Phoenix, Nashville, Seattle, Austin, Houston, Miami-area and
Philadelphia-area venues. Keep exact branch/variant/portion checks, inspect every photo, preserve source
credits, enforce aggregate quote budgets and the six-review cap, and sync ready data under the standing
production-data authorization with pilot/native checks and complete audits.

The 85-source China low-review queue is preserved for later. This is a priority/queue update, not a new
research or data-sync round: verified production remains **13,847 photographed / 1,105 reviewed out of
55,103 entries**. No new production data, code deployment or translations were applied for this change.
Queue evidence: `.scrape/menu-research-all-2026-11-13/us/usa-first-plan-2026-11-15.json`.


### November 15 twenty-first round — USA-first photos, 11 menu associations and a missing native pin repaired

Worked the next US queue at batch index 3 through operator-page discovery and normal Yelp browsing.
The Chrome tab API failed; its native interface worked for the source research, but Chrome blocked
console pasting with a security warning. The warning was left in place. Used normal gallery controls
and downloaded only observed named photo IDs. Yelp's first Bianco search result was Biltmore; verified
the separate **623 E Adams Street / Heritage Square** listing before selecting photos.

Operator discovery covered the 15 queued records: 13 supplied usable HTML links (32 requests, 29 successful
and three HTTP 403). OpenTable-only links and blocked/unnamed galleries still need follow-up. This is
candidate discovery, not completed per-item research. Chez Zee's source-less hidden images are named
inside `.image-thumbnail` elements whose CSS backgrounds hold the real food pictures.

Visually inspected **13 dish-image candidates**, approving **11**:

- Pizzeria Bianco: Wiseguy, Sonny Boy, Biancoverde, Margherita, Rosa, Marinara, Farmers Market Salad and
  Handmade Mozzarella Salad. Six named Yelp photos retain contributors and historical dates; two operator
  photos come from the exact branch page. The Marinara photograph shows a separate Biancoverde behind it,
  explicitly disclosed in its caption. The background pizza is not represented as included in the item.
- Chez Zee: half-order fried pickles, spinach/artichoke dip, steak/mushroom quesadilla. The quesadilla is
  clearly labelled as the operator's regular-menu photograph; saved happy-hour prices/conditions are preserved.

Held the shared quesadilla card for the chicken/bacon variant and shared pizza card for cheese/pepperoni:
the pictures do not establish those exact preparations. Also excluded added-tomato-sauce Biancoverde,
added-mushroom Margherita and a video result from the still-photo set. No picture was copied between branches.

**Chez Zee native pin repaired.** Exact-source and title/alias checks found no existing pin. The operator's
[history](https://www.chez-zee.com/about-us/) explicitly says the renamed Chez Zee opened in **1989**;
created local pin **20968** and production pin **[21058](https://www.chronopin.com/pin/21058)** with an
estimated year, an explained January 1 placeholder, full street address and the saved geocoded point.
Uploaded and visually verified its interior cover to Azure and read back native media dimensions,
credits and source URL. This makes **all eight** of its saved menu photos visible, including five older
photos beyond this round's three additions. Its profile fields and menu prices were preserved.

**Bianco branch date corrected.** The operator's [exact branch page](https://www.pizzeriabianco.com/pizzeria-bianco-heritage-square)
explicitly distinguishes the 1988 grocery-store origin, 1994 strip-mall move and **1997 move to 623 Adams
Street**. Corrected pin **[6740](https://www.chronopin.com/pin/6740)** in both environments to estimated
1997, with an explained January 1 placeholder. Before/after audits confirm its author and every other
field were preserved apart from the three date fields and update timestamp; caches were expired.

Pushed **11 photo associations across two production profiles**, closing **11 effective photo gaps**.
Production and local agree at **13,858 photographed and 1,105 reviewed entries out of 55,103**, leaving
**41,245 photo gaps and 53,998 review gaps**. No reviews were added. Twelve images, including the new
native cover, were uploaded to Azure and publicly verified. Pilot/native check, complete readbacks,
whole-inventory menu preservation, all **1,161 review-source quote budgets** and zero-operation convergence
passed. Both native pages passed server-rendered/serialized menu checks (**16 photo URLs, one excerpt**),
with all eight saved menu photos visible in each page's data and Food photos strip. Hydrated viewer
interaction remains pending: Chrome's window became unavailable (`cgWindowNotFound`) after source research.
No code deployment or translation run occurred; English pin content is left for the translation agent.

The US item ledger records 11 production-verified photo keys and updates 368 rows with explicit discovery
scope. **Do not advance batch 3:** only selected Bianco items and Chez Zee were completed; other venues,
remaining items and source avenues remain open. Continue `yelp-us/batch3-progress.json` and the per-item US
ledger with operator/detail pages, normal Yelp galleries and Google Images/Maps. No venue or region is exhausted.
The 85-source China queue remains saved for later under the USA-first priority. The 15 missing backing
pins from round sixteen remain a separate unresolved set; Chez Zee was an additional missing-pin case.

Evidence: `.scrape/menu-research-all-2026-11-13/us/round21/` (source pages, named-photo provenance in the
manifest, visual sheets, pin/media readbacks, branch-date correction and final-round audit),
`.scrape/menu-inventory-prod-sync-2026-11-15u/`, `nov15u-{start,after}.json`.


## November 15 — round 22, USA-first batch 3 continuation

Saved one exact-branch Bang Bang Shrimp photograph at [S3, Fort Lauderdale](https://www.chronopin.com/pin/21064). The named Yelp Food gallery caption and street address were verified in native Chrome, and the downloaded original was visually inspected. Its viewer failed to expose the contributor/date; the saved credit names the Yelp user-photo source without inventing either. The caption separates the photographed presentation from current happy-hour serving size and price. No reviews were added: the visible dish-review leads still need original full-review permalink checks.

Created backing pins local 20969 / production 21064, opening May 9, 2013 (confirmed). New Times Broward-Palm Beach, May 23–29, 2013, page 25 explicitly reports the actual opening to the public on May 9 at 505 N Fort Lauderdale Beach Boulevard. The archived PDF page was rendered and visually inspected; the operator independently says May 2013. Full address and saved geocoded point were read back. The cover's old profile alt says interior, but visual inspection shows the oceanfront terrace: the new native Medium attribution accurately calls it a terrace. No existing profile photo fields were changed.

2120 and Federal Downtown exact-branch ordering menus loaded through normal Chrome after direct HTTP 403; their public Apollo menu-item image fields are null. S3 WordPress media search checked shrimp/croquettes/chicken/edamame/roll: its Surf and Turf Roll picture is not a saved dish. Blue crab croquettes differ from saved goat cheese; sushi leads still require the saved four-piece portion. These are partial source checks, not exhausted venues. Google Images/Maps, later Food/Drink pages and other branch sources remain queued.

Production and local agree at **13,859 photographed / 1,105 reviewed / 55,103 entries**, leaving 41,244 photo and 53,998 review gaps. Both Azure assets were publicly verified. Pilot/native verification, full profile and pin/media readbacks, preservation, all 1,161 aggregate quote budgets and zero-operation convergence passed. The hydrated production photo viewer opened with the correct image, full caption and linked credit and closed successfully. No code deployment or translations; English pin content is left to the translation agent.

Batch 3 stays partial; the per-item ledger and batch progress preserve earlier results and add this S3 checkpoint. Evidence: `.scrape/menu-research-all-2026-11-13/us/round22/`, `.scrape/menu-inventory-prod-sync-2026-11-15v/`, `nov15v-{start,after}.json`.


## November 15 — round 23, USA-first S3 continuation

Synced **five photos and two exact-dish review associations** at [S3, Fort Lauderdale](https://www.chronopin.com/pin/21064). Native Chrome targeted Yelp searches recovered captioned original photos of Goat Cheese Croquettes (Erin F., February 17, 2021), Wok Charred Edamame (Oriana C., July 1, 2022), Happy Hour Korean Fried Chicken Bites (Samantha D., May 28, 2024), Duck Fat Onion Rings (Kavitha P., September 5, 2024), and Mamasita (Gracie D., March 17, 2019). Every original was downloaded and visually inspected; all images are in Azure with selected-photo provenance. Captions distinguish historical presentation and pictured background drinks from current happy-hour terms. The current operator menu independently names the strawberry Mamasita cocktail.

A freshly opened [original Reddit comment](https://www.reddit.com/r/fortlauderdale/comments/1dxfchd/comment/lc4a7lj/) in “Best Dish in Fort Lauderdale?” explicitly assesses both named S3 appetizers. One 17-word excerpt is associated with each item; unique source text is counted once in aggregate quote budgets. The account is shown as deleted, and the exact publication date is unavailable (null). Direct HTTP returned a generic Reddit shell; original text/permalink were verified with the web reader, and the evidence note records this access distinction. One local 4.5 editorial estimate reflects the explicit praise, passed focused rating tests (2) and ESLint, and remains undeployed.

Held Ora King Salmon Cones (search results name tuna cones or rice cakes), Honey Moon (other cocktails), and sushi portions (saved four-piece serving unresolved). These targeted first-result checks do not exhaust any item/venue. Later galleries, Drink category, original review sources and Google Images/Maps remain open; USA batch 3 stays partial. No backing-pin or existing pin fields changed.

Production/local: **13,864 photographed / 1,107 reviewed / 55,103 total**, leaving 41,239 photo gaps and 53,996 review gaps. Five public image preflights, pilot, full readbacks, whole-inventory preservation, six-review caps, all 1,162 source quote budgets and zero-operation convergence passed. Native S3 data verifies six photo URLs and one unique excerpt. Hydrated croquette viewer visually shows the correct image, historical caption, credit and linked review; previous-dish navigation loads edamame and its credit; dismissal works. No code deployment or translations.

Evidence: `.scrape/menu-research-all-2026-11-13/us/round23/`, `.scrape/menu-inventory-prod-sync-2026-11-15w/`, `nov15w-{start,after}.json`. The US item ledger and batch progress preserve earlier work and this continuation.

## November 15 — inventory recount after round 25

Read-only recount of **production** (`/api/admin/restaurant-content` and `/api/admin/restaurant-specials`, enabled records, effective menus: specials override same-label ordinary menus, item names counted once per label) using `.scrape/menu-inventory-2026-11-13/main/effective.py` logic. Nothing was changed.

| | Round 23 audit | Now | Change |
|---|---|---|---|
| Entries | 55,103 | 55,103 | 0 |
| Photographed | 13,859 (before) / 13,864 | **13,872** | +8 |
| Reviewed | 1,107 | **1,107** | 0 |
| Photo gaps | 41,239 | **41,231** | −8 |
| Review gaps | 53,996 | **53,996** | 0 |

Per-region movement since the round 23 audit: Seattle photos 96 → 101 (IL BISTRO, five photos) and Philadelphia 138 → 141 (Amada Wayne, three photos). All other regions are unchanged. This matches the round 25 save list; the 13,867 estimate in the earlier note was low by five.

Not repeated in this recount: whole-inventory preservation, aggregate quote budgets and native-page checks for round 25. Evidence: `.scrape/menu-inventory-2026-11-15x/` (`prod.json`, `prod-effective-counts.json`, `count.py`). No deployment or translation run.

## November 15 — round 26, USA-first photos (Pisco y Nazca Doral, 2120, Duke's Green Lake)

Method: from a logged-in Yelp tab, `fetch()` of each branch's `/biz_photos/<slug>?tab=food&start=N` pages and parsing reader captions in the DOM, then keyword filtering against the venue's photo gaps; every candidate was downloaded from `s3-media0.fl.yelpcdn.com/bphoto/<id>/o.jpg` and inspected on a contact sheet. Branch addresses were verified on the Yelp business pages (8551 NW 53rd St Doral; 2120 6th Ave Seattle; Duke's Greenlake slug).

**Saved 13 photos** (local, then production; Azure `restaurant-dishes/us-round26/`):
- Pisco y Nazca Doral (specials 870, "Lunch specials"): 9 — Ají de Gallina, Resaca Burger*, Causa Crocante, Causa de Pollo, Ceviche Tradicional*, Lomo Saltado Roll*, Tallarín Saltado, Tuna Tartare Tacos*, Yuca a la Huancaína.
- 2120 (specials 223): 3 — Fried Calamari, Washington Oysters (full platter, disclosed), Brussels Sprouts.
- Duke's Seafood Green Lake (specials 214): 1 — Award Winning Clam Chowder.

**Result:** effective photographed entries 13,872 → **13,885 / 55,103** (Miami +9, Seattle +4); reviewed unchanged at **1,107**. Gaps: **41,218 photo, 53,996 review**. Production readbacks for all three records matched; whole-inventory comparison shows only those three profiles changed and only in `image` fields; all 1,162 quote budgets still within limits (no item above six reviews); re-running the manifest against production is a no-op (convergence).

**Held / not done:**
- Pizzeria Bianco (content 89, Heritage Square): all matching gallery photos already saved; remaining gaps (Spiedini, Antipasto, sandwiches, Local Organic Greens, mushrooms, olives, sausage, salami, anchovies, prosciutto, pepperoni) have no exact-named Yelp photos. "Sonny add pepperoni" is an added-topping variant, not the Pepperoni item.
- Pisco y Nazca Doral: "Two Tostones" (Yelp "Tostones"/"Pork Tostones" topping not established), Empanadas de Pollo (only a mixed plate with avocado toast), Croquetas de Ají de Gallina, Chicharrón de Pescado, Chaufa de Pollo/Mariscos, Poke/Pulled Pork bowls: no exact photo found.
- Piccolo Trattoria Doylestown: only "Calamari & Hot peppers", "Caprese salad (no prosciutto)", Stuffed Shrimp — none match the happy-hour items. Chez Zee: only "Fancy Fries with truffle oil" (not the French Fries item) and build-your-own pizza.
- Federal Grill Downtown/Hedwig Village: not searched (four Yelp slugs `federal-american-grill-houston-3/-4/-5/-7`, branch not yet matched to the OpenTable records). Duke's Green Lake further items and S3 unresolved items not re-searched.
- **No native-page check:** none of the three records (OpenTable sources 158533, 214753, 348751) has a backing Chronopin pin on production (`/api/admin/db/Pin?sourceUrl=` returned 0 rows), so there is no public pin to verify. Create or link backing pins before relying on public coverage; no reviews were researched this round.

Evidence: `.scrape/menu-research-all-2026-11-13/us/round26/` (manifest, uploads, local/prod readbacks, `native.py`) and `.scrape/menu-inventory-2026-11-15x/` (`prod-before-round26.json`, `prod.json`, count files). No deployment or translation run.

## November 15 — round 27, USA-first photos (Federal Grill, Duke's, S3) and one critic review

Method as round 26 (Yelp `biz_photos` food/drink galleries fetched from a logged-in Chrome tab, exact-name regex per gap item, every candidate downloaded from `bphoto/<id>/o.jpg` and inspected on contact sheets, Azure `restaurant-dishes/us-round27/`). Branch addresses verified on Yelp: Federal Downtown = `federal-american-grill-houston-5` (1221 McKinney St), Hedwig Village = `-4` (8731 Katy Fwy); Duke's Lake Union = `dukes-seafood-seattle-17` (1111 Fairview Ave N); Green Lake = `dukes-seafood-greenlake-seattle-4`; S3 = `sun-surf-sand-fort-lauderdale`.

**Saved 28 photos and 1 review** (local, then production; whole-record `PUT` with revision, readback equality asserted):
- Federal Grill Downtown (specials 479): Pear Bee's Knees, Strawberry Lemon Drop. Hedwig Village (specials 488): Strawberry Lemon Drop, Moscow Mule. (4)
- Duke's Lake Union (specials 238): Sensational Wild Salmon Bites, Dungeness Crab "Un"Cake, Lobster Risotto Bites, Coco Loco Prawns, Alaska Salmon Sliders, Dungeness Crab Dip, Steamer Clams, Crabby Deviled Egg, Maple Bacon Seafood Bites, The Duke Cheeseburger, Savory Chipotle Wild Salmon Sandwich (caption notes "no bacon"), Crab Cake Sandwich, Award Winning Clam Chowder. (13)
- Duke's Green Lake (specials 214): Crab Dip, Duke Cheeseburger, Savory Chipotle Wild Salmon Sandwich, Finger Lickin' Chicken Strips, Salmon Bites, Alaska Salmon Sliders. (6)
- S3 Fort Lauderdale (specials 662, pin 21064): Arrowhead Roll, Crispy Rice Cakes, Dynamite Roll, Spicy Tuna Roll, Yuzu Ginger Mule. (5)
- Review: S3 Crispy Rice Cakes, Broward Palm Beach New Times critic review "S3: The Scene at the Sea" (published 2013-07-11, quote verified on the article page), 12-word excerpt.

**Result:** effective photographed 13,885 → **13,913 / 55,103** (Houston +4, Seattle +19, Miami +5, incl. S3); reviewed 1,107 → **1,108**. Gaps: **41,190 photo, 53,995 review**. Audit: only specials 214, 238, 479, 488, 662 changed, and only in `image`/`reviews`; 1,163 quoted sources all within the 25-word budget (Reddit exempt), no item above six reviews; re-running the save against production is a no-op. **Native page check passed for S3 (pin 21064: 5/5 new photo URLs present)**; the other four records have no backing pin on production, so no public page exists. Hydrated viewer not rechecked.

**Held / not done:** Federal sliders (only "Cheeseburger Sliders" captions, not Burger Sliders), Federal wings/poutine/Brussels sprouts/meatballs (no exact Hedwig photo), Dragon Roll and the Salmon Cones photo at S3 (cluttered/multi-dish; Ora King identity not established), Duke's Green Lake Steamer Clams ("steamers"), Deviled Egg (generic), Duke's Bellevue (Yelp slug not found), Lake Union Chicken Strips, Havarti burger, Caesar. Review research: web search found no editorial review for Federal Grill or Duke's items; Yelp review text is not a saved source. `yelp-us/batches.json` index 4 onward was not started.

Evidence: `.scrape/menu-research-all-2026-11-13/us/round27/` (`manifest.py`, `save.py`, `photos-manifest.json`, `reviews.json`, before/after records, `native-checks.json`) and `.scrape/menu-inventory-2026-11-15x/` (`prod-before-round27.json`, `prod.json`). No deployment or translation run.

## November 15 — round 28, blocked: Yelp CAPTCHA (no data changed)

Round 28 started `yelp-us/batches.json` index 4. Pin-backed venues in that batch: Olive Juice (6691), 148 Noble Street (6672), Holbox (6686), Handroll Hawker (6688), Veselka Nashville (6992) and Heritage Atlanta (6968); every other index-4 venue (Nusr-Et Miami, Lure Fish House, Amada PHL, Piccolo Newtown, Bulla Aventura, NOVY, Cooper's Hawk Surprise, Donatella, Elliott's) has no backing pin on production. Yelp slugs resolved through search (`holbox-los-angeles-2`, `handroll-hawker-san-francisco-2`, `olive-juice-san-francisco-2`, `nusr-et-steakhouse-miami`, `amada-philadelphia`, `148-noble-street-brooklyn`), but every `biz_photos` request, fetched and navigated, returned HTTP 403 with a Yelp CAPTCHA challenge. CAPTCHAs are not bypassed; the Yelp avenue is paused until the owner clears it in the Chrome tab.

Operator-site alternatives checked and rejected: Duke's Bellevue (its six gallery photos show dishes absent from the Bellevue happy-hour menu, so none match an item), Holbox (generic scenes, no named dishes), Handroll Hawker, Olive Juice, Lure, Amada and Nusr-Et (no dish-captioned photos), Veselka (the New York site; no Nashville branch photos). Reviews: none researched.

Result: **0 photos and 0 reviews added; production unchanged at 13,913 photographed / 1,108 reviewed of 55,103** (round 27 recount stands). No uploads, saves, deployment or translations. Evidence: `.scrape/menu-research-all-2026-11-13/us/round28/`.

## November 15 — round 29: Yelp still blocked, China low-review group scanned, 8 reviews synced

Re-tested Yelp once (`biz_photos/holbox-los-angeles-2?tab=food` in the Chrome tab): still a CAPTCHA page with no content. It was not bypassed, so the Yelp queue (index 4 onward, pin-backed Olive Juice 6691, 148 Noble Street 6672, Holbox 6686, Handroll Hawker 6688, Veselka Nashville 6992, Heritage Atlanta 6968) stays paused. The round moved to the non-US queue.

Ran the normalized first-three-page Trip.com review discovery over the **85 exact China sources with 1–4 reviews**, which completes the normalized discovery pass for all three review groups (20+: 469/469; 5–19: 141/141; 1–4: 85/85). It found 14 leads on 13 sources. **Accepted 8 review associations on 8 profiles; held 6** (generic pork-and-meatballs line, a reviewer who ordered a different noodle than the saved item, two list-only mentions, an affordability-only comment, a recommendation list mixed with atmosphere). Fresh Trip.com API verification confirmed all 8 quotes and all 8 original-language addresses match the saved branches. The Sea Intestine Rice review is saved with the original Chinese quote because Trip's English translation renders 海肠 as "sea cucumber".

Pushed to production: **0 photos, 8 reviews, 8 profiles.** Coverage: **13,913 photographed (unchanged), 1,116 reviewed (+8) of 55,103**; remaining **41,190 photo gaps and 53,987 review gaps**. Public-image preflight had no new URLs; complete readbacks, whole-inventory preservation (only the eight planned profiles changed, review fields only), all **1,171 source quote budgets** and zero-operation convergence passed. All eight backing pins' native pages (14384, 14583, 14653, 14655, 14661, 14682, 14685, 15036) returned HTTP 200 with the new excerpt in server-rendered/serialized data; hydrated interactions were not checked. Procedure note: the pilot record and the remaining seven were applied in one run, so the native-page check came after the saves rather than between pilot and bulk; every page passed.

Queue: `normalized-low-review-remaining.json` is now empty (archived as `deep-reviews39/queue-before.json`). This is discovery coverage only: later review pages, independent sources, held identities and menu-photo research remain open. Not done: item-ledger update, editorial estimate keys for the new excerpts (local code), translations, deployment.

Evidence: `.scrape/menu-research-all-2026-11-13/china/deep-reviews39/`, `.scrape/menu-inventory-prod-sync-2026-11-15y/`, `.scrape/menu-inventory-2026-11-13/main/nov15y-{start,after}.json`, `.scrape/menu-inventory-2026-11-15x/`.

## November 15 — round 30 (no Yelp, owner instruction): 7 critic reviews on three pin-backed US venues

Owner instruction for this round: no Yelp at all. Duke's Bellevue operator pages (happy-hour menu, location gallery) have no dish photos beyond the lunch spread, fish tacos, pesto salmon and a generic bacon cheeseburger, so no photos were saved (cross-branch Duke's photos are not copied onto Bellevue). Holbox's Infatuation photos are not dish-captioned. The round therefore added The Infatuation reviews, each checked against the live article and the record's address:

- **Veselka Nashville (pin 6992, content 301):** Pierogi, Latkes, Beef Stroganoff, Kielbasa (Infatuation Nashville review, 2026-10-12; 23 quoted words in total). Latkes and kielbasa quotes are critical.
- **Holbox (pin 6686, content 35):** Shrimp Aguachile (Infatuation LA review, 2025-03-20; 18 words).
- **Handroll Hawker (pin 6688, content 37):** Shrimp Tempura and Crispy Chicken (Infatuation SF review, 2026-10-06; one 15-word quote shared by both items).

Held: Holbox's uni/kanpachi tostada praise (no matching saved item name), Holbox taco dorado (would exceed the 25-word source budget), Olive Juice, 148 Noble Street and Heritage Atlanta (no usable non-Yelp dish source found this round).

Pushed to local then production: **0 photos, 7 reviews, 3 profiles**. Coverage: **13,913 photographed (unchanged), 1,123 reviewed (+7) of 55,103**; remaining **41,190 photo gaps and 53,980 review gaps**. Pilot (Veselka) saved and its native page checked before the other two. Readbacks matched, only the three planned profiles changed (review fields only), all **1,174 source quote budgets** are within 25 words, no item has more than six reviews, and a re-run changes nothing. Native pages 6992, 6686 and 6688 return HTTP 200 with the new excerpts in page data; hydrated interactions not checked. Not done: editorial estimate keys, ledger update, translations, deployment.

Evidence: `.scrape/menu-research-all-2026-11-13/us/round30/` (`reviews.json`, `save.py`, before/after readbacks, native HTML) and `.scrape/menu-inventory-2026-11-15x/` (`prod-before-round30.json`, `prod.json`).

## November 15 — round 31 (no Yelp, owner instruction): 8 operator-site photos at Pho Sedona

Photo-first round without Yelp. Sources tried: operator sites for the largest US photo gaps (EggBred Phoenix, Pho Sedona, Bluebonnet & Thyme, Zane's Pizza, Soluna Eats). Only **Pho Sedona's branch website menu** (`phosedonaaz.com/menu`, one `figure.item-image` per item block, so image-to-name pairing is exact from the HTML structure) had dish-paired photos not yet saved.

Saved to **content record 58** (local + production, Azure `restaurant-dishes/round31/`): Fried Wonton (8), Torpedo Shrimp Rolls (4), Grilled Beef Salad, Lemongrass Chili Chicken With White Rice, Grilled Beef Fried Rice, Grilled Beef Vermicelli, Half Rotisserie Chicken With Red Rice (caption discloses the photo shows one leg quarter), Crispy Salted Roasted Fish With White Rice. Every photo was inspected.

Rejected: Eggrolls and Vegetarian Egg Rolls (the operator uses one identical image for both), Egg Rolls Vermicelli (photo shows grilled chicken slices).

Held / not usable: EggBred (only "Benny Burrito" is named, from a filename on the Chino Hills page; other named photos already saved), Bluebonnet & Thyme (unlabelled gallery), Zane's Pizza (no item photos), Soluna Eats (403), Olive Juice / 148 Noble Street / Heritage Atlanta (not retried beyond round 30; no non-Yelp dish source found this round).

Result: effective photographed **13,913 → 13,921 of 55,103** (Phoenix +8); reviewed unchanged at 1,123. Gaps: 41,182 photo, 53,980 review. Checks: readback equals saved profile; whole-inventory comparison shows only record 58 changed and only `image` fields; all 1,174 quoted sources within the 25-word budget, no item over six reviews; pin 6709 (Pho Sedona Opens in North Phoenix) serves all 8 new photo URLs. Hydrated viewer not checked. No code deployment, translations or commits. Evidence: `.scrape/menu-research-all-2026-11-13/us/round31/` and `.scrape/menu-inventory-2026-11-15x/` (`prod-before-round31.json`, `prod.json`).
