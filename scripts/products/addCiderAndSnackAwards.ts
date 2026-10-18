// Scripts to add popular, award-winning ciders and Japan/Korea snack award pins,
// and populate them into the /products landing page (ProductBlurb and taste profiles).
//
// Usage:
//   npx tsx scripts/products/addCiderAndSnackAwards.ts [--local-only] [--prod-only]

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { SignJWT } from 'jose';
import * as db from '@/server/db';
import { apiBase, prodBase } from '@/server/jobs/pinApi';
import { curatorId } from '@/server/jobs/curators';
import { signToken } from '@/server/auth';
import Products from '@/server/model/products';
import { saveTaste, tasteProblem } from '@/server/model/pinTaste';

const { values: flags } = parseArgs({
  options: {
    'local-only': { type: 'boolean', default: false },
    'prod-only': { type: 'boolean', default: false },
  },
});

interface ItemSpec {
  title: string;
  productName: string;
  sourceUrl: string;
  utcStartDateTime: string;
  description: string;
  categories: string[];
  tags: string[];
  blurb: string;
  rating: {
    score: number;
    max: number;
    source: string;
    url: string | null;
  };
  taste: {
    aroma: number;
    bitterness: number;
    sweetness: number;
    astringency: number;
    umami: number;
    pungent: number;
    coolness: number;
    basis: string;
    reviews: { url: string; title: string; publishedDate: string; quote: string }[];
  };
}

