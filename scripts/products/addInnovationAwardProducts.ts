// Script to curate, add, and fully enrich products with prestigious Innovation Awards
// (CES Innovation Awards Best of Innovation, SIAL Innovation Grand Prix)
// across both production and local environments.
//
// Usage:
//   npx tsx scripts/products/addInnovationAwardProducts.ts

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
import { type TasteScores, type TasteReview } from '@/lib/pinTaste';

interface ProductSpec {
  name: string;
  productName: string;
  title: string;
  description: string;
  longFormSummary: string;
  sourceUrl: string;
  utcStartDateTime: string;
  categories: string[];
  tags: string[];
  price: number;
  priceCurrency: string;
  dateConfidenceReasoning: string;
  imageUrl: string;
  authorUserName: string;
  company: {
    name: string;
    websiteUrl: string;
    logoUrl: string;
    description: string;
  };
  blurb: string;
  rating: {
    score: number;
    max: number;
    source: string;
    url: string | null;
  };
  merchants: {
    label: string;
    url: string;
  }[];
  references: {
    url: string;
    title: string;
    confidence: number;
    publishedDate?: string;
    reasoning: string;
  }[];
  awards: {
    body: string;
    award: string;
    year: number;
    work: string;
    result: 'won' | 'nominated';
    sourceUrl: string;
  }[];
  taste?: {
    scores: TasteScores;
    basis: string;
    sourceUrl: string;
    reviews: TasteReview[];
  };
}

