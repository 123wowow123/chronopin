import '../env';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';
import { prodBase } from '@/server/jobs/pinApi';

async function main() {
  const prod = prodBase();
  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();

  // 1. Specialized pins that should NOT carry the generic 'Electronics' tag
  // because Electronics comes first in PRODUCT_SHELVES and starves Audio, Fashion, Watches, and Gaming.
  const SPECIALIZED = [
    { localId: 15643, prodId: 15782, shelf: 'Audio' },
    { localId: 15644, prodId: 15783, shelf: 'Audio' },
    { localId: 15645, prodId: 15784, shelf: 'Audio' },
    { localId: 15646, prodId: 15785, shelf: 'Audio' },
    { localId: 15651, prodId: 15790, shelf: 'Gaming' },
    { localId: 15652, prodId: 15791, shelf: 'Watches' },
    { localId: 15653, prodId: 15792, shelf: 'Fashion' },
  ];

  console.log('--- REMOVING GENERIC Electronics TAG FROM SPECIALIZED PINS ---');
  for (const item of SPECIALIZED) {
    // Local
    await db.query(`DELETE FROM "PinTag" WHERE "pinId" = $1 AND name = 'Electronics'`, [item.localId]);
    console.log(`Removed local Electronics tag for pin ${item.localId} (${item.shelf})`);

    // Prod
    if (prod && adminToken) {
      const res = await fetch(`${prod}/api/admin/db/PinTag?pinId=${item.prodId}&name=Electronics`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Removed prod Electronics tag for pin ${item.prodId} (${item.shelf}): status ${res.status}`);
    }
  }

  // 2. Add 'Exceptional' tag to top-rated items (score >= 95% or Best of Innovation / Grand Prix)
  const EXCEPTIONAL_PINS = [
    // Audio / Tech (CES Best of Innovation)
    { localId: 15643, prodId: 15782, name: 'Samsung Galaxy Buds3 Pro' },
    { localId: 15644, prodId: 15783, name: 'Bose QuietComfort Ultra Earbuds' },
    { localId: 15645, prodId: 15784, name: 'Sony BRAVIA Theater Quad' },
    { localId: 15646, prodId: 15785, name: 'Tonies Toniebox 2' },
    { localId: 15647, prodId: 15786, name: 'Garmin inReach Messenger Plus' },
    { localId: 15648, prodId: 15787, name: 'ASUS ProArt P16' },
    { localId: 15649, prodId: 15788, name: 'Hisense 163MX Micro-LED Display' },
    { localId: 15650, prodId: 15789, name: 'WILLTEX WILLCOOK Wearable Microwave Bag' },
    { localId: 15651, prodId: 15790, name: 'MSI GeForce RTX 5080 16G EXPERT' },
    { localId: 15652, prodId: 15791, name: 'Samsung Galaxy Ring' },
    { localId: 15653, prodId: 15792, name: 'Hypershell Carbon X Mountain Exoskeleton' },
    // Snacks (SIAL Grand Prix & Grand Gold)
    { localId: 15654, prodId: 15793, name: 'snEco Crunchy Dried Cheese Gouda Bites' },
    { localId: 15655, prodId: 15794, name: 'Sabarot Préparation pour Galettes Végétales' },
    { localId: 15642, prodId: 15779, name: 'Tokyo Banana "Miitsuketa"' },
    { localId: 15603, prodId: 15603, name: 'Golden Piece Gaeseong Yakgwa' },
    { localId: 15597, prodId: 15597, name: 'Butter Butler Butter Financier' },
    { localId: 15593, prodId: 15593, name: 'Calbee Potato Chips Usushio' },
    // Ciders (GLINTCAP / CGA / ICC Double Gold / Best in Class)
    { localId: 15634, prodId: 15762, name: 'Eden Specialty Ciders Heirloom Ice Cider' },
    { localId: 15635, prodId: 15764, name: 'Domaine Dupont Cidre Bouché Brut' },
    { localId: 15636, prodId: 15765, name: 'Sidra Trabanco Cosecha Propia' },
    { localId: 15637, prodId: 15767, name: 'Eric Bordelet Sydre Argelette Grand Cru' },
    { localId: 15638, prodId: 15769, name: 'Dragon\'s Head Kingston Black' },
    { localId: 15641, prodId: 15773, name: 'Aspall Premier Cru Suffolk Cyder' },
    { localId: 15587, prodId: 15616, name: '2 Towns Ciderhouse 15th Anniversary Imperial' },
    // Ice Cream (Dairy Foods Product of the Year / World Dairy Expo Champion)
    { localId: 13910, prodId: 13910, name: 'Graeter\'s Bourbon Cherry Ice Cream' },
    { localId: 13990, prodId: 13990, name: 'Chocolate Shoppe Yippee Skippee Ice Cream' },
    { localId: 13934, prodId: 13934, name: 'Lick Gelato Billionaire\'s Gelato in a Can' },
    { localId: 13930, prodId: 13930, name: 'Ricotta, Pistachio & Sour Cherry Gelato' },
  ];

  console.log('\n--- ADDING Exceptional TAG TO QUALIFYING PINS ---');
  for (const p of EXCEPTIONAL_PINS) {
    // Local
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       VALUES ($1, 'Exceptional', 'topic', 'user')
       ON CONFLICT DO NOTHING`,
      [p.localId],
    );
    console.log(`Tagged local pin ${p.localId} as Exceptional (${p.name})`);

    // Prod
    if (prod && adminToken && p.prodId) {
      const res = await fetch(`${prod}/api/admin/db/PinTag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          pinId: p.prodId,
          name: 'Exceptional',
          kind: 'topic',
          source: 'user',
        }),
      });
      console.log(`Tagged prod pin ${p.prodId} as Exceptional: status ${res.status}`);
    }
  }

  console.log('\nDistribution and Exceptional tagging complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
