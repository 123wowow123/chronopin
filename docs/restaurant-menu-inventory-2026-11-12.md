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
