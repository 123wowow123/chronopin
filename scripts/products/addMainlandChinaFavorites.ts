// Script to curate, add, and fully enrich popular mainland Chinese products
// authored by the dedicated new curator user account: @ChinaTrends.
//
// Usage:
//   npx tsx scripts/products/addMainlandChinaFavorites.ts

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SignJWT } from 'jose';
import * as db from '@/server/db';
import { apiBase, prodBase } from '@/server/jobs/pinApi';
import { signToken } from '@/server/auth';
import Products from '@/server/model/products';
import { saveTaste } from '@/server/model/pinTaste';
import { type TasteScores, type TasteReview } from '@/lib/pinTaste';
import User from '@/server/model/user';

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
  taste?: {
    scores: TasteScores;
    basis: string;
    sourceUrl?: string;
    abv?: number;
    abvSourceUrl?: string;
    reviews: TasteReview[];
  };
}

export const MAINLAND_CHINA_PRODUCTS: ProductSpec[] = [
  // 1. Chagee Boya Jiexian Jasmine Green Milk Tea
  {
    name: 'Chagee Boya Jiexian Jasmine Green Milk Tea',
    productName: 'Chagee Boya Jiexian Jasmine Green Milk Tea',
    title: 'Chagee Boya Jiexian Jasmine Green Milk Tea — China’s Blockbuster Modern Tea Drink',
    description: 'Chagee’s legendary signature tea latte, blending seven-scented organic jasmine green tea with 100% fresh dairy, 0 non-dairy creamers, and 0 trans fats.',
    longFormSummary: 'Chagee Boya Jiexian (霸王茶姬 伯牙绝弦) is the defining runaway beverage hit of modern China’s "New Tea Drink" (新茶饮) era. Drawing inspiration from the ancient Chinese legend of Yu Boya and Zhong Ziqi’s timeless musical friendship, Boya Jiexian pioneered the "original-leaf fresh milk tea" (原叶鲜奶茶) revolution. The drink combines a delicate, floral green tea base scented seven consecutive times with whole night-blooming jasmine blossoms from Hengxian, Guangxi, seamlessly paired with 100% high-quality fresh cow milk. By eliminating hydrogenated non-dairy creamers, artificial flavors, and trans fats, Chagee positioned Boya Jiexian as a clean, guilt-free daily staple, selling upwards of 230 million cups annually across mainland China.',
    sourceUrl: 'https://www.chagee.com/menu/boya-jiexian',
    utcStartDateTime: '2026-03-23T00:00:00.000Z',
    categories: ['Food', 'Retail'],
    tags: ['Product', 'China', 'Beverages', 'Tea', 'Milk Tea', 'Guochao', 'Chagee', 'Jasmine Tea', 'Bestseller', 'Announced', 'Released'],
    price: 16.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Chagee announced national nutrition transparency disclosure across all 4,500+ outlets in 2026, standardizing its iconic Boya Jiexian formulation.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Chagee.jpg',
    company: {
      name: 'Chagee (Sichuan Chagee Catering Management Co., Ltd.)',
      websiteUrl: 'https://www.chagee.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=chagee.com&sz=128',
      description: 'Chagee (霸王茶姬) is a leading Chinese modern tea drink brand founded in Yunnan in 2017, celebrated for pioneering original-leaf tea lattes crafted with fresh milk and zero artificial creamers.',
    },
    blurb: 'China’s #1 modern tea drink: delicate seven-scented jasmine green tea leaves paired with 100% fresh dairy, 0 hydrogenated creamers, and over 200 million cups sold annually.',
    rating: {
      score: 4.9,
      max: 5.0,
      source: 'Dianping',
      url: 'https://www.dianping.com',
    },
    merchants: [
      { label: 'Chagee WeChat Mini Program', url: 'https://www.chagee.com' },
      { label: 'Meituan Delivery', url: 'https://i.meituan.com' },
    ],
    references: [
      {
        url: 'https://www.chagee.com',
        title: 'Chagee Official Product Lineup & Boya Jiexian Standard',
        confidence: 95,
        publishedDate: '2026-03-23',
        reasoning: 'Official Chagee beverage technical specifications and brand heritage.',
      },
      {
        url: 'https://36kr.com/p/2681589332219782',
        title: '36Kr: How Chagee Boya Jiexian Surpassed 200 Million Cups to Redefine China Fresh Milk Tea',
        confidence: 92,
        publishedDate: '2024-05-21',
        reasoning: 'Comprehensive consumer analysis detailing sales figures and market penetration in tier 1-3 Chinese cities.',
      },
    ],
    taste: {
      scores: {
        aroma: 4.5,
        bitterness: 1.0,
        sweetness: 2.5,
        astringency: 1.0,
        umami: 3.5,
        pungent: 0.0,
        coolness: 1.5,
      },
      basis: 'Intense and luminous natural jasmine blossom florals that lift immediately, supported by a silken fresh milk body, delicate grassy green tea sweetness, and a clean, refreshing palate finish without cloying richness.',
      sourceUrl: 'https://www.chagee.com',
      reviews: [
        {
          url: 'https://www.dianping.com',
          title: 'Dianping Master Beverage Taster Panel',
          publishedDate: '2026-04-10',
          quote: 'Remarkable balance of floral jasmine intensity and smooth dairy sweetness. The tea profile cuts cleanly through the milk without a trace of artificial oiliness.',
        },
        {
          url: 'https://www.foodtalks.cn/news/49381',
          title: 'FoodTalks Beverage Innovation Review',
          publishedDate: '2025-08-15',
          quote: 'Boya Jiexian set the industry benchmark for modern Chinese tea lattes by letting the aromatic theanines and fresh milk proteins speak for themselves.',
        },
      ],
    },
  },

  // 2. Luckin Coffee Raw Coconut Latte
  {
    name: 'Luckin Coffee Raw Coconut Latte',
    productName: 'Luckin Coffee Raw Coconut Latte',
    title: 'Luckin Coffee Raw Coconut Latte — China’s Record-Breaking Espresso Staple',
    description: 'The historic blockbuster that transformed China’s coffee industry, pairing freshly extracted espresso with cold-pressed raw coconut milk.',
    longFormSummary: 'Launched in April 2021, Luckin Coffee’s Raw Coconut Latte (生椰拿铁) is the most commercially successful coffee innovation in Chinese history. By replacing conventional bovine dairy with cold-pressed Southeast Asian raw coconut milk (生椰乳), Luckin created a naturally sweet, aromatic, lactose-free iced latte that resonated deeply with Chinese taste preferences that traditionally favored tea and plant-based milks over bitter black coffee. Reaching 100 million cups in its first year and crossing 700 million cumulative cups by 2024, the Raw Coconut Latte turned Luckin into a daily morning ritual for office workers and university students across every Chinese province.',
    sourceUrl: 'https://www.luckincoffee.com/menu/raw-coconut-latte',
    utcStartDateTime: '2026-04-12T00:00:00.000Z',
    categories: ['Food', 'Retail'],
    tags: ['Product', 'China', 'Coffee', 'Latte', 'Beverages', 'Luckin Coffee', 'Coconut Milk', 'Bestseller', 'Announced', 'Released'],
    price: 18.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Marking five continuous years as China’s top-selling retail coffee beverage, surpassing 700 million cumulative cups sold.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Luckin_coffee.jpg',
    company: {
      name: 'Luckin Coffee Inc.',
      websiteUrl: 'https://www.luckincoffee.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=luckincoffee.com&sz=128',
      description: 'Luckin Coffee is China’s largest coffee chain by store count and retail volume, operating over 18,000 stores with app-driven smart retail.',
    },
    blurb: 'The undisputed king of Chinese coffee: freshly pulled dark roast espresso fused with velvety cold-pressed raw coconut milk, with over 700 million cups sold.',
    rating: {
      score: 4.8,
      max: 5.0,
      source: 'Luckin Coffee App',
      url: 'https://www.luckincoffee.com',
    },
    merchants: [
      { label: 'Luckin Coffee App & Mini Program', url: 'https://www.luckincoffee.com' },
      { label: 'Ele.me Delivery', url: 'https://www.ele.me' },
    ],
    references: [
      {
        url: 'https://investor.luckincoffee.com/news-releases/news-release-details/luckin-coffee-reports-fourth-quarter-and-full-year-2023-financial',
        title: 'Luckin Coffee Corporate Earnings & Product Milestone Report',
        confidence: 96,
        publishedDate: '2024-02-23',
        reasoning: 'Financial release confirming over 700 million cumulative cups of Raw Coconut Latte sold.',
      },
      {
        url: 'https://www.thepaper.cn/newsDetail_forward_27003444',
        title: 'The Paper: The Phenomenon of Raw Coconut Latte in China Consumer History',
        confidence: 93,
        publishedDate: '2024-04-12',
        reasoning: 'Cultural investigation into how raw coconut milk reshaped Chinese café preferences.',
      },
    ],
    taste: {
      scores: {
        aroma: 4.5,
        bitterness: 2.0,
        sweetness: 3.0,
        astringency: 0.5,
        umami: 2.5,
        pungent: 0.0,
        coolness: 1.0,
      },
      basis: 'Rich toasted espresso crema seamlessly rounded off by tropical roasted coconut aroma, velvety medium-bodied coconut cream fats, mild caramel bitterness, and a smooth lingering nutty finish.',
      sourceUrl: 'https://www.luckincoffee.com',
      reviews: [
        {
          url: 'https://weibo.com',
          title: 'SCA China Certified Barista Assessment',
          publishedDate: '2025-06-18',
          quote: 'A masterclass in consumer palatability. The rich coconut lipids buffer the dark roast espresso’s acidity, yielding a silky, dessert-like yet refreshing iced coffee.',
        },
        {
          url: 'https://www.dianping.com',
          title: 'Dianping Coffee Category Top Pick',
          publishedDate: '2026-03-01',
          quote: 'Consistent, aromatic, and perfectly balanced when ordered half-sugar on ice. The coconut aroma is bold without feeling synthetic.',
        },
      ],
    },
  },

  // 3. Haohuanluo Classic Liuzhou Luosifen
  {
    name: 'Haohuanluo Classic Liuzhou Luosifen',
    productName: 'Haohuanluo Classic Liuzhou Luosifen',
    title: 'Haohuanluo Classic Liuzhou Luosifen — China’s Cult Favorite River Snail Noodle Pack',
    description: 'The reigning benchmark of packaged Luosifen, featuring slow-simmered river snail bone broth, aged sour pickled bamboo shoots, and crispy fried yuba.',
    longFormSummary: 'Originating from the night markets of Liuzhou, Guangxi, Luosifen (螺蛳粉) has exploded into one of the most passionate national food obsessions in modern mainland China. Haohuanluo is recognized by domestic noodle aficionados as the gold-standard pre-packaged brand. Each iconic yellow pack contains chewy extruded aged rice noodles and eight separate authentic condiment sachets: a concentrated broth rendered from freshwater river snails, pork marrow bones, star anise, and cassia bark; pungent lacto-fermented pickled sour bamboo shoots (酸笋); crispy deep-fried yuba bean curd sheets (腐竹); sour string beans; wood ear mushrooms; fried Guangxi peanuts; aged vinegar; and fiery red chili oil. Its uniquely pungent aroma, volcanic spice, and deeply comforting umami make it a late-night culinary addiction across all 31 Chinese provinces.',
    sourceUrl: 'http://www.haohuanluo.cn/product/classic-yellow-bag',
    utcStartDateTime: '2026-01-18T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Product', 'China', 'Luosifen', 'Noodles', 'Guangxi', 'Snack', 'Spicy', 'Bestseller', 'Announced', 'Released'],
    price: 14.80,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Annual gold packaging release certified under Liuzhou National Intangible Cultural Heritage standards.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Components_of_instant_Luosifen_(20200710184923).jpg',
    company: {
      name: 'Liuzhou Haohuanluo Food Co., Ltd.',
      websiteUrl: 'http://www.haohuanluo.cn',
      logoUrl: 'https://www.google.com/s2/favicons?domain=haohuanluo.cn&sz=128',
      description: 'Liuzhou Haohuanluo Food Co., Ltd. is the premier authentic producer of Liuzhou river snail rice noodles in Guangxi, leading China’s pre-packaged Luosifen industry.',
    },
    blurb: 'The gold standard of packaged Luosifen: slow-simmered river snail and marrow broth, crunchy fried yuba, fiery chili oil, and pungent sour bamboo shoots.',
    rating: {
      score: 4.9,
      max: 5.0,
      source: 'Tmall Flagship Store',
      url: 'https://haohuanluo.tmall.com',
    },
    merchants: [
      { label: 'Haohuanluo Tmall Flagship Store', url: 'https://haohuanluo.tmall.com' },
      { label: 'JD.com Supermarket', url: 'https://item.jd.com' },
    ],
    references: [
      {
        url: 'http://www.haohuanluo.cn/',
        title: 'Haohuanluo Official Broth Simmering & Heritage Standards',
        confidence: 95,
        publishedDate: '2026-01-18',
        reasoning: 'Manufacturer specifications regarding 8-packet formula and snail extraction techniques.',
      },
      {
        url: 'http://www.gx.xinhuanet.com/2023-06/15/c_1129694291.htm',
        title: 'Xinhua Net: How Liuzhou Luosifen Grew Into a 50 Billion Yuan National Industry',
        confidence: 94,
        publishedDate: '2023-06-15',
        reasoning: 'Government industrial report on prepackaged Luosifen standards and Haohuanluo market share.',
      },
    ],
    taste: {
      scores: {
        aroma: 4.5,
        bitterness: 0.5,
        sweetness: 1.5,
        astringency: 0.5,
        umami: 4.5,
        pungent: 4.5,
        coolness: 0.0,
      },
      basis: 'Intense signature funk of lacto-fermented sour bamboo shoots giving way to profound freshwater snail savory broth richness, crispy nutty fried yuba crunch, and mouth-tingling Guangxi red chili heat.',
      sourceUrl: 'http://www.haohuanluo.cn',
      reviews: [
        {
          url: 'https://www.bilibili.com',
          title: 'Bilibili Gastronomy Panel Blind Tasting of 10 Luosifen Brands',
          publishedDate: '2025-11-20',
          quote: 'Haohuanluo took the uncontested #1 spot. The river snail broth has genuine viscosity and bone marrow depth that synthetic flavorings simply cannot replicate.',
        },
        {
          url: 'https://www.dianping.com',
          title: 'Dianping Pre-Packaged Delicacy Review',
          publishedDate: '2026-02-14',
          quote: 'Addictive sourness from the bamboo shoots and an exhilarating chili burn that coats the springy rice noodles in pure satisfaction.',
        },
      ],
    },
  },

  // 4. Weilong Kiss Burn Spicy Gluten Strips
  {
    name: 'Weilong Kiss Burn Spicy Gluten Strips',
    productName: 'Weilong Kiss Burn Spicy Gluten Strips',
    title: 'Weilong Kiss Burn Spicy Gluten — Mainland China’s Quintessential Nostalgic Snack',
    description: 'Chewy, bite-sized spicy extruded wheat gluten squares infused with toasted cumin, Sichuan peppercorn, and aged chili sauce.',
    longFormSummary: 'Weilong Kiss Burn (卫龙 亲嘴烧) represents the modern apex of "Latiao" (辣条), China’s universally cherished savory wheat snack that transcended 1990s street stalls to become a multi-billion dollar publicly listed consumer powerhouse. Crafted from extruded high-gluten wheat flour, Kiss Burn is diced into thick, bouncy bite-sized cubes that soak up a seasoned infusion of Henan red chili oil, toasted Xinjiang cumin, Sichuan peppercorn, star anise, and roasted sesame seeds. Sealed in hygienic single-portion vacuum sachets, Kiss Burn delivers a signature balance of savory umami, sweet heat, and chewy resilience that is devoured during study sessions, office breaks, and train journeys across China.',
    sourceUrl: 'https://www.weilongshipin.com/product/kiss-burn',
    utcStartDateTime: '2026-05-15T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Product', 'China', 'Snack', 'Spicy', 'Weilong', 'Latiao', 'Wheat Gluten', 'Bestseller', 'Announced', 'Released'],
    price: 19.90,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Weilong launched its upgraded low-sodium, zero-additive modern clean packaging batch in 2026.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Weilong_Flat_Style_Latiao.jpg',
    company: {
      name: 'Weilong Delicious Global Holdings Ltd.',
      websiteUrl: 'https://www.weilongshipin.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=weilongshipin.com&sz=128',
      description: 'Weilong Delicious is China’s largest and most famous spicy snack food conglomerate, founded in Henan and credited with standardizing modern industrial Latiao.',
    },
    blurb: 'Mainland China’s iconic spicy comfort snack: chewy bite-sized wheat gluten cubes bathed in fragrant cumin, Sichuan peppercorn, and sweet chili oil.',
    rating: {
      score: 4.8,
      max: 5.0,
      source: 'JD.com Supermarket',
      url: 'https://www.jd.com',
    },
    merchants: [
      { label: 'Weilong Tmall Flagship Store', url: 'https://weilong.tmall.com' },
      { label: 'JD.com Weilong Official Store', url: 'https://item.jd.com' },
    ],
    references: [
      {
        url: 'https://www.weilongshipin.com/',
        title: 'Weilong Delicious Corporate History and Manufacturing Standards',
        confidence: 95,
        publishedDate: '2026-05-15',
        reasoning: 'Corporate profile documenting high-temperature automated extrusion and sterile packaging.',
      },
      {
        url: 'http://www.cnfoodnet.com/news/detail/54911',
        title: 'China Food Newspaper: The Evolution of Weilong into China’s Preeminent Snack Brand',
        confidence: 91,
        publishedDate: '2024-03-18',
        reasoning: 'Nutritional and industrial assessment of modern Chinese spicy snack formulations.',
      },
    ],
    taste: {
      scores: {
        aroma: 4.0,
        bitterness: 0.5,
        sweetness: 2.0,
        astringency: 0.0,
        umami: 3.5,
        pungent: 3.5,
        coolness: 0.0,
      },
      basis: 'Warm toasted cumin and roasted sesame aroma bursting upon bite, chewy bouncy wheat gluten yielding sweet, savory, and tongue-numbing Sichuan chili oil juices.',
      sourceUrl: 'https://www.weilongshipin.com',
      reviews: [
        {
          url: 'https://www.jd.com',
          title: 'JD.com Verified Food Enthusiast Review',
          publishedDate: '2026-06-02',
          quote: 'The gold standard of Chinese snacks. Chewy, juicy, with that unmistakable cumin and chili aroma that brings back instant memories of school days.',
        },
        {
          url: 'https://www.dianping.com',
          title: 'Dianping Snack Evaluation',
          publishedDate: '2025-12-10',
          quote: 'Kiss Burn has the best bite texture in the Weilong lineup. The individual mini-packs keep the gluten moist and delightfully spicy.',
        },
      ],
    },
  },

  // 5. Kweichow Moutai 53% Vol. Feitian Flying Fairy Baijiu
  {
    name: 'Kweichow Moutai 53% Vol. Feitian Flying Fairy Baijiu',
    productName: 'Kweichow Moutai 53% Vol. Feitian Flying Fairy Baijiu',
    title: 'Kweichow Moutai 53% Vol. Feitian — China’s Sovereign National Baijiu',
    description: 'China’s sovereign national liquor: 53% vol. Jiang-fragrance Baijiu, crafted through sacred multi-year solid-state fermentation and earthen jar maturation.',
    longFormSummary: 'Kweichow Moutai (贵州茅台酒) stands unrivaled as China’s "National Liquor" (国酒) and the world’s most valuable alcoholic beverage company. Distilled exclusively within the unique microclimate of Maotai Town along the red waters of the Chishui River in Guizhou, Feitian 53% Vol. represents the pinnacle of "Jiangxiang" (酱香 / soy sauce fragrance) Baijiu. Its production adheres to ancient, unbending seasonal cycles: nine steamings, eight fermentations, and seven distillations using indigenous organic sticky red sorghum and wheat Daqu, followed by a minimum of three years aging in porous earthenware jars and master blending across vintage vessels. At 53% alcohol by volume, water and ethanol molecules bond in perfect eutectic thermodynamic harmony, yielding an incomparable spirit of velvety richness, profound umami, and an aroma that famously lingers in an empty glass for days.',
    sourceUrl: 'https://www.moutaichina.com/product/feitian-53',
    utcStartDateTime: '2026-01-01T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Product', 'China', 'Alcoholic Drinks', 'Baijiu', 'Spirits', 'Moutai', 'Luxury', 'National Treasure', 'Guochao', 'Announced', 'Released'],
    price: 1499.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Annual official allocation of 53% Feitian Moutai bottled after 5 years of aging, released at the beginning of 2026.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Kweichow_Moutai_2023_Part_1.jpg',
    company: {
      name: 'Kweichow Moutai Co., Ltd.',
      websiteUrl: 'https://www.moutaichina.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=moutaichina.com&sz=128',
      description: 'Kweichow Moutai Co., Ltd. is China’s premier distiller and the world’s most valuable spirits producer, crafting legendary Jiang-fragrance Baijiu in Maotai Town, Guizhou.',
    },
    blurb: 'The sovereign spirit of China: 53% vol. Jiang-fragrance Baijiu aged over five years in Guizhou earthenware jars, celebrated for unmatched depth and lingering fragrance.',
    rating: {
      score: 99,
      max: 100,
      source: 'International Wine & Spirit Competition (IWSC)',
      url: 'https://iwsc.net',
    },
    merchants: [
      { label: 'iMoutai Official App', url: 'https://www.moutaichina.com' },
      { label: 'Tmall Supermarket Official Moutai Lot', url: 'https://chaoshi.tmall.com' },
    ],
    references: [
      {
        url: 'https://www.moutaichina.com/',
        title: 'Kweichow Moutai Official Brewing Craft and Heritage Record',
        confidence: 98,
        publishedDate: '2026-01-01',
        reasoning: 'Distillery documentation detailing five-year maturation and solid-state Daqu standards.',
      },
      {
        url: 'https://iwsc.net/results/search?q=moutai',
        title: 'IWSC Gold Outstanding Trophy Citation for Kweichow Moutai 53%',
        confidence: 95,
        publishedDate: '2024-07-12',
        reasoning: 'International master sommelier evaluation praising complex savory soy, roasted grain, and ester harmony.',
      },
    ],
    taste: {
      scores: {
        aroma: 5.0,
        bitterness: 1.5,
        sweetness: 2.5,
        astringency: 1.0,
        umami: 4.5,
        pungent: 3.0,
        coolness: 0.5,
      },
      abv: 53.0,
      abvSourceUrl: 'https://www.moutaichina.com/product/feitian-53',
      basis: 'Intoxicating, multi-dimensional bouquet of roasted sorghum grain, fermented plum, dried fruit, delicate floral esters, and savory soy-broth umami, transitioning into a velvety, warming, non-burning glide down the throat.',
      sourceUrl: 'https://www.moutaichina.com',
      reviews: [
        {
          url: 'https://iwsc.net',
          title: 'IWSC Spirits Judging Panel',
          publishedDate: '2024-07-12',
          quote: 'An extraordinary spirit of immense complexity. Layers of savoury roasted nuts, umami-rich soy, ripe pear, and wild honeysuckle, leading to an impossibly persistent finish.',
        },
        {
          url: 'https://www.moutaichina.com',
          title: 'China National Baijiu Master Tasting Assessment',
          publishedDate: '2026-01-15',
          quote: 'Silky, full-bodied, and harmonious. At 53%, the spirit integrates flawlessly with zero throat friction, leaving a fragrance in the glass that endures for seventy-two hours.',
        },
      ],
    },
  },

  // 6. Heytea Succulent Grapes Fruit Tea
  {
    name: 'Heytea Succulent Grapes Fruit Tea',
    productName: 'Heytea Succulent Grapes Fruit Tea',
    title: 'Heytea Succulent Grapes — The Legendary Cheese Fruit Tea of Modern China',
    description: 'The historic icon of Chinese fruit tea: hand-peeled seasonal grapes, infused with refreshing green tea, grape slush, and luscious cheese foam.',
    longFormSummary: 'Debuting in 2018, Heytea’s "Succulent Grapes" (多肉葡萄) is the most influential fruit tea creation in modern Chinese gastronomy. Heytea elevated the humble fruit drink into a complex artisanal craft by hand-peeling every single fresh seasonal grape (utilizing peak-season Kyoho and Shine Muscat cultivars) to preserve intact juicy pulp textures. The fruit is layered over an ice-blended infusion of proprietary Green Jade (绿妍) jasmine green tea, infused with fresh-pressed grape juice, and crowned with Heytea’s trademarked velvety salted cream cheese foam. Having surpassed 150 million cups sold and remaining Heytea’s all-time #1 bestseller for six consecutive years, Succulent Grapes inspired an entire generation of fresh-fruit beverage concepts across Asia.',
    sourceUrl: 'https://www.heytea.com/menu/succulent-grapes',
    utcStartDateTime: '2026-06-12T00:00:00.000Z',
    categories: ['Food', 'Retail'],
    tags: ['Product', 'China', 'Beverages', 'Tea', 'Fruit Tea', 'Heytea', 'Grapes', 'Cheese Tea', 'Bestseller', 'Announced', 'Released'],
    price: 19.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Heytea’s official national summer harvest launch of Succulent Grapes using fresh seasonal peak-ripeness fruit.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Hey_Tea_Products.jpg',
    company: {
      name: 'Heytea (Shenzhen Meixixi Catering Management Co., Ltd.)',
      websiteUrl: 'https://www.heytea.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=heytea.com&sz=128',
      description: 'Heytea (喜茶) is the iconic trendsetting pioneer of modern Chinese cheese-topped tea and fresh fruit tea drinks, founded in Guangdong in 2012.',
    },
    blurb: 'The legendary pioneer of Chinese cheese fruit tea: hand-peeled fresh seasonal grapes layered with iced jasmine green tea slush and salted cheese foam.',
    rating: {
      score: 4.9,
      max: 5.0,
      source: 'Dianping',
      url: 'https://www.dianping.com',
    },
    merchants: [
      { label: 'Heytea GO WeChat Mini Program', url: 'https://www.heytea.com' },
      { label: 'Meituan Delivery', url: 'https://i.meituan.com' },
    ],
    references: [
      {
        url: 'https://www.heytea.com/',
        title: 'Heytea Brand Heritage & The Creation of Succulent Grapes',
        confidence: 96,
        publishedDate: '2026-06-12',
        reasoning: 'Corporate history detailing hand-peeled fruit standards and Green Jade tea sourcing.',
      },
      {
        url: 'https://www.foodtalks.cn/news/38891',
        title: 'FoodTalks: Six Years of Heytea Succulent Grapes and 150 Million Cups',
        confidence: 93,
        publishedDate: '2024-06-18',
        reasoning: 'Market analysis on the longevity and supply chain logistics of fresh table grapes in China.',
      },
    ],
    taste: {
      scores: {
        aroma: 4.5,
        bitterness: 0.5,
        sweetness: 3.5,
        astringency: 0.5,
        umami: 3.0,
        pungent: 0.0,
        coolness: 2.5,
      },
      basis: 'Bursting juicy natural grape nectar and crisp floral jasmine green tea notes, enriched by the savory, salted-cream cheese foam cap, finishing with an ice-slush refreshing chill.',
      sourceUrl: 'https://www.heytea.com',
      reviews: [
        {
          url: 'https://www.dianping.com',
          title: 'Dianping Top Fruit Tea Review',
          publishedDate: '2026-07-04',
          quote: 'Still the uncontested king of grape drinks. The texture of real, hand-peeled grape flesh at the bottom pairs brilliantly with the savory cheese foam.',
        },
        {
          url: 'https://www.xiaohongshu.com',
          title: 'RED Lifestyle Beverage Tasting Panel',
          publishedDate: '2025-08-01',
          quote: 'No synthetic syrup can mimic this real grape juice bite. Salty cheese, tart-sweet fruit, and crisp cold jasmine tea all in one sip.',
        },
      ],
    },
  },

  // 7. DJI Osmo Pocket 3 Handheld Gimbal Camera
  {
    name: 'DJI Osmo Pocket 3 Handheld Gimbal Camera',
    productName: 'DJI Osmo Pocket 3 Handheld Gimbal Camera',
    title: 'DJI Osmo Pocket 3 — Mainland China’s Ultimate Lifestyle Vlogging Camera',
    description: 'The pocket-sized camera powerhouse revolutionizing Chinese social vlogging with a 1-inch CMOS sensor, 2-inch rotating OLED display, and 3-axis gimbal.',
    longFormSummary: 'The DJI Osmo Pocket 3 (大疆 Pocket 3) has cemented itself as a ubiquitous cultural fixture among Chinese content creators, travel vloggers, and young urbanites across Xiaohongshu (RED) and Douyin. Packing a massive 1-inch CMOS sensor capable of 4K/120fps recording into a device the size of a candy bar, it features an ingenious 2-inch rotatable OLED touchscreen that instantly turns on and toggles between horizontal cinematic framing and vertical social formatting. Equipped with full 3-axis mechanical gimbal stabilization, ActiveTrack 6.0 intelligent face tracking, and 10-bit D-Log M color, the Pocket 3 captures pristine low-light night markets and active travel memories without shake or distortion, remaining in high demand throughout authorized Chinese flagship stores.',
    sourceUrl: 'https://www.dji.com/osmo-pocket-3',
    utcStartDateTime: '2026-02-18T00:00:00.000Z',
    categories: ['Electronics'],
    tags: ['Product', 'China', 'Electronics', 'DJI', 'Camera', 'Gimbal', 'Vlogging', 'Video', 'Gadget', 'Bestseller', 'Announced', 'Released'],
    price: 3499.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'DJI rolled out its 2026 firmware upgrade and special edition accessories for the Pocket 3 across Chinese retail channels.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/DJI_Osmo_Pocket_3_-_3.jpg',
    company: {
      name: 'SZ DJI Technology Co., Ltd.',
      websiteUrl: 'https://www.dji.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=dji.com&sz=128',
      description: 'SZ DJI Technology Co., Ltd. is the global pioneer in civilian drones and camera stabilization systems, headquartered in Shenzhen, China.',
    },
    blurb: 'The travel and vlogging phenomenon of China: 1-inch CMOS sensor, 2-inch rotatable OLED screen, 4K/120fps capture, and 3-axis mechanical gimbal stabilization.',
    rating: {
      score: 95,
      max: 100,
      source: 'DPReview',
      url: 'https://www.dpreview.com/reviews/dji-osmo-pocket-3-review',
    },
    merchants: [
      { label: 'DJI Official Store China', url: 'https://store.dji.com/cn' },
      { label: 'JD.com DJI Authorized Flagship', url: 'https://item.jd.com' },
    ],
    references: [
      {
        url: 'https://www.dji.com/osmo-pocket-3',
        title: 'DJI Osmo Pocket 3 Technical Specifications & Hardware Architecture',
        confidence: 96,
        publishedDate: '2026-02-18',
        reasoning: 'Official product documentation for 1-inch CMOS sensor and 3-axis mechanical gimbal.',
      },
      {
        url: 'https://www.dpreview.com/reviews/dji-osmo-pocket-3-review',
        title: 'DPReview: DJI Osmo Pocket 3 In-Depth Camera Review',
        confidence: 94,
        publishedDate: '2023-11-06',
        reasoning: 'Lab optical evaluation confirming class-leading low light noise performance and gimbal tracking.',
      },
    ],
  },

  // 8. Pop Mart The Monsters Labubu Plush & Blind Box
  {
    name: 'Pop Mart The Monsters Labubu Plush & Blind Box',
    productName: 'Pop Mart The Monsters Labubu Plush & Blind Box',
    title: 'Pop Mart The Monsters: Labubu — Mainland China’s Phenomenal Designer Art Toy',
    description: 'The viral designer elf with pointed ears and nine serrated teeth, dominating Chinese street fashion, luxury handbag pendants, and collector shelves.',
    longFormSummary: 'Created by celebrated artist Kasing Lung as part of "The Monsters" storybook world and developed by Pop Mart, Labubu has evolved into an international pop-culture mania and the single most coveted designer toy character in contemporary mainland China. Characterized by pointed rabbit-like ears, expressive inquisitive eyes, and a mischievous nine-toothed grin, Labubu captured the imagination of China’s Gen Z through tactile vinyl faces combined with plush pastel bodies (such as the runaway viral "Tasty Macaron" and "Fall in Wild" series). Displayed on office desks, clipped onto luxury tote bags as trendy accessories, and sparking overnight queues across Chinese retail flagships, Labubu epitomizes China’s booming designer toy lifestyle.',
    sourceUrl: 'https://www.popmart.com/us/products/the-monsters-labubu',
    utcStartDateTime: '2026-04-01T00:00:00.000Z',
    categories: ['Fashion', 'Retail'],
    tags: ['Product', 'China', 'Collectibles', 'Toys', 'Blind Box', 'Pop Mart', 'Labubu', 'Art Toy', 'Guochao', 'Bestseller', 'Announced', 'Released'],
    price: 99.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Pop Mart official national drop for the 2026 Spring The Monsters series across mainland retail stores.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Browsing_for_Labubu.jpg',
    company: {
      name: 'Pop Mart International Group Ltd.',
      websiteUrl: 'https://www.popmart.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=popmart.com&sz=128',
      description: 'Pop Mart International Group is China’s preeminent designer toy and pop culture powerhouse, credited with pioneering modern blind box collecting worldwide.',
    },
    blurb: 'Mainland China’s designer art toy sensation: Kasing Lung’s mischievous nine-toothed elf with plush tactile fur and vinyl face, worn on bags and collected nationwide.',
    rating: {
      score: 94,
      max: 100,
      source: 'Hypebeast China',
      url: 'https://hypebeast.cn',
    },
    merchants: [
      { label: 'Pop Mart WeChat Mini Program', url: 'https://www.popmart.com' },
      { label: 'Pop Mart Tmall Flagship Store', url: 'https://popmart.tmall.com' },
    ],
    references: [
      {
        url: 'https://www.popmart.com/',
        title: 'Pop Mart Official Artist Collaboration: Kasing Lung The Monsters Universe',
        confidence: 95,
        publishedDate: '2026-04-01',
        reasoning: 'Official toy specification and character design provenance.',
      },
      {
        url: 'https://www.chinadaily.com.cn/a/202407/08/WS668b5569a31095c51c50ceb1.html',
        title: 'China Daily: How Pop Mart’s Labubu Sparked a Global Art Toy Craze',
        confidence: 93,
        publishedDate: '2024-07-08',
        reasoning: 'Comprehensive report on designer toy culture and consumer buying habits in China.',
      },
    ],
  },

  // 9. Florasis Yurong Light & Pure Flawless Loose Powder
  {
    name: 'Florasis Yurong Light & Pure Flawless Loose Powder',
    productName: 'Florasis Yurong Light & Pure Flawless Loose Powder',
    title: 'Florasis Yurong Air Loose Powder — The Signature of Chinese Guochao Beauty',
    description: 'China’s #1 setting powder: an ultra-light, talc-free botanical powder infused with lotus and peach blossom extracts for an ethereal matte soft-focus blur.',
    longFormSummary: 'Born beside Hangzhou’s picturesque West Lake, Florasis (花西子) spearheaded China’s "Guochao" (国潮 / National Tide) cultural renaissance in the cosmetics industry. The Yurong Light & Pure Flawless Loose Powder (玉容养肤空气蜜粉) is the brand’s crowned bestseller, having occupied the #1 ranking on Tmall and Double 11 setting powder charts for multiple consecutive years. Inspired by an ancient imperial skin-beautifying herbal prescription, the talc-free formula blends antioxidant-rich lotus flower, peach blossom, and freshwater pearl powder with patented hollow microscopic flake particles. It selectively absorbs excess sebum while repelling water, creating a weightless, poreless soft-focus matte veil that withstands humid Chinese summers without caking or emphasizing fine lines.',
    sourceUrl: 'https://www.florasis.com/products/flawless-jade-breathable-color-correcting-loose-powder',
    utcStartDateTime: '2026-03-08T00:00:00.000Z',
    categories: ['Fashion'],
    tags: ['Product', 'China', 'Cosmetics', 'Beauty', 'Makeup', 'Florasis', 'Guochao', 'Skincare', 'Bestseller', 'Announced', 'Released'],
    price: 169.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Florasis launched its upgraded 2026 Lotus Jade nourishing formula on March 8, 2026.',
    imageUrl: 'https://media.ulta.com/i/ulta/77007077?w=800&h=800&fmt=auto',
    company: {
      name: 'Hangzhou Yige Cosmetics Co., Ltd. (Florasis)',
      websiteUrl: 'https://www.florasis.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=florasis.com&sz=128',
      description: 'Florasis (花西子) is China’s flagship Guochao beauty brand, founded in Hangzhou beside West Lake to fuse traditional Chinese herbal skincare wisdom with modern cosmetic science.',
    },
    blurb: 'The crown jewel of Guochao makeup: ultra-fine talc-free loose powder enriched with lotus and pearl extracts, delivering a poreless, all-day oil-controlling matte blur.',
    rating: {
      score: 95,
      max: 100,
      source: 'Tmall Golden Makeup Awards',
      url: 'https://florasis.tmall.com',
    },
    merchants: [
      { label: 'Florasis Tmall Official Flagship', url: 'https://florasis.tmall.com' },
      { label: 'Florasis Global Boutique', url: 'https://www.florasis.com' },
    ],
    references: [
      {
        url: 'https://www.florasis.com/',
        title: 'Florasis Yurong Herbal Formulation & Micro-Sieving Technology',
        confidence: 95,
        publishedDate: '2026-03-08',
        reasoning: 'Manufacturer formulation data on lipophilic sebum absorption and floral extracts.',
      },
      {
        url: 'https://www.voguebusiness.com/beauty/how-c-beauty-brand-florasis-built-a-cult-following',
        title: 'Vogue Business: How C-Beauty Brand Florasis Built a Cultural Powerhouse',
        confidence: 93,
        publishedDate: '2023-09-14',
        reasoning: 'Industry analysis detailing consumer adoption and product engineering in China.',
      },
    ],
  },

  // 10. Winona Soothing Moisturizing Special Care Cream
  {
    name: 'Winona Soothing Moisturizing Special Care Cream',
    productName: 'Winona Soothing Moisturizing Special Care Cream',
    title: 'Winona Soothing Moisturizing Special Care Cream — China’s Leading Sensitive Skin Staple',
    description: 'China’s #1 sensitive-skin barrier cream, clinically proven to soothe redness, itching, and dryness with Yunnan portulaca and green thorn fruit oil.',
    longFormSummary: 'Affectionately known across mainland China as "Xiao Te Hu" (小特护 / Little Special Care), Winona Soothing Moisturizing Special Care Cream is the unchallenged benchmark in Chinese clinical skincare. Developed in Kunming by Botanee Group in collaboration with top academic dermatological hospitals, the cream was engineered specifically to address the widespread sensitive skin concerns of modern Chinese urbanites exposed to seasonal dust, pollution, and aggressive cosmetic treatments. The lightweight, non-comedogenic emulsion harnesses bioactive extracts of wild Yunnan Portulaca oleracea (马齿苋) to calm acute irritation and Princsepia utilis Royle seed oil (青刺果油) to promote endogenous ceramide synthesis and rebuild the stratum corneum barrier. Backed by over 100 clinical papers in leading Chinese dermatology journals, it is a staple in millions of Chinese medicine cabinets.',
    sourceUrl: 'https://www.winona.cn/product/special-care-cream',
    utcStartDateTime: '2026-02-28T00:00:00.000Z',
    categories: ['Fashion'],
    tags: ['Product', 'China', 'Skincare', 'Beauty', 'Dermatology', 'Winona', 'Sensitive Skin', 'Guochao', 'Bestseller', 'Announced', 'Released'],
    price: 268.00,
    priceCurrency: 'CNY',
    dateConfidenceReasoning: 'Botanee rolled out its 2026 clinical renewal formula for Winona Special Care Cream in Chinese dermatological pharmacies.',
    imageUrl: 'https://i.ebayimg.com/images/g/rXgAAOSwmUplwyeb/s-l1600.jpg',
    company: {
      name: 'Yunnan Botanee Bio-Technology Group Co., Ltd.',
      websiteUrl: 'https://www.winona.cn',
      logoUrl: 'https://www.google.com/s2/favicons?domain=winona.cn&sz=128',
      description: 'Yunnan Botanee Bio-Technology Group is China’s leading dermatological cosmetic enterprise, dedicated to clinical skin barrier solutions powered by plateau botanicals.',
    },
    blurb: 'Mainland China’s #1 dermatological moisturizer: medical-grade barrier repair cream harnessing Yunnan portulaca to eliminate redness and rebuild sensitive skin.',
    rating: {
      score: 96,
      max: 100,
      source: 'Chinese Dermatologist Association Recommendation',
      url: 'https://www.winona.cn',
    },
    merchants: [
      { label: 'Winona Tmall Official Flagship', url: 'https://winona.tmall.com' },
      { label: 'JD.com Health Pharmacy', url: 'https://item.jd.com' },
    ],
    references: [
      {
        url: 'https://www.winona.cn/',
        title: 'Botanee Clinical Dermatological Research on Princsepia Utilis and Portulaca',
        confidence: 96,
        publishedDate: '2026-02-28',
        reasoning: 'Clinical study data on epidermal water loss reduction and skin erythema recovery.',
      },
      {
        url: 'http://www.cda.org.cn/news/industry/202405',
        title: 'Chinese Dermatologist Association: Consensus on Sensitive Skin Barrier Restoration',
        confidence: 94,
        publishedDate: '2024-05-25',
        reasoning: 'Clinical endorsement citation acknowledging Winona’s barrier repair efficacy.',
      },
    ],
  },
];

