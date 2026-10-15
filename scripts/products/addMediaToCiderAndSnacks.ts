// Script to attach verified photos to all 17 popular cider and Japan/Korea snack award pins,
// generating Azure thumbnails and card thumbnails so they display on the /products landing page.

import '../env';
import { SignJWT } from 'jose';
import { apiBase, prodBase } from '@/server/jobs/pinApi';
import { curatorId } from '@/server/jobs/curators';
import { signToken } from '@/server/auth';
import * as db from '@/server/db';

interface MediaSpec {
  localId: number;
  prodId: number;
  name: string;
  imageUrl: string;
}

const ITEMS: MediaSpec[] = [
  {
    localId: 15587,
    prodId: 15616,
    name: '2 Towns Ciderhouse 15th Anniversary Imperial Cider',
    imageUrl: 'https://images.untp.beer/crop?width=640&height=640&stripmeta=true&url=https://untappd.s3.amazonaws.com/photos/2026_09_16/209c7e1aae786cc8dfeb42c7554d239b_c_1601816219_raw.jpg',
  },
  {
    localId: 15588,
    prodId: 15617,
    name: 'Thatchers Cider Barn Grenadier',
    imageUrl: 'https://www.cookchick.com/images/uploads/main-images/chick_cook_cider_barn_range_press_03.jpg',
  },
  {
    localId: 15589,
    prodId: 15618,
    name: 'Thistly Cross Rum Cask Cider',
    imageUrl: 'https://www.thistlycrosscider.co.uk/cdn/shop/files/rum-edit.png',
  },
  {
    localId: 15590,
    prodId: 15619,
    name: 'Schilling Sip Society Heirloom Apple Cider',
    imageUrl: 'https://d1w7312wesee68.cloudfront.net/ZRV6sfvAKTque2BXiIbeu36cXyt-T3meL_U67Z2XECY/resize:fit:720:720/plain/s3://toasttab/restaurants/restaurant-57970000000000000/menu/items/7/item-100000005675812387_1599680315.jpg',
  },
  {
    localId: 15591,
    prodId: 15620,
    name: 'Snow Capped Herefordshire Redstreak Cider',
    imageUrl: 'https://snowcappedcider.com/wp-content/uploads/2024/08/Ashmeads-Kernal.png',
  },
  {
    localId: 15592,
    prodId: 15621,
    name: "Arsenal Cider House Alfred's Pear, Son! Perry",
    imageUrl: 'https://cityhive-production-cdn.cityhive.net/products/691180aa42fef13141715d0a/large.png',
  },
  {
    localId: 15593,
    prodId: 15622,
    name: 'Calbee Potato Chips Usushio',
    imageUrl: 'https://makeshop-multi-images.akamaized.net/mizota/itemimages/000000013644_h6XMMBl.jpg',
  },
  {
    localId: 15594,
    prodId: 15623,
    name: 'Kameda no Kaki no Tane',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/%E4%BA%80%E7%94%B0%E8%A3%BD%E8%8F%93_%E6%9F%BF%E3%81%AE%E7%A8%AE.png',
  },
  {
    localId: 15595,
    prodId: 15624,
    name: 'Calbee Jagarico Salad',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Calbee_Jagarico_Salad_in_cup.jpg',
  },
  {
    localId: 15596,
    prodId: 15625,
    name: 'Meiji Takenoko no Sato',
    imageUrl: 'https://www.meiji.co.jp/products/brand/global/choco/assets/img/products/kinotake/detail/img_0002.png',
  },
  {
    localId: 15597,
    prodId: 15626,
    name: 'Butter Butler Butter Financier',
    imageUrl: 'https://d2j6dbq0eux0bg.cloudfront.net/images/7759078/1138760195.jpg',
  },
  {
    localId: 15598,
    prodId: 15627,
    name: 'Ishiya Shiroi Koibito',
    imageUrl: 'https://shop.ishiya.co.jp/cdn/shop/files/6cap-ari_DSC4253_600x.jpg?v=1790845755',
  },
  {
    localId: 15599,
    prodId: 15628,
    name: 'Orion Turtle Chips Corn Soup Flavor',
    imageUrl: 'https://hmartdelivery.com/cdn/shop/products/200-0001-1_700x700.jpg?v=1634839234',
  },
  {
    localId: 15600,
    prodId: 15629,
    name: 'Nongshim Saeukkang Shrimp Crackers',
    imageUrl: 'https://m.nongshimmall.com/web/product/big/202510/6c97b7e0a351917cdd8533e3d46e2494.jpg',
  },
  {
    localId: 15601,
    prodId: 15630,
    name: 'Haitai Honey Butter Chip',
    imageUrl: 'https://cdn-image.oliveyoung.com/prdtImg/1151/2860bfcb-3762-4a6c-af58-09a46b5654e4.png',
  },
  {
    localId: 15602,
    prodId: 15631,
    name: 'Orion Choco Pie',
    imageUrl: 'https://en.orionworld.ru/assets/images/product/chocopie/1chocopieoriginal.png',
  },
  {
    localId: 15603,
    prodId: 15632,
    name: 'Golden Piece Gaeseong Yakgwa',
    imageUrl: 'https://static.wixstatic.com/media/b6e5bf_0083e71f75294a5bb29bc732b300605af003.jpg',
  },
];

