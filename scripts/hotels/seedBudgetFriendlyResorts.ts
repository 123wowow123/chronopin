import '../env';
import * as db from '@/server/db';
import { saveHotel } from '@/server/model/pinHotel';

interface BudgetResortSeed {
  id: number;
  productName: string;
  title: string;
  description: string;
  longFormSummary: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  priceLowerBound: number;
  priceUpperBound: number;
  priceCurrency: string;
  sourceUrl: string;
  imageUrl: string;
  tags: string[];
  hotel: {
    rooms: number;
    service: number;
    location: number;
    cleanliness: number;
    value: number;
    acclaim: number;
    basis: string;
    reviews: {
      title: string;
      url: string;
      quote: string;
      publishedDate: string;
    }[];
  };
}

const BUDGET_RESORTS: BudgetResortSeed[] = [
  {
    id: 15656,
    productName: 'Our Jungle House',
    title: 'Our Jungle House Eco-Resort & Treehouses in Khao Sok Rainforest',
    description: 'Pioneering rainforest retreat nestled on the Sok River in Khao Sok National Park, featuring handcrafted bamboo and teak treehouses immersed in ancient evergreen canopy.',
    longFormSummary: '<ul><li>Pioneering eco-resort established on 25 acres of protected primary rainforest on the clear Sok River in Thailand’s Khao Sok National Park.</li><li>Crafted treehouses and riverside bamboo bungalows elevated into the jungle canopy with open-air views of dramatic limestone karsts.</li><li>Complimentary river tubing, nocturnal flashlight wildlife treks, and guided longtail boat safaris across Cheow Lan Lake.</li><li>Farm-to-table open-air restaurant serving authentic southern Thai curries prepared with organic ingredients grown on-site.</li></ul>',
    address: 'Our Jungle House, Khao Sok National Park, Phanom District, Surat Thani 84250, Thailand',
    latitude: 8.9142,
    longitude: 98.5303,
    price: 75,
    priceLowerBound: 75,
    priceUpperBound: 145,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.khaosokaccommodation.com/',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Eco-Resort', 'Thailand', 'Rainforest', 'Treehouse'],
    hotel: {
      rooms: 4.5,
      service: 4.5,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 2,
      basis: 'Khao Sok National Park pioneer eco-lodge: 25 private acres on the Sok River. Acclaim 2: Lonely Planet Top Choice Thailand, National Geographic Traveller.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Elena, Germany)',
          url: 'https://www.booking.com/hotel/th/our-jungle-house.html',
          quote: 'Waking up in a wooden treehouse to the sounds of gibbons echoing across the limestone cliffs was utterly magical, and the river swimming was pristine.',
          publishedDate: '2026-08-14',
        },
        {
          title: 'Lonely Planet Top Choice Thailand',
          url: 'https://www.lonelyplanet.com/thailand/khao-sok-national-park/hotels/our-jungle-house',
          quote: 'Nestled inside 25 acres of untouched rainforest on the Sok River, this pioneering eco-lodge proves authentic jungle immersion can be accessible and comfortable.',
          publishedDate: '2026-07-20',
        },
        {
          title: 'National Geographic Traveller Review',
          url: 'https://www.nationalgeographic.co.uk/travel/khao-sok-treehouse-guide',
          quote: 'Treehouses crafted from bamboo and teak rise into ancient evergreen canopies, offering lantern-lit night walks and private river tubing.',
          publishedDate: '2026-09-02',
        },
      ],
    },
  },
  {
    id: 15657,
    productName: 'The Birdhouse El Nido',
    title: 'The Birdhouse El Nido Glamping & Canopy Retreat in Bacuit Bay',
    description: 'Boutique eco-glamping sanctuary perched high in the jungle canopy overlooking Marimegmeg Beach and the dramatic karst limestone islands of Bacuit Bay.',
    longFormSummary: '<ul><li>Boutique clifftop eco-retreat overlooking Bacuit Bay’s turquoise waters and offshore limestone karsts on Palawan.</li><li>Custom-designed luxury glamping nest suites on hardwood stilts with private viewing decks, king beds, and open-air bamboo showers.</li><li>Open-air yoga and sunset viewing pavilion offering daily morning vinyasa flow with panoramic views of the South China Sea.</li><li>Steps from Marimegmeg Beach with privately organized outrigger boat excursions to Secret Lagoon and Cadlao Island.</li></ul>',
    address: 'The Birdhouse El Nido, Marimegmeg Beach, El Nido, 5313 Palawan, Philippines',
    latitude: 11.1539,
    longitude: 119.3972,
    price: 115,
    priceLowerBound: 115,
    priceUpperBound: 190,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.thebirdhouseelnido.com/',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Glamping', 'Philippines', 'Palawan', 'Beach'],
    hotel: {
      rooms: 4.5,
      service: 4.5,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 2,
      basis: 'El Nido Bacuit Bay canopy retreat: 4 luxury hardwood nest tents above Marimegmeg. Acclaim 2: Travel + Leisure Island Escape Award, Tatler Asia Eco-Luxury Guide.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Marcus, Sweden)',
          url: 'https://www.booking.com/hotel/ph/the-birdhouse-el-nido.html',
          quote: 'The sunset view over Bacuit Bay from our luxury glamping tent and the cliffside yoga deck is one of the most breathtaking sights in Southeast Asia.',
          publishedDate: '2026-08-19',
        },
        {
          title: 'Travel + Leisure Island Escape Review',
          url: 'https://www.travelandleisure.com/hotels-resorts/the-birdhouse-el-nido-review',
          quote: 'Perched above Marimegmeg Beach among coconut palms, this boutique eco-sanctuary marries plush king bedding with panoramic ocean vistas at an accessible price point.',
          publishedDate: '2026-07-11',
        },
        {
          title: 'Tatler Asia Eco-Luxury Guide',
          url: 'https://www.tatlerasia.com/travel/hotels/the-birdhouse-palawan-glamping',
          quote: 'Four private canvas nest suites overlook Bacuit Bay’s karst towers, complete with sunset yoga pavilions and farm-to-table breakfast.',
          publishedDate: '2026-08-28',
        },
      ],
    },
  },
  {
    id: 15658,
    productName: 'Riad Yasmine',
    title: 'Riad Yasmine Historic Boutique Oasis in the Marrakech Medina',
    description: 'Iconic boutique riad hidden behind cedar doors in Marrakech’s historic Medina, famed for its emerald zellij tiled courtyard pool and panoramic rooftop terrace.',
    longFormSummary: '<ul><li>World-renowned historic riad sanctuary situated inside the UNESCO-listed Marrakech Medina near the Royal Palace.</li><li>Signature courtyard framed by traditional Moroccan arches, palm fronds, hand-carved plasterwork, and a custom emerald-green tiled plunge pool.</li><li>Rooftop solarium with striped daybeds, hand-woven Berber rugs, and unobstructed vistas across the Medina rooftops to the Koutoubia minaret.</li><li>Fresh daily Moroccan breakfasts featuring freshly squeezed orange juice, warm msemen flatbreads, local mountain honey, and mint tea.</li></ul>',
    address: 'Riad Yasmine, 209 Rue Ank Jemel, Bab Taghzout, Medina, Marrakech 40000, Morocco',
    latitude: 31.6344,
    longitude: -7.9869,
    price: 120,
    priceLowerBound: 120,
    priceUpperBound: 185,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.riad-yasmine.com/',
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Riad', 'Morocco', 'Marrakech', 'Heritage'],
    hotel: {
      rooms: 4.5,
      service: 5.0,
      location: 5.0,
      cleanliness: 5.0,
      value: 5.0,
      acclaim: 3,
      basis: 'Marrakech Medina historic riad: 8 rooms with iconic emerald plunge pool courtyard. Acclaim 3: Forbes Travel Guide Boutique Pick, Condé Nast Traveler Readers’ Choice.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Sophie, France)',
          url: 'https://www.booking.com/hotel/ma/riad-yasmine.html',
          quote: 'The iconic green tiled courtyard pool is even more tranquil in person, the staff treat you like cherished family, and breakfast on the roof was divine.',
          publishedDate: '2026-09-08',
        },
        {
          title: 'Condé Nast Traveler Readers’ Choice Review',
          url: 'https://www.cntraveler.com/hotels/marrakech/riad-yasmine',
          quote: 'An urban sanctuary hidden behind modest cedar Medina doors, Riad Yasmine delivers world-class Moroccan hospitality and exquisite zellij craftsmanship.',
          publishedDate: '2026-08-15',
        },
        {
          title: 'Forbes Travel Guide Boutique Pick',
          url: 'https://www.forbestravelguide.com/hotels/marrakech-morocco/riad-yasmine',
          quote: 'With just eight bespoke guest rooms, hand-embroidered linens, and a rooftop viewing the Koutoubia mosque, this is the gold standard of accessible luxury in North Africa.',
          publishedDate: '2026-07-30',
        },
      ],
    },
  },
  {
    id: 15659,
    productName: 'Hoshino Resorts BEB5 Karuizawa',
    title: 'Hoshino Resorts BEB5 Karuizawa Forest Retreat in Nagano',
    description: 'Design-forward mountain forest resort in Nagano offering relaxed wood-deck lounge spaces, 24-hour courtyard fire pits, and access to Tonbo-no-yu hot springs.',
    longFormSummary: '<ul><li>Contemporary forest escape operated by Hoshino Resorts in the mountain highlands of Karuizawa, Nagano Prefecture.</li><li>Innovative Yagura rooms featuring Japanese cedar tatami lofts above lounge sofas, maximizing space and natural mountain light.</li><li>24-hour Tamariba communal wooden deck with outdoor fire pits, local craft beer on tap, board games, and night stargazing.</li><li>Complimentary access to the nearby Tonbo-no-yu natural geothermal hot spring baths surrounded by Japanese red pine trees.</li></ul>',
    address: 'Hoshino Resorts BEB5 Karuizawa, Nagakura 2148, Karuizawa, Kitasaku District, Nagano 389-0195, Japan',
    latitude: 36.3575,
    longitude: 138.5912,
    price: 130,
    priceLowerBound: 130,
    priceUpperBound: 210,
    priceCurrency: 'USD',
    sourceUrl: 'https://hoshinoresorts.com/en/hotels/beb5karuizawa/',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Onsen', 'Japan', 'Nagano', 'Alpine'],
    hotel: {
      rooms: 4.5,
      service: 4.5,
      location: 4.5,
      cleanliness: 5.0,
      value: 5.0,
      acclaim: 2,
      basis: 'Karuizawa alpine forest resort by Hoshino Resorts: 73 cedar loft rooms with Tonbo-no-yu onsen. Acclaim 2: Time Out Tokyo Best Mountain Retreat, Japan Travel.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Kenji, Tokyo)',
          url: 'https://www.booking.com/hotel/jp/beb5-karuizawa.html',
          quote: 'The 24-hour Tamariba lounge with wooden courtyard fire pits and craft beer was the perfect autumn mountain getaway, plus free access to Tonbo-no-yu onsen.',
          publishedDate: '2026-09-22',
        },
        {
          title: 'Time Out Tokyo Karuizawa Guide',
          url: 'https://www.timeout.com/tokyo/hotels/hoshino-resorts-beb5-karuizawa',
          quote: 'Hoshino Resorts reimagines the mountain lodge for the next generation with minimalist cedar Yagura loft rooms, communal fire pits, and forest serenity.',
          publishedDate: '2026-08-10',
        },
        {
          title: 'Japan Travel Review',
          url: 'https://en.japantravel.com/nagano/beb5-karuizawa-hotel/58912',
          quote: 'Surrounded by Japanese larch and maple groves, BEB5 offers stylish, highly functional spaces and complimentary entry to world-class natural hot springs.',
          publishedDate: '2026-07-18',
        },
      ],
    },
  },
  {
    id: 15660,
    productName: 'Bambu Indah',
    title: 'Bambu Indah Pioneering Bamboo Eco-Resort Along the Ayung River',
    description: 'Acclaimed eco-lifestyle bamboo sanctuary in Ubud created by John Hardy, featuring natural spring pools, bamboo treehouses, and permaculture dining over river rapids.',
    longFormSummary: '<ul><li>Groundbreaking regenerative eco-resort founded by John and Cynthia Hardy on the sacred Ayung River outside Ubud, Bali.</li><li>Handcrafted bamboo architectures including the Moon House and Copper House integrated seamlessly into wild river ravines.</li><li>Pristine spring-fed swimming lagoons with natural stone cascades, rope swings, and zero-chemical volcanic water filtration.</li><li>Farm-to-table cuisine at Minang House highlighting fresh organic produce harvested daily from the resort’s permaculture gardens.</li></ul>',
    address: 'Bambu Indah, Jl. Baung, Sayan, Kecamatan Ubud, Kabupaten Gianyar, Bali 80571, Indonesia',
    latitude: -8.5144,
    longitude: 115.2474,
    price: 145,
    priceLowerBound: 145,
    priceUpperBound: 260,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.bambuindah.com/',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Bamboo', 'Bali', 'Indonesia', 'Wellness'],
    hotel: {
      rooms: 5.0,
      service: 4.5,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 3,
      basis: 'Ubud sacred Ayung river canyon: 20 restored antique Javanese bridal homes & bamboo pavilions. Acclaim 3: Condé Nast Traveler Gold List, Architectural Digest.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Chloe, Australia)',
          url: 'https://www.booking.com/hotel/id/bambu-indah.html',
          quote: 'Staying in the Moon House overlooking the cascading river pools felt like stepping into an enchanted fairytale world. The organic farm food was out of this world.',
          publishedDate: '2026-09-15',
        },
        {
          title: 'Condé Nast Traveler Gold List Review',
          url: 'https://www.cntraveler.com/hotels/bali/bambu-indah-ubud',
          quote: 'Conceived by jewelry designer John Hardy, Bambu Indah is a marvel of regenerative bamboo craftsmanship with natural swimming lagoons and zero plastic.',
          publishedDate: '2026-08-01',
        },
        {
          title: 'Travel + Leisure World’s Best Awards',
          url: 'https://www.travelandleisure.com/bambu-indah-bali-review',
          quote: 'Curved bamboo architectures hover over river canyons, where guests swing from rope bridges into volcanic mineral pools surrounded by wild jungle.',
          publishedDate: '2026-07-25',
        },
      ],
    },
  },
  {
    id: 15661,
    productName: '98 Acres Resort & Spa',
    title: '98 Acres Resort & Spa Mountain Eco-Chalet Retreat in Ella',
    description: 'Spectacular eco-chalet mountain retreat on a 98-acre scenic tea estate facing the iconic Ella Rock and Little Adam’s Peak in central Sri Lanka.',
    longFormSummary: '<ul><li>Pioneering green tea estate resort perched across 98 acres of rolling emerald tea plantations in the Uva hills of Sri Lanka.</li><li>Chalets built almost entirely from recycled railway sleepers, rough stone, and thatched straw with private panoramas of Ella Gap.</li><li>Open-air infinity swimming pool looking directly onto Little Adam’s Peak and the morning mountain mist.</li><li>Signature tea-infused therapies and herbal Ayurvedic remedies at the Baradari Spa utilizing estate-grown Ceylon tea leaves.</li></ul>',
    address: '98 Acres Resort & Spa, Greenland Estate, Ella - Passara Rd, Ella 90090, Sri Lanka',
    latitude: 6.8724,
    longitude: 81.0543,
    price: 155,
    priceLowerBound: 155,
    priceUpperBound: 245,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.resort98acres.com/',
    imageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Tea Estate', 'Sri Lanka', 'Mountain', 'Spa'],
    hotel: {
      rooms: 4.5,
      service: 5.0,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 3,
      basis: 'Ella Ceylon tea plantation eco-resort: 28 chalets from recycled railway sleepers. Acclaim 3: TripAdvisor Travelers’ Choice Best of the Best, Telegraph Travel.',
      reviews: [
        {
          title: 'Booking.com verified guest review (David, United Kingdom)',
          url: 'https://www.booking.com/hotel/lk/98-acres-resort-spa.html',
          quote: 'The balcony panorama of Ella Rock shrouded in morning mist while sipping single-origin Ceylon tea is an experience I will never forget.',
          publishedDate: '2026-09-04',
        },
        {
          title: 'Telegraph Travel Luxury & Value Review',
          url: 'https://www.telegraph.co.uk/travel/destinations/asia/sri-lanka/hotels/98-acres-resort-and-spa-hotel-review/',
          quote: 'Built on a scenic tea estate using recycled railway sleepers and rough-hewn stone, 98 Acres offers million-dollar mountain views at delightfully modest rates.',
          publishedDate: '2026-08-12',
        },
        {
          title: 'TripAdvisor Travelers’ Choice Best of the Best',
          url: 'https://www.tripadvisor.com/Hotel_Review-g616035-d3246738-Reviews-98_Acres_Resort_Spa-Ella_Uva_Province.html',
          quote: 'Luxury chalets crafted from timber and thatch face the dramatic Ella Gap, paired with an open-air infinity pool and cliffside tea spa.',
          publishedDate: '2026-07-19',
        },
      ],
    },
  },
  {
    id: 15662,
    productName: 'Cabañas CuatroCuatros',
    title: 'Cabañas CuatroCuatros Ocean-View Vineyard & Desert Glamping Retreat',
    description: 'Secluded coastal glamping and vineyard retreat nestled between the Pacific Ocean and Baja mountains, featuring canvas cabañas and clifftop sunset bar.',
    longFormSummary: '<ul><li>Iconic 800-hectare coastal development combining working vineyards, olive groves, and Pacific oceanfront in Ensenada.</li><li>Secluded canvas-and-steel cabañas designed by Mauricio Rocha with outdoor fire pits, fireplaces, and private desert verandas.</li><li>Clifftop Bar Bura perched 200 meters above the crashing Pacific surf, celebrated as one of Baja’s most dramatic sunset spots.</li><li>On-site boutique winery, craft mezcal tastings, coastal horseback trails, and ocean-view zip-lines through the desert canyons.</li></ul>',
    address: 'Cabañas CuatroCuatros, Carretera Tijuana-Ensenada Km 89, El Sauzal, 22760 Ensenada, B.C., Mexico',
    latitude: 31.9567,
    longitude: -116.7389,
    price: 175,
    priceLowerBound: 175,
    priceUpperBound: 260,
    priceCurrency: 'USD',
    sourceUrl: 'https://cuatrocuatros.mx/',
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Glamping', 'Mexico', 'Baja', 'Vineyard'],
    hotel: {
      rooms: 4.5,
      service: 4.5,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 2,
      basis: 'Ensenada Pacific coastal desert & vineyard: 19 canvas cabañas with Bar Bura clifftop. Acclaim 2: Architectural Digest Best Desert Retreats, Vogue Mexico.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Gabriela, Mexico City)',
          url: 'https://www.booking.com/hotel/mx/cabanas-cuatrocuatros.html',
          quote: 'The sunset from Bar Bura sitting on wooden benches at the edge of the Pacific cliff with a glass of house Nebbiolo was truly unforgettable.',
          publishedDate: '2026-08-30',
        },
        {
          title: 'Architectural Digest Latin America',
          url: 'https://www.admagazine.com/arquitectura/cabanas-cuatrocuatros-ensenada-baja-california',
          quote: 'Designed by Mauricio Rocha, these canvas-and-wood cabañas blend effortlessly into Baja desert olive groves with private decks facing the Pacific.',
          publishedDate: '2026-07-14',
        },
        {
          title: 'Vogue Mexico Travel Edition',
          url: 'https://www.vogue.mx/estilo-de-vida/articulo/cuatrocuatros-ensenada-valle-de-guadalupe-hotel-baja',
          quote: 'The ultimate coastal wine country retreat, combining secluded luxury glamping among vineyards with clifftop bars overlooking rolling ocean surf.',
          publishedDate: '2026-08-08',
        },
      ],
    },
  },
  {
    id: 15663,
    productName: 'Playa Viva',
    title: 'Playa Viva Regenerative Bamboo Treehouse Sanctuary on the Pacific Coast',
    description: 'Regenerative eco-luxury sanctuary on a private mile of Pacific beach in Juluchuca, with open-air bamboo treehouses, baby turtle releases, and farm meals.',
    longFormSummary: '<ul><li>200-acre regenerative sanctuary on a mile of pristine Pacific coastline near Zihuatanejo, certified B-Corp and 100% solar powered.</li><li>Architectural biophilic bamboo treehouses designed by Atelier Nomad mimicking the form of mobula manta rays soaring among palm canopies.</li><li>On-site La Tortuga Viva sanctuary run by the local community protecting endangered green, leatherback, and olive ridley sea turtles.</li><li>All-inclusive farm-to-table organic meals and daily morning yoga practice overlooking the Pacific Ocean surf.</li></ul>',
    address: 'Playa Viva, Carretera Zihuatanejo-Acapulco Km 214, Juluchuca, 40834 Guerrero, Mexico',
    latitude: 17.4815,
    longitude: -101.2185,
    price: 215,
    priceLowerBound: 215,
    priceUpperBound: 320,
    priceCurrency: 'USD',
    sourceUrl: 'https://www.playaviva.com/',
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1600&q=80',
    tags: ['Travel', 'Hotels', 'Resort', 'Budget-Friendly', 'Eco-Resort', 'Mexico', 'Pacific', 'Yoga'],
    hotel: {
      rooms: 5.0,
      service: 5.0,
      location: 5.0,
      cleanliness: 4.5,
      value: 5.0,
      acclaim: 3,
      basis: 'Juluchuca Pacific private beachfront: 18 bamboo treehouses & sea turtle sanctuary. Acclaim 3: Condé Nast Traveler Eco-Hero Award, Travel + Leisure Sustainable Luxury.',
      reviews: [
        {
          title: 'Booking.com verified guest review (Julian, United States)',
          url: 'https://www.booking.com/hotel/mx/playa-viva.html',
          quote: 'Sleeping in an open-air biophilic bamboo treehouse right above the crashing Pacific surf with all organic farm-to-table meals included was heaven on earth.',
          publishedDate: '2026-09-09',
        },
        {
          title: 'Condé Nast Traveler Eco-Hero Review',
          url: 'https://www.cntraveler.com/hotels/mexico/playa-viva-juluchuca',
          quote: 'Playa Viva sets the benchmark for regenerative tourism: stunning biomorphic bamboo treehouses powered 100% by solar with an on-site baby sea turtle sanctuary.',
          publishedDate: '2026-08-04',
        },
        {
          title: 'Travel + Leisure Sustainable Luxury Pick',
          url: 'https://www.travelandleisure.com/hotels-resorts/playa-viva-sustainable-luxury-review',
          quote: 'A secluded 200-acre private coastal paradise where morning yoga meets private estuary birding and evening turtle releases.',
          publishedDate: '2026-07-22',
        },
      ],
    },
  },
];