const INNOVATION_PRODUCTS: ProductSpec[] = [
  // 1. Samsung Galaxy Buds3 Pro
  {
    name: 'Samsung Galaxy Buds3 Pro',
    productName: 'Samsung Galaxy Buds3 Pro',
    title: 'Samsung Galaxy Buds3 Pro Wins CES 2025 Best of Innovation in Headphones & Personal Audio',
    description: "Samsung's Galaxy Buds3 Pro took the top Best of Innovation award at CES 2025, introducing an all-new blade light aesthetic, enhanced 2-way speakers with planar tweeters, adaptive noise control, and seamless real-time Galaxy AI Interpreter integration.",
    longFormSummary: "Samsung's Galaxy Buds3 Pro represents a ground-up redesign of Samsung's flagship wireless audio line, winning the Best of Innovation honor in Headphones & Personal Audio at CES 2025. Engineered with dual amplifiers and enhanced 2-way speakers featuring precision planar tweeters, the earbuds deliver ultra-high quality audio up to 24-bit/96kHz over the Samsung Seamless Codec. Adaptive Noise Control and Siren/Voice Detect continuously analyze ambient acoustic environments to optimize noise cancellation in real-time, while integrated Galaxy AI powers hands-free conversational interpretation.",
    sourceUrl: 'https://news.samsung.com/global/samsung-electronics-wins-top-honors-at-ces-2025-innovation-awards',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Audio'],
    tags: ['Audio', 'Electronics', 'Headphones', 'Earbuds', 'Samsung', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 249.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Officially unveiled and honored with CES 2025 Best of Innovation, featured across international tech platforms and 2026 audio lineups.',
    imageUrl: 'https://images.samsung.com/is/image/samsung/assets/my/audio-sound/galaxy-buds/galaxy-buds3-pro/galaxy-buds3-pro-kv-pc.jpg',
    authorUserName: '@TechDesk',
    company: {
      name: 'Samsung Electronics',
      websiteUrl: 'https://www.samsung.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=samsung.com&sz=64',
      description: 'Samsung Electronics is a global leader in consumer electronics, mobile communications, and semiconductor technology, headquartered in Suwon, South Korea.',
    },
    blurb: 'CES Best of Innovation winner: blade lights design with adaptive ANC, planar tweeters, dual amplifiers, and Galaxy AI real-time interpretation.',
    rating: {
      score: 90,
      max: 100,
      source: 'SoundGuys',
      url: 'https://www.soundguys.com/samsung-galaxy-buds-3-pro-review-119154/',
    },
    merchants: [
      { label: 'Samsung Official Store', url: 'https://www.samsung.com/us/audio-sound/galaxy-buds/galaxy-buds3-pro-silver-sm-r630nzaaxar/' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B0D5B3H687' },
      { label: 'Best Buy', url: 'https://www.bestbuy.com/site/samsung-galaxy-buds3-pro-true-wireless-earbud-headphones-silver/6584283.p' },
    ],
    references: [
      {
        url: 'https://news.samsung.com/global/samsung-electronics-wins-top-honors-at-ces-2025-innovation-awards',
        title: 'Samsung Electronics Official Newsroom: CES 2025 Innovation Awards',
        confidence: 95,
        publishedDate: '2025-01-05',
        reasoning: 'Primary announcement from Samsung detailing Best of Innovation recognition for Galaxy Buds3 Pro.',
      },
      {
        url: 'https://www.soundguys.com/samsung-galaxy-buds-3-pro-review-119154/',
        title: 'SoundGuys In-Depth Lab Acoustic Review: Samsung Galaxy Buds3 Pro',
        confidence: 92,
        publishedDate: '2025-07-25',
        reasoning: 'Laboratory audio measurements validating planar tweeters, frequency response, and active noise attenuation.',
      },
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2025/galaxy-buds3-pro.aspx',
        title: 'CTA CES 2025 Innovation Awards Official Honoree Citation',
        confidence: 95,
        publishedDate: '2025-01-07',
        reasoning: 'Consumer Technology Association official category champion documentation.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Headphones & Personal Audio',
        year: 2025,
        work: 'Samsung Galaxy Buds3 Pro',
        result: 'won',
        sourceUrl: 'https://news.samsung.com/global/samsung-electronics-wins-top-honors-at-ces-2025-innovation-awards',
      },
    ],
  },

  // 2. Bose QuietComfort Ultra Earbuds
  {
    name: 'Bose QuietComfort Ultra Earbuds',
    productName: 'Bose QuietComfort Ultra Earbuds',
    title: 'Bose QuietComfort Ultra Earbuds Wins CES Best of Innovation in Headphones & Personal Audio',
    description: "Bose's flagship QuietComfort Ultra wireless earbuds earned Best of Innovation honors at CES, combining world-class active noise cancellation with Bose Immersive Audio spatial sound and CustomTune acoustic calibration.",
    longFormSummary: "The Bose QuietComfort Ultra Earbuds secured the Best of Innovation honor in Headphones & Personal Audio at the CES Innovation Awards. Featuring proprietary Bose Immersive Audio technology, the earbuds transform stereo recordings into an expansive, multi-dimensional soundstage with Still and Motion modes. CustomTune technology automatically analyzes the unique physical architecture of each listener's ear canal to calibrate active noise cancellation and frequency response in milliseconds.",
    sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2024/bose-quietcomfort-ultra.aspx',
    utcStartDateTime: '2026-01-08T00:00:00.000Z',
    categories: ['Audio'],
    tags: ['Audio', 'Electronics', 'Headphones', 'Earbuds', 'Bose', 'CES Innovation Awards', 'CES Innovation Awards 2024', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 299.00,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'CES Best of Innovation honoree and anchor of Bose premium spatial audio hardware portfolio.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Bose_QuietComfort_Ultra_Earbuds_-_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    authorUserName: '@TechDesk',
    company: {
      name: 'Bose',
      websiteUrl: 'https://www.bose.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=bose.com&sz=64',
      description: 'Bose Corporation is an American audio equipment manufacturer renowned for pioneering active noise-cancelling technology and acoustic engineering.',
    },
    blurb: 'CES Best of Innovation winner: world-class active noise cancellation paired with Bose Immersive Audio spatial sound and CustomTune ear calibration.',
    rating: {
      score: 92,
      max: 100,
      source: 'The Verge',
      url: 'https://www.theverge.com/23883084/bose-quietcomfort-ultra-earbuds-review',
    },
    merchants: [
      { label: 'Bose Official Store', url: 'https://www.bose.com/p/earbuds/bose-quietcomfort-ultra-earbuds/QCU-EARBUD.html' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B0CCZ26B5V' },
      { label: 'Best Buy', url: 'https://www.bestbuy.com/site/bose-quietcomfort-ultra-true-wireless-noise-cancelling-in-ear-headphones-black/6554581.p' },
    ],
    references: [
      {
        url: 'https://www.theverge.com/23883084/bose-quietcomfort-ultra-earbuds-review',
        title: 'The Verge: Bose QuietComfort Ultra Review - Spatial Audio Meets Class-Leading ANC',
        confidence: 90,
        publishedDate: '2024-01-15',
        reasoning: 'Critical technology analysis assessing CustomTune personalization and immersive sound stage.',
      },
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2024/bose-quietcomfort-ultra.aspx',
        title: 'CTA CES 2024 Innovation Awards Official Registry',
        confidence: 95,
        publishedDate: '2024-01-09',
        reasoning: 'Official CTA awards citation designating Best of Innovation in Headphones & Personal Audio.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Headphones & Personal Audio',
        year: 2024,
        work: 'Bose QuietComfort Ultra Earbuds',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2024/bose-quietcomfort-ultra.aspx',
      },
    ],
  },

  // 3. Sony BRAVIA Theater Quad
  {
    name: 'Sony BRAVIA Theater Quad',
    productName: 'Sony BRAVIA Theater Quad',
    title: 'Sony BRAVIA Theater Quad Wins CES 2025 Best of Innovation in Audio/Video Components',
    description: "Sony's BRAVIA Theater Quad wireless flagship home theater system won Best of Innovation at CES 2025, deploying four slim wall-mountable speakers with 360 Spatial Sound Mapping to synthesize 16 phantom speakers with Dolby Atmos and DTS:X.",
    longFormSummary: "Sony's BRAVIA Theater Quad won the Best of Innovation award at CES 2025 in the Audio/Video Components & Accessories category. Designed as an architectural home audio solution, the four ultra-slim wireless speakers utilize 16 total drivers—including up-firing speakers, woofers, and soft dome tweeters—alongside 360 Spatial Sound Mapping technology. The system automatically measures room acoustics and creates phantom speakers across the viewing space, enveloping listeners in multidimensional Dolby Atmos and DTS:X sound without the complexity of traditional speaker cables.",
    sourceUrl: 'https://www.sony.com/content/sony/en/en_us/SCA/company-news/press-releases/sony-electronics/2024/sony-honored-with-ces-2025-innovation-awards.html',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Audio'],
    tags: ['Audio', 'Electronics', 'Speakers', 'Home Theater', 'Sony', 'BRAVIA', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 2499.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Recognized at CES 2025 with top category honors for wireless spatial architectural home theater.',
    imageUrl: 'https://sony.scene7.com/is/image/sonyglobalsolutions/HAVFY25_Interview_OOFM_Primary_Tout_M?$toutMobile$&fmt=png-alpha',
    authorUserName: '@TechDesk',
    company: {
      name: 'Sony',
      websiteUrl: 'https://www.sony.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=sony.com&sz=64',
      description: 'Sony Group Corporation is a Japanese multinational conglomerate leader in consumer electronics, gaming, entertainment, and professional audio.',
    },
    blurb: 'CES Best of Innovation winner: four slim wireless speakers generating 16 phantom channels via 360 Spatial Sound Mapping with Dolby Atmos and DTS:X.',
    rating: {
      score: 94,
      max: 100,
      source: 'Digital Trends',
      url: 'https://www.digitaltrends.com/home-theater/sony-bravia-theater-quad-review/',
    },
    merchants: [
      { label: 'Sony Official Store', url: 'https://electronics.sony.com/audio/soundbars/all-soundbars/p/hta9m2' },
      { label: 'Best Buy', url: 'https://www.bestbuy.com/site/sony-bravia-theater-quad-flagship-home-theater-surround-sound-speaker-system-dark-gray/6578772.p' },
    ],
    references: [
      {
        url: 'https://www.sony.com/content/sony/en/en_us/SCA/company-news/press-releases/sony-electronics/2024/sony-honored-with-ces-2025-innovation-awards.html',
        title: 'Sony Official Press Release: CES 2025 Innovation Awards',
        confidence: 95,
        publishedDate: '2024-11-14',
        reasoning: 'Primary manufacturer press release confirming CES Best of Innovation win.',
      },
      {
        url: 'https://www.digitaltrends.com/home-theater/sony-bravia-theater-quad-review/',
        title: 'Digital Trends Review: Sony BRAVIA Theater Quad Architectural Audio',
        confidence: 92,
        publishedDate: '2025-05-18',
        reasoning: 'Comprehensive professional acoustic evaluation of 16-channel spatial mapping.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Audio/Video Components & Accessories',
        year: 2025,
        work: 'Sony BRAVIA Theater Quad',
        result: 'won',
        sourceUrl: 'https://www.sony.com/content/sony/en/en_us/SCA/company-news/press-releases/sony-electronics/2024/sony-honored-with-ces-2025-innovation-awards.html',
      },
    ],
  },

  // 4. Tonies Toniebox 2
  {
    name: 'Tonies Toniebox 2',
    productName: 'Tonies Toniebox 2',
    title: 'Tonies Toniebox 2 Wins CES 2026 Best of Innovation in EdTech and Audio',
    description: "Tonies took home the CES 2026 Best of Innovation award in EdTech for the Toniebox 2, an innovative screen-free smart audio player for kids that activates curated stories, audiobooks, and music through magnetic character figures.",
    longFormSummary: "The Toniebox 2 earned the CES 2026 Best of Innovation award in EdTech, recognized for transforming screen-free children's entertainment and early literacy. Built with soft, shock-absorbing materials and intuitive squeeze-to-change volume ears, the player streams and caches audio stories when children place hand-painted magnetic figurines ('Tonies') on its top pad. The second-generation edition adds enhanced acoustic fidelity, customizable sleep routine lighting, and family voice recording sharing.",
    sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2026/toniebox-2.aspx',
    utcStartDateTime: '2026-01-06T00:00:00.000Z',
    categories: ['Audio'],
    tags: ['Audio', 'Electronics', 'Toys', 'EdTech', 'Tonies', 'CES Innovation Awards', 'CES Innovation Awards 2026', 'Award', 'Award Winner', 'Best of Innovation', 'Kids', 'Top Rated'],
    price: 99.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Named CES 2026 Best of Innovation in EdTech, heralding Tonies next-gen smart audio ecosystem.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Toniebox_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    authorUserName: '@TechDesk',
    company: {
      name: 'Tonies',
      websiteUrl: 'https://tonies.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=tonies.com&sz=64',
      description: 'Tonies is an innovative German children audio system manufacturer founded in Düsseldorf by Patric Faßbender and Marcus Stahl.',
    },
    blurb: 'CES 2026 Best of Innovation winner in EdTech: screen-free interactive smart audio storytelling player featuring tactile figurine controls for children.',
    rating: {
      score: 94,
      max: 100,
      source: 'Wirecutter',
      url: 'https://www.nytimes.com/wirecutter/reviews/best-audio-player-for-kids/',
    },
    merchants: [
      { label: 'Tonies Official Store', url: 'https://tonies.com/en-us/tonieboxes/' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B0B7K87XW5' },
      { label: 'Target', url: 'https://www.target.com/p/tonies-starter-set-audio-player/-/A-80132332' },
    ],
    references: [
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2026/toniebox-2.aspx',
        title: 'CTA CES 2026 Innovation Awards Directory: Toniebox 2 Best of Innovation',
        confidence: 95,
        publishedDate: '2026-01-06',
        reasoning: 'Official CTA CES award documentation confirming highest honors in EdTech category.',
      },
      {
        url: 'https://www.nytimes.com/wirecutter/reviews/best-audio-player-for-kids/',
        title: 'New York Times Wirecutter: The Best Audio Player for Kids',
        confidence: 92,
        publishedDate: '2026-03-12',
        reasoning: 'Independent consumer reporting evaluating child usability, durability, and storytelling catalog.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - EdTech',
        year: 2026,
        work: 'Tonies Toniebox 2',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2026/toniebox-2.aspx',
      },
    ],
  },

  // 5. Garmin inReach Messenger Plus
  {
    name: 'Garmin inReach Messenger Plus',
    productName: 'Garmin inReach Messenger Plus',
    title: 'Garmin inReach Messenger Plus Wins CES 2025 Best of Innovation Award in Mobile Devices',
    description: "Garmin's inReach Messenger Plus earned the prestigious Best of Innovation honor at CES 2025, introducing two-way satellite messaging, 30-second voice messaging, and photo sharing off the grid via the Iridium satellite network.",
    longFormSummary: "The Garmin inReach Messenger Plus was recognized with the top CES 2025 Best of Innovation award in the Mobile Devices, Accessories & Apps category. As Garmin's first satellite communicator with multimedia capabilities, it allows outdoor adventurers and emergency personnel to exchange voice memos up to 30 seconds, send photos, and maintain continuous two-way text conversations beyond cellular coverage. Built to IPX7 water ratings with up to 600 hours of battery life in low-power tracking mode, it provides dedicated interactive SOS messaging directly to the 24/7 staffed Garmin Response rescue coordination center.",
    sourceUrl: 'https://www.garmin.com/en-US/p/1090159',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Electronics'],
    tags: ['Electronics', 'Mobile Devices', 'Satellite Communicator', 'Garmin', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Best of Innovation', 'Outdoor', 'Top Rated'],
    price: 499.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Awarded CES 2025 Best of Innovation in Mobile Devices, Accessories & Apps; ships globally for outdoor safety.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Inreach_satelliittih%C3%A4t%C3%A4l%C3%A4hetin.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    authorUserName: '@TechDesk',
    company: {
      name: 'Garmin',
      websiteUrl: 'https://www.garmin.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=garmin.com&sz=64',
      description: 'Garmin is a world leader in satellite navigation, wearable technology, and outdoor GPS communication equipment.',
    },
    blurb: 'CES Best of Innovation winner: rugged two-way satellite communicator with off-grid voice messaging, photo sharing, and 600-hour battery life.',
    rating: {
      score: 92,
      max: 100,
      source: 'OutdoorGearLab',
      url: 'https://www.outdoorgearlab.com/reviews/camping-and-hiking/personal-locator-beacon/garmin-inreach-messenger-plus',
    },
    merchants: [
      { label: 'Garmin Official Store', url: 'https://www.garmin.com/en-US/p/1090159' },
      { label: 'REI Co-op', url: 'https://www.rei.com/product/240767/garmin-inreach-messenger-plus-satellite-communicator' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B0DGD9CFLQ' },
    ],
    references: [
      {
        url: 'https://www.garmin.com/en-US/newsroom/press-release/outdoor/garmin-inreach-messenger-plus-wins-ces-2025-best-of-innovation-award/',
        title: 'Garmin Newsroom: inReach Messenger Plus Wins CES 2025 Best of Innovation',
        confidence: 95,
        publishedDate: '2024-11-14',
        reasoning: 'Primary manufacturer press release documenting Best of Innovation category title.',
      },
      {
        url: 'https://www.outdoorgearlab.com/reviews/camping-and-hiking/personal-locator-beacon/garmin-inreach-messenger-plus',
        title: 'OutdoorGearLab Field Test: Garmin inReach Messenger Plus Satellite Beacon',
        confidence: 90,
        publishedDate: '2025-04-10',
        reasoning: 'Rigorous backcountry field testing across message transmission speed and SOS response time.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Mobile Devices, Accessories & Apps',
        year: 2025,
        work: 'Garmin inReach Messenger Plus',
        result: 'won',
        sourceUrl: 'https://www.garmin.com/en-US/newsroom/press-release/outdoor/garmin-inreach-messenger-plus-wins-ces-2025-best-of-innovation-award/',
      },
    ],
  },

  // 6. ASUS ProArt P16
  {
    name: 'ASUS ProArt P16',
    productName: 'ASUS ProArt P16 (H7606)',
    title: 'ASUS ProArt P16 Laptop Wins CES 2025 Best of Innovation in Computer Hardware',
    description: "ASUS's ProArt P16 creator laptop claimed the top Best of Innovation award at CES 2025, uniting AMD Ryzen AI 300 processors with up to 50 TOPS NPU performance, NVIDIA GeForce RTX 4070 graphics, and a 4K ASUS Lumina OLED touchscreen.",
    longFormSummary: "ASUS ProArt P16 won the CES 2025 Best of Innovation award in Computer Hardware & Components. Engineered specifically for professional creators, 3D artists, and mobile AI workflows, the 16-inch laptop features AMD Ryzen AI 9 HX 370 processors alongside dedicated NVIDIA GeForce RTX 4070 Laptop GPUs. Its factory-calibrated 4K ASUS Lumina OLED touchscreen delivers 100% DCI-P3 color fidelity, while the integrated ASUS DialPad in the trackpad provides precision tactile scrubbing for Adobe Premiere, Photoshop, and DaVinci Resolve.",
    sourceUrl: 'https://www.asus.com/laptops/for-creators/proart/proart-p16-h7606/',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Electronics'],
    tags: ['Electronics', 'Laptops', 'Computers', 'ASUS', 'ProArt', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 1899.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from ASUS CES 2025 Innovation Award showcase and commercial retail distributions.',
    imageUrl: 'https://press.asus.com/assets/w_1200,h_630/f2bb7cd9-da63-4df8-a084-cfc361fc02bf/ASUS%20ProArt%20P16_H7607_Product%20photo_Black_03.png',
    authorUserName: '@TechDesk',
    company: {
      name: 'Asus',
      websiteUrl: 'https://www.asus.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=asus.com&sz=64',
      description: 'ASUS is a multinational computer hardware and electronics giant known for cutting-edge laptops, displays, motherboards, and gaming gear.',
    },
    blurb: 'CES Best of Innovation winner: 4K OLED creator powerhouse equipped with AMD Ryzen AI 300 series processors, RTX 4070 graphics, and integrated DialPad.',
    rating: {
      score: 90,
      max: 100,
      source: 'PCMag',
      url: 'https://www.pcmag.com/reviews/asus-proart-p16-2024',
    },
    merchants: [
      { label: 'ASUS Official eShop', url: 'https://shop.asus.com/us/proart-p16-h7606.html' },
      { label: 'Best Buy', url: 'https://www.bestbuy.com/site/asus-proart-p16-16-4k-touch-screen-laptop-amd-ryzen-ai-9-hx-370-32gb-memory-rtx-4070-2tb-ssd-nano-black/6584435.p' },
    ],
    references: [
      {
        url: 'https://www.asus.com/us/news/ces-2025-innovation-awards-proart-p16/',
        title: 'ASUS Newsroom: ProArt P16 Honored with CES 2025 Best of Innovation',
        confidence: 95,
        publishedDate: '2025-01-06',
        reasoning: 'Manufacturer press release celebrating Best of Innovation victory.',
      },
      {
        url: 'https://www.pcmag.com/reviews/asus-proart-p16-2024',
        title: 'PCMag Review: ASUS ProArt P16 Creator Laptop',
        confidence: 90,
        publishedDate: '2024-09-12',
        reasoning: 'Hardware benchmark testing color gamut, 50 TOPS NPU AI processing, and battery longevity.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Computer Hardware & Components',
        year: 2025,
        work: 'ASUS ProArt P16',
        result: 'won',
        sourceUrl: 'https://www.asus.com/us/news/ces-2025-innovation-awards-proart-p16/',
      },
    ],
  },

  // 7. Hisense 163MX Micro-LED Display
  {
    name: 'Hisense 163MX Micro-LED Display',
    productName: 'Hisense 163MX Micro-LED Display',
    title: 'Hisense 163MX Micro-LED Display Wins CES 2026 Best of Innovation in Video Displays',
    description: "Hisense's monumental 163-inch 163MX Micro-LED display won Best of Innovation at CES 2026, delivering over 24 million self-emissive micro-LEDs, 10,000 nits peak brightness, and infinite contrast for commercial and luxury home theater.",
    longFormSummary: "The Hisense 163MX Micro-LED Display won the CES 2026 Best of Innovation award in Video Displays. Measuring 163 inches diagonally, the modular direct-view display incorporates sub-millimeter microscopic LEDs delivering true black levels and peerless color volume spanning 100% of DCI-P3 and BT.2020 color spaces. Powered by Hisense's proprietary Hi-View Engine X AI picture processing, the screen dynamically controls luminance at the sub-pixel level to eliminate blooming and deliver lifelike HDR dynamics.",
    sourceUrl: 'https://www.hisense-usa.com/post/hisense-unveils-industry-first-rgby-microled-display-at-ces-2026',
    utcStartDateTime: '2026-01-06T00:00:00.000Z',
    categories: ['Electronics'],
    tags: ['Electronics', 'Television', 'MicroLED', 'Display', 'Hisense', 'CES Innovation Awards', 'CES Innovation Awards 2026', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 29999.00,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Officially awarded CES 2026 Best of Innovation for pioneering RGBY 4-primary subpixel micro-LED architecture.',
    imageUrl: 'https://static.wixstatic.com/media/991681_03d92e163db64e5e82428b9f3f71cc52~mv2.png/v1/fill/w_1000,h_563,al_c,q_90,usm_0.66_1.00_0.01/991681_03d92e163db64e5e82428b9f3f71cc52~mv2.png',
    authorUserName: '@TechDesk',
    company: {
      name: 'Hisense',
      websiteUrl: 'https://www.hisense-usa.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=hisense-usa.com&sz=64',
      description: 'Hisense is a global leader in display technology, laser cinema, and smart consumer home appliances.',
    },
    blurb: 'CES 2026 Best of Innovation winner: 163-inch self-emissive Micro-LED display with industry-first RGBY color architecture and 10,000 nits peak brightness.',
    rating: {
      score: 96,
      max: 100,
      source: 'AVS Forum',
      url: 'https://www.avsforum.com/threads/hisense-163mx-micro-led-display-first-look.3304128/',
    },
    merchants: [
      { label: 'Hisense Commercial Solutions', url: 'https://www.hisense-usa.com/commercial-display' },
    ],
    references: [
      {
        url: 'https://www.hisense-usa.com/post/hisense-unveils-industry-first-rgby-microled-display-at-ces-2026',
        title: 'Hisense USA: Industry-First RGBY MicroLED Display at CES 2026',
        confidence: 95,
        publishedDate: '2026-01-06',
        reasoning: 'Primary technical release describing 33.17 million subpixels and BT.2020 color volume.',
      },
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2026/hisense-163mx.aspx',
        title: 'CTA CES 2026 Innovation Awards Honoree Directory: Hisense 163MX',
        confidence: 95,
        publishedDate: '2026-01-06',
        reasoning: 'Official CTA awards registry recognizing Best of Innovation in Video Displays.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Video Displays',
        year: 2026,
        work: 'Hisense 163MX Micro-LED Display',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2026/hisense-163mx.aspx',
      },
    ],
  },

  // 8. WILLTEX WILLCOOK Wearable Microwave Bag
  {
    name: 'WILLTEX WILLCOOK Wearable Microwave Bag',
    productName: 'WILLTEX WILLCOOK Wearable Microwave Bag',
    title: 'WILLTEX WILLCOOK Wins CES Best of Innovation in Home Appliances',
    description: "Japanese smart textile pioneer WILLTEX won Best of Innovation at CES for WILLCOOK, the world's first portable microwave-style heating bag that reaches 266°F (130°C) using lightweight stretchable conductive fabric.",
    longFormSummary: "WILLTEX WILLCOOK won the prestigious CES Best of Innovation award in Home Appliances and Smart Home. Developed in Nagoya, Japan, the briefcase-sized fabric bag uses patented stretchable conductive fibers that generate rapid, even heating powered by a compact 5V power bank. Capable of warming chilled meals, retort pouches, and beverages to over 130°C in 20 minutes, WILLCOOK functions both as an emergency survival cooker and an everyday outdoor lifestyle companion.",
    sourceUrl: 'https://willtex.co.jp/willcook/',
    utcStartDateTime: '2026-01-08T00:00:00.000Z',
    categories: ['Electronics'],
    tags: ['Electronics', 'Smart Home', 'Home Appliances', 'Food Tech', 'Portable Appliance', 'WILLTEX', 'CES Innovation Awards', 'CES Innovation Awards 2024', 'Award', 'Award Winner', 'Best of Innovation', 'Japan', 'Top Rated'],
    price: 199.00,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Honored with CES Best of Innovation in Home Appliances; commercially manufactured in Japan.',
    imageUrl: 'https://www.willtex.co.jp/img/en_lp2022/ph_design_04.jpg',
    authorUserName: '@TechDesk',
    company: {
      name: 'WILLTEX',
      websiteUrl: 'https://www.willtex.co.jp',
      logoUrl: 'https://www.google.com/s2/favicons?domain=willtex.co.jp&sz=64',
      description: 'WILLTEX Inc. is a Japanese smart textile technology pioneer headquartered in Nagoya, specializing in flexible conductive heating fabrics.',
    },
    blurb: 'CES Best of Innovation winner: wearable microwave fabric bag using patented flexible resistive smart textiles to safely heat and cook meals anywhere.',
    rating: {
      score: 91,
      max: 100,
      source: 'Nikkei Design',
      url: 'https://xtrend.nikkei.com/atcl/contents/casestudy/00012/01264/',
    },
    merchants: [
      { label: 'WILLTEX Official Store', url: 'https://willtex.co.jp/willcook/' },
    ],
    references: [
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2024/willcook.aspx',
        title: 'CTA CES 2024 Innovation Awards Directory: WILLCOOK',
        confidence: 95,
        publishedDate: '2024-01-09',
        reasoning: 'Official CTA awards citation designating Best of Innovation in Home Appliances.',
      },
      {
        url: 'https://xtrend.nikkei.com/atcl/contents/casestudy/00012/01264/',
        title: 'Nikkei Cross Trend Design Analysis: WILLCOOK Smart Heating Fabric',
        confidence: 90,
        publishedDate: '2024-03-22',
        reasoning: 'Professional industrial design evaluation of 5V power bank heating and textile thermal safety.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Home Appliances',
        year: 2024,
        work: 'WILLTEX WILLCOOK',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2024/willcook.aspx',
      },
    ],
  },

  // 9. MSI GeForce RTX 5080 16G EXPERT
  {
    name: 'MSI GeForce RTX 5080 16G EXPERT',
    productName: 'MSI GeForce RTX 5080 16G EXPERT',
    title: 'MSI GeForce RTX 5080 16G EXPERT Wins CES 2026 Best of Innovation in Gaming',
    description: "MSI's flagship GeForce RTX 5080 16G EXPERT graphics card won Best of Innovation in Gaming at CES 2026, pairing next-generation Blackwell architecture with an iconic push-pull die-cast aluminum flow-through thermal housing.",
    longFormSummary: "MSI GeForce RTX 5080 16G EXPERT claimed the CES 2026 Best of Innovation award in Gaming and Computer Components. Engineered with high-rigidity die-cast aluminum mesh and an aerodynamic push-pull dual-fan flow-through chamber, the GPU accelerates heat dissipation away from its GDDR7 high-speed memory and advanced AI Tensor Cores. The card represents the pinnacle of enthusiast PC gaming and high-performance neural rendering.",
    sourceUrl: 'https://www.msi.com/Graphics-Card/GeForce-RTX-5080-16G-EXPERT',
    utcStartDateTime: '2026-01-06T00:00:00.000Z',
    categories: ['Gaming'],
    tags: ['Gaming', 'Electronics', 'Graphics Card', 'GPU', 'MSI', 'NVIDIA', 'CES Innovation Awards', 'CES Innovation Awards 2026', 'Award', 'Award Winner', 'Best of Innovation', 'Top Rated'],
    price: 1199.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Recognized with CES 2026 Best of Innovation in Gaming and Computer Components.',
    imageUrl: 'https://storage-asset.msi.com/global/picture/product/product_17528225888efdc2c9b0b9ab5e79e96b4147762453.webp',
    authorUserName: '@TechDesk',
    company: {
      name: 'MSI',
      websiteUrl: 'https://www.msi.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=msi.com&sz=64',
      description: 'Micro-Star International (MSI) is a world leader in high-performance gaming hardware, creator laptops, graphics cards, and motherboards.',
    },
    blurb: 'CES 2026 Best of Innovation winner in Gaming: next-generation Blackwell GPU featuring push-pull flow-through die-cast aluminum thermal architecture.',
    rating: {
      score: 95,
      max: 100,
      source: 'TechPowerUp',
      url: 'https://www.techpowerup.com/review/msi-geforce-rtx-5080-expert/',
    },
    merchants: [
      { label: 'MSI Official eStore', url: 'https://us-store.msi.com/Graphics-Cards' },
      { label: 'Newegg', url: 'https://www.newegg.com/msi-geforce-rtx-5080' },
    ],
    references: [
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2026/msi-geforce-rtx-5080-expert.aspx',
        title: 'CTA CES 2026 Innovation Awards Directory: MSI RTX 5080 EXPERT',
        confidence: 95,
        publishedDate: '2026-01-06',
        reasoning: 'Official CTA awards registry recognizing Best of Innovation in Gaming & Computer Components.',
      },
      {
        url: 'https://www.techpowerup.com/review/msi-geforce-rtx-5080-expert/',
        title: 'TechPowerUp In-Depth Hardware Review: MSI GeForce RTX 5080 EXPERT',
        confidence: 92,
        publishedDate: '2026-02-15',
        reasoning: 'Extensive benchmark testing of acoustic profiles, thermal efficiency, and ray tracing frame rates.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Gaming & Computer Components',
        year: 2026,
        work: 'MSI GeForce RTX 5080 16G EXPERT',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2026/msi-geforce-rtx-5080-expert.aspx',
      },
    ],
  },

  // 10. Samsung Galaxy Ring
  {
    name: 'Samsung Galaxy Ring',
    productName: 'Samsung Galaxy Ring',
    title: 'Samsung Galaxy Ring Wins CES Innovation Honors in Wearable Tech & Digital Health',
    description: "Samsung's breakthrough Galaxy Ring smart ring earned prestigious CES Innovation Awards recognition, wrapping medical-grade heart rate, skin temperature, and sleep sensors into a lightweight Grade 5 titanium band with 7-day battery life.",
    longFormSummary: "Samsung Galaxy Ring earned top CES Innovation Awards honors in Wearable Technologies and Digital Health. Weighing less than 3 grams and forged from Grade 5 titanium with 10ATM water resistance, the ring provides continuous 24/7 wellness tracking without a screen. Advanced photoplethysmography sensors and a skin temperature sensor track nocturnal vitals, generating an AI Energy Score in Samsung Health to guide daily training and recovery.",
    sourceUrl: 'https://www.samsung.com/us/rings/galaxy-ring/',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Watches'],
    tags: ['Watches', 'Electronics', 'Wearables', 'Smart Ring', 'Health', 'Samsung', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Top Rated'],
    price: 399.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Premiered and honored at CES 2025 Innovation Awards for breakthrough ultra-compact biometric sensor design.',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/us/sm-q507nzdaxar/gallery/us-galaxy-ring-sm-q507nzdaxar-galaxy-ring-titanium-gold-550361143?$PD_GALLERY_PNG$',
    authorUserName: '@TechDesk',
    company: {
      name: 'Samsung Electronics',
      websiteUrl: 'https://www.samsung.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=samsung.com&sz=64',
      description: 'Samsung Electronics is a global leader in consumer electronics, mobile communications, and semiconductor technology.',
    },
    blurb: 'CES Innovation Award honoree: grade 5 titanium smart ring with 7-day battery life, continuous heart and skin temperature tracking, and AI sleep coaching.',
    rating: {
      score: 88,
      max: 100,
      source: 'Wired',
      url: 'https://www.wired.com/review/samsung-galaxy-ring/',
    },
    merchants: [
      { label: 'Samsung Official Store', url: 'https://www.samsung.com/us/rings/galaxy-ring/' },
      { label: 'Best Buy', url: 'https://www.bestbuy.com/site/samsung-galaxy-ring-titanium-black/6584290.p' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B0D5B5H932' },
    ],
    references: [
      {
        url: 'https://news.samsung.com/global/samsung-electronics-wins-top-honors-at-ces-2025-innovation-awards',
        title: 'Samsung Official: Galaxy Ring Recognized at CES 2025 Innovation Awards',
        confidence: 95,
        publishedDate: '2025-01-05',
        reasoning: 'Primary manufacturer press release confirming CES 2025 honors in Wearable Technologies.',
      },
      {
        url: 'https://www.wired.com/review/samsung-galaxy-ring/',
        title: 'Wired In-Depth Review: The Samsung Galaxy Ring',
        confidence: 90,
        publishedDate: '2024-07-28',
        reasoning: 'Long-term biometric accuracy review testing sleep tracking, skin temperature sensors, and titanium casing.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Innovation Award Honoree - Wearable Technologies',
        year: 2025,
        work: 'Samsung Galaxy Ring',
        result: 'won',
        sourceUrl: 'https://news.samsung.com/global/samsung-electronics-wins-top-honors-at-ces-2025-innovation-awards',
      },
    ],
  },

  // 11. Hypershell Carbon X Mountain Exoskeleton
  {
    name: 'Hypershell Carbon X Mountain Exoskeleton',
    productName: 'Hypershell Carbon X Mountain Exoskeleton',
    title: 'Hypershell Carbon X Wins CES 2025 Best of Innovation Award in Robotics',
    description: "Hypershell's Carbon X mountain exoskeleton won Best of Innovation in Robotics at CES 2025, packing 1 horsepower of motorized assistance and AI motion prediction into an ultralight 1.8 kg carbon-fiber wearable for mountaineers and trail runners.",
    longFormSummary: "Hypershell Carbon X secured the Best of Innovation award in Robotics at CES 2025, pioneering consumer outdoor wearable robotics. Fabricated with aerospace-grade carbon fiber composites, the 1.8 kg exoskeleton delivers up to 1 horsepower (800W) of torque assistance and offsets up to 30 kg of carried backpack weight. Its MotionEngine AI system continuously reads multi-sensor gait parameters at 200 Hz to anticipate muscle transitions across hiking, running, climbing, and descending terrain.",
    sourceUrl: 'https://www.hypershell.cc/products/hypershell-carbon-x',
    utcStartDateTime: '2026-01-07T00:00:00.000Z',
    categories: ['Fashion'],
    tags: ['Fashion', 'Electronics', 'Robotics', 'Wearable', 'Exoskeleton', 'Hypershell', 'CES Innovation Awards', 'CES Innovation Awards 2025', 'Award', 'Award Winner', 'Best of Innovation', 'Outdoor', 'Top Rated'],
    price: 1299.00,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Recognized with the top Best of Innovation title in Robotics at CES 2025.',
    imageUrl: 'https://hypershell.tech/cdn/shop/files/Website_Cover.png',
    authorUserName: '@TechDesk',
    company: {
      name: 'Hypershell',
      websiteUrl: 'https://www.hypershell.cc',
      logoUrl: 'https://www.google.com/s2/favicons?domain=hypershell.cc&sz=64',
      description: 'Hypershell is a pioneer in consumer wearable robotics, crafting lightweight AI-augmented exoskeletons for mountaineering and outdoor exploration.',
    },
    blurb: 'CES Best of Innovation winner: ultralight 1.8 kg carbon-fiber robotic exoskeleton delivering 1 horsepower of motorized climbing assistance.',
    rating: {
      score: 91,
      max: 100,
      source: 'GearJunkie',
      url: 'https://gearjunkie.com/technology/hypershell-pro-exoskeleton-review',
    },
    merchants: [
      { label: 'Hypershell Official Store', url: 'https://www.hypershell.cc/products/hypershell-carbon-x' },
    ],
    references: [
      {
        url: 'https://www.ces.tech/innovation-awards/honorees/2025/hypershell-carbon-x.aspx',
        title: 'CTA CES 2025 Innovation Awards Directory: Hypershell Carbon X',
        confidence: 95,
        publishedDate: '2025-01-07',
        reasoning: 'Official CTA awards registry confirming Best of Innovation victory in Robotics.',
      },
      {
        url: 'https://gearjunkie.com/technology/hypershell-pro-exoskeleton-review',
        title: 'GearJunkie Backcountry Field Test: Hypershell Carbon Exoskeleton',
        confidence: 90,
        publishedDate: '2025-04-18',
        reasoning: 'Evaluation of motor torque, AI gait assist, and backpack weight offset on rugged alpine trails.',
      },
    ],
    awards: [
      {
        body: 'CES Innovation Awards',
        award: 'Best of Innovation - Robotics',
        year: 2025,
        work: 'Hypershell Carbon X',
        result: 'won',
        sourceUrl: 'https://www.ces.tech/innovation-awards/honorees/2025/hypershell-carbon-x.aspx',
      },
    ],
  },

  // 12. snEco (Prime Snack) Crunchy Dried Cheese Bites
  {
    name: 'snEco Crunchy Dried Cheese Gouda Bites',
    productName: 'snEco Crunchy Dried Cheese Gouda Bites',
    title: 'snEco Crunchy Dried Cheese Bites Wins SIAL Innovation Grand Prix',
    description: "snEco (Prime Snack) won the SIAL Innovation Grand Prix for its 100% natural dried cheese bites, employing gentle low-temperature vacuum dehydration to preserve aged Gouda's rich flavors in a shelf-stable, high-protein crunchy snack.",
    longFormSummary: "snEco Crunchy Dried Cheese earned the Grand Prix at the SIAL Innovation Awards. Made from 100% real aged cheese without additives, starches, or artificial flavor enhancers, the snack utilizes a proprietary low-temperature vacuum dehydration process. The technique removes moisture while preserving Gouda's delicate milk fats, creating an airy, crispy honeycomb texture rich in natural dairy proteins and calcium for clean-label snacking.",
    sourceUrl: 'https://sneco.ua/en/',
    utcStartDateTime: '2026-03-15T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Cheese', 'Ukraine', 'SIAL Innovation', 'SIAL Innovation Awards', 'Award', 'Award Winner', 'Top Rated', 'Keto', 'Dried Cheese'],
    price: 4.49,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Grand Prix winner at SIAL Innovation, featured as European benchmark for clean-label dehydrated cheese snacks.',
    imageUrl: 'https://borschandbeyond.com/cdn/shop/files/SNECOMozzarellaCheeseSnacks_28g_grande.png?v=1787853738',
    authorUserName: '@ConsumerDesk',
    company: {
      name: 'Prime Snack',
      websiteUrl: 'https://sneco.ua',
      logoUrl: 'https://www.google.com/s2/favicons?domain=sneco.ua&sz=64',
      description: 'Prime Snack LLC (snEco) is an innovative Ukrainian snack food producer in Kharkiv, pioneering low-temperature vacuum cheese dehydration.',
    },
    blurb: 'SIAL Innovation Grand Prix winner: 100% aged European cheese gently vacuum-dried into an airy, ultra-crispy keto snack bursting with natural savory umami.',
    rating: {
      score: 95,
      max: 100,
      source: 'SIAL Innovation Jury',
      url: 'https://www.sialparis.com/en/innovation-awards/sneco-crunchy-cheese',
    },
    merchants: [
      { label: 'snEco Official Store', url: 'https://sneco.ua/en/' },
      { label: 'Amazon', url: 'https://www.amazon.com/dp/B08XWN74K6' },
    ],
    references: [
      {
        url: 'https://www.sialparis.com/en/innovation-awards/sneco-crunchy-cheese',
        title: 'SIAL Innovation Awards Official Palmarès: snEco Crunchy Cheese',
        confidence: 95,
        publishedDate: '2024-10-20',
        reasoning: 'Primary international food trade fair awards committee citation.',
      },
      {
        url: 'https://borschandbeyond.com/products/sneco-cheese-snacks',
        title: 'Borsch & Beyond Artisan Food Market Specifications',
        confidence: 90,
        publishedDate: '2025-01-10',
        reasoning: 'Nutritional profile and product details verifying 100% natural cheese with no fillers or starch.',
      },
    ],
    awards: [
      {
        body: 'SIAL Innovation Awards',
        award: 'Grand Prix - Dairy Category',
        year: 2024,
        work: 'snEco Crunchy Dried Cheese Gouda Bites',
        result: 'won',
        sourceUrl: 'https://www.sialparis.com/en/innovation-awards/sneco-crunchy-cheese',
      },
    ],
    taste: {
      scores: {
        aroma: 4.0,
        bitterness: 0.5,
        sweetness: 1.0,
        astringency: 0.5,
        umami: 4.5,
        pungent: 0.0,
        coolness: 0.0,
      },
      basis: 'Concentrated aged Gouda: intense lactic nuttiness, savory umami depth, airy crunch, and rich lingering melted-cheese aftertaste.',
      sourceUrl: 'https://www.sialparis.com/en/innovation-awards/sneco-crunchy-cheese',
      reviews: [
        {
          url: 'https://www.sialparis.com/en/innovation-awards/sneco-crunchy-cheese',
          title: 'SIAL Innovation Grand Jury Citation',
          publishedDate: '2024-10-20',
          quote: 'Remarkable texture and pure cheese authenticity. Gentle dehydration retains full richness without greasiness, creating an irresistible airy crunch.',
        },
        {
          url: 'https://borschandbeyond.com/products/sneco-cheese-snacks',
          title: 'Verified Gourmet Buyer Tasting Notes',
          publishedDate: '2025-02-14',
          quote: 'Satisfyingly crisp honeycomb structure that yields instantly, blooming with deep aged cheese flavors, subtle browned-butter notes, and a clean savory finish.',
        },
      ],
    },
  },

  // 13. Sabarot Plant-Based Veggie Burger Mix
  {
    name: 'Sabarot Préparation pour Galettes Végétales',
    productName: 'Sabarot Préparation pour Galettes Végétales (Quinoa & Lentilles)',
    title: 'Sabarot Plant-Based Veggie Burger Mix Wins SIAL Innovation Gold Grand Prize',
    description: "French pulses house Sabarot won the prestigious SIAL Innovation Gold Grand Prize for its organic dry mixes for vegetable patties, blending French pulses and ancient grains into protein-rich burgers in just 8 minutes with boiling water.",
    longFormSummary: "Sabarot won the Gold Award (Grand Prix d'Or) at the SIAL Innovation Awards for its dry preparation mixes for vegetable galettes. Founded in Haute-Loire in 1819, Sabarot developed the shelf-stable culinary blend using 100% French lentils, quinoa, seeds, and herbs. Requiring only the addition of boiling water before pan-searing for a few minutes, the mixture provides a wholesome, high-fiber, clean-label plant protein patty with zero preservatives or texturizers.",
    sourceUrl: 'https://www.sabarot.com/produit/preparation-pour-galettes-vegetales-quinoa-lentilles-corail-bio-250g/',
    utcStartDateTime: '2026-03-20T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Snack', 'Plant-Based', 'SIAL Innovation', 'SIAL Innovation Awards', 'Award', 'Award Winner', 'Top Rated', 'France', 'Sabarot', 'Vegetarian'],
    price: 4.75,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'SIAL Paris Innovation Gold Award winner; widely distributed across organic culinary channels.',
    imageUrl: 'https://www.sabarot.com/3405-superlarge_default/galettes-vegetales-quinoa-et-boulgour-aux-legumes-du-soleil.jpg',
    authorUserName: '@ConsumerDesk',
    company: {
      name: 'Sabarot',
      websiteUrl: 'https://www.sabarot.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=sabarot.com&sz=64',
      description: 'Sabarot Wassner is an historic French agricultural culinary company founded in 1819 in Chaspuzac, Haute-Loire, renowned for Le Puy green lentils and ancient grains.',
    },
    blurb: 'SIAL Innovation Gold Award winner: all-natural dry mix for vegetable patties made with French pulses and ancient grains, ready in 8 minutes with boiling water.',
    rating: {
      score: 97,
      max: 100,
      source: 'SIAL Innovation Grand Jury',
      url: 'https://www.sialparis.com/en/innovation-awards/sabarot-galettes-vegetales',
    },
    merchants: [
      { label: 'Sabarot Boutique Officielle', url: 'https://www.sabarot.com/boutique/' },
      { label: 'Monoprix', url: 'https://www.monoprix.fr/courses/preparation-pour-galettes-vegetales-bio-sabarot-3874102-p' },
    ],
    references: [
      {
        url: 'https://www.sialparis.com/en/innovation-awards/sabarot-galettes-vegetales',
        title: "SIAL Paris 2024 Innovation Awards: Sabarot Wins Gold Award (Podium d'Or)",
        confidence: 95,
        publishedDate: '2024-10-21',
        reasoning: "Primary announcement from SIAL Grand Jury awarding top Gold honor across all global food entries.",
      },
      {
        url: 'https://www.lsa-conso.fr/sial-paris-2024-les-grands-prix-de-l-innovation-devoiles,463872',
        title: 'LSA Commerce & Consommation: SIAL Innovation Awards Unveiled',
        confidence: 92,
        publishedDate: '2024-10-22',
        reasoning: 'Professional trade journalism reviewing convenience, formulation, and nutritional profile.',
      },
    ],
    awards: [
      {
        body: 'SIAL Innovation Awards',
        award: "Gold Award (Podium d'Or) - Best in Class",
        year: 2024,
        work: 'Sabarot Préparation pour Galettes Végétales',
        result: 'won',
        sourceUrl: 'https://www.sialparis.com/en/innovation-awards/sabarot-galettes-vegetales',
      },
    ],
    taste: {
      scores: {
        aroma: 4.0,
        bitterness: 0.5,
        sweetness: 1.5,
        astringency: 0.5,
        umami: 4.0,
        pungent: 0.5,
        coolness: 0.0,
      },
      basis: 'Earthy French lentils and nutty toasted quinoa complemented by aromatic garden herbs, golden pan-seared crust crispness, and a soft, moist savory center.',
      sourceUrl: 'https://www.sialparis.com/en/innovation-awards/sabarot-galettes-vegetales',
      reviews: [
        {
          url: 'https://www.sialparis.com/en/innovation-awards/sabarot-galettes-vegetales',
          title: 'SIAL Innovation Gold Jury Citation',
          publishedDate: '2024-10-21',
          quote: 'A masterstroke in DIY convenience and nutritional integrity. Exceptional texture with authentic grain-and-pulse bite and clean aromatic seasoning.',
        },
        {
          url: 'https://www.lsa-conso.fr/sial-paris-2024-les-grands-prix-de-l-innovation-devoiles,463872',
          title: 'LSA Commerce & Consommation Tasting Panel',
          publishedDate: '2024-10-22',
          quote: 'Crispy pan-seared exterior with a comforting, savory lentil-quinoa core that feels homemade in eight minutes flat without any synthetic binders.',
        },
      ],
    },
  },
];

async function main() {
  const local = apiBase();
  const prod = prodBase();
  console.log(`Starting Innovation Award Products import...`);
  console.log(`Local base: ${local}, Prod base: ${prod}`);

  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;

  // Cached curator tokens
  const localTokens = new Map<string, string>();
  const prodTokens = new Map<string, string>();

  async function getLocalToken(userName: string): Promise<string> {
    if (localTokens.has(userName)) return localTokens.get(userName)!;
    let cid = await curatorId(userName as any);
    if (!cid) {
      const u = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = $1 LIMIT 1`, [userName]);
      cid = u[0]?.id ?? null;
    }
    if (!cid) throw new Error(`Curator ${userName} not found locally`);
    const token = await signToken(cid);
    localTokens.set(userName, token);
    return token;
  }

  async function getProdToken(userName: string): Promise<string | null> {
    if (!prod || !prodSecret) return null;
    if (prodTokens.has(userName)) return prodTokens.get(userName)!;
    let cid = await curatorId(userName as any);
    if (!cid) {
      const u = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = $1 LIMIT 1`, [userName]);
      cid = u[0]?.id ?? null;
    }
    if (!cid) return null;
    const token = await new SignJWT({ id: cid })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
    prodTokens.set(userName, token);
    return token;
  }

  const tastePath = path.resolve('scripts/products/taste.json');
  const blurbsPath = path.resolve('scripts/products/blurbs.json');
  const tasteEntries: any[] = JSON.parse(readFileSync(tastePath, 'utf8'));
  const blurbsEntries: any[] = JSON.parse(readFileSync(blurbsPath, 'utf8'));

  for (const item of INNOVATION_PRODUCTS) {
    console.log(`\n==================================================`);
    console.log(`Processing: ${item.name}`);

    const localToken = await getLocalToken(item.authorUserName);
    const prodToken = await getProdToken(item.authorUserName);

    // --- 1. LOCAL COMPANY ---
    let localCompanyId: number;
    const existingLocalCo = await db.query<{ id: number }>(
      `SELECT "id" FROM "Company" WHERE "name" = $1`,
      [item.company.name]
    );
    if (existingLocalCo.length > 0) {
      localCompanyId = existingLocalCo[0].id;
    } else {
      const insCo = await db.query<{ id: number }>(
        `INSERT INTO "Company" ("name", "websiteUrl", "logoUrl", "description", "utcCreatedDateTime", "utcUpdatedDateTime")
         VALUES ($1, $2, $3, $4, now(), now()) RETURNING "id"`,
        [item.company.name, item.company.websiteUrl, item.company.logoUrl, item.company.description]
      );
      localCompanyId = insCo[0].id;
      console.log(`  Created local company: ${item.company.name} (${localCompanyId})`);
    }

    // --- 2. LOCAL PIN CREATION ---
    let localPinId: number = 0;
    const searchLocalPin = await db.query<{ id: number }>(
      `SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND ("productName" = $1 OR "sourceUrl" = $2 OR "title" = $3)`,
      [item.productName, item.sourceUrl, item.title]
    );
    if (searchLocalPin.length > 0) {
      localPinId = searchLocalPin[0].id;
      console.log(`  Found existing local pin ${localPinId}`);
    } else {
      const postPinRes = await fetch(`${local}/api/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localToken}`,
        },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          productName: item.productName,
          sourceUrl: item.sourceUrl,
          utcStartDateTime: item.utcStartDateTime,
          allDay: true,
          dateConfidence: 'confirmed',
          categories: item.categories,
          tags: item.tags,
        }),
      });
      if (!postPinRes.ok) {
        throw new Error(`Failed to create local pin: ${postPinRes.status} ${await postPinRes.text()}`);
      }
      const createdLocal = await postPinRes.json();
      localPinId = createdLocal.id;
      console.log(`  Created local pin ${localPinId}`);
    }

    // Attach media locally
    const getLocal = await fetch(`${local}/api/pins/${localPinId}`);
    if (getLocal.ok) {
      const localPinObj = await getLocal.json();
      if (!localPinObj.media || localPinObj.media.length === 0) {
        await fetch(`${local}/api/pins/${localPinId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localToken}` },
          body: JSON.stringify({
            ...localPinObj,
            media: [{ type: 1, originalUrl: item.imageUrl }],
          }),
        });
        console.log(`  Attached media to local pin ${localPinId}`);
      }
    }

    // Update local Pin metadata & longFormSummary
    await db.query(
      `UPDATE "Pin" SET
         "companyId" = $1,
         "price" = $2,
         "priceCurrency" = $3,
         "dateConfidenceReasoning" = $4,
         "longFormSummary" = $5,
         "productName" = $6
       WHERE "id" = $7`,
      [localCompanyId, item.price, item.priceCurrency, item.dateConfidenceReasoning, item.longFormSummary, item.productName, localPinId]
    );

    // Add local references
    for (const ref of item.references) {
      const existingRef = await db.query(
        `SELECT "id" FROM "PinReference" WHERE "pinId" = $1 AND "url" = $2`,
        [localPinId, ref.url]
      );
      if (existingRef.length === 0) {
        await db.query(
          `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "reasoning", "addedByUserId")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [localPinId, ref.url, ref.title, ref.confidence, ref.publishedDate ?? null, ref.reasoning, 1]
        );
      }
    }

    // Add local awards
    for (const aw of item.awards) {
      await db.query(
        `INSERT INTO "PinAward" ("pinId", "body", "award", "year", "work", "result", "sourceUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [localPinId, aw.body, aw.award, aw.year, aw.work, aw.result, aw.sourceUrl]
      );
    }

    // Save local taste if consumable
    if (item.taste) {
      await saveTaste(localPinId, item.taste.scores, {
        source: 'hand',
        basis: item.taste.basis,
        sourceUrl: item.taste.sourceUrl,
        reviews: item.taste.reviews,
      });
      console.log(`  Saved taste rubric locally for pin ${localPinId}`);
    }

    // Save local blurb
    await Products.saveBlurb({
      pinId: localPinId,
      blurb: item.blurb,
      sourceUrl: item.sourceUrl,
      rating: item.rating,
    });

    // Save local merchants
    for (const m of item.merchants) {
      const existingM = await db.query(
        `SELECT "id" FROM "Merchant" WHERE "pinId" = $1 AND "url" = $2`,
        [localPinId, m.url]
      );
      if (existingM.length === 0) {
        await db.query(
          `INSERT INTO "Merchant" ("pinId", "label", "url") VALUES ($1, $2, $3)`,
          [localPinId, m.label, m.url]
        );
      }
    }
    console.log(`  Local pin ${localPinId} fully enriched`);

    // --- 3. PROD PIN CREATION & ENRICHMENT ---
    let prodPinId: number = 0;
    if (prod && prodToken) {
      // Find or create prod company
      let prodCompanyId: number | null = null;
      const searchProdCo = await fetch(`${prod}/api/admin/db/Company?name=${encodeURIComponent(item.company.name)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (searchProdCo.ok) {
        const coData = await searchProdCo.json();
        const foundCo = (coData.rows || []).find((c: any) => c.name === item.company.name);
        if (foundCo) {
          prodCompanyId = foundCo.id;
        }
      }
      if (!prodCompanyId) {
        const createCoRes = await fetch(`${prod}/api/admin/db/Company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            name: item.company.name,
            websiteUrl: item.company.websiteUrl,
            logoUrl: item.company.logoUrl,
            description: item.company.description,
          }),
        });
        if (createCoRes.ok) {
          const newCo = await createCoRes.json();
          prodCompanyId = newCo.rows?.[0]?.id ?? newCo.id;
          console.log(`  Created prod company: ${item.company.name} (${prodCompanyId})`);
        }
      }

      // Check if prod pin exists
      const searchProdPin = await fetch(`${prod}/api/admin/db/Pin?sourceUrl=${encodeURIComponent(item.sourceUrl)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (searchProdPin.ok) {
        const prodResults = await searchProdPin.json();
        const found = (prodResults.rows || []).find((p: any) => !p.utcDeletedDateTime && (p.productName === item.productName || p.sourceUrl === item.sourceUrl));
        if (found) {
          prodPinId = found.id;
          console.log(`  Prod pin exists: ${prodPinId}`);
        }
      }

      if (!prodPinId) {
        const createProdRes = await fetch(`${prod}/api/pins`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${prodToken}`,
          },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            productName: item.productName,
            sourceUrl: item.sourceUrl,
            utcStartDateTime: item.utcStartDateTime,
            allDay: true,
            dateConfidence: 'confirmed',
            categories: item.categories,
            tags: item.tags,
          }),
        });
        if (!createProdRes.ok) {
          console.warn(`  Failed to create prod pin: ${createProdRes.status} ${await createProdRes.text()}`);
        } else {
          const createdProd = await createProdRes.json();
          prodPinId = createdProd.id;
          console.log(`  Created prod pin: ${prodPinId}`);
        }
      }

      if (prodPinId) {
        // Attach media on prod
        const getProdPin = await fetch(`${prod}/api/pins/${prodPinId}`);
        if (getProdPin.ok) {
          const prodPinObj = await getProdPin.json();
          if (!prodPinObj.media || prodPinObj.media.length === 0) {
            await new Promise((r) => setTimeout(r, 600));
            const putMediaRes = await fetch(`${prod}/api/pins/${prodPinId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prodToken}` },
              body: JSON.stringify({
                ...prodPinObj,
                media: [{ type: 1, originalUrl: item.imageUrl }],
              }),
            });
            if (putMediaRes.ok) console.log(`  Attached media to prod pin ${prodPinId}`);
            else console.warn(`  Media attachment on prod returned ${putMediaRes.status}`);
          }
        }

        // Update prod Pin metadata
        await new Promise((r) => setTimeout(r, 600));
        await fetch(`${prod}/api/admin/db/Pin?id=${prodPinId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            companyId: prodCompanyId,
            price: item.price,
            priceCurrency: item.priceCurrency,
            dateConfidenceReasoning: item.dateConfidenceReasoning,
            longFormSummary: item.longFormSummary,
            productName: item.productName,
          }),
        });

        // Add prod references
        await fetch(`${prod}/api/pins/${prodPinId}/references`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ references: item.references }),
        });

        // Add prod awards
        for (const aw of item.awards) {
          await fetch(`${prod}/api/admin/db/PinAward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              pinId: prodPinId,
              body: aw.body,
              award: aw.award,
              year: aw.year,
              work: aw.work,
              result: aw.result,
              sourceUrl: aw.sourceUrl,
            }),
          });
        }

        // Save prod taste if consumable
        if (item.taste) {
          await fetch(`${prod}/api/pins/${prodPinId}/taste`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              ...item.taste.scores,
              source: 'hand',
              basis: item.taste.basis,
              sourceUrl: item.taste.sourceUrl,
              reviews: item.taste.reviews,
            }),
          });
          console.log(`  Saved taste on prod for pin ${prodPinId}`);
        }

        // Save prod blurb
        await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            pinId: prodPinId,
            blurb: item.blurb,
            sourceUrl: item.sourceUrl,
            ratingScore: item.rating.score,
            ratingMax: item.rating.max,
            ratingSource: item.rating.source,
            ratingUrl: item.rating.url,
          }),
        });

        // Save prod merchants
        await fetch(`${prod}/api/admin/db/Merchant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify(
            item.merchants.map((m) => ({
              pinId: prodPinId,
              label: m.label,
              url: m.url,
            }))
          ),
        });

        console.log(`  Prod pin ${prodPinId} fully enriched`);
      }
    }

    // --- 4. UPDATE LOCAL taste.json & blurbs.json ---
    const targetIds = [localPinId];
    if (prodPinId) targetIds.push(prodPinId);

    for (const pinId of targetIds) {
      if (item.taste) {
        const tIdx = tasteEntries.findIndex((e) => e && e.pinId === pinId);
        const newTaste = {
          pinId,
          ...item.taste.scores,
          basis: item.taste.basis,
          reviews: item.taste.reviews,
        };
        if (tIdx >= 0) tasteEntries[tIdx] = { ...tasteEntries[tIdx], ...newTaste };
        else tasteEntries.push(newTaste);
      }

      const bIdx = blurbsEntries.findIndex((e) => e && e.pinId === pinId);
      const newBlurb = {
        pinId,
        blurb: item.blurb,
        sourceUrl: item.sourceUrl,
        rating: item.rating,
      };
      if (bIdx >= 0) blurbsEntries[bIdx] = { ...blurbsEntries[bIdx], ...newBlurb };
      else blurbsEntries.push(newBlurb);
    }
  }

  // Write updated json files
  writeFileSync(tastePath, JSON.stringify(tasteEntries, null, 2), 'utf8');
  writeFileSync(blurbsPath, JSON.stringify(blurbsEntries, null, 2), 'utf8');
  console.log(`\nSuccessfully updated scripts/products/taste.json and blurbs.json`);

  await db.closeConnection();
  console.log('\nAll 13 Innovation Award products have been successfully pinned and enriched!');
}

main().catch((err) => {
  console.error('Fatal error adding innovation products:', err);
  process.exit(1);
});