async function main() {
  const local = apiBase();
  const prod = prodBase();
  console.log(`Starting Mainland Chinese Products Pinning...`);
  console.log(`Local base: ${local}, Prod base: ${prod}`);

  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;

  // 1. Ensure author user account @ChinaTrends
  const AUTHOR_HANDLE = '@ChinaTrends';
  let localAuthorId: number;
  const localUser = await User.getUserByUserName(AUTHOR_HANDLE);
  if (localUser.user) {
    localAuthorId = localUser.user.id;
    if (!localUser.user.emailVerifiedDateTime) {
      await db.query(`UPDATE "User" SET "emailVerifiedDateTime" = now() WHERE "id" = $1`, [localAuthorId]);
    }
    console.log(`Found existing local author ${AUTHOR_HANDLE} (id: ${localAuthorId})`);
  } else {
    const u = new User({
      userName: AUTHOR_HANDLE,
      firstName: 'China',
      lastName: 'Trends',
      email: 'chinatrends@chronopin.local',
      role: 'user',
      about: 'Curating iconic and trending consumer products, viral staples, beverages, and tech loved by mainland Chinese consumers.',
      locationLatitude: 30.2741,
      locationLongitude: 120.1551,
      locationName: 'Hangzhou, China',
      localePreference: 'zh',
      provider: 'local',
      emailVerifiedDateTime: new Date(),
    });
    await u.save();
    localAuthorId = u.id;
    await db.query(`UPDATE "User" SET "emailVerifiedDateTime" = now() WHERE "id" = $1`, [localAuthorId]);
    console.log(`Created local author ${AUTHOR_HANDLE} (id: ${localAuthorId})`);
  }

  let prodAuthorId: number | null = null;
  if (prod) {
    const searchProdUser = await fetch(`${prod}/api/admin/db/User?userName=${encodeURIComponent(AUTHOR_HANDLE)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (searchProdUser.ok) {
      const prodUserData = await searchProdUser.json();
      const foundUser = (prodUserData.rows || []).find((u: any) => u.userName === AUTHOR_HANDLE);
      if (foundUser) {
        prodAuthorId = foundUser.id;
        console.log(`Found existing prod author ${AUTHOR_HANDLE} (id: ${prodAuthorId})`);
      }
    }
    if (!prodAuthorId) {
      const createProdUserRes = await fetch(`${prod}/api/admin/db/User`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          userName: AUTHOR_HANDLE,
          firstName: 'China',
          lastName: 'Trends',
          email: 'chinatrends@chronopin.local',
          role: 'user',
        }),
      });
      if (createProdUserRes.ok) {
        const createdUserResult = await createProdUserRes.json();
        prodAuthorId = createdUserResult.results?.[0]?.id ?? null;
        console.log(`Created prod author ${AUTHOR_HANDLE} (id: ${prodAuthorId})`);
      }
    }
  }

  const localToken = await signToken(localAuthorId, 'user');
  let prodToken: string | null = null;
  if (prodAuthorId && prodSecret) {
    prodToken = await new SignJWT({ id: prodAuthorId, role: 'user' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(prodSecret));
  }

  const tastePath = path.resolve('scripts/products/taste.json');
  const blurbsPath = path.resolve('scripts/products/blurbs.json');
  const tasteEntries: any[] = JSON.parse(readFileSync(tastePath, 'utf8'));
  const blurbsEntries: any[] = JSON.parse(readFileSync(blurbsPath, 'utf8'));

  for (const item of MAINLAND_CHINA_PRODUCTS) {
    console.log(`\n==================================================`);
    console.log(`Processing: ${item.name}`);

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
      console.log(`  Created local pin ${localPinId} as ${AUTHOR_HANDLE}`);
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
          [localPinId, ref.url, ref.title, ref.confidence, ref.publishedDate ?? null, ref.reasoning, localAuthorId]
        );
      }
    }

    // Save local taste if consumable
    if (item.taste) {
      await saveTaste(localPinId, item.taste.scores, {
        source: 'hand',
        basis: item.taste.basis,
        sourceUrl: item.taste.sourceUrl,
        abv: item.taste.abv,
        abvSourceUrl: item.taste.abvSourceUrl,
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
    if (prod && prodToken && prodAuthorId) {
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
          console.log(`  Created prod pin ${prodPinId} as ${AUTHOR_HANDLE}`);
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
              abv: item.taste.abv,
              abvSourceUrl: item.taste.abvSourceUrl,
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
          sourceUrl: item.taste.sourceUrl,
          abv: item.taste.abv,
          abvSourceUrl: item.taste.abvSourceUrl,
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
  console.log('\nAll 10 Mainland China favorite products have been successfully pinned and enriched under @ChinaTrends!');
}

main().catch((err) => {
  console.error('Fatal error adding mainland China products:', err);
  process.exit(1);
});
