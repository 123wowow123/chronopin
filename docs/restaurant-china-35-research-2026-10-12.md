# China restaurant guide coverage research — 12 October 2026

The requested target is **35 distinct restaurants in each populated section of each China city guide**, where verified content supports it. A menu, offer or multiple reservation times at one restaurant do not count as additional restaurants. Opening announcements, recent openings and promotions require their own evidence; a good review does not establish any of those facts.

## Sources and prepared additions

The research covers all 27 supported China cities, in the existing west-to-east navigation order. Content is published through the restaurant-content and restaurant-specials management APIs. These repository files are evidence/import snapshots, not the runtime source of truth:

- `restaurant-china-35-2026-10-12.json`: 130 branch-specific DiningCity Restaurant Week Autumn Winners participants, with 254 published set menus and 254 dated offers. The programme runs 10 October–8 November 2026. Shanghai and Beijing each have 35 selected participating restaurants; Shenzhen, Guangzhou, Hangzhou, Suzhou, Nanjing, Wuhan and Tianjin also have verified participants.
- `restaurant-china-top-35-2026-10-12.json`: 714 additional branch-specific Top restaurants, with 9,887 named menu items from Trip.com and separately checked Chinese Ctrip branch pages. Published community ratings and their review counts are retained with their source. Currency was explicitly requested as CNY; prices were not converted from USD. These are published listing prices, not independently confirmed current operator prices.
- `restaurant-china-openings-2026-10-12.json`: 15 independently researched additions: five recent openings or a temporary café opening, two announced openings, and eight additional restaurants whose exact opening dates are not established. Two have verified current offers.
- `restaurant-china-mgm-openings-2026-10-12.json`: five named dining venues confirmed in MGM’s 10 September Prince Bay opening announcement, with nine reviewed operator gallery images. Four profiles have published products or branch-specific named dishes without prices; Meet Plus uses link-only coverage after deeper menu searches failed. The Lobby Lounge operator page conflicts on its floor number, so the address does not invent a resolution.
- `restaurant-china-official-offers-2026-10-12.json`: 12 official hotel restaurant profiles and 14 branch-specific offers. Xi’an, Jinan, Dalian, Xiamen and Hefei merge into existing branches. Hotel children’s policies differ by venue; eligibility, age limits, paying-adult ratios, hotel-guest or loyalty requirements and eligible meal periods are preserved.

Restaurant Week evidence came from the public project, branch, meal, photo and dining-calendar endpoints for `rwcn_autumn_2026_extended` at `api.diningcity.asia`, plus public DiningCity branch pages. Each offer uses actual published reservation arrival slots and dates, rather than assumed continuous service. A Restaurant Week selection is not an opening announcement or evidence of a price reduction.

Top restaurant candidates came from the city-specific restaurant directories at Trip.com. Correct directory city IDs and Chinese Ctrip restaurant IDs were checked; incorrect early directory matches were discarded. Existing source IDs and plausible name/address duplicates were excluded before selection. All 714 selected branches had menu evidence in both the international listing and its Chinese branch page. Published review dates were used only as evidence that a restaurant was operating by that date. Where no dated review was supplied, the pin date represents the checked guide snapshot, not an invented opening date. No new-opening tag was assigned to these entries.

## Menu and gallery checks

The research checked branch pages, available official operator pages, linked menu PDFs, menu images, booking links and community branch galleries. Named items without a published price remain visible as “Price not published.” Unlabelled gallery photos do not establish dish names, prices, allergens or special-menu participation.

Reviewed images are stored in Azure Blob Storage, with source pages, credits and factual captions in the snapshots. Public blob downloads were checked against the uploaded file bytes and decoded dimensions. Restaurant Week has 247 reviewed images; the Top batch has 927 gallery/menu images, with two misleading card images replaced before publication; the opening batch has 26; the official hotel batch has 21; the MGM opening batch has nine. Logos, QR codes, children’s portraits and images of unrelated concepts were excluded as restaurant card photos. Brand previews and architectural renderings remain explicitly labelled as such.

Trip.com galleries are community sources, not venue-owned photography. Review-author credits are preserved where the source identifies the image’s author; otherwise the caption identifies the branch gallery and unpublished photographer. Some photos show a hotel property rather than a confirmed restaurant interior. Current operator menu and photographic corroboration remains a gap for many community-listed venues; it is not represented as completed official verification.

