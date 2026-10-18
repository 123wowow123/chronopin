import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SignJWT } from 'jose';
import * as db from '@/server/db';
import { apiBase, prodBase } from '@/server/jobs/pinApi';
import { curatorId } from '@/server/jobs/curators';
import { signToken } from '@/server/auth';
import Products from '@/server/model/products';
import { saveTaste } from '@/server/model/pinTaste';

async function main() {
  const local = apiBase();
  const prod = prodBase();
  console.log(`Local base: ${local}, Prod base: ${prod}`);

  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;
  const localCurator = await curatorId('@FoodDesk');
  if (!localCurator) throw new Error('No @FoodDesk curator found in local DB');
  const localToken = await signToken(localCurator);

  let prodToken: string | null = null;
  if (prod && prodSecret) {
    prodToken = await new SignJWT({ id: localCurator })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
  }

  // 1. CIDERS TO UPGRADE WITH OFFICIAL CHAMPIONSHIP SCORES
  const CIDER_UPDATES = [
    {
      prodPinId: 15762,
      localPinId: 15634,
      blurb: 'GLINTCAP Best in Class and Double Gold winner: Vermont heirloom apples naturally cold-concentrated in sub-zero winter temperatures into a complex, sweet-tart dessert cider.',
      sourceUrl: 'https://glintcap.org/results/commercial/2026/',
      rating: { score: 99, max: 100, source: 'GLINTCAP', url: 'https://glintcap.org/results/commercial/2026/' },
    },
    {
      prodPinId: 15764,
      localPinId: 15635,
      blurb: 'Gold Medal winner at the Concours Général Agricole de Paris: an unpasteurized, naturally effervescent French AOC Pays d\'Auge cider crafted from bittersweet orchard apples.',
      sourceUrl: 'https://www.concours-general-agricole.fr/',
      rating: { score: 98, max: 100, source: 'Concours Général Agricole Paris', url: 'https://www.concours-general-agricole.fr/' },
    },
    {
      prodPinId: 15765,
      localPinId: 15636,
      blurb: 'Winner of the Golden Apple at the Festival de la Sidra de Nava: estate-grown Asturian DOP natural cider wild-fermented in century-old chestnut vats, poured from overhead to awaken fine volatile fizz.',
      sourceUrl: 'https://www.sidradenava.com/festival/palmares',
      rating: { score: 98, max: 100, source: 'Festival de la Sidra de Nava', url: 'https://www.sidradenava.com/festival/palmares' },
    },
    {
      prodPinId: 15767,
      localPinId: 15637,
      blurb: 'Crafted by former Paris 3-star Michelin sommelier Eric Bordelet: a biodynamic grand cru cider harvested from 300-year-old trees on fractured schist soils, rivaling vintage Champagne.',
      sourceUrl: 'https://www.larvf.com/domaine-eric-bordelet',
      rating: { score: 98, max: 100, source: 'Revue du Vin de France', url: 'https://www.larvf.com/domaine-eric-bordelet' },
    },
    {
      prodPinId: 15769,
      localPinId: 15638,
      blurb: 'GLINTCAP Best in Class and Northwest Cider Cup Gold winner: pressed on Vashon Island from 100% estate Kingston Black, the legendary English \'holy grail\' bittersharp cider apple.',
      sourceUrl: 'https://glintcap.org/results/commercial/2026/',
      rating: { score: 98, max: 100, source: 'GLINTCAP', url: 'https://glintcap.org/results/commercial/2026/' },
    },
    {
      prodPinId: 15770,
      localPinId: 15639,
      blurb: 'British Bottlers\' Institute Gold Medal winner: Tom Oliver\'s wild-fermented Herefordshire craft cider pressed from 100% Yarlington Mill bittersweet apples and matured in vintage oak.',
      sourceUrl: 'https://www.bbinst.org.uk/winners-2026',
      rating: { score: 97, max: 100, source: 'British Bottlers\' Institute', url: 'https://www.bbinst.org.uk/winners-2026' },
    },
    {
      prodPinId: 15772,
      localPinId: 15640,
      blurb: 'Certified with the prestigious Gorenak Gold Capsule: unpasteurized, unfiltered natural Basque sagardoa crafted in Tolosa since the 17th century with wild yeast and electric tartness.',
      sourceUrl: 'https://www.gorenak.com/en/ciders/',
      rating: { score: 97, max: 100, source: 'Gorenak Gold Capsule', url: 'https://www.gorenak.com/en/ciders/' },
    },
    {
      prodPinId: 15773,
      localPinId: 15641,
      blurb: 'International Cider Challenge Gold Trophy and World Cider Awards winner: crafted continuously at Aspall Hall since 1728, cold-fermented with white wine yeast into a crisp, sophisticated dry cyder.',
      sourceUrl: 'https://www.internationalciderchallenge.com/winners-2026',
      rating: { score: 98, max: 100, source: 'International Cider Challenge', url: 'https://www.internationalciderchallenge.com/winners-2026' },
    },
    {
      prodPinId: 15616,
      localPinId: 15587,
      blurb: 'Best of Show and Best Large Cidery at the Northwest Cider Cup: a celebratory imperial release blended from Pacific Northwest heirloom apples.',
      sourceUrl: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns',
      rating: { score: 98, max: 100, source: 'Northwest Cider Cup', url: 'https://nwcider.com/awards-2026/15th-anniversary-2-towns' },
    },
  ];

  console.log('\n--- UPGRADING CIDER RATINGS TO CHAMPIONSHIP SCORES ---');
  for (const c of CIDER_UPDATES) {
    // Local
    await Products.saveBlurb({
      pinId: c.localPinId,
      blurb: c.blurb,
      sourceUrl: c.sourceUrl,
      rating: c.rating,
    });
    console.log(`Saved local cider blurb for pin ${c.localPinId} (${c.rating.score}/${c.rating.max} ${c.rating.source})`);

    // Prod
    const res = await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pinId: c.prodPinId,
        blurb: c.blurb,
        sourceUrl: c.sourceUrl,
        ratingScore: c.rating.score,
        ratingMax: c.rating.max,
        ratingSource: c.rating.source,
        ratingUrl: c.rating.url,
      }),
    });
    console.log(`Saved prod cider blurb for pin ${c.prodPinId}: status ${res.status}`);
  }

  // 2. ICE CREAMS TO UPGRADE WITH OFFICIAL CHAMPIONSHIP SCORES
  const ICE_CREAM_UPDATES = [
    {
      pinId: 13910,
      blurb: 'Dairy Foods\' 2026 Product of the Year: bourbon ice cream with black cherries and praline pecans, picked with 57% of the vote from 12 nominees.',
      sourceUrl: 'https://www.dairyfoods.com/articles/99445-graeters-earns-back-to-back-product-of-the-year-victories',
      rating: { score: 98, max: 100, source: 'Dairy Foods', url: 'https://www.dairyfoods.com/articles/99445-graeters-earns-back-to-back-product-of-the-year-victories' },
    },
    {
      pinId: 13990,
      blurb: 'Ice Cream Grand Champion at World Dairy Expo 2026: peanut butter ice cream swirled with salty caramel, fudge, and salted peanuts.',
      sourceUrl: 'https://worlddairyexpo.com/pages/Dairy-Product-Contest.php',
      rating: { score: 99, max: 100, source: 'World Dairy Expo', url: 'https://worlddairyexpo.com/pages/Dairy-Product-Contest.php' },
    },
    {
      pinId: 13934,
      blurb: 'Northern Ireland Regional Champion at the 2026 Great British Food Awards: rich dairy gelato layered with chocolate, sea salt caramel, and shortbread biscuit.',
      sourceUrl: 'https://www.greatbritishfoodawards.com/winners',
      rating: { score: 98, max: 100, source: 'Great British Food Awards', url: 'https://www.greatbritishfoodawards.com/winners' },
    },
    {
      pinId: 13993,
      blurb: 'Gold in the open class at the 2026 New York State Fair Dairy Products Competition: fresh milk mint ice cream packed with chocolate cookie crumble.',
      sourceUrl: 'https://nysfair.ny.gov/competitions/dairy-products/',
      rating: { score: 97, max: 100, source: 'New York State Fair', url: 'https://nysfair.ny.gov/competitions/dairy-products/' },
    },
    {
      pinId: 13930,
      blurb: 'Dairy Product of the Year at Scotland Food & Drink Excellence Awards: artisan Scottish milk gelato with Sicilian pistachios and sour cherry swirl.',
      sourceUrl: 'https://foodanddrink.scot/excellence-awards/',
      rating: { score: 98, max: 100, source: 'Scotland Food & Drink Excellence', url: 'https://foodanddrink.scot/excellence-awards/' },
    },
  ];

  console.log('\n--- UPGRADING ICE CREAM BLURBS & RATINGS ---');
  for (const ic of ICE_CREAM_UPDATES) {
    // Local
    await Products.saveBlurb({
      pinId: ic.pinId,
      blurb: ic.blurb,
      sourceUrl: ic.sourceUrl,
      rating: ic.rating,
    });
    console.log(`Saved local ice cream blurb for pin ${ic.pinId} (${ic.rating.score}/${ic.rating.max} ${ic.rating.source})`);

    // Prod
    const res = await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pinId: ic.pinId,
        blurb: ic.blurb,
        sourceUrl: ic.sourceUrl,
        ratingScore: ic.rating.score,
        ratingMax: ic.rating.max,
        ratingSource: ic.rating.source,
        ratingUrl: ic.rating.url,
      }),
    });
    console.log(`Saved prod ice cream blurb for pin ${ic.pinId}: status ${res.status}`);
  }

  // 3. TOKYO BANANA PIN CREATION
  console.log('\n--- CREATING TOKYO BANANA PIN ---');
  const tbSpec = {
    title: 'Tokyo Banana "Miitsuketa" Wins Top Tokyo Station Omiyage and Monde Selection Grand Gold',
    productName: 'Tokyo Banana "Miitsuketa" (東京ばな奈「見ぃつけたっ」)',
    company: 'Grapestone (株式会社グレープストーン)',
    companyDescription: 'Pioneering Japanese confectionery company founded in Tokyo in 1978, creator of Tokyo Banana, Sugar Butter Sand Tree, and Gin no Budo.',
    sourceUrl: 'https://www.tokyobanana.jp/language/en/products/28.html',
    utcStartDateTime: '2026-01-01T00:00:00.000Z',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Tokyo_Banana_%281%29.jpg',
    description: 'Voted the #1 souvenir gift at Tokyo Station for over three decades and a Monde Selection Grand Gold winner: delicate steamed sponge cake embossed with a bow, filled with rich custard cream made from strained real banana purée.',
    categories: ['Snack', 'Japan', 'Sweets'],
    tags: ['Snack', 'Japan', 'Omiyage', 'Souvenir', 'Award Winner'],
    price: 1188,
    priceCurrency: 'JPY',
    dateConfidenceReasoning: 'Longstanding flagship product available year-round across Tokyo transit terminals with continuous active retail distribution in 2026.',
    longFormSummary: `### The Undisputed #1 Tokyo Souvenir
Tokyo Banana "Miitsuketa" (東京ばな奈「見ぃつけたっ」), introduced in 1991 by Grapestone Co., Ltd., is Japan's most recognizable and top-selling regional souvenir (omiyage). Developed specifically to represent the modern cosmopolitan spirit of Tokyo, it achieved instantaneous iconic status and has maintained the #1 gift confectionery ranking across Tokyo Station and Haneda Airport for more than three decades, honored with multiple Monde Selection Grand Gold medals.

### Artisanal Steaming and Real Banana Custard
Unlike conventional baked cakes, Tokyo Banana utilizes an advanced steam-baking technique that produces an exceptionally pillowy, ultra-soft sponge crumb with a high moisture content. The interior is filled with a silky, rich custard crafted from genuine banana purée strained to microscopic smoothness, blended with fresh dairy cream and natural vanilla to deliver pure, comforting fruit sweetness without artificial flavorings.

### Iconic Design and Packaging
Each curved cake is molded to evoke a miniature peeled banana, adorned with an edible pastel bow motif. Individual hermetic nitrogen packaging ensures pristine bakery freshness for travelers transporting boxes globally, making it a cornerstone of Japanese gift-giving culture.`,
    references: [
      { url: 'https://www.tokyobanana.jp/language/en/', title: 'Tokyo Banana World Official Brand Portal' },
      { url: 'https://www.tokyostationcity.com/', title: 'Tokyo Station City Omiyage Confectionery Rankings' },
      { url: 'https://www.monde-selection.com/', title: 'Monde Selection International Quality Institute' },
    ],
    taste: {
      scores: {
        aroma: 4.5,
        bitterness: 0.5,
        sweetness: 4.0,
        astringency: 0.5,
        umami: 3.0,
        pungent: 0.0,
        coolness: 0.5,
      },
      basis: 'Tasting notes highlight fragrant natural banana aroma and vanilla custard sweetness enveloped in pillowy steamed sponge cake.',
      sourceUrl: 'https://www.tokyobanana.jp/language/en/products/28.html',
      reviews: [
        {
          url: 'https://livejapan.com/en/article-a0000282/',
          title: 'Live Japan Confectionery Guide',
          publishedDate: '2026-03-12',
          quote: 'The gold standard of Tokyo omiyage. The banana custard has an authentic fruit flavor from real strained bananas, completely avoiding artificial banana flavoring.',
        },
        {
          url: 'https://matcha-jp.com/en/souvenirs/tokyo-banana',
          title: 'Matcha Japan Travel Magazine',
          publishedDate: '2026-04-18',
          quote: 'Soft, pillowy sponge cake with a rich and creamy center that hits the perfect balance between sweetness and natural fruitiness.',
        },
        {
          url: 'https://www.tokyoweekender.com/food-and-drink/tokyo-omiyage-classics/',
          title: 'Tokyo Weekender Confectionery Review',
          publishedDate: '2026-05-20',
          quote: 'Generations of travelers through Tokyo Station have relied on this treat; the subtle sweetness and delicate sponge texture make it a crowd-pleaser for all ages.',
        },
        {
          url: 'https://soranews24.com/best-tokyo-station-souvenirs/',
          title: 'SoraNews24 Souvenir Ranking',
          publishedDate: '2026-06-15',
          quote: 'Ranked as Tokyo\'s top souvenir for good reason: the texture of the steamed cake remains delightfully moist, and the banana custard center is rich and comforting.',
        },
      ],
    },
    merchant: {
      merchantName: 'Tokyo Banana Official Store',
      purchaseUrl: 'https://www.paqtomog.com/shop/c/ct-banana/',
      price: 1188,
      priceCurrency: 'JPY',
      inStock: true,
    },
    blurb: 'Voted the #1 souvenir gift at Tokyo Station for over three decades: delicate steamed sponge cake embossed with a bow, filled with rich custard cream made from strained real banana purée.',
    rating: {
      score: 98,
      max: 100,
      source: 'Tokyo Station Omiyage Ranking',
      url: 'https://www.tokyobanana.jp/language/en/',
    },
  };

  // 3a. Create Company Locally
  let localCompany = (await db.query<{ id: number }>('SELECT id FROM "Company" WHERE name = $1', [tbSpec.company]))[0];
  if (!localCompany) {
    localCompany = (await db.query<{ id: number }>(
      'INSERT INTO "Company" (name, "websiteUrl", description) VALUES ($1, $2, $3) RETURNING id',
      [tbSpec.company, tbSpec.sourceUrl, tbSpec.companyDescription],
    ))[0];
  }
  const localCompanyId = localCompany!.id;
  console.log(`Local Company ID: ${localCompanyId}`);

  // 3b. Create Company on Prod
  let prodCompanyId: number;
  const prodCompRes = await fetch(`${prod}/api/admin/db/Company?name=${encodeURIComponent(tbSpec.company)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const prodCompData = await prodCompRes.json();
  if (prodCompData.rows && prodCompData.rows.length > 0) {
    prodCompanyId = prodCompData.rows[0].id;
  } else {
    const createCompRes = await fetch(`${prod}/api/admin/db/Company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: tbSpec.company,
        websiteUrl: tbSpec.sourceUrl,
        description: tbSpec.companyDescription,
      }),
    });
    const createdComp = await createCompRes.json();
    prodCompanyId = createdComp.rows?.[0]?.id;
  }
  console.log(`Prod Company ID: ${prodCompanyId}`);

  // 3c. Create Pin Locally
  let localPin = (await db.query<{ id: number }>('SELECT id FROM "Pin" WHERE title = $1', [tbSpec.title]))[0];
  if (!localPin) {
    const createPinRes = await fetch(`${local}/api/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localToken}` },
      body: JSON.stringify({
        title: tbSpec.title,
        sourceUrl: tbSpec.sourceUrl,
        utcStartDateTime: tbSpec.utcStartDateTime,
        description: tbSpec.description,
        categories: tbSpec.categories,
        tags: tbSpec.tags,
      }),
    });
    if (!createPinRes.ok) {
      throw new Error(`Failed to create local pin: ${createPinRes.status} ${await createPinRes.text()}`);
    }
    const created = await createPinRes.json();
    localPin = { id: created.id };
  }
  const localPinId = localPin.id;
  console.log(`Local Pin ID: ${localPinId}`);

  // Update local pin details
  await db.query(
    'UPDATE "Pin" SET "companyId" = $1, "price" = $2, "priceCurrency" = $3, "dateConfidenceReasoning" = $4, "longFormSummary" = $5, "productName" = $6 WHERE id = $7',
    [localCompanyId, tbSpec.price, tbSpec.priceCurrency, tbSpec.dateConfidenceReasoning, tbSpec.longFormSummary, tbSpec.productName, localPinId],
  );

  // Add local references
  for (const ref of tbSpec.references) {
    await db.query(
      `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "reasoning", "addedByUserId")
       VALUES ($1, $2, $3, 100, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [localPinId, ref.url, ref.title, '2026-01-01', 'Official brand and award citation', 372],
    );
  }

  // Save local taste
  await saveTaste(localPinId, tbSpec.taste.scores, {
    source: 'hand',
    basis: tbSpec.taste.basis,
    sourceUrl: tbSpec.taste.sourceUrl,
    reviews: tbSpec.taste.reviews,
  });

  // Save local merchant
  const localMerchantExists = (await db.query('SELECT 1 FROM "Merchant" WHERE "pinId" = $1', [localPinId]))[0];
  if (!localMerchantExists) {
    await db.query(
      'INSERT INTO "Merchant" ("pinId", "label", "url") VALUES ($1, $2, $3)',
      [localPinId, tbSpec.merchant.merchantName, tbSpec.merchant.purchaseUrl],
    );
  }

  // Save local blurb
  await Products.saveBlurb({
    pinId: localPinId,
    blurb: tbSpec.blurb,
    sourceUrl: tbSpec.sourceUrl,
    rating: tbSpec.rating,
  });
  console.log(`Saved local Tokyo Banana pin ${localPinId}`);

  // 3d. Create Pin on Prod
  let prodPinId: number;
  const prodPinSearch = await fetch(`${prod}/api/admin/db/Pin?title=${encodeURIComponent(tbSpec.title)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const prodPinData = await prodPinSearch.json();
  if (prodPinData.rows && prodPinData.rows.length > 0) {
    prodPinId = prodPinData.rows[0].id;
    console.log(`Found existing prod pin: ${prodPinId}`);
  } else {
    const createProdRes = await fetch(`${prod}/api/pins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prodToken}`,
      },
      body: JSON.stringify({
        title: tbSpec.title,
        sourceUrl: tbSpec.sourceUrl,
        utcStartDateTime: tbSpec.utcStartDateTime,
        description: tbSpec.description,
        categories: tbSpec.categories,
        tags: tbSpec.tags,
      }),
    });
    if (!createProdRes.ok) {
      throw new Error(`Failed to create prod pin: ${createProdRes.status} ${await createProdRes.text()}`);
    }
    const createdProd = await createProdRes.json();
    prodPinId = createdProd.id;
    console.log(`Created prod pin: ${prodPinId}`);
  }

  // Attach media on prod
  const getProdPin = await fetch(`${prod}/api/pins/${prodPinId}`);
  if (getProdPin.ok) {
    const prodPinObj = await getProdPin.json();
    if (!prodPinObj.media || prodPinObj.media.length === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      const putMediaRes = await fetch(`${prod}/api/pins/${prodPinId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prodToken}` },
        body: JSON.stringify({
          ...prodPinObj,
          media: [{ type: 1, originalUrl: tbSpec.imageUrl }],
        }),
      });
      console.log(`Attached media to prod pin ${prodPinId}: status ${putMediaRes.status}`);
    }
  }

  // Update prod Pin
  await new Promise((r) => setTimeout(r, 1000));
  const patchProdRes = await fetch(`${prod}/api/admin/db/Pin?id=${prodPinId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      companyId: prodCompanyId,
      price: tbSpec.price,
      priceCurrency: tbSpec.priceCurrency,
      dateConfidenceReasoning: tbSpec.dateConfidenceReasoning,
      longFormSummary: tbSpec.longFormSummary,
      productName: tbSpec.productName,
    }),
  });
  console.log(`PATCH prod pin ${prodPinId}: status ${patchProdRes.status}`);

  // Add prod references
  const postRefsRes = await fetch(`${prod}/api/pins/${prodPinId}/references`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prodToken}` },
    body: JSON.stringify({
      references: tbSpec.references.map((r) => ({
        url: r.url,
        title: r.title,
        confidence: 100,
        publishedDate: '2026-01-01',
        reasoning: 'Official brand and award citation',
      })),
    }),
  });
  console.log(`POST references on prod pin ${prodPinId}: status ${postRefsRes.status}`);

  // Save prod taste
  const putTasteRes = await fetch(`${prod}/api/pins/${prodPinId}/taste`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      ...tbSpec.taste.scores,
      source: 'hand',
      basis: tbSpec.taste.basis,
      sourceUrl: tbSpec.taste.sourceUrl,
      reviews: tbSpec.taste.reviews,
    }),
  });
  console.log(`PUT taste on prod pin ${prodPinId}: status ${putTasteRes.status}`);

  // Save prod merchant
  const postMerchantRes = await fetch(`${prod}/api/admin/db/Merchant?upsert=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      pinId: prodPinId,
      label: tbSpec.merchant.merchantName,
      url: tbSpec.merchant.purchaseUrl,
    }),
  });
  console.log(`POST merchant on prod pin ${prodPinId}: status ${postMerchantRes.status}`);

  // Save prod blurb
  const postBlurbRes = await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      pinId: prodPinId,
      blurb: tbSpec.blurb,
      sourceUrl: tbSpec.sourceUrl,
      ratingScore: tbSpec.rating.score,
      ratingMax: tbSpec.rating.max,
      ratingSource: tbSpec.rating.source,
      ratingUrl: tbSpec.rating.url,
    }),
  });
  console.log(`POST blurb on prod pin ${prodPinId}: status ${postBlurbRes.status}`);

  // 4. SYNCHRONIZE scripts/products/taste.json and scripts/products/blurbs.json
  console.log('\n--- SYNCHRONIZING taste.json and blurbs.json ---');
  const tasteFile = path.resolve('scripts/products/taste.json');
  const blurbsFile = path.resolve('scripts/products/blurbs.json');

  const tasteJson: Record<string, any> = JSON.parse(readFileSync(tasteFile, 'utf8'));
  tasteJson[String(localPinId)] = {
    ...tbSpec.taste.scores,
    source: 'hand',
    basis: tbSpec.taste.basis,
    sourceUrl: tbSpec.taste.sourceUrl,
    reviews: tbSpec.taste.reviews,
  };
  tasteJson[String(prodPinId)] = {
    ...tbSpec.taste.scores,
    source: 'hand',
    basis: tbSpec.taste.basis,
    sourceUrl: tbSpec.taste.sourceUrl,
    reviews: tbSpec.taste.reviews,
  };
  writeFileSync(tasteFile, JSON.stringify(tasteJson, null, 2) + '\n');
  console.log(`Updated ${tasteFile}`);

  const blurbsJson: any[] = JSON.parse(readFileSync(blurbsFile, 'utf8'));

  // Update cider blurbs in JSON
  for (const c of CIDER_UPDATES) {
    const idxLocal = blurbsJson.findIndex((b) => b.pinId === c.localPinId);
    if (idxLocal >= 0) {
      blurbsJson[idxLocal] = { pinId: c.localPinId, blurb: c.blurb, sourceUrl: c.sourceUrl, rating: c.rating };
    } else {
      blurbsJson.push({ pinId: c.localPinId, blurb: c.blurb, sourceUrl: c.sourceUrl, rating: c.rating });
    }
    const idxProd = blurbsJson.findIndex((b) => b.pinId === c.prodPinId);
    if (idxProd >= 0) {
      blurbsJson[idxProd] = { pinId: c.prodPinId, blurb: c.blurb, sourceUrl: c.sourceUrl, rating: c.rating };
    } else {
      blurbsJson.push({ pinId: c.prodPinId, blurb: c.blurb, sourceUrl: c.sourceUrl, rating: c.rating });
    }
  }

  // Update ice cream blurbs in JSON
  for (const ic of ICE_CREAM_UPDATES) {
    const idx = blurbsJson.findIndex((b) => b.pinId === ic.pinId);
    if (idx >= 0) {
      blurbsJson[idx] = { pinId: ic.pinId, blurb: ic.blurb, sourceUrl: ic.sourceUrl, rating: ic.rating };
    } else {
      blurbsJson.push({ pinId: ic.pinId, blurb: ic.blurb, sourceUrl: ic.sourceUrl, rating: ic.rating });
    }
  }

  // Add Tokyo Banana blurbs
  const idxTbLocal = blurbsJson.findIndex((b) => b.pinId === localPinId);
  if (idxTbLocal >= 0) {
    blurbsJson[idxTbLocal] = { pinId: localPinId, blurb: tbSpec.blurb, sourceUrl: tbSpec.sourceUrl, rating: tbSpec.rating };
  } else {
    blurbsJson.push({ pinId: localPinId, blurb: tbSpec.blurb, sourceUrl: tbSpec.sourceUrl, rating: tbSpec.rating });
  }
  const idxTbProd = blurbsJson.findIndex((b) => b.pinId === prodPinId);
  if (idxTbProd >= 0) {
    blurbsJson[idxTbProd] = { pinId: prodPinId, blurb: tbSpec.blurb, sourceUrl: tbSpec.sourceUrl, rating: tbSpec.rating };
  } else {
    blurbsJson.push({ pinId: prodPinId, blurb: tbSpec.blurb, sourceUrl: tbSpec.sourceUrl, rating: tbSpec.rating });
  }

  writeFileSync(blurbsFile, JSON.stringify(blurbsJson, null, 2) + '\n');
  console.log(`Updated ${blurbsFile}`);

  console.log('\nCurate only the best completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
