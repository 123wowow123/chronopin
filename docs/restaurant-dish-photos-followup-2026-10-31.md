# San Diego dish photos and native-pin checks — October 31 follow-up

**Added four reviewed photos, transcribed Sycamore Den’s 17-item ordinary drinks menu, completed all 22 pending association checks, and published Tajima Crown Point’s missing native pin.** This follows the [91-profile pass](restaurant-dish-photos-2026-10-31.md).

## Current coverage

| Measure | Before follow-up | After |
| --- | ---: | ---: |
| Specials profiles containing item photos | 233/280 | 236/280 |
| Specials item-photo attachments | 1,023 | 1,026 |
| Venues with item photos across specials and ordinary menus | 233/280 | 237/280 |
| Venues without either kind of item photo | 47 | 43 |

Sycamore Den’s photo lives in its ordinary-menu content record, so it is **not** counted in the 236 specials profiles. All 280 branch sources were compared with enabled ordinary-menu content to establish the combined count. These are storage counts; they do not imply that every venue has a public guide card or native pin.

## Saved and verified

- **Sidecar Bar:** labelled Blind Pig draft-beer photograph, attached to the unrestricted “Draft beer” entry. Verified the photo strip and menu thumbnail on [native pin 20467](https://www.chronopin.com/pin/20467/sidecar-bar-san-diego-restaurant-guide).
- **Harland Bay Park:** labelled Japanese Lager photograph, attached to “Draft pints.” Exact branch address verified as 4112 Napier Street. Credit: Ryan F. via Yelp. No matching native pin found; stored attachment only.
- **Karl Strauss Sorrento Mesa:** labelled Mosaic IPA photograph, attached to “Karl beers.” Exact branch address verified as 9675 Scranton Road. The existing 4S Ranch pin is a different branch; stored attachment only.
- **Sycamore Den:** transcribed seven house signatures and ten rotating drafts from the [operator’s drinks menu](https://sycamoreden.com/menu), all marked “Price not published.” Attached a visually reviewed, explicitly captioned Wolf Ticket photo. Verified all 17 items, the photo strip, thumbnail and loaded credited lightbox on [native pin 20458](https://www.chronopin.com/pin/20458/sycamore-den-san-diego-restaurant-guide). The ordinary menu does not claim which drinks receive the separate select-drink discount; existing offer conditions were preserved.

The photographed beers are identified as examples in their captions, rather than promises that a rotating beer is currently pouring. No unidentified appetizer was assigned to “Select appetizers.” All four images were visually inspected, uploaded to Azure and downloaded with plain curl. Full API readbacks passed. The three specials profiles retained every non-image field, enabled flag and region. Sycamore’s existing specials profile, pin author and opening date were unchanged. No photographs were added to Git.

## Native-pin association audit

Exact-source lookup was followed by title, source-host and street-address checks for every pending profile. Results included different Tajima and BJ’s branches, the 4S Ranch Karl Strauss, NOIR Sushi, an open-air fish market and unrelated solar/development pins; none was substituted for the requested branch. Every title/address/host result set was below its query limit. Origen’s OpenTable numeric identity was also checked independently.

**All 22 checks are complete. One missing pin was repaired; 21 remain pending evidence.** “No matching pin found” describes these searches, not a claim that a venue cannot exist under an undiscovered identity.

[Tajima Crown Point, pin 20680](https://www.chronopin.com/pin/20680/tajima-ramen-crown-point-san-diego-restaurant-guide) was created as @FoodDesk using its actual **January 12, 2025** opening. The [January 22 corporate announcement](https://ys-food.jp/wps/wp-content/uploads/2025/01/%E3%80%8CTajima-Ramen%E3%80%8D%E3%82%B9%E3%83%BC%E3%83%97%E3%81%AE%E3%82%BB%E3%83%B3%E3%83%88%E3%83%A9%E3%83%AB%E3%82%AD%E3%83%83%E3%83%81%E3%83%B3%E3%82%92%E5%85%BC%E3%81%AD%E3%81%9F%E6%96%B0%E5%BA%97%E8%88%97%E3%82%AA%E3%83%BC%E3%83%97%E3%83%B3%E3%81%A7.pdf) explicitly identifies the branch and its 3782 Ingraham Street address. Coordinates came from the Google Maps place linked by the operator and were saved on both the pin and its specials profile. The pin’s date, author, coordinates, references, source wiki and media attribution were read back; its cache was expired. The live page shows all three previously saved dish photos and thumbnails, and its credited Karaage lightbox loads successfully. The Pacific Beach Specials guide also shows the three dish photos, with both the card title and representative image linking to native pin 20680.

| Profile | Association outcome / remaining evidence |
| --- | --- |
| Origen (121) | No match found. Reconcile closure reports with operator listings at 3831 Park Boulevard. |
| Sandbar Sports Grill (955) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| La Puerta Mission Hills (964) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| The Fish Market San Diego (973) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Sushi Lounge - Point Loma (1014) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Kalaveras - Chula Vista (1021) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Tajima Ramen - Crown Point (1024) | Created native pin 20680; exact-branch opening confirmed. |
| BJ's Restaurant & Brewhouse - Chula Vista (1030) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Chef JUN – Bay Ho (1045) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| The Hangout Restaurant and Bar (1058) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| GARAGE Kitchen + Bar (1066) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Tavern (1075) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| AVANT Restaurant at Rancho Bernardo Inn (1083) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Understory Bar (1101) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Eureka! - San Diego (UTC) (1102) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Islands Restaurant - Eastlake (1116) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Fast Times (1121) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Poway's Irish Pub (1128) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Downtown Cafe Bar & Grill (1131) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Mainstream Bar & Grill - Poway (1133) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| O'Sullivan's Irish Pub - Escondido (1138) | No match found. Establish the exact branch’s opening date, including relocation/takeover context. |
| Il Posto (1165) | No match found. Verify actual first service; the March 2023 lease preview does not establish it. |

## Remaining photo research

**43 venues remain without item photos:** 35 item/variant/portion evidence gaps, five branch/access gaps and three menu gaps. The gallery-extraction gaps for Sidecar, Harland and Karl Strauss were resolved. Sycamore’s empty-menu gap was resolved through ordinary content; its specials profile remains without item attachments.

The three remaining menu gaps are Sushi Lounge Poway, Sammy’s La Jolla and Himalayan Cuisine. Himalayan’s exact-branch regular ordering menu is now readable with named dishes, prices and photos, but it does not establish the composition or pricing of its saved lunch special. It also has no exact-source native-pin match; ordinary-menu transcription/publication and branch-opening checks remain. Do not turn regular dishes into an invented lunch offer.

The five branch/access gaps and 35 item-level gaps retain the prior report’s precise source checks and rejected portions/variants. The [follow-up evidence JSON](restaurant-dish-photos-followup-2026-10-31.json) contains all 43 current outcomes, every attachment and public-image hash, and the complete association query results. Ignored `.scrape/dish-associations-round3/` retains API snapshots, source HTML, original photos, upload receipts and full readbacks.

No application deployment or translations were run. Translations are left to the separate translation agent.