The hotel research checked 17 distinct linked PDFs, including seven image-only files rendered for visual reading. Jinan’s linked PDF was room service; Dalian’s linked PDFs were room service or Shang Palace. Those dishes were excluded from Café Spring and iCafé menus. Previously saved Café Spring room-service selections were also removed during the merge refresh; four older duplicate children’s-offer cards were replaced by the refreshed branch policies. Older Harbin buffet PDFs were not treated as current buffet courses. Current official buffet product prices remain useful menu entries without inventing their rotating dishes. Xi’an and Qingdao supplied actual priced à la carte dishes; Chengdu supplied priced drinks; Shenyang supplied priced regular dishes. Those regular items are not automatically included in a buffet or promotional menu. Published service charges, taxes and “from” prices are preserved. The Chengdu voucher’s published USD price remains USD.

Official Shangri-La galleries were checked for all 12 hotel profiles. Published hotel coordinates refer to the property building, with the dining floor identified by its address. DiningCity/gallery coverage for all 130 programme venues is recorded, but independent operator galleries were not accessible or discoverable for every branch. The Hilton Fucheng gallery returned an access error. Official Spago/St. Regis and Grand Boat/Shangri-La pages were also checked. The opening notes record remaining gallery gaps, including the Hefei launch preview and Ningbo rendering.

## Opening and promotion decisions

Recent openings require a confirmed date within the guide’s rolling 90-day window. Le Reflet and Melt opened in June and do not qualify merely because a September roundup mentions them. Month-level sources for Le Chai and Molo Di Dario are labelled as estimated dates; no source publication date is presented as an exact opening day. Feicui Taizi·Shengyan in Foshan has a reported 11 October restaurant opening. The Huaihe Road Chayan Yuese branch has an explicit 3 August opening. GOODBAI Café’s Suzhou opening is a temporary pop-up from 25 September through 29 November, not a permanent venue claim.

Feral Xiaoye’s announced October reopening has conflicting Yuyuan Road street numbers in two sources. The guide uses the road-level location and identifies the unresolved address and opening date. Ba Quan Shi Man’s Ningbo branch is announced for October; the source is a hoarding/preview, not proof it is open. The end-of-month dates in those upcoming pins are estimated sorting dates, not verified opening days.

Uni Shushi Xintiandi’s published lunch offer runs through 31 December with its stated booking conditions. GOODBAI’s dated pop-up remains visible as a limited-time offer without claiming a discount. Restaurant Week offers use their own reservation calendars. Ongoing official hotel children’s policies have no invented expiry date; their weekly meal windows determine whether the offer is active or upcoming. Wuhan’s benefit is breakfast-only. Chengdu’s free-child policy is one child per paying adult. Shenyang’s stated age threshold is under seven. Hefei’s lunch/dinner benefit follows its Friday–Sunday buffet schedule.

## Coverage gaps and sources checked

Searches covered Chinese operator announcements, local reporting, branch-specific menus, linked PDFs/images, ordering or reservation pages and verified promotions across all 27 cities. The following unresolved leads were not inflated into complete restaurants or offers:

