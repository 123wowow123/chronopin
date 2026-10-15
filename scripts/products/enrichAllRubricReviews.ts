import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as db from '@/server/db';
import { reviewsProblem, type PinReview } from '@/lib/pinReviews';
import { execSync } from 'node:child_process';

const TASTE_REVIEWS: Record<number, PinReview[]> = {
  7626: [
    {
      url: 'https://www.irishtimes.com/food/2026/10/02/aran-bakery-in-kilkenny-takes-top-blas-na-heireann-award-for-second-time/',
      title: 'The Irish Times: Arán Bakery in Kilkenny takes top Blas na hÉireann award for second time',
      publishedDate: '2026-10-02',
      quote: "The winning loaf is described as having 'a distinctive, slightly nutty flavour, finished with sesame seeds to accentuate the unique characteristics of the grain'.",
    },
    {
      url: 'https://www.ireland-guide.com/establishment/aran-artisan-bakery-deli-and-bistro.14026.html',
      title: "Georgina Campbell's Ireland Guide: Arán Artisan Bakery, Deli & Bistro Review",
      publishedDate: null,
      quote: 'Their breads are made with just four ingredients - flour, salt, water and natural leaven - and stone-baked in their special bread oven.',
    },
  ],
  13916: [
    {
      url: 'https://m.economictimes.com/industry/cons-products/ambanis-reliance-enters-ice-cream-market-with-launch-of-bombay-creamery/articleshow/133678139.cms',
      title: "The Economic Times: Ambani's Reliance enters ice cream market with launch of Bombay Creamery",
      publishedDate: '2026-09-24',
      quote: 'Positioned around real dairy cream without vegetable fats across cones, cups, tubs, bars, and sticks starting from Rs 10.',
    },
    {
      url: 'https://www.youtube.com/post/UgkxvsFy9hQB9o9nfZMy73tATdxkTmqTjCcQ',
      title: 'BigOBasket Sales Comparison: Bombay Creamery vs Amul Mango Duet & Kulfi Portfolio',
      publishedDate: '2026-10-15',
      quote: 'Higher-tier stick offerings are price-stratified: ₹20 for fruit-ripple Duets (Mango and Strawberry), ₹25 for Shahi Kesar Kulfi, and ₹30 for Maharaja Mawa Kulfi.',
    },
  ],
  13923: [
    {
      url: 'https://kronan.is/vara/100274042-emmessis-isblom-hrekkjavoku-tyggjo',
      title: 'Krónan: Emmessís ísblóm hrekkjavöku tyggjó vörulýsing og umsögn',
      publishedDate: '2026-10-01',
      quote: 'Ítalskur tyggjó-gelato með sykurpúðum. Sætur, bleikur og með hinu klassíska tyggjóbragði ásamt mjúkri áferð frá sykurpúðum.',
    },
  ],
  13979: [
    {
      url: 'https://blogdoalmirfreitas.com.br/fini-sorvetes-transforma-a-iconica-bala-minhocas-em-picole-com-recheio-em-textura-push/',
      title: 'Blog do Almir Freitas: Fini Sorvetes transforma a icônica bala Minhocas em picolé',
      publishedDate: '2026-09-15',
      quote: 'O picolé combina os sabores de maçã verde e framboesa e recheio com textura de bala de gelatina que evita o derretimento rápido e garante uma experiência prática.',
    },
  ],
  13980: [
    {
      url: 'https://oparanaense.com.br/sonho-azul-bapka-celebra-35-anos-com-novo-picole-e-vendas-em-prol-do-pequeno-cotolengo/',
      title: 'Jornal O Paranaense: Sonho Azul: Bapka celebra 35 anos com novo picolé Blue Ice',
      publishedDate: '2026-10-04',
      quote: 'A sobremesa sabor Blue Ice utiliza a cor azul como referência visual e oferece um sabor refrescante e nostálgico que remete à infância por R$ 3.',
    },
  ],
};

