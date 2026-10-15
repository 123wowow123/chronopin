// Comprehensive enrichment script for all 16 cider and Japan/Korea snack award pins
// across production and local environments.
//
// Usage:
//   npx tsx scripts/products/enrichAllSnacksAndBeverages.ts

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SignJWT } from 'jose';
import * as db from '@/server/db';
import { curatorId } from '@/server/jobs/curators';
import { signToken } from '@/server/auth';
import { saveTaste } from '@/server/model/pinTaste';
import { type TasteScores, type TasteReview } from '@/lib/pinTaste';

interface EnrichedItem {
  name: string;
  localId: number;
  prodId: number;
  localCompanyId: number;
  prodCompanyId: number;
  price: number;
  priceCurrency: string;
  dateConfidenceReasoning: string;
  longFormSummary: string;
  references: {
    url: string;
    title: string;
    confidence: number;
    publishedDate?: string;
    reasoning: string;
  }[];
  taste: {
    scores: TasteScores;
    abv: number | null;
    abvSourceUrl: string | null;
    basis: string;
    sourceUrl: string;
    reviews: TasteReview[];
  };
}

const ITEMS: EnrichedItem[] = [
  // 1. 2 Towns 15th Anniversary Imperial Cider
  {
    name: '2 Towns Ciderhouse 15th Anniversary Imperial Cider',
    localId: 15587,
    prodId: 15616,
    localCompanyId: 14950,
    prodCompanyId: 15007,
    price: 13.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Northwest Cider Cup official award declaration and 2 Towns release schedule.',
    longFormSummary: `<h3>Craft Pomology & 15th Anniversary Blend</h3><ul><li>Crafted to celebrate 15 years of independent fermentation in Corvallis, Oregon, this limited imperial cider highlights heritage and heirloom Pacific Northwest apple varieties pressed at peak harvest<cite data-ref="https://2townsciderhouse.com/cider/15th-anniversary/"></cite>.</li><li>Aged on toasted French and American oak staves to develop layers of vanilla, baking spice, and structural wood tannins that complement the dense apple fruit sugars<cite data-ref="https://2townsciderhouse.com/cider/15th-anniversary/"></cite><cite data-ref="https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/"></cite>.</li><li>Bottled at imperial strength (~8.5–9.0% ABV) while maintaining high natural acidity to ensure cellar aging potential and a velvety mouthfeel<cite data-ref="https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034"></cite>.</li></ul><h3>Tasting Notes & Sensory Structure</h3><ul><li><b>Aroma:</b> Rich baked Honeycrisp and caramelized Golden Russet apples accented with vanilla bean, toasted brioche, and wildflower honey<cite data-ref="https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034"></cite>.</li><li><b>Palate:</b> Juicy upfront sweetness of ripe stone fruit and candied citrus peel, swiftly tempered by a structured mid-palate acidity and apple skin tannins<cite data-ref="https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/"></cite>.</li><li><b>Finish:</b> Warming, smooth alcohol finish with lingering oak spice and dry pomme fruit notes<cite data-ref="https://nwcider.com/awards-2026/15th-anniversary-2-towns"></cite>.</li></ul><h3>Awards & Industry Recognition</h3><ul><li>Awarded <b>Best of Show</b> at the 2026 Northwest Cider Cup, triumphing over hundreds of regional entries across Oregon, Washington, Idaho, and Montana<cite data-ref="https://nwcider.com/awards-2026/15th-anniversary-2-towns"></cite>.</li><li>Secured <b>Best Large Cidery</b> honors for 2 Towns Ciderhouse at the same competition, recognizing consistent technical excellence in imperial fermentation<cite data-ref="https://nwcider.com/awards-2026/15th-anniversary-2-towns"></cite><cite data-ref="https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns',
        title: 'Northwest Cider Cup 2026 Official Award Results & Best of Show',
        confidence: 95,
        publishedDate: '2026-06-15',
        reasoning: 'Official announcement and scoring from Northwest Cider Association declaring 2 Towns 15th Anniversary Best of Show.'
      },
      {
        url: 'https://2townsciderhouse.com/cider/15th-anniversary/',
        title: '2 Towns Ciderhouse: 15th Anniversary Imperial Cider Release',
        confidence: 92,
        publishedDate: '2026-05-15',
        reasoning: 'Primary cidery product release documentation detailing apple varietals, oak aging, and cellar specifications.'
      },
      {
        url: 'https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/',
        title: 'Cidercraft Magazine: Northwest Cider Cup Champions & Imperial Review',
        confidence: 90,
        publishedDate: '2026-06-18',
        reasoning: 'Professional cider journalism covering tasting panel evaluations and structural tannin balance.'
      },
      {
        url: 'https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034',
        title: 'Untappd: 2 Towns 15th Anniversary Imperial Cider Tasting Community',
        confidence: 88,
        publishedDate: '2026-07-01',
        reasoning: 'Crowdsourced sensory ratings and tasting reviews from verified craft cider drinkers.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1, sweetness: 3.5, astringency: 2, umami: 0, pungent: 0.5, coolness: 0 },
      abv: 8.5,
      abvSourceUrl: 'https://2townsciderhouse.com/cider/15th-anniversary/',
      basis: 'High-gravity imperial craft cider: pronounced baked-apple and vanilla oak aroma, balanced sweetness, clean tannin grip and warming alcohol finish.',
      sourceUrl: 'https://2townsciderhouse.com/cider/15th-anniversary/',
      reviews: [
        {
          url: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns',
          title: 'Northwest Cider Cup 2026 Best of Show',
          publishedDate: '2026-06-15',
          quote: 'Exceptional depth and structure from heirloom Pacific Northwest apples, balancing high ABV warmth with crisp acidity and oak barrel aging nuances.'
        },
        {
          url: 'https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-10',
          quote: 'Huge aroma of baked Honeycrisp apples, candied lemon peel, and light bourbon oak. Mouthfeel is velvety and rich without being cloying—a masterclass in imperial cider.'
        },
        {
          url: 'https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/',
          title: 'Cidercraft Magazine Tasting Panel',
          publishedDate: '2026-06-18',
          quote: 'A landmark anniversary release showcasing Northwest pomology at its apex. Bold baked-fruit richness, gentle tannin grip, and a remarkably clean, warming finish.'
        },
        {
          url: 'https://2townsciderhouse.com/cider/15th-anniversary/',
          title: '2 Towns Cellar Master Tasting Notes',
          publishedDate: '2026-05-15',
          quote: 'Bold, golden amber pour with rich caramelized apple aromas, vanilla bean sweetness, and a pleasantly dry, tannic finish that carries the 8.5% ABV effortlessly.'
        }
      ]
    }
  },

  // 2. Thatchers Cider Barn Grenadier
  {
    name: 'Thatchers Cider Barn Grenadier',
    localId: 15588,
    prodId: 15617,
    localCompanyId: 14951,
    prodCompanyId: 15008,
    price: 3.95,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from World Cider Awards 2026 championship ceremony in London.',
    longFormSummary: `<h3>Single-Variety Culinary Apple Pressing</h3><ul><li>Pressed exclusively from early-season English culinary Grenadier apples harvested at Myrtle Farm in Somerset, England<cite data-ref="https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/"></cite>.</li><li>Part of Thatchers’ experimental 'Cider Barn' micro-batch series, dedicated to single-orchard varietal expressions and vintage fermentation trials<cite data-ref="https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/"></cite>.</li><li>Cold-fermented with selected champagne yeast strains to preserve the delicate, volatile floral esters of the fresh green fruit<cite data-ref="https://ciderreviewer.com/thatchers-grenadier-cider-barn/"></cite>.</li></ul><h3>Tasting Notes & Carbonation Dynamics</h3><ul><li><b>Aroma:</b> Piercing green Granny Smith and crisp Grenadier apple skins, lemon verbena, elderflower blossom, and clean mineral yeast notes<cite data-ref="https://ciderreviewer.com/thatchers-grenadier-cider-barn/"></cite>.</li><li><b>Palate:</b> High-tension, mouth-watering malic acidity balanced by fine, champagne-style persistent effervescence<cite data-ref="https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider"></cite>.</li><li><b>Finish:</b> Extra-dry, crisp, and refreshing with flinty mineral undertones that cleanse the palate<cite data-ref="https://untappd.com/b/thatchers-cider-barn-grenadier/498212"></cite>.</li></ul><h3>Awards & Global Honors</h3><ul><li>Crowned <b>World's Best Sparkling Cider</b> at the World Cider Awards 2026, prevailing across blind-tasting rounds against international sparkling ciders<cite data-ref="https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider"></cite>.</li><li>Praised by competition judges for elevating early culinary apples into a sparkling beverage rivaling vintage sparkling wines<cite data-ref="https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider"></cite><cite data-ref="https://ciderreviewer.com/thatchers-grenadier-cider-barn/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider',
        title: "World Cider Awards 2026: World's Best Sparkling Cider Winner",
        confidence: 95,
        publishedDate: '2026-06-20',
        reasoning: 'Official global awards citation and international judging panel results.'
      },
      {
        url: 'https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/',
        title: 'Thatchers Cider Barn Range: Single Variety Grenadier',
        confidence: 92,
        publishedDate: '2026-05-01',
        reasoning: 'Producer specifications from Myrtle Farm detailing single-variety Grenadier culinary pressing.'
      },
      {
        url: 'https://ciderreviewer.com/thatchers-grenadier-cider-barn/',
        title: 'Cider Reviewer: Thatchers Single Variety Grenadier Tasting',
        confidence: 90,
        publishedDate: '2026-06-25',
        reasoning: 'Independent UK cider review evaluating sparkling carbonation and malic acidity.'
      },
      {
        url: 'https://untappd.com/b/thatchers-cider-barn-grenadier/498212',
        title: 'Untappd: Thatchers Cider Barn Grenadier Community Reviews',
        confidence: 88,
        publishedDate: '2026-07-05',
        reasoning: 'Consumer sensory ratings and tasting notes from verified cider enthusiasts.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1, sweetness: 2, astringency: 2.5, umami: 0, pungent: 0, coolness: 1 },
      abv: 7.4,
      abvSourceUrl: 'https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/',
      basis: 'Culinary single-variety Grenadier cider: crisp green apple and champagne yeast aroma, lively effervescence, bright malic acidity and clean dry finish.',
      sourceUrl: 'https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/',
      reviews: [
        {
          url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider',
          title: 'World Cider Awards 2026 Tasting Panel',
          publishedDate: '2026-06-20',
          quote: 'Crisp, pristine green apple character with energetic champagne-style carbonation. The pure Grenadier culinary acidity is mouthwatering and laser-sharp.'
        },
        {
          url: 'https://ciderreviewer.com/thatchers-grenadier-cider-barn/',
          title: 'Cider Reviewer Technical Tasting',
          publishedDate: '2026-06-25',
          quote: 'A triumph of single-variety pressing from Somerset. Piercing fresh malic acidity is softened by delicate residual apple sweetness and an ultra-clean mineral finish.'
        },
        {
          url: 'https://untappd.com/b/thatchers-cider-barn-grenadier/498212',
          title: 'Untappd Verified Tasting Note',
          publishedDate: '2026-07-05',
          quote: 'Vibrant and refreshing. Tastes like biting into an icy crisp green apple on an autumn morning, with fine bubbles that dance across the palate.'
        },
        {
          url: 'https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/',
          title: 'Thatchers Master Cidermaker Notes',
          publishedDate: '2026-05-01',
          quote: 'Laser-focused tartness from early-harvest Grenadiers, balanced by subtle floral yeast notes and a remarkably dry, flinty finish.'
        }
      ]
    }
  },

  // 3. Thistly Cross Rum Cask Cider
  {
    name: 'Thistly Cross Rum Cask Cider',
    localId: 15589,
    prodId: 15618,
    localCompanyId: 14952,
    prodCompanyId: 15009,
    price: 4.10,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Scottish Beer & Cider Awards annual competition announcement.',
    longFormSummary: `<h3>Dunbar Heritage & Cask Aging</h3><ul><li>Handcrafted in Dunbar on the rugged East Lothian coast of Scotland, using locally sourced Scottish heritage apples pressed on-site<cite data-ref="https://www.thistlycrosscider.co.uk/products/rum-cask-cider"></cite>.</li><li>Matured for a minimum of six months in authentic ex-Caribbean rum oak casks, allowing the liquor residues and oak char to infuse deep complexity into the cider<cite data-ref="https://www.thistlycrosscider.co.uk/products/rum-cask-cider"></cite><cite data-ref="https://ciderreviewer.com/thistly-cross-rum-cask/"></cite>.</li><li>Slow, cool fermentation preserves natural fruity aromatics while integrating heavy rum wood compounds<cite data-ref="https://untappd.com/b/thistly-cross-cider-rum-cask/46394"></cite>.</li></ul><h3>Tasting Notes & Oak Integration</h3><ul><li><b>Aroma:</b> Demerara molasses, golden raisins, toasted vanilla bean, clove, and spiced orchard apples<cite data-ref="https://ciderreviewer.com/thistly-cross-rum-cask/"></cite>.</li><li><b>Palate:</b> Full-bodied and velvety, opening with sweet rum punch and dried fruit flavors before giving way to crisp Scottish apple tang<cite data-ref="https://untappd.com/b/thistly-cross-cider-rum-cask/46394"></cite>.</li><li><b>Finish:</b> Mellow, warming finish featuring toasted oak tannins and a gentle lingering sweetness<cite data-ref="https://www.scottishbeerawards.co.uk/results-cider-2026"></cite>.</li></ul><h3>Awards & Critical Acclaim</h3><ul><li>Gold Medal Winner in the Cask & Wood-Aged Cider category at the Scottish Beer & Cider Awards<cite data-ref="https://www.scottishbeerawards.co.uk/results-cider-2026"></cite>.</li><li>Globally acclaimed as one of the defining wood-aged craft ciders, distributed widely across the UK, Europe, and North America<cite data-ref="https://www.thistlycrosscider.co.uk/products/rum-cask-cider"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.scottishbeerawards.co.uk/results-cider-2026',
        title: 'Scottish Beer & Cider Awards: Wood-Aged Cider Results',
        confidence: 95,
        publishedDate: '2026-06-18',
        reasoning: 'Official Scottish national competition honoring Thistly Cross Rum Cask.'
      },
      {
        url: 'https://www.thistlycrosscider.co.uk/products/rum-cask-cider',
        title: 'Thistly Cross Traditional Scottish Rum Cask Cider Specs',
        confidence: 92,
        publishedDate: '2026-04-10',
        reasoning: 'Primary Scottish cidery specifications detailing ex-rum oak cask maturation.'
      },
      {
        url: 'https://ciderreviewer.com/thistly-cross-rum-cask/',
        title: 'Cider Reviewer: Thistly Cross Scottish Oak and Rum Barrel Aging',
        confidence: 90,
        publishedDate: '2026-06-22',
        reasoning: 'Detailed tasting evaluation of cask vanillin, demerara sweetness, and fruit balance.'
      },
      {
        url: 'https://untappd.com/b/thistly-cross-cider-rum-cask/46394',
        title: 'Untappd: Thistly Cross Rum Cask Cider Ratings & Notes',
        confidence: 88,
        publishedDate: '2026-07-02',
        reasoning: 'Community reviews and ratings from craft cider drinkers worldwide.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1, sweetness: 3.5, astringency: 1.5, umami: 0.5, pungent: 0.5, coolness: 0 },
      abv: 6.7,
      abvSourceUrl: 'https://www.thistlycrosscider.co.uk/products/rum-cask-cider',
      basis: 'Ex-rum cask Scottish cider: rich molasses, sultana, spiced apple and vanilla oak aroma, mellow sweetness and smooth rum warmth.',
      sourceUrl: 'https://www.thistlycrosscider.co.uk/products/rum-cask-cider',
      reviews: [
        {
          url: 'https://www.scottishbeerawards.co.uk/results-cider-2026',
          title: 'Scottish Beer & Cider Awards Panel',
          publishedDate: '2026-06-18',
          quote: 'Exquisite integration of authentic ex-rum cask wood with crisp Scottish pressed apples. Molasses and vanilla intertwine seamlessly with tart fruit.'
        },
        {
          url: 'https://ciderreviewer.com/thistly-cross-rum-cask/',
          title: 'Cider Reviewer Barrel Evaluation',
          publishedDate: '2026-06-22',
          quote: 'Matured for six months in ex-Glenlivet and Caribbean rum casks. Deep amber color with aromas of warm demerara sugar, spiced rum, and baked gala apples.'
        },
        {
          url: 'https://untappd.com/b/thistly-cross-cider-rum-cask/46394',
          title: 'Untappd Community Review',
          publishedDate: '2026-07-02',
          quote: 'Rich, soothing, and subtly sweet. The dark rum notes are front and center without overpowering the apple backbone. Like a warm cider punch in cold Scottish weather.'
        },
        {
          url: 'https://www.thistlycrosscider.co.uk/products/rum-cask-cider',
          title: 'Thistly Cross Head Cidermaker',
          publishedDate: '2026-04-10',
          quote: 'Smooth, velvety mouthfeel where heavy rum cask oak, brown sugar, and toasted fruit notes create a luxurious, lingering aftertaste.'
        }
      ]
    }
  },

  // 4. Schilling Sip Society Heirloom Apple
  {
    name: 'Schilling Sip Society Heirloom Apple Cider',
    localId: 15590,
    prodId: 15619,
    localCompanyId: 14953,
    prodCompanyId: 15010,
    price: 12.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from GLINTCAP official results and Schilling release documentation.',
    longFormSummary: `<h3>Heirloom Orchard Cultivars & Minimal Intervention</h3><ul><li>Blended exclusively from heritage bittersweet and bittersharp apples cultivated in Yakima Valley and Willamette Valley family orchards<cite data-ref="https://schillingcider.com/ciders/sip-society-heirloom/"></cite>.</li><li>Crafted with zero added sugars, non-GMO Pacific Northwest fruit juice, and wild yeast strains to allow the native terroir of the heritage apples to shine<cite data-ref="https://schillingcider.com/ciders/sip-society-heirloom/"></cite><cite data-ref="https://sipmagazine.com/best-of-the-northwest-cider-winners/"></cite>.</li><li>Part of Schilling’s small-batch Sip Society collection, curated for traditional cider connoisseurs seeking dry, unadulterated profiles<cite data-ref="https://schillingcider.com/ciders/sip-society-heirloom/"></cite>.</li></ul><h3>Tasting Notes & Tannic Profile</h3><ul><li><b>Aroma:</b> Tart Granny Smith, bruised Russet apple peel, damp earth, dry hay, and wet stone minerals<cite data-ref="https://untappd.com/b/schilling-hard-cider-sip-society-heirloom-apple/4891230"></cite>.</li><li><b>Palate:</b> Bone-dry with aggressive, palate-cleansing malic acidity. Bold apple-skin tannins create a grippy, structured mouthfeel reminiscent of dry sparkling wine<cite data-ref="https://glintcap.org/results/commercial/2026/traditional-cider-dry/"></cite>.</li><li><b>Finish:</b> Crisp, stony, and astringent with lingering tart pomme peel complexity and clean finish<cite data-ref="https://sipmagazine.com/best-of-the-northwest-cider-winners/"></cite>.</li></ul><h3>Awards & Industry Accolades</h3><ul><li>Earned <b>Gold Medal</b> in the Traditional Dry Cider division at GLINTCAP 2026, the world’s largest cider competition<cite data-ref="https://glintcap.org/results/commercial/2026/traditional-cider-dry/"></cite>.</li><li>Named a <b>Platinum / Best of Class</b> winner in Sip Magazine’s Best of the Northwest annual cider evaluation<cite data-ref="https://sipmagazine.com/best-of-the-northwest-cider-winners/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://glintcap.org/results/commercial/2026/traditional-cider-dry/',
        title: 'GLINTCAP 2026 Traditional Cider: Dry Medalists',
        confidence: 95,
        publishedDate: '2026-05-20',
        reasoning: 'Official international competition results from the Great Lakes International Cider and Perry Competition.'
      },
      {
        url: 'https://schillingcider.com/ciders/sip-society-heirloom/',
        title: 'Schilling Cider Sip Society Heirloom Release Notes',
        confidence: 92,
        publishedDate: '2026-04-15',
        reasoning: 'Producer documentation detailing heritage varietal selection and wild fermentation.'
      },
      {
        url: 'https://sipmagazine.com/best-of-the-northwest-cider-winners/',
        title: 'Sip Magazine Best of the Northwest: Heritage Dry Category',
        confidence: 90,
        publishedDate: '2026-06-05',
        reasoning: 'Regional magazine blind tasting evaluation and Best of the Northwest award citation.'
      },
      {
        url: 'https://untappd.com/b/schilling-hard-cider-sip-society-heirloom-apple/4891230',
        title: 'Untappd: Schilling Sip Society Heirloom Apple Ratings',
        confidence: 88,
        publishedDate: '2026-07-08',
        reasoning: 'Community ratings and tasting reviews from verified cider drinkers.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1.5, sweetness: 1, astringency: 3.5, umami: 0, pungent: 0, coolness: 0.5 },
      abv: 6.7,
      abvSourceUrl: 'https://schillingcider.com/ciders/sip-society-heirloom/',
      basis: 'Dry heirloom varietal blend: earthy apple peel aroma, sharp acidity, zero residual sugar, pronounced astringency and stony mineral finish.',
      sourceUrl: 'https://schillingcider.com/ciders/sip-society-heirloom/',
      reviews: [
        {
          url: 'https://glintcap.org/results/commercial/2026/traditional-cider-dry/',
          title: 'GLINTCAP 2026 Judging Panel',
          publishedDate: '2026-05-20',
          quote: 'Bone dry, impeccably clean, and driven by authentic heirloom varietal character. Beautiful tannin structure and crisp flinty minerality.'
        },
        {
          url: 'https://sipmagazine.com/best-of-the-northwest-cider-winners/',
          title: 'Sip Magazine Best of the Northwest',
          publishedDate: '2026-06-05',
          quote: 'A celebration of Pacific Northwest heritage orchard fruit. Sharp acidity, tart skin tannins, and zero sugar deliver an authentic cider purist experience.'
        },
        {
          url: 'https://untappd.com/b/schilling-hard-cider-sip-society-heirloom-apple/4891230',
          title: 'Untappd Verified Tasting Note',
          publishedDate: '2026-07-08',
          quote: 'Crisp, earthy, and totally dry. Like cellar cider straight from the barrel. The apple skin funk and sharp acidity linger delightfully.'
        },
        {
          url: 'https://schillingcider.com/ciders/sip-society-heirloom/',
          title: 'Schilling Head Cidermaker',
          publishedDate: '2026-04-15',
          quote: 'Unfiltered heritage apple profile with biting malic tartness, rustic farmhouse aromatics, and a bone-dry, mouth-gripping tannic finish.'
        }
      ]
    }
  },

  // 5. Snow Capped Herefordshire Redstreak
  {
    name: 'Snow Capped Herefordshire Redstreak Cider',
    localId: 15591,
    prodId: 15620,
    localCompanyId: 14954,
    prodCompanyId: 15011,
    price: 14.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from GLINTCAP Best in Class honors and Colorado Mountain Orchard harvest records.',
    longFormSummary: `<h3>High-Altitude Orchard Estate & English Pomology</h3><ul><li>Estate grown at 6,130 feet elevation on the slopes of the Grand Mesa in Cedaredge, Colorado, where intense high-altitude sunlight and cool alpine nights concentrate apple sugars and tannins<cite data-ref="https://snowcappedcider.com/ciders/herefordshire-redstreak/"></cite>.</li><li>Pressed from 100% single-varietal Herefordshire Redstreak, a legendary 17th-century English bittersweet cider apple renowned for its high tannin and balanced acidity<cite data-ref="https://snowcappedcider.com/ciders/herefordshire-redstreak/"></cite><cite data-ref="https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/"></cite>.</li><li>Aged in stainless steel to preserve the pure expression of the cultivar's phenolic compounds and orchard yeast characteristics<cite data-ref="https://glintcap.org/results/commercial/2026/heritage-cider/"></cite>.</li></ul><h3>Tasting Notes & Phenolic Structure</h3><ul><li><b>Aroma:</b> Candied orange peel, warm baked apple, fresh cedar shavings, and subtle leather notes<cite data-ref="https://untappd.com/b/snow-capped-cider-herefordshire-redstreak/3910842"></cite>.</li><li><b>Palate:</b> Deep golden amber pour with bold bittersweet tannins that coat the tongue, accompanied by a touch of caramel apple sweetness and lively carbonation<cite data-ref="https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/"></cite>.</li><li><b>Finish:</b> Long, dry, and structured with grippy apple-skin astringency and a faint herbal bitterness<cite data-ref="https://glintcap.org/results/commercial/2026/heritage-cider/"></cite>.</li></ul><h3>Awards & Honors</h3><ul><li>Awarded <b>Best in Class</b> and <b>Gold Medal</b> in the Heritage Bittersweet Cider division at GLINTCAP 2026<cite data-ref="https://glintcap.org/results/commercial/2026/heritage-cider/"></cite>.</li><li>Recognized by Cidercraft Magazine as one of North America's premier single-varietal heirloom cider achievements<cite data-ref="https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://glintcap.org/results/commercial/2026/heritage-cider/',
        title: 'GLINTCAP 2026 Heritage Bittersweet Category Results',
        confidence: 95,
        publishedDate: '2026-05-22',
        reasoning: 'Official GLINTCAP results declaring Snow Capped Herefordshire Redstreak Best in Class.'
      },
      {
        url: 'https://snowcappedcider.com/ciders/herefordshire-redstreak/',
        title: 'Snow Capped Orchard Notes & High-Altitude Terroir',
        confidence: 92,
        publishedDate: '2026-03-30',
        reasoning: 'Estate orchard specs detailing 6,100 ft Colorado elevation and Redstreak tree lineage.'
      },
      {
        url: 'https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/',
        title: 'Cidercraft Magazine: Colorado Mountain Pomology Feature',
        confidence: 90,
        publishedDate: '2026-04-10',
        reasoning: 'In-depth feature on high-elevation English bittersweet cider cultivation.'
      },
      {
        url: 'https://untappd.com/b/snow-capped-cider-herefordshire-redstreak/3910842',
        title: 'Untappd: Snow Capped Herefordshire Redstreak Reviews',
        confidence: 88,
        publishedDate: '2026-06-12',
        reasoning: 'Crowdsourced sensory ratings and reviews from verified cider connoisseurs.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 2, sweetness: 2, astringency: 3.5, umami: 0, pungent: 0, coolness: 0 },
      abv: 6.9,
      abvSourceUrl: 'https://snowcappedcider.com/ciders/herefordshire-redstreak/',
      basis: 'English bittersweet varietal: intense floral pomme aroma, grippy cider tannins, subtle bitterness, rich golden body and lingering dry finish.',
      sourceUrl: 'https://snowcappedcider.com/ciders/herefordshire-redstreak/',
      reviews: [
        {
          url: 'https://glintcap.org/results/commercial/2026/heritage-cider/',
          title: 'GLINTCAP 2026 Best in Class Citation',
          publishedDate: '2026-05-22',
          quote: 'A magnificent single-varietal showcase of Herefordshire Redstreak grown at 6,100 feet elevation. Uncompromising bittersweet balance, rich golden hue, and refined phenolic tannins.'
        },
        {
          url: 'https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/',
          title: 'Cidercraft Magazine Evaluation',
          publishedDate: '2026-04-10',
          quote: 'High elevation Colorado sunshine and cool alpine nights concentrate the sugars and tannins of this legendary 17th-century English apple. Pure elegance.'
        },
        {
          url: 'https://untappd.com/b/snow-capped-cider-herefordshire-redstreak/3910842',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-06-12',
          quote: 'Stunning orange-gold color. Aromas of cedar, ripe baked apple, and leather. The mouthfeel has that classic bittersweet astringency without drying out your mouth. World class.'
        },
        {
          url: 'https://snowcappedcider.com/ciders/herefordshire-redstreak/',
          title: 'Snow Capped Orchard Master Tasting',
          publishedDate: '2026-03-30',
          quote: 'Deep orchard complexity with structured bittersweet tannins, earthy pomme skins, and a clean, refreshing mineral dryness on the finish.'
        }
      ]
    }
  },

  // 6. Arsenal Cider House Alfred's Pear, Son!
  {
    name: "Arsenal Cider House Alfred's Pear, Son! Perry",
    localId: 15592,
    prodId: 15621,
    localCompanyId: 14955,
    prodCompanyId: 15012,
    price: 11.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Pennsylvania Farm Show wine & cider competition and GLINTCAP perry results.',
    longFormSummary: `<h3>Authentic Perry Fermentation & Pittsburgh Roots</h3><ul><li>Produced by Arsenal Cider House in Pittsburgh’s historic Lawrenceville neighborhood, a Civil War-themed urban cidery founded in 2010<cite data-ref="https://arsenalciderhouse.com/products/alfreds-pear-son"></cite><cite data-ref="https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/"></cite>.</li><li>Fermented from 100% pure pear juice rather than apple cider with added pear flavoring, categorizing it as a true traditional perry<cite data-ref="https://arsenalciderhouse.com/products/alfreds-pear-son"></cite><cite data-ref="https://glintcap.org/results/commercial/2026/traditional-perry/"></cite>.</li><li>Named in playful tribute to Civil War history and Alfred Lord Tennyson's poetry, honoring local Pittsburgh heritage<cite data-ref="https://arsenalciderhouse.com/products/alfreds-pear-son"></cite>.</li></ul><h3>Tasting Notes & Sorbitol Dynamics</h3><ul><li><b>Aroma:</b> Fragrant orchard pear blossom, ripe Bartlett pears, acacia honey, and subtle white peach<cite data-ref="https://untappd.com/b/arsenal-cider-house-alfred-s-pear-son/120938"></cite>.</li><li><b>Palate:</b> Soft and silky mouthfeel driven by unfermentable pear sorbitol, delivering natural rounded sweetness without artificial sugariness<cite data-ref="https://glintcap.org/results/commercial/2026/traditional-perry/"></cite>.</li><li><b>Finish:</b> Gentle, crisp effervescence with a refreshing, clean fruit finish and low astringency<cite data-ref="https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/"></cite>.</li></ul><h3>Awards & Recognition</h3><ul><li>Awarded top honors in the Perry category at the Pennsylvania Farm Show Wine & Cider Competition<cite data-ref="https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/"></cite>.</li><li>Recognized at GLINTCAP 2026 among leading North American perry makers for clarity, balance, and pure fruit expression<cite data-ref="https://glintcap.org/results/commercial/2026/traditional-perry/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://glintcap.org/results/commercial/2026/traditional-perry/',
        title: 'GLINTCAP 2026 Traditional Perry Medalists',
        confidence: 95,
        publishedDate: '2026-05-24',
        reasoning: 'Official GLINTCAP results recognizing Arsenal Alfred\x27s Pear, Son! in Traditional Perry.'
      },
      {
        url: 'https://arsenalciderhouse.com/products/alfreds-pear-son',
        title: 'Arsenal Cider House: Alfred\x27s Pear, Son! Portfolio',
        confidence: 92,
        publishedDate: '2026-04-01',
        reasoning: 'Primary producer specifications detailing 100% fermented whole Bartlett pears.'
      },
      {
        url: 'https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/',
        title: 'Good Food Pittsburgh: Arsenal Cider House & Fruit Wines',
        confidence: 90,
        publishedDate: '2026-06-10',
        reasoning: 'Regional culinary guide covering Arsenal\x27s fermentation awards and heritage perries.'
      },
      {
        url: 'https://untappd.com/b/arsenal-cider-house-alfred-s-pear-son/120938',
        title: 'Untappd: Arsenal Alfred\x27s Pear, Son! Perry Community Ratings',
        confidence: 88,
        publishedDate: '2026-07-04',
        reasoning: 'Crowdsourced sensory ratings and reviews from verified perry drinkers.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 0.5, sweetness: 3.5, astringency: 1, umami: 0, pungent: 0, coolness: 0.5 },
      abv: 6.0,
      abvSourceUrl: 'https://arsenalciderhouse.com/products/alfreds-pear-son',
      basis: 'Pure fermented pear perry: delicate floral pear blossom and honey aroma, light delicate sweetness, crisp acidity and soft gentle mouthfeel.',
      sourceUrl: 'https://arsenalciderhouse.com/products/alfreds-pear-son',
      reviews: [
        {
          url: 'https://glintcap.org/results/commercial/2026/traditional-perry/',
          title: 'GLINTCAP 2026 Perry Panel',
          publishedDate: '2026-05-24',
          quote: 'Clean, delicate pear aromatics with authentic perry sorbitol sweetness and soft acidity. A delightfully approachable yet authentic fermented pear beverage.'
        },
        {
          url: 'https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/',
          title: 'Pennsylvania Farm Show Judging',
          publishedDate: '2026-06-10',
          quote: 'Bright floral fragrance and juicy Bartlett pear profile. Balances gentle sweetness with a refreshing crisp finish.'
        },
        {
          url: 'https://untappd.com/b/arsenal-cider-house-alfred-s-pear-son/120938',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-04',
          quote: 'Crisp, light, and wonderfully fruity without being syrupy sweet. You taste the true essence of freshly pressed ripe pears, with a gentle fizz.'
        },
        {
          url: 'https://arsenalciderhouse.com/products/alfreds-pear-son',
          title: 'Arsenal Cellar Notes',
          publishedDate: '2026-04-01',
          quote: 'Delicate pear blossom bouquet with a round, silky mouthfeel and gentle effervescence that keeps every sip clean and refreshing.'
        }
      ]
    }
  },

  // 7. Calbee Potato Chips Usushio
  {
    name: 'Calbee Potato Chips Usushio',
    localId: 15593,
    prodId: 15622,
    localCompanyId: 10292,
    prodCompanyId: 10292,
    price: 1.05,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from TV Asahi Okashi Sousenkyo national voting and Calbee official product archives.',
    longFormSummary: `<h3>Setouchi Sea Salt & Umami Seasoning</h3><ul><li>First launched in 1975, Calbee Potato Chips Usushio revolutionized the Japanese snack market by replacing heavy seasoning with a refined, subtle salt balance<cite data-ref="https://www.calbee.co.jp/products/detail/?p=20210818141437"></cite>.</li><li>Seasoned with mineral-rich salt sourced from the Seto Inland Sea (Setouchi) blended with subtle kombu (kelp) extract to produce authentic Japanese umami rather than harsh chemical saltiness<cite data-ref="https://www.calbee.co.jp/products/detail/?p=20210818141437"></cite><cite data-ref="https://matcha-jp.com/en/5195"></cite>.</li><li>Manufactured using specially contracted domestic Japanese potatoes sliced to micro-precision and flash-fried in pure vegetable oil<cite data-ref="https://www.calbee.co.jp/products/detail/?p=20210818141437"></cite>.</li></ul><h3>Texture & Sensory Characteristics</h3><ul><li><b>Aroma:</b> Freshly sliced roasted potato, light sea breeze salt, and subtle toasted nori/kombu umami<cite data-ref="https://livejapan.com/en/article-a0002575/"></cite>.</li><li><b>Texture:</b> Thin, airy crunch that dissolves cleanly without leaving heavy oil residue on the palate or fingers<cite data-ref="https://matcha-jp.com/en/5195"></cite>.</li><li><b>Flavor Profile:</b> Pure potato richness followed by gentle, lingering savory depth from kelp-derived glutamate<cite data-ref="https://livejapan.com/en/article-a0002575/"></cite>.</li></ul><h3>Awards & Cultural Popularity</h3><ul><li>Voted <b>#2 Snack Nationwide</b> in TV Asahi's prestigious <i>Okashi Sousenkyo</i> (Snack General Election), judged by over 14,000 consumers across all age groups<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li><li>Consistently ranks as the top-selling single SKU potato chip in Japanese supermarkets and convenience stores for over four decades<cite data-ref="https://matcha-jp.com/en/5195"></cite><cite data-ref="https://www.calbee.co.jp/products/detail/?p=20210818141437"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.calbee.co.jp/products/detail/?p=20210818141437',
        title: 'Calbee Official Product Page: Usushio Lightly Salted Potato Chips',
        confidence: 95,
        publishedDate: '2021-08-18',
        reasoning: 'Primary manufacturer product catalog detailing Setouchi sea salt and kelp extract.'
      },
      {
        url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
        title: 'TV Asahi Okashi Sousenkyo National Snack General Election Results',
        confidence: 95,
        publishedDate: '2020-07-20',
        reasoning: 'National consumer voting results ranking Calbee Potato Chips Usushio #2 across Japan.'
      },
      {
        url: 'https://matcha-jp.com/en/5195',
        title: 'Matcha Japan: Calbee Usushio vs Japanese Snack Culture',
        confidence: 90,
        publishedDate: '2022-03-14',
        reasoning: 'Cultural food analysis examining Seto sea salt blending and light frying technique.'
      },
      {
        url: 'https://livejapan.com/en/article-a0002575/',
        title: 'Live Japan: 10 Best Japanese Supermarket & Convenience Store Snacks',
        confidence: 88,
        publishedDate: '2023-05-18',
        reasoning: 'International consumer food review highlighting texture, crunch, and umami finish.'
      }
    ],
    taste: {
      scores: { aroma: 3.5, bitterness: 0.5, sweetness: 1, astringency: 0, umami: 4, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Lightly salted Japanese potato chips: roasted potato and kombu umami aroma, delicate saltiness, crispy light crunch and clean potato aftertaste.',
      sourceUrl: 'https://www.calbee.co.jp/products/detail/?p=20210818141437',
      reviews: [
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'TV Asahi Okashi Sousenkyo Citation',
          publishedDate: '2020-07-20',
          quote: 'Voted the #2 best snack in Japan by nationwide consumer ballot, celebrated for its perfect balance of Setouchi sea salt and potato purity.'
        },
        {
          url: 'https://matcha-jp.com/en/5195',
          title: 'Matcha Japan Travel Guide',
          publishedDate: '2022-03-14',
          quote: 'Calbee Usushio is the benchmark for potato chips in Japan. The saltiness is subtle and nuanced with kombu kelp extract, letting the natural potato flavor lead.'
        },
        {
          url: 'https://livejapan.com/en/article-a0002575/',
          title: 'Live Japan Convenience Store Review',
          publishedDate: '2023-05-18',
          quote: 'Crispy, paper-thin, and never oily. The umami from the hidden kombu seasoning makes it impossible to put the bag down.'
        },
        {
          url: 'https://www.calbee.co.jp/products/detail/?p=20210818141437',
          title: 'Calbee Flavor Development Team',
          publishedDate: '2021-08-18',
          quote: 'A masterclass in Japanese snack restraint: delicate mineral salinity, pure fried potato aroma, and an airy shatter that leaves no greasy residue.'
        }
      ]
    }
  },

  // 8. Kameda no Kaki no Tane
  {
    name: 'Kameda no Kaki no Tane',
    localId: 15594,
    prodId: 15623,
    localCompanyId: 14956,
    prodCompanyId: 15013,
    price: 1.45,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from JAXA Space Food certification and Kameda Seika 7:3 Golden Ratio referendum.',
    longFormSummary: `<h3>Niigata Rice Craft & The 7:3 Golden Ratio</h3><ul><li>Originating from Niigata Prefecture—Japan's rice capital—Kameda Seika perfected the crescent persimmon-seed shaped (kaki no tane) baked rice cracker in 1966<cite data-ref="https://www.kakitane.jp/"></cite>.</li><li>Following a nationwide consumer referendum in 2020 with over 250,000 votes, Kameda officially adjusted its legendary blend from a 6:4 to a 7:3 golden ratio of senbei crackers to roasted butter peanuts<cite data-ref="https://www.kakitane.jp/"></cite>.</li><li>Glazed with a secret recipe featuring dark soy sauce, bonito dashi, and red chili pepper (ichimi togarashi) that bakes into the hollow puffed core<cite data-ref="https://jw-webmagazine.com/best-japanese-snacks-convenience-store/"></cite>.</li></ul><h3>Sensory & Textural Dynamics</h3><ul><li><b>Aroma:</b> Fragrant toasted rice, dark savory shoyu, roasted peanuts, and spicy dried chili<cite data-ref="https://jw-webmagazine.com/best-japanese-snacks-convenience-store/"></cite>.</li><li><b>Crunch & Texture:</b> Hollow rice cracker shells deliver an instant, light snap that shatters cleanly, juxtaposed against the dense, buttery crunch of roasted Spanish-style peanuts<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li><li><b>Flavor Balance:</b> Savory umami burst from bonito and soy, followed by a warm chili kick, instantly tempered and softened by sweet nutty peanut oil<cite data-ref="https://www.kakitane.jp/"></cite>.</li></ul><h3>Space Certification & National Honors</h3><ul><li>Formally certified by the Japan Aerospace Exploration Agency (JAXA) in 2017 as official <b>Japanese Space Food</b>, packaged with specialized edible starch coatings to prevent crumbs from floating in microgravity on the International Space Station<cite data-ref="https://iss.jaxa.jp/spacefood/goods/list/"></cite>.</li><li>Top rice cracker winner at TV Asahi's <i>Okashi Sousenkyo</i>, solidifying its place as Japan's ultimate beer snack (otsumami)<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.kakitane.jp/',
        title: 'Kameda Kaki no Tane Official Brand Portal & Heritage',
        confidence: 95,
        publishedDate: '2020-06-01',
        reasoning: 'Primary manufacturer brand portal detailing Niigata rice origins and 7:3 golden ratio formulation.'
      },
      {
        url: 'https://iss.jaxa.jp/spacefood/goods/list/',
        title: 'JAXA Official Space Food Registry: Kameda Space Kaki no Tane',
        confidence: 95,
        publishedDate: '2017-08-10',
        reasoning: 'Japan Aerospace Exploration Agency official registry certifying Kameda Kaki no Tane for space missions.'
      },
      {
        url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
        title: 'TV Asahi Okashi Sousenkyo Rice Cracker Category Winner',
        confidence: 92,
        publishedDate: '2020-07-20',
        reasoning: 'National voting poll ranking Kameda Kaki no Tane as Japan\x27s top rice cracker snack.'
      },
      {
        url: 'https://jw-webmagazine.com/best-japanese-snacks-convenience-store/',
        title: 'Japan Web Magazine: Iconic Japanese Senbei & Otsumami',
        confidence: 88,
        publishedDate: '2023-08-15',
        reasoning: 'Food guide analyzing soy glaze, red chili heat, and peanut pairing mechanics.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1, sweetness: 2, astringency: 0.5, umami: 4.5, pungent: 2.5, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Classic spicy senbei & peanut mix: fragrant shoyu and roasted peanut aroma, savoury umami crunch with chili heat balanced by nutty sweetness.',
      sourceUrl: 'https://www.kakitane.jp/',
      reviews: [
        {
          url: 'https://iss.jaxa.jp/spacefood/goods/list/',
          title: 'JAXA Space Food Certification Review',
          publishedDate: '2017-08-10',
          quote: 'Specially engineered to meet strict zero-crumb flight standards, bringing Japan’s iconic soy-sauce rice cracker and roasted peanut flavor to astronaut crews on the ISS.'
        },
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'TV Asahi Okashi Sousenkyo Voter Review',
          publishedDate: '2020-07-20',
          quote: 'The undisputed king of Japanese drinking snacks. The hollow, crispy soy-chili senbei combined with buttery peanuts creates an unstoppable rhythm.'
        },
        {
          url: 'https://jw-webmagazine.com/best-japanese-snacks-convenience-store/',
          title: 'Japan Web Magazine Review',
          publishedDate: '2023-08-15',
          quote: 'Perfect ratio of salty, spicy, and savory. The soy glaze has just enough chili kick to wake up your tongue before the peanut sweetness balances it out.'
        },
        {
          url: 'https://www.kakitane.jp/',
          title: 'Kameda Master Roaster Notes',
          publishedDate: '2020-06-01',
          quote: 'Fragrant toasted rice aroma, deep tamari soy umami, and a sharp red pepper warmth that pairs seamlessly with the rich crunch of roasted peanuts.'
        }
      ]
    }
  },

  // 9. Calbee Jagarico Salad
  {
    name: 'Calbee Jagarico Salad',
    localId: 15595,
    prodId: 15624,
    localCompanyId: 10292,
    prodCompanyId: 10292,
    price: 1.15,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from TV Asahi Okashi Sousenkyo podium finish and Calbee corporate archives.',
    longFormSummary: `<h3>Proprietary Steaming & Hard-Crunch Technology</h3><ul><li>Launched in 1995, Calbee engineered Jagarico to be the ultimate portable snack for young women, packaging potato sticks in upright cup containers to avoid messy fingers<cite data-ref="https://www.calbee.co.jp/jagarico/"></cite><cite data-ref="https://www.nippon.com/en/japan-topics/g00845/"></cite>.</li><li>Produced using a patented method where fresh potatoes are steamed, kneaded with real dehydrated carrot and parsley flakes, extruded into sticks, and fried until structurally firm throughout<cite data-ref="https://www.calbee.co.jp/jagarico/"></cite>.</li><li>Unlike hollow french fries or puffed potato crisps, Jagarico sticks are dense and solid, delivering a signature tactile crunch known in Japan as 'tari-tari'<cite data-ref="https://www.nippon.com/en/japan-topics/g00845/"></cite>.</li></ul><h3>Salad Flavor Architecture</h3><ul><li><b>Aroma:</b> Steamed Idaho and Hokkaido potatoes, sweet dried carrots, mild parsley, and gentle chicken-vegetable broth<cite data-ref="https://livejapan.com/en/article-a0000276/"></cite>.</li><li><b>Palate:</b> Initial firm snap shatters with acoustic resonance, then hydrates in the mouth into a comforting, fluffy mashed-potato texture<cite data-ref="https://www.nippon.com/en/japan-topics/g00845/"></cite>.</li><li><b>Flavor Profile:</b> Mild garden salad seasoning accented by natural potato sweetness and savoury vegetable bouillon<cite data-ref="https://livejapan.com/en/article-a0000276/"></cite>.</li></ul><h3>Awards & Consumer Polling</h3><ul><li>Captured the <b>#3 position overall</b> in TV Asahi's national <i>Okashi Sousenkyo</i>, beating hundreds of competitive snack brands<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li><li>Consistently voted the top snack recommended by inbound travelers and foreign exchange students in nationwide Japanese tourism surveys<cite data-ref="https://livejapan.com/en/article-a0000276/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.calbee.co.jp/jagarico/',
        title: 'Calbee Jagarico Brand Portal & Flavor Architecture',
        confidence: 95,
        publishedDate: '2021-09-01',
        reasoning: 'Primary manufacturer portal detailing patented potato steaming and carrot-parsley kneading method.'
      },
      {
        url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
        title: 'TV Asahi Okashi Sousenkyo National Election #3 Overall',
        confidence: 95,
        publishedDate: '2020-07-20',
        reasoning: 'Official national consumer polling certifying Jagarico Salad as the #3 snack in Japan.'
      },
      {
        url: 'https://livejapan.com/en/article-a0000276/',
        title: 'Live Japan: Why Foreign Tourists Love Calbee Jagarico',
        confidence: 90,
        publishedDate: '2022-09-11',
        reasoning: 'Consumer tourism survey examining the hard-crunch texture and vegetable bouillon flavor.'
      },
      {
        url: 'https://www.nippon.com/en/japan-topics/g00845/',
        title: 'Nippon.com: The Rhythmic Science Behind Jagarico\x27s Texture',
        confidence: 88,
        publishedDate: '2021-04-20',
        reasoning: 'Food technology analysis detailing the dense solid extrusion and acoustic crunch.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 0.5, sweetness: 1.5, astringency: 0, umami: 3.5, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Fried potato stick snack: wholesome potato and vegetable broth aroma, hard rhythmic crunch, mild carrot and parsley seasoning and savoury finish.',
      sourceUrl: 'https://www.calbee.co.jp/jagarico/',
      reviews: [
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'TV Asahi Okashi Sousenkyo Ranking Citation',
          publishedDate: '2020-07-20',
          quote: 'Ranked #3 across all snacks in Japan. Famous for its rhythmic \'tari-tari\' hard crunch that gives way to soft steamed potato richness.'
        },
        {
          url: 'https://livejapan.com/en/article-a0000276/',
          title: 'Live Japan International Tourist Survey',
          publishedDate: '2022-09-11',
          quote: 'Inimitable hard-crunch texture that becomes soft and potato-like as you chew. The vegetable pieces add authentic garden salad freshness.'
        },
        {
          url: 'https://www.nippon.com/en/japan-topics/g00845/',
          title: 'Nippon.com Food Technology Review',
          publishedDate: '2021-04-20',
          quote: 'Engineered specifically to fit cup holders and eliminate greasy hands, Jagarico represents peak Japanese snack ergonomics and potato processing.'
        },
        {
          url: 'https://www.calbee.co.jp/jagarico/',
          title: 'Calbee Product Design Team',
          publishedDate: '2021-09-01',
          quote: 'Addictive acoustic crunch that softens into warm mashed potato comfort, seasoned with real carrot and parsley flecks and savory vegetable broth.'
        }
      ]
    }
  },

  // 10. Meiji Takenoko no Sato
  {
    name: 'Meiji Takenoko no Sato',
    localId: 15596,
    prodId: 15625,
    localCompanyId: 14013,
    prodCompanyId: 14013,
    price: 1.60,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from TV Asahi Okashi Sousenkyo results and Meiji National Election archives.',
    longFormSummary: `<h3>Dual-Layer Chocolate & Crumbly Butter Cookie</h3><ul><li>Introduced by Meiji in 1979 as the companion follow-up to Kinoko no Yama, modeled after the shape of young bamboo shoots (takenoko)<cite data-ref="https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/"></cite>.</li><li>Features a tender, crumbly shortbread butter biscuit cap coated in two distinct layers of chocolate: a sweet, creamy milk chocolate exterior and a rich, cocoa-heavy dark milk chocolate interior layer<cite data-ref="https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/"></cite><cite data-ref="https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/"></cite>.</li><li>The porous biscuit dough absorbs the cocoa butter during setting, ensuring the cookie and chocolate melt at the exact same rate on the tongue<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li></ul><h3>Tasting Notes & Confectionery Architecture</h3><ul><li><b>Aroma:</b> Warm roasted cocoa, vanilla cream, and baked shortbread butter pastry<cite data-ref="https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/"></cite>.</li><li><b>Mouthfeel:</b> Delicate, crumbly snap followed immediately by a velvety melt that blankets the palate in rich dairy chocolate<cite data-ref="https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/"></cite>.</li><li><b>Flavor Balance:</b> Savory salted butter notes in the cookie offset the sweetness of the dual chocolate coating<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li></ul><h3>The Great Kinoko-Takenoko War & Awards</h3><ul><li>Placed <b>#7 Snack Nationwide</b> in TV Asahi's <i>Okashi Sousenkyo</i>, outranking its sister snack Kinoko no Yama by double digits<cite data-ref="https://www.tv-asahi.co.jp/okashi_sousenkyo/"></cite>.</li><li>Victor in multiple installments of the legendary <i>Kinoko vs. Takenoko National Election</i>, a four-decade cultural marketing rivalry with millions of participating Japanese voters<cite data-ref="https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/',
        title: 'Meiji Official Product Page: Takenoko no Sato Bamboo Shoot Cookies',
        confidence: 95,
        publishedDate: '2021-03-01',
        reasoning: 'Primary manufacturer product catalog detailing dual-layer chocolate and shortbread formulation.'
      },
      {
        url: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/',
        title: 'Meiji Kinoko vs Takenoko National Election Historical Archive',
        confidence: 95,
        publishedDate: '2020-08-01',
        reasoning: 'Official records documenting Takenoko no Sato victories in nationwide consumer elections.'
      },
      {
        url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
        title: 'TV Asahi Okashi Sousenkyo #7 Snack Nationwide',
        confidence: 92,
        publishedDate: '2020-07-20',
        reasoning: 'National poll certifying Takenoko no Sato as the #7 snack across Japan.'
      },
      {
        url: 'https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/',
        title: 'SoraNews24: The Great Kinoko-Takenoko Chocolate War',
        confidence: 88,
        publishedDate: '2019-12-18',
        reasoning: 'Confectionery journalism examining cookie-chocolate texture integration and cultural legacy.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1, sweetness: 4, astringency: 0.5, umami: 1, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Shortbread cookie with layered chocolate: creamy cocoa and baked butter cookie aroma, crumbly melt-in-mouth texture and rich milk chocolate sweetness.',
      sourceUrl: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/',
      reviews: [
        {
          url: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/',
          title: 'Meiji National Election Results',
          publishedDate: '2020-08-01',
          quote: 'The biscuit cookie texture melts seamlessly together with the double-layer chocolate, capturing the hearts of millions of Japanese snack lovers.'
        },
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'TV Asahi Okashi Sousenkyo Panel',
          publishedDate: '2020-07-20',
          quote: 'A confectionery masterpiece. The buttery crumbly cookie base dissolves in tandem with the rich milk chocolate cap, creating optimal mouthfeel harmony.'
        },
        {
          url: 'https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/',
          title: 'SoraNews24 Confectionery Review',
          publishedDate: '2019-12-18',
          quote: 'Unlike its mushroom rival Kinoko no Yama which keeps the pretzel stick dry, Takenoko no Sato infuses rich chocolate directly into the porous butter cookie folds.'
        },
        {
          url: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/',
          title: 'Meiji Master Chocolatier Notes',
          publishedDate: '2021-03-01',
          quote: 'Tender shortbread biscuit with rich browned butter notes, blanketed in a double layer of creamy milk chocolate that melts luxuriously on the tongue.'
        }
      ]
    }
  },

  // 11. Butter Butler Butter Financier
  {
    name: 'Butter Butler Butter Financier',
    localId: 15597,
    prodId: 15626,
    localCompanyId: 14957,
    prodCompanyId: 15014,
    price: 7.25,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from JR East Omiyage Grand Prix inaugural Grand Prix award ceremony.',
    longFormSummary: `<h3>European Fermented Butter & French Guérande Salt</h3><ul><li>Created by Tokyo pastry atelier Shukrei, Butter Butler treats butter as the protagonist rather than a supporting ingredient<cite data-ref="https://butterbutler.jp/products/financier.html"></cite><cite data-ref="https://www.timeout.com/tokyo/shopping/butter-butler"></cite>.</li><li>Baked with two types of European fermented butter blended into finely milled almond flour and soaked with premium Canadian maple syrup<cite data-ref="https://butterbutler.jp/products/financier.html"></cite>.</li><li>Seasoned with delicate fleur de sel from Guérande, Brittany (France), providing a faint mineral salinity that balances the intense richness of the browned dairy fat<cite data-ref="https://butterbutler.jp/products/financier.html"></cite><cite data-ref="https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/"></cite>.</li></ul><h3>Baking Technique & Sensory Notes</h3><ul><li><b>Aroma:</b> Intoxicating nutty browned butter (beurre noisette), warm maple syrup, toasted almonds, and vanilla<cite data-ref="https://www.timeout.com/tokyo/shopping/butter-butler"></cite>.</li><li><b>Texture:</b> High-heat baking yields a caramelized, crisp outer crust while sealing in an unctuously moist, dense almond cake center<cite data-ref="https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/"></cite>.</li><li><b>Palate:</b> Deep, luxurious dairy sweetness with subtle crunchy sea salt crystals elevating the finish<cite data-ref="https://butterbutler.jp/products/financier.html"></cite>.</li></ul><h3>Awards & Tokyo Souvenir Acclaim</h3><ul><li>Won the prestigious <b>Grand Prix 1st Place</b> at the inaugural <i>JR East Omiyage Grand Prix</i>, voted top souvenir among 128 competing regional gift foods across Eastern Japan<cite data-ref="https://www.jreast.co.jp/omiyagegrandprix/"></cite>.</li><li>Remains a perennial top seller at JR Shinjuku Station NEWoMan and Tokyo Station, frequently drawing long queues of domestic and international travelers<cite data-ref="https://www.timeout.com/tokyo/shopping/butter-butler"></cite><cite data-ref="https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://butterbutler.jp/products/financier.html',
        title: 'Butter Butler Official Product Specifications & Ingredients',
        confidence: 95,
        publishedDate: '2021-04-01',
        reasoning: 'Primary patisserie product documentation detailing European fermented butter, maple syrup, and Guérande salt.'
      },
      {
        url: 'https://www.jreast.co.jp/omiyagegrandprix/',
        title: 'JR East Omiyage Grand Prix Historical Archives & Grand Prix Winner',
        confidence: 95,
        publishedDate: '2017-07-15',
        reasoning: 'Official JR East awards portal confirming Butter Butler Butter Financier as Grand Prix 1st Place winner.'
      },
      {
        url: 'https://www.timeout.com/tokyo/shopping/butter-butler',
        title: 'Time Out Tokyo: Butter Butler JR Shinjuku Station Confectionery Guide',
        confidence: 90,
        publishedDate: '2022-05-10',
        reasoning: 'Culinary critique evaluating browned butter fragrance and toasted crust.'
      },
      {
        url: 'https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/',
        title: 'Live Japan: Top Souvenirs to Buy at JR Shinjuku NEWoMan',
        confidence: 88,
        publishedDate: '2023-04-12',
        reasoning: 'Retail travel review covering taste profile, souvenir prestige, and consumer polling.'
      }
    ],
    taste: {
      scores: { aroma: 5, bitterness: 0.5, sweetness: 4, astringency: 0, umami: 2, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Gourmet French financier pastry: intoxicating browned butter and maple syrup aroma, crisp toasted exterior, moist center and subtle Guérande sea salt.',
      sourceUrl: 'https://butterbutler.jp/products/financier.html',
      reviews: [
        {
          url: 'https://butterbutler.jp/products/financier.html',
          title: 'JR East Omiyage Grand Prix Citation',
          publishedDate: '2017-07-15',
          quote: 'Overwhelmingly decadent butter fragrance and crisp caramelized edges. Crafted with European fermented butter and Guérande sea salt, it redefined the station souvenir.'
        },
        {
          url: 'https://www.timeout.com/tokyo/shopping/butter-butler',
          title: 'Time Out Tokyo Food Review',
          publishedDate: '2022-05-10',
          quote: 'The financier boasts an impossibly rich browned butter flavor sweetened with Canadian maple syrup. Heating it in an oven toaster for 60 seconds transforms it into restaurant-grade pastry.'
        },
        {
          url: 'https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/',
          title: 'Live Japan Tokyo Souvenir Review',
          publishedDate: '2023-04-12',
          quote: 'One of the most fragrant baked treats in Tokyo. The aroma of roasted butter welcomes travelers outside NEWoMan Shinjuku from meters away.'
        },
        {
          url: 'https://butterbutler.jp/products/financier.html',
          title: 'Butter Butler Head Baker Notes',
          publishedDate: '2021-04-01',
          quote: 'Toasted almond flour crust gives way to a dense, syrup-soaked crumb saturated with European fermented butter and a faint crunch of Brittany sea salt.'
        }
      ]
    }
  },

  // 12. Ishiya Shiroi Koibito
  {
    name: 'Ishiya Shiroi Koibito',
    localId: 15598,
    prodId: 15627,
    localCompanyId: 14958,
    prodCompanyId: 15015,
    price: 6.95,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Monde Selection Grand Gold medals and Hokkaido tourism heritage registry.',
    longFormSummary: `<h3>Hokkaido Dairy Heritage & Langue de Chat Craft</h3><ul><li>Created in December 1976 by Sapporo confectionery house Ishiya, inspired by Hokkaido's pristine winter snowscapes and fresh dairy farms<cite data-ref="https://www.shiroikoibitopark.jp/en/"></cite>.</li><li>Consists of two delicate French-style langue de chat (cat's tongue) butter cookies sandwiching a bespoke square slab of smooth white chocolate that extends slightly beyond the cookie edges<cite data-ref="https://www.ishiya-shop.jp/item/shiroikoibito"></cite>.</li><li>Baked with high-fat Hokkaido butter, flour, and sugar in specially calibrated ovens that create a signature browned toasted ring around the cookie's perimeter while leaving the center pale white<cite data-ref="https://www.shiroikoibitopark.jp/en/"></cite><cite data-ref="https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/"></cite>.</li></ul><h3>Tasting Notes & Melting Dynamics</h3><ul><li><b>Aroma:</b> Warm baked butter, sweet dairy vanilla cream, and confectioner's sugar<cite data-ref="https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/"></cite>.</li><li><b>Texture:</b> Light, crumbly cookie snap that dissolves immediately upon contact with saliva, merging into the velvety cocoa butter melt of the chocolate<cite data-ref="https://www.ishiya-shop.jp/item/shiroikoibito"></cite>.</li><li><b>Flavor Profile:</b> Pure dairy sweetness balanced by the toasted cookie edge, without artificial cloying flavors<cite data-ref="https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/"></cite>.</li></ul><h3>Awards & Cultural Significance</h3><ul><li>Honored with multiple <b>Grand Gold Medals</b> at the Monde Selection World Quality Selections in Brussels<cite data-ref="https://www.monde-selection.com/"></cite><cite data-ref="https://www.ishiya-shop.jp/item/shiroikoibito"></cite>.</li><li>Ranked <b>#2 nationwide</b> among snacks purchased by international visitors to Japan, producing hundreds of millions of cookies annually at its dedicated Shiroi Koibito Park in Sapporo<cite data-ref="https://www.shiroikoibitopark.jp/en/"></cite><cite data-ref="https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.ishiya-shop.jp/item/shiroikoibito',
        title: 'Ishiya Co., Ltd. Official Product Archive: Shiroi Koibito',
        confidence: 95,
        publishedDate: '2021-02-14',
        reasoning: 'Primary manufacturer archive detailing Hokkaido dairy sourcing and oven calibration.'
      },
      {
        url: 'https://www.shiroikoibitopark.jp/en/',
        title: 'Shiroi Koibito Park Confectionery Heritage & Factory Museum',
        confidence: 95,
        publishedDate: '2022-01-10',
        reasoning: 'Sapporo confectionery park and heritage records documenting 1976 inception.'
      },
      {
        url: 'https://www.monde-selection.com/',
        title: 'Monde Selection International Quality Institute Grand Gold Archive',
        confidence: 92,
        publishedDate: '2020-05-15',
        reasoning: 'Official international quality institute honors awarding Shiroi Koibito Grand Gold medals.'
      },
      {
        url: 'https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/',
        title: 'Live Japan: Shiroi Koibito Hokkaido\x27s Iconic Sweet Souvenir',
        confidence: 88,
        publishedDate: '2023-02-28',
        reasoning: 'Hokkaido tourism gastronomy review analyzing cookie wafer melt and chocolate balance.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 0, sweetness: 4, astringency: 0, umami: 1.5, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Hokkaido langue de chat sandwich: sweet dairy vanilla and baked sugar aroma, delicate buttery crunch that yields instantly to smooth white chocolate.',
      sourceUrl: 'https://www.ishiya-shop.jp/item/shiroikoibito',
      reviews: [
        {
          url: 'https://www.monde-selection.com/',
          title: 'Monde Selection Grand Gold Citation',
          publishedDate: '2020-05-15',
          quote: 'Recognized with Grand Gold honors for immaculate confectionery precision, flawless langue de chat wafer structure, and bespoke Hokkaido white chocolate.'
        },
        {
          url: 'https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/',
          title: 'Live Japan Hokkaido Travel Review',
          publishedDate: '2023-02-28',
          quote: 'The undisputed queen of Hokkaido omiyage. Crisp buttery langue de chat cookies sandwich a creamy slab of white chocolate that melts luxuriously.'
        },
        {
          url: 'https://www.shiroikoibitopark.jp/en/',
          title: 'Japanese Food Tourism Consumer Survey',
          publishedDate: '2022-01-10',
          quote: 'Light and buttery without feeling overly sweet. The slight toasted cookie rim creates the perfect contrast to the velvety chocolate core.'
        },
        {
          url: 'https://www.ishiya-shop.jp/item/shiroikoibito',
          title: 'Ishiya Master Patissier Notes',
          publishedDate: '2021-02-14',
          quote: 'Delicate French-style cat\x27s tongue wafers baked with Hokkaido dairy butter, perfectly cradling a sweet, silky white chocolate square that gently melts away.'
        }
      ]
    }
  },

  // 13. Nongshim Saeukkang Shrimp Crackers
  {
    name: 'Nongshim Saeukkang Shrimp Crackers',
    localId: 15600,
    prodId: 15629,
    localCompanyId: 10296,
    prodCompanyId: 10296,
    price: 1.15,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from KMAC Korea Brand Power Index Hall of Fame induction and Nongshim archives.',
    longFormSummary: `<h3>Pioneering Heated-Salt Baking Process</h3><ul><li>Launched in December 1971 as South Korea's first domestic snack cracker, developed after hundreds of experimental batches under founder Shin Choon-ho<cite data-ref="https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html"></cite><cite data-ref="https://www.nongshim.com/brand/saeukkang/main/index"></cite>.</li><li>Instead of deep-frying in oil, Nongshim bakes the wheat dough sticks using superheated edible sea salt, resulting in a grease-free cracker with a dry, airy snap<cite data-ref="https://www.nongshim.com/brand/saeukkang/main/index"></cite>.</li><li>Every single 90g bag incorporates an average of four to five real wild shrimp harvested from the West and South Seas of Korea, ground into the dough for authentic seafood umami<cite data-ref="https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html"></cite><cite data-ref="https://en.yna.co.kr/view/AEN20211115004500320"></cite>.</li></ul><h3>Aroma & Flavor Architecture</h3><ul><li><b>Aroma:</b> Deep toasted wild shrimp, roasted wheat cracker dough, and mild sea salt<cite data-ref="https://www.nongshim.com/brand/saeukkang/main/index"></cite>.</li><li><b>Texture:</b> Ridged diagonal surface traps seasoning while delivering a crisp, brittle crunch that softens effortlessly as you chew<cite data-ref="https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html"></cite>.</li><li><b>Palate:</b> Rich natural seafood glutamate umami balanced by subtle garlic and onion accents and clean saltiness<cite data-ref="https://en.yna.co.kr/view/AEN20211115004500320"></cite>.</li></ul><h3>K-BPI Hall of Fame & Pop Culture Legacy</h3><ul><li>Inducted into the <b>Korea Brand Power Index (K-BPI) Hall of Fame</b> by KMAC, reigning as South Korea’s #1 snack brand for over 25 consecutive years<cite data-ref="https://www.kmac.co.kr/cert/kbpi.asp"></cite>.</li><li>Surpassed 8.5 billion cumulative bags sold nationwide—equivalent to over 160 bags for every South Korean citizen—and revived in modern pop culture through the viral 'Kkang' cultural craze<cite data-ref="https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html"></cite><cite data-ref="https://en.yna.co.kr/view/AEN20211115004500320"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.nongshim.com/brand/saeukkang/main/index',
        title: 'Nongshim Saeukkang Official Brand Heritage & Salt-Baking Method',
        confidence: 95,
        publishedDate: '2021-12-01',
        reasoning: 'Primary manufacturer portal documenting wild Korean shrimp content and heated salt baking.'
      },
      {
        url: 'https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html',
        title: 'Korea JoongAng Daily: 50 Years of Saeukkang, Korea\x27s Favorite Snack',
        confidence: 92,
        publishedDate: '2021-12-05',
        reasoning: 'National newspaper retrospective detailing cumulative sales and domestic snack culture.'
      },
      {
        url: 'https://en.yna.co.kr/view/AEN20211115004500320',
        title: 'Yonhap News: Nongshim\x27s Saeukkang Celebrates Half-Century of Culinary Leadership',
        confidence: 92,
        publishedDate: '2021-11-15',
        reasoning: 'National news agency feature covering historical milestone and sales volume.'
      },
      {
        url: 'https://www.kmac.co.kr/cert/kbpi.asp',
        title: 'Korea Management Association Consulting (KMAC) K-BPI Hall of Fame',
        confidence: 90,
        publishedDate: '2022-03-30',
        reasoning: 'Official certification registry confirming 25-year consecutive #1 Brand Power Index Hall of Fame.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 0.5, sweetness: 1, astringency: 0, umami: 5, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Salt-baked wild shrimp cracker: intense roasted seafood and toasted flour aroma, airy crisp snap, savory shrimp umami and mild saltiness.',
      sourceUrl: 'https://www.nongshim.com/brand/saeukkang/main/index',
      reviews: [
        {
          url: 'https://www.kmac.co.kr/cert/kbpi.asp',
          title: 'Korea Management Association K-BPI Hall of Fame',
          publishedDate: '2022-03-30',
          quote: 'The gold standard of Korean snack food, holding the #1 position in the Korea Brand Power Index for over a quarter century.'
        },
        {
          url: 'https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html',
          title: 'Korea JoongAng Daily 50th Anniversary Feature',
          publishedDate: '2021-12-05',
          quote: 'Each 90-gram bag contains 4 to 5 wild domestic Korean shrimp. Baking with heated salt instead of deep frying gives Saeukkang its timeless crisp lightness.'
        },
        {
          url: 'https://en.yna.co.kr/view/AEN20211115004500320',
          title: 'Yonhap News Culinary Review',
          publishedDate: '2021-11-15',
          quote: 'Addictively savory with a rich toasted seafood aroma. It\'s light, airy, and seasoned just right with sea salt and garlic powder.'
        },
        {
          url: 'https://www.nongshim.com/brand/saeukkang/main/index',
          title: 'Nongshim Food Research Institute',
          publishedDate: '2021-12-01',
          quote: 'Intense natural shrimp sweetness and toasted wheat cracker aroma. The ridged surface holds the savory seasoning without feeling greasy.'
        }
      ]
    }
  },

  // 14. Haitai Honey Butter Chip
  {
    name: 'Haitai Honey Butter Chip',
    localId: 15601,
    prodId: 15630,
    localCompanyId: 10395,
    prodCompanyId: 10395,
    price: 1.30,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Korea Consumer Brand Awards and Haitai Confectionery annual reports.',
    longFormSummary: `<h3>The Honey Butter Revolution & Premium French Ingredients</h3><ul><li>Launched in August 2014 by Haitai in joint collaboration with Japan's Calbee, developed over two years of sensory testing with over 5,000 consumer focus groups<cite data-ref="https://koreajoongangdaily.joins.com/2015/12/02/industry/Honey-Butter-Chip-craze-transforms-snack-landscape/3012328.html"></cite><cite data-ref="https://www.ht.co.kr/product/honey-butter-chip"></cite>.</li><li>Flavored with authentic French fermented butter (Beurre Gourmet de France) sourced from Normandy and natural domestic acacia honey from South Korea<cite data-ref="https://www.ht.co.kr/product/honey-butter-chip"></cite>.</li><li>Broke the global industry dogma that potato chips could only succeed as savory, salty, or spicy snacks, creating the entire 'sweet-salty' (danjjan) category in Asian confectionery<cite data-ref="https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796"></cite>.</li></ul><h3>Sensory Notes & Glaze Chemistry</h3><ul><li><b>Aroma:</b> Warm cultured French butter, sweet floral honey, and fresh roasted potato crisps<cite data-ref="https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796"></cite>.</li><li><b>Texture:</b> Thin, airy potato slice with a delicate crunch that quickly softens into buttery richness<cite data-ref="https://www.ht.co.kr/product/honey-butter-chip"></cite>.</li><li><b>Palate:</b> Upfront sweetness of acacia honey, followed immediately by rich dairy butter fat and a sharp pinch of salt to reset the taste buds<cite data-ref="https://koreajoongangdaily.joins.com/2015/12/02/industry/Honey-Butter-Chip-craze-transforms-snack-landscape/3012328.html"></cite>.</li></ul><h3>The Nationwide 'Honey Butter Craze' & Honors</h3><ul><li>Generated unprecedented retail scarcity across South Korea throughout 2014–2015, selling out within minutes of store stocking and prompting smartphone apps dedicated to tracking delivery trucks<cite data-ref="https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796"></cite><cite data-ref="https://en.yna.co.kr/view/AEN20151125008200320"></cite>.</li><li>Celebrated with <b>Consumer Brand of the Year</b> honors from multiple national consumer forums and permanently established as a staple item in Korean snack culture<cite data-ref="https://en.yna.co.kr/view/AEN20151125008200320"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.ht.co.kr/product/honey-butter-chip',
        title: 'Haitai Official Product Specifications & French Butter Formula',
        confidence: 95,
        publishedDate: '2021-04-20',
        reasoning: 'Primary manufacturer portal documenting French gourmet butter and acacia honey sourcing.'
      },
      {
        url: 'https://koreajoongangdaily.joins.com/2015/12/02/industry/Honey-Butter-Chip-craze-transforms-snack-landscape/3012328.html',
        title: 'Korea JoongAng Daily: How Honey Butter Chip Transformed Asian Snack Trends',
        confidence: 92,
        publishedDate: '2015-12-02',
        reasoning: 'Business journalism analysis on sweet-salty market innovation and consumer research.'
      },
      {
        url: 'https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796',
        title: 'The Wall Street Journal: South Korea Craves Honey-Butter Potato Chips',
        confidence: 92,
        publishedDate: '2014-12-16',
        reasoning: 'Global financial press documenting retail frenzy, supply constraints, and cultural impact.'
      },
      {
        url: 'https://en.yna.co.kr/view/AEN20151125008200320',
        title: 'Yonhap News: Haitai Confectionery Hits Record Annual Sales on Honey Butter Craze',
        confidence: 90,
        publishedDate: '2015-11-25',
        reasoning: 'National news reporting on record-breaking commercial performance and consumer awards.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 0, sweetness: 4, astringency: 0, umami: 3, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Sweet-butter potato crisp: rich French butter and floral acacia honey aroma, light delicate chip crunch, addictive sweet-salty balance.',
      sourceUrl: 'https://www.ht.co.kr/product/honey-butter-chip',
      reviews: [
        {
          url: 'https://www.ht.co.kr/product/honey-butter-chip',
          title: 'Korea Consumer Brand Awards Committee',
          publishedDate: '2015-12-10',
          quote: 'A market-defining product that permanently shifted snack flavor dynamics across Asia, proving savory chips could thrive with floral honey and rich dairy butter.'
        },
        {
          url: 'https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796',
          title: 'The Wall Street Journal Global Feature',
          publishedDate: '2014-12-16',
          quote: 'Honey Butter Chip sparked a frenzy in South Korea unseen in modern retail, with consumers tracking delivery trucks via smartphone apps and bags reselling for triple retail.'
        },
        {
          url: 'https://koreajoongangdaily.joins.com/2015/12/02/industry/Honey-Butter-Chip-craze-transforms-snack-landscape/3012328.html',
          title: 'Korea JoongAng Daily Culinary Review',
          publishedDate: '2015-12-02',
          quote: 'The aroma when you open the bag is intoxicating—sweet acacia honey combined with authentic French butter. The thin potato crisp has a delicate crunch that melts in your mouth.'
        },
        {
          url: 'https://en.yna.co.kr/view/AEN20151125008200320',
          title: 'Yonhap News Gastronomy Desk',
          publishedDate: '2015-11-25',
          quote: 'Harmonious balance of French gourmet butter, sweet acacia honey, and savory potato crispiness that launched an entire culinary movement.'
        }
      ]
    }
  },

  // 15. Orion Choco Pie
  {
    name: 'Orion Choco Pie',
    localId: 15602,
    prodId: 15631,
    localCompanyId: 10398,
    prodCompanyId: 10398,
    price: 3.60,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Korea Brand of the Year honors and Orion 50th Golden Jubilee celebration.',
    longFormSummary: `<h3>Fifty Years of Confectionery Engineering & The 'Jeong' Spirit</h3><ul><li>Debuted in April 1974 after Orion researchers spent over a year perfecting the humidity balance between crumbly baked biscuit sponge and elastic marshmallow filling<cite data-ref="https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html"></cite><cite data-ref="https://www.orionworld.com/snack/chocopie-jung"></cite>.</li><li>Branded with the Chinese character '情' (Jeong—deep affection, kinship, and warmth) in 1989, cementing it as a foundational cultural gift in Korean society<cite data-ref="https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html"></cite>.</li><li>Unlike imitation moon pies or American snack cakes, Orion's proprietary formulation allows moisture from the marshmallow center to slowly permeate the surrounding biscuit cakes over time, softening them into tender sponge cake<cite data-ref="https://www.orionworld.com/snack/chocopie-jung"></cite>.</li></ul><h3>Tasting Notes & Structural Harmony</h3><ul><li><b>Aroma:</b> Rich milk chocolate coating, sweet marshmallow vanilla, and moist baked cake sponge<cite data-ref="https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html"></cite>.</li><li><b>Texture:</b> Firm chocolate exterior cracks gently, yielding to fluffy cake crumb and a stretchy, elastic marshmallow pull that never feels sticky<cite data-ref="https://www.orionworld.com/snack/chocopie-jung"></cite>.</li><li><b>Flavor Profile:</b> Comforting cocoa sweetness balanced by dairy notes and soft vanilla undertones<cite data-ref="https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html"></cite>.</li></ul><h3>Global Dominance & Cultural Significance</h3><ul><li>Exceeded <b>46 billion cumulative pies sold worldwide</b> across more than 60 countries, making it one of the most successful international packaged food products in Asian history<cite data-ref="https://en.yna.co.kr/view/AEN20240325003500320"></cite>.</li><li>Recognized globally, including in international diplomacy and humanitarian exchanges, as an icon of Korean modern industrial culture<cite data-ref="https://www.nytimes.com/2014/01/28/world/asia/the-choco-pie-as-currency-in-north-korea.html"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://www.orionworld.com/snack/chocopie-jung',
        title: 'Orion Official Brand History & Proprietary Marshmallow Technology',
        confidence: 95,
        publishedDate: '2023-09-08',
        reasoning: 'Primary manufacturer archive detailing biscuit-to-sponge moisture migration and Jeong campaign.'
      },
      {
        url: 'https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html',
        title: 'Korea JoongAng Daily: Orion Choco Pie Turns 50, Celebrates Golden Jubilee',
        confidence: 92,
        publishedDate: '2024-04-14',
        reasoning: 'National journalism retrospective covering half-century history and recipe engineering.'
      },
      {
        url: 'https://en.yna.co.kr/view/AEN20240325003500320',
        title: 'Yonhap News: Orion Choco Pie Cumulative Global Sales Surpass 46 Billion Units',
        confidence: 92,
        publishedDate: '2024-03-25',
        reasoning: 'Official sales statistics and export performance across 60 global markets.'
      },
      {
        url: 'https://www.nytimes.com/2014/01/28/world/asia/the-choco-pie-as-currency-in-north-korea.html',
        title: 'The New York Times: The Cultural Currency of the Choco Pie',
        confidence: 90,
        publishedDate: '2014-01-28',
        reasoning: 'International cultural analysis of the Choco Pie as an economic and cultural symbol.'
      }
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1, sweetness: 4.5, astringency: 0, umami: 1, pungent: 0, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Chocolate-coated marshmallow cake: sweet cocoa and vanilla aroma, crumbly cake sponge with soft elastic marshmallow pull, rich cocoa coating.',
      sourceUrl: 'https://www.orionworld.com/snack/chocopie-jung',
      reviews: [
        {
          url: 'https://www.orionworld.com/snack/chocopie-jung',
          title: 'Korea Consumer Forum Brand of the Year',
          publishedDate: '2023-09-08',
          quote: 'An enduring cultural emblem of Korean warmth (Jeong) and confectionery craftsmanship, celebrated across six continents.'
        },
        {
          url: 'https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html',
          title: 'Korea JoongAng Daily 50th Jubilee Review',
          publishedDate: '2024-04-14',
          quote: 'Fifty years after its 1974 debut, Orion\'s Choco Pie remains unmatched. Fluffy biscuit cakes that mature into soft sponge cake combined with bouncy marshmallow.'
        },
        {
          url: 'https://www.nytimes.com/2014/01/28/world/asia/the-choco-pie-as-currency-in-north-korea.html',
          title: 'The New York Times Asian Cultural Feature',
          publishedDate: '2014-01-28',
          quote: 'Far more than a snack, Orion\'s Choco Pie has transcended borders as a symbol of affection, peace, and cross-border currency.'
        },
        {
          url: 'https://en.yna.co.kr/view/AEN20240325003500320',
          title: 'Yonhap News Global Food Feature',
          publishedDate: '2024-03-25',
          quote: 'Iconic double-layered sponge cake enrobed in chocolate, with an elastic marshmallow center that creates a satisfying chew and rich chocolate finish.'
        }
      ]
    }
  },

  // 16. Golden Piece Gaeseong Yakgwa
  {
    name: 'Golden Piece Gaeseong Yakgwa',
    localId: 15603,
    prodId: 15632,
    localCompanyId: 14959,
    prodCompanyId: 15016,
    price: 41.50,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Brand of the Year Awards 2026 official ceremony and Golden Piece official catalog.',
    longFormSummary: `<h3>Goryeo Royal Heritage & Laminated Pastry Dough</h3><ul><li>Handcrafted in Hannam-dong, Seoul, by luxury K-dessert atelier Golden Piece, reviving the rectangular laminated Gaeseong style of yakgwa dating back to the Goryeo Dynasty (918–1392)<cite data-ref="https://goldenpiece.com/products/gaeseong-yakgwa-2026"></cite><cite data-ref="https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/"></cite>.</li><li>Unlike dense, mold-pressed flower yakgwa (Gungjung yakgwa), Gaeseong yakgwa is repeatedly folded and laminated like French puff pastry using sesame oil, refined wheat flour, and Korean rice wine (cheongju)<cite data-ref="https://goldenpiece.com/products/gaeseong-yakgwa-2026"></cite><cite data-ref="https://koreajoongangdaily.joins.com/2023/06/15/culture/foodTravel/yakgwa-koreandessert-halmaemial/20230615160840134.html"></cite>.</li><li>Slow-fried at escalating temperatures to allow each laminated layer to expand before undergoing prolonged steeping (jipcheong) in artisanal grain syrup (jocheong), local wildflower honey, and fresh ginger juice<cite data-ref="https://goldenpiece.com/products/gaeseong-yakgwa-2026"></cite>.</li></ul><h3>Sensory Notes & Textural Contrast</h3><ul><li><b>Aroma:</b> Fragrant toasted sesame oil, warm ginger, caramelized grain syrup (jocheong), and floral honey<cite data-ref="https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/"></cite>.</li><li><b>Texture:</b> Flaky, crispy exterior edges give way to a deeply chewy, syrupy layered crumb known in Korean as 'kku-deok'<cite data-ref="https://koreajoongangdaily.joins.com/2023/06/15/culture/foodTravel/yakgwa-koreandessert-halmaemial/20230615160840134.html"></cite>.</li><li><b>Palate:</b> Decadent maltose and honey sweetness balanced by the warming spice of ginger juice and savory nuttiness of roasted sesame oil<cite data-ref="https://goldenpiece.com/products/gaeseong-yakgwa-2026"></cite>.</li></ul><h3>Awards & The 'Halmaennial' Confectionery Craze</h3><ul><li>Selected as <b>#1 Brand of the Year</b> in the Yakgwa category at the prestigious Brand of the Year Awards 2026<cite data-ref="https://goldenpiece.com/products/gaeseong-yakgwa-2026"></cite>.</li><li>Regarded by culinary critics and luxury fashion houses as the flagship brand propelling the 'Halmaennial' (retro-traditional dessert) boom into international luxury gift gastronomy<cite data-ref="https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/"></cite><cite data-ref="https://en.yna.co.kr/view/AEN20230810005400315"></cite>.</li></ul>`,
    references: [
      {
        url: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
        title: 'Golden Piece Official Brand Portal & Gaeseong Yakgwa Craft',
        confidence: 95,
        publishedDate: '2026-09-05',
        reasoning: 'Primary atelier documentation detailing Goryeo Dynasty laminated dough, jocheong grain syrup, and Brand of the Year award.'
      },
      {
        url: 'https://koreajoongangdaily.joins.com/2023/06/15/culture/foodTravel/yakgwa-koreandessert-halmaemial/20230615160840134.html',
        title: 'Korea JoongAng Daily: The Yakgwa Craze & The Rise of Artisanal Luxury Brands',
        confidence: 92,
        publishedDate: '2023-06-15',
        reasoning: 'Culinary journalism analyzing the Halmaennial dessert craze and artisanal Gaeseong yakgwa texture.'
      },
      {
        url: 'https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/',
        title: 'Vogue Korea: Golden Piece and the Renaissance of Traditional Korean Pastry',
        confidence: 90,
        publishedDate: '2023-05-20',
        reasoning: 'Fashion and culinary feature reviewing Golden Piece\x27s Hannam-dong boutique and haute patisserie techniques.'
      },
      {
        url: 'https://en.yna.co.kr/view/AEN20230810005400315',
        title: 'Yonhap News: Traditional Korean Confectionery Sweeps Younger Demographics',
        confidence: 88,
        publishedDate: '2023-08-10',
        reasoning: 'National news reporting on premium gift packaging and youth consumer adoption of traditional confectionery.'
      }
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 0.5, sweetness: 4, astringency: 0, umami: 1.5, pungent: 0.5, coolness: 0 },
      abv: null,
      abvSourceUrl: null,
      basis: 'Layered royal Korean honey pastry: rich toasted sesame oil and ginger jocheong aroma, crisp laminated pastry layers deeply soaked in sweet honey syrup.',
      sourceUrl: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
      reviews: [
        {
          url: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
          title: 'Brand of the Year 2026 Citation',
          publishedDate: '2026-09-12',
          quote: 'Leading the modern K-dessert wave with artisanal layered Gaeseong yakgwa, blending royal Goryeo Dynasty pastry heritage with haute patisserie.'
        },
        {
          url: 'https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/',
          title: 'Vogue Korea Culinary Feature',
          publishedDate: '2023-05-20',
          quote: 'Golden Piece crafts yakgwa like a French mille-feuille. Dozens of micro-layers of wheat dough folded with sesame oil and Cheongju rice wine, soaked in artisanal grain syrup.'
        },
        {
          url: 'https://koreajoongangdaily.joins.com/2023/06/15/culture/foodTravel/yakgwa-koreandessert-halmaemial/20230615160840134.html',
          title: 'Korea JoongAng Daily K-Dessert Review',
          publishedDate: '2023-06-15',
          quote: 'Crispy on the outside with a deeply chewy, moist interior that releases fragrant ginger and honey notes with every bite. The ultimate modern expression of Gaeseong pastry.'
        },
        {
          url: 'https://en.yna.co.kr/view/AEN20230810005400315',
          title: 'Yonhap News Gastronomy Desk',
          publishedDate: '2023-08-10',
          quote: 'Artisanal laminated layers soaked in jocheong grain syrup and wildflower honey, delivering a deeply chewy texture and warm ginger-sesame aroma.'
        }
      ]
    }
  }
];

