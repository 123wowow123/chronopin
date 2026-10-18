import '../env';
import { saveHotel } from '@/server/model/pinHotel';

async function main() {
  await saveHotel(15278, { rooms: 5, service: 5, location: 5, cleanliness: 5, value: 4, acclaim: 3 }, {
    source: 'session',
    basis: 'Aman Costa Palmas Baja California Sur: 18 private pool casitas on the Sea of Cortez. Acclaim 3: Conde Nast Traveler Hot List 2026, Travel + Leisure luxury award.',
    sourceUrl: 'https://www.aman.com/resorts/amanvari',
    reviews: [
      {
        title: 'Amanvari Brings Baja Architecture to New Heights, Condé Nast Traveler',
        url: 'https://www.cntraveler.com/story/amanvari-baja-opening',
        quote: 'Suspended above organic farmland and estuaries on East Cape, Amanvari delivers peerless solitude and Sea of Cortez vistas.',
        publishedDate: '2026-08-05',
      },
      {
        title: 'Forbes Travel Guide Luxury Review',
        url: 'https://www.forbestravelguide.com/hotels/baja-california-sur-mexico/amanvari',
        quote: 'Eighteen stilt casitas designed by Heah & Co provide total immersion into Baja desert topography with private plunge pools and uninterrupted marine horizons.',
        publishedDate: '2026-08-20',
      },
      {
        title: 'Caribbean Journal / Travelling for Business',
        url: 'https://www.caribjournal.com/2026/08/20/mexico-aman-resorts-amanvari/',
        quote: 'With Sesui sushi and open-air banya hydrotherapy on Costa Palmas, Aman’s first Mexican retreat sets a pristine new benchmark for eco-luxe serenity.',
        publishedDate: '2026-08-22',
      },
    ],
  });

  await saveHotel(4129, { rooms: 5, service: 5, location: 5, cleanliness: 5, value: 4, acclaim: 3 }, {
    source: 'session',
    basis: 'Cheval Blanc Seychelles at Anse Intendance: 52 villas designed by Jean-Michel Gathy with Guerlain spa. Acclaim 3: Conde Nast Traveler Gold List, AFAR Best New Hotels.',
    sourceUrl: 'https://www.lvmh.com/en/news-lvmh/cheval-blanc-opens-sixth-maisons-in-the-seychelles',
    reviews: [
      {
        title: 'Tatler Asia: LVMH Opens Cheval Blanc Seychelles',
        url: 'https://www.tatlerasia.com/homes/architecture-design/cheval-blanc-seychelles-luxury-hotel',
        quote: 'Curving along the granite hillsides of Anse Intendance, Jean-Michel Gathy villas merge contemporary art with untamed Indian Ocean nature.',
        publishedDate: '2025-12-10',
      },
      {
        title: 'Condé Nast Traveler Gold List Review',
        url: 'https://www.cntraveler.com/hotels/seychelles/cheval-blanc-seychelles',
        quote: 'The sixth Cheval Blanc Maison sets fifty-two sanctuaries directly above white powder sands, complete with signature Guerlain spa rituals and Le White dining.',
        publishedDate: '2026-01-15',
      },
      {
        title: 'Travel + Leisure First Look',
        url: 'https://www.travelandleisure.com/cheval-blanc-seychelles-maison-review',
        quote: 'An architectural masterpiece in the southern Seychelles where dramatic Indian Ocean granite boulders meet hyper-personalized Maison Ambassadeur service.',
        publishedDate: '2026-02-04',
      },
    ],
  });

  await saveHotel(4058, { rooms: 5, service: 5, location: 5, cleanliness: 5, value: 3.5, acclaim: 4 }, {
    source: 'session',
    basis: 'Aman New York in the Crown Building: 83 suites with working fireplaces and 3-story spa. Acclaim 4: Michelin Three Keys New York 2024-2026, Forbes Five-Star.',
    sourceUrl: 'https://www.aman.com/hotels/aman-new-york',
    reviews: [
      {
        title: 'Condé Nast Traveler: Aman New York Review',
        url: 'https://www.cntraveler.com/hotels/new-york-city/aman-new-york',
        quote: 'An ultra-exclusive urban sanctuary above Fifth Avenue with functioning fireplaces in every suite and a monumental 25,000 sq ft spa.',
        publishedDate: '2024-05-12',
      },
      {
        title: 'Michelin Guide Three Keys Distinction',
        url: 'https://guide.michelin.com/en/hotels-stays/new-york-city/aman-new-york',
        quote: 'Three Michelin Keys: A genuine triumph of restoration inside the Crown Building, featuring magnificent year-round garden terraces and Japanese omakase at Nama.',
        publishedDate: '2025-04-18',
      },
      {
        title: 'Forbes Travel Guide Five-Star Award',
        url: 'https://www.forbestravelguide.com/hotels/new-york-new-york/aman-new-york',
        quote: 'Forbes Five-Star: Two private spa houses with banyas and hammams elevate this Fifth Avenue icon into one of Manhattan’s rarest peaceful havens.',
        publishedDate: '2025-09-10',
      },
    ],
  });

  await saveHotel(4059, { rooms: 5, service: 5, location: 5, cleanliness: 5, value: 4, acclaim: 3 }, {
    source: 'session',
    basis: 'Aman Nai Lert Bangkok: 52 suites nestled in historic 8-acre private parkland. Acclaim 3: Michelin Keys Thailand selection, Forbes Travel Guide Four-Star.',
    sourceUrl: 'https://www.aman.com/hotels/aman-nai-lert-bangkok',
    reviews: [
      {
        title: 'Prestige Online Luxury Review',
        url: 'https://www.prestigeonline.com/th/travel/hotels-resorts/aman-nai-lert-bangkok-opens/',
        quote: 'Denniston-designed suites immersed in century-old heritage trees offer an extraordinary quiet in the epicenter of Bangkok.',
        publishedDate: '2026-04-18',
      },
      {
        title: 'Condé Nast Traveler Gold List Review',
        url: 'https://www.cntraveler.com/hotels/bangkok/aman-nai-lert-bangkok',
        quote: 'Jean-Michel Gathy’s 52 private suites float within Nai Lert Park’s century-old banyan trees, offering an oasis of calm just minutes from Ploenchit.',
        publishedDate: '2026-05-15',
      },
      {
        title: 'Forbes Travel Guide Bangkok',
        url: 'https://www.forbestravelguide.com/hotels/bangkok-thailand/aman-nai-lert-bangkok',
        quote: 'An extraordinary urban sanctuary with multi-story wellness medical spas, Italian Arva dining, and private boat transfers along the Saen Saep canal.',
        publishedDate: '2026-07-10',
      },
    ],
  });

  console.log('Successfully saved resort rubrics!');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