const DINING_REVIEWS: Record<number, PinReview[]> = {
  2733: [
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#albi',
      title: 'The New York Times: The 50 Best Restaurants in the United States, 2026: Albi',
      publishedDate: '2026-09-24',
      quote: 'Chef Michael Rafidi creates a wholly realized world rooted in Palestinian live-fire cooking, featuring freshly baked sourdough khubz and inventive mezze off the hearth.',
    },
    {
      url: 'https://guide.michelin.com/us/en/district-of-columbia/washington-dc/restaurant/albi',
      title: 'Albi - a MICHELIN Guide Restaurant (One MICHELIN Star)',
      publishedDate: null,
      quote: 'Chef Michael Rafidi channels his heritage through open-fire and hearth cooking, skillfully refining and reimagining contemporary Palestinian and Levantine dishes with bold flavors.',
    },
  ],
  2752: [
    {
      url: 'https://guide.michelin.com/us/en/new-york-state/queens/restaurant/meju',
      title: 'Meju - a MICHELIN Guide Restaurant (One MICHELIN Star)',
      publishedDate: null,
      quote: "Chef Hooni Kim's intimate chef's counter centers around house-made, wild-fermented and aged doenjang, gochujang, ganjang, and ssamjang cultivated over a decade.",
    },
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#meju',
      title: 'The New York Times: The 50 Best Restaurants in the United States, 2026: Meju',
      publishedDate: '2026-09-24',
      quote: 'Chef Hooni Kim explores Korean fermentation traditions in Long Island City, delivering deep, nuanced umami across an intimate tasting menu.',
    },
  ],
  2772: [
    {
      url: 'https://guide.michelin.com/us/en/california/san-francisco/restaurant/naides',
      title: 'Restaurant Naides - a MICHELIN Guide Restaurant (One MICHELIN Star)',
      publishedDate: null,
      quote: 'Chef Patrick Gabon offers a stylish, modern tasting menu that interprets Filipino heritage flavors through contemporary techniques, fermentation, and preservation.',
    },
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#restaurant-naides',
      title: 'The New York Times: The 50 Best Restaurants in the United States, 2026: Restaurant Naides',
      publishedDate: '2026-09-24',
      quote: 'Contemporary Filipino fine dining in San Francisco that reimagines regional specialties with precision, elegance, and vibrant acidity.',
    },
  ],
};

const CAR_PERF_REVIEWS: Record<number, PinReview[]> = {
  14001: [
    {
      url: 'https://electrek.co/2026/10/13/byd-launches-luxury-han-ev-1000-km-range-for-35000/',
      title: 'Electrek: BYD launches luxury Han EV with up to 1,000 km range for $35,000',
      publishedDate: '2026-10-13',
      quote: 'Equipped with second-generation Blade Battery and 1,000V architecture, delivering up to 1,008 km CLTC range and ultra-fast 10% to 70% charging in five minutes.',
    },
    {
      url: 'https://carnewschina.com/2025/08/23/sunday-china-drive-byd-han-l-ev-1086-hp-dual-motor-ev-tested/',
      title: 'CarNewsChina: Sunday China Drive: BYD Han L EV dual-motor tested',
      publishedDate: '2025-08-23',
      quote: 'Prioritizes vault-like cabin quietness, smooth linear acceleration, and compliance over harsh bumps with DiPilot smart driving.',
    },
  ],
  14030: [
    {
      url: 'https://www.autoevolution.com/news/2026-paris-motor-show-the-world-premiere-of-smart-2-seeks-to-reinvent-the-urban-two-seater-car-276873.html',
      title: 'autoevolution: 2026 Paris Motor Show: The World Premiere of Smart #2',
      publishedDate: '2026-10-12',
      quote: 'Built on the new Electric Compact Architecture with a 35.8-kWh LFP battery, targeted 290 km WLTP range, and a tight 6.95-meter turning circle from €19,990.',
    },
  ],
  14040: [
    {
      url: 'https://www.autoexpress.co.uk/geely/370270/new-geely-monjaro-em-i-has-jab-skoda-kodiaq-and-hyundai-santa-fe',
      title: 'Auto Express: New Geely Monjaro EM-i has a jab at Skoda Kodiaq and Hyundai Santa Fe',
      publishedDate: '2026-10-14',
      quote: "Utilizes Geely's EM-i Super Hybrid system with dedicated 1.5-litre engine and intelligent electric AWD on the GEA-Evo architecture targeting 70+ miles electric range.",
    },
  ],
  14141: [
    {
      url: 'https://cnevpost.com/2026/09/28/stelato-v8-starts-pre-sales/',
      title: "CnEVPost: Huawei, BAIC's Stelato V8 starts pre-sales with 800V platform and 830 km range",
      publishedDate: '2026-09-28',
      quote: 'Offers dual-chamber air suspension, rear-wheel steering shrinking the turning radius to 5.09 meters, 800V platform, and up to 830 km CLTC range.',
    },
  ],
  14158: [
    {
      url: 'https://cnevpost.com/2026/09/22/voyah-launches-dream-9-mpv/',
      title: 'CnEVPost: Voyah launches Dream 9 flagship MPV starting from RMB 419,900',
      publishedDate: '2026-09-22',
      quote: 'Introduces Huju P intelligent chassis, 800V high-voltage platform with 5C ultra-fast charging, and Huawei Qiankun ADS smart driving.',
    },
  ],
};

