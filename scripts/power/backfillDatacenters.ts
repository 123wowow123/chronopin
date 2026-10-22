// Backfills PinDatacenter, PinPower, and PinEnergy across all existing Data Center
// pins in the database, and seeds major unpinned Pennsylvania, Frontier AI (Epoch AI),
// Business Insider air-permit, and AI Data Center Legislation pins from the 6 trackers:
//   - https://trackdatacenters.com/usa/pennsylvania (Data Center Tracker)
//   - https://aidatacentermap.org/map (AI Data Center Map)
//   - https://datacentertracker.org & /legislation (Datacenter Tracker & Legislation Tracker)
//   - https://epoch.ai/data/data-centers (Epoch AI Data Center Datasets)
//   - Business Insider / Cleanview Air Permit Backup Generator Tracker
//
// Usage:
//   npx tsx scripts/power/backfillDatacenters.ts

import '../env';
import fs from 'node:fs';
import * as db from '@/server/db';
import { estimateWaterGallonsPerDayFromMw, normalizeCooling, normalizePowerSource, type WaterBasis } from '@/lib/datacenter';
import { saveDatacenter } from '@/server/model/pinDatacenter';

const CHECKED_AT = '2026-10-21';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNumber(raw: string): number | null {
  const n = Number(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Parse text (title + description + longFormSummary) for explicit datacenter metrics.
function parseMetricsFromText(text: string): {
  waterGallonsPerDay?: number;
  waterBasis?: WaterBasis;
  chips?: number;
  chipModel?: string;
  h100Equivalents?: number;
  acres?: number;
  sqft?: number;
  buildings?: number;
  generators?: number;
  cooling?: string;
  powerSource?: string;
} {
  const out: ReturnType<typeof parseMetricsFromText> = {};

  // Water in MGD (million gallons per day)
  const mgdMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MGD|million\s+gallons?\s+(?:of\s+water\s+)?(?:per|a)\s+day)/i);
  if (mgdMatch) {
    const mgd = Number(mgdMatch[1]);
    if (mgd > 0 && mgd < 500) {
      out.waterGallonsPerDay = Math.round(mgd * 1_000_000);
      out.waterBasis = /permit/i.test(text) ? 'permitted' : 'published';
    }
  }
  if (!out.waterGallonsPerDay) {
    const gpdMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d{4,9})\s*(?:gallons?\s+(?:of\s+water\s+)?(?:per|a)\s+day|gal\/d|gpd)/i);
    if (gpdMatch) {
      const gpd = parseNumber(gpdMatch[1]);
      if (gpd && gpd >= 500 && gpd <= 500_000_000) {
        out.waterGallonsPerDay = Math.round(gpd);
        out.waterBasis = /permit/i.test(text) ? 'permitted' : 'published';
      }
    }
  }

  // Acres
  const acresMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:-|\s)?acres?\b/i);
  if (acresMatch) {
    const ac = parseNumber(acresMatch[1]);
    if (ac && ac >= 1 && ac <= 100_000) out.acres = ac;
  }

  // Square feet
  const mSqftMatch = text.match(/(\d+(?:\.\d+)?)\s*million\s*(?:sq\.?\s*ft\.?|square\s*feet|square-foot)/i);
  if (mSqftMatch) {
    const m = Number(mSqftMatch[1]);
    if (m > 0 && m < 100) out.sqft = Math.round(m * 1_000_000);
  } else {
    const sqftMatch = text.match(/(\d{1,3}(?:,\d{3})+)\s*(?:sq\.?\s*ft\.?|square\s*feet|square-foot)/i);
    if (sqftMatch) {
      const sf = parseNumber(sqftMatch[1]);
      if (sf && sf >= 5_000 && sf <= 100_000_000) out.sqft = Math.round(sf);
    }
  }

  // Buildings
  const bldgMatch = text.match(/\b(\d{1,3})\s+(?:data\s+center\s+|hyperscale\s+|compute\s+)?buildings?\b/i);
  if (bldgMatch) {
    const b = Number(bldgMatch[1]);
    if (b >= 1 && b <= 200) out.buildings = b;
  }

  // Generators
  const genMatch = text.match(/\b(\d{1,4})\s+(?:backup\s+|emergency\s+|diesel\s+|tier\s+4\s+|natural\s+gas\s+){0,3}generators?\b/i);
  if (genMatch) {
    const g = Number(genMatch[1]);
    if (g >= 1 && g <= 5000) out.generators = g;
  }

  // AI Chips / GPUs / TPUs / Trainium
  const chipMatch = text.match(/(\d{1,3}(?:,\d{3})+|\d+\s*k)\s*(NVIDIA\s+(?:GB200|GB300|B200|H100|H200|Blackwell|Rubin)|AMD\s+MI3\d\dX?|AWS\s+Trainium\d?|Trainium\d?|Google\s+TPU\s*v\d\w*|TPU\s*v\d\w*|H100|H200|GB200|B200)\s*(?:GPUs?|chips?|accelerators?|superchips?)?/i);
  if (chipMatch) {
    const rawCount = chipMatch[1].toLowerCase().endsWith('k')
      ? Number(chipMatch[1].slice(0, -1).trim()) * 1000
      : parseNumber(chipMatch[1]);
    if (rawCount && rawCount >= 500 && rawCount <= 10_000_000) {
      out.chips = Math.round(rawCount);
      out.chipModel = chipMatch[2].replace(/\s+/g, ' ').trim();
    }
  }

  // Cooling
  if (/closed-loop\s+(?:liquid|waterless|chiller)/i.test(text)) {
    out.cooling = 'Closed-loop liquid cooling';
  } else if (/direct-to-chip\s+liquid\s+cooling/i.test(text)) {
    out.cooling = 'Direct-to-chip liquid cooling';
  } else if (/adiabatic\s+cooling/i.test(text)) {
    out.cooling = 'Adiabatic air-assisted cooling';
  } else if (/evaporative\s+cooling/i.test(text)) {
    out.cooling = 'Evaporative cooling towers';
  } else if (/air-cooled\s+chillers/i.test(text)) {
    out.cooling = 'Air-cooled chillers';
  }

  return out;
}

type NewDatacenterSeed = {
  title: string;
  company: string;
  address: string;
  latitude: number;
  longitude: number;
  utcStartDateTime: string;
  dateConfidence: 'confirmed' | 'estimated';
  dateConfidenceReasoning: string;
  sourceUrl: string;
  price: number | null;
  description: string;
  longFormSummary: string;
  tags: string[];
  categories: string[];
  megawatts: number | null;
  gwh: number | null;
  energyBasis?: 'published' | 'contracted' | 'calculated';
  datacenter: {
    waterGallonsPerDay?: number | null;
    waterBasis?: WaterBasis | null;
    chips?: number | null;
    chipModel?: string | null;
    h100Equivalents?: number | null;
    acres?: number | null;
    sqft?: number | null;
    buildings?: number | null;
    generators?: number | null;
    cooling?: string | null;
    powerSource?: string | null;
    sourceUrl?: string | null;
    note?: string | null;
  };
};