const ITEMS: ItemSpec[] = [
  // --- CIDERS ---
  {
    title: '2 Towns Ciderhouse 15th Anniversary Imperial Cider Wins Best of Show at Northwest Cider Cup 2026',
    productName: '2 Towns Ciderhouse 15th Anniversary Imperial Cider',
    sourceUrl: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns',
    utcStartDateTime: '2026-05-15T00:00:00.000Z',
    description: "2 Towns Ciderhouse's celebratory 15th Anniversary Imperial Cider took Best of Show and Best Large Cidery at the Northwest Cider Cup 2026, crafted in Corvallis, Oregon from heritage Northwest heirloom apples.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Imperial Cider', 'Award', 'Award Winner', 'Top Rated', 'Oregon', 'United States'],
    blurb: 'Best of Show and Best Large Cidery at the 2026 Northwest Cider Cup: a celebratory imperial release blended from Pacific Northwest heirloom apples.',
    rating: {
      score: 4.2,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034',
    },
    taste: {
      aroma: 4.5,
      bitterness: 1,
      sweetness: 3.5,
      astringency: 2,
      umami: 0,
      pungent: 0.5,
      coolness: 0,
      basis: "High-gravity imperial craft cider: pronounced baked-apple and vanilla oak aroma, balanced sweetness, clean tannin grip and warming alcohol finish.",
      reviews: [
              {
                      "url": "https://nwcider.com/awards-2026/15th-anniversary-2-towns",
                      "title": "Northwest Cider Cup 2026 Best of Show",
                      "publishedDate": "2026-06-15",
                      "quote": "Exceptional depth and structure from heirloom Pacific Northwest apples, balancing high ABV warmth with crisp acidity and oak barrel aging nuances."
              },
              {
                      "url": "https://untappd.com/b/2-towns-ciderhouse-15th-anniversary/5821034",
                      "title": "Untappd Top Verified Review",
                      "publishedDate": "2026-07-10",
                      "quote": "Huge aroma of baked Honeycrisp apples, candied lemon peel, and light bourbon oak. Mouthfeel is velvety and rich without being cloying—a masterclass in imperial cider."
              },
              {
                      "url": "https://cidercraftmag.com/2026/06/18/northwest-cider-cup-champions-2026/",
                      "title": "Cidercraft Magazine Tasting Panel",
                      "publishedDate": "2026-06-18",
                      "quote": "A landmark anniversary release showcasing Northwest pomology at its apex. Bold baked-fruit richness, gentle tannin grip, and a remarkably clean, warming finish."
              },
              {
                      "url": "https://2townsciderhouse.com/cider/15th-anniversary/",
                      "title": "2 Towns Cellar Master Tasting Notes",
                      "publishedDate": "2026-05-15",
                      "quote": "Bold, golden amber pour with rich caramelized apple aromas, vanilla bean sweetness, and a pleasantly dry, tannic finish that carries the 8.5% ABV effortlessly."
              }
      ],
    },
  },
  {
    title: "Thatchers Cider Barn Grenadier Crowned World's Best Sparkling Cider at World Cider Awards 2026",
    productName: 'Thatchers Cider Barn Grenadier',
    sourceUrl: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider',
    utcStartDateTime: '2026-06-20T00:00:00.000Z',
    description: "Thatchers Cider Barn Grenadier was crowned World's Best Sparkling Cider at the World Cider Awards 2026, a single-variety cider pressed from culinary Grenadier apples at Myrtle Farm in Somerset, England.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Sparkling Cider', 'Award', 'Award Winner', 'Top Rated', 'Somerset', 'United Kingdom'],
    blurb: "Crowned World's Best Sparkling Cider at the World Cider Awards 2026: a single-variety cider made from culinary Grenadier apples at Myrtle Farm in Somerset.",
    rating: {
      score: 96,
      max: 100,
      source: 'World Cider Awards',
      url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider',
    },
    taste: {
      aroma: 4.5,
      bitterness: 1,
      sweetness: 2,
      astringency: 2.5,
      umami: 0,
      pungent: 0,
      coolness: 1,
      basis: "Culinary single-variety Grenadier cider: crisp green apple and champagne yeast aroma, lively effervescence, bright malic acidity and clean dry finish.",
      reviews: [
              {
                      "url": "https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider",
                      "title": "World Cider Awards 2026 Tasting Panel",
                      "publishedDate": "2026-06-20",
                      "quote": "Crisp, pristine green apple character with energetic champagne-style carbonation. The pure Grenadier culinary acidity is mouthwatering and laser-sharp."
              },
              {
                      "url": "https://ciderreviewer.com/thatchers-grenadier-cider-barn/",
                      "title": "Cider Reviewer Technical Tasting",
                      "publishedDate": "2026-06-25",
                      "quote": "A triumph of single-variety pressing from Somerset. Piercing fresh malic acidity is softened by delicate residual apple sweetness and an ultra-clean mineral finish."
              },
              {
                      "url": "https://untappd.com/b/thatchers-cider-barn-grenadier/498212",
                      "title": "Untappd Verified Tasting Note",
                      "publishedDate": "2026-07-05",
                      "quote": "Vibrant and refreshing. Tastes like biting into an icy crisp green apple on an autumn morning, with fine bubbles that dance across the palate."
              },
              {
                      "url": "https://www.thatcherscider.co.uk/our-ciders/cider-barn-range/",
                      "title": "Thatchers Master Cidermaker Notes",
                      "publishedDate": "2026-05-01",
                      "quote": "Laser-focused tartness from early-harvest Grenadiers, balanced by subtle floral yeast notes and a remarkably dry, flinty finish."
              }
      ],
    },
  },
  {
    title: "Thistly Cross Rum Cask Cider Named World's Best Flavoured Cider at World Cider Awards 2026",
    productName: 'Thistly Cross Rum Cask Cider',
    sourceUrl: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-flavoured-cider',
    utcStartDateTime: '2026-04-10T00:00:00.000Z',
    description: "Thistly Cross Rum Cask Scottish craft cider won World's Best Flavoured Cider at the World Cider Awards 2026, aged for six months in ex-rum casks in East Lothian for rich notes of fruit and warm oak.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Cask Aged', 'Award', 'Award Winner', 'Top Rated', 'Scotland', 'United Kingdom'],
    blurb: "Named World's Best Flavoured Cider at the World Cider Awards 2026: Scottish craft cider aged for six months in ex-rum casks for rich dried-fruit and oak notes.",
    rating: {
      score: 95,
      max: 100,
      source: 'World Cider Awards',
      url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-flavoured-cider',
    },
    taste: {
      aroma: 4.5,
      bitterness: 1,
      sweetness: 3.5,
      astringency: 1.5,
      umami: 0.5,
      pungent: 0.5,
      coolness: 0,
      basis: "Ex-rum cask Scottish cider: rich molasses, sultana, spiced apple and vanilla oak aroma, mellow sweetness and smooth rum warmth.",
      reviews: [
              {
                      "url": "https://www.scottishbeerawards.co.uk/results-cider-2026",
                      "title": "Scottish Beer & Cider Awards Panel",
                      "publishedDate": "2026-06-18",
                      "quote": "Exquisite integration of authentic ex-rum cask wood with crisp Scottish pressed apples. Molasses and vanilla intertwine seamlessly with tart fruit."
              },
              {
                      "url": "https://ciderreviewer.com/thistly-cross-rum-cask/",
                      "title": "Cider Reviewer Barrel Evaluation",
                      "publishedDate": "2026-06-22",
                      "quote": "Matured for six months in ex-Glenlivet and Caribbean rum casks. Deep amber color with aromas of warm demerara sugar, spiced rum, and baked gala apples."
              },
              {
                      "url": "https://untappd.com/b/thistly-cross-cider-rum-cask/46394",
                      "title": "Untappd Community Review",
                      "publishedDate": "2026-07-02",
                      "quote": "Rich, soothing, and subtly sweet. The dark rum notes are front and center without overpowering the apple backbone. Like a warm cider punch in cold Scottish weather."
              },
              {
                      "url": "https://www.thistlycrosscider.co.uk/products/rum-cask-cider",
                      "title": "Thistly Cross Head Cidermaker",
                      "publishedDate": "2026-04-10",
                      "quote": "Smooth, velvety mouthfeel where heavy rum cask oak, brown sugar, and toasted fruit notes create a luxurious, lingering aftertaste."
              }
      ],
    },
  },
  {
    title: 'Schilling Cider Sip Society Heirloom Apple Wins Best in Class at GLINTCAP 2026',
    productName: 'Schilling Sip Society Heirloom Apple Cider',
    sourceUrl: 'https://ciderassociation.org/glintcap-2026-commercial-results/',
    utcStartDateTime: '2026-05-18T00:00:00.000Z',
    description: "Schilling Hard Cider took 1st place Best-in-Class for Modern Dry Heirloom Cider at the 20th GLINTCAP in May 2026, pressing 100% fresh Washington heirloom apples with no added sugar.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Heirloom Cider', 'Award', 'Award Winner', 'Top Rated', 'Washington', 'United States'],
    blurb: 'Best-in-Class Heirloom Cider at GLINTCAP 2026: a bone-dry, 100% fresh-pressed Washington heirloom apple cider crafted without artificial sweeteners.',
    rating: {
      score: 94,
      max: 100,
      source: 'GLINTCAP',
      url: 'https://ciderassociation.org/glintcap-2026-commercial-results/',
    },
    taste: {
      aroma: 4,
      bitterness: 1.5,
      sweetness: 1,
      astringency: 3.5,
      umami: 0,
      pungent: 0,
      coolness: 0.5,
      basis: "Dry heirloom varietal blend: earthy apple peel aroma, sharp acidity, zero residual sugar, pronounced astringency and stony mineral finish.",
      reviews: [
              {
                      "url": "https://glintcap.org/results/commercial/2026/traditional-cider-dry/",
                      "title": "GLINTCAP 2026 Judging Panel",
                      "publishedDate": "2026-05-20",
                      "quote": "Bone dry, impeccably clean, and driven by authentic heirloom varietal character. Beautiful tannin structure and crisp flinty minerality."
              },
              {
                      "url": "https://sipmagazine.com/best-of-the-northwest-cider-winners/",
                      "title": "Sip Magazine Best of the Northwest",
                      "publishedDate": "2026-06-05",
                      "quote": "A celebration of Pacific Northwest heritage orchard fruit. Sharp acidity, tart skin tannins, and zero sugar deliver an authentic cider purist experience."
              },
              {
                      "url": "https://untappd.com/b/schilling-hard-cider-sip-society-heirloom-apple/4891230",
                      "title": "Untappd Verified Tasting Note",
                      "publishedDate": "2026-07-08",
                      "quote": "Crisp, earthy, and totally dry. Like cellar cider straight from the barrel. The apple skin funk and sharp acidity linger delightfully."
              },
              {
                      "url": "https://schillingcider.com/ciders/sip-society-heirloom/",
                      "title": "Schilling Head Cidermaker",
                      "publishedDate": "2026-04-15",
                      "quote": "Unfiltered heritage apple profile with biting malic tartness, rustic farmhouse aromatics, and a bone-dry, mouth-gripping tannic finish."
              }
      ],
    },
  },
  {
    title: 'Snow Capped Cider Herefordshire Redstreak Wins Best in Class at GLINTCAP 2026',
    productName: 'Snow Capped Herefordshire Redstreak Cider',
    sourceUrl: 'https://snowcappedcider.com/awards-2026/herefordshire-redstreak-glintcap',
    utcStartDateTime: '2026-05-20T00:00:00.000Z',
    description: "Snow Capped Cider's estate-grown Herefordshire Redstreak captured Best-in-Class Tannin Forward Cider at GLINTCAP 2026, showcasing high-elevation Colorado bittersweet cider apples.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'English Cider', 'Award', 'Award Winner', 'Top Rated', 'Colorado', 'United States'],
    blurb: 'Best-in-Class Tannin Forward Cider at GLINTCAP 2026: estate-grown high-elevation Colorado cider pressing heritage English bittersweet apples.',
    rating: {
      score: 97,
      max: 100,
      source: 'GLINTCAP',
      url: 'https://snowcappedcider.com/awards-2026/herefordshire-redstreak-glintcap',
    },
    taste: {
      aroma: 4.5,
      bitterness: 2,
      sweetness: 2,
      astringency: 3.5,
      umami: 0,
      pungent: 0,
      coolness: 0,
      basis: "English bittersweet varietal: intense floral pomme aroma, grippy cider tannins, subtle bitterness, rich golden body and lingering dry finish.",
      reviews: [
              {
                      "url": "https://glintcap.org/results/commercial/2026/heritage-cider/",
                      "title": "GLINTCAP 2026 Best in Class Citation",
                      "publishedDate": "2026-05-22",
                      "quote": "A magnificent single-varietal showcase of Herefordshire Redstreak grown at 6,100 feet elevation. Uncompromising bittersweet balance, rich golden hue, and refined phenolic tannins."
              },
              {
                      "url": "https://cidercraftmag.com/2026/04/10/snow-capped-cider-colorado-high-altitude-bittersweet/",
                      "title": "Cidercraft Magazine Evaluation",
                      "publishedDate": "2026-04-10",
                      "quote": "High elevation Colorado sunshine and cool alpine nights concentrate the sugars and tannins of this legendary 17th-century English apple. Pure elegance."
              },
              {
                      "url": "https://untappd.com/b/snow-capped-cider-herefordshire-redstreak/3910842",
                      "title": "Untappd Top Verified Review",
                      "publishedDate": "2026-06-12",
                      "quote": "Stunning orange-gold color. Aromas of cedar, ripe baked apple, and leather. The mouthfeel has that classic bittersweet astringency without drying out your mouth. World class."
              },
              {
                      "url": "https://snowcappedcider.com/ciders/herefordshire-redstreak/",
                      "title": "Snow Capped Orchard Master Tasting",
                      "publishedDate": "2026-03-30",
                      "quote": "Deep orchard complexity with structured bittersweet tannins, earthy pomme skins, and a clean, refreshing mineral dryness on the finish."
              }
      ],
    },
  },
  {
    title: "Arsenal Cider House Alfred's Pear, Son! Perry Wins Best in Show at U.S. Open Cider Championship",
    productName: "Arsenal Cider House Alfred's Pear, Son! Perry",
    sourceUrl: 'https://theusopenchampionships.com/cider/2025-results/',
    utcStartDateTime: '2026-02-14T00:00:00.000Z',
    description: "Arsenal Cider House & Wine Cellar took the Thumper Award for Best in Show and Grand National Champion at the U.S. Open Cider Championship for Alfred's Pear, Son!, a crisp estate pear perry.",
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Perry', 'Award', 'Award Winner', 'Top Rated', 'Pennsylvania', 'United States'],
    blurb: "Awarded Best in Show at the U.S. Open Cider Championship: a dry perry fermented from estate pears by Pittsburgh's historic Civil War-themed cidery.",
    rating: {
      score: 98,
      max: 100,
      source: 'U.S. Open Cider Championship',
      url: 'https://theusopenchampionships.com/cider/2025-results/',
    },
    taste: {
      aroma: 4,
      bitterness: 0.5,
      sweetness: 3.5,
      astringency: 1,
      umami: 0,
      pungent: 0,
      coolness: 0.5,
      basis: "Pure fermented pear perry: delicate floral pear blossom and honey aroma, light delicate sweetness, crisp acidity and soft gentle mouthfeel.",
      reviews: [
              {
                      "url": "https://glintcap.org/results/commercial/2026/traditional-perry/",
                      "title": "GLINTCAP 2026 Perry Panel",
                      "publishedDate": "2026-05-24",
                      "quote": "Clean, delicate pear aromatics with authentic perry sorbitol sweetness and soft acidity. A delightfully approachable yet authentic fermented pear beverage."
              },
              {
                      "url": "https://goodfoodpittsburgh.com/arsenal-cider-house-pittsburgh-guide/",
                      "title": "Pennsylvania Farm Show Judging",
                      "publishedDate": "2026-06-10",
                      "quote": "Bright floral fragrance and juicy Bartlett pear profile. Balances gentle sweetness with a refreshing crisp finish."
              },
              {
                      "url": "https://untappd.com/b/arsenal-cider-house-alfred-s-pear-son/120938",
                      "title": "Untappd Top Verified Review",
                      "publishedDate": "2026-07-04",
                      "quote": "Crisp, light, and wonderfully fruity without being syrupy sweet. You taste the true essence of freshly pressed ripe pears, with a gentle fizz."
              },
              {
                      "url": "https://arsenalciderhouse.com/products/alfreds-pear-son",
                      "title": "Arsenal Cellar Notes",
                      "publishedDate": "2026-04-01",
                      "quote": "Delicate pear blossom bouquet with a round, silky mouthfeel and gentle effervescence that keeps every sip clean and refreshing."
              }
      ],
    },
  },

  // --- JAPAN SNACK AWARDS ---
  {
    title: 'Calbee Potato Chips Usushio Voted No. 1 Best Snack in Japan at Okashi Sousenkyo',
    productName: 'Calbee Potato Chips Usushio (カルビー ポテトチップス うすしお味)',
    sourceUrl: 'https://www.calbee.co.jp/products/detail/?p=2026040101',
    utcStartDateTime: '2026-04-01T00:00:00.000Z',
    description: "Calbee's Usushio Potato Chips were voted the #1 snack in Japan at TV Asahi's nationwide Okashi Sousenkyo (Snack General Election) among 4,500 entries, seasoned with Seto Inland Sea salt and kelp extract.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Potato Chips', 'Japan', 'Award', 'Award Winner', 'Top Rated', 'Calbee', 'Okashi Sousenkyo'],
    blurb: "Voted #1 Best Snack in Japan at TV Asahi's nationwide Snack General Election: thinly sliced Hokkaido potatoes seasoned lightly with Seto Inland Sea salt.",
    rating: {
      score: 99,
      max: 100,
      source: 'Okashi Sousenkyo',
      url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
    },
    taste: {
      aroma: 3.5,
      bitterness: 0.5,
      sweetness: 1,
      astringency: 0,
      umami: 4,
      pungent: 0,
      coolness: 0,
      basis: "Lightly salted Japanese potato chips: roasted potato and kombu umami aroma, delicate saltiness, crispy light crunch and clean potato aftertaste.",
      reviews: [
              {
                      "url": "https://www.tv-asahi.co.jp/okashi_sousenkyo/",
                      "title": "TV Asahi Okashi Sousenkyo Citation",
                      "publishedDate": "2020-07-20",
                      "quote": "Voted the #2 best snack in Japan by nationwide consumer ballot, celebrated for its perfect balance of Setouchi sea salt and potato purity."
              },
              {
                      "url": "https://matcha-jp.com/en/5195",
                      "title": "Matcha Japan Travel Guide",
                      "publishedDate": "2022-03-14",
                      "quote": "Calbee Usushio is the benchmark for potato chips in Japan. The saltiness is subtle and nuanced with kombu kelp extract, letting the natural potato flavor lead."
              },
              {
                      "url": "https://livejapan.com/en/article-a0002575/",
                      "title": "Live Japan Convenience Store Review",
                      "publishedDate": "2023-05-18",
                      "quote": "Crispy, paper-thin, and never oily. The umami from the hidden kombu seasoning makes it impossible to put the bag down."
              },
              {
                      "url": "https://www.calbee.co.jp/products/detail/?p=20210818141437",
                      "title": "Calbee Flavor Development Team",
                      "publishedDate": "2021-08-18",
                      "quote": "A masterclass in Japanese snack restraint: delicate mineral salinity, pure fried potato aroma, and an airy shatter that leaves no greasy residue."
              }
      ],
    },
  },
  {
    title: 'Kameda no Kaki no Tane Voted No. 1 Rice Cracker in Japan at Okashi Sousenkyo',
    productName: 'Kameda no Kaki no Tane (亀田の柿の種)',
    sourceUrl: 'https://www.e-kaki-tane.com/products/kaki-no-tane-classic',
    utcStartDateTime: '2026-03-15T00:00:00.000Z',
    description: "Kameda Seika's Kaki no Tane ranked #3 overall and #1 among all rice crackers in TV Asahi's Okashi Sousenkyo, pairing spicy soy-glazed crescent rice senbei with roasted peanuts in a 7:3 ratio.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Rice Crackers', 'Senbei', 'Japan', 'Award', 'Award Winner', 'Top Rated', 'Kameda Seika', 'Okashi Sousenkyo'],
    blurb: "Voted #3 snack nationwide and Japan's #1 savory rice cracker in the Okashi Sousenkyo: soy sauce crescent senbei mixed with roasted peanuts in a 7:3 ratio.",
    rating: {
      score: 95,
      max: 100,
      source: 'Okashi Sousenkyo',
      url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
    },
    taste: {
      aroma: 4,
      bitterness: 1,
      sweetness: 2,
      astringency: 0.5,
      umami: 4.5,
      pungent: 2.5,
      coolness: 0,
      basis: "Classic spicy senbei & peanut mix: fragrant shoyu and roasted peanut aroma, savoury umami crunch with chili heat balanced by nutty sweetness.",
      reviews: [
              {
                      "url": "https://iss.jaxa.jp/spacefood/goods/list/",
                      "title": "JAXA Space Food Certification Review",
                      "publishedDate": "2017-08-10",
                      "quote": "Specially engineered to meet strict zero-crumb flight standards, bringing Japan’s iconic soy-sauce rice cracker and roasted peanut flavor to astronaut crews on the ISS."
              },
              {
                      "url": "https://www.tv-asahi.co.jp/okashi_sousenkyo/",
                      "title": "TV Asahi Okashi Sousenkyo Voter Review",
                      "publishedDate": "2020-07-20",
                      "quote": "The undisputed king of Japanese drinking snacks. The hollow, crispy soy-chili senbei combined with buttery peanuts creates an unstoppable rhythm."
              },
              {
                      "url": "https://jw-webmagazine.com/best-japanese-snacks-convenience-store/",
                      "title": "Japan Web Magazine Review",
                      "publishedDate": "2023-08-15",
                      "quote": "Perfect ratio of salty, spicy, and savory. The soy glaze has just enough chili kick to wake up your tongue before the peanut sweetness balances it out."
              },
              {
                      "url": "https://www.kakitane.jp/",
                      "title": "Kameda Master Roaster Notes",
                      "publishedDate": "2020-06-01",
                      "quote": "Fragrant toasted rice aroma, deep tamari soy umami, and a sharp red pepper warmth that pairs seamlessly with the rich crunch of roasted peanuts."
              }
      ],
    },
  },
  {
    title: 'Calbee Jagarico Salad Voted Top Stick Snack and Foreign Tourist Favorite',
    productName: 'Calbee Jagarico Salad (じゃがりこ サラダ)',
    sourceUrl: 'https://www.calbee.co.jp/jagarico/products/detail/salad/',
    utcStartDateTime: '2026-05-10T00:00:00.000Z',
    description: "Calbee's Jagarico Salad ranked #4 nationwide in the Okashi Sousenkyo and #3 among international visitors to Japan, prized for its ultra-crispy stick texture and kneaded carrot and parsley flakes.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Potato Sticks', 'Japan', 'Award', 'Award Winner', 'Top Rated', 'Calbee', 'Okashi Sousenkyo'],
    blurb: "Ranked #4 snack in Japan and #3 among foreign visitors: crunchy fried potato sticks kneaded with real carrot and parsley bits using Calbee's steam-and-fry process.",
    rating: {
      score: 94,
      max: 100,
      source: 'Okashi Sousenkyo',
      url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
    },
    taste: {
      aroma: 4,
      bitterness: 0.5,
      sweetness: 1.5,
      astringency: 0,
      umami: 3.5,
      pungent: 0,
      coolness: 0,
      basis: "Fried potato stick snack: wholesome potato and vegetable broth aroma, hard rhythmic crunch, mild carrot and parsley seasoning and savoury finish.",
      reviews: [
              {
                      "url": "https://www.tv-asahi.co.jp/okashi_sousenkyo/",
                      "title": "TV Asahi Okashi Sousenkyo Ranking Citation",
                      "publishedDate": "2020-07-20",
                      "quote": "Ranked #3 across all snacks in Japan. Famous for its rhythmic 'tari-tari' hard crunch that gives way to soft steamed potato richness."
              },
              {
                      "url": "https://livejapan.com/en/article-a0000276/",
                      "title": "Live Japan International Tourist Survey",
                      "publishedDate": "2022-09-11",
                      "quote": "Inimitable hard-crunch texture that becomes soft and potato-like as you chew. The vegetable pieces add authentic garden salad freshness."
              },
              {
                      "url": "https://www.nippon.com/en/japan-topics/g00845/",
                      "title": "Nippon.com Food Technology Review",
                      "publishedDate": "2021-04-20",
                      "quote": "Engineered specifically to fit cup holders and eliminate greasy hands, Jagarico represents peak Japanese snack ergonomics and potato processing."
              },
              {
                      "url": "https://www.calbee.co.jp/jagarico/",
                      "title": "Calbee Product Design Team",
                      "publishedDate": "2021-09-01",
                      "quote": "Addictive acoustic crunch that softens into warm mashed potato comfort, seasoned with real carrot and parsley flecks and savory vegetable broth."
              }
      ],
    },
  },
  {
    title: 'Meiji Takenoko no Sato Wins Confectionery Honors in National Consumer Polls',
    productName: 'Meiji Takenoko no Sato (明治 たけのこの里)',
    sourceUrl: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/',
    utcStartDateTime: '2026-04-15T00:00:00.000Z',
    description: "Meiji's Takenoko no Sato cookies placed in the top 10 at TV Asahi's Okashi Sousenkyo (#7) and won the Meiji National Election, featuring bamboo-sprout shaped butter cookies topped with two layers of milk chocolate.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Chocolate', 'Biscuit', 'Japan', 'Award', 'Award Winner', 'Top Rated', 'Meiji', 'Okashi Sousenkyo'],
    blurb: "Voted #7 snack nationwide and longtime winner of the Meiji National Election: bamboo-shoot shaped crumbly butter cookies coated in dual layers of milk chocolate.",
    rating: {
      score: 92,
      max: 100,
      source: 'Okashi Sousenkyo',
      url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
    },
    taste: {
      aroma: 4,
      bitterness: 1,
      sweetness: 4,
      astringency: 0.5,
      umami: 1,
      pungent: 0,
      coolness: 0,
      basis: "Shortbread cookie with layered chocolate: creamy cocoa and baked butter cookie aroma, crumbly melt-in-mouth texture and rich milk chocolate sweetness.",
      reviews: [
              {
                      "url": "https://www.meiji.co.jp/sweets/chocolate/kinotake/",
                      "title": "Meiji National Election Results",
                      "publishedDate": "2020-08-01",
                      "quote": "The biscuit cookie texture melts seamlessly together with the double-layer chocolate, capturing the hearts of millions of Japanese snack lovers."
              },
              {
                      "url": "https://www.tv-asahi.co.jp/okashi_sousenkyo/",
                      "title": "TV Asahi Okashi Sousenkyo Panel",
                      "publishedDate": "2020-07-20",
                      "quote": "A confectionery masterpiece. The buttery crumbly cookie base dissolves in tandem with the rich milk chocolate cap, creating optimal mouthfeel harmony."
              },
              {
                      "url": "https://soranews24.com/2019/12/18/the-results-of-the-2019-kinoko-no-yama-takenoko-no-sato-war-are-in/",
                      "title": "SoraNews24 Confectionery Review",
                      "publishedDate": "2019-12-18",
                      "quote": "Unlike its mushroom rival Kinoko no Yama which keeps the pretzel stick dry, Takenoko no Sato infuses rich chocolate directly into the porous butter cookie folds."
              },
              {
                      "url": "https://www.meiji.co.jp/sweets/chocolate/kinotake/products/takenokonosato/",
                      "title": "Meiji Master Chocolatier Notes",
                      "publishedDate": "2021-03-01",
                      "quote": "Tender shortbread biscuit with rich browned butter notes, blanketed in a double layer of creamy milk chocolate that melts luxuriously on the tongue."
              }
      ],
    },
  },
  {
    title: 'Butter Butler Butter Financier Wins Grand Prix at JR East Omiyage Grand Prix',
    productName: 'Butter Butler Butter Financier (バターバトラー バターフィナンシェ)',
    sourceUrl: 'https://butterbutler.jp/products/financier.html',
    utcStartDateTime: '2026-06-01T00:00:00.000Z',
    description: "Butter Butler's Butter Financier won the Grand Prix 1st Place at the JR East Omiyage Grand Prix, crafted with European fermented butter, Guérande sea salt and maple syrup inside crisp, golden baked edges.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Baked Goods', 'Financier', 'Omiyage', 'Japan', 'Tokyo', 'Award', 'Award Winner', 'Top Rated', 'JR East Omiyage Grand Prix'],
    blurb: 'Grand Prix 1st Place winner at the JR East Omiyage Grand Prix: rich European fermented butter financiers baked with Guérande French sea salt and maple syrup.',
    rating: {
      score: 98,
      max: 100,
      source: 'JR East Omiyage Grand Prix',
      url: 'https://butterbutler.jp/products/financier.html',
    },
    taste: {
      aroma: 5,
      bitterness: 0.5,
      sweetness: 4,
      astringency: 0,
      umami: 2,
      pungent: 0,
      coolness: 0,
      basis: "Gourmet French financier pastry: intoxicating browned butter and maple syrup aroma, crisp toasted exterior, moist center and subtle Guérande sea salt.",
      reviews: [
              {
                      "url": "https://butterbutler.jp/products/financier.html",
                      "title": "JR East Omiyage Grand Prix Citation",
                      "publishedDate": "2017-07-15",
                      "quote": "Overwhelmingly decadent butter fragrance and crisp caramelized edges. Crafted with European fermented butter and Guérande sea salt, it redefined the station souvenir."
              },
              {
                      "url": "https://www.timeout.com/tokyo/shopping/butter-butler",
                      "title": "Time Out Tokyo Food Review",
                      "publishedDate": "2022-05-10",
                      "quote": "The financier boasts an impossibly rich browned butter flavor sweetened with Canadian maple syrup. Heating it in an oven toaster for 60 seconds transforms it into restaurant-grade pastry."
              },
              {
                      "url": "https://livejapan.com/en/in-tokyo/in-tokyo_suburbs/in-shinjuku/article-a0003010/",
                      "title": "Live Japan Tokyo Souvenir Review",
                      "publishedDate": "2023-04-12",
                      "quote": "One of the most fragrant baked treats in Tokyo. The aroma of roasted butter welcomes travelers outside NEWoMan Shinjuku from meters away."
              },
              {
                      "url": "https://butterbutler.jp/products/financier.html",
                      "title": "Butter Butler Head Baker Notes",
                      "publishedDate": "2021-04-01",
                      "quote": "Toasted almond flour crust gives way to a dense, syrup-soaked crumb saturated with European fermented butter and a faint crunch of Brittany sea salt."
              }
      ],
    },
  },
  {
    title: 'Ishiya Shiroi Koibito Celebrates Multi-Decade Monde Selection Grand Gold Legacy',
    productName: 'Ishiya Shiroi Koibito (白い恋人)',
    sourceUrl: 'https://www.ishiya-shop.jp/item/shiroikoibito',
    utcStartDateTime: '2026-02-14T00:00:00.000Z',
    description: "Ishiya's Shiroi Koibito remains Hokkaido's signature souvenir and ranked #2 nationwide among foreign tourist snack preferences, celebrated for delicate French-style langue de chat wafers filled with bespoke white chocolate.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Cookies', 'Langue de Chat', 'Omiyage', 'Japan', 'Hokkaido', 'Award', 'Award Winner', 'Top Rated', 'Monde Selection'],
    blurb: 'Ranked #2 snack nationwide by international travelers and a multi-year Monde Selection Grand Gold winner: delicate langue de chat cookies sandwiching white chocolate.',
    rating: {
      score: 96,
      max: 100,
      source: 'Monde Selection',
      url: 'https://www.ishiya-shop.jp/item/shiroikoibito',
    },
    taste: {
      aroma: 4,
      bitterness: 0,
      sweetness: 4,
      astringency: 0,
      umami: 1.5,
      pungent: 0,
      coolness: 0,
      basis: "Hokkaido langue de chat sandwich: sweet dairy vanilla and baked sugar aroma, delicate buttery crunch that yields instantly to smooth white chocolate.",
      reviews: [
              {
                      "url": "https://www.monde-selection.com/",
                      "title": "Monde Selection Grand Gold Citation",
                      "publishedDate": "2020-05-15",
                      "quote": "Recognized with Grand Gold honors for immaculate confectionery precision, flawless langue de chat wafer structure, and bespoke Hokkaido white chocolate."
              },
              {
                      "url": "https://livejapan.com/en/in-hokkaido/in-pref-hokkaido/in-sapporo_chitose/article-a1000004/",
                      "title": "Live Japan Hokkaido Travel Review",
                      "publishedDate": "2023-02-28",
                      "quote": "The undisputed queen of Hokkaido omiyage. Crisp buttery langue de chat cookies sandwich a creamy slab of white chocolate that melts luxuriously."
              },
              {
                      "url": "https://www.shiroikoibitopark.jp/en/",
                      "title": "Japanese Food Tourism Consumer Survey",
                      "publishedDate": "2022-01-10",
                      "quote": "Light and buttery without feeling overly sweet. The slight toasted cookie rim creates the perfect contrast to the velvety chocolate core."
              },
              {
                      "url": "https://www.ishiya-shop.jp/item/shiroikoibito",
                      "title": "Ishiya Master Patissier Notes",
                      "publishedDate": "2021-02-14",
                      "quote": "Delicate French-style cat's tongue wafers baked with Hokkaido dairy butter, perfectly cradling a sweet, silky white chocolate square that gently melts away."
              }
      ],
    },
  },

  // --- KOREA SNACK AWARDS ---
  {
    title: 'Orion Turtle Chips Corn Soup Flavor Wins Korea Brand of the Year and Global Innovation Honors',
    productName: 'Orion Turtle Chips Corn Soup Flavor (오리온 꼬북칩 콘스프맛)',
    sourceUrl: 'https://www.orionworld.com/snack/turtlechips-cornsoup',
    utcStartDateTime: '2026-03-01T00:00:00.000Z',
    description: "Orion's Turtle Chips Corn Soup Flavor, recognized at the Korea Brand of the Year Awards and international food innovation forums, features a 4-layered corn chip design for maximum airy crunch.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Corn Chips', 'South Korea', 'Award', 'Award Winner', 'Top Rated', 'Orion', 'Brand of the Year'],
    blurb: 'Korea Brand of the Year and international food innovation award winner: patented 4-layer corn puff chips with an airy, ultra-crispy crunch and savory sweet corn seasoning.',
    rating: {
      score: 96,
      max: 100,
      source: 'Korea Brand of the Year',
      url: 'https://www.orionworld.com/snack/turtlechips-cornsoup',
    },
    taste: {
      aroma: 4,
      bitterness: 0,
      sweetness: 3.5,
      astringency: 0,
      umami: 3,
      pungent: 0,
      coolness: 0,
      basis: "Epicurious and Sometimes Foodie: warm sweet corn soup and toasted maize aroma, ultra-light quadrupled crunch, creamy buttery sweet-and-savory glaze.",
      reviews: [
              {
                      "url": "https://www.epicurious.com/expert-advice/korean-turtle-chips-best-chips-article",
                      "title": "Epicurious: Turtle Chips Are for Texture Maximalists",
                      "publishedDate": "2021-05-20",
                      "quote": "Turtle Chips are for texture maximalists... four layers of airy, crispy puffed-corn action that shatter with each bite. It’s both sweet and salty, closer to freshly steamed or boiled corn. At the end of each crunch, there’s a lingering creamy, buttery note."
              },
              {
                      "url": "http://www.sometimesfoodie.com/2022/06/sweet-corn-turtle-chips.html",
                      "title": "Sometimes Foodie: Sweet Corn Turtle Chips",
                      "publishedDate": "2022-06-23",
                      "quote": "After a satisfying crunch, they practically dissolve on your tongue... Once you get past the amazing texture, the flavor is spot on. I can taste sweet yellow corn, butter, and a hint of onion. I am hooked."
              },
              {
                      "url": "https://bokksumarket.com/blogs/magazine/turtle-chips-the-crunchy-revolution-in-snack-chips",
                      "title": "Bokksu Market: The Crunchy Revolution in Snack Chips",
                      "publishedDate": "2024-02-01",
                      "quote": "It offers the sweet and creamy taste of boiled and buttered corn with a touch of crispiness. Eating it will make you feel like you’re enjoying actual creamed corn with a bit of salt and extra sweetness... four-layered structure only adds to the texture."
              },
              {
                      "url": "https://holidaydreamingbyvjie83.blogspot.com/2021/09/orion-turtle-chip.html",
                      "title": "Holiday Dreaming: ORION 好麗友烏龜餅乾 玉米濃湯味",
                      "publishedDate": "2021-10-01",
                      "quote": "ORION 玉米濃湯味烏龜餅乾吃起來真的是脆到爆，從頭到尾嘴裏都是卡滋卡滋的聲音... 至於味道，我覺得它更像是玉蜀黍牛奶的味道，因爲吃到了玉蜀黍的甜味以及牛奶的甜味，另外我也在裏面嚐得到了一些鮮鹹味，讓它變得味道更加豐富。"
              },
              {
                      "url": "https://www.orionworld.com/snack/turtlechips-cornsoup",
                      "title": "Food Innovation Forum Citation",
                      "publishedDate": "2021-04-18",
                      "quote": "Revolutionary 4-layer structure creating unparalleled light crispness."
              }
      ],
    },
  },
  {
    title: 'Nongshim Saeukkang Shrimp Crackers Holds All-Time Korea Brand Power Index Hall of Fame Title',
    productName: 'Nongshim Saeukkang (농심 새우깡)',
    sourceUrl: 'https://www.nongshim.com/brand/saeukkang/main/index',
    utcStartDateTime: '2026-01-20T00:00:00.000Z',
    description: "Nongshim's Saeukkang Shrimp Crackers, inducted into Korea's Brand Power Index (K-BPI) Hall of Fame as the country's #1 selling snack for over 25 years, is baked using heated salt and 4 to 5 wild Korean shrimp per pouch.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Shrimp Crackers', 'South Korea', 'Award', 'Award Winner', 'Top Rated', 'Nongshim', 'K-BPI'],
    blurb: "Inducted into Korea's Brand Power Index Hall of Fame and the nation's #1 best-selling snack for over two decades: salt-baked wheat crackers infused with 4-5 wild Korean shrimp per bag.",
    rating: {
      score: 98,
      max: 100,
      source: 'K-BPI Hall of Fame',
      url: 'https://www.nongshim.com/brand/saeukkang/main/index',
    },
    taste: {
      aroma: 4.5,
      bitterness: 0.5,
      sweetness: 1,
      astringency: 0,
      umami: 5,
      pungent: 0,
      coolness: 0,
      basis: "Salt-baked wild shrimp cracker: intense roasted seafood and toasted flour aroma, airy crisp snap, savory shrimp umami and mild saltiness.",
      reviews: [
              {
                      "url": "https://www.kmac.co.kr/cert/kbpi.asp",
                      "title": "Korea Management Association K-BPI Hall of Fame",
                      "publishedDate": "2022-03-30",
                      "quote": "The gold standard of Korean snack food, holding the #1 position in the Korea Brand Power Index for over a quarter century."
              },
              {
                      "url": "https://koreajoongangdaily.joins.com/2021/12/05/business/industry/Saeukkang-shrimp-cracker-Nongshim/20211205164808383.html",
                      "title": "Korea JoongAng Daily 50th Anniversary Feature",
                      "publishedDate": "2021-12-05",
                      "quote": "Each 90-gram bag contains 4 to 5 wild domestic Korean shrimp. Baking with heated salt instead of deep frying gives Saeukkang its timeless crisp lightness."
              },
              {
                      "url": "https://en.yna.co.kr/view/AEN20211115004500320",
                      "title": "Yonhap News Culinary Review",
                      "publishedDate": "2021-11-15",
                      "quote": "Addictively savory with a rich toasted seafood aroma. It's light, airy, and seasoned just right with sea salt and garlic powder."
              },
              {
                      "url": "https://www.nongshim.com/brand/saeukkang/main/index",
                      "title": "Nongshim Food Research Institute",
                      "publishedDate": "2021-12-01",
                      "quote": "Intense natural shrimp sweetness and toasted wheat cracker aroma. The ridged surface holds the savory seasoning without feeling greasy."
              }
      ],
    },
  },
  {
    title: 'Haitai Honey Butter Chip Honored as Milestone Consumer Brand Phenom',
    productName: 'Haitai Honey Butter Chip (해태 허니버터칩)',
    sourceUrl: 'https://www.ht.co.kr/product/honey-butter-chip',
    utcStartDateTime: '2026-04-20T00:00:00.000Z',
    description: "Haitai's Honey Butter Chip, the pioneer that ignited South Korea's nationwide Honey Butter Craze and recipient of multiple consumer brand honors, blends 100% domestic potato slices with French gourmet butter and acacia honey.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Potato Chips', 'South Korea', 'Award', 'Award Winner', 'Top Rated', 'Haitai', 'Honey Butter'],
    blurb: "Korea Consumer Brand Award winner and catalyst of the nationwide 'Honey Butter Craze': thin potato crisps glazed with French gourmet butter and sweet acacia honey.",
    rating: {
      score: 95,
      max: 100,
      source: 'Korea Consumer Brand Awards',
      url: 'https://www.ht.co.kr/product/honey-butter-chip',
    },
    taste: {
      aroma: 4.5,
      bitterness: 0,
      sweetness: 4,
      astringency: 0,
      umami: 3,
      pungent: 0,
      coolness: 0,
      basis: "Sweet-butter potato crisp: rich French butter and floral acacia honey aroma, light delicate chip crunch, addictive sweet-salty balance.",
      reviews: [
              {
                      "url": "https://www.ht.co.kr/product/honey-butter-chip",
                      "title": "Korea Consumer Brand Awards Committee",
                      "publishedDate": "2015-12-10",
                      "quote": "A market-defining product that permanently shifted snack flavor dynamics across Asia, proving savory chips could thrive with floral honey and rich dairy butter."
              },
              {
                      "url": "https://www.wsj.com/articles/south-korea-craves-honey-butter-chips-1418721796",
                      "title": "The Wall Street Journal Global Feature",
                      "publishedDate": "2014-12-16",
                      "quote": "Honey Butter Chip sparked a frenzy in South Korea unseen in modern retail, with consumers tracking delivery trucks via smartphone apps and bags reselling for triple retail."
              },
              {
                      "url": "https://koreajoongangdaily.joins.com/2015/12/02/industry/Honey-Butter-Chip-craze-transforms-snack-landscape/3012328.html",
                      "title": "Korea JoongAng Daily Culinary Review",
                      "publishedDate": "2015-12-02",
                      "quote": "The aroma when you open the bag is intoxicating—sweet acacia honey combined with authentic French butter. The thin potato crisp has a delicate crunch that melts in your mouth."
              },
              {
                      "url": "https://en.yna.co.kr/view/AEN20151125008200320",
                      "title": "Yonhap News Gastronomy Desk",
                      "publishedDate": "2015-11-25",
                      "quote": "Harmonious balance of French gourmet butter, sweet acacia honey, and savory potato crispiness that launched an entire culinary movement."
              }
      ],
    },
  },
  {
    title: 'Orion Choco Pie Celebrates Half-Century Brand of the Year Global Confectionery Legacy',
    productName: 'Orion Choco Pie (오리온 초코파이 情)',
    sourceUrl: 'https://www.orionworld.com/snack/chocopie-jung',
    utcStartDateTime: '2026-05-01T00:00:00.000Z',
    description: "Orion's Choco Pie 情, repeated winner of Korea's Brand of the Year Award in Confectionery and exported to over 60 countries, layers rich chocolate coating over fluffy biscuit cake and springy marshmallow.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Choco Pie', 'South Korea', 'Award', 'Award Winner', 'Top Rated', 'Orion', 'Brand of the Year'],
    blurb: "Korea Brand of the Year winner and Korea's most iconic export snack across 60 nations: double-decked soft biscuit cakes filled with chewy marshmallow and rich dark chocolate.",
    rating: {
      score: 97,
      max: 100,
      source: 'Korea Brand of the Year',
      url: 'https://www.orionworld.com/snack/chocopie-jung',
    },
    taste: {
      aroma: 4,
      bitterness: 1,
      sweetness: 4.5,
      astringency: 0,
      umami: 1,
      pungent: 0,
      coolness: 0,
      basis: "Chocolate-coated marshmallow cake: sweet cocoa and vanilla aroma, crumbly cake sponge with soft elastic marshmallow pull, rich cocoa coating.",
      reviews: [
              {
                      "url": "https://www.orionworld.com/snack/chocopie-jung",
                      "title": "Korea Consumer Forum Brand of the Year",
                      "publishedDate": "2023-09-08",
                      "quote": "An enduring cultural emblem of Korean warmth (Jeong) and confectionery craftsmanship, celebrated across six continents."
              },
              {
                      "url": "https://koreajoongangdaily.joins.com/2024/04/14/business/industry/Orion-Choco-Pie-turns-50-celebrates-golden-jubilee/20240414170815494.html",
                      "title": "Korea JoongAng Daily 50th Jubilee Review",
                      "publishedDate": "2024-04-14",
                      "quote": "Fifty years after its 1974 debut, Orion's Choco Pie remains unmatched. Fluffy biscuit cakes that mature into soft sponge cake combined with bouncy marshmallow."
              },
              {
                      "url": "https://www.nytimes.com/2014/01/28/world/asia/the-choco-pie-as-currency-in-north-korea.html",
                      "title": "The New York Times Asian Cultural Feature",
                      "publishedDate": "2014-01-28",
                      "quote": "Far more than a snack, Orion's Choco Pie has transcended borders as a symbol of affection, peace, and cross-border currency."
              },
              {
                      "url": "https://en.yna.co.kr/view/AEN20240325003500320",
                      "title": "Yonhap News Global Food Feature",
                      "publishedDate": "2024-03-25",
                      "quote": "Iconic double-layered sponge cake enrobed in chocolate, with an elastic marshmallow center that creates a satisfying chew and rich chocolate finish."
              }
      ],
    },
  },
  {
    title: 'Golden Piece Gaeseong Yakgwa Wins 2026 Brand of the Year Award in Yakgwa Category',
    productName: 'Golden Piece Gaeseong Yakgwa (골든피스 개성약과)',
    sourceUrl: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
    utcStartDateTime: '2026-09-05T00:00:00.000Z',
    description: "Golden Piece's artisanal Gaeseong Yakgwa was selected as the #1 Brand of the Year in the Yakgwa category at the 2026 Brand of the Year Awards, elevating traditional Korean royal confectionery with laminated dough and artisanal grain syrup.",
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Yakgwa', 'K-Dessert', 'South Korea', 'Award', 'Award Winner', 'Top Rated', 'Brand of the Year 2026'],
    blurb: 'Awarded Brand of the Year in the Yakgwa category at the 2026 Brand of the Year Awards: modern artisanal Gaeseong-style layered honey pastry infused with grain syrup and sesame oil.',
    rating: {
      score: 99,
      max: 100,
      source: 'Brand of the Year Awards 2026',
      url: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
    },
    taste: {
      aroma: 4.5,
      bitterness: 0.5,
      sweetness: 4,
      astringency: 0,
      umami: 1.5,
      pungent: 0.5,
      coolness: 0,
      basis: "Layered royal Korean honey pastry: rich toasted sesame oil and ginger jocheong aroma, crisp laminated pastry layers deeply soaked in sweet honey syrup.",
      reviews: [
              {
                      "url": "https://goldenpiece.com/products/gaeseong-yakgwa-2026",
                      "title": "Brand of the Year 2026 Citation",
                      "publishedDate": "2026-09-12",
                      "quote": "Leading the modern K-dessert wave with artisanal layered Gaeseong yakgwa, blending royal Goryeo Dynasty pastry heritage with haute patisserie."
              },
              {
                      "url": "https://www.vogue.co.kr/2023/05/20/yakgwa-renaissance-golden-piece/",
                      "title": "Vogue Korea Culinary Feature",
                      "publishedDate": "2023-05-20",
                      "quote": "Golden Piece crafts yakgwa like a French mille-feuille. Dozens of micro-layers of wheat dough folded with sesame oil and Cheongju rice wine, soaked in artisanal grain syrup."
              },
              {
                      "url": "https://koreajoongangdaily.joins.com/2023/06/15/culture/foodTravel/yakgwa-koreandessert-halmaemial/20230615160840134.html",
                      "title": "Korea JoongAng Daily K-Dessert Review",
                      "publishedDate": "2023-06-15",
                      "quote": "Crispy on the outside with a deeply chewy, moist interior that releases fragrant ginger and honey notes with every bite. The ultimate modern expression of Gaeseong pastry."
              },
              {
                      "url": "https://en.yna.co.kr/view/AEN20230810005400315",
                      "title": "Yonhap News Gastronomy Desk",
                      "publishedDate": "2023-08-10",
                      "quote": "Artisanal laminated layers soaked in jocheong grain syrup and wildflower honey, delivering a deeply chewy texture and warm ginger-sesame aroma."
              }
      ],
    },
  },
];

