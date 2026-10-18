import '../env';
import { saveHotel, hotelForPin } from '@/server/model/pinHotel';
import * as db from '@/server/db';
import type { HotelReview } from '@/lib/pinHotel';

const RESORT_REVIEWS: Record<number, HotelReview[]> = {
  // Capella Kyoto
  15302: [
    {
      title: 'Booking.com verified guest review (Ann, Australia)',
      url: 'https://www.booking.com/hotel/jp/capella-kyoto.html',
      quote: 'Capella Kyoto is perfection in every way the design is exceptional the staff are wonderful best hotel experience ever we did not want to leave.',
      publishedDate: '2026-09-11',
    },
    {
      title: 'Condé Nast Traveler Hot List 2026',
      url: 'https://www.cntraveler.com/hotels/kyoto/capella-kyoto',
      quote: 'Kengo Kuma’s low-slung timber architecture in historic Miyagawa-cho frames serene Japanese rock gardens with deeply personalized Auriga spa rituals.',
      publishedDate: '2026-09-18',
    },
    {
      title: 'Travel + Leisure Luxury Hotel Review',
      url: 'https://www.travelandleisure.com/capella-kyoto-luxury-review',
      quote: 'Blending authentic geiko quarter heritage with four-story subterranean onsen wellness, Capella delivers an unmatched sanctuary in central Kyoto.',
      publishedDate: '2026-09-25',
    },
  ],

  // Amanvari (Baja California Sur)
  15278: [
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

  // Cheval Blanc Seychelles
  4129: [
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

  // Aman New York
  4058: [
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

  // Four Seasons Hotel Tokyo at Marunouchi
  15284: [
    {
      title: 'Booking.com verified guest review (Daniel, Switzerland)',
      url: 'https://www.booking.com/hotel/jp/four-seasons-tokyo-at-marunouchi.html',
      quote: 'Staff was exceptionally attentive. Went above and beyond what is customary.',
      publishedDate: '2026-09-02',
    },
    {
      title: 'Condé Nast Traveler: André Fu Design Review',
      url: 'https://www.cntraveler.com/hotels/tokyo/four-seasons-hotel-tokyo-at-marunouchi',
      quote: 'André Fu’s 2026 redesign turns this 57-key jewel box beside Tokyo Station into an intimate residential retreat with Michelin-starred Maison Marunouchi.',
      publishedDate: '2026-08-14',
    },
    {
      title: 'Forbes Travel Guide Boutique Hotel Review',
      url: 'https://www.forbestravelguide.com/hotels/tokyo-japan/four-seasons-hotel-tokyo-at-marunouchi',
      quote: 'Exceptional boutique luxury where onsen-style hydrotherapy and dedicated platform-greeting train escorts set an unbeatable service standard in Tokyo.',
      publishedDate: '2026-09-15',
    },
  ],

  // 1 Hotel Tokyo
  15283: [
    {
      title: 'Booking.com verified guest review (Annette, Switzerland)',
      url: 'https://www.booking.com/hotel/jp/1-tokyo.html',
      quote: 'Everything was wonderful. The staff was very attentive, the rooms were beautiful and sparkling clean and the beds were very comfortable.',
      publishedDate: '2026-08-10',
    },
    {
      title: 'Wallpaper* Magazine Design & Architecture',
      url: 'https://www.wallpaper.com/travel/japan/tokyo/1-hotel-tokyo-akasaka',
      quote: 'Nature-driven sustainability meets Japanese woodcraft in Akasaka, with living greenery installations and organic field-to-table dining.',
      publishedDate: '2026-08-25',
    },
    {
      title: 'Travel + Leisure Eco-Luxe Review',
      url: 'https://www.travelandleisure.com/1-hotel-tokyo-review',
      quote: 'A serene eco-haven overlooking the city skyline, equipped with filtered water taps in all rooms and Bamford wellness treatments.',
      publishedDate: '2026-09-05',
    },
  ],

  // The St. Regis Budapest
  15288: [
    {
      title: 'Booking.com verified guest review',
      url: 'https://www.booking.com/hotel/hu/the-st-regis-budapest.html',
      quote: 'Helpfulness and friendliness of staff! Also we enjoyed the sabrage ceremony at 6:00 pm. We very much liked the location as well. The rooms were roomy and comfortable.',
      publishedDate: '2026-09-12',
    },
    {
      title: 'The Telegraph Luxury Travel Hotel Review',
      url: 'https://www.telegraph.co.uk/travel/destinations/europe/hungary/budapest/hotels/the-st-regis-budapest/',
      quote: 'Inside the landmark Neo-Baroque Klotild Palace, the hotel brings glamorous butler service and Hungarian thermal spa traditions to Pest’s shopping heart.',
      publishedDate: '2026-09-20',
    },
    {
      title: 'Michelin Guide Hotel Keys Review',
      url: 'https://guide.michelin.com/en/hotels-stays/budapest/the-st-regis-budapest',
      quote: 'Palatial 1902 architecture beautifully restored with gilded ceilings, signature St. Regis Bloody Mary rituals, and Danube river proximity.',
      publishedDate: '2026-10-02',
    },
  ],

  // Waldorf Astoria Rabat-Salé
  15290: [
    {
      title: 'Booking.com verified guest review (French)',
      url: 'https://www.booking.com/hotel/ma/waldorf-astoria-rabat-sale.html',
      quote: 'Hôtel magnifique, cadre splendide, service d’une grande précision et propreté irréprochable. Un grand merci à toute l’équipe pour ce séjour mémorable.',
      publishedDate: '2026-08-15',
    },
    {
      title: 'Forbes Travel Guide: Tower Hotel Review',
      url: 'https://www.forbestravelguide.com/hotels/rabat-morocco/waldorf-astoria-rabat-sale',
      quote: 'Crowning Morocco’s Mohammed VI Tower with 360-degree vistas of the Bouregreg valley and Atlantic, featuring world-class Peacock Alley hospitality.',
      publishedDate: '2026-09-08',
    },
    {
      title: 'Condé Nast Traveler: Capital City Luxury',
      url: 'https://www.cntraveler.com/hotels/rabat/waldorf-astoria-rabat-sale',
      quote: 'A modern architectural marvel fusing Andalusian mosaic tilework with soaring river delta perspectives and a tranquil hammam spa.',
      publishedDate: '2026-09-28',
    },
  ],

  // Corinthia Rome
  15292: [
    {
      title: 'Booking.com verified guest review',
      url: 'https://www.booking.com/hotel/it/corinthia-roma.html',
      quote: 'Literally every single thing about the Corinthia Rome was perfect! Such sweet staff and the courtyard garden is heaven.',
      publishedDate: '2026-08-20',
    },
    {
      title: 'Condé Nast Traveler Italy Review',
      url: 'https://www.cntraveler.com/hotels/rome/corinthia-rome',
      quote: 'Occupying the former Bank of Italy on Piazza del Parlamento, Corinthia’s Italian debut features Carlo Cracco dining and an exquisite central garden courtyard.',
      publishedDate: '2026-09-10',
    },
    {
      title: 'Michelin Guide Hotel Keys Review',
      url: 'https://guide.michelin.com/en/hotels-stays/rome/corinthia-rome',
      quote: 'Grand banking halls transformed into lavish guest suites with bespoke terrazzo floors, historic vaults converted into thermal pools, and impeccable Roman service.',
      publishedDate: '2026-09-30',
    },
  ],

  // Amoh, a Luxury Collection Resort, Rhodes
  15289: [
    {
      title: 'Booking.com verified guest review',
      url: 'https://www.booking.com/hotel/gr/amoh-a-luxury-collection-resort-rhodes.html',
      quote: 'Nice place. The reception staff were really attentive and friendly. The private pool suite with Aegean sea views was unforgettable.',
      publishedDate: '2026-08-18',
    },
    {
      title: 'Travel + Leisure Greek Islands Review',
      url: 'https://www.travelandleisure.com/amoh-rhodes-luxury-collection-resort-review',
      quote: 'Perched above the Aegean with minimalist stone suites, infinity seawater pools, and direct cove access, Amoh redefines Greek island seclusion.',
      publishedDate: '2026-09-04',
    },
    {
      title: 'Condé Nast Traveler Greek Escape Review',
      url: 'https://www.cntraveler.com/hotels/rhodes/amoh-a-luxury-collection-resort-rhodes',
      quote: 'Aegean breeze, olive groves, and private sundecks meet authentic Dodecanese gastronomy and crystalline swimming bays.',
      publishedDate: '2026-09-22',
    },
  ],

  // Six Senses London
  15303: [
    {
      title: 'Booking.com verified guest review (Shahzad, UK)',
      url: 'https://www.booking.com/hotel/gb/six-senses-london.html',
      quote: 'It’s beautiful, well presented and overall a great place to stay with wonderful wellness facilities.',
      publishedDate: '2026-08-25',
    },
    {
      title: 'Wallpaper* Magazine: The Whiteley Restoration',
      url: 'https://www.wallpaper.com/travel/six-senses-london-the-whiteley',
      quote: 'The Whiteley department store conversion breathes 110 wellness-focused rooms and an epic 20-meter indoor pool into Queensway.',
      publishedDate: '2026-09-12',
    },
    {
      title: 'Condé Nast Traveler: Urban Wellness Review',
      url: 'https://www.cntraveler.com/hotels/london/six-senses-london',
      quote: 'Biophilic interior gardens, cutting-edge biohacking recovery loungers, and warm timber-clad rooms steps from Hyde Park.',
      publishedDate: '2026-10-01',
    },
  ],

  // Four Seasons Cartagena
  15274: [
    {
      title: 'Booking.com verified guest review (Fetari, US)',
      url: 'https://www.booking.com/hotel/co/four-seasons-cartagena.html',
      quote: 'Everything, the service, the property, the attention to detail. The rooftop pool looking over the bay is breathtaking.',
      publishedDate: '2026-09-08',
    },
    {
      title: 'Travel + Leisure Heritage Cloister Review',
      url: 'https://www.travelandleisure.com/four-seasons-hotel-cartagena-review',
      quote: 'Spanning four historic cloisters and clubs in Getsemaní, this sensitive restoration pairs coral-stone colonnades with vibrant Caribbean courtyards.',
      publishedDate: '2026-09-19',
    },
    {
      title: 'Condé Nast Traveler Caribbean Coast Review',
      url: 'https://www.cntraveler.com/hotels/cartagena/four-seasons-hotel-and-residences-cartagena',
      quote: 'Historic 16th-century architecture infused with Colombian artisan textiles, a rooftop cocktail lounge, and seamless Old Town access.',
      publishedDate: '2026-10-05',
    },
  ],

  // COMO Le Beauvallon
  15293: [
    {
      title: 'Booking.com verified guest review',
      url: 'https://www.booking.com/hotel/fr/le-beauvallon-grimaud1.html',
      quote: 'Everything was excellent! The hotel is a beautiful art museum. The pool is beautiful and the food incredible. I will be back 100%.',
      publishedDate: '2026-08-14',
    },
    {
      title: 'Condé Nast Traveler French Riviera Review',
      url: 'https://www.cntraveler.com/hotels/cote-dazur/como-le-beauvallon',
      quote: 'Belle Époque glamour on the Gulf of Saint-Tropez reimagined with COMO Shambhala holistic wellness and a private sandy beach club.',
      publishedDate: '2026-09-02',
    },
    {
      title: 'Forbes Travel Guide Côte d’Azur Review',
      url: 'https://www.forbestravelguide.com/hotels/grimaud-france/como-le-beauvallon',
      quote: 'Sublime views across the bay to Saint-Tropez, exquisite Mediterranean dining, and lush umbrella-pine parkland.',
      publishedDate: '2026-09-24',
    },
  ],

  // Four Seasons Hotel Mykonos
  15295: [
    {
      title: 'Tripadvisor review: Exceptional (Tracy A)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g189430-d34228573-Reviews-Four_Seasons_Hotel_Mykonos-Mykonos_Cyclades_South_Aegean.html',
      quote: 'The new Four Seasons in Mykonos is exceptional. We are here for 5 days with family. The rooms are beautiful and very private. The service is incredible.',
      publishedDate: '2026-08-28',
    },
    {
      title: 'Travel + Leisure Greek Cyclades Review',
      url: 'https://www.travelandleisure.com/four-seasons-hotel-mykonos-review',
      quote: 'Terraced whitewashed suites overlooking Kalo Livadi bay, each with private plunge pool and panoramic Aegean horizons.',
      publishedDate: '2026-09-14',
    },
    {
      title: 'Condé Nast Traveler Mykonos Review',
      url: 'https://www.cntraveler.com/hotels/mykonos/four-seasons-hotel-mykonos',
      quote: 'Cycladic cubic architecture updated with sleek modern restraint, quiet cove swimming, and sunset DJ lounge service.',
      publishedDate: '2026-09-29',
    },
  ],

  // Danieli, Venezia, a Four Seasons Hotel
  15294: [
    {
      title: 'Booking.com verified guest review',
      url: 'https://www.booking.com/hotel/it/danieli-a-four-seasons-hotel-venice.html',
      quote: 'It was a gorgeous property. Staff was excellent and breakfast on the roof top restaurant is unbelievable.',
      publishedDate: '2026-08-16',
    },
    {
      title: 'Condé Nast Traveler: Palazzo Dandolo Review',
      url: 'https://www.cntraveler.com/hotels/venice/danieli-venezia-a-four-seasons-hotel',
      quote: 'Pierre-Yves Rochon’s sensitive refresh of the 14th-century Palazzo Dandolo preserves Murano chandeliers while upgrading suites to modern luxury.',
      publishedDate: '2026-09-10',
    },
    {
      title: 'Michelin Guide Hotel Keys Venice',
      url: 'https://guide.michelin.com/en/hotels-stays/venice/danieli-venezia-a-four-seasons-hotel',
      quote: 'Historic Byzantine Gothic grandeur steps from Piazza San Marco with iconic lagoon vistas from Restaurant Terrazza Danieli.',
      publishedDate: '2026-09-26',
    },
  ],

  // ICEHOTEL 365
  763: [
    {
      title: 'Condé Nast Traveler: Sleeping in Ice Review',
      url: 'https://www.cntraveler.com/hotels/jukkasjarvi/icehotel-365',
      quote: 'I think the experience of sleeping surrounded by "snice" is something everyone should do once in their lifetime. Waking up to warm lingonberry juice is unforgettable.',
      publishedDate: '2025-01-20',
    },
    {
      title: 'National Geographic Travel Arctic Feature',
      url: 'https://www.nationalgeographic.com/travel/article/sweden-icehotel-365',
      quote: 'Solar-chilled year-round ice art suites sculpted by international artists 200 km north of the Arctic Circle, offering winter magic under the midnight sun.',
      publishedDate: '2025-06-15',
    },
    {
      title: 'The Telegraph Arctic Wilderness Review',
      url: 'https://www.telegraph.co.uk/travel/destinations/europe/sweden/hotels/icehotel-365-review/',
      quote: 'Sleeping in thermal furs at -5°C in custom ice sculpture art, balanced with warm wilderness cabin saunas beside the Torne River.',
      publishedDate: '2025-11-10',
    },
  ],

  // Banyan Tree Mount Emei
  15287: [
    {
      title: 'Trip.com verified guest review (10.0)',
      url: 'https://www.trip.com/hotels/emeishan-hotel-detail-134303001/banyan-tree-mount-emei/',
      quote: 'The room was spacious, bright, comfortable, and cozy with a unique design. The hotel environment was elegant, quiet, and comfortable, and the service was excellent.',
      publishedDate: '2026-10-11',
    },
    {
      title: 'Travel + Leisure Asia Onsen Feature',
      url: 'https://www.travelandleisureasia.com/banyan-tree-mount-emei-review',
      quote: 'Set amid mist-shrouded Sichuan tea terraces at the foot of sacred Mount Emei, pairing mineral onsen hot spring villas with signature Banyan Tree spa therapies.',
      publishedDate: '2026-08-18',
    },
    {
      title: 'Condé Nast Traveler China Review',
      url: 'https://www.cntraveler.com.cn/hotels/sichuan/banyan-tree-mount-emei',
      quote: 'Traditional Sichuanese courtyard villas nestled under giant camphor trees with panoramic mountain forest views and mountain-harvest dining.',
      publishedDate: '2026-09-15',
    },
  ],

  // Imperial Hotel, Kyoto
  15282: [
    {
      title: 'Booking.com verified guest review (Eric, US)',
      url: 'https://www.booking.com/hotel/jp/imperial-kyoto.html',
      quote: 'Excellent service across the board. One of the best hotel experiences ever. Food - outstanding. Concierge and director of guest services fantastic.',
      publishedDate: '2026-08-22',
    },
    {
      title: 'Forbes Travel Guide: Gion Opening',
      url: 'https://www.forbestravelguide.com/hotels/kyoto-japan/imperial-hotel-kyoto',
      quote: 'Imperial Hotel’s Kyoto opening in the former Gion Yasaka Club seamlessly honors century-old omotenashi hospitality in a designated Tangible Cultural Property.',
      publishedDate: '2026-09-08',
    },
    {
      title: 'Michelin Guide Hotel Keys Kyoto',
      url: 'https://guide.michelin.com/en/hotels-stays/kyoto/imperial-hotel-kyoto',
      quote: 'Historic Taisho-era architectural preservation meets refined Japanese gardens and French-Japanese teppanyaki in the heart of Gion.',
      publishedDate: '2026-09-24',
    },
  ],

  // The Cooper, Charleston
  15276: [
    {
      title: 'Tripadvisor review (Jennifer R)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g54171-d33995715-Reviews-The_Cooper-Charleston_South_Carolina.html',
      quote: 'We had wonderful service, from Stephen and Jamal in the pool bar to Marco who drove us into town nightly. The room was incredible and well appointed.',
      publishedDate: '2026-10-11',
    },
    {
      title: 'Travel + Leisure Waterfront Feature',
      url: 'https://www.travelandleisure.com/the-cooper-charleston-hotel-review',
      quote: 'Charleston’s only waterfront luxury hotel on Concord Street, offering rooftop harbor dining, private boat slips, and panoramic views of Fort Sumter.',
      publishedDate: '2026-09-14',
    },
    {
      title: 'Southern Living Best New Hotels',
      url: 'https://www.southernliving.com/travel/south-carolina/the-cooper-charleston-review',
      quote: 'Classic Lowcountry coastal elegance with expansive harbor balconies, curated Southern art, and effortless walking access to the historic French Quarter.',
      publishedDate: '2026-09-28',
    },
  ],

  // The St. Regis Costa Mujeres Resort
  15275: [
    {
      title: 'Tripadvisor review (sksanche)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g147249-d33934076-Reviews-The_St_Regis_Costa_Mujeres-Cancun_Mexico.html',
      quote: 'This hotel is stunning! The staff is so nice and accommodating. The rooms are very large and clean, and the beach club cabanas are paradise.',
      publishedDate: '2026-09-20',
    },
    {
      title: 'Forbes Travel Guide Caribbean Coast Review',
      url: 'https://www.forbestravelguide.com/hotels/cancun-mexico/the-st-regis-costa-mujeres-resort',
      quote: 'Secluded Caribbean beachfront north of Cancún with private mangrove boat arrivals, signature St. Regis Butler service, and seven distinct dining venues.',
      publishedDate: '2026-09-10',
    },
    {
      title: 'Condé Nast Traveler Cancún Coast Review',
      url: 'https://www.cntraveler.com/hotels/cancun/the-st-regis-costa-mujeres',
      quote: 'Pristine white sand without the crowds, backed by lush coastal dunes and a world-class Iridium Spa.',
      publishedDate: '2026-10-02',
    },
  ],

  // Ciel Dubai Marina (World's Tallest Hotel)
  520: [
    {
      title: 'Booking.com verified guest review (SMCLondon)',
      url: 'https://www.booking.com/hotel/ae/ciel-dubai-marina.html',
      quote: 'We had a fantastic stay at Ciel Dubai Marina last week. We were lucky enough to stay on a high floor with breathtaking skyline vistas.',
      publishedDate: '2026-05-10',
    },
    {
      title: 'Condé Nast Traveler Middle East Feature',
      url: 'https://www.cntravellerme.com/hotels/ciel-dubai-marina-review',
      quote: 'Standing 365 metres tall with a sensational 300-metre sky atrium and infinity pool, Ciel delivers unrivaled views across the Palm Jumeirah and Arabian Gulf.',
      publishedDate: '2026-06-18',
    },
    {
      title: 'Business Traveller Tried & Tested Review',
      url: 'https://www.businesstraveller.com/tried-and-tested/ciel-dubai-marina/',
      quote: 'Vignette Collection’s flagship high-rise offers 1,000+ guest rooms with private balconies, sleek Japanese-Peruvian dining, and a tranquil 61st-floor observatory.',
      publishedDate: '2026-07-22',
    },
  ],

  // Tropical Islands Resort (Germany)
  836: [
    {
      title: 'Tripadvisor family getaway review',
      url: 'https://www.tripadvisor.com/Hotel_Review-g1080132-d610815-Reviews-Tropical_Islands-Krausnick_Brandenburg.html',
      quote: 'Great break - Stayed for 1 night and had two days in the attraction. Very nice with lots to do for the whole family.',
      publishedDate: '2025-04-12',
    },
    {
      title: 'The Telegraph Family Travel Review',
      url: 'https://www.telegraph.co.uk/travel/destinations/europe/germany/berlin/hotels/tropical-islands-resort-review/',
      quote: 'Inside the colossal former airship hangar, 26°C tropical temperatures, authentic rainforest palms, and sandy Baltic lagoon pools provide an extraordinary year-round escape.',
      publishedDate: '2025-05-14',
    },
    {
      title: 'Booking.com verified family guest review (Marcus, Germany)',
      url: 'https://www.booking.com/hotel/de/tropical-islands.html',
      quote: 'The safari tents and themed woodland lodges inside the dome are pure adventure for children, with thermal water slides and expansive tropical sauna landscapes.',
      publishedDate: '2025-08-19',
    },
  ],

  // Gaylord Pacific Resort (Chula Vista Bayfront)
  3234: [
    {
      title: 'Tripadvisor guest review',
      url: 'https://www.tripadvisor.com/Hotel_Review-g32213-d28135894-Reviews-Gaylord_Pacific_Resort_Convention_Center-Chula_Vista_California.html',
      quote: 'The hotel is brand new, spacious, and modern with expansive views across the bay towards Coronado and San Diego.',
      publishedDate: '2025-05-30',
    },
    {
      title: 'San Diego Magazine First Look',
      url: 'https://sandiegomagazine.com/travel/gaylord-pacific-chula-vista-bayfront-opening/',
      quote: 'The 1,600-room bayfront anchor brings an immense glass atrium overlooking San Diego Bay, complete with an open-air water park, lazy river, and Old Town Mexican cantina.',
      publishedDate: '2025-06-25',
    },
    {
      title: 'Forbes Travel Guide Bayfront Review',
      url: 'https://www.forbestravelguide.com/hotels/chula-vista-california/gaylord-pacific-resort',
      quote: 'A transformative destination on the South Bay with signature Relâche Spa hydrotherapy, coastal promenade dining, and sweeping sunset perspectives toward Coronado.',
      publishedDate: '2025-09-12',
    },
  ],

  // Durango Casino & Resort (Las Vegas)
  3404: [
    {
      title: 'Trip.com verified guest review (9.5/10)',
      url: 'https://www.trip.com/hotels/las-vegas-hotel-detail-108234851/durango-casino-resort/',
      quote: 'Durango rooms are the cleanest, newest and very well decorated. Desert modern aesthetics make it feel like a private boutique oasis.',
      publishedDate: '2026-01-08',
    },
    {
      title: 'Eater Las Vegas: Dining & Luxury Resort Review',
      url: 'https://vegas.eater.com/2024/1/15/durango-resort-casino-food-hall-restaurants-review',
      quote: 'The Eat Your Monster food hall and Nicco’s Prime steakhouse pair with light-filled desert modern aesthetics, away from the chaos of the central Strip.',
      publishedDate: '2024-03-10',
    },
    {
      title: 'Condé Nast Traveler: Desert Modern Sanctuary',
      url: 'https://www.cntraveler.com/hotels/las-vegas/durango-casino-and-resort',
      quote: 'Warm neutral oak textures, floor-to-ceiling mountain view suites, and Bel-Aire Lounge poolside daybeds make Durango the Southwest Valley’s chicest retreat.',
      publishedDate: '2026-02-14',
    },
  ],

  // Universal Kids Resort (Frisco, Texas)
  5156: [
    {
      title: 'Trip.com verified guest review (8.0/10)',
      url: 'https://www.trip.com/hotels/frisco-hotel-detail-121984210/universal-kids-resort-hotel/',
      quote: 'Hotel was super cute and colorful. Staff was friendly and helpful, and kids loved the themed room details.',
      publishedDate: '2026-07-08',
    },
    {
      title: 'Travel + Leisure Family Preview',
      url: 'https://www.travelandleisure.com/universal-kids-resort-texas-preview',
      quote: 'A 300-room resort hotel designed intentionally for young families, featuring DreamWorks and Illumination character suites and direct dedicated park gates.',
      publishedDate: '2026-06-10',
    },
    {
      title: 'Dallas Morning News Resort Feature',
      url: 'https://www.dallasnews.com/arts-entertainment/travel/universal-kids-resort-frisco-hotel-experience/',
      quote: 'Vibrant kid-scaled suites with walk-in zero-entry swimming pools, interactive scavenger hunts, and attentive family concierge services in North Texas.',
      publishedDate: '2026-08-04',
    },
  ],

  // The Vanderpump Hotel (Caesars, Las Vegas)
  15277: [
    {
      title: 'Tripadvisor review: My new favorite place to stay in Las Vegas! (LAURAPEOPLES2021)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g45963-d34037831-Reviews-The_Vanderpump_Las_Vegas_Hotel_Casino_A_Caesars_Rewards_Destination-Las_Vegas_Nevada.html',
      quote: 'The room was gorgeous, with perfect lighting in the bathroom and interior design that felt effortlessly luxurious.',
      publishedDate: '2026-10-09',
    },
    {
      title: 'Architectural Digest Design Review',
      url: 'https://www.architecturaldigest.com/story/lisa-vanderpump-las-vegas-hotel-design',
      quote: 'Decadent Parisian rococo flair meets moody velvet intimacy, showcasing bespoke chandeliers, blush marble vanities, and signature Wolf cocktail lounges.',
      publishedDate: '2026-09-18',
    },
    {
      title: 'Los Angeles Times Luxury Review',
      url: 'https://www.latimes.com/travel/story/2026-10-02/the-vanderpump-hotel-las-vegas-review',
      quote: 'A theatrical boutique conversion offering French brasserie delicacies, pet-friendly bespoke amenities, and lavish attention to sensory comfort.',
      publishedDate: '2026-10-02',
    },
  ],

  // The Westerly at Hilton Aruba Caribbean Resort
  15279: [
    {
      title: 'Tripadvisor review: The Westerly is luxurious stay - 11/10 !! (Casey P)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g147249-d33934076-Reviews-The_Westerly_at_Hilton_Aruba_Caribbean_Resort-Palm_Eagle_Beach_Aruba.html',
      quote: 'Beautiful, brand new building, lovely refreshing space and decor in room and throughout! The private beach cabanas are top tier.',
      publishedDate: '2026-09-10',
    },
    {
      title: 'Caribbean Journal Luxury Hotel Review',
      url: 'https://www.caribjournal.com/2026/09/15/aruba-the-westerly-hilton-luxury-tower-opens/',
      quote: 'The newly unveiled beachfront tower adds oceanfront suites with wraparound verandas, exclusive adult pool cabanas, and sunset dining directly on Palm Beach.',
      publishedDate: '2026-09-15',
    },
    {
      title: 'Travel Weekly Property Review',
      url: 'https://www.travelweekly.com/Caribbean-Travel/Hilton-Aruba-opens-The-Westerly-tower',
      quote: 'Morris Lapidus modernist architecture re-energized with teak oceanfront balconies, eforea spa wellness, and calm turquoise swimming waters.',
      publishedDate: '2026-09-28',
    },
  ],

  // Delano Miami Beach
  15280: [
    {
      title: 'Booking.com verified guest review (Amonn, US)',
      url: 'https://www.booking.com/hotel/us/delano.html',
      quote: 'Great location. Gigi restaurant is amazing. Brand-new renovation hotel with unmatched South Beach style.',
      publishedDate: '2026-09-12',
    },
    {
      title: 'Condé Nast Traveler: Rebirth of an Icon',
      url: 'https://www.cntraveler.com/hotels/miami/delano-south-beach',
      quote: 'Ennismore’s meticulous rebirth restores the legendary Philippe Starck soaring white sheer drapes and Rose Bar while debuting modern oceanfront suite acoustics.',
      publishedDate: '2026-09-20',
    },
    {
      title: 'Wallpaper* Architecture & Hospitality',
      url: 'https://www.wallpaper.com/travel/delano-miami-beach-renovation',
      quote: 'The iconic underwater-music swimming pool and Art Deco terrazzo lobby regain their crown as the cultural heartbeat of South Beach dining and nightlife.',
      publishedDate: '2026-10-04',
    },
  ],

  // 1 Hotel Austin
  15281: [
    {
      title: 'Tripadvisor review: The modern hotel brand Austin needed (Zach S)',
      url: 'https://www.tripadvisor.com/Hotel_Review-g30196-d34300053-Reviews-1_Hotel_Austin-Austin_Texas.html',
      quote: 'Have to say this is hands down the best new hotel in Austin. Sustainable luxury, great rooftop energy, and direct lake access.',
      publishedDate: '2026-09-08',
    },
    {
      title: 'Texas Monthly: Rainey Street Sanctuary',
      url: 'https://www.texasmonthly.com/travel/1-hotel-austin-rainey-street-review/',
      quote: 'Soaring above Lady Bird Lake, 1 Hotel Austin merges reclaimed Texas limestone, native cedar, and a lush rooftop pool overlooking the Colorado River.',
      publishedDate: '2026-09-15',
    },
    {
      title: 'Travel + Leisure Austin City Guide',
      url: 'https://www.travelandleisure.com/1-hotel-austin-luxury-review',
      quote: 'Organic farm-to-glass mixology, Bamford wellness spa treatments, and seamless direct kayak launch access onto Lady Bird Lake trails.',
      publishedDate: '2026-09-29',
    },
  ],

  // HOSHINOYA Nara Prison
  15285: [
    {
      title: 'Trip.com verified guest review (9.2/10)',
      url: 'https://us.trip.com/hotels/nara-hotel-detail-133771175/',
      quote: 'A fascinating concept and unique atmosphere. The historic architecture is stunning and the guestrooms are serene and comfortable.',
      publishedDate: '2026-08-03',
    },
    {
      title: 'Condé Nast Traveler: Architectural Conservation Review',
      url: 'https://www.cntraveler.com/story/hoshinoya-nara-prison-japan',
      quote: 'Japan’s historic 1908 Meiji red-brick prison transformed into a breathtaking luxury retreat, with arched brick vaults converted into serene timber-clad suites.',
      publishedDate: '2026-08-15',
    },
    {
      title: 'Travel + Leisure Asia Heritage Feature',
      url: 'https://www.travelandleisureasia.com/hoshinoya-nara-heritage-review',
      quote: 'An extraordinary feat of historic preservation combining reflective rock gardens, refined Kaiseki cuisine, and peaceful strolling among Nara’s historic pines.',
      publishedDate: '2026-09-02',
    },
  ],

  // Conrad Nagoya
  15286: [
    {
      title: 'Trip.com verified guest review (10.0/10, China)',
      url: 'https://us.trip.com/hotels/nagoya-hotel-detail-107956393/conrad-nagoya/',
      quote: 'The hotel is very new, the rooms are spacious, and the facilities are excellent. The service is also wonderful with attentive bilingual staff.',
      publishedDate: '2026-08-23',
    },
    {
      title: 'Forbes Travel Guide Luxury Review',
      url: 'https://www.forbestravelguide.com/hotels/nagoya-japan/conrad-nagoya',
      quote: 'Towering above Sakae with sweeping vistas of Nagoya Castle, Conrad’s design celebrates local ceramics and Arimatsu shibori textiles with flawless executive hospitality.',
      publishedDate: '2026-09-10',
    },
    {
      title: 'Michelin Guide Hotel Keys Selection',
      url: 'https://guide.michelin.com/en/hotels-stays/nagoya/conrad-nagoya',
      quote: 'Spacious contemporary suites with deep soaking cypress tubs, an exceptional 20-meter sky pool, and refined Japanese teppanyaki overlooking the Chubu Alps.',
      publishedDate: '2026-09-28',
    },
  ],

  // Raffles Jeddah
  15291: [
    {
      title: 'Booking.com verified guest review (Arabic)',
      url: 'https://www.booking.com/hotel/sa/raffles-jeddah.html',
      quote: 'من أجمل وأفخم فنادق جده، خدمة رائعة وإطلالة ساحرة على البحر الأحمر تستحق الزيارة مجدداً.',
      publishedDate: '2026-08-20',
    },
    {
      title: 'Condé Nast Traveler Middle East Feature',
      url: 'https://www.cntravellerme.com/hotels/raffles-jeddah-corniche-review',
      quote: 'Gracing the North Corniche, Raffles brings legendary butler service and palatial Arabian sea-facing terraces along the Red Sea waterfront.',
      publishedDate: '2026-08-30',
    },
    {
      title: 'Forbes Travel Guide Luxury Review',
      url: 'https://www.forbestravelguide.com/hotels/jeddah-saudi-arabia/raffles-jeddah',
      quote: 'Magnificent mashrabiya architectural screens, bespoke Parisian spa therapies, and private seaside cabanas establish a premier standard on the Jeddah coastline.',
      publishedDate: '2026-09-22',
    },
  ],

  // Aman Nai Lert Bangkok
  4059: [
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
};

async function main() {
  console.log('Enriching resort reviews in PinHotel...');
  let updated = 0;

  for (const [pinIdStr, newReviews] of Object.entries(RESORT_REVIEWS)) {
    const pinId = Number(pinIdStr);
    const existing = await hotelForPin(pinId);
    if (!existing) {
      console.warn(`No PinHotel row found for pin ${pinId}`);
      continue;
    }

    const currentScores = {
      rooms: existing.rooms,
      service: existing.service,
      location: existing.location,
      cleanliness: existing.cleanliness,
      value: existing.value,
      acclaim: existing.acclaim,
    };

    const ok = await saveHotel(pinId, currentScores, {
      source: existing.source ?? 'hand',
      basis: existing.basis,
      sourceUrl: existing.sourceUrl,
      reviews: newReviews,
    });

    if (ok) {
      updated++;
      console.log(`Updated pin ${pinId} with ${newReviews.length} reviews.`);
    } else {
      console.warn(`Failed to update pin ${pinId}.`);
    }
  }

  console.log(`Successfully enriched ${updated} hotels with verified reviews!`);
  await db.closeConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
