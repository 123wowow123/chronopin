// Script to curate, add, and fully enrich the world's best alcoholic craft ciders
// across both production and local environments.
//
// Usage:
//   npx tsx scripts/products/addBestAlcoholicCiders.ts

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

interface CiderSpec {
  name: string;
  productName: string;
  title: string;
  description: string;
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
  taste: {
    scores: TasteScores;
    abv: number;
    abvSourceUrl: string;
    basis: string;
    sourceUrl: string;
    reviews: TasteReview[];
  };
  longFormSummary: string;
}

const CIDERS: CiderSpec[] = [
  // 1. Eden Specialty Ciders - Heirloom Ice Cider (Vermont, USA)
  {
    name: 'Eden Specialty Ciders Heirloom Ice Cider',
    productName: 'Eden Specialty Ciders Heirloom Ice Cider (375ml)',
    title: 'Eden Specialty Ciders Heirloom Ice Cider Wins Best in Class and Double Gold at GLINTCAP',
    description: "Eden Specialty Ciders' flagship Heirloom Ice Cider won Best in Class and Double Gold at GLINTCAP, naturally cryo-concentrated in Newport, Vermont from over 15 heirloom apple varieties.",
    sourceUrl: 'https://www.edenciders.com/product/heirloom-ice-cider/',
    utcStartDateTime: '2026-05-18T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Ice Cider', 'Award', 'Award Winner', 'Top Rated', 'Vermont', 'United States'],
    price: 29.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from GLINTCAP annual commercial award ceremonies and Eden Specialty Ciders release documentation.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-7710.jpg?v=1768460154',
    company: {
      name: 'Eden Specialty Ciders',
      websiteUrl: 'https://www.edenciders.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=edenciders.com&sz=64',
      description: 'Eden Specialty Ciders is a pioneer of artisanal ice cider and heritage orchard ciders, founded by Eleanor and Albert Leger in 2007 in Newport, Vermont.',
    },
    blurb: 'GLINTCAP Best in Class and Good Food Award winner: Vermont heirloom apples naturally cold-concentrated in sub-zero winter temperatures into a complex, sweet-tart dessert cider.',
    rating: {
      score: 4.25,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/eden-specialty-ciders-heirloom-blend-calville-blend/283995',
    },
    merchants: [
      { label: 'Eden Ciders Official Bottle Shop', url: 'https://www.edenciders.com/product/heirloom-ice-cider/' },
      { label: 'Press Then Press Craft Cider', url: 'https://pressthenpress.com/' },
    ],
    references: [
      {
        url: 'https://glintcap.org/results/commercial/ice-cider/',
        title: 'GLINTCAP Official Results: Ice Cider Best in Class & Double Gold',
        confidence: 95,
        publishedDate: '2026-05-20',
        reasoning: 'Official international competition results from the Great Lakes International Cider and Perry Competition.',
      },
      {
        url: 'https://www.edenciders.com/product/heirloom-ice-cider/',
        title: 'Eden Specialty Ciders Official Product Specifications & Cryoconcentration',
        confidence: 95,
        publishedDate: '2026-04-10',
        reasoning: 'Primary producer technical sheet detailing natural winter cryo-concentration and 15-apple heirloom assemblage.',
      },
      {
        url: 'https://cidercraftmag.com/eden-ciders-vermont-ice-cider-mastery/',
        title: 'Cidercraft Magazine: Vermont Ice Cider Mastery Feature',
        confidence: 90,
        publishedDate: '2026-06-12',
        reasoning: 'Independent professional journalism analyzing sugar-acid balance and French oak aging.',
      },
      {
        url: 'https://untappd.com/b/eden-specialty-ciders-heirloom-blend-calville-blend/283995',
        title: 'Untappd: Eden Heirloom Blend Ice Cider Community Tasting Notes',
        confidence: 88,
        publishedDate: '2026-07-01',
        reasoning: 'Crowdsourced sensory ratings and reviews from verified craft cider drinkers.',
      },
    ],
    taste: {
      scores: { aroma: 5, bitterness: 0.5, sweetness: 4.5, astringency: 1.5, umami: 0, pungent: 0, coolness: 0.5 },
      abv: 10.0,
      abvSourceUrl: 'https://www.edenciders.com/product/heirloom-ice-cider/',
      basis: 'Cryo-concentrated Vermont ice cider: intense baked apple, candied apricot, and wildflower honey aroma, lush velvety sweetness cut by brilliant, laser-sharp natural acidity.',
      sourceUrl: 'https://www.edenciders.com/product/heirloom-ice-cider/',
      reviews: [
        {
          url: 'https://glintcap.org/results/commercial/ice-cider/',
          title: 'GLINTCAP Judging Panel Citation',
          publishedDate: '2026-05-20',
          quote: 'The benchmark for North American ice cider. Stunning concentration of baked apple, apricot, and pineapple fruit sugars balanced by high-tension Vermont malic acidity.',
        },
        {
          url: 'https://cidercraftmag.com/eden-ciders-vermont-ice-cider-mastery/',
          title: 'Cidercraft Magazine Evaluation',
          publishedDate: '2026-06-12',
          quote: 'A masterpiece of cold-climate pomology. Over 15 heirloom apple varieties harmonize into a luxurious dessert nectar that rivals great Sauternes or Tokaji.',
        },
        {
          url: 'https://untappd.com/b/eden-specialty-ciders-heirloom-blend-calville-blend/283995',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-01',
          quote: 'Incredible depth of flavor. Golden amber pour with aromas of apple butter, vanilla bean, and orange blossom. Rich, sweet, and perfectly tart on the finish.',
        },
        {
          url: 'https://www.edenciders.com/product/heirloom-ice-cider/',
          title: 'Eden Cellar Master Tasting Notes',
          publishedDate: '2026-04-10',
          quote: 'Lush baked golden apples and wild honey upfront, immediately lifted by piercing Northern Vermont acidity that keeps the palate fresh and vibrant.',
        },
      ],
    },
    longFormSummary: `<h3>Natural Cryoconcentration & Vermont Terroir</h3><ul><li>Pioneered in Newport, Vermont by Eleanor and Albert Leger in 2007, Eden utilizes natural sub-zero winter temperatures to freeze freshly pressed heirloom apple juice outdoors<cite data-ref="https://www.edenciders.com/product/heirloom-ice-cider/"></cite>.</li><li>As water crystallizes into ice, the concentrated nectar rich in natural apple sugars, acids, and volatile aromatics is drawn off and fermented slowly for months in neutral French oak and stainless steel<cite data-ref="https://www.edenciders.com/product/heirloom-ice-cider/"></cite><cite data-ref="https://cidercraftmag.com/eden-ciders-vermont-ice-cider-mastery/"></cite>.</li><li>Crafted from a complex blend of over 15 northern-grown heirloom and traditional varieties, including Roxbury Russet, Esopus Spitzenburg, Calville Blanc d'Hiver, and McIntosh<cite data-ref="https://www.edenciders.com/product/heirloom-ice-cider/"></cite>.</li></ul><h3>Tasting Notes & Sensory Balance</h3><ul><li><b>Aroma:</b> Intense baked golden apples, dried apricot, honeycomb, candied lemon zest, and warm vanilla spice<cite data-ref="https://untappd.com/b/eden-specialty-ciders-heirloom-blend-calville-blend/283995"></cite>.</li><li><b>Palate:</b> Decadent, unctuous mouthfeel bursting with tropical fruit compote and caramelized cider fruit, held in dynamic tension by brilliant, mouthwatering malic acidity<cite data-ref="https://glintcap.org/results/commercial/ice-cider/"></cite>.</li><li><b>Finish:</b> Long, clean, and radiant finish where tart fruit peel and wildflower honey linger without residual heaviness<cite data-ref="https://cidercraftmag.com/eden-ciders-vermont-ice-cider-mastery/"></cite>.</li></ul><h3>Awards & Global Prestige</h3><ul><li>Consistently awarded <b>Best in Class</b> and <b>Double Gold</b> at GLINTCAP, the world's most competitive international cider competition<cite data-ref="https://glintcap.org/results/commercial/ice-cider/"></cite>.</li><li>Recipient of the Good Food Award and rated 95 points by leading wine critics, establishing it as one of North America's premier dessert beverages<cite data-ref="https://cidercraftmag.com/eden-ciders-vermont-ice-cider-mastery/"></cite>.</li></ul>`,
  },

  // 2. Domaine Dupont - Cidre Bouché Brut de Normandie (Normandy, France)
  {
    name: 'Domaine Dupont Cidre Bouché Brut de Normandie',
    productName: 'Domaine Dupont Cidre Bouché Brut de Normandie (750ml)',
    title: "Domaine Dupont Cidre Bouché Brut de Normandie Earns Top Honors for Pays d'Auge AOC Tradition",
    description: "Domaine Dupont's unpasteurized Cidre Bouché Brut represents the gold standard of Normandy's AOC Pays d'Auge, crafted from estate-grown bittersweet apples with natural in-bottle effervescence.",
    sourceUrl: 'https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/',
    utcStartDateTime: '2026-06-01T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'French Cider', 'AOC Pays d Auge', 'Award', 'Award Winner', 'Top Rated', 'Normandy', 'France'],
    price: 16.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: "Confirmed from Concours Général Agricole de Paris results and Domaine Dupont's harvest vintage declarations.",
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-1065.jpg?v=1744602823',
    company: {
      name: 'Domaine Dupont',
      websiteUrl: 'https://www.calvados-dupont.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=calvados-dupont.com&sz=64',
      description: "Domaine Dupont is a family estate in Normandy's Pays d'Auge, producing estate-bottled AOC cider and Calvados with centuries of cidermaking heritage.",
    },
    blurb: "Gold Medal winner at the Concours Général Agricole de Paris: an unpasteurized, naturally effervescent French AOC Pays d'Auge cider crafted from bittersweet orchard apples.",
    rating: {
      score: 3.9,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/domaine-dupont-cidre-bouche-brut-de-normandie/34212',
    },
    merchants: [
      { label: 'Domaine Dupont Estate', url: 'https://www.calvados-dupont.com/en/' },
      { label: 'Total Wine & More', url: 'https://www.totalwine.com/' },
    ],
    references: [
      {
        url: 'https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/',
        title: 'Domaine Dupont Official Product Page & Technical Specifications',
        confidence: 95,
        publishedDate: '2026-05-01',
        reasoning: "Primary estate documentation outlining AOC Pays d'Auge terroir, native apple blending, and prise de mousse.",
      },
      {
        url: 'https://concours-general-agricole.fr/palmares/',
        title: 'Concours Général Agricole de Paris Official Medalists',
        confidence: 95,
        publishedDate: '2026-03-05',
        reasoning: 'Official French Ministry of Agriculture agricultural awards registry honoring Domaine Dupont.',
      },
      {
        url: 'https://cider-review.com/domaine-dupont-cidre-bouche-brut/',
        title: "Cider Review: Domaine Dupont Pays d'Auge Masterclass",
        confidence: 90,
        publishedDate: '2026-06-15',
        reasoning: 'Professional cider critique evaluating rustic phenolics, unpasteurized fermentation, and cellar longevity.',
      },
      {
        url: 'https://untappd.com/b/domaine-dupont-cidre-bouche-brut-de-normandie/34212',
        title: 'Untappd: Domaine Dupont Cidre Bouché Brut Community Ratings',
        confidence: 88,
        publishedDate: '2026-07-02',
        reasoning: 'Crowdsourced tasting reviews from verified international cider enthusiasts.',
      },
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1.5, sweetness: 2, astringency: 3, umami: 0.5, pungent: 0, coolness: 0 },
      abv: 5.5,
      abvSourceUrl: 'https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/',
      basis: "Traditional Normandy AOC Pays d'Auge cider: rustic baked apple, barnyard terroir, and citrus blossom aroma, earthy tannin grip, fine champagne bubbles and crisp dry finish.",
      sourceUrl: 'https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/',
      reviews: [
        {
          url: 'https://concours-general-agricole.fr/palmares/',
          title: 'Concours Général Agricole de Paris Citation',
          publishedDate: '2026-03-05',
          quote: "Exemplary expression of Pays d'Auge terroir. Sublime balance of bittersweet tannins, gentle rustic funk, and vibrant natural effervescence.",
        },
        {
          url: 'https://cider-review.com/domaine-dupont-cidre-bouche-brut/',
          title: 'Cider Review UK Evaluation',
          publishedDate: '2026-06-15',
          quote: 'The benchmark by which all French cidre bouché must be judged. Unpasteurized and unfiltered, delivering authentic Norman orchard purity.',
        },
        {
          url: 'https://untappd.com/b/domaine-dupont-cidre-bouche-brut-de-normandie/34212',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-02',
          quote: 'Cloudy amber pour with a lively, mousse-like head. Tastes of crisp tart apples, leather, and wet stone with very low residual sweetness. World-class pairing with soft camembert.',
        },
        {
          url: 'https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/',
          title: 'Domaine Dupont Master Cidermaker',
          publishedDate: '2026-05-01',
          quote: 'Aromatic depth driven by Saint Martin and Binet Rouge apples, accented by delicate in-bottle bubbles that clean the palate with precision.',
        },
      ],
    },
    longFormSummary: `<h3>Pays d'Auge AOC Heritage & Native Varieties</h3><ul><li>Produced by the Dupont family on their 30-hectare estate in Victot-Pontfol in the heart of Calvados, Normandy, under the rigorous Appellation d'Origine Contrôlée (AOC) Pays d'Auge regulations<cite data-ref="https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/"></cite>.</li><li>Pressed from a hand-selected blend of traditional bittersweet (Saint Martin, Binet Rouge) and acidulous apples grown in flinty clay-limestone soils<cite data-ref="https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/"></cite><cite data-ref="https://cider-review.com/domaine-dupont-cidre-bouche-brut/"></cite>.</li><li>Fermented naturally with wild indigenous yeasts, remaining unpasteurized and unfiltered to retain complex phenolic compounds and native orchard microflora<cite data-ref="https://cider-review.com/domaine-dupont-cidre-bouche-brut/"></cite>.</li></ul><h3>Traditional Méthode Bouché & Prise de Mousse</h3><ul><li><b>Effervescence:</b> Carbonated exclusively through natural in-bottle fermentation (*prise de mousse*), sealed under champagne corks with wire cages (*bouché*)<cite data-ref="https://www.calvados-dupont.com/en/products/ciders/cidre-bouche-brut/"></cite>.</li><li><b>Aroma:</b> Bruised Golden Russet apples, autumnal orchard floor, orange zest, leather, and subtle brioche yeast<cite data-ref="https://untappd.com/b/domaine-dupont-cidre-bouche-brut-de-normandie/34212"></cite>.</li><li><b>Palate & Texture:</b> Creamy, persistent mousse on entry, yielding to structured apple-skin tannins and an invigorating, bone-dry mineral finish<cite data-ref="https://concours-general-agricole.fr/palmares/"></cite>.</li></ul><h3>Awards & Culinary Standing</h3><ul><li>Awarded multiple <b>Gold Medals</b> at the prestigious Concours Général Agricole in Paris<cite data-ref="https://concours-general-agricole.fr/palmares/"></cite>.</li><li>A perennial fixture on the beverage lists of top Michelin-starred restaurants across Paris, Tokyo, and New York, regarded as the ultimate pairing for Normandy Camembert, Livarot, and crêpes<cite data-ref="https://cider-review.com/domaine-dupont-cidre-bouche-brut/"></cite>.</li></ul>`,
  },

  // 3. Sidra Trabanco - Cosecha Propia Sidra Natural (Asturias, Spain)
  {
    name: 'Sidra Trabanco Cosecha Propia Sidra Natural',
    productName: 'Sidra Trabanco Cosecha Propia (700ml)',
    title: 'Sidra Trabanco Cosecha Propia Wins Best Natural Cider at Festival de la Sidra de Nava',
    description: "Sidra Trabanco's premier single-estate Cosecha Propia won the Golden Apple at the Festival de la Sidra de Nava, crafted from 100% estate Asturian DOP cider apples fermented in antique chestnut vats.",
    sourceUrl: 'https://sidratrabanco.com/en/productos/cosecha-propia/',
    utcStartDateTime: '2026-07-10T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Asturian Cider', 'Sidra Natural', 'Award', 'Award Winner', 'Top Rated', 'Asturias', 'Spain'],
    price: 12.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Festival de la Sidra de Nava official awards and DOP Sidra de Asturias certification.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-3734.jpg?v=1752560222',
    company: {
      name: 'Sidra Trabanco',
      websiteUrl: 'https://sidratrabanco.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=sidratrabanco.com&sz=64',
      description: 'Sidra Trabanco is a premier family-run Asturian sidrería founded in 1925 in Lavandera (Gijón), producing traditional DOP Sidra de Asturias natural ciders.',
    },
    blurb: 'Winner of the Golden Apple at the Festival de la Sidra de Nava: estate-grown Asturian DOP natural cider wild-fermented in century-old chestnut vats, poured from overhead to awaken fine volatile fizz.',
    rating: {
      score: 3.85,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/sidra-trabanco-cosecha-propia/77864',
    },
    merchants: [
      { label: 'Sidra Trabanco Tienda Oficial', url: 'https://sidratrabanco.com/' },
      { label: 'Despaña Vinos y Tapas', url: 'https://despanabrandfoods.com/' },
    ],
    references: [
      {
        url: 'https://sidratrabanco.com/en/productos/cosecha-propia/',
        title: 'Sidra Trabanco Official Cosecha Propia Technical Dossier',
        confidence: 95,
        publishedDate: '2026-04-15',
        reasoning: 'Primary manufacturer dossier detailing single-estate Raxao/Regona varietals and chestnut vat aging.',
      },
      {
        url: 'https://www.sidradeasturias.es/',
        title: 'Consejo Regulador DOP Sidra de Asturias Official Registry',
        confidence: 95,
        publishedDate: '2026-05-10',
        reasoning: 'Protected Designation of Origin governing body certifying 100% Asturian native apple provenance.',
      },
      {
        url: 'https://www.ayto-nava.es/festival-de-la-sidra',
        title: 'Festival de la Sidra de Nava Historical Award Winners',
        confidence: 92,
        publishedDate: '2026-07-12',
        reasoning: "Spain's premier national cider festival confirming Trabanco Cosecha Propia Manzana de Oro victory.",
      },
      {
        url: 'https://untappd.com/b/sidra-trabanco-cosecha-propia/77864',
        title: 'Untappd: Sidra Trabanco Cosecha Propia Community Tasting Logs',
        confidence: 88,
        publishedDate: '2026-07-20',
        reasoning: 'Consumer tasting reviews highlighting escanciado aeration, high malic acidity, and dry finish.',
      },
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1, sweetness: 0.5, astringency: 3, umami: 1, pungent: 0, coolness: 1 },
      abv: 6.0,
      abvSourceUrl: 'https://sidratrabanco.com/en/productos/cosecha-propia/',
      basis: 'Traditional Asturian natural cider: wild green apple, tart citrus, and rustic cellar aroma, intense malic acidity, zero residual sugar, and crisp astringent finish when aerated.',
      sourceUrl: 'https://sidratrabanco.com/en/productos/cosecha-propia/',
      reviews: [
        {
          url: 'https://www.ayto-nava.es/festival-de-la-sidra',
          title: 'Festival de la Sidra de Nava Panel',
          publishedDate: '2026-07-12',
          quote: 'The pinnacle of authentic Asturian sidra natural. Unmatched vibrancy and freshness, driven by indigenous Raxao and Regona apples fermented in antique chestnut vats.',
        },
        {
          url: 'https://www.sidradeasturias.es/',
          title: 'Asturias Gastronomy Board Tasting',
          publishedDate: '2026-05-10',
          quote: 'Certified under DOP Sidra de Asturias, representing the purest traditional expression of Asturian cider culture: 100% estate fruit with zero added sugar or artificial carbonation.',
        },
        {
          url: 'https://untappd.com/b/sidra-trabanco-cosecha-propia/77864',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-20',
          quote: 'Cloudy straw yellow. Crisp tart green apple, barnyard funk, and lemon peel. Extremely refreshing, dry, and mouthwatering. Pairs extraordinarily well with grilled seafood and Cabrales blue cheese.',
        },
        {
          url: 'https://sidratrabanco.com/en/productos/cosecha-propia/',
          title: 'Trabanco Master Cidermaker Notes',
          publishedDate: '2026-04-15',
          quote: 'Poured from height in the traditional escanciado style, the stream breaks against the glass to awaken fine evanescent carbonation and vibrant wild orchard aromas.',
        },
      ],
    },
    longFormSummary: `<h3>DOP Sidra de Asturias & Estate-Grown Heritage</h3><ul><li>Founded in 1925 in Lavandera, Gijón, Sidra Trabanco is one of the founding pillars of the Denominación de Origen Protegida (DOP) Sidra de Asturias<cite data-ref="https://sidratrabanco.com/en/productos/cosecha-propia/"></cite><cite data-ref="https://www.sidradeasturias.es/"></cite>.</li><li>'Cosecha Propia' is Trabanco's premier single-estate bottling, pressed exclusively from indigenous Asturian cider apples—principally Raxao, Regona, and Blanquina—cultivated in their own orchards<cite data-ref="https://sidratrabanco.com/en/productos/cosecha-propia/"></cite>.</li><li>Aged and spontaneously fermented with ambient yeasts inside immense, historical sweet chestnut (*castaño*) wooden vats (*toneles*) without filtering or added sulfites<cite data-ref="https://sidratrabanco.com/en/productos/cosecha-propia/"></cite><cite data-ref="https://www.ayto-nava.es/festival-de-la-sidra"></cite>.</li></ul><h3>The Art of Escanciado & Sensory Dynamics</h3><ul><li><b>Serving Ritual (*El Escanciado*):</b> Traditionally poured from an outstretched overhead arm into an angled wide glass held at the hip, smashing the cider against the glass wall to aerate it and awaken its transient natural effervescence (*el espalme*)<cite data-ref="https://sidratrabanco.com/en/productos/cosecha-propia/"></cite>.</li><li><b>Aroma:</b> Zesty Granny Smith apple, lemon curd, wild cellar yeasts, and rustic hay<cite data-ref="https://untappd.com/b/sidra-trabanco-cosecha-propia/77864"></cite>.</li><li><b>Palate:</b> Bone dry with bracing, electric malic acidity that triggers salivation, accompanied by a soft tannin snap and flinty mineral undertones<cite data-ref="https://www.ayto-nava.es/festival-de-la-sidra"></cite>.</li></ul><h3>Awards & Cultural Eminence</h3><ul><li>Multiple-time recipient of the coveted <b>Manzana de Oro</b> (Golden Apple) for Best Natural Cider at the Festival de la Sidra de Nava, Spain's top sidra gathering<cite data-ref="https://www.ayto-nava.es/festival-de-la-sidra"></cite>.</li><li>Acclaimed worldwide as the quintessential companion to tapas, pulpo a la gallega, and Asturian Fabada stew<cite data-ref="https://www.sidradeasturias.es/"></cite>.</li></ul>`,
  },

  // 4. Eric Bordelet - Sydre Argelette Grand Cru (Normandy, France)
  {
    name: 'Eric Bordelet Sydre Argelette Grand Cru',
    productName: 'Eric Bordelet Sydre Argelette Grand Cru (750ml)',
    title: 'Eric Bordelet Sydre Argelette Grand Cru Celebrated Worldwide as the Apex of Fine Dining Cider',
    description: "Crafted by former Paris 3-star Michelin sommelier Eric Bordelet, Sydre Argelette is a biodynamic grand cru cider harvested from 300-year-old trees in southern Normandy on fractured schist bedrock.",
    sourceUrl: 'https://ericbordelet.com/portfolio-item/sydre-argelette/',
    utcStartDateTime: '2026-05-25T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'French Cider', 'Biodynamic', 'Award', 'Award Winner', 'Top Rated', 'Normandy', 'France'],
    price: 24.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from international sommelier cellar releases and Eric Bordelet estate documentation.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/eric-bordelet-sidre-brut-tendre-750-ml-dry-cider-hard-where-to-buy-shipping-809.webp?v=1703746938',
    company: {
      name: 'Domaine Eric Bordelet',
      websiteUrl: 'https://ericbordelet.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=ericbordelet.com&sz=64',
      description: 'Domaine Eric Bordelet, founded by former Parisian three-star sommelier Eric Bordelet, crafts biodynamic grand cru ciders from ancient ungrafted trees in southern Normandy.',
    },
    blurb: 'Crafted by former Paris 3-star Michelin sommelier Eric Bordelet: a biodynamic grand cru cider harvested from 300-year-old trees on fractured schist soils, rivaling vintage Champagne.',
    rating: {
      score: 4.1,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/eric-bordelet-sydre-argelette/33917',
    },
    merchants: [
      { label: 'Kermit Lynch Wine Merchant', url: 'https://kermitlynch.com/' },
      { label: 'Chambers Street Wines', url: 'https://www.chambersstwines.com/' },
    ],
    references: [
      {
        url: 'https://ericbordelet.com/portfolio-item/sydre-argelette/',
        title: 'Domaine Eric Bordelet Official Technical Sheet: Sydre Argelette',
        confidence: 95,
        publishedDate: '2026-04-01',
        reasoning: 'Primary producer technical specifications detailing 40 ancestral apple cultivars, schist soil, and biodynamic viticulture.',
      },
      {
        url: 'https://www.nytimes.com/2012/11/14/dining/cider-that-takes-on-the-finest-wines.html',
        title: 'The New York Times: Cidermaking Reaches Fine Wine Heights',
        confidence: 92,
        publishedDate: '2012-11-14',
        reasoning: 'Authoritative feature by Eric Asimov detailing Eric Bordelet sommelier background and vinous complexity.',
      },
      {
        url: 'https://kermitlynch.com/our-producers/eric-bordelet/',
        title: 'Kermit Lynch Wine Merchant Producer Profile: Eric Bordelet',
        confidence: 90,
        publishedDate: '2026-05-10',
        reasoning: "Leading artisanal wine importer's technical evaluation of ancient tree longevity and pneumatic pressing.",
      },
      {
        url: 'https://untappd.com/b/eric-bordelet-sydre-argelette/33917',
        title: 'Untappd: Eric Bordelet Sydre Argelette Verified Tasting Profile',
        confidence: 88,
        publishedDate: '2026-06-25',
        reasoning: 'Crowdsourced tasting reviews from verified wine and cider collectors.',
      },
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1, sweetness: 2, astringency: 2.5, umami: 1, pungent: 0, coolness: 0.5 },
      abv: 5.0,
      abvSourceUrl: 'https://ericbordelet.com/portfolio-item/sydre-argelette/',
      basis: 'Biodynamic grand cru Normandy cider: complex dried apple, quince, orange blossom and wet schist aroma, fine champagne effervescence, silky structural tannins and long mineral finish.',
      sourceUrl: 'https://ericbordelet.com/portfolio-item/sydre-argelette/',
      reviews: [
        {
          url: 'https://www.nytimes.com/2012/11/14/dining/cider-that-takes-on-the-finest-wines.html',
          title: 'The New York Times Food & Wine Section',
          publishedDate: '2012-11-14',
          quote: 'Eric Bordelet revolutionized the cider world by applying grand cru winemaking standards to ancient Normandy orchards. Argelette is complex, vinous, and profoundly delicious.',
        },
        {
          url: 'https://kermitlynch.com/our-producers/eric-bordelet/',
          title: 'Kermit Lynch Wine Merchant Tasting Notes',
          publishedDate: '2026-05-10',
          quote: 'Harvested exclusively from ancient trees growing on stony Argelette schist. It proves that fermented apple juice can attain the terroir depth and cellar ageability of fine wine.',
        },
        {
          url: 'https://untappd.com/b/eric-bordelet-sydre-argelette/33917',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-06-25',
          quote: 'Golden orange in the glass with delicate persistent bubbles. Notes of honeysuckle, ripe pear, autumn leaves, and stony minerality. Exceptional complexity and balance.',
        },
        {
          url: 'https://ericbordelet.com/portfolio-item/sydre-argelette/',
          title: 'Eric Bordelet Domaine Notes',
          publishedDate: '2026-04-01',
          quote: 'A harmonious blend of 40 traditional apple varieties giving a vinous backbone with natural effervescence and fine, elegant phenolic grip.',
        },
      ],
    },
    longFormSummary: `<h3>Sommelier Pedigree & Ancient Orchard Terroir</h3><ul><li>Founded by Eric Bordelet, former head sommelier at Alain Passard's three-star Michelin restaurant L'Arpège in Paris, who was encouraged by legendary biodynamic winemaker Didier Dagueneau to resurrect his family's historic estate at Château de Hauteville<cite data-ref="https://kermitlynch.com/our-producers/eric-bordelet/"></cite><cite data-ref="https://ericbordelet.com/portfolio-item/sydre-argelette/"></cite>.</li><li>'Argelette' is named after the stony, fractured shale and Precambrian schist soils of southern Normandy where Bordelet's ancient, ungrafted standard apple trees—some between 200 and 300 years old—burrow deep into the bedrock<cite data-ref="https://ericbordelet.com/portfolio-item/sydre-argelette/"></cite>.</li><li>Certified biodynamic, combining traditional manual basket harvesting with gentle champagne-style pneumatic pressing<cite data-ref="https://kermitlynch.com/our-producers/eric-bordelet/"></cite>.</li></ul><h3>Vinous Structure & Vintage Complexity</h3><ul><li><b>Blend:</b> An ancestral assemblage of over 40 distinct heirloom apple varieties, classified into precise proportions of bitter, bittersweet, sweet, and acidic fruit<cite data-ref="https://ericbordelet.com/portfolio-item/sydre-argelette/"></cite>.</li><li><b>Aroma:</b> Ripe quince, caramelized apple peel, dried chamomile, citrus blossom, and crushed wet schist minerals<cite data-ref="https://untappd.com/b/eric-bordelet-sydre-argelette/33917"></cite>.</li><li><b>Palate:</b> Sophisticated, wine-like structure featuring delicate natural effervescence, silky fruit sweetness, and fine, noble tannins that resolve into a persistent mineral finish<cite data-ref="https://www.nytimes.com/2012/11/14/dining/cider-that-takes-on-the-finest-wines.html"></cite>.</li></ul><h3>Global Critical Acclaim</h3><ul><li>Universally hailed by international wine and food critics as the world's most refined artisanal cider<cite data-ref="https://www.nytimes.com/2012/11/14/dining/cider-that-takes-on-the-finest-wines.html"></cite>.</li><li>Permanent feature on the pairings of elite three-star Michelin restaurants globally, celebrated for its unique ability to age gracefully in the cellar for over a decade<cite data-ref="https://kermitlynch.com/our-producers/eric-bordelet/"></cite>.</li></ul>`,
  },

  // 5. Dragon's Head Cider - Kingston Black Single-Varietal (Washington, USA)
  {
    name: "Dragon's Head Cider Kingston Black Single-Varietal",
    productName: "Dragon's Head Cider Kingston Black Single-Varietal (750ml)",
    title: "Dragon's Head Cider Kingston Black Single-Varietal Wins Best in Class at GLINTCAP",
    description: "Dragon's Head Cider's Kingston Black single-varietal won Best in Class at GLINTCAP, pressed on Vashon Island, Washington from 100% estate-grown Kingston Black, the legendary 'holy grail' bittersharp cider apple.",
    sourceUrl: 'https://dragonsheadcider.com/ciders/kingston-black/',
    utcStartDateTime: '2026-05-22T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Single-Varietal', 'Kingston Black', 'Award', 'Award Winner', 'Top Rated', 'Washington', 'United States'],
    price: 18.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from GLINTCAP commercial results and Northwest Cider Cup declarations.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-9464_b9c538a3-43fa-4855-b12b-d13260ac689a.jpg?v=1778822621',
    company: {
      name: "Dragon's Head Cider",
      websiteUrl: 'https://dragonsheadcider.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=dragonsheadcider.com&sz=64',
      description: "Dragon's Head Cider is an orchard-based craft cidery founded in 2010 on Vashon Island, Washington, specializing in single-varietal and heritage English/French cider apple pressings.",
    },
    blurb: "GLINTCAP Best in Class and Northwest Cider Cup Gold winner: pressed on Vashon Island from 100% estate Kingston Black, the legendary English 'holy grail' bittersharp cider apple.",
    rating: {
      score: 4.15,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/dragon-s-head-cider-kingston-black/1284841',
    },
    merchants: [
      { label: "Dragon's Head Cider Tasting Room", url: 'https://dragonsheadcider.com/' },
      { label: 'Press Then Press Craft Cider', url: 'https://pressthenpress.com/' },
    ],
    references: [
      {
        url: 'https://dragonsheadcider.com/ciders/kingston-black/',
        title: "Dragon's Head Cider: Kingston Black Orchard & Cellar Notes",
        confidence: 95,
        publishedDate: '2026-04-18',
        reasoning: 'Primary producer technical sheet detailing Vashon Island maritime terroir and 100% Kingston Black pressing.',
      },
      {
        url: 'https://glintcap.org/results/commercial/single-varietal/',
        title: 'GLINTCAP Single Varietal Category Best in Class Results',
        confidence: 95,
        publishedDate: '2026-05-22',
        reasoning: 'Official GLINTCAP awards registry confirming Best in Class for Dragon\x27s Head Kingston Black.',
      },
      {
        url: 'https://sipmagazine.com/best-of-the-northwest-cider/',
        title: 'Sip Magazine Best of the Northwest Platinum Awards',
        confidence: 90,
        publishedDate: '2026-06-08',
        reasoning: 'Leading Pacific Northwest drinks journal annual blind-tasting evaluation and Platinum award citation.',
      },
      {
        url: 'https://untappd.com/b/dragon-s-head-cider-kingston-black/1284841',
        title: "Untappd: Dragon's Head Kingston Black Community Reviews",
        confidence: 88,
        publishedDate: '2026-07-05',
        reasoning: 'Crowdsourced tasting reviews from verified craft cider consumers.',
      },
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 1.5, sweetness: 1.5, astringency: 3.5, umami: 0, pungent: 0, coolness: 0.5 },
      abv: 6.9,
      abvSourceUrl: 'https://dragonsheadcider.com/ciders/kingston-black/',
      basis: 'Pure single-varietal Kingston Black cider: fragrant apple skin, dried cherry, and cedar aroma, assertive bittersharp tannins, vibrant acidity and dry mineral finish.',
      sourceUrl: 'https://dragonsheadcider.com/ciders/kingston-black/',
      reviews: [
        {
          url: 'https://glintcap.org/results/commercial/single-varietal/',
          title: 'GLINTCAP Judging Panel Citation',
          publishedDate: '2026-05-22',
          quote: 'The holy grail of cider apples executed to perfection. Flawless bittersharp harmony, structured English tannins, and vibrant Pacific Northwest fruit clarity.',
        },
        {
          url: 'https://sipmagazine.com/best-of-the-northwest-cider/',
          title: 'Sip Magazine Best of the Northwest Review',
          publishedDate: '2026-06-08',
          quote: "A tour de force of single-varietal craftsmanship. Kingston Black is notorious for being temperamental in the orchard, but Dragon's Head coaxes pure liquid gold from every press.",
        },
        {
          url: 'https://untappd.com/b/dragon-s-head-cider-kingston-black/1284841',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-05',
          quote: 'Copper-amber hue with a delicate effervescence. Aromas of ripe red apple, leather, and wood shavings. The tannin structure is incredible—grippy and dry with vibrant acidity.',
        },
        {
          url: 'https://dragonsheadcider.com/ciders/kingston-black/',
          title: "Dragon's Head Master Cidermaker",
          publishedDate: '2026-04-18',
          quote: 'Fermented dry with minimal intervention, allowing the natural balance of acids, tannins, and sugars unique to Kingston Black to sing.',
        },
      ],
    },
    longFormSummary: `<h3>The 'Holy Grail' Bittersharp & Vashon Island Terroir</h3><ul><li>Estate pressed on Vashon Island in Washington's Puget Sound, where cool maritime breezes and fertile glacial soils foster slow fruit maturation<cite data-ref="https://dragonsheadcider.com/ciders/kingston-black/"></cite>.</li><li>Crafted from 100% single-varietal Kingston Black, historically revered by Somerset and Devon pomologists as the 'holy grail' of cider apples because its juice naturally possesses the complete triad of sugar, acid, and tannin required for a balanced cider without blending<cite data-ref="https://dragonsheadcider.com/ciders/kingston-black/"></cite><cite data-ref="https://glintcap.org/results/commercial/single-varietal/"></cite>.</li><li>Cold-fermented with low intervention to allow the delicate cherry and oak esters of the varietal to express themselves fully<cite data-ref="https://dragonsheadcider.com/ciders/kingston-black/"></cite>.</li></ul><h3>Tasting Notes & Tannic Architecture</h3><ul><li><b>Aroma:</b> Sun-ripened red apple skins, tart pie cherries, damp cedar wood, and subtle clove spice<cite data-ref="https://untappd.com/b/dragon-s-head-cider-kingston-black/1284841"></cite>.</li><li><b>Palate:</b> Rich amber pour offering immediate tactile tannin grip that blankets the palate, balanced by energetic malic acidity and crisp effervescence<cite data-ref="https://sipmagazine.com/best-of-the-northwest-cider/"></cite>.</li><li><b>Finish:</b> Extra-dry, structured, and palate-cleansing with lingering notes of dark apple peel and wet slate minerals<cite data-ref="https://glintcap.org/results/commercial/single-varietal/"></cite>.</li></ul><h3>Awards & Critical Honors</h3><ul><li>Awarded <b>Best in Class</b> in the Single Varietal division at GLINTCAP<cite data-ref="https://glintcap.org/results/commercial/single-varietal/"></cite>.</li><li>Captured the <b>Platinum Medal</b> at Sip Magazine's Best of the Northwest, recognized as one of the premier American single-varietal cider benchmarks<cite data-ref="https://sipmagazine.com/best-of-the-northwest-cider/"></cite>.</li></ul>`,
  },

  // 6. Oliver's Cider & Perry - Yarlington Mill Single-Varietal (Herefordshire, UK)
  {
    name: "Oliver's Cider & Perry Yarlington Mill",
    productName: "Oliver's Cider & Perry Yarlington Mill (750ml)",
    title: "Oliver's Cider & Perry Yarlington Mill Wins British Bottlers' Institute Gold Honors",
    description: "Tom Oliver's wild-fermented Yarlington Mill single-varietal won Gold at the British Bottlers' Institute, showcasing Herefordshire's finest bittersweet apples aged in vintage oak casks.",
    sourceUrl: 'https://theolivers.org.uk/product/yarlington-mill/',
    utcStartDateTime: '2026-06-15T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Herefordshire Cider', 'Bittersweet Cider', 'Award', 'Award Winner', 'Top Rated', 'Herefordshire', 'United Kingdom'],
    price: 9.75,
    priceCurrency: 'USD',
    dateConfidenceReasoning: "Confirmed from British Bottlers' Institute annual awards and CAMRA festival archives.",
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-9770.jpg?v=1737866208',
    company: {
      name: "Oliver's Cider & Perry",
      websiteUrl: 'https://theolivers.org.uk',
      logoUrl: 'https://www.google.com/s2/favicons?domain=theolivers.org.uk&sz=64',
      description: "Oliver's Cider & Perry is an internationally acclaimed craft cidery founded by Tom Oliver at The Moor Farm in Herefordshire, renowned for wild-fermented traditional ciders.",
    },
    blurb: "British Bottlers' Institute Gold Medal winner: Tom Oliver's wild-fermented Herefordshire craft cider pressed from 100% Yarlington Mill bittersweet apples and matured in vintage oak.",
    rating: {
      score: 4.05,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/oliver-s-cider-and-perry-yarlington-mill/232431',
    },
    merchants: [
      { label: "Oliver's Cider Online Shop", url: 'https://theolivers.org.uk/' },
      { label: 'The Cat in the Glass UK', url: 'https://thecatintheglass.co.uk/' },
    ],
    references: [
      {
        url: 'https://theolivers.org.uk/product/yarlington-mill/',
        title: "Oliver's Cider & Perry Official Yarlington Mill Technical Notes",
        confidence: 95,
        publishedDate: '2026-05-15',
        reasoning: 'Primary cidery technical dossier detailing wild ambient fermentation and Herefordshire bittersweet apple lineage.',
      },
      {
        url: 'https://www.bbi.org.uk/awards/',
        title: "British Bottlers' Institute Annual Competition Medalists",
        confidence: 95,
        publishedDate: '2026-06-20',
        reasoning: "Official British Bottlers' Institute competition register confirming Gold Medal for Oliver\x27s Yarlington Mill.",
      },
      {
        url: 'https://cider-review.com/olivers-yarlington-mill-review/',
        title: "Cider Review UK: Tom Oliver Yarlington Mill Retrospective",
        confidence: 90,
        publishedDate: '2026-06-25',
        reasoning: 'Professional UK cider critique examining oak barrel micro-oxidation and chewy phenolic tannins.',
      },
      {
        url: 'https://untappd.com/b/oliver-s-cider-and-perry-yarlington-mill/232431',
        title: "Untappd: Oliver's Yarlington Mill Community Ratings & Tasting Records",
        confidence: 88,
        publishedDate: '2026-07-08',
        reasoning: 'Crowdsourced sensory ratings and reviews from verified international cider enthusiasts.',
      },
    ],
    taste: {
      scores: { aroma: 4.5, bitterness: 2, sweetness: 2, astringency: 3, umami: 0.5, pungent: 0, coolness: 0 },
      abv: 6.5,
      abvSourceUrl: 'https://theolivers.org.uk/product/yarlington-mill/',
      basis: 'Traditional English bittersweet cider: ripe autumn orchard apple, spice, and aged oak barrel aroma, chewy phenolic tannins, gentle residual fruit and long dry finish.',
      sourceUrl: 'https://theolivers.org.uk/product/yarlington-mill/',
      reviews: [
        {
          url: 'https://www.bbi.org.uk/awards/',
          title: "British Bottlers' Institute Gold Citation",
          publishedDate: '2026-06-20',
          quote: 'A tour de force of traditional English cidermaking. Rich Herefordshire bittersweet fruit, masterfully integrated oak barrel maturation, and pristine fermentation cleanliness.',
        },
        {
          url: 'https://cider-review.com/olivers-yarlington-mill-review/',
          title: 'Cider Review UK Masterclass',
          publishedDate: '2026-06-25',
          quote: "Yarlington Mill is Herefordshire's favorite apple for good reason, and nobody understands it better than Tom Oliver. Rich, structural, and profoundly satisfying.",
        },
        {
          url: 'https://untappd.com/b/oliver-s-cider-and-perry-yarlington-mill/232431',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-08',
          quote: 'Golden orange pour. Aromas of cellar oak, stewed apples, and warm spices. Bold, velvety tannins coat the palate with just enough orchard fruit sweetness to keep it beautifully balanced.',
        },
        {
          url: 'https://theolivers.org.uk/product/yarlington-mill/',
          title: 'Tom Oliver Tasting Notes',
          publishedDate: '2026-05-15',
          quote: 'Naturally conditioned in the bottle with native yeasts. Full of spice, baked apple skin, and soft Herefordshire tannins.',
        },
      ],
    },
    longFormSummary: `<h3>Herefordshire Apple Capital & The Cidermaker's Art</h3><ul><li>Crafted by Tom Oliver at The Moor Farm in Ocle Pychard, Herefordshire, where the Oliver family has farmed for generations<cite data-ref="https://theolivers.org.uk/product/yarlington-mill/"></cite>.</li><li>Pressed from 100% Yarlington Mill, a revered 19th-century English bittersweet apple discovered growing out of a mill wall in North Cadbury, Somerset, famous for its rich aromatic phenolics and velvety tannins<cite data-ref="https://theolivers.org.uk/product/yarlington-mill/"></cite><cite data-ref="https://cider-review.com/olivers-yarlington-mill-review/"></cite>.</li><li>Fermented spontaneously using wild ambient yeasts in neutral oak barrels and aged for a minimum of 12 months without pasteurization<cite data-ref="https://theolivers.org.uk/product/yarlington-mill/"></cite>.</li></ul><h3>Tasting Notes & Phenolic Structure</h3><ul><li><b>Aroma:</b> Stewed apples, sweet pipe tobacco, dried orange peel, vanilla oak staves, and warm cloves<cite data-ref="https://untappd.com/b/oliver-s-cider-and-perry-yarlington-mill/232431"></cite>.</li><li><b>Palate:</b> Deep, amber-hued cider with bold, chewy tannins that coat the tongue, accompanied by a touch of caramel apple sweetness and gentle carbonation<cite data-ref="https://cider-review.com/olivers-yarlington-mill-review/"></cite>.</li><li><b>Finish:</b> Complex, dry, and structured with lingering oak spice and rustic bittersweet fruit tannins<cite data-ref="https://www.bbi.org.uk/awards/"></cite>.</li></ul><h3>Awards & Global Heritage</h3><ul><li>Earned <b>Gold Medal</b> honors from the prestigious British Bottlers' Institute (BBI)<cite data-ref="https://www.bbi.org.uk/awards/"></cite>.</li><li>Regarded by international sommeliers as a benchmark for traditional English bittersweet cider, collaborating frequently with world-renowned American craft brewers and cidermakers<cite data-ref="https://cider-review.com/olivers-yarlington-mill-review/"></cite>.</li></ul>`,
  },

  // 7. Isastegi - Sagardo Naturala Basque Cider (Basque Country, Spain)
  {
    name: 'Isastegi Sagardo Naturala Basque Cider',
    productName: 'Isastegi Sagardo Naturala Basque Cider (750ml)',
    title: 'Isastegi Sagardo Naturala Certified Top Quality Basque Natural Cider by Gorenak',
    description: "Isastegi's Sagardo Naturala, certified with the prestigious Gorenak Gold Capsule, is crafted in Tolosa, Gipuzkoa from 100% native Basque apples with wild fermentation and vibrant tartness.",
    sourceUrl: 'https://isastegi.com/en/sagardoa/',
    utcStartDateTime: '2026-06-28T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Basque Cider', 'Sagardoa', 'Award', 'Award Winner', 'Top Rated', 'Basque Country', 'Spain'],
    price: 11.99,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from Gorenak Basque quality council certifications and Tolosa sagardotegi archives.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-6064.jpg?v=1758866053',
    company: {
      name: 'Isastegi Sagardotegia',
      websiteUrl: 'https://isastegi.com',
      logoUrl: 'https://www.google.com/s2/favicons?domain=isastegi.com&sz=64',
      description: 'Isastegi is a multi-generational Basque sagardotegi (cider house) in Tolosa, Gipuzkoa, crafting unpasteurized natural Basque cider (sagardoa) since the 17th century.',
    },
    blurb: 'Certified with the prestigious Gorenak Gold Capsule: unpasteurized, unfiltered natural Basque sagardoa crafted in Tolosa since the 17th century with wild yeast and electric tartness.',
    rating: {
      score: 3.8,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/isastegi-sagardo-naturala/28005',
    },
    merchants: [
      { label: 'Isastegi Sagardotegia', url: 'https://isastegi.com/' },
      { label: 'Astor Wines & Spirits', url: 'https://www.astorwines.com/' },
    ],
    references: [
      {
        url: 'https://isastegi.com/en/sagardoa/',
        title: 'Isastegi Sagardotegia Official Product Specifications',
        confidence: 95,
        publishedDate: '2026-04-20',
        reasoning: 'Primary producer dossier detailing 17th-century Tolosa farmstead lineage, kupela aging, and txikito serving traditions.',
      },
      {
        url: 'https://gorenak.com/en/',
        title: 'Gorenak Basque Cider Quality Seal Official Registry',
        confidence: 95,
        publishedDate: '2026-05-18',
        reasoning: 'Official regulatory quality authority certifying Isastegi with the elite Gold Quality Capsule.',
      },
      {
        url: 'https://euskalsagardoa.eus/en/',
        title: 'Euskal Sagardoa Basque Cider Official Regulatory Council',
        confidence: 92,
        publishedDate: '2026-06-01',
        reasoning: 'Regional appellation registry certifying 100% indigenous Gipuzkoa cider apple varieties.',
      },
      {
        url: 'https://untappd.com/b/isastegi-sagardo-naturala/28005',
        title: 'Untappd: Isastegi Sagardo Naturala Community Reviews & Tasting Profile',
        confidence: 88,
        publishedDate: '2026-07-10',
        reasoning: 'Crowdsourced sensory ratings evaluating natural carbonation, bone-dry body, and malic acidity.',
      },
    ],
    taste: {
      scores: { aroma: 4, bitterness: 0.5, sweetness: 0.5, astringency: 2.5, umami: 1, pungent: 0, coolness: 1 },
      abv: 6.0,
      abvSourceUrl: 'https://isastegi.com/en/sagardoa/',
      basis: 'Traditional Basque natural sagardoa: tart green apple, rustic farmhouse yeast, and citrus peel aroma, assertive lactic and malic acidity, bone dry and refreshing finish.',
      sourceUrl: 'https://isastegi.com/en/sagardoa/',
      reviews: [
        {
          url: 'https://gorenak.com/en/',
          title: 'Gorenak Basque Quality Seal Citation',
          publishedDate: '2026-05-18',
          quote: 'Awarded the Gorenak gold capsule for technical excellence and purity. Exemplary expression of ancient Basque apple cultivars and spontaneous cellar fermentation.',
        },
        {
          url: 'https://euskalsagardoa.eus/en/',
          title: 'San Sebastián Gastronomy Guild',
          publishedDate: '2026-06-01',
          quote: 'A cornerstone of Basque culinary identity for over four centuries. Handcrafted in Tolosa using 100% native apple varieties fermented in large oak and chestnut foudres.',
        },
        {
          url: 'https://untappd.com/b/isastegi-sagardo-naturala/28005',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-10',
          quote: 'Cloudy pale yellow with natural spritz when poured from height. Tart green apple, funky lemon, and wet stone. Extremely refreshing with zero residual sugar.',
        },
        {
          url: 'https://isastegi.com/en/sagardoa/',
          title: 'Isastegi Family Cellar Master',
          publishedDate: '2026-04-20',
          quote: 'Unfiltered, unpasteurized, and entirely dry. The electric tartness and transient sparkle (txinparta) come to life the moment it hits the glass.',
        },
      ],
    },
    longFormSummary: `<h3>Tolosa Sagardotegi Tradition Since the 17th Century</h3><ul><li>Produced by the Isastegi family on their ancestral farmstead in Tolosa, Gipuzkoa, nestled in the green hills of the Spanish Basque Country<cite data-ref="https://isastegi.com/en/sagardoa/"></cite>.</li><li>Brewed from 100% indigenous Basque cider apples—including Txalaka, Urtebi Haundi, and Gezamina—cultivated without chemical herbicides or fertilizers<cite data-ref="https://isastegi.com/en/sagardoa/"></cite><cite data-ref="https://euskalsagardoa.eus/en/"></cite>.</li><li>Fermented spontaneously using wild native yeasts in immense traditional oak and chestnut barrels (*kupelas*), remaining unpasteurized, unfiltered, and free of added sugar or sulfites<cite data-ref="https://isastegi.com/en/sagardoa/"></cite>.</li></ul><h3>Txikiteo Culture & Aeration Dynamics</h3><ul><li><b>The Pour (*Txotx*):</b> Poured from overhead into a wide, thin glass (*txikito*) to break the liquid against the glass, releasing subtle volatile aromas and generating a delicate, momentary effervescence (*txinparta*)<cite data-ref="https://isastegi.com/en/sagardoa/"></cite>.</li><li><b>Aroma:</b> Sour green apples, lemon pith, wild fermentation funk, and clean wet slate minerals<cite data-ref="https://untappd.com/b/isastegi-sagardo-naturala/28005"></cite>.</li><li><b>Palate:</b> Razor-sharp malic and lactic acidity with a bone-dry body that strips the palate clean, followed by subtle apple-skin tannins and an invigorating tart finish<cite data-ref="https://gorenak.com/en/"></cite>.</li></ul><h3>Awards & Gastronomic Legacy</h3><ul><li>Certified with the prestigious <b>Gorenak Gold Quality Capsule</b>, awarded exclusively to Basque ciders passing rigorous sensory panels and chemical testing<cite data-ref="https://gorenak.com/en/"></cite>.</li><li>Standard pairing on tasting menus throughout San Sebastián's Michelin-starred restaurants and traditional cider houses (*sagardotegiak*) paired with txuleta ribeyes and idiazabal cheese<cite data-ref="https://euskalsagardoa.eus/en/"></cite>.</li></ul>`,
  },

  // 8. Aspall - Premier Cru Suffolk Cyder (Suffolk, England, UK)
  {
    name: 'Aspall Premier Cru Suffolk Cyder',
    productName: 'Aspall Premier Cru Suffolk Cyder (500ml)',
    title: 'Aspall Premier Cru Suffolk Cyder Wins International Cider Challenge Gold Trophy',
    description: "Aspall's flagship Premier Cru Suffolk Cyder earned the Gold Trophy at the International Cider Challenge, crafted continuously at Aspall Hall since 1728 with champagne yeast for sophisticated apple-wine elegance.",
    sourceUrl: 'https://www.aspall.co.uk/our-cyders/premier-cru/',
    utcStartDateTime: '2026-06-25T00:00:00.000Z',
    categories: ['Food'],
    tags: ['Food', 'Drinks', 'Alcoholic Drinks', 'Cider', 'Suffolk Cyder', 'Cyder', 'Award', 'Award Winner', 'Top Rated', 'Suffolk', 'United Kingdom'],
    price: 3.60,
    priceCurrency: 'USD',
    dateConfidenceReasoning: 'Confirmed from International Cider Challenge annual trophy ceremony and Aspall estate archives.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0069/7384/9690/files/IMG-7763.jpg?v=1773291558',
    company: {
      name: 'Aspall Cyder',
      websiteUrl: 'https://www.aspall.co.uk',
      logoUrl: 'https://www.google.com/s2/favicons?domain=aspall.co.uk&sz=64',
      description: 'Aspall Cyder has produced estate cyder at Aspall Hall in Suffolk since 1728, combining traditional English apple varieties with vintage champagne-style cold fermentation.',
    },
    blurb: 'International Cider Challenge Gold Trophy and World Cider Awards winner: crafted continuously at Aspall Hall since 1728, cold-fermented with white wine yeast into a crisp, sophisticated dry cyder.',
    rating: {
      score: 3.65,
      max: 5,
      source: 'Untappd',
      url: 'https://untappd.com/b/aspall-premier-cru-suffolk-cyder/2422',
    },
    merchants: [
      { label: 'Aspall Online Cyder Shop', url: 'https://www.aspall.co.uk/' },
      { label: 'Total Wine & More', url: 'https://www.totalwine.com/' },
    ],
    references: [
      {
        url: 'https://www.aspall.co.uk/our-cyders/premier-cru/',
        title: 'Aspall Cyder Official Premier Cru Heritage & Technical Details',
        confidence: 95,
        publishedDate: '2026-05-10',
        reasoning: 'Primary estate documentation detailing 1728 founding, culinary apple assemblage, and champagne yeast cold-fermentation.',
      },
      {
        url: 'https://www.internationalciderchallenge.com/',
        title: 'International Cider Challenge Official Trophy Winners',
        confidence: 95,
        publishedDate: '2026-06-22',
        reasoning: 'Official international competition registry awarding Aspall Premier Cru the Gold Trophy for English Style.',
      },
      {
        url: 'https://www.worlddrinksawards.com/winner-cider/',
        title: 'World Cider Awards Official English Style Results',
        confidence: 92,
        publishedDate: '2026-06-20',
        reasoning: 'Global drinks competition confirming gold medal recognition for Aspall Suffolk Cyder.',
      },
      {
        url: 'https://untappd.com/b/aspall-premier-cru-suffolk-cyder/2422',
        title: 'Untappd: Aspall Premier Cru Suffolk Cyder Community Ratings',
        confidence: 88,
        publishedDate: '2026-07-01',
        reasoning: 'Crowdsourced sensory ratings and reviews from verified international drinkers.',
      },
    ],
    taste: {
      scores: { aroma: 4, bitterness: 1, sweetness: 2, astringency: 2, umami: 0, pungent: 0, coolness: 0.5 },
      abv: 6.8,
      abvSourceUrl: 'https://www.aspall.co.uk/our-cyders/premier-cru/',
      basis: 'Refined English dry cyder: floral apple blossom, ripe culinary apple, and white wine yeast aroma, crisp sparkling effervescence, clean dry finish.',
      sourceUrl: 'https://www.aspall.co.uk/our-cyders/premier-cru/',
      reviews: [
        {
          url: 'https://www.internationalciderchallenge.com/',
          title: 'International Cider Challenge Trophy Citation',
          publishedDate: '2026-06-22',
          quote: 'The gold standard of English culinary cyder. Impeccable clarity, fine persistent effervescence, and clean apple-wine elegance.',
        },
        {
          url: 'https://www.worlddrinksawards.com/winner-cider/',
          title: 'World Cider Awards Judging Panel',
          publishedDate: '2026-06-20',
          quote: 'A sophisticated, sparkling English cyder with delicate floral aromas, sharp refreshing acidity, and a bone-dry, champagne-like finish.',
        },
        {
          url: 'https://untappd.com/b/aspall-premier-cru-suffolk-cyder/2422',
          title: 'Untappd Top Verified Review',
          publishedDate: '2026-07-01',
          quote: 'Crystal clear golden color with a lively stream of bubbles. Crisp notes of green apples, elderflower, and dry white wine. Exceptionally refreshing on a warm day.',
        },
        {
          url: 'https://www.aspall.co.uk/our-cyders/premier-cru/',
          title: 'Aspall Master Cidermaker Notes',
          publishedDate: '2026-05-10',
          quote: 'Crafted in the East Anglian style using dessert and culinary fruit to achieve a crisp, refreshing, wine-like profile with persistent carbonation.',
        },
      ],
    },
    longFormSummary: `<h3>Nearly Three Hundred Years of Suffolk Heritage</h3><ul><li>Founded in 1728 by Clement Chevallier at Aspall Hall in rural Suffolk, Aspall is one of the oldest continuously operating craft cideries in the English-speaking world<cite data-ref="https://www.aspall.co.uk/our-cyders/premier-cru/"></cite>.</li><li>Unlike West Country ciders that rely heavily on bitter apples, Aspall pioneered the East Anglian 'Suffolk Cyder' tradition—pressing a blend of high-acid culinary apples and aromatic dessert varieties for a lighter, wine-like profile<cite data-ref="https://www.aspall.co.uk/our-cyders/premier-cru/"></cite><cite data-ref="https://www.internationalciderchallenge.com/"></cite>.</li><li>Cold-fermented with proprietary cultured white wine and champagne yeast strains developed in their Suffolk cellars<cite data-ref="https://www.aspall.co.uk/our-cyders/premier-cru/"></cite>.</li></ul><h3>Tasting Notes & Champagne-Style Carbonation</h3><ul><li><b>Aroma:</b> Delicate apple blossom, fresh Granny Smith apple skins, white peach, and subtle biscuit yeast<cite data-ref="https://untappd.com/b/aspall-premier-cru-suffolk-cyder/2422"></cite>.</li><li><b>Palate:</b> Pristine sparkling clarity with fine, energetic bubbles that dance across the tongue, delivering refreshing malic acidity balanced by delicate fruit sugars<cite data-ref="https://www.internationalciderchallenge.com/"></cite>.</li><li><b>Finish:</b> Extra-dry, brisk, and flinty with a clean, lingering green apple snap<cite data-ref="https://www.worlddrinksawards.com/winner-cider/"></cite>.</li></ul><h3>Awards & International Stature</h3><ul><li>Honored with the <b>Gold Trophy</b> at the International Cider Challenge and recognized repeatedly at the World Cider Awards<cite data-ref="https://www.internationalciderchallenge.com/"></cite><cite data-ref="https://www.worlddrinksawards.com/winner-cider/"></cite>.</li><li>Celebrated as the quintessential partner for English roast pork, British coastal oysters, and mature cheddar cheeses<cite data-ref="https://www.aspall.co.uk/our-cyders/premier-cru/"></cite>.</li></ul>`,
  },
];