const NEW_SEEDS: NewDatacenterSeed[] = [
  {
    title: 'Homer City Energy + AI Campus: 4,500 MW Gas-Powered Hyperscale Data Center Redevelopment',
    company: 'Homer City Redevelopment LLC / Knighthead Capital Management',
    address: 'Homer City, Indiana County, Pennsylvania',
    latitude: 40.5125,
    longitude: -79.1965,
    utcStartDateTime: '2027-12-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'First turbine deliveries and initial data center phase targeted for late 2027 on the former 3,200-acre Homer City Generating Station site.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#homer-city-energy-campus',
    price: 10_000_000_000,
    description: '<p>Homer City Redevelopment LLC and GE Vernova are transforming the former 3,200-acre coal plant in Indiana County, Pennsylvania into a 4,500 MW natural-gas-powered AI data center campus backed by seven GE Vernova 7HA.02 hydrogen-enabled gas turbines and over $10 billion in capital investment.</p>',
    longFormSummary: '<ul><li><strong>Capacity &amp; Power Source:</strong> Up to 4,500 MW of behind-the-meter and PJM grid-connected natural gas generation using seven GE Vernova 7HA.02 gas turbines (~1,576,800 US homes equivalent).<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#homer-city-energy-campus"></cite></li><li><strong>Physical Footprint:</strong> 3,200-acre brownfield redevelopment site at the former Homer City Generating Station in Center Township, Indiana County, PA.</li><li><strong>Water &amp; Cooling:</strong> Draws industrial cooling water from the Yellow Creek / Two Lick Creek reservoir allocation alongside high-density liquid cooling loops (~5.39 MGD estimated at full load).</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Natural Gas', 'PJM Interconnection', 'Hyperscale'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 4500,
    gwh: 23652,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 5_392_260,
      waterBasis: 'estimated',
      chips: 1_200_000,
      chipModel: 'Next-gen AI GPUs (projected campus capacity)',
      h100Equivalents: 2_800_000,
      acres: 3200,
      sqft: 6_500_000,
      buildings: 12,
      generators: 7,
      cooling: 'Hybrid closed-loop liquid & reservoir cooling',
      powerSource: '7x GE Vernova 7HA.02 natural gas turbines + PJM grid',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: 'Largest announced data center power campus in Pennsylvania ($10B+ initial capex)',
    },
  },
  {
    title: 'Wildcat Ridge AI Data Center: 1,600 MW Campus with 588 Backup Generators in Lancaster County, PA',
    company: 'avaio Digital Partners / PPL Electric Utilities',
    address: 'Conoy Township, Lancaster County, Pennsylvania',
    latitude: 40.095,
    longitude: -76.662,
    utcStartDateTime: '2028-06-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Multi-phase hyperscale buildout in Lancaster County scheduled for initial commissioning in mid-2028 following zoning and PA DEP air-permit review.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#wildcat-ridge-ai-data-center',
    price: 6_500_000_000,
    description: '<p>Wildcat Ridge is a proposed 1,600 MW hyperscale AI data center campus across 1,355 acres in Lancaster County, Pennsylvania featuring 14 data center buildings and 588 permitted emergency backup diesel generators.</p>',
    longFormSummary: '<ul><li><strong>Power &amp; Backup Fleet:</strong> 1,600 MW utility load on PPL Electric Utilities / PJM grid backed by 588 diesel emergency generators documented in Pennsylvania tracker filings.<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#wildcat-ridge-ai-data-center"></cite></li><li><strong>Site Footprint:</strong> 1,355 acres with 14 planned data halls in Lancaster County, PA.</li><li><strong>Water Usage:</strong> Estimated 1.92 MGD cooling demand at 0.45 L/kWh WUE unless closed-loop dry chillers are mandated.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Diesel Generators', 'PJM Interconnection'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 1600,
    gwh: 8409.6,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 1_917_248,
      waterBasis: 'estimated',
      acres: 1355,
      sqft: 3_800_000,
      buildings: 14,
      generators: 588,
      cooling: 'Closed-loop / evaporative hybrid cooling',
      powerSource: 'PPL Electric Utilities (PJM Grid)',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: '588 emergency backup generators tracked in PA filings',
    },
  },
  {
    title: 'Project Hummingbird: 910 MW Data Center Campus Drawing 18 MGD Water in Luzerne County, PA',
    company: 'Project Hummingbird LLC / Talen Energy / PPL',
    address: 'Salem Township, Luzerne County, Pennsylvania',
    latitude: 41.078,
    longitude: -76.165,
    utcStartDateTime: '2028-03-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Proposed 910 MW Luzerne County hyperscale campus targeting 2028 phase-1 operations following Susquehanna River Basin water withdrawal review.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#project-hummingbird',
    price: 4_200_000_000,
    description: '<p>Project Hummingbird is a 910 MW hyperscale data center development on 600 acres in Luzerne County, Pennsylvania with up to 18 million gallons per day (18 MGD) in tracked cooling water demand from the Susquehanna River basin.</p>',
    longFormSummary: '<ul><li><strong>Water Withdrawal:</strong> Tracked at up to 18,000,000 gallons per day (18 MGD) of cooling water draw in Pennsylvania community and environmental filings.<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#project-hummingbird"></cite></li><li><strong>Power &amp; Footprint:</strong> 910 MW electrical capacity across 600 acres and 10 planned data center buildings (~318,864 US homes equivalent).</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Water Usage', 'Susquehanna River'],
    categories: ['Infrastructure', 'AI', 'Environment'],
    megawatts: 910,
    gwh: 4783,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 18_000_000,
      waterBasis: 'permitted',
      acres: 600,
      sqft: 2_500_000,
      buildings: 10,
      cooling: 'Evaporative cooling towers (Susquehanna River basin withdrawal)',
      powerSource: 'PPL Electric / Susquehanna Nuclear grid corridor',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: '18 MGD peak water allocation tracked by PA Data Center Tracker & DatacenterTracker.org',
    },
  },
  {
    title: 'AWS Susquehanna Nuclear Data Center Campus (Cumulus): 960 MW Co-Located Nuclear Compute Site',
    company: 'Amazon Web Services (AWS) / Talen Energy',
    address: 'Salem Township, Luzerne County, Pennsylvania',
    latitude: 41.0919,
    longitude: -76.1462,
    utcStartDateTime: '2026-12-15T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Initial 480 MW–960 MW AWS data center phases co-located at the 2.5 GW Susquehanna Steam Electric Station in Luzerne County, PA.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#aws-susquehanna-data-center',
    price: 20_000_000_000,
    description: '<p>Amazon Web Services (AWS) acquired the Cumulus data center campus directly adjacent to Talen Energy’s 2.5 GW Susquehanna Steam Electric Station nuclear plant in Luzerne County, Pennsylvania, scaling up to 960 MW of carbon-free AI and cloud compute capacity as part of AWS’s $20 billion Pennsylvania investment.</p>',
    longFormSummary: '<ul><li><strong>Nuclear Co-Location:</strong> 960 MW contracted power ramp from Talen Energy’s Susquehanna nuclear power station (transitioned from behind-the-meter to front-of-the-meter PJM transmission structure in 2025).<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#aws-susquehanna-data-center"></cite></li><li><strong>Campus Scale:</strong> ~1,200-acre campus footprint with up to 15 planned data center halls and closed-loop / air-assisted liquid cooling for AWS Trainium2 and NVIDIA GPU clusters.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Nuclear Energy', 'AWS', 'Hyperscale'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 960,
    gwh: 5045.8,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 1_150_349,
      waterBasis: 'estimated',
      chips: 350_000,
      chipModel: 'AWS Trainium2 & NVIDIA GB200',
      h100Equivalents: 620_000,
      acres: 1200,
      sqft: 3_200_000,
      buildings: 15,
      generators: 160,
      cooling: 'Direct-to-chip liquid cooling + air-cooled chillers',
      powerSource: 'Susquehanna Steam Electric Station (Nuclear, 2.5 GW) / PJM',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: 'Anchor site of Amazon Web Services $20B Pennsylvania AI infrastructure expansion',
    },
  },
  {
    title: 'PAX Pennsylvania Digital I: 1,350 MW Hyperscale Campus across 1,288 Acres in Lackawanna County, PA',
    company: 'PAX Pennsylvania Digital / PPL Electric Utilities',
    address: 'Archbald & Blakely, Lackawanna County, Pennsylvania',
    latitude: 41.495,
    longitude: -75.542,
    utcStartDateTime: '2028-09-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Proposed 1,350 MW multi-building campus in Lackawanna County targeting 2028 initial phase completion.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#pax-pennsylvania-digital-i',
    price: 5_500_000_000,
    description: '<p>PAX Pennsylvania Digital I is a proposed 1,350 MW hyperscale AI data center campus spanning 1,288 acres in Lackawanna County, Northeastern Pennsylvania.</p>',
    longFormSummary: '<ul><li><strong>Power &amp; Land Footprint:</strong> 1,350 MW planned electrical capacity across 1,288 acres in the Scranton–Wilkes-Barre PJM transmission corridor (~473,040 US homes equivalent).<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#pax-pennsylvania-digital-i"></cite></li><li><strong>Water &amp; Cooling:</strong> Estimated 1.62 MGD cooling demand; municipal and closed-loop cooling plans under local zoning review in Lackawanna County.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'PJM Interconnection', 'Hyperscale'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 1350,
    gwh: 7095.6,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 1_617_678,
      waterBasis: 'estimated',
      acres: 1288,
      sqft: 4_100_000,
      buildings: 18,
      cooling: 'Closed-loop liquid cooling',
      powerSource: 'PPL Electric Utilities (PJM 500 kV corridor)',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: 'Tracked in Pennsylvania Data Center Tracker (1,350 MW, 1,288 acres)',
    },
  },
  {
    title: 'Project Gold: 1,500 MW Hyperscale Data Center Campus on 1,260 Acres in Luzerne County, PA',
    company: 'Project Gold Developer / PPL Electric Utilities',
    address: 'Hazle Township, Luzerne County, Pennsylvania',
    latitude: 40.958,
    longitude: -76.012,
    utcStartDateTime: '2028-10-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: '1,500 MW Luzerne County hyperscale campus scheduled for late 2028 initial commissioning.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#project-gold',
    price: 6_000_000_000,
    description: '<p>Project Gold is a 1,500 MW proposed hyperscale data center development on 1,260 acres in Luzerne County, Pennsylvania.</p>',
    longFormSummary: '<ul><li><strong>Scale &amp; Grid Impact:</strong> 1,500 MW planned load on PPL Electric Utilities / PJM grid (~525,600 US homes equivalent) across 1,260 acres.<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#project-gold"></cite></li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'PJM Interconnection', 'Hyperscale'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 1500,
    gwh: 7884,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 1_797_420,
      waterBasis: 'estimated',
      acres: 1260,
      sqft: 4_500_000,
      buildings: 16,
      cooling: 'Closed-loop chiller system',
      powerSource: 'PPL Electric Utilities (PJM Grid)',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: '1,500 MW across 1,260 acres in Luzerne County, PA',
    },
  },
  {
    title: 'CoreWeave Lancaster AI Data Center: $6B, 300 MW Frontier GPU Supercomputer Campus in PA',
    company: 'CoreWeave / Chirisa Technology Parks / Machine Investment Group',
    address: 'Lancaster, Lancaster County, Pennsylvania',
    latitude: 40.056,
    longitude: -76.298,
    utcStartDateTime: '2027-06-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Announced July 2025 at the Pennsylvania Energy and Innovation Summit with initial 100 MW phase scaling to 300 MW by 2027.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#coreweave-lancaster',
    price: 6_000_000_000,
    description: '<p>CoreWeave committed up to $6 billion to build a 100 MW to 300 MW frontier AI data center in Lancaster, Pennsylvania co-developed with Chirisa Technology Parks and Machine Investment Group.</p>',
    longFormSummary: '<ul><li><strong>Compute &amp; Chips:</strong> Designed for liquid-cooled NVIDIA Blackwell GB200/GB300 NVL72 racks totaling ~120,000 GPUs (~310,000 H100-equivalents) at full 300 MW buildout.<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#coreweave-lancaster"></cite></li><li><strong>Power &amp; Cooling:</strong> 100 MW initial IT load expanding to 300 MW on PPL Electric Utilities grid with direct-to-chip closed-loop liquid cooling.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'CoreWeave', 'NVIDIA Blackwell'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 300,
    gwh: 1576.8,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 359_484,
      waterBasis: 'estimated',
      chips: 120_000,
      chipModel: 'NVIDIA GB200 / GB300 NVL72',
      h100Equivalents: 310_000,
      acres: 115,
      sqft: 900_000,
      buildings: 3,
      generators: 72,
      cooling: 'Direct-to-chip closed-loop liquid cooling',
      powerSource: 'PPL Electric Utilities (PJM Grid)',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: 'Announced at the July 2025 Pennsylvania Energy & Innovation Summit ($6B capex)',
    },
  },
  {
    title: 'TECfusions Keystone Connect: 1,000 MW Adaptive Reuse AI Data Center on 1,395 Acres in Upper Burrell, PA',
    company: 'TECfusions',
    address: 'Upper Burrell Township, Westmoreland County, Pennsylvania',
    latitude: 40.5588,
    longitude: -79.6694,
    utcStartDateTime: '2027-04-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Phased 1,000 MW buildout at the former Alcoa Technical Center campus in Westmoreland County, PA.',
    sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania#tecfusions-keystone-connect',
    price: 3_000_000_000,
    description: '<p>TECfusions is converting the 1,395-acre former Alcoa Technical Center in Upper Burrell, Westmoreland County, Pennsylvania into Keystone Connect, a 1,000 MW AI data center campus with on-site natural gas microgrid generation.</p>',
    longFormSummary: '<ul><li><strong>Power &amp; Microgrid:</strong> Up to 1,000 MW of combined utility and on-site natural gas generation across 1,395 acres in Western Pennsylvania.<cite data-ref="https://trackdatacenters.com/usa/pennsylvania#tecfusions-keystone-connect"></cite></li><li><strong>Adaptive Reuse:</strong> Converts existing industrial R&amp;D buildings and adds new high-density AI halls totaling ~2.1 million sq ft.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Microgrid', 'Hyperscale'],
    categories: ['Infrastructure', 'AI', 'Energy'],
    megawatts: 1000,
    gwh: 5256,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 450_000,
      waterBasis: 'estimated',
      chips: 250_000,
      chipModel: 'High-density AI accelerators',
      h100Equivalents: 500_000,
      acres: 1395,
      sqft: 2_100_000,
      buildings: 6,
      cooling: 'Waterless closed-loop direct-to-chip liquid cooling',
      powerSource: 'On-site natural gas microgrid + West Penn Power (FirstEnergy)',
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: 'Former Alcoa Technical Center 1,395-acre campus in Westmoreland County, PA',
    },
  },
  {
    title: 'xAI Colossus 2 Memphis Supercluster: 946 MW, 555,000 NVIDIA GPU Frontier AI Data Center',
    company: 'xAI (SpaceXAI)',
    address: '3231 Paul R. Lowry Rd, Memphis, Shelby County, Tennessee',
    latitude: 35.0044,
    longitude: -90.1561,
    utcStartDateTime: '2026-06-30T00:00:00Z',
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: 'Epoch AI satellite and power timeline tracking confirms Colossus 1 & 2 reaching 946 MW and 1,111,673 H100-equivalents (~555,000 GPUs) by mid-2026.',
    sourceUrl: 'https://epoch.ai/data/data-centers#colossus-2',
    price: 35_836_372_000,
    description: '<p>xAI’s Colossus supercluster in Memphis, Tennessee is tracked by Epoch AI at 946 MW of active power and 1,111,673 H100-equivalents (~555,000 NVIDIA H100, H200, and GB200 GPUs) backed by a 150 MW Megapack battery farm, a greywater recycling plant, and natural gas turbines across the state line in Southaven, Mississippi.</p>',
    longFormSummary: '<ul><li><strong>Chip Count &amp; Compute:</strong> 555,000 NVIDIA GPUs (H100, H200, GB200) delivering 1,111,673 H100-equivalents and ~$35.8B in estimated total capital cost.<cite data-ref="https://epoch.ai/data/data-centers#colossus-2"></cite></li><li><strong>Power &amp; Turbines:</strong> 946 MW total site power supported by MLGW/TVA substations, Tesla Megapack battery storage, and 35+ Solaris mobile &amp; fixed natural gas turbines at the adjacent Duke/Southaven site.</li><li><strong>Water &amp; Cooling:</strong> Draws up to 5.0 MGD (5,000,000 gal/day), transitioning to a $80M municipal wastewater greywater treatment plant serving xAI, Nucor, and TVA.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'xAI', 'NVIDIA GB200', 'Epoch AI', 'Hyperscale'],
    categories: ['AI', 'Infrastructure', 'Energy'],
    megawatts: 946,
    gwh: 4972.2,
    energyBasis: 'published',
    datacenter: {
      waterGallonsPerDay: 5_000_000,
      waterBasis: 'published',
      chips: 555_000,
      chipModel: 'NVIDIA H100 / H200 / GB200',
      h100Equivalents: 1_111_673,
      acres: 550,
      sqft: 1_850_000,
      buildings: 4,
      generators: 35,
      cooling: '121+ air-cooled chillers + Direct-to-chip liquid cooling + 5 MGD greywater recycling plant',
      powerSource: 'TVA / MLGW Grid + 35 natural gas turbines + 150 MW Tesla Megapacks',
      sourceUrl: 'https://epoch.ai/data/data-centers',
      note: 'Epoch AI #1 largest operational AI cluster as of Oct 2026 (1.11M H100-eq, $35.8B total capex)',
    },
  },
  {
    title: 'Anthropic–Amazon Project Rainier (New Carlisle): 2,200 MW AWS Trainium2 AI Supercluster in Indiana',
    company: 'Amazon Web Services (AWS) / Anthropic',
    address: 'New Carlisle, St. Joseph County, Indiana',
    latitude: 41.6986,
    longitude: -86.4694,
    utcStartDateTime: '2026-05-01T00:00:00Z',
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: 'First phase operational in late 2025/early 2026 with 16+ buildings scaling toward 2.2 GW and 1.24M+ H100-equivalents.',
    sourceUrl: 'https://epoch.ai/data/data-centers#amazon-new-carlisle',
    price: 11_000_000_000,
    description: '<p>Amazon Web Services’ $11 billion New Carlisle, Indiana hyperscale campus is the primary site of Project Rainier, an AI compute cluster built for Anthropic featuring over 500,000 AWS Trainium2 chips (~1.24 million H100-equivalents) and scaling toward 2,200 MW across 1,200 acres.</p>',
    longFormSummary: '<ul><li><strong>AI Chips:</strong> 500,000+ AWS Trainium2 accelerators (~1,240,000 H100-equivalents tracked by Epoch AI across New Carlisle and Canton MS partner sites) connected via UltraCluster EC2 fabrics.<cite data-ref="https://epoch.ai/data/data-centers#amazon-new-carlisle"></cite></li><li><strong>Power, Backup &amp; Footprint:</strong> 2,200 MW planned campus utility capacity via Indiana Michigan Power (AEP), 1,200 acres, up to 30 data center buildings, and over 220 permitted Caterpillar diesel backup generators.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'AWS', 'Anthropic', 'Trainium2', 'Epoch AI', 'Hyperscale'],
    categories: ['AI', 'Infrastructure', 'Energy'],
    megawatts: 2200,
    gwh: 11563.2,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 4_500_000,
      waterBasis: 'permitted',
      chips: 500_000,
      chipModel: 'AWS Trainium2',
      h100Equivalents: 1_240_000,
      acres: 1200,
      sqft: 4_800_000,
      buildings: 24,
      generators: 220,
      cooling: 'Outside-air economization + direct evaporative cooling',
      powerSource: 'Indiana Michigan Power (AEP / PJM Grid)',
      sourceUrl: 'https://epoch.ai/data/data-centers',
      note: 'Anthropic Project Rainier flagship cluster ($11B initial AWS Indiana investment)',
    },
  },
  {
    title: 'OpenAI Stargate Abilene (Lancium Clean Campus): 1,200 MW, 400,000 NVIDIA GB200 AI Supercluster',
    company: 'OpenAI / Oracle / Crusoe Energy / SoftBank',
    address: 'Abilene, Taylor County, Texas',
    latitude: 32.3512,
    longitude: -99.8325,
    utcStartDateTime: '2026-08-01T00:00:00Z',
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: 'Phase 1 (2 buildings, 200+ MW) operational in 2025–2026 and Phase 2 (6 additional buildings, 1.2 GW total) reaching completion across 2026.',
    sourceUrl: 'https://epoch.ai/data/data-centers#crusoe-abilene',
    price: 25_000_000_000,
    description: '<p>The flagship Stargate AI data center campus in Abilene, Texas—developed by Crusoe Energy and Lancium and leased by Oracle for OpenAI—scales to 1,200 MW across eight H-shaped data halls housing up to 400,000 NVIDIA GB200 NVL72 GPUs (~1.15 million H100-equivalents).</p>',
    longFormSummary: '<ul><li><strong>Chip Count &amp; Compute:</strong> Up to 400,000 NVIDIA GB200 Blackwell Superchips across 8 buildings (~1,150,000 H100-equivalents tracked by Epoch AI).<cite data-ref="https://epoch.ai/data/data-centers#crusoe-abilene"></cite></li><li><strong>Cooling &amp; Zero-Water Loop:</strong> Uses a closed-loop zero-evaporation liquid cooling system requiring ~1 million gallons for initial charge and only ~12,000 gallons/year per building thereafter.</li><li><strong>Power:</strong> 1,200 MW ERCOT grid interconnection plus 360 MW on-site natural gas turbine bridge/peaker plant and West Texas wind/solar PPAs.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'OpenAI', 'Oracle', 'Stargate', 'NVIDIA GB200', 'Epoch AI'],
    categories: ['AI', 'Infrastructure', 'Energy'],
    megawatts: 1200,
    gwh: 6307.2,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 25_000,
      waterBasis: 'published',
      chips: 400_000,
      chipModel: 'NVIDIA GB200 NVL72',
      h100Equivalents: 1_150_000,
      acres: 1100,
      sqft: 4_000_000,
      buildings: 8,
      generators: 144,
      cooling: 'Zero-water-evaporation closed-loop direct-to-chip liquid cooling',
      powerSource: 'ERCOT Grid (Wind/Solar) + 360 MW on-site natural gas turbines',
      sourceUrl: 'https://epoch.ai/data/data-centers',
      note: 'Flagship Stargate I campus (Crusoe / Oracle / OpenAI, 8 H-buildings in Abilene, TX)',
    },
  },
  {
    title: 'Microsoft Fairwater Mount Pleasant AI Superfactory: 1,000 MW, 1.48M H100-eq Campus in Wisconsin',
    company: 'Microsoft',
    address: 'Mount Pleasant, Racine County, Wisconsin',
    latitude: 42.7128,
    longitude: -87.9512,
    utcStartDateTime: '2026-09-01T00:00:00Z',
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: 'First Fairwater Wisconsin AI Superfactory phase coming online in 2026 on the former Foxconn site in Mount Pleasant, WI.',
    sourceUrl: 'https://epoch.ai/data/data-centers#microsoft-mount-pleasant',
    price: 7_300_000_000,
    description: '<p>Microsoft’s Fairwater AI Superfactory in Mount Pleasant, Wisconsin spans 1,300+ acres on the former Foxconn site, deploying hundreds of thousands of liquid-cooled NVIDIA GB200 and B200 GPUs (~1.48 million H100-equivalents across Phase 1 &amp; 2) at ~1,000 MW of power capacity.</p>',
    longFormSummary: '<ul><li><strong>Compute Scale:</strong> Linked with Microsoft Fairwater Atlanta via a dedicated ultra-low-latency optical WAN to form a unified AI superfactory; Mount Pleasant is tracked at ~500,000 Blackwell GPUs (~1,480,000 H100-equivalents).<cite data-ref="https://epoch.ai/data/data-centers#microsoft-mount-pleasant"></cite></li><li><strong>Cooling:</strong> Closed-loop zero-water-evaporation liquid cooling across over 90% of the facility capacity.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Microsoft', 'NVIDIA GB200', 'Epoch AI', 'Hyperscale'],
    categories: ['AI', 'Infrastructure', 'Energy'],
    megawatts: 1000,
    gwh: 5256,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 75_000,
      waterBasis: 'published',
      chips: 500_000,
      chipModel: 'NVIDIA GB200 / B200 NVL72',
      h100Equivalents: 1_480_000,
      acres: 1345,
      sqft: 3_500_000,
      buildings: 9,
      generators: 180,
      cooling: 'Closed-loop zero-evaporation direct-to-chip liquid cooling',
      powerSource: 'We Energies (MISO Grid) + 250 MW new solar/gas capacity',
      sourceUrl: 'https://epoch.ai/data/data-centers',
      note: 'Microsoft Fairwater AI Superfactory flagship site ($3.3B Phase 1 + $4B Phase 2)',
    },
  },
  {
    title: 'Meta Hyperion AI Data Center Campus: 2,000 MW, $10B+ Frontier Cluster in Richland Parish, Louisiana',
    company: 'Meta Platforms',
    address: 'Holly Ridge, Richland Parish, Louisiana',
    latitude: 32.4658,
    longitude: -91.6152,
    utcStartDateTime: '2027-12-01T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Meta announced the $10B+ Richland Parish campus in December 2024 with multi-gigawatt Hyperion phases ramping from late 2027 through 2030.',
    sourceUrl: 'https://epoch.ai/data/data-centers#meta-richland-parish',
    price: 10_000_000_000,
    description: '<p>Meta’s Hyperion AI data center campus in Richland Parish, Louisiana spans 2,250 acres and 4 million square feet, backed by three new Entergy Louisiana combined-cycle natural gas plants totaling 2,260 MW and scaling to over 1.5 million H100-equivalents.</p>',
    longFormSummary: '<ul><li><strong>Power &amp; Dedicated Gas Plants:</strong> 2,000+ MW campus load served by Entergy Louisiana’s three proposed combined-cycle natural gas plants (2,260 MW) and 1.5 GW of contracted solar.<cite data-ref="https://epoch.ai/data/data-centers#meta-richland-parish"></cite></li><li><strong>Footprint &amp; Compute:</strong> 2,250 acres and 4,000,000 sq ft across 9 hyperscale buildings housing ~600,000+ next-gen GPUs (~1.5M H100-equivalents).</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Meta', 'Epoch AI', 'Natural Gas', 'Hyperscale'],
    categories: ['AI', 'Infrastructure', 'Energy'],
    megawatts: 2000,
    gwh: 10512,
    energyBasis: 'calculated',
    datacenter: {
      waterGallonsPerDay: 2_396_560,
      waterBasis: 'estimated',
      chips: 600_000,
      chipModel: 'NVIDIA Blackwell / Rubin & Meta MTIA',
      h100Equivalents: 1_500_000,
      acres: 2250,
      sqft: 4_000_000,
      buildings: 9,
      generators: 210,
      cooling: 'Direct-to-chip liquid cooling + air-cooled chillers',
      powerSource: 'Entergy Louisiana (3 dedicated CCGT gas plants, 2,260 MW + 1.5 GW solar)',
      sourceUrl: 'https://epoch.ai/data/data-centers',
      note: 'Meta Hyperion multi-gigawatt frontier training cluster in Richland Parish, LA',
    },
  },
  {
    title: 'Pennsylvania HB 1834: AI Data Center Energy, Water Usage, and Grid Impact Transparency Act',
    company: 'Pennsylvania General Assembly',
    address: '501 N 3rd St, Harrisburg, Dauphin County, Pennsylvania',
    latitude: 40.2644,
    longitude: -76.8837,
    utcStartDateTime: '2026-06-30T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: 'Active 2025–2026 Pennsylvania legislative session bill tracked by the AI Data Center Legislation Tracker.',
    sourceUrl: 'https://datacentertracker.org/legislation#pa-hb-1834',
    price: null,
    description: '<p>Pennsylvania House Bill 1834 (tracked in the AI Data Center Legislation Tracker) mandates annual public reporting of electricity demand (MW/MWh), peak water consumption (gallons per day), cooling system design, and backup diesel generator emissions for large data centers operating in the Commonwealth.</p>',
    longFormSummary: '<ul><li><strong>Regulatory Scope:</strong> Applies to hyperscale and AI data centers exceeding 25 MW in Pennsylvania, requiring public disclosure of PJM grid interconnection load, municipal or river-basin water withdrawals, and emergency generator air permits.<cite data-ref="https://datacentertracker.org/legislation#pa-hb-1834"></cite></li><li><strong>National Context:</strong> Part of 257 active and proposed state-level data center bills tracked across 41 US states by DatacenterTracker.org.</li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'Energy Policy', 'Water Usage', 'Legislation'],
    categories: ['Policy', 'Law', 'Infrastructure', 'Energy'],
    megawatts: null,
    gwh: null,
    datacenter: {
      sourceUrl: 'https://datacentertracker.org/legislation',
      note: 'Part of 7 Pennsylvania data center bills and 257 US state bills tracked on DatacenterTracker.org',
    },
  },
  {
    title: 'Pennsylvania SB 937: Data Center Ratepayer Protection and PJM Transmission Cost-Allocation Bill',
    company: 'Pennsylvania Senate / Pennsylvania Public Utility Commission',
    address: '501 N 3rd St, Harrisburg, Dauphin County, Pennsylvania',
    latitude: 40.2646,
    longitude: -76.8835,
    utcStartDateTime: '2026-09-30T00:00:00Z',
    dateConfidence: 'estimated',
    dateConfidenceReasoning: '2025–2026 Pennsylvania Senate bill addressing PJM capacity auction price spikes and large-load tariff rules.',
    sourceUrl: 'https://datacentertracker.org/legislation#pa-sb-937',
    price: null,
    description: '<p>Pennsylvania Senate Bill 937 directs the Pennsylvania Public Utility Commission (PUC) to establish dedicated large-load tariffs for hyperscale AI data centers above 50 MW so residential ratepayers do not subsidize transmission upgrades or PJM capacity auction surges.</p>',
    longFormSummary: '<ul><li><strong>Ratepayer Shield:</strong> Requires minimum contract terms, collateral requirements, and direct assignment of substation and 500 kV transmission upgrade costs for new Pennsylvania AI data centers.<cite data-ref="https://datacentertracker.org/legislation#pa-sb-937"></cite></li></ul>',
    tags: ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'PJM Interconnection', 'Energy Policy', 'Legislation'],
    categories: ['Policy', 'Law', 'Energy', 'Infrastructure'],
    megawatts: null,
    gwh: null,
    datacenter: {
      sourceUrl: 'https://datacentertracker.org/legislation',
      note: 'PA Senate ratepayer protection bill responding to 93+ proposed PA data centers',
    },
  },
];