| City | Additional sources checked and unresolved evidence |
| --- | --- |
| Kunming | Tongde Molly branch launch reports and Xiaoyu Dian reopening reporting. Precise branch gallery/address or current branch menu evidence remains incomplete; September launch discounts expired. |
| Chengdu | Official Café Z menu, gallery, child policy and seafood/steak voucher. More independently verified future openings and recent branch dates are needed. |
| Chongqing | Meixin Foreigner Street food-stall reopening reporting; announced mall tenants. Named branch menus/photos and individual opening dates remain incomplete. |
| Xi’an | Official Yi Café menu, meal prices and in-house guest discounts. Further dated openings and independently eligible offer branches remain unverified. |
| Sanya | Correct Sanya Trip.com/Ctrip branch listings and Hyatt booking-provider links. A booking product is not proof of a discount or new opening. |
| Haikou | Marriott dining packages were expired. InterContinental Club happy hour is guest-restricted; its branch menu/club gallery was not published sufficiently for an imported offer. |
| Changsha | Branch listings and current opening/promotion searches. Additional operator-confirmed opening dates and branch-specific offers remain unverified. |
| Foshan | Foshan News confirmed Feicui Taizi·Shengyan’s 11 October opening. Its branch menu remained unavailable after deeper searches; another branch’s menu was not borrowed. |
| Guangzhou | Bai’etan MixC mall launch and Guangzhou Gourmet Week reporting. Mall dates do not establish individual restaurant dates; festival brand lists do not establish each stall’s menu or discount. |
| Zhengzhou | JW Marriott family package and city food-voucher campaigns. Named restaurant assignment and individual branch/menu eligibility were insufficient for import. |
| Dongguan | Branch listings and local opening/promotion searches. Further dated operator announcements and branch-specific active offers remain unverified. |
| Shenzhen | Official MGM Prince Bay launch and all five named dining pages/galleries. The five venues are included with the operator’s confirmed September date. Published buffet/afternoon-tea products and two Yu Hoi Heen editorial dishes are retained without invented prices; Meet Plus remains link-only after deep searches. Macau collaboration meals and the other MGM Shenzhen property’s menu are excluded. |
| Wuhan | Yiming branch launch reporting and Chubao Tiandi announcements. Individual opening dates/menus/photos remained incomplete. Official Café Wu breakfast policy was independently verified. |
| Beijing | Restaurant Week; seasonal duck/crab campaigns, Huda reporting, CCTV crab festival and CBD/Chaoyang events. Brand-level campaigns do not establish every branch’s conditions; the CBD event had expired. |
| Jinan | Official Café Spring prices/gallery and child policy. Linked room-service dishes were excluded. More independently dated openings remain unverified. |
| Hefei | Huaihe Chayan launch and existing Baohe branch checked separately. MixC Chayan announcement and Baohe Wanda Haidilao leads lacked complete branch-specific evidence. Official Café Wan policy was checked. |
| Tianjin | Restaurant Week and official Four Seasons Cielo offer, already present in the runtime guide. Gusto’s September promotion had expired. No duplicate Cielo offer was added. |
| Xiamen | Official Café Amoy gallery, creations and child policy; community branch listings. Buffet prices were unpublished and retained as such. |
| Nanjing | Halo Garden City tenant announcements and Yuhua MixC leads. Mall launches were not assigned as individual restaurant dates; early October pop-up events had expired. |
| Hangzhou | Restaurant Week and Four Seasons autumn seafood announcement. The linked official page had a retrieval error; Yi Hang Yun Pin reporting lacked operator corroboration. Another country’s Michelin status was not inherited. |
| Qingdao | Official Café Yum prices, à la carte menu/gallery and children’s policy; Vista 226 reopening reports. Gift-promotion terms/expiry and named restaurant menu evidence were insufficient for the Vista offer. |
| Suzhou | Restaurant Week; GOODBAI operator pop-up announcement; municipal canteen and announced mall tenants. A report’s publication date was not substituted for an unknown restaurant opening date. |
| Shanghai | Nomfluence September roundup and branch articles; City News Service August/September opening reports; Restaurant Week. Rumoured bars without confirmed locations/menus were excluded; June openings remain Top only. |
| Ningbo | Ningbo Evening News Ba Quan Shi Man announcement and official Yi Café menu/gallery/policy. The announced restaurant’s exact opening day remains unconfirmed. |
| Dalian | Postal authority’s 105 “Warm New Restaurants” worker-meal campaign and official iCafé policy/gallery. The worker campaign’s individual branch list, menus and windows were inaccessible; 105 phantom offers were not created. |
| Shenyang | Official Café Liao menu/gallery/policy and 7212 park launch reporting. Unnamed park tenants do not establish new restaurant branches. |
| Harbin | Official Coffee Garden/Café Song prices, galleries and policies; Qiulin Central Street reporting. The July 3 opening was outside the rolling recent-opening window. |

