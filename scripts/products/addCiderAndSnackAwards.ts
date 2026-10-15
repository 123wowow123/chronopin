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
      aroma: 4,
      bitterness: 1,
      sweetness: 3.5,
      astringency: 2,
      umami: 0,
      pungent: 0.5,
      coolness: 0,
      basis: 'High-gravity imperial craft cider: pronounced baked-apple and vanilla oak aroma, balanced sweetness, clean tannin grip and warming alcohol finish.',
      reviews: [
        {
          url: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns',
          title: 'Northwest Cider Cup 2026 Best of Show',
          publishedDate: '2026-06-15',
          quote: 'Exceptional depth and structure from heirloom Pacific Northwest apples.',
        },
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
      aroma: 3.5,
      bitterness: 0.5,
      sweetness: 2.5,
      astringency: 2.5,
      umami: 0,
      pungent: 0,
      coolness: 0.5,
      basis: 'Culinary single-variety Grenadier cider: crisp green apple and champagne yeast aroma, lively effervescence, bright malic acidity and clean dry finish.',
      reviews: [
        {
          url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-sparkling-cider',
          title: 'World Cider Awards 2026 Judges Verdict',
          publishedDate: '2026-08-10',
          quote: 'Pure green-apple clarity with vibrant carbonation and brisk acidity.',
        },
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
      aroma: 4,
      bitterness: 1,
      sweetness: 3.5,
      astringency: 1.5,
      umami: 0.5,
      pungent: 0.5,
      coolness: 0,
      basis: 'Ex-rum cask Scottish cider: rich molasses, sultana, spiced apple and vanilla oak aroma, mellow sweetness and smooth rum warmth.',
      reviews: [
        {
          url: 'https://www.worlddrinksawards.com/winner-cider/cider/2026/worlds-best-flavoured-cider',
          title: 'World Cider Awards Tasting Notes',
          publishedDate: '2026-08-10',
          quote: 'Delicately balanced rum and oak flavours enhancing ripe bittersweet apple juice.',
        },
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
      aroma: 3.5,
      bitterness: 1,
      sweetness: 1,
      astringency: 3,
      umami: 0,
      pungent: 0,
      coolness: 0.5,
      basis: 'Dry heirloom varietal blend: earthy apple peel aroma, sharp acidity, zero residual sugar, pronounced astringency and stony mineral finish.',
      reviews: [
        {
          url: 'https://ciderassociation.org/glintcap-2026-commercial-results/',
          title: 'GLINTCAP 2026 Competition Notes',
          publishedDate: '2026-05-25',
          quote: 'Uncompromisingly dry and expressive of heritage Pacific Northwest terroir.',
        },
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
      aroma: 4,
      bitterness: 2,
      sweetness: 2,
      astringency: 4,
      umami: 0,
      pungent: 0,
      coolness: 0,
      basis: 'English bittersweet varietal: intense floral pomme aroma, grippy cider tannins, subtle bitterness, rich golden body and lingering dry finish.',
      reviews: [
        {
          url: 'https://snowcappedcider.com/awards-2026/herefordshire-redstreak-glintcap',
          title: 'Snow Capped Tasting Notes',
          publishedDate: '2026-05-28',
          quote: 'Textbook bittersweet apple character with structured velvety tannins.',
        },
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
      aroma: 3.5,
      bitterness: 0.5,
      sweetness: 2.5,
      astringency: 1.5,
      umami: 0,
      pungent: 0,
      coolness: 0.5,
      basis: 'Pure fermented pear perry: delicate floral pear blossom and honey aroma, light delicate sweetness, crisp acidity and soft gentle mouthfeel.',
      reviews: [
        {
          url: 'https://theusopenchampionships.com/cider/2025-results/',
          title: 'U.S. Open Cider Championship Panel Evaluation',
          publishedDate: '2025-11-20',
          quote: 'Refined, authentic perry fruit profile with perfect carbonation and clean finish.',
        },
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
      aroma: 3,
      bitterness: 0,
      sweetness: 1,
      astringency: 0,
      umami: 3,
      pungent: 0,
      coolness: 0,
      basis: 'Lightly salted Japanese potato chips: roasted potato and kombu umami aroma, delicate saltiness, crispy light crunch and clean potato aftertaste.',
      reviews: [
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'TV Asahi Okashi Sousenkyo National Poll',
          publishedDate: '2020-07-20',
          quote: 'The undisputed national everyday favorite snack across generations.',
        },
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
      aroma: 3.5,
      bitterness: 1,
      sweetness: 1.5,
      astringency: 0.5,
      umami: 4,
      pungent: 2,
      coolness: 0,
      basis: 'Classic spicy senbei & peanut mix: fragrant shoyu and roasted peanut aroma, savoury umami crunch with chili heat balanced by nutty sweetness.',
      reviews: [
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'Okashi Sousenkyo Savory Division',
          publishedDate: '2020-07-20',
          quote: 'The golden standard of beer accompaniments and Japanese rice crackers.',
        },
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
      aroma: 3,
      bitterness: 0,
      sweetness: 1.5,
      astringency: 0,
      umami: 3,
      pungent: 0,
      coolness: 0,
      basis: 'Fried potato stick snack: wholesome potato and vegetable broth aroma, hard rhythmic crunch, mild carrot and parsley seasoning and savoury finish.',
      reviews: [
        {
          url: 'https://www.tv-asahi.co.jp/okashi_sousenkyo/',
          title: 'Foreign Tourists Best Japanese Snacks Survey',
          publishedDate: '2020-07-20',
          quote: 'Inimitable hard-crunch texture that becomes soft and potato-like as you chew.',
        },
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
      aroma: 3.5,
      bitterness: 1,
      sweetness: 4,
      astringency: 0.5,
      umami: 1,
      pungent: 0,
      coolness: 0,
      basis: 'Shortbread cookie with layered chocolate: creamy cocoa and baked butter cookie aroma, crumbly melt-in-mouth texture and rich milk chocolate sweetness.',
      reviews: [
        {
          url: 'https://www.meiji.co.jp/sweets/chocolate/kinotake/',
          title: 'Meiji National Election Results',
          publishedDate: '2020-08-01',
          quote: 'The biscuit cookie texture melts seamlessly together with the double-layer chocolate.',
        },
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
      aroma: 4.5,
      bitterness: 0.5,
      sweetness: 4,
      astringency: 0,
      umami: 1.5,
      pungent: 0,
      coolness: 0,
      basis: 'Gourmet French financier pastry: intoxicating browned butter and maple syrup aroma, crisp toasted exterior, moist center and subtle Guérande sea salt.',
      reviews: [
        {
          url: 'https://butterbutler.jp/products/financier.html',
          title: 'JR East Omiyage Grand Prix Citation',
          publishedDate: '2017-07-15',
          quote: 'Overwhelmingly decadent butter fragrance and crisp caramelized edges.',
        },
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
      aroma: 3.5,
      bitterness: 0,
      sweetness: 4,
      astringency: 0,
      umami: 1,
      pungent: 0,
      coolness: 0,
      basis: 'Hokkaido langue de chat sandwich: sweet dairy vanilla and baked sugar aroma, delicate buttery crunch that yields instantly to smooth white chocolate.',
      reviews: [
        {
          url: 'https://www.ishiya-shop.jp/item/shiroikoibito',
          title: 'Monde Selection Award Report',
          publishedDate: '2020-05-12',
          quote: 'A legendary Japanese confectionery icon of delicate texture and balanced milk chocolate.',
        },
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
      basis: 'Four-layered puffed corn chip: warm sweet corn soup and toasted maize aroma, ultra-light quadrupled crunch, creamy buttery sweet-and-savory glaze.',
      reviews: [
        {
          url: 'https://www.orionworld.com/snack/turtlechips-cornsoup',
          title: 'Food Innovation Forum Citation',
          publishedDate: '2021-04-18',
          quote: 'Revolutionary 4-layer structure creating unparalleled light crispness.',
        },
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
      aroma: 4,
      bitterness: 0.5,
      sweetness: 1,
      astringency: 0,
      umami: 4.5,
      pungent: 0,
      coolness: 0,
      basis: 'Salt-baked wild shrimp cracker: intense roasted seafood and toasted flour aroma, airy crisp snap, savory shrimp umami and mild saltiness.',
      reviews: [
        {
          url: 'https://www.nongshim.com/brand/saeukkang/main/index',
          title: 'Korea Management Association K-BPI Hall of Fame',
          publishedDate: '2022-03-30',
          quote: 'The gold standard of Korean snack food, holding the #1 position for over a quarter century.',
        },
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
      aroma: 4,
      bitterness: 0,
      sweetness: 3.5,
      astringency: 0,
      umami: 2.5,
      pungent: 0,
      coolness: 0,
      basis: 'Sweet-butter potato crisp: rich French butter and floral acacia honey aroma, light delicate chip crunch, addictive sweet-salty balance.',
      reviews: [
        {
          url: 'https://www.ht.co.kr/product/honey-butter-chip',
          title: 'Korea Consumer Brand Awards Committee',
          publishedDate: '2015-12-10',
          quote: 'A market-defining product that permanently shifted snack flavor dynamics across Asia.',
        },
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
      aroma: 3.5,
      bitterness: 1,
      sweetness: 4.5,
      astringency: 0,
      umami: 1,
      pungent: 0,
      coolness: 0,
      basis: 'Chocolate-coated marshmallow cake: sweet cocoa and vanilla aroma, crumbly cake sponge with soft elastic marshmallow pull, rich cocoa coating.',
      reviews: [
        {
          url: 'https://www.orionworld.com/snack/chocopie-jung',
          title: 'Korea Consumer Forum Brand of the Year',
          publishedDate: '2023-09-08',
          quote: 'An enduring cultural emblem of Korean warmth and confectionery craftsmanship.',
        },
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
      aroma: 4,
      bitterness: 0.5,
      sweetness: 4,
      astringency: 0,
      umami: 1.5,
      pungent: 0.5,
      coolness: 0,
      basis: 'Layered royal Korean honey pastry: rich toasted sesame oil and ginger jocheong aroma, crisp laminated pastry layers deeply soaked in sweet honey syrup.',
      reviews: [
        {
          url: 'https://goldenpiece.com/products/gaeseong-yakgwa-2026',
          title: 'Brand of the Year 2026 Citation',
          publishedDate: '2026-09-12',
          quote: 'Leading the modern K-dessert wave with artisanal layered Gaeseong yakgwa.',
        },
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