async function main() {
  // 1. Load external datasets
  const tdcList: any[] = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/trackdatacenters.json', 'utf8'));
  const dctList: any[] = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/dct_fights.json', 'utf8'));
  const epochJson: any = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_map_unwrapped.json', 'utf8'));
  const aidcList: any[] = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/aidatacentermap_us.json', 'utf8'));

  // Parse Epoch timelines CSV for water usage (MGD) and Epoch chips CSV for chip models/quantities
  const epochWaterByDc = new Map<string, number>();
  const timelineLines = fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_data_center_timelines.csv', 'utf8').split('\n');
  for (const line of timelineLines.slice(1)) {
    const parts = line.split(',');
    if (parts.length >= 13) {
      const dcName = parts[0]?.trim();
      const mgd = Number(parts[parts.length - 2]);
      if (dcName && Number.isFinite(mgd) && mgd > 0) {
        epochWaterByDc.set(dcName.toLowerCase(), Math.max(epochWaterByDc.get(dcName.toLowerCase()) ?? 0, Math.round(mgd * 1_000_000)));
      }
    }
  }

  const epochChipsByDc = new Map<string, { chips: number; models: Set<string> }>();
  const chipLines = fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_data_centers_chip_quantities.csv', 'utf8').split('\n');
  for (const line of chipLines.slice(1)) {
    // Handle,Date,Chip type,Number of Units,Chip type source,Number of Units source,Owner,User,Notes,Data center,Timeline
    const match = line.match(/^([^,]+),(\d{4}-\d{2}-\d{2}),([^,]+),(\d+(?:\.\d+)?),.*?,([^,]+),(\d{4}-\d{2}-\d{2})\s*$/);
    if (match) {
      const chipType = match[3].trim();
      const units = Math.round(Number(match[4]));
      const dcName = match[5].trim().toLowerCase();
      if (units > 0 && dcName) {
        const cur = epochChipsByDc.get(dcName) ?? { chips: 0, models: new Set<string>() };
        cur.chips += units;
        cur.models.add(chipType);
        epochChipsByDc.set(dcName, cur);
      }
    }
  }

  // 2. Seed new PA, Frontier AI, and Legislation pins if not already present
  const [techDesk] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = '@TechDesk' LIMIT 1`);
  const userId = techDesk?.id ?? 276;

  let seededCount = 0;
  for (const seed of NEW_SEEDS) {
    const existing = await db.query<{ id: number }>(
      `SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND ("sourceUrl" = $1 OR "title" = $2) LIMIT 1`,
      [seed.sourceUrl, seed.title],
    );
    let pinId = existing[0]?.id;
    if (!pinId) {
      const [company] = await db.query<{ id: number }>(
        `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
        [seed.company],
      );
      const [inserted] = await db.query<{ id: number }>(
        `INSERT INTO "Pin" (
          "title", "description", "sourceUrl", "longFormSummary", "address", "location",
          "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
          "utcStartDateTime", "allDay", "userId"
        ) VALUES (
          $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
          $8, $9, $10, $11, $12, $13, true, $14
        ) RETURNING "id"`,
        [
          seed.title,
          seed.description,
          seed.sourceUrl,
          seed.longFormSummary,
          seed.address,
          seed.latitude,
          seed.longitude,
          company.id,
          seed.price,
          seed.price != null ? 'USD' : null,
          seed.dateConfidence,
          seed.dateConfidenceReasoning,
          seed.utcStartDateTime,
          userId,
        ],
      );
      pinId = inserted.id;
      const allTags = [...new Set([...seed.categories, ...seed.tags])];
      await db.query(
        `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
         SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
         FROM unnest($2::citext[]) AS name
         ON CONFLICT DO NOTHING`,
        [pinId, allTags, seed.categories],
      );
      await db.query(
        `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning")
         VALUES ($1, $2, $3, 88, $4)`,
        [pinId, seed.sourceUrl, seed.title, seed.dateConfidenceReasoning],
      );
      seededCount++;
    }

    if (seed.megawatts != null) {
      await db.query(
        `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
         VALUES ($1, $2, 'usage', 'hand', $3, $4)
         ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts", "kind" = 'usage', "sourceUrl" = EXCLUDED."sourceUrl"`,
        [pinId, seed.megawatts, seed.sourceUrl, seed.datacenter.powerSource ?? null],
      );
    }
    if (seed.gwh != null) {
      await db.query(
        `INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("pinId") DO UPDATE SET "gwh" = EXCLUDED."gwh", "basis" = EXCLUDED."basis"`,
        [pinId, seed.gwh, seed.energyBasis ?? 'calculated', seed.sourceUrl, 'Calculated at 60% average load factor', CHECKED_AT],
      );
    }
    await saveDatacenter(pinId, {
      waterGallonsPerDay: seed.datacenter.waterGallonsPerDay ?? null,
      waterBasis: seed.datacenter.waterBasis ?? null,
      chips: seed.datacenter.chips ?? null,
      chipModel: seed.datacenter.chipModel ?? null,
      h100Equivalents: seed.datacenter.h100Equivalents ?? null,
      acres: seed.datacenter.acres ?? null,
      sqft: seed.datacenter.sqft ?? null,
      buildings: seed.datacenter.buildings ?? null,
      generators: seed.datacenter.generators ?? null,
      cooling: seed.datacenter.cooling ?? null,
      powerSource: seed.datacenter.powerSource ?? null,
      sourceUrl: seed.datacenter.sourceUrl ?? seed.sourceUrl,
      note: seed.datacenter.note ?? null,
    });
  }
  console.log(`Seeded ${seededCount} new datacenter & legislation pins (total seeds processed: ${NEW_SEEDS.length}).`);

  // 3. Query all Data Center pins in the database to backfill PinDatacenter, PinPower, and PinEnergy
  const dcPins = await db.query<{
    id: number;
    title: string;
    description: string | null;
    longFormSummary: string | null;
    address: string | null;
    sourceUrl: string | null;
    company: string | null;
    lat: number | null;
    lon: number | null;
    megawatts: number | null;
    powerKind: string | null;
    gwh: number | null;
    hasDcRow: boolean;
  }>(`
    SELECT p."id", p."title", p."description", p."longFormSummary", p."address", p."sourceUrl",
           c."name" AS company,
           ST_Y(p."location"::geometry) AS lat, ST_X(p."location"::geometry) AS lon,
           pw."megawatts", pw."kind" AS "powerKind",
           pe."gwh",
           EXISTS (SELECT 1 FROM "PinDatacenter" pd WHERE pd."pinId" = p."id") AS "hasDcRow"
    FROM "Pin" p
    LEFT JOIN "Company" c ON c."id" = p."companyId"
    LEFT JOIN "PinPower" pw ON pw."pinId" = p."id"
    LEFT JOIN "PinEnergy" pe ON pe."pinId" = p."id"
    WHERE p."utcDeletedDateTime" IS NULL
      AND (
        EXISTS (SELECT 1 FROM "PinTag" pt WHERE pt."pinId" = p."id" AND pt."name" IN ('Data Centers', 'Data Centres', 'AI Data Centers'))
        OR p."title" ~* 'data cent(er|re)|hyperscale compute campus|ai supercluster|ai superfactory'
      )
    ORDER BY p."id" ASC
  `);

  console.log(`Found ${dcPins.length} total Data Center pins in database to enrich.`);

  const seedSourceUrls = new Set(NEW_SEEDS.map((s) => s.sourceUrl));
  // Clear non-seeded PinDatacenter rows before re-running 1-to-1 deduplicated matching
  await db.query(`DELETE FROM "PinDatacenter" WHERE "pinId" NOT IN (SELECT "id" FROM "Pin" WHERE "sourceUrl" = ANY($1::text[]))`, [[...seedSourceUrls]]);

  const usedEpoch = new Set<string>();
  const usedTdc = new Set<number>();
  const usedDct = new Set<string>();
  const usedAidc = new Set<string>();

  let updatedDcRows = 0;
  let updatedEnergyRows = 0;
  let matchedEpoch = 0;
  let matchedTdc = 0;
  let matchedDct = 0;
  let matchedAidc = 0;

  for (const pin of dcPins) {
    if (pin.sourceUrl && seedSourceUrls.has(pin.sourceUrl)) continue;

    const fullText = `${pin.title} ${stripHtml(pin.description)} ${stripHtml(pin.longFormSummary)}`;
    const parsed = parseMetricsFromText(fullText);

    let waterGallonsPerDay = parsed.waterGallonsPerDay ?? null;
    let waterBasis: WaterBasis | null = parsed.waterBasis ?? null;
    let chips = parsed.chips ?? null;
    let chipModel = parsed.chipModel ?? null;
    let h100Equivalents = parsed.h100Equivalents ?? null;
    let acres = parsed.acres ?? null;
    let sqft = parsed.sqft ?? null;
    let buildings = parsed.buildings ?? null;
    let generators = parsed.generators ?? null;
    let cooling = parsed.cooling ?? null;
    let powerSource = parsed.powerSource ?? (pin.company && /Power|Energy|Electric|PJM|ERCOT|SERC|WECC|TVA|Duke|Dominion|Entergy|FirstEnergy|PPL|Georgia/i.test(pin.company) ? pin.company : null);
    let sourceUrl = pin.sourceUrl ?? null;
    let note: string | null = null;
    let mw = pin.megawatts != null ? Number(pin.megawatts) : null;

    // 1-to-1 Match against Epoch AI dataCenters (within 4 km)
    if (pin.lat != null && pin.lon != null && Array.isArray(epochJson.dataCenters)) {
      let bestEpoch: any = null;
      let bestDist = 4; // km
      for (const edc of epochJson.dataCenters) {
        if (!edc.id || usedEpoch.has(String(edc.id))) continue;
        if (!Array.isArray(edc.lngLat) || edc.lngLat.length < 2) continue;
        const d = haversineKm(pin.lat, pin.lon, edc.lngLat[1], edc.lngLat[0]);
        if (d < bestDist) {
          bestDist = d;
          bestEpoch = edc;
        }
      }
      if (bestEpoch) {
        usedEpoch.add(String(bestEpoch.id));
        matchedEpoch++;
        const latestTl = Array.isArray(bestEpoch.timeline) && bestEpoch.timeline.length
          ? bestEpoch.timeline[bestEpoch.timeline.length - 1]
          : null;
        if (latestTl?.h100e && !h100Equivalents) {
          h100Equivalents = Math.round(Number(latestTl.h100e));
        }
        if (latestTl?.power && !mw) {
          mw = Number(latestTl.power);
        }
        const dcKey = String(bestEpoch.id || '').toLowerCase();
        const chipInfo = epochChipsByDc.get(dcKey);
        if (chipInfo && !chips) {
          chips = chipInfo.chips;
          chipModel = [...chipInfo.models].slice(0, 3).join(' / ');
        } else if (h100Equivalents && !chips) {
          chips = Math.round(h100Equivalents);
          chipModel = 'H100-equivalents (Epoch AI)';
        }
        const epochWater = epochWaterByDc.get(dcKey);
        if (epochWater && !waterGallonsPerDay) {
          waterGallonsPerDay = epochWater;
          waterBasis = 'published';
        }
        if (Array.isArray(bestEpoch.shapes?.features)) {
          const bCount = bestEpoch.shapes.features.filter((f: any) => /building/i.test(f.properties?.type || '')).length;
          const gCount = bestEpoch.shapes.features.filter((f: any) => /generator/i.test(f.properties?.type || '')).length;
          if (bCount > 0 && !buildings) buildings = bCount;
          if (gCount > 0 && !generators) generators = gCount;
        }
        note = `Matched Epoch AI frontier cluster: ${bestEpoch.id}`;
      }
    }

    // 1-to-1 Match against TrackDataCenters (452 US sites including 93 PA sites, within 4 km)
    if (pin.lat != null && pin.lon != null) {
      let bestTdc: any = null;
      let bestDist = 4; // km
      for (const td of tdcList) {
        if (td.id != null && usedTdc.has(Number(td.id))) continue;
        if (td.lat == null || td.lon == null) continue;
        const d = haversineKm(pin.lat, pin.lon, Number(td.lat), Number(td.lon));
        if (d < bestDist) {
          bestDist = d;
          bestTdc = td;
        }
      }
      if (bestTdc) {
        if (bestTdc.id != null) usedTdc.add(Number(bestTdc.id));
        matchedTdc++;
        if (bestTdc.sizeAcres && !acres) acres = Number(bestTdc.sizeAcres);
        if (bestTdc.facilitySizeSqft && !sqft) sqft = Number(bestTdc.facilitySizeSqft);
        if (bestTdc.numberOfBuildings && !buildings) buildings = Number(bestTdc.numberOfBuildings);
        if (bestTdc.numberOfGenerators && !generators) generators = Number(bestTdc.numberOfGenerators);
        if ((bestTdc.coolingType || bestTdc.coolingSource) && !cooling) {
          cooling = normalizeCooling([bestTdc.coolingType, bestTdc.coolingSource].filter(Boolean).join(' · '));
        }
        if (bestTdc.powerSource && !powerSource) powerSource = normalizePowerSource(String(bestTdc.powerSource));
        if (bestTdc.capacityMw && !mw) mw = Number(bestTdc.capacityMw);
      }
    }

    // 1-to-1 Match against DatacenterTracker (dct_fights.json, within 4 km)
    if (pin.lat != null && pin.lon != null) {
      let bestDct: any = null;
      let bestDist = 4; // km
      for (const df of dctList) {
        if (df.id && usedDct.has(String(df.id))) continue;
        if (df.lat == null || df.lng == null) continue;
        const d = haversineKm(pin.lat, pin.lon, Number(df.lat), Number(df.lng));
        if (d < bestDist) {
          bestDist = d;
          bestDct = df;
        }
      }
      if (bestDct) {
        if (bestDct.id) usedDct.add(String(bestDct.id));
        matchedDct++;
        if (bestDct.water_usage_gallons_per_day && !waterGallonsPerDay) {
          waterGallonsPerDay = Number(bestDct.water_usage_gallons_per_day);
          waterBasis = 'published';
        }
        if (bestDct.acreage && !acres) acres = Number(bestDct.acreage);
        if (bestDct.building_sq_ft && !sqft) sqft = Number(bestDct.building_sq_ft);
        if (bestDct.megawatts && !mw) mw = Number(bestDct.megawatts);
      }
    }

    // 1-to-1 Match against AI Data Center Map (aidatacentermap_us.json, within 4 km)
    if (pin.lat != null && pin.lon != null) {
      let bestAidc: any = null;
      let bestDist = 4; // km
      for (const ad of aidcList) {
        if (ad.id && usedAidc.has(String(ad.id))) continue;
        const coords = ad.geojson?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const d = haversineKm(pin.lat, pin.lon, Number(coords[1]), Number(coords[0]));
        if (d < bestDist) {
          bestDist = d;
          bestAidc = ad;
        }
      }
      if (bestAidc) {
        if (bestAidc.id) usedAidc.add(String(bestAidc.id));
        matchedAidc++;
        const rawSize = Number(bestAidc.site_size);
        if (Number.isFinite(rawSize) && rawSize > 0) {
          if (bestAidc.size_units === 'sqft' && !sqft) sqft = Math.round(rawSize);
          if (bestAidc.size_units === 'acres' && !acres) acres = rawSize;
        }
      }
    }

    // Estimate water usage from MW using the AI Data Center Map formula when no explicit water figure exists
    if (!waterGallonsPerDay && mw != null && mw > 0 && (pin.powerKind === 'usage' || pin.powerKind == null)) {
      waterGallonsPerDay = estimateWaterGallonsPerDayFromMw(mw);
      waterBasis = 'estimated';
    }

    // Ensure PinPower row exists if we found MW
    if (mw != null && mw > 0 && pin.megawatts == null) {
      await db.query(
        `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
         VALUES ($1, $2, 'usage', 'hand', $3, $4)
         ON CONFLICT ("pinId") DO NOTHING`,
        [pin.id, mw, sourceUrl, powerSource],
      );
    }

    // Ensure PinEnergy row exists if we have MW usage and no PinEnergy yet
    if (mw != null && mw > 0 && pin.gwh == null && (pin.powerKind === 'usage' || pin.powerKind == null)) {
      const estGwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
      if (estGwh > 0) {
        await db.query(
          `INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
           VALUES ($1, $2, 'calculated', $3, 'Calculated from MW capacity at 60% load factor', $4)
           ON CONFLICT ("pinId") DO NOTHING`,
          [pin.id, estGwh, sourceUrl, CHECKED_AT],
        );
        updatedEnergyRows++;
      }
    }

    const hasAnyMetric =
      waterGallonsPerDay != null ||
      chips != null ||
      h100Equivalents != null ||
      acres != null ||
      sqft != null ||
      buildings != null ||
      generators != null ||
      cooling != null ||
      powerSource != null;

    if (hasAnyMetric) {
      await saveDatacenter(pin.id, {
        waterGallonsPerDay,
        waterBasis: waterGallonsPerDay != null ? (waterBasis ?? 'estimated') : null,
        chips,
        chipModel,
        h100Equivalents,
        acres,
        sqft,
        buildings,
        generators,
        cooling,
        powerSource,
        sourceUrl,
        note,
      });
      updatedDcRows++;
    }
  }

  // Rebuild PinBaseCache / PinTagCache for newly seeded pins so they appear immediately on timeline & map
  await db.query(`SELECT refresh_pin_caches() WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_pin_caches')`).catch(() => null);

  const summary = await db.query<any>(`
    SELECT
      COUNT(*)::int AS "totalRows",
      COUNT("waterGallonsPerDay")::int AS "withWater",
      ROUND(SUM(COALESCE("waterGallonsPerDay", 0))::numeric, 0) AS "totalWaterGpd",
      COUNT("chips")::int AS "withChips",
      ROUND(SUM(COALESCE("chips", 0))::numeric, 0) AS "totalChips",
      COUNT("acres")::int AS "withAcres",
      ROUND(SUM(COALESCE("acres", 0))::numeric, 1) AS "totalAcres",
      COUNT("sqft")::int AS "withSqft",
      ROUND(SUM(COALESCE("sqft", 0))::numeric, 0) AS "totalSqft",
      COUNT("generators")::int AS "withGenerators",
      SUM(COALESCE("generators", 0))::int AS "totalGenerators"
    FROM "PinDatacenter"
  `);

  console.log('Backfill complete:', {
    seededCount,
    updatedDcRows,
    updatedEnergyRows,
    matchedEpoch,
    matchedTdc,
    matchedDct,
    matchedAidc,
    pinDatacenterTotals: summary[0],
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
