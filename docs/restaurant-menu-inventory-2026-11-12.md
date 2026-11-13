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

A fresh local database snapshot records **10,121/55,103 effective entries with photos** and
**250/55,103 with reviews**: gains of **2,125 photographed entries and 57 reviewed entries** against
this expanded phase's baseline. These are database counts after ordinary/specials precedence and
same-name deduplication, rather than sums of candidate or stored association counts. Additional reviewed
batches were still saving at this checkpoint. The audit compared all pre-existing profiles and found
195 changed profiles, with **no changes outside item photos/reviews**, enabled flags or specials regions.
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