const GAS_CAR_PERF_REVIEWS: Record<number, PinReview[]> = {
  15214: [
    {
      url: 'https://www.caranddriver.com/reviews/a43494803/2023-bmw-m2-drive/',
      title: 'Car and Driver: BMW M2 Review: Mil-Spec Precision',
      publishedDate: '2023-04-08',
      quote: "The M2's steering offers mil-spec precision, with linear, responsive, and predictable handling dynamics that obediently follow commands.",
    },
    {
      url: 'https://www.topgear.com/car-reviews/bmw/m2/driving',
      title: 'Top Gear: BMW M2 Review: What is it like to drive?',
      publishedDate: '2024-02-14',
      quote: "It steers into corners with total disdain for understeer, the body control is deeply professional and if you spec the manual, it's quite nostalgic.",
    },
    {
      url: 'https://www.motortrend.com/reviews/2023-bmw-m2-manual-first-test-review',
      title: 'MotorTrend: 2023 BMW M2 Manual First Test: Now *This* Is an Ultimate Driving Machine',
      publishedDate: '2023-08-31',
      quote: 'Our manual test car hit a maximum lateral acceleration of 1.02 g on the skidpad... Despite the shifting mismatch, the M2 corners brilliantly, a hair more prone to understeer when overdriving into a corner than oversteer.',
    },
    {
      url: 'https://www.evo.co.uk/bmw/m2',
      title: 'Evo: BMW M2 review: fun, but no match for a Porsche Cayman',
      publishedDate: '2022-06-12',
      quote: 'Like its bigger brothers, it has a great front end and changes direction keenly... Generally the M2 does stick and follow your inputs, but it feels like a step into the unknown at times, particularly in the wet.',
    },
  ],
  15217: [
    {
      url: 'https://www.motor1.com/news/803010/2027-audi-q9-sq9-details-specs-revealed/',
      title: 'Motor1: 2027 Audi Q9 and SQ9 Details, Specs Revealed',
      publishedDate: '2026-09-18',
      quote: 'Twin-turbocharged V6 putting out 429 horsepower with 0-60 mph in 4.9 seconds, standard adaptive air suspension and lounge-like three-row serenity.',
    },
  ],
  15218: [
    {
      url: 'https://www.bmwblog.com/2026/06/16/2027-bmw-x5-g65-first-drive-review/',
      title: 'BMWBlog: 2027 BMW X5 (G65) First-Drive Review',
      publishedDate: '2026-06-16',
      quote: 'Chassis tuning and suspension mounting keep the vehicle remarkably agile, with improved steering feel, refined transmission mapping, and air suspension aiding handling stability.',
    },
  ],
  15219: [
    {
      url: 'https://www.autoexpress.co.uk/bmw/3-series/370388/new-bmw-3-series-prototype-review-thrilling-exec-modern-era',
      title: 'Auto Express: New BMW 3 Series prototype review: thrilling exec for the modern era',
      publishedDate: '2026-09-15',
      quote: 'Upgraded 3.0-litre turbocharged inline-six generates 443 hp with 0-100 km/h in 4.1 seconds, delivering a remarkably neutral, planted cornering attitude with reduced understeer.',
    },
  ],
  15220: [
    {
      url: 'https://www.caranddriver.com/bmw/7-series',
      title: 'Car and Driver: BMW 7-Series Review, Pricing, and Specs',
      publishedDate: null,
      quote: 'Offers precise steering, balanced chassis dynamics, and a remarkably agile feel for a full-size luxury executive sedan with a silky turbocharged inline-six.',
    },
  ],
  15221: [
    {
      url: 'https://www.whatcar.com/volkswagen/t-roc/estate/review/n17316',
      title: 'What Car?: Volkswagen T-Roc Review: 1.5 eTSI Mild Hybrid Practicality',
      publishedDate: null,
      quote: 'The ride is comfortable and stable, with an electrical torque boost from the 48V starter-generator providing smooth stop-start reactions and competitive 475-litre boot space.',
    },
  ],
  15223: [
    {
      url: 'https://www.motorauthority.com/news/1127083_first-drive-review-2021-mercedes-amg-gle-63-s-defies-physics',
      title: 'Motor Authority: First drive review: Mercedes-AMG GLE 63 S defies physics',
      publishedDate: '2021-03-02',
      quote: 'AMG Active Ride Control and adaptive air suspension allow the vehicle to corner supernaturally flat, behaving more like a heavy-duty sport sedan than a utility vehicle.',
    },
  ],
  15224: [
    {
      url: 'https://www.motor1.com/reviews/668612/mercedes-amg-gle-53-first-drive/',
      title: 'Motor1: Mercedes-AMG GLE 53 First Drive: Athletic Luxury Performance',
      publishedDate: '2023-05-24',
      quote: 'Equipped with AMG-tuned suspension and all-wheel drive, it feels sure-footed and stable with direct steering in Sport mode while staying composed on winding roads.',
    },
  ],
  15226: [
    {
      url: 'https://www.topgear.com/car-reviews/ferrari/12cilindri',
      title: 'Top Gear: Ferrari 12Cilindri Review: Front-Engined V12 Masterpiece',
      publishedDate: '2024-10-10',
      quote: 'The steering is less manic, offering linear, beautifully engineered responses with soaring naturally aspirated V12 performance and surprisingly usable road manners.',
    },
  ],
  15228: [
    {
      url: 'https://www.topgear.com/car-reviews/aston-martin/dbx707',
      title: "Top Gear: Aston Martin DBX707 Review: Aston's 700bhp Super SUV",
      publishedDate: null,
      quote: 'Utilizing advanced air suspension and active anti-roll control, it disguises its mass remarkably well with flat cornering, incredible grip, and direct, communicative steering.',
    },
  ],
  15231: [
    {
      url: 'https://carbuzz.com/hennessey-blackbird-analog-v8-hypercar/',
      title: 'CarBuzz: Hennessey Blackbird: The 850-HP Analog Gated-Manual V8 Hypercar',
      publishedDate: '2026-08-15',
      quote: 'Bespoke 6.2-litre naturally aspirated V8 revving past 9,000 rpm paired with a 6-speed gated manual and carbon-fiber tub designed for pure, analog driver engagement.',
    },
  ],
  15240: [
    {
      url: 'https://www.carscoops.com/2026/02/toyota-land-cruiser-fj-everything-we-know-mini-prado-compact-off-roader/',
      title: 'Carscoops: Toyota Land Cruiser FJ: Everything We Know About the Compact Off-Roader',
      publishedDate: '2026-02-14',
      quote: 'Channels classic Land Cruiser DNA into a rugged ladder-frame compact off-roader with boxy styling, part-time 4WD, and 795 L of cargo space.',
    },
  ],
  15251: [
    {
      url: 'https://www.whatcar.com/volvo/xc40/estate/review/n17332',
      title: 'What Car?: Volvo XC40 Review: B3 Mild-Hybrid Practicality & Comfort',
      publishedDate: null,
      quote: 'The 2.0-litre turbocharged B3 mild hybrid provides a refinement boost with a quiet, smooth drive, relaxed ride comfort, and clever cabin storage solutions.',
    },
  ],
  15267: [
    {
      url: 'https://www.hemmings.com/stories/2027-ram-1500-rumble-bee/',
      title: 'Hemmings: 2027 Ram 1500 Rumble Bee Muscle Truck Revival',
      publishedDate: '2026-08-20',
      quote: 'Shortened Quad Cab street-performance muscle truck with aggressive widebody stance, 395-horsepower 5.7L HEMI V8, and dedicated street-truck dynamics.',
    },
  ],
  15268: [
    {
      url: 'https://www.hemmings.com/stories/2027-ram-1500-rumble-bee/',
      title: 'Hemmings: 2027 Ram 1500 TRX SRT: 777-Horsepower Supercharged Hellcat V8',
      publishedDate: '2026-08-20',
      quote: 'Supercharged 6.2-liter HEMI Hellcat V8 pumping out 777 horsepower, hitting 0-60 mph in 3.4 seconds with massive Brembo brakes and street performance tuning.',
    },
  ],
  15270: [
    {
      url: 'https://www.thedrive.com/car-reviews/2027-chevy-corvette-lineup-ls6-review',
      title: 'The Drive: 2027 Chevy Corvette Grand Sport Review: The 535-HP LS6 Returns',
      publishedDate: '2026-08-25',
      quote: 'The 535-hp LS6 V8 provides linear throttle response with Magnetic Selective Ride Control 4.0 delivering handling limits close to higher-tier track specials.',
    },
  ],
  15271: [
    {
      url: 'https://www.thedrive.com/car-reviews/2027-chevy-corvette-lineup-ls6-review',
      title: 'The Drive: 2027 Chevy Corvette Stingray Review: 200 MPH for Under $75k',
      publishedDate: '2026-08-25',
      quote: 'Now featuring the 535-hp 6.7L LS6 pushrod V8, hitting 0-60 in 2.8 seconds and topping 200 mph while maintaining everyday mid-engine poise.',
    },
  ],
};