Representative opening sources: [Nomfluence September roundup](https://rachelgouk.com/the-shanghai-scoop-food-drink-news-september-2026/), [City News Service September openings](https://www.citynewsservice.cn/articles/cns/fb/sh-buzz/sh-buzz-12-new-openings-plus-a-new-infinity-pool-bar-pm9e4zdk), [Foshan restaurant opening](https://www.foshannews.net/h/175/20261012/8850935.html), [GOODBAI operator announcement](https://www.sina.cn/news/detail/5347472855794470.html), [Ningbo opening announcement](https://finance.sina.com.cn/jjxw/2026-10-02/doc-initvprf5724161.shtml). Exact branch/menu/photo evidence is preserved in the snapshot entries.

## Live verification

The live API audit confirms **all 27 city guides have at least 35 Top restaurants**: 962 Top listings in total, up from 104. Shanghai has 44, Beijing 36, and the other guides have 35–37. Specials has 160 distinct restaurants across the country, including 36 in Shanghai and 35 in Beijing. Coming soon has six verified announcements and Just opened has 28 eligible branches across the country. Those two sections, and Specials in the other cities, remain below the requested 35-per-city target after the research described above.

The counts below are restaurants, not menu items, reservation times or offer cards. Specials unions active and upcoming offers and removes per-offer suffixes before counting. The four refreshed existing hotel policies replace duplicate older offer cards; their restaurants still count once.

| City | Top before | Top now | Coming soon | Just opened | Specials |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kunming | 7 | 35 | 0 | 1 | 1 |
| Chengdu | 2 | 36 | 0 | 1 | 2 |
| Chongqing | 1 | 35 | 0 | 1 | 1 |
| Xi’an | 1 | 35 | 0 | 1 | 1 |
| Sanya | 4 | 35 | 0 | 1 | 1 |
| Haikou | 2 | 35 | 0 | 0 | 0 |
| Changsha | 1 | 35 | 0 | 1 | 1 |
| Foshan | 7 | 35 | 0 | 1 | 0 |
| Guangzhou | 1 | 35 | 0 | 1 | 11 |
| Zhengzhou | 1 | 35 | 0 | 1 | 0 |
| Dongguan | 7 | 35 | 0 | 1 | 1 |
| Shenzhen | 2 | 35 | 0 | 6 | 15 |
| Wuhan | 1 | 36 | 0 | 1 | 3 |
| Beijing | 1 | 36 | 0 | 1 | 35 |
| Jinan | 9 | 35 | 0 | 1 | 3 |
| Hefei | 8 | 35 | 1 | 2 | 1 |
| Tianjin | 2 | 35 | 0 | 0 | 3 |
| Xiamen | 8 | 35 | 0 | 0 | 1 |
| Nanjing | 1 | 35 | 0 | 1 | 3 |
| Hangzhou | 1 | 35 | 1 | 1 | 22 |
| Qingdao | 2 | 36 | 0 | 1 | 2 |
| Suzhou | 2 | 35 | 0 | 1 | 8 |
| Shanghai | 1 | 44 | 3 | 3 | 36 |
| Ningbo | 8 | 36 | 1 | 0 | 2 |
| Dalian | 8 | 35 | 0 | 0 | 2 |
| Shenyang | 8 | 36 | 0 | 0 | 2 |
| Harbin | 8 | 37 | 0 | 0 | 3 |

Machine-readable counts are saved in `restaurant-china-35-counts-2026-10-12.json` and `.csv`. API counts were checked after the last prepared import; China’s local date had advanced to 13 October. The rolling opening window and offer status use each guide’s actual local time.

All content payloads passed the restaurant-content validator; offer payloads passed the specials validator; pin source wikis passed validation. Reviewed Azure images were publicly downloaded, checked against their byte hashes and decoded. All 66 representative live pin pages returned HTTP 200 and displayed their gallery images; named menu samples were checked where items are published. The two deliberate link-only menus are Feicui Taizi·Shengyan and Meet Plus, with the research gaps preserved above.

After the merge refresh, canonical API reads verified all 876 import payloads across 875 distinct branches: 870 new content profiles and five existing profiles refreshed. Every prepared menu item and offer matches its saved record. Seven representative guide views passed checks for visible populated tabs, hidden empty tabs, empty-view fallback, and local upcoming offer times. The Shanghai Specials page showed its next starts in GMT+8 outside service hours. All 66 checked pins showed the restaurant name and gallery image; all 64 with published items showed the sampled menu item. Verification metadata is saved in `restaurant-china-35-verification-2026-10-12.json`.