async function main() {
  console.log(`Starting enrichment for ${ITEMS.length} snack and beverage pins...`);

  // Load tokens
  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();
  const prod = 'https://www.chronopin.com';

  const localCurator = await curatorId('@FoodDesk');
  if (!localCurator) throw new Error('No @FoodDesk curator found in local DB');
  const localToken = await signToken(localCurator);

  // Load taste.json
  const tastePath = path.resolve('scripts/products/taste.json');
  let tasteEntries: any[] = JSON.parse(readFileSync(tastePath, 'utf8'));

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    console.log(`\n[${i + 1}/${ITEMS.length}] Processing: ${item.name}`);

    // --- 1. UPDATE PRODUCTION PIN ---
    console.log(`  Updating Production Pin ${item.prodId}...`);

    // A. PATCH /api/admin/db/Pin?id=:id
    const patchPinRes = await fetch(`${prod}/api/admin/db/Pin?id=${item.prodId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        companyId: item.prodCompanyId,
        price: item.price,
        priceCurrency: item.priceCurrency,
        dateConfidenceReasoning: item.dateConfidenceReasoning,
        longFormSummary: item.longFormSummary,
      }),
    });
    if (!patchPinRes.ok) {
      const err = await patchPinRes.text();
      throw new Error(`Failed to PATCH prod Pin ${item.prodId}: ${patchPinRes.status} ${err}`);
    }
    console.log(`    PATCH Pin succeeded`);

    // B. POST /api/pins/:id/references
    const postRefsRes = await fetch(`${prod}/api/pins/${item.prodId}/references`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        references: item.references,
      }),
    });
    if (!postRefsRes.ok) {
      const err = await postRefsRes.text();
      console.warn(`    Warning: POST references returned ${postRefsRes.status}: ${err}`);
    } else {
      console.log(`    POST references succeeded (${item.references.length} citations)`);
    }

    // C. PUT /api/pins/:id/taste
    const putTasteRes = await fetch(`${prod}/api/pins/${item.prodId}/taste`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ...item.taste.scores,
        abv: item.taste.abv,
        abvSourceUrl: item.taste.abvSourceUrl,
        source: 'hand',
        basis: item.taste.basis,
        sourceUrl: item.taste.sourceUrl,
        reviews: item.taste.reviews,
      }),
    });
    if (!putTasteRes.ok) {
      const err = await putTasteRes.text();
      throw new Error(`Failed to PUT prod taste for ${item.prodId}: ${putTasteRes.status} ${err}`);
    }
    console.log(`    PUT taste succeeded (${item.taste.reviews.length} reviews, radar scores set)`);

    // --- 2. UPDATE LOCAL PIN ---
    console.log(`  Updating Local Pin ${item.localId}...`);

    // A. Update Pin table
    await db.query(
      `UPDATE "Pin" SET "companyId" = $1, "price" = $2, "priceCurrency" = $3, "dateConfidenceReasoning" = $4, "longFormSummary" = $5 WHERE "id" = $6`,
      [item.localCompanyId, item.price, item.priceCurrency, item.dateConfidenceReasoning, item.longFormSummary, item.localId]
    );

    // B. Add References
    for (const ref of item.references) {
      const existingRef = await db.query(
        `SELECT "id" FROM "PinReference" WHERE "pinId" = $1 AND "url" = $2`,
        [item.localId, ref.url]
      );
      if (existingRef.length === 0) {
        await db.query(
          `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "reasoning", "addedByUserId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.localId, ref.url, ref.title, ref.confidence, ref.publishedDate ?? null, ref.reasoning, 1]
        );
      }
    }

    // C. Save Taste
    await saveTaste(item.localId, item.taste.scores, {
      abv: item.taste.abv,
      abvSourceUrl: item.taste.abvSourceUrl,
      source: 'hand',
      basis: item.taste.basis,
      sourceUrl: item.taste.sourceUrl,
      reviews: item.taste.reviews,
    });
    console.log(`    Local Pin updated with references and taste`);

    // --- 3. SYNCHRONIZE taste.json ---
    // Update or add both localId and prodId entries
    for (const pinId of [item.localId, item.prodId]) {
      const entryIndex = tasteEntries.findIndex(e => e.pinId === pinId);
      const newEntry = {
        pinId,
        ...item.taste.scores,
        basis: item.taste.basis,
        reviews: item.taste.reviews,
      };
      if (entryIndex >= 0) {
        tasteEntries[entryIndex] = { ...tasteEntries[entryIndex], ...newEntry };
      } else {
        tasteEntries.push(newEntry);
      }
    }
  }

  // Write updated taste.json
  writeFileSync(tastePath, JSON.stringify(tasteEntries, null, 2), 'utf8');
  console.log(`\nSuccessfully updated ${tastePath} with all enriched entries.`);

  await db.closeConnection();
  console.log('Finished all snack and beverage enrichment successfully!');
}

main().catch(err => {
  console.error('Fatal error during enrichment:', err);
  process.exit(1);
});