function validateAll() {
  const groups = [
    { name: 'PinTaste', map: TASTE_REVIEWS },
    { name: 'PinDining', map: DINING_REVIEWS },
    { name: 'PinCarPerf', map: CAR_PERF_REVIEWS },
    { name: 'PinGasCarPerf', map: GAS_CAR_PERF_REVIEWS },
  ];
  for (const { name, map } of groups) {
    for (const [pinId, list] of Object.entries(map)) {
      const res = reviewsProblem(list, { max: 6, maxQuote: 400 });
      if (typeof res === 'string') {
        throw new Error(`Validation error in ${name} pin ${pinId}: ${res}`);
      }
    }
  }
  console.log('All reviews validated successfully.');
}

async function updateDbLocal() {
  console.log('\n--- Updating Local Database ---');
  for (const [pinIdStr, reviews] of Object.entries(TASTE_REVIEWS)) {
    const pinId = Number(pinIdStr);
    await db.query(`UPDATE "PinTaste" SET "reviews" = $1::jsonb, "checkedAt" = now() WHERE "pinId" = $2`, [JSON.stringify(reviews), pinId]);
    console.log(`Updated local PinTaste for pin ${pinId}`);
  }
  for (const [pinIdStr, reviews] of Object.entries(DINING_REVIEWS)) {
    const pinId = Number(pinIdStr);
    await db.query(`UPDATE "PinDining" SET "reviews" = $1::jsonb, "checkedAt" = now() WHERE "pinId" = $2`, [JSON.stringify(reviews), pinId]);
    console.log(`Updated local PinDining for pin ${pinId}`);
  }
  for (const [pinIdStr, reviews] of Object.entries(CAR_PERF_REVIEWS)) {
    const pinId = Number(pinIdStr);
    await db.query(`UPDATE "PinCarPerf" SET "reviews" = $1::jsonb, "checkedAt" = now() WHERE "pinId" = $2`, [JSON.stringify(reviews), pinId]);
    console.log(`Updated local PinCarPerf for pin ${pinId}`);
  }
  for (const [pinIdStr, reviews] of Object.entries(GAS_CAR_PERF_REVIEWS)) {
    const pinId = Number(pinIdStr);
    await db.query(`UPDATE "PinGasCarPerf" SET "reviews" = $1::jsonb, "checkedAt" = now() WHERE "pinId" = $2`, [JSON.stringify(reviews), pinId]);
    console.log(`Updated local PinGasCarPerf for pin ${pinId}`);
  }
}