async function run() {
  const curator = await curatorId('@FoodDesk');
  if (!curator) throw new Error('No @FoodDesk user found');
  const localToken = await signToken(curator);

  const prod = prodBase();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;
  let prodToken: string | null = null;
  if (prod && prodSecret) {
    prodToken = await new SignJWT({ id: curator })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
  }

  console.log(`Attaching media for ${ITEMS.length} pins...`);

  for (const item of ITEMS) {
    console.log(`\n========================================`);
    console.log(`Processing media: ${item.name}`);

    // Update local pin
    try {
      const getLocal = await fetch(`${apiBase()}/api/pins/${item.localId}`);
      if (getLocal.ok) {
        const pin = await getLocal.json();
        const hasMedia = Array.isArray(pin.media) && pin.media.length > 0;
        if (!hasMedia) {
          const putRes = await fetch(`${apiBase()}/api/pins/${item.localId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localToken}` },
            body: JSON.stringify({
              ...pin,
              media: [{ type: 1, originalUrl: item.imageUrl }],
            }),
          });
          if (putRes.ok) {
            console.log(`Local pin ${item.localId} media attached: 200`);
          } else {
            console.warn(`Local pin ${item.localId} PUT failed: ${putRes.status} ${await putRes.text()}`);
          }
        } else {
          console.log(`Local pin ${item.localId} already has media (${pin.media.length})`);
        }
      }
    } catch (e: any) {
      console.warn(`Local update error for ${item.localId}:`, e.message);
    }

    // Update prod pin
    if (prod && prodToken) {
      try {
        const getProd = await fetch(`${prod}/api/pins/${item.prodId}`);
        if (getProd.ok) {
          const prodPin = await getProd.json();
          const hasMedia = Array.isArray(prodPin.media) && prodPin.media.length > 0;
          if (!hasMedia) {
            await new Promise((r) => setTimeout(r, 2000)); // Pace prod writes
            const putRes = await fetch(`${prod}/api/pins/${item.prodId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prodToken}` },
              body: JSON.stringify({
                ...prodPin,
                media: [{ type: 1, originalUrl: item.imageUrl }],
              }),
            });
            if (putRes.ok) {
              const updated = await putRes.json();
              console.log(`Prod pin ${item.prodId} media attached: 200 (thumb: ${updated.media?.[0]?.thumbName})`);
            } else {
              console.warn(`Prod pin ${item.prodId} PUT failed: ${putRes.status} ${await putRes.text()}`);
            }
          } else {
            console.log(`Prod pin ${item.prodId} already has media (${prodPin.media.length})`);
          }
        }
      } catch (e: any) {
        console.warn(`Prod update error for ${item.prodId}:`, e.message);
      }
    }
  }

  console.log('\nAll media updates completed.');
  await db.closeConnection();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

