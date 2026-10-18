import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { diningProblem, saveDining } from '@/server/model/pinDining';
import type { DiningReview } from '@/lib/pinDining';

const BASE = 'https://www.chronopin.com';

const newReviewsMap: Record<number, DiningReview[]> = {
  2558: [
    {
      url: 'https://www.theinfatuation.com/san-francisco/reviews/chez-panisse',
      title: 'Chez Panisse - Review - Berkeley - San Francisco (The Infatuation)',
      publishedDate: '2024-03-27',
      quote: 'If you are dining downstairs in the main dining room, you’ll be seated in a warm, Craftsman-style room where the only option is a four-course, pre-set menu that changes nightly.',
    },
    {
      url: 'https://guide.michelin.com/us/en/california/berkeley/restaurant/chez-panisse',
      title: 'Chez Panisse – Berkeley - a MICHELIN Guide Restaurant',
      publishedDate: null,
      quote: 'The bright-eyed team of chefs here work their magic in a gleaming open kitchen that is set at the very back of the dining room, dominated by an aromatic wood-burning oven. Downstairs in the main restaurant, diners are privy to a rotating four-course fixed menu.',
    },
    {
      url: 'https://www.sfchronicle.com/restaurants/article/The-fantasy-and-reality-of-dining-at-Chez-13650410.php',
      title: 'The fantasy — and reality — of dining at Chez Panisse',
      publishedDate: '2019-02-28',
      quote: 'Overall, Chez Panisse’s dishes felt too simple to me, though I know that this is the result of both the house style and the requirements of aesthetic efficiency that come from a daily rotating menu.',
    },
  ],
  2573: [
    {
      url: 'https://www.gayot.com/restaurants/antoines-restaurant-new-orleans-la-70130_18no9909.html',
      title: "Antoine's Restaurant - New Orleans (GAYOT)",
      publishedDate: '2024-11-20',
      quote: 'The French-Creole food may not be as exceptional as that of some younger establishments, but it is reliable.',
    },
    {
      url: 'https://www.nola.com/entertainment_life/eat-drink/antoines-new-orleans-oldest-restaurant-has-new-chef/article_7e577de8-858f-11ee-8977-6795e1dae2d9.html',
      title: 'At Antoine’s, New Orleans’ oldest restaurant, change keeps coming to keep tradition alive',
      publishedDate: '2023-11-22',
      quote: 'Under thick wooden beams high above, cooks swept past with trays of steaks, piped meringue onto regal baked Alaska desserts and tended plates of oyster Rockefeller in a broiler that dates to the Truman administration.',
    },
    {
      url: 'https://nola.eater.com/maps/dessert-new-orleans-restaurants-steals-the-show',
      title: '20 New Orleans Restaurants Where Dessert Steals the Show',
      publishedDate: '2022-12-13',
      quote: 'Pecan bread pudding, flaming cafe brulot, the baked Alaska. Antoine’s, the city’s oldest operating family-run restaurant, turns out an array of desserts that have been satisfying sweet tooths since 1840.',
    },
  ],
  2575: [
    {
      url: 'https://www.seattletimes.com/life/food-drink/review-why-our-critic-no-longer-recommends-seattles-famous-canlis/',
      title: "Review: Why our critic no longer recommends Seattle's famous Canlis (The Seattle Times)",
      publishedDate: '2024-03-27',
      quote: "At $175 a person, Canlis isn't just asking for money. It's asking for trust — and on my visits, it broke it.",
    },
    {
      url: 'https://www.theinfatuation.com/seattle/reviews/canlis',
      title: 'Canlis - Review - Queen Anne - Seattle (The Infatuation)',
      publishedDate: '2024-04-10',
      quote: "It's grand, it's mid-century modern, and it overlooks Lake Union with the Cascades in the background.",
    },
    {
      url: 'https://seattle.eater.com/maps/best-restaurants-seattle-38',
      title: 'The 38 Best Restaurants in Seattle',
      publishedDate: '2018-04-10',
      quote: 'Canlis is the most famous restaurant in Seattle, and maybe the most important. It’s what people think fine dining is supposed to be: valet parking, a panoramic view over Lake Union, servers appearing at your elbow with elegantly cured carafes of wine.',
    },
  ],
  2577: [
    {
      url: 'https://www.theinfatuation.com/miami/reviews/joes-stone-crab',
      title: "Joe's Stone Crab - Review - South Beach - Miami (The Infatuation)",
      publishedDate: '2024-04-03',
      quote: 'The claws are served cold, pre-cracked, and with a side of mustard sauce that we would happily drink like a shot.',
    },
    {
      url: 'https://timeout.com/miami/restaurants/joes-stone-crab',
      title: "Joe's Stone Crab (Time Out Miami)",
      publishedDate: '2024-08-01',
      quote: 'The food is straightforward and generous, from the creamed spinach to the fried chicken that somehow rivals the crab.',
    },
    {
      url: 'https://guide.michelin.com/us/en/florida/miami-beach/restaurant/joe-s-stone-crab',
      title: "Joe's Stone Crab – Miami Beach - a MICHELIN Guide Restaurant",
      publishedDate: null,
      quote: "Boiled, chilled and served with a signature mustard sauce, stone crab claws are the signature dish (they're also sustainable, as crabs can regenerate their claws in around two years). End the meal with a refreshing, slightly creamy, slice of key lime pie.",
    },
  ],
  2582: [
    {
      url: 'https://www.gayot.com/restaurants/awards/pats-king-steaks-philadelphia-pa-19147_11ph9975.html',
      title: "Pat's King of Steaks - Philadelphia (GAYOT)",
      publishedDate: '2024-11-20',
      quote: 'The sandwich is greasy, messy and satisfying, served at a pace that keeps the line moving 24 hours a day.',
    },
    {
      url: 'https://cigar-coop.com/2024/12/pats-king-of-steaks-cheesesteak-review-the-blog.html',
      title: "Pat's King of Steaks Cheesesteak Review (The Blog, Cigar Coop)",
      publishedDate: '2024-12-08',
      quote: "The sandwich holds up as an authentic Philadelphia experience, even if the debate with Geno's will never end.",
    },
    {
      url: 'https://www.phillymag.com/restaurants/best-cheesesteaks-philadelphia/',
      title: 'Where to Eat Cheesesteaks in Philadelphia: The Ultimate Guide',
      publishedDate: '2019-11-14',
      quote: 'Pat’s is fast. Pat’s is famous. Pat’s is open every day, all of the time, except on Thanksgiving and Christmas. It slops on the Whiz (when you ask for it) and has been making cheesesteaks since 1930.',
    },
  ],
  2587: [
    {
      url: 'https://www.sunset.com/travel/insider-guides/buckhorn-exchange-restaurant-denver-00418000082065/',
      title: 'The Buckhorn Exchange (Sunset)',
      publishedDate: '2023-08-01',
      quote: 'Order the Rocky Mountain oysters, a buffalo prime rib, and take in walls that hold more than 500 taxidermy mounts.',
    },
    {
      url: 'https://5280.com/restaurant/buckhorn-exchange/',
      title: 'Buckhorn Exchange - 5280',
      publishedDate: '2024-05-01',
      quote: 'This Denver classic exudes a Wild West feel with taxidermied animals on the walls and a menu that includes Rocky Mountain oysters and wild game.',
    },
    {
      url: 'https://www.westword.com/location/buckhorn-exchange-5161164/',
      title: 'Buckhorn Exchange | Golden Triangle/La Alma | Steakhouse',
      publishedDate: '2014-09-17',
      quote: 'If you’re on a nineteenth-century budget, head to the historic bar on the second floor, where you can snack on Rocky Mountain oysters, enjoy entertainment and gaze upon all the taxidermied specimens distantly related to what might arrive on your plate.',
    },
  ],
  2590: [
    {
      url: 'https://www.theinfatuation.com/washington-dc/reviews/old-ebbitt-grill',
      title: 'Old Ebbitt Grill - Review - Downtown - Washington DC (The Infatuation)',
      publishedDate: '2024-11-21',
      quote: 'The crab cakes—decadently moist and served with a mayo-heavy tartar sauce and tangy coleslaw—are a crowd favorite.',
    },
    {
      url: 'https://liveandletsfly.com/old-ebbitt-grill-review',
      title: "Old Ebbitt Grill - My Favorite Washington, DC Restaurant (Live and Let's Fly, travel blog)",
      publishedDate: '2023-07-15',
      quote: "I've had so many excellent meals over the years here and never a bad one.",
    },
    {
      url: 'https://washingtonian.com/2008/03/25/neighborhood-eats-old-ebbitt-grill/',
      title: 'Neighborhood Eats: Old Ebbitt Grill - Washingtonian',
      publishedDate: '2008-03-25',
      quote: 'If you hit the bar between 3 and 6 PM or 11 PM and close, all raw-bar items—including the Orca platter with oysters, clams, lobster, and shrimp—are half-price.',
    },
  ],
  2720: [
    {
      url: 'https://soul-grown.com/little-bird-captures-the-heart-of-southern-hospitality/',
      title: 'Little Bird captures the heart of Southern hospitality (SoulGrown)',
      publishedDate: '2025-12-11',
      quote: "Dishes like the family-style cornbread, made from his mother's recipe, arrive warm and fresh out of the kitchen.",
    },
    {
      url: 'https://www.uptownacorn.com/2025/10/the-heart-of-downtown-fairhope-alabama.html',
      title: 'Dinner at Little Bird Fairhope (The Uptown Acorn, blog)',
      publishedDate: '2025-10-06',
      quote: 'The flavors were fresh, perfectly balanced, and beautifully presented.',
    },
    {
      url: 'https://mobilebaymag.com/restaurant-review-little-bird/',
      title: 'Restaurant Review: Little Bird (Mobile Bay Magazine)',
      publishedDate: '2025-08-01',
      quote: 'Dishes include tender octopus served with a piquant smoked tomato sauce and green onion sausage, prompting chef Bill Briand to laugh, “Some nights, it\'s on every ticket!”',
    },
  ],
  2731: [
    {
      url: 'https://guide.michelin.com/us/en/colorado/denver/restaurant/milpero',
      title: 'Milpero - a MICHELIN Guide Restaurant (guide inspector text, one star)',
      publishedDate: null,
      quote: 'Chef Johnny Curiel has already established himself as an adept of contemporary Mexican cuisine, but at this rarefied workshop, his aims are more ambitious still.',
    },
    {
      url: 'https://diningout.com/denver/milpero-denver-fonda-fina/',
      title: 'Milpero Brings the Best of Masa and Mole in Denver (DiningOut)',
      publishedDate: '2026-05-05',
      quote: 'At its heart is an 18-course tasting menu designed to showcase the ingredients and techniques that define Mexico’s culinary heritage—first and foremost being corn and the nixtamalization process that turns it into masa.',
    },
    {
      url: 'https://www.westword.com/food-drink/chef-johnny-curiel-milpero-mexican-fine-dining-40885255/',
      title: 'At Milpero, Johnny Curiel is planting the future of Mexican fine dining (Westword)',
      publishedDate: '2026-05-19',
      quote: 'Instead, it’s a highly entertaining, educational, and overwhelmingly delicious dinner party that only eight people can attend at any one time, with just two seatings available a night.',
    },
  ],
  2733: [
    {
      url: 'https://guide.michelin.com/us/en/district-of-columbia/washington-dc/restaurant/albi',
      title: 'Albi - a MICHELIN Guide Restaurant (One MICHELIN Star)',
      publishedDate: null,
      quote: 'Chef Michael Rafidi’s cooking is smoky, soulful, and intimately tied to his Palestinian roots, prepared over a roaring open hearth that anchors the dining room.',
    },
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#albi',
      title: 'The Restaurant List 2026: Albi (The New York Times)',
      publishedDate: '2026-09-15',
      quote: 'The menu moved from broadly Levantine to more explicitly Palestinian - coal-blistered Jericho dates, oysters with arak, kibbe naya with rose.',
    },
    {
      url: 'https://washingtonian.com/2025/01/21/albi-is-washingtonians-1-restaurant-in-dc-for-2025/',
      title: "Albi Is Washingtonian's #1 Restaurant in DC for 2025 (Washingtonian)",
      publishedDate: '2025-01-21',
      quote: 'If you’re a lamb lover, Albi should be at the top of your own list, if only for its spectacular barbecue lamb kebab. If you’re a vegetarian or pescatarian, you’ll eat just as wonderfully well.',
    },
  ],
  2746: [
    {
      url: 'https://www.theinfatuation.com/detroit/reviews/roses-fine-foods',
      title: "Rose's - Review - East Jefferson - Detroit (The Infatuation)",
      publishedDate: '2026-07-27',
      quote: 'Come with friends, order widely, and linger.',
    },
    {
      url: 'https://midbrow.org/roses-fine-food-review/',
      title: 'Bury Me At Roses (Midbrow)',
      publishedDate: '2026-05-29',
      quote: 'And no other spots elevate Polish home cooking like this into something resembling fine dining but without the pretension.',
    },
    {
      url: 'https://www.freep.com/story/entertainment/dining/restaurant-of-the-year/2026/02/12/2026-restaurant-of-the-year-roses-fine-food-detroit-diner/88285307007/',
      title: "2026 Restaurant of the Year: Rose's Fine Food Detroit diner (Detroit Free Press)",
      publishedDate: '2026-02-12',
      quote: 'Where there was once a side of bacon, there is now kielbasa, smoked, split and fried hard, its skin reddish and snappy. Where there were soft scrambled eggs and griddled potatoes, there are potato dumplings swimming in borscht.',
    },
  ],
  2752: [
    {
      url: 'https://guide.michelin.com/us/en/new-york-state/queens/restaurant/meju',
      title: 'Meju - a MICHELIN Guide Restaurant (One MICHELIN Star)',
      publishedDate: null,
      quote: 'Chef Hooni Kim crafts an elegant Korean fermentation tasting menu at this intimate counter hidden behind a banchan shop.',
    },
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#meju',
      title: 'The Restaurant List 2026: Meju (The New York Times)',
      publishedDate: '2026-09-15',
      quote: 'Chef Hooni Kim explores the wonders of fermentation, speaking directly and disarmingly to diners and cooking with the fervor of a preacher. Each bite makes a powerful case for food as both pleasure and cure.',
    },
    {
      url: 'https://www.timeout.com/newyork/news/four-nyc-restaurants-were-just-named-among-the-countrys-best-according-to-the-new-york-times-091526',
      title: "Four NYC restaurants were just named among the country's best, according to the New York Times (Time Out New York)",
      publishedDate: '2026-09-15',
      quote: 'At Meju, chef Hooni Kim makes fermentation the main event. Tucked behind a banchan shop, the intimate restaurant looks to traditional Korean methods at a time when plenty of the city’s high-end Korean dining pushes in more experimental directions.',
    },
  ],
  2760: [
    {
      url: 'https://www.inquirer.com/food/craig-laban/joey-baldino-bomb-bomb-bar-review-20260224.html',
      title: 'Bomb Bomb Bar revives a classic South Philly Italian seafood spot with panache and care (Philadelphia Inquirer)',
      publishedDate: '2026-02-24',
      quote: 'A shot of Calabrian chile paste and white wine give his fra diavolo sauce an irresistibly zesty ba-da-boom.',
    },
    {
      url: 'https://www.phillymag.com/foobooz/2026/04/07/bomb-bomb-bar-review/',
      title: 'Bomb Bomb Bar Is a Masterclass in South Philly Nostalgia (Philadelphia Magazine)',
      publishedDate: '2026-04-07',
      quote: 'The dining room (entered through the old-school “ladies entrance”) is small, close-set and rigorously anti-fancy.',
    },
    {
      url: 'https://www.nytimes.com/interactive/2026/dining/best-restaurants-america.html#bomb-bomb',
      title: 'The New York Times: The 50 Best Restaurants in the United States, 2026: Bomb Bomb',
      publishedDate: '2026-09-15',
      quote: 'That is, until you dig into the stuffed calamari, mussels fra diavolo and lobster Francesca, each as poetically reverent as a heartfelt eulogy. You remember a joint like this from when you were young. Now imagine finding it in Philly, better than ever.',
    },
  ],
  2768: [
    {
      url: 'https://1889mag.com/?p=29709',
      title: "Experience the Best Beer You'll Have All Year (1889 Magazine)",
      publishedDate: '2023-05-31',
      quote: 'But don’t overlook the roasted oysters with chipotle bourbon butter',
    },
    {
      url: 'https://www.seattlemet.com/travel-and-outdoors/2024/02/oyster-shellfish-tasting-hood-canal-fjord-bank',
      title: 'Forget Wine Tasting. Try Oyster Tasting. (Seattle Met, feature)',
      publishedDate: '2024-02-16',
      quote: 'Today it’s grown to a village of A-frame table shelters, an outdoor bar and firepit, a gift shop with a live crab tank and merch that ranges from baby onesies to beer koozies.',
    },
    {
      url: 'https://seattle.eater.com/restaurant-news/87248/hama-hama-oyster-saloon-olympic-peninsula-how-to-get-to',
      title: 'How the Rugged Hama Hama Oyster Saloon Became an Oyster Lovers Paradise (Eater Seattle)',
      publishedDate: '2025-07-07',
      quote: 'There’s no better place to linger over Hama Hamas and Blue Pools than the saloon, wood smoke in your nose, looking out at the beach where, at night, Hama Hama workers in headlamps harvest oysters out of the shallow, cold water.',
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
    {
      url: 'https://sfstandard.com/2026/02/10/restaurant-naides-san-francisco-review-filipino-fine-dining/',
      title: 'A new standard for Filipino fine dining in the Bay Area (The San Francisco Standard)',
      publishedDate: '2026-02-10',
      quote: "Two delicate wafers sit on a white ceramic pedestal... These 'lumpia' look almost too fragile to lift off the plate. But the flavors and textures are not delicate — they are vivid, with bright splashes of pickled jackfruit, banana miso, and Japanese pear.",
    },
  ],
  2773: [
    {
      url: 'https://washingtonian.com/2026/07/13/rye-bunny-dc-restaurant-review/',
      title: 'Rye Bunny Masters the Art of Comfort Food (Washingtonian)',
      publishedDate: '2026-07-13',
      quote: 'I loved a croquette made from cornmeal and the trimmings from the Autumn Olive Farms pork he serves as a larger tenderloin.',
    },
    {
      url: 'https://www.theinfatuation.com/washington-dc/reviews/rye-bunny',
      title: 'Rye Bunny - Review - Adams Morgan - Washington DC (The Infatuation)',
      publishedDate: '2026-10-07',
      quote: 'Come here when you feel like eating incredible food with stellar service in a setting that feels like a local pub.',
    },
    {
      url: 'https://guide.michelin.com/us/en/district-of-columbia/washington-dc/restaurant/rye-bunny',
      title: 'Rye Bunny - a MICHELIN Guide Restaurant (guide inspector text)',
      publishedDate: '2026-09-17',
      quote: 'Meanwhile, the food is best described as contemporary, creative riffs on comfort food, as in fried chicken with Aleppo pepper and sumac honey served over black garlic toum with red pepper jam. Anchovy toast on milk bread with blood orange compote and fennel pollen is impossibly delicious.',
    },
  ],
  2782: [
    {
      url: 'https://www.aol.com/articles/colorful-raleigh-restaurant-neighborhood-hangout-142300340.html',
      title: "This Colorful Raleigh Restaurant Is The New Neighborhood Hangout You'll Wish You Found Sooner (Southern Living, via AOL)",
      publishedDate: '2026-04-26',
      quote: 'The seasoning is spot on, but the sourcing of ingredients at Big Cat is what truly shines.',
    },
    {
      url: 'https://www.yahoo.com/lifestyle/articles/buzzy-raleigh-spot-named-one-165250658.html',
      title: "Buzzy new Raleigh spot named one of NYT's 50 Best Restaurants in the country (News & Observer via Yahoo, quoting the NYT's Kim Severson)",
      publishedDate: '2026-09-15',
      quote: '"Never underestimate the power of the supergroup," Severson writes.',
    },
    {
      url: 'https://waltermagazine.com/current-issue/the-convergence-big-cat-big-ambitions/',
      title: 'The Convergence: Big Cat’s Big Ambitions (WALTER Magazine)',
      publishedDate: '2026-06-25',
      quote: 'There are plenty of items to share: a mezze trio with warm olives and housemade bread, a decadent seven-layer dip topped with corn flakes, coconut curry roasted oysters. Mains include a Joyce Farms half chicken... and melt-in-your-mouth pork belly with chiles and herbs.',
    },
  ],
  6443: [
    {
      url: 'https://guide.michelin.com/us/en/california/us-san-diego/restaurant/lola-55',
      title: 'LOLA 55 - a MICHELIN Guide Restaurant (guide inspector text)',
      publishedDate: null,
      quote: 'The breezy space features high ceilings, concrete floors and a full bar, and manages to cook even better than it looks.',
    },
    {
      url: 'https://sandiegomagazine.com/food-drink/lola55-opens-in-east-village/',
      title: 'Lola55 Opens in East Village (San Diego Magazine, opening-news piece)',
      publishedDate: '2018-10-19',
      quote: "It's a good-food-ethics joint, using fresh, top-notch ingredients for their nine signature tacos (rib-eye carne asada, smoked fish, two vegetarian options, etc.).",
    },
    {
      url: 'https://www.sandiegoreader.com/news/2021/jul/01/tin-fork-lola-55-respectful-oaxacan-tortilla/',
      title: 'Lola 55: respectful of Oaxacan tortilla quality (San Diego Reader)',
      publishedDate: '2021-07-01',
      quote: 'The rainbow cauliflower taco was chock full of things like charred cauliflower, avocado mousse, almonds, golden raisins, a dark morita dulce salsa... don’t let the words \'cauliflower\' and \'eggplant\' put you off. This thing was full of rad flavors. I was so impressed.',
    },
  ],
};

