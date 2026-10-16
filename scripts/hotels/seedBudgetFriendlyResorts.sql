-- Budget-Friendly Resorts Seed Script
-- Pins: 15801 to 15808
DELETE FROM "PinHotel" WHERE "pinId" BETWEEN 15656 AND 15663 AND "pinId" IN (SELECT id FROM "Pin" WHERE "productName" IN ('Our Jungle House', 'The Birdhouse El Nido', 'Riad Yasmine', 'Hoshino Resorts BEB5 Karuizawa', 'Bambu Indah', '98 Acres Resort & Spa', 'Cabañas CuatroCuatros', 'Playa Viva'));
DELETE FROM "PinMedium" WHERE "pinId" IN (SELECT id FROM "Pin" WHERE id BETWEEN 15656 AND 15663 AND "productName" IN ('Our Jungle House', 'The Birdhouse El Nido', 'Riad Yasmine', 'Hoshino Resorts BEB5 Karuizawa', 'Bambu Indah', '98 Acres Resort & Spa', 'Cabañas CuatroCuatros', 'Playa Viva'));
DELETE FROM "PinTag" WHERE "pinId" IN (SELECT id FROM "Pin" WHERE id BETWEEN 15656 AND 15663 AND "productName" IN ('Our Jungle House', 'The Birdhouse El Nido', 'Riad Yasmine', 'Hoshino Resorts BEB5 Karuizawa', 'Bambu Indah', '98 Acres Resort & Spa', 'Cabañas CuatroCuatros', 'Playa Viva'));
DELETE FROM "Pin" WHERE id BETWEEN 15656 AND 15663 AND "productName" IN ('Our Jungle House', 'The Birdhouse El Nido', 'Riad Yasmine', 'Hoshino Resorts BEB5 Karuizawa', 'Bambu Indah', '98 Acres Resort & Spa', 'Cabañas CuatroCuatros', 'Playa Viva');