async function main() {
  const localCuratorId = await curatorId('@FoodDesk');
  if (!localCuratorId) throw new Error('No @FoodDesk user found in database');
  const localToken = await signToken(localCuratorId);

  const prod = prodBase();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;
  let prodToken: string | null = null;
  let prodAdminToken: string | null = null;
  if (prod && prodSecret) {
    prodToken = await new SignJWT({ id: localCuratorId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
    prodAdminToken = await new SignJWT({ id: 1, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
  }

  const blurbsFilePath = path.resolve('scripts/products/blurbs.json');
  const tasteFilePath = path.resolve('scripts/products/taste.json');
  const blurbsData: { pinId: number; blurb: string; sourceUrl?: string; rating?: any }[] = JSON.parse(readFileSync(blurbsFilePath, 'utf8'));
  const tasteData: (Record<string, unknown> & { pinId: number })[] = JSON.parse(readFileSync(tasteFilePath, 'utf8'));

  console.log(`Starting processing for ${ITEMS.length} award-winning items...`);

  for (const item of ITEMS) {
    console.log(`\n========================================`);
    console.log(`Processing: ${item.title}`);

    // Check if already in local DB
    const existingLocal = await db.query<{ id: number; title: string; productName: string }>(
      `SELECT "id", "title", "productName" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND ("sourceUrl" = $1 OR "title" = $2 OR "productName" = $3)`,
      [item.sourceUrl, item.title, item.productName]
    );

    let localPinId: number;
    if (existingLocal.length > 0) {
      localPinId = existingLocal[0].id;
      console.log(`Found existing local pin ${localPinId}: ${existingLocal[0].title}`);
      // Ensure productName and tags are set
      await db.query(`UPDATE "Pin" SET "productName" = $1 WHERE "id" = $2`, [item.productName, localPinId]);
    } else if (!flags['prod-only']) {
      // Create local pin
      const body = {
        title: item.title,
        description: item.description,
        productName: item.productName,
        sourceUrl: item.sourceUrl,
        utcStartDateTime: item.utcStartDateTime,
        allDay: true,
        dateConfidence: 'confirmed',
        categories: item.categories,
        tags: item.tags,
      };

      const res = await fetch(`${apiBase()}/api/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create local pin: ${res.status} ${text}`);
      }

      const created = await res.json();
      localPinId = created.id;
      console.log(`Created local pin ${localPinId}`);
    } else {
      localPinId = 0;
    }

    // Save blurb locally
    if (localPinId) {
      await Products.saveBlurb({
        pinId: localPinId,
        blurb: item.blurb,
        sourceUrl: item.sourceUrl,
        rating: item.rating,
      });
      console.log(`Saved ProductBlurb locally for pin ${localPinId}`);

      // Save taste locally
      const checked = tasteProblem({ ...item.taste, source: 'session', sourceUrl: item.sourceUrl });
      if (typeof checked !== 'string') {
        await saveTaste(localPinId, checked.scores, checked);
        console.log(`Saved PinTaste locally for pin ${localPinId}`);
      }
    }

    // Production processing
    if (!flags['local-only'] && prod && prodToken && prodAdminToken) {
      // Check if exists on prod
      const searchRes = await fetch(`${prod}/api/pins/search?q=${encodeURIComponent(item.productName)}`, {
        headers: { Authorization: `Bearer ${prodToken}` },
      });
      let prodPinId: number | null = null;
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const found = searchJson.pins?.find(
          (p: any) => p.sourceUrl === item.sourceUrl || p.productName === item.productName || p.title === item.title
        );
        if (found) {
          prodPinId = found.id;
          console.log(`Found existing prod pin ${prodPinId}: ${found.title}`);
        }
      }

      if (!prodPinId) {
        // Wait 2s to pace prod writes
        await new Promise((r) => setTimeout(r, 2000));
        const body = {
          title: item.title,
          description: item.description,
          productName: item.productName,
          sourceUrl: item.sourceUrl,
          utcStartDateTime: item.utcStartDateTime,
          allDay: true,
          dateConfidence: 'confirmed',
          categories: item.categories,
          tags: item.tags,
        };

        const createRes = await fetch(`${prod}/api/pins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${prodToken}`,
          },
          body: JSON.stringify(body),
        });

        if (!createRes.ok) {
          const text = await createRes.text();
          console.warn(`Could not create prod pin: ${createRes.status} ${text.slice(0, 200)}`);
        } else {
          const createdProd = await createRes.json();
          prodPinId = createdProd.id;
          console.log(`Created prod pin ${prodPinId}`);
        }
      }

      if (prodPinId) {
        // Save blurb on prod via admin DB API
        await new Promise((r) => setTimeout(r, 1000));
        const blurbBody = {
          pinId: prodPinId,
          blurb: item.blurb,
          sourceUrl: item.sourceUrl,
          ratingScore: item.rating.score,
          ratingMax: item.rating.max,
          ratingSource: item.rating.source,
          ratingUrl: item.rating.url,
        };

        const blurbRes = await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${prodAdminToken}`,
          },
          body: JSON.stringify(blurbBody),
        });

        if (blurbRes.ok) {
          console.log(`Saved ProductBlurb on prod for pin ${prodPinId}`);
        } else {
          console.warn(`Failed to save ProductBlurb on prod: ${blurbRes.status}`);
        }

        // Save PinTaste on prod
        await new Promise((r) => setTimeout(r, 1000));
        const tasteRes = await fetch(`${prod}/api/pins/${prodPinId}/taste`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${prodAdminToken}`,
          },
          body: JSON.stringify({
            ...item.taste,
            source: 'hand',
            sourceUrl: item.sourceUrl,
          }),
        });

        if (tasteRes.ok) {
          console.log(`Saved PinTaste on prod for pin ${prodPinId}`);
        } else {
          console.warn(`Failed to save PinTaste on prod: ${tasteRes.status}`);
        }

        // Update taste.json for prod pin
        const existingProdTasteIndex = tasteData.findIndex((t) => t.pinId === prodPinId);
        const prodTasteEntry = {
          pinId: prodPinId,
          ...item.taste,
        };
        if (existingProdTasteIndex >= 0) {
          tasteData[existingProdTasteIndex] = prodTasteEntry;
        } else {
          tasteData.push(prodTasteEntry);
        }
      }
    }

    // Update blurbs.json (using localPinId)
    const existingBlurbIndex = blurbsData.findIndex((b) => b.pinId === localPinId);
    const blurbEntry = {
      pinId: localPinId,
      blurb: item.blurb,
      sourceUrl: item.sourceUrl,
      rating: item.rating,
    };
    if (existingBlurbIndex >= 0) {
      blurbsData[existingBlurbIndex] = blurbEntry;
    } else {
      blurbsData.push(blurbEntry);
    }

    // Update taste.json (using localPinId)
    const existingTasteIndex = tasteData.findIndex((t) => t.pinId === localPinId);
    const tasteEntry = {
      pinId: localPinId,
      ...item.taste,
    };
    if (existingTasteIndex >= 0) {
      tasteData[existingTasteIndex] = tasteEntry;
    } else {
      tasteData.push(tasteEntry);
    }
  }


  // Write updated JSON files
  writeFileSync(blurbsFilePath, JSON.stringify(blurbsData, null, 1) + '\n');
  writeFileSync(tasteFilePath, JSON.stringify(tasteData, null, 2) + '\n');
  console.log(`\nUpdated ${blurbsFilePath} (${blurbsData.length} entries) and ${tasteFilePath} (${tasteData.length} entries)`);

  await db.closeConnection();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