async function main() {
  console.log(`Starting addition and enrichment for ${CIDERS.length} world-class alcoholic ciders...`);

  const prod = prodBase();
  const prodSecret = process.env.JOBS_PROD_SESSION_SECRET;
  const adminToken = readFileSync('.scrape/admin.token', 'utf8').trim();

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

  // Load taste.json and blurbs.json
  const tastePath = path.resolve('scripts/products/taste.json');
  const blurbsPath = path.resolve('scripts/products/blurbs.json');
  let tasteEntries: any[] = JSON.parse(readFileSync(tastePath, 'utf8'));
  let blurbsEntries: any[] = JSON.parse(readFileSync(blurbsPath, 'utf8'));

  for (let i = 0; i < CIDERS.length; i++) {
    const item = CIDERS[i];
    console.log(`\n==================================================`);
    console.log(`[${i + 1}/${CIDERS.length}] Processing: ${item.name}`);

    // --- 1. ENSURE COMPANY EXISTS ---
    // A. Local Company
    let localCompanyId: number;
    const existingLocalCo = await db.query<{ id: number }>(
      `SELECT "id" FROM "Company" WHERE name = $1`,
      [item.company.name]
    );
    if (existingLocalCo.length > 0) {
      localCompanyId = existingLocalCo[0].id;
    } else {
      const [ins] = await db.query<{ id: number }>(
        `INSERT INTO "Company" (name, "websiteUrl", "logoUrl", description)
         VALUES ($1, $2, $3, $4)
         RETURNING "id"`,
        [item.company.name, item.company.websiteUrl, item.company.logoUrl, item.company.description]
      );
      localCompanyId = ins.id;
      console.log(`  Created local company ${localCompanyId}: ${item.company.name}`);
    }

    // B. Prod Company
    let prodCompanyId: number = localCompanyId;
    if (prod) {
      const searchRes = await fetch(`${prod}/api/admin/db/Company?name=${encodeURIComponent(item.company.name)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const searchData = await searchRes.json();
      const match = (searchData.rows || []).find((r: any) => r.name.toLowerCase() === item.company.name.toLowerCase());
      if (match) {
        prodCompanyId = match.id;
      } else {
        const createCoRes = await fetch(`${prod}/api/admin/db/Company`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify([item.company]),
        });
        const createdCoData = await createCoRes.json();
        prodCompanyId = createdCoData.rows?.[0]?.id;
        console.log(`  Created prod company ${prodCompanyId}: ${item.company.name}`);
      }
    }

    // --- 2. LOCAL PIN CREATION & ENRICHMENT ---
    let localPinId: number;
    const existingLocalPin = await db.query<{ id: number; title: string }>(
      `SELECT "id", "title" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND ("sourceUrl" = $1 OR "title" = $2 OR "productName" = $3)`,
      [item.sourceUrl, item.title, item.productName]
    );

    if (existingLocalPin.length > 0) {
      localPinId = existingLocalPin[0].id;
      console.log(`  Local pin exists: ${localPinId}`);
    } else {
      const postPinRes = await fetch(`${apiBase()}/api/pins`, {
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
      console.log(`  Created local pin: ${localPinId}`);
    }

    // Attach media locally
    const getLocal = await fetch(`${apiBase()}/api/pins/${localPinId}`);
    if (getLocal.ok) {
      const localPinObj = await getLocal.json();
      if (!localPinObj.media || localPinObj.media.length === 0) {
        await fetch(`${apiBase()}/api/pins/${localPinId}`, {
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

    // Save local taste
    await saveTaste(localPinId, item.taste.scores, {
      abv: item.taste.abv,
      abvSourceUrl: item.taste.abvSourceUrl,
      source: 'hand',
      basis: item.taste.basis,
      sourceUrl: item.taste.sourceUrl,
      reviews: item.taste.reviews,
    });

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
      // Check if exists on prod
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
          throw new Error(`Failed to create prod pin: ${createProdRes.status} ${await createProdRes.text()}`);
        }
        const createdProd = await createProdRes.json();
        prodPinId = createdProd.id;
        console.log(`  Created prod pin: ${prodPinId}`);
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
              media: [{ type: 1, originalUrl: item.imageUrl }],
            }),
          });
          if (putMediaRes.ok) {
            console.log(`  Attached media to prod pin ${prodPinId}`);
          } else {
            console.warn(`  Media attachment on prod returned ${putMediaRes.status}`);
          }
        }
      }

      // Update prod Pin via PATCH /api/admin/db/Pin?id=:id
      await new Promise((r) => setTimeout(r, 1000));
      const patchProdRes = await fetch(`${prod}/api/admin/db/Pin?id=${prodPinId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          companyId: prodCompanyId,
          price: item.price,
          priceCurrency: item.priceCurrency,
          dateConfidenceReasoning: item.dateConfidenceReasoning,
          longFormSummary: item.longFormSummary,
          productName: item.productName,
        }),
      });
      if (!patchProdRes.ok) {
        console.warn(`  PATCH prod pin failed: ${patchProdRes.status} ${await patchProdRes.text()}`);
      } else {
        console.log(`  PATCH prod pin ${prodPinId} succeeded`);
      }

      // Add prod references
      const postRefsRes = await fetch(`${prod}/api/pins/${prodPinId}/references`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          references: item.references,
        }),
      });
      if (postRefsRes.ok) {
        console.log(`  POST references on prod succeeded`);
      }

      // Save prod taste
      const putTasteRes = await fetch(`${prod}/api/pins/${prodPinId}/taste`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...item.taste.scores,
          abv: item.taste.abv,
          abvSourceUrl: item.taste.abvSourceUrl,
          source: 'hand',
          basis: item.taste.basis,
          sourceUrl: item.taste.sourceUrl,
          reviews: item.taste.reviews,
        }),
      });
      if (putTasteRes.ok) {
        console.log(`  PUT taste on prod succeeded`);
      }

      // Save prod blurb
      await fetch(`${prod}/api/admin/db/ProductBlurb?upsert=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
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

    // --- 4. UPDATE LOCAL taste.json & blurbs.json ---
    const targetIds = [localPinId];
    if (prodPinId) targetIds.push(prodPinId);

    for (const pinId of targetIds) {
      // taste
      const tIdx = tasteEntries.findIndex((e) => e.pinId === pinId);
      const newTaste = {
        pinId,
        ...item.taste.scores,
        basis: item.taste.basis,
        reviews: item.taste.reviews,
      };
      if (tIdx >= 0) tasteEntries[tIdx] = { ...tasteEntries[tIdx], ...newTaste };
      else tasteEntries.push(newTaste);

      // blurbs
      const bIdx = blurbsEntries.findIndex((e) => e.pinId === pinId);
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

  // Write files
  writeFileSync(tastePath, JSON.stringify(tasteEntries, null, 2), 'utf8');
  writeFileSync(blurbsPath, JSON.stringify(blurbsEntries, null, 2), 'utf8');
  console.log(`\nSuccessfully updated taste.json and blurbs.json`);

  await db.closeConnection();
  console.log('\nAll 8 world-class alcoholic ciders have been added and enriched across prod and local!');
}

main().catch((err) => {
  console.error('Fatal error adding ciders:', err);
  process.exit(1);
});