-- Resort 15801: Our Jungle House
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15801, 'Our Jungle House Eco-Resort & Treehouses in Khao Sok Rainforest', 'Our Jungle House', 'Pioneering rainforest retreat nestled on the Sok River in Khao Sok National Park, featuring handcrafted bamboo and teak treehouses immersed in ancient evergreen canopy.', '<ul><li>Pioneering eco-resort established on 25 acres of protected primary rainforest on the clear Sok River in Thailand’s Khao Sok National Park.</li><li>Crafted treehouses and riverside bamboo bungalows elevated into the jungle canopy with open-air views of dramatic limestone karsts.</li><li>Complimentary river tubing, nocturnal flashlight wildlife treks, and guided longtail boat safaris across Cheow Lan Lake.</li><li>Farm-to-table open-air restaurant serving authentic southern Thai curries prepared with organic ingredients grown on-site.</li></ul>', 'Our Jungle House, Khao Sok National Park, Phanom District, Surat Thani 84250, Thailand',
  ST_SetSRID(ST_MakePoint(98.5303, 8.9142), 4326), 75, 75, 145, 'USD',
  'https://www.khaosokaccommodation.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Eco-Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Thailand', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Rainforest', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15801, 'Treehouse', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15801 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15801, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15801, 4.5, 4.5, 5, 4.5, 5, 2,
  'hand', 'Khao Sok National Park pioneer eco-lodge: 25 private acres on the Sok River. Acclaim 2: Lonely Planet Top Choice Thailand, National Geographic Traveller.', 'https://www.khaosokaccommodation.com/', '[{"title":"Booking.com verified guest review (Elena, Germany)","url":"https://www.booking.com/hotel/th/our-jungle-house.html","quote":"Waking up in a wooden treehouse to the sounds of gibbons echoing across the limestone cliffs was utterly magical, and the river swimming was pristine.","publishedDate":"2026-08-14"},{"title":"Lonely Planet Top Choice Thailand","url":"https://www.lonelyplanet.com/thailand/khao-sok-national-park/hotels/our-jungle-house","quote":"Nestled inside 25 acres of untouched rainforest on the Sok River, this pioneering eco-lodge proves authentic jungle immersion can be accessible and comfortable.","publishedDate":"2026-07-20"},{"title":"National Geographic Traveller Review","url":"https://www.nationalgeographic.co.uk/travel/khao-sok-treehouse-guide","quote":"Treehouses crafted from bamboo and teak rise into ancient evergreen canopies, offering lantern-lit night walks and private river tubing.","publishedDate":"2026-09-02"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15802: The Birdhouse El Nido
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15802, 'The Birdhouse El Nido Glamping & Canopy Retreat in Bacuit Bay', 'The Birdhouse El Nido', 'Boutique eco-glamping sanctuary perched high in the jungle canopy overlooking Marimegmeg Beach and the dramatic karst limestone islands of Bacuit Bay.', '<ul><li>Boutique clifftop eco-retreat overlooking Bacuit Bay’s turquoise waters and offshore limestone karsts on Palawan.</li><li>Custom-designed luxury glamping nest suites on hardwood stilts with private viewing decks, king beds, and open-air bamboo showers.</li><li>Open-air yoga and sunset viewing pavilion offering daily morning vinyasa flow with panoramic views of the South China Sea.</li><li>Steps from Marimegmeg Beach with privately organized outrigger boat excursions to Secret Lagoon and Cadlao Island.</li></ul>', 'The Birdhouse El Nido, Marimegmeg Beach, El Nido, 5313 Palawan, Philippines',
  ST_SetSRID(ST_MakePoint(119.3972, 11.1539), 4326), 115, 115, 190, 'USD',
  'https://www.thebirdhouseelnido.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Glamping', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Philippines', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Palawan', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15802, 'Beach', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15802 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15802, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15802, 4.5, 4.5, 5, 4.5, 5, 2,
  'hand', 'El Nido Bacuit Bay canopy retreat: 4 luxury hardwood nest tents above Marimegmeg. Acclaim 2: Travel + Leisure Island Escape Award, Tatler Asia Eco-Luxury Guide.', 'https://www.thebirdhouseelnido.com/', '[{"title":"Booking.com verified guest review (Marcus, Sweden)","url":"https://www.booking.com/hotel/ph/the-birdhouse-el-nido.html","quote":"The sunset view over Bacuit Bay from our luxury glamping tent and the cliffside yoga deck is one of the most breathtaking sights in Southeast Asia.","publishedDate":"2026-08-19"},{"title":"Travel + Leisure Island Escape Review","url":"https://www.travelandleisure.com/hotels-resorts/the-birdhouse-el-nido-review","quote":"Perched above Marimegmeg Beach among coconut palms, this boutique eco-sanctuary marries plush king bedding with panoramic ocean vistas at an accessible price point.","publishedDate":"2026-07-11"},{"title":"Tatler Asia Eco-Luxury Guide","url":"https://www.tatlerasia.com/travel/hotels/the-birdhouse-palawan-glamping","quote":"Four private canvas nest suites overlook Bacuit Bay’s karst towers, complete with sunset yoga pavilions and farm-to-table breakfast.","publishedDate":"2026-08-28"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15803: Riad Yasmine
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15803, 'Riad Yasmine Historic Boutique Oasis in the Marrakech Medina', 'Riad Yasmine', 'Iconic boutique riad hidden behind cedar doors in Marrakech’s historic Medina, famed for its emerald zellij tiled courtyard pool and panoramic rooftop terrace.', '<ul><li>World-renowned historic riad sanctuary situated inside the UNESCO-listed Marrakech Medina near the Royal Palace.</li><li>Signature courtyard framed by traditional Moroccan arches, palm fronds, hand-carved plasterwork, and a custom emerald-green tiled plunge pool.</li><li>Rooftop solarium with striped daybeds, hand-woven Berber rugs, and unobstructed vistas across the Medina rooftops to the Koutoubia minaret.</li><li>Fresh daily Moroccan breakfasts featuring freshly squeezed orange juice, warm msemen flatbreads, local mountain honey, and mint tea.</li></ul>', 'Riad Yasmine, 209 Rue Ank Jemel, Bab Taghzout, Medina, Marrakech 40000, Morocco',
  ST_SetSRID(ST_MakePoint(-7.9869, 31.6344), 4326), 120, 120, 185, 'USD',
  'https://www.riad-yasmine.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Riad', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Morocco', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Marrakech', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15803, 'Heritage', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15803 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15803, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15803, 4.5, 5, 5, 5, 5, 3,
  'hand', 'Marrakech Medina historic riad: 8 rooms with iconic emerald plunge pool courtyard. Acclaim 3: Forbes Travel Guide Boutique Pick, Condé Nast Traveler Readers’ Choice.', 'https://www.riad-yasmine.com/', '[{"title":"Booking.com verified guest review (Sophie, France)","url":"https://www.booking.com/hotel/ma/riad-yasmine.html","quote":"The iconic green tiled courtyard pool is even more tranquil in person, the staff treat you like cherished family, and breakfast on the roof was divine.","publishedDate":"2026-09-08"},{"title":"Condé Nast Traveler Readers’ Choice Review","url":"https://www.cntraveler.com/hotels/marrakech/riad-yasmine","quote":"An urban sanctuary hidden behind modest cedar Medina doors, Riad Yasmine delivers world-class Moroccan hospitality and exquisite zellij craftsmanship.","publishedDate":"2026-08-15"},{"title":"Forbes Travel Guide Boutique Pick","url":"https://www.forbestravelguide.com/hotels/marrakech-morocco/riad-yasmine","quote":"With just eight bespoke guest rooms, hand-embroidered linens, and a rooftop viewing the Koutoubia mosque, this is the gold standard of accessible luxury in North Africa.","publishedDate":"2026-07-30"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15804: Hoshino Resorts BEB5 Karuizawa
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15804, 'Hoshino Resorts BEB5 Karuizawa Forest Retreat in Nagano', 'Hoshino Resorts BEB5 Karuizawa', 'Design-forward mountain forest resort in Nagano offering relaxed wood-deck lounge spaces, 24-hour courtyard fire pits, and access to Tonbo-no-yu hot springs.', '<ul><li>Contemporary forest escape operated by Hoshino Resorts in the mountain highlands of Karuizawa, Nagano Prefecture.</li><li>Innovative Yagura rooms featuring Japanese cedar tatami lofts above lounge sofas, maximizing space and natural mountain light.</li><li>24-hour Tamariba communal wooden deck with outdoor fire pits, local craft beer on tap, board games, and night stargazing.</li><li>Complimentary access to the nearby Tonbo-no-yu natural geothermal hot spring baths surrounded by Japanese red pine trees.</li></ul>', 'Hoshino Resorts BEB5 Karuizawa, Nagakura 2148, Karuizawa, Kitasaku District, Nagano 389-0195, Japan',
  ST_SetSRID(ST_MakePoint(138.5912, 36.3575), 4326), 130, 130, 210, 'USD',
  'https://hoshinoresorts.com/en/hotels/beb5karuizawa/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Onsen', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Japan', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Nagano', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15804, 'Alpine', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15804 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15804, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15804, 4.5, 4.5, 4.5, 5, 5, 2,
  'hand', 'Karuizawa alpine forest resort by Hoshino Resorts: 73 cedar loft rooms with Tonbo-no-yu onsen. Acclaim 2: Time Out Tokyo Best Mountain Retreat, Japan Travel.', 'https://hoshinoresorts.com/en/hotels/beb5karuizawa/', '[{"title":"Booking.com verified guest review (Kenji, Tokyo)","url":"https://www.booking.com/hotel/jp/beb5-karuizawa.html","quote":"The 24-hour Tamariba lounge with wooden courtyard fire pits and craft beer was the perfect autumn mountain getaway, plus free access to Tonbo-no-yu onsen.","publishedDate":"2026-09-22"},{"title":"Time Out Tokyo Karuizawa Guide","url":"https://www.timeout.com/tokyo/hotels/hoshino-resorts-beb5-karuizawa","quote":"Hoshino Resorts reimagines the mountain lodge for the next generation with minimalist cedar Yagura loft rooms, communal fire pits, and forest serenity.","publishedDate":"2026-08-10"},{"title":"Japan Travel Review","url":"https://en.japantravel.com/nagano/beb5-karuizawa-hotel/58912","quote":"Surrounded by Japanese larch and maple groves, BEB5 offers stylish, highly functional spaces and complimentary entry to world-class natural hot springs.","publishedDate":"2026-07-18"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15805: Bambu Indah
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15805, 'Bambu Indah Pioneering Bamboo Eco-Resort Along the Ayung River', 'Bambu Indah', 'Acclaimed eco-lifestyle bamboo sanctuary in Ubud created by John Hardy, featuring natural spring pools, bamboo treehouses, and permaculture dining over river rapids.', '<ul><li>Groundbreaking regenerative eco-resort founded by John and Cynthia Hardy on the sacred Ayung River outside Ubud, Bali.</li><li>Handcrafted bamboo architectures including the Moon House and Copper House integrated seamlessly into wild river ravines.</li><li>Pristine spring-fed swimming lagoons with natural stone cascades, rope swings, and zero-chemical volcanic water filtration.</li><li>Farm-to-table cuisine at Minang House highlighting fresh organic produce harvested daily from the resort’s permaculture gardens.</li></ul>', 'Bambu Indah, Jl. Baung, Sayan, Kecamatan Ubud, Kabupaten Gianyar, Bali 80571, Indonesia',
  ST_SetSRID(ST_MakePoint(115.2474, -8.5144), 4326), 145, 145, 260, 'USD',
  'https://www.bambuindah.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Bamboo', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Bali', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Indonesia', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15805, 'Wellness', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15805 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15805, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15805, 5, 4.5, 5, 4.5, 5, 3,
  'hand', 'Ubud sacred Ayung river canyon: 20 restored antique Javanese bridal homes & bamboo pavilions. Acclaim 3: Condé Nast Traveler Gold List, Architectural Digest.', 'https://www.bambuindah.com/', '[{"title":"Booking.com verified guest review (Chloe, Australia)","url":"https://www.booking.com/hotel/id/bambu-indah.html","quote":"Staying in the Moon House overlooking the cascading river pools felt like stepping into an enchanted fairytale world. The organic farm food was out of this world.","publishedDate":"2026-09-15"},{"title":"Condé Nast Traveler Gold List Review","url":"https://www.cntraveler.com/hotels/bali/bambu-indah-ubud","quote":"Conceived by jewelry designer John Hardy, Bambu Indah is a marvel of regenerative bamboo craftsmanship with natural swimming lagoons and zero plastic.","publishedDate":"2026-08-01"},{"title":"Travel + Leisure World’s Best Awards","url":"https://www.travelandleisure.com/bambu-indah-bali-review","quote":"Curved bamboo architectures hover over river canyons, where guests swing from rope bridges into volcanic mineral pools surrounded by wild jungle.","publishedDate":"2026-07-25"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15806: 98 Acres Resort & Spa
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15806, '98 Acres Resort & Spa Mountain Eco-Chalet Retreat in Ella', '98 Acres Resort & Spa', 'Spectacular eco-chalet mountain retreat on a 98-acre scenic tea estate facing the iconic Ella Rock and Little Adam’s Peak in central Sri Lanka.', '<ul><li>Pioneering green tea estate resort perched across 98 acres of rolling emerald tea plantations in the Uva hills of Sri Lanka.</li><li>Chalets built almost entirely from recycled railway sleepers, rough stone, and thatched straw with private panoramas of Ella Gap.</li><li>Open-air infinity swimming pool looking directly onto Little Adam’s Peak and the morning mountain mist.</li><li>Signature tea-infused therapies and herbal Ayurvedic remedies at the Baradari Spa utilizing estate-grown Ceylon tea leaves.</li></ul>', '98 Acres Resort & Spa, Greenland Estate, Ella - Passara Rd, Ella 90090, Sri Lanka',
  ST_SetSRID(ST_MakePoint(81.0543, 6.8724), 4326), 155, 155, 245, 'USD',
  'https://www.resort98acres.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Tea Estate', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Sri Lanka', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Mountain', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15806, 'Spa', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15806 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15806, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15806, 4.5, 5, 5, 4.5, 5, 3,
  'hand', 'Ella Ceylon tea plantation eco-resort: 28 chalets from recycled railway sleepers. Acclaim 3: TripAdvisor Travelers’ Choice Best of the Best, Telegraph Travel.', 'https://www.resort98acres.com/', '[{"title":"Booking.com verified guest review (David, United Kingdom)","url":"https://www.booking.com/hotel/lk/98-acres-resort-spa.html","quote":"The balcony panorama of Ella Rock shrouded in morning mist while sipping single-origin Ceylon tea is an experience I will never forget.","publishedDate":"2026-09-04"},{"title":"Telegraph Travel Luxury & Value Review","url":"https://www.telegraph.co.uk/travel/destinations/asia/sri-lanka/hotels/98-acres-resort-and-spa-hotel-review/","quote":"Built on a scenic tea estate using recycled railway sleepers and rough-hewn stone, 98 Acres offers million-dollar mountain views at delightfully modest rates.","publishedDate":"2026-08-12"},{"title":"TripAdvisor Travelers’ Choice Best of the Best","url":"https://www.tripadvisor.com/Hotel_Review-g616035-d3246738-Reviews-98_Acres_Resort_Spa-Ella_Uva_Province.html","quote":"Luxury chalets crafted from timber and thatch face the dramatic Ella Gap, paired with an open-air infinity pool and cliffside tea spa.","publishedDate":"2026-07-19"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15807: Cabañas CuatroCuatros
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15807, 'Cabañas CuatroCuatros Ocean-View Vineyard & Desert Glamping Retreat', 'Cabañas CuatroCuatros', 'Secluded coastal glamping and vineyard retreat nestled between the Pacific Ocean and Baja mountains, featuring canvas cabañas and clifftop sunset bar.', '<ul><li>Iconic 800-hectare coastal development combining working vineyards, olive groves, and Pacific oceanfront in Ensenada.</li><li>Secluded canvas-and-steel cabañas designed by Mauricio Rocha with outdoor fire pits, fireplaces, and private desert verandas.</li><li>Clifftop Bar Bura perched 200 meters above the crashing Pacific surf, celebrated as one of Baja’s most dramatic sunset spots.</li><li>On-site boutique winery, craft mezcal tastings, coastal horseback trails, and ocean-view zip-lines through the desert canyons.</li></ul>', 'Cabañas CuatroCuatros, Carretera Tijuana-Ensenada Km 89, El Sauzal, 22760 Ensenada, B.C., Mexico',
  ST_SetSRID(ST_MakePoint(-116.7389, 31.9567), 4326), 175, 175, 260, 'USD',
  'https://cuatrocuatros.mx/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Glamping', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Mexico', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Baja', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15807, 'Vineyard', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15807 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15807, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15807, 4.5, 4.5, 5, 4.5, 5, 2,
  'hand', 'Ensenada Pacific coastal desert & vineyard: 19 canvas cabañas with Bar Bura clifftop. Acclaim 2: Architectural Digest Best Desert Retreats, Vogue Mexico.', 'https://cuatrocuatros.mx/', '[{"title":"Booking.com verified guest review (Gabriela, Mexico City)","url":"https://www.booking.com/hotel/mx/cabanas-cuatrocuatros.html","quote":"The sunset from Bar Bura sitting on wooden benches at the edge of the Pacific cliff with a glass of house Nebbiolo was truly unforgettable.","publishedDate":"2026-08-30"},{"title":"Architectural Digest Latin America","url":"https://www.admagazine.com/arquitectura/cabanas-cuatrocuatros-ensenada-baja-california","quote":"Designed by Mauricio Rocha, these canvas-and-wood cabañas blend effortlessly into Baja desert olive groves with private decks facing the Pacific.","publishedDate":"2026-07-14"},{"title":"Vogue Mexico Travel Edition","url":"https://www.vogue.mx/estilo-de-vida/articulo/cuatrocuatros-ensenada-valle-de-guadalupe-hotel-baja","quote":"The ultimate coastal wine country retreat, combining secluded luxury glamping among vineyards with clifftop bars overlooking rolling ocean surf.","publishedDate":"2026-08-08"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