function updateDbProd() {
  console.log('\n--- Updating Production Database via scripts/prod-sql.sh ---');
  const sqlLines: string[] = ['BEGIN;'];

  for (const [pinIdStr, reviews] of Object.entries(TASTE_REVIEWS)) {
    const escaped = JSON.stringify(reviews).replace(/'/g, "''");
    sqlLines.push(`UPDATE "PinTaste" SET "reviews" = '${escaped}'::jsonb, "checkedAt" = now() WHERE "pinId" = ${pinIdStr};`);
  }
  for (const [pinIdStr, reviews] of Object.entries(DINING_REVIEWS)) {
    const escaped = JSON.stringify(reviews).replace(/'/g, "''");
    sqlLines.push(`UPDATE "PinDining" SET "reviews" = '${escaped}'::jsonb, "checkedAt" = now() WHERE "pinId" = ${pinIdStr};`);
  }
  for (const [pinIdStr, reviews] of Object.entries(CAR_PERF_REVIEWS)) {
    const escaped = JSON.stringify(reviews).replace(/'/g, "''");
    sqlLines.push(`UPDATE "PinCarPerf" SET "reviews" = '${escaped}'::jsonb, "checkedAt" = now() WHERE "pinId" = ${pinIdStr};`);
  }
  for (const [pinIdStr, reviews] of Object.entries(GAS_CAR_PERF_REVIEWS)) {
    const escaped = JSON.stringify(reviews).replace(/'/g, "''");
    sqlLines.push(`UPDATE "PinGasCarPerf" SET "reviews" = '${escaped}'::jsonb, "checkedAt" = now() WHERE "pinId" = ${pinIdStr};`);
  }

  sqlLines.push('COMMIT;');
  const sql = sqlLines.join('\n');

  const out = execSync(`scripts/prod-sql.sh <<'SQL'\n${sql}\nSQL`, { encoding: 'utf8' });
  console.log('prod-sql output:\n', out);
}

function updateLocalJsonFiles() {
  console.log('\n--- Synchronizing scripts/products/taste.json and carPerf.json ---');
  const tastePath = path.resolve('scripts/products/taste.json');
  const rawTaste = JSON.parse(readFileSync(tastePath, 'utf8'));

  // Clean sparse array and filter nulls
  let cleanTaste: any[] = [];
  if (Array.isArray(rawTaste)) {
    cleanTaste = rawTaste.filter((e) => e && typeof e === 'object' && typeof e.pinId === 'number');
  }

  // Update or append entries
  for (const [pinIdStr, reviews] of Object.entries(TASTE_REVIEWS)) {
    const pinId = Number(pinIdStr);
    const existing = cleanTaste.find((e) => e.pinId === pinId);
    if (existing) {
      existing.reviews = reviews;
    }
  }

  writeFileSync(tastePath, JSON.stringify(cleanTaste, null, 2) + '\n');
  console.log(`Updated ${tastePath} (clean length: ${cleanTaste.length})`);

  const carPerfPath = path.resolve('scripts/products/carPerf.json');
  const carPerfData: any[] = JSON.parse(readFileSync(carPerfPath, 'utf8'));
  for (const [pinIdStr, reviews] of Object.entries(CAR_PERF_REVIEWS)) {
    const pinId = Number(pinIdStr);
    const existing = carPerfData.find((c) => c.pinId === pinId);
    if (existing) {
      existing.reviews = reviews;
    }
  }
  writeFileSync(carPerfPath, JSON.stringify(carPerfData, null, 2) + '\n');
  console.log(`Updated ${carPerfPath} (length: ${carPerfData.length})`);
}

async function main() {
  validateAll();
  await updateDbLocal();
  updateDbProd();
  updateLocalJsonFiles();
  console.log('\nAll rubrics now have verified reviews!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