async function main() {
  const filePath = path.resolve('scripts/restaurants/diningRubric.json');
  const catalog = JSON.parse(readFileSync(filePath, 'utf8'));

  let updatedCount = 0;
  for (const entry of catalog) {
    if (newReviewsMap[entry.pinId]) {
      entry.reviews = newReviewsMap[entry.pinId];
      updatedCount++;
    }
  }

  console.log(`Updated reviews for ${updatedCount} entries in catalog.`);
  writeFileSync(filePath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  // Verify all 35 entries
  console.log('Verifying all entries with diningProblem...');
  for (const entry of catalog) {
    const body = {
      ...entry.scores,
      ...(entry.reviews ? { reviews: entry.reviews } : {}),
      source: 'session',
      basis: entry.basis ?? null,
      sourceUrl: entry.sourceUrl ?? null,
    };
    const checked = diningProblem(body);
    if (typeof checked === 'string') {
      throw new Error(`Validation failed for pin ${entry.pinId}: ${checked}`);
    }
    const count = (entry.reviews || []).length;
    if (count < 3) {
      throw new Error(`Pin ${entry.pinId} still has ${count} reviews!`);
    }
  }
  console.log('All 35 entries verified successfully (each >= 3 reviews)!');

  // Apply to local DB
  console.log('\nApplying to local DB...');
  let localSaved = 0;
  for (const entry of catalog) {
    const body = {
      ...entry.scores,
      reviews: entry.reviews,
      source: 'session' as const,
      basis: entry.basis ?? null,
      sourceUrl: entry.sourceUrl ?? null,
    };
    const checked = diningProblem(body) as any;
    const ok = await saveDining(entry.pinId, checked.scores, checked);
    if (ok) localSaved++;
  }
  console.log(`Saved ${localSaved} entries to local DB.`);

  // Apply to Prod
  console.log('\nApplying to Production (https://www.chronopin.com)...');
  const token = readFileSync('.scrape/admin.token', 'utf8').trim();

  let prodSaved = 0;
  for (const [pinIdStr, reviews] of Object.entries(newReviewsMap)) {
    const pinId = Number(pinIdStr);
    const entry = catalog.find((e: any) => e.pinId === pinId);
    if (!entry) throw new Error(`Missing entry for ${pinId}`);

    const body = {
      ...entry.scores,
      reviews,
      source: 'session',
      basis: entry.basis ?? null,
      sourceUrl: entry.sourceUrl ?? null,
    };

    const res = await fetch(`${BASE}/api/pins/${pinId}/dining`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 200) {
      const err = await res.text();
      throw new Error(`Prod PUT failed for pin ${pinId}: ${res.status} ${err}`);
    }
    prodSaved++;
    console.log(`Pin ${pinId}: saved ${reviews.length} reviews to prod (status 200)`);
  }
  console.log(`Successfully updated ${prodSaved} pins on prod!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