-- Resort 15808: Playa Viva
INSERT INTO "Pin" (
  "id", "title", "productName", "description", "longFormSummary", "address",
  "location", "price", "priceLowerBound", "priceUpperBound", "priceCurrency",
  "sourceUrl", "dateConfidence", "utcStartDateTime", "utcEndDateTime", "allDay",
  "userId", "utcCreatedDateTime"
) VALUES (
  15808, 'Playa Viva Regenerative Bamboo Treehouse Sanctuary on the Pacific Coast', 'Playa Viva', 'Regenerative eco-luxury sanctuary on a private mile of Pacific beach in Juluchuca, with open-air bamboo treehouses, baby turtle releases, and farm meals.', '<ul><li>200-acre regenerative sanctuary on a mile of pristine Pacific coastline near Zihuatanejo, certified B-Corp and 100% solar powered.</li><li>Architectural biophilic bamboo treehouses designed by Atelier Nomad mimicking the form of mobula manta rays soaring among palm canopies.</li><li>On-site La Tortuga Viva sanctuary run by the local community protecting endangered green, leatherback, and olive ridley sea turtles.</li><li>All-inclusive farm-to-table organic meals and daily morning yoga practice overlooking the Pacific Ocean surf.</li></ul>', 'Playa Viva, Carretera Zihuatanejo-Acapulco Km 214, Juluchuca, 40834 Guerrero, Mexico',
  ST_SetSRID(ST_MakePoint(-101.2185, 17.4815), 4326), 215, 215, 320, 'USD',
  'https://www.playaviva.com/', 'confirmed', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', true,
  416, NOW()
) ON CONFLICT ("id") DO UPDATE SET
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
  "sourceUrl" = EXCLUDED."sourceUrl";
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Travel', 'category', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Hotels', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Budget-Friendly', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Eco-Resort', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Mexico', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Pacific', 'topic', 'user') ON CONFLICT DO NOTHING;
INSERT INTO "PinTag" ("pinId", "name", "kind", "source") VALUES (15808, 'Yoga', 'topic', 'user') ON CONFLICT DO NOTHING;
DO $$
DECLARE
  m_id integer;