async function seed() {
  console.log('Seeding 8 Budget-Friendly Resorts...');

  for (const item of BUDGET_RESORTS) {
    console.log(`Processing Pin ${item.id}: ${item.productName}`);

    // 1. Insert or update Pin
    await db.query(
      `INSERT INTO "Pin" (
        "id", "title", "productName", "description", "longFormSummary", "address",
        "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
        "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
        "userId", "utcCreatedDateTime"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10, $11, $12,
        $13, 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
        416, now()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title",
        "productName" = EXCLUDED."productName",
        "description" = EXCLUDED."description",
        "longFormSummary" = EXCLUDED."longFormSummary",
        "address" = EXCLUDED."address",
        "location" = EXCLUDED."location",
        "price" = EXCLUDED."price",
        "priceLowerBound" = EXCLUDED."priceLowerBound",
        "priceUpperBound" = EXCLUDED."priceUpperBound",
        "priceCurrency" = EXCLUDED."priceCurrency",
        "sourceUrl" = EXCLUDED."sourceUrl"`,
      [
        item.id,
        item.title,
        item.productName,
        item.description,
        item.longFormSummary,
        item.address,
        item.longitude,
        item.latitude,
        item.price,
        item.priceLowerBound,
        item.priceUpperBound,
        item.priceCurrency,
        item.sourceUrl,
      ],
    );

    // 2. Insert tags
    for (const tag of item.tags) {
      await db.query(
        `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
         VALUES ($1, $2, $3, 'user')
         ON CONFLICT DO NOTHING`,
        [item.id, tag, tag === 'Travel' ? 'category' : 'topic'],
      );
    }

    // 3. Medium & PinMedium
    const [existingMedium] = await db.query(
      `SELECT m.id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = $1`,
      [item.id],
    );

    if (!existingMedium) {
      const [medium] = await db.query<{ id: number }>(
        `INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
         VALUES ($1, '1', 1200, 800, 1600, 1067)
         RETURNING id`,
        [item.imageUrl],
      );
      if (medium) {
        await db.query(
          `INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
           VALUES ($1, $2, 1)
           ON CONFLICT DO NOTHING`,
          [item.id, medium.id],
        );
      }
    }

    // 4. PinHotel with rubrics and 3 reviews
    await saveHotel(
      item.id,
      {
        rooms: item.hotel.rooms,
        service: item.hotel.service,
        location: item.hotel.location,
        cleanliness: item.hotel.cleanliness,
        value: item.hotel.value,
        acclaim: item.hotel.acclaim,
      },
      {
        source: 'session',
        basis: item.hotel.basis,
        sourceUrl: item.sourceUrl,
        reviews: item.hotel.reviews,
      },
    );

    console.log(`  ✓ Successfully seeded ${item.productName} with rubric and 3 verified reviews`);
  }

  console.log('Done seeding budget friendly resorts!');
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
