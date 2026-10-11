# Taste-profile review audit — October 11, 2026

Audited all 65 live native taste profiles. Preserved the 37 profiles that already
had reviews and added verified review links to 18 more: 55 now display tasting
reviews beneath the radar. The remaining 10 show a dated, specific review gap
in the visible profile basis. All 65 public radars were checked, including the
rendered links and excerpts for all 55 review sections and visible gap text for
all 10 unresolved profiles. Readback confirms existing axes and ABV values were
preserved; the 28 updated pins retained dates, parents, media, ratings and references.

Content was saved through `PUT /api/pins/:id/taste`; no deployment was needed.
The catalog and Chinese product research snapshot are synchronized. The full
[structured audit](taste-review-audit-2026-10-11.json) contains every profile,
review attribution, scope, checked sources, search queries and public verification.

## Remaining review gaps

- [Nestlé's KitKat F1 Collectable Tin Goes on Sale in UK for Christmas](https://www.chronopin.com/pin/5610): No firsthand tasting review verified for the UK 132 g F1 tin. An Indian 10-car tin review and the 138 g travel-retail assortment have different pack contents and were excluded.
- [Cadbury Dairy Milk Smash Bauble Arrives in UK for Christmas](https://www.chronopin.com/pin/5611): No firsthand tasting review verified for the Freddo Faces Smash Bauble 90 g. Retailers publish descriptions but no usable tasting text.
- [Cadbury Biscoff Filled Centres Launch in UK for Christmas](https://www.chronopin.com/pin/5612): No firsthand tasting review text verified for Biscoff Filled Centres. Morrisons shows one aggregate score but zero written customer reviews; launch announcements were excluded.
- [Nongshim's Neoguling Neoguri Onion-Ring Snack Goes on Sale 12 October](https://www.chronopin.com/pin/5625): No firsthand tasting review verified for Neoguling ahead of its announced October 12 release; Neoguri ramen and ordinary onion-ring reviews were excluded.
- [OREO Pistash-YO Limited Edition Launches in the UAE](https://www.chronopin.com/pin/5627): No usable firsthand tasting review verified for the UAE Pistash-YO edition. Launch coverage and PR posts were found; other pistachio Oreo variants were excluded.
- [Parag Milk Foods Launches Avvatar Popped Protein Chips in India](https://www.chronopin.com/pin/5629): No firsthand tasting review verified for Avvatar Popped Protein Chips. The manufacturer’s review widget exposes no written reviews; protein powder, wafer and other-brand chip reviews were excluded.
- [Bauducco and Paçoquita Launch Chocottone Paçoquita for Christmas in Brazil](https://www.chronopin.com/pin/5735): No firsthand tasting review verified for Bauducco Chocottone Paçoquita 2026 after Portuguese-language searches. Retailer descriptions and launch copy were excluded, as were Havanna’s different Paçoquita panettone.
- [2026 Bourbon County Brand Apple Crisp Stout Releases November 27](https://www.chronopin.com/pin/7017): No firsthand tasting review verified for the 2026 Apple Crisp Stout ahead of its November 27 release. Published brewer notes and lineup previews remain the basis of this estimate.
- [2026 Bourbon County Brand Triple Oak Barleywine Releases November 27](https://www.chronopin.com/pin/7018): No firsthand tasting review verified for the 2026 Triple Oak Barleywine ahead of its November 27 release. Published brewer notes and lineup previews remain the basis of this estimate.
- [Arán Bakery Wins Blas na hÉireann 2026 Supreme Champion Again](https://www.chronopin.com/pin/7626): No descriptive firsthand tasting review verified for the award-winning 80% spelt sourdough. General bakery reviews and praise of its spelt bread lack flavor detail; other Arán bakeries and other loaves were excluded.

## Evidence scope

Reviews of historical Koala’s March, Rummy/Bacchus and Sour Bats are explicitly
labeled historical evidence, not 2026 batch verification. The Ferrero review
covers only the Dark 55% bar; Hi-Chew evidence covers Crisp Fruit Mix, not the
Umai-Chew assortment. Oriental Leaf is a 900 ml bottle review, separate from
the pin’s US pack. Weee ambassador accounts and customer reviews hosted by
manufacturers are identified. FUNDAY’s generated review summaries were excluded.
Cass Zero’s publisher review and date were verified through indexed publisher
content, but its full text became inaccessible on recheck; only the review link
is displayed, without an unverified excerpt. All review publication dates not
established from the source remain null.

These subjective reviews add flavor context. They do not turn editorial radar
estimates into measured results or published ratings.