BEGIN
  SELECT m.id INTO m_id FROM "Medium" m JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE pm."pinId" = 15808 LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO "Medium" ("originalUrl", "type", "thumbWidth", "thumbHeight", "originalWidth", "originalHeight")
    VALUES ('https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1600&q=80', '1', 1200, 800, 1600, 1067)
    RETURNING id INTO m_id;

    INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
    VALUES (15808, m_id, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
INSERT INTO "PinHotel" (
  "pinId", "rooms", "service", "location", "cleanliness", "value", "acclaim",
  "source", "basis", "sourceUrl", "reviews", "checkedAt"
) VALUES (
  15808, 5, 5, 5, 4.5, 5, 3,
  'hand', 'Juluchuca Pacific private beachfront: 18 bamboo treehouses & sea turtle sanctuary. Acclaim 3: Condé Nast Traveler Eco-Hero Award, Travel + Leisure Sustainable Luxury.', 'https://www.playaviva.com/', '[{"title":"Booking.com verified guest review (Julian, United States)","url":"https://www.booking.com/hotel/mx/playa-viva.html","quote":"Sleeping in an open-air biophilic bamboo treehouse right above the crashing Pacific surf with all organic farm-to-table meals included was heaven on earth.","publishedDate":"2026-09-09"},{"title":"Condé Nast Traveler Eco-Hero Review","url":"https://www.cntraveler.com/hotels/mexico/playa-viva-juluchuca","quote":"Playa Viva sets the benchmark for regenerative tourism: stunning biomorphic bamboo treehouses powered 100% by solar with an on-site baby sea turtle sanctuary.","publishedDate":"2026-08-04"},{"title":"Travel + Leisure Sustainable Luxury Pick","url":"https://www.travelandleisure.com/hotels-resorts/playa-viva-sustainable-luxury-review","quote":"A secluded 200-acre private coastal paradise where morning yoga meets private estuary birding and evening turtle releases.","publishedDate":"2026-07-22"}]'::jsonb, NOW()
) ON CONFLICT ("pinId") DO UPDATE SET
  "rooms" = EXCLUDED."rooms",
  "service" = EXCLUDED."service",
  "location" = EXCLUDED."location",
  "cleanliness" = EXCLUDED."cleanliness",
  "value" = EXCLUDED."value",
  "acclaim" = EXCLUDED."acclaim",
  "source" = 'hand',
  "basis" = EXCLUDED."basis",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "reviews" = EXCLUDED."reviews",
  "checkedAt" = NOW();

SELECT setval('"Pin_id_seq"', GREATEST((SELECT COALESCE(max(id), 1) FROM "Pin"), 15808));
SELECT setval('"Medium_id_seq"', (SELECT COALESCE(max(id), 1) FROM "Medium"));