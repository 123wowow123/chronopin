// Possible conflicts of interest in a member's stock trades: a trade is marked when the
// company's sector is one a committee the member sits on oversees (Armed Services and a
// defence contractor, Energy & Commerce and a drugmaker). It is a prompt to look, not a
// finding: the committees are today's seats, and a sector match says nothing about intent.

export const SECTORS = ['defense', 'energy', 'utilities', 'finance', 'realestate', 'healthcare', 'tech', 'telecom', 'transport', 'agriculture', 'materials', 'industrial', 'consumer'] as const;
export type Sector = (typeof SECTORS)[number];

// A sector for an SEC Standard Industrial Classification code; the first range that holds it wins.
const SIC_RANGES: [number, number, Sector][] = [
  [100, 999, 'agriculture'],
  [1200, 1399, 'energy'],
  [1000, 1499, 'materials'],
  [1500, 1799, 'industrial'],
  [2000, 2099, 'agriculture'],
  [2100, 2399, 'consumer'],
  [2400, 2799, 'materials'],
  [2833, 2836, 'healthcare'],
  [2870, 2879, 'agriculture'],
  [2800, 2899, 'materials'],
  [2900, 2999, 'energy'],
  [3000, 3299, 'materials'],
  [3300, 3399, 'materials'],
  [3480, 3489, 'defense'],
  [3570, 3579, 'tech'],
  [3400, 3599, 'industrial'],
  [3660, 3669, 'telecom'],
  [3690, 3699, 'energy'],
  [3600, 3679, 'tech'],
  [3710, 3716, 'transport'],
  [3720, 3729, 'defense'],
  [3760, 3769, 'defense'],
  [3730, 3799, 'transport'],
  [3812, 3812, 'defense'],
  [3820, 3829, 'tech'],
  [3840, 3851, 'healthcare'],
  [3800, 3899, 'industrial'],
  [3900, 3999, 'consumer'],
  [4000, 4799, 'transport'],
  [4800, 4899, 'telecom'],
  [4922, 4925, 'energy'],
  [4900, 4999, 'utilities'],
  [5122, 5122, 'healthcare'],
  [5140, 5149, 'agriculture'],
  [5912, 5912, 'healthcare'],
  [5000, 5999, 'consumer'],
  [6000, 6499, 'finance'],
  [6500, 6799, 'realestate'],
  [6770, 6770, 'finance'],
  [7370, 7379, 'tech'],
  [7000, 7999, 'consumer'],
  [8000, 8099, 'healthcare'],
  [8700, 8799, 'industrial'],
];

export function sectorOfSic(sic: number): Sector | null {
  // 6770 (blank check) sits inside the real estate range; check the narrow ones first.
  const narrow = SIC_RANGES.filter(([lo, hi]) => hi - lo <= 12 && sic >= lo && sic <= hi);
  const hit = narrow[0] ?? SIC_RANGES.find(([lo, hi]) => sic >= lo && sic <= hi);
  return hit ? hit[2] : null;
}

// The sectors a full committee oversees, by its Thomas id. Appropriations, Budget, Rules,
// Ethics and the like oversee everything and so mark nothing; their subcommittees can.
export const COMMITTEE_SECTORS: Record<string, Sector[]> = {
  HSAG: ['agriculture'],
  HSAS: ['defense'],
  HSIF: ['energy', 'utilities', 'healthcare', 'tech', 'telecom'],
  HSHM: ['defense', 'tech'],
  HSJU: ['tech'],
  HSII: ['energy', 'materials'],
  HSSY: ['tech', 'defense'],
  HSPW: ['transport', 'industrial'],
  HSVR: ['healthcare'],
  HSWM: ['healthcare'],
  HSBA: ['finance', 'realestate'],
  HSIG: ['defense', 'tech'],
  SSAF: ['agriculture'],
  SSAS: ['defense'],
  SSBK: ['finance', 'realestate'],
  SSCM: ['transport', 'telecom', 'tech'],
  SSEG: ['energy', 'materials', 'utilities'],
  SSEV: ['energy', 'utilities', 'industrial'],
  SSFI: ['healthcare', 'finance'],
  SSHR: ['healthcare'],
  SSJU: ['tech'],
  SSVA: ['healthcare'],
  SLIN: ['defense', 'tech'],
  SPAG: ['healthcare'],
};

// A subcommittee's own subject, from its name, wins over its parent's sectors.
const SUB_KEYWORDS: [RegExp, Sector[]][] = [
  [/health|medicare|medicaid/i, ['healthcare']],
  [/\b(energy|power|nuclear|oil|gas)\b/i, ['energy', 'utilities']],
  [/defense|military|armed|strategic forces|seapower|tactical air|readiness|intelligence/i, ['defense']],
  [/communications|telecom/i, ['telecom', 'tech']],
  [/\b(technology|cyber\w*|artificial|innovation|space|aeronautics)\b/i, ['tech']],
  [/agricultur|nutrition|livestock|crop|forestry|rural/i, ['agriculture']],
  [/financial|capital markets|banking|securities|insurance|monetary|investor|digital assets/i, ['finance']],
  [/housing|real estate/i, ['realestate']],
  [/aviation|railroad|highway|maritime|transportation|surface|coast guard|pipelines/i, ['transport']],
  [/\b(mining|minerals|lands|water)\b/i, ['materials']],
];

export function committeeSectors(committeeId: string, name: string): Sector[] {
  const parentId = committeeId.slice(0, 4);
  if (committeeId.length === 4) return COMMITTEE_SECTORS[committeeId] ?? [];
  // Appropriations subcommittees (HSAP/SSAP) have no parent sectors to inherit.
  const own = SUB_KEYWORDS.find(([re]) => re.test(name));
  return own ? own[1] : (COMMITTEE_SECTORS[parentId] ?? []);
}

export type Seat = { committeeId: string; parentId: string | null; name: string; chamber: 'house' | 'senate' | 'joint'; title: string | null; rank: number | null; sectors: string[] };
export type Conflict = { committee: string; sector: Sector };

// The sector of a holding from its name, for what has no SEC filer to read a SIC code from: bonds and
// bond funds, sector and thematic funds and ETFs, foreign ADRs, and tickers EDGAR no longer lists.
// Broad-market funds (S&P 500, Russell, total market) own every sector and so have none. The first rule wins.
const NAME_RULES: [RegExp, Sector][] = [
  [/\b(treasur\w*|tips|bonds?|notes? due|debentures?|fixed income|muni\w*|mortgage|mbs|cmbs|gnma|fnma|agency|money market|municipal|t-bills?|savings bond)\b/i, 'finance'],
  [/\b(health ?care|biotech\w*|pharma\w*|therapeutics|bioscience\w*|biopharma|medical|genomics|oncology|diagnostics|hospital\w*|drug|medicine|life sciences|wellness)\b/i, 'healthcare'],
  [/\b(defen[cs]e|aerospace|aircraft|ordnance|rheinmetall|lockheed|northrop|raytheon|general dynamics)\b/i, 'defense'],
  [/\b(oil|crude|petroleum|pipeline\w*|midstream|natural gas|energy|drilling|lng|uranium|exploration)\b|natural resources company/i, 'energy'],
  [/\b(utilit\w*|electric (power|company|co|light)|power (company|co|corp\w*)|water works|renewable|solar|wind)\b/i, 'utilities'],
  [/\b(real estate|realty|reit|properties|homes|homebuilders?|residential|communities|apartment\w*|land)\b/i, 'realestate'],
  [/\b(bank\w*|bancorp|bancshares|financial\w*|insurance|capital|credit|assurance|brokers?|payments|asset management|trust|bdc|mortgage)\b/i, 'finance'],
  [/\b(semiconductors?|software|cloud|cyber\w*|internet|data|digital|technolog\w*|systems|computer\w*|network\w*|robotics|artificial|ai)\b|\b(nasdaq-100 technology)\b/i, 'tech'],
  [/\b(telecom\w*|communications?|wireless|broadband|cable|satellite|mobile)\b/i, 'telecom'],
  [/\b(airlines?|railroads?|railway|shipping|freight|logistics|trucking|transport\w*|aviation|automotive|motors|cars)\b/i, 'transport'],
  [/\b(agricultur\w*|farm\w*|crop|food|foods|grain|fertili[sz]er|seeds?|beverages?|tobacco)\b/i, 'agriculture'],
  [/\b(steel|mining|miners|metals?|gold|silver|copper|lithium|chemicals?|materials|paper|aluminum)\b/i, 'materials'],
  [/\b(industrial\w*|machinery|engineering|manufactur\w*|construction|equipment)\b/i, 'industrial'],
  [/\b(retail\w*|consumer|stores?|restaurants?|apparel|brands?|entertainment|gaming|media|luxury|leisure|hotels?|resorts?)\b/i, 'consumer'],
];

export function sectorOfName(name: string): Sector | null {
  const hit = NAME_RULES.find(([re]) => re.test(name));
  return hit ? hit[1] : null;
}

// Tickers whose names say nothing but whose business is known (the most-traded ones EDGAR's list lacks).
export const TICKER_SECTORS: Record<string, Sector> = {
  FI: 'tech', FISV: 'tech', EA: 'tech', DAY: 'tech', PSTG: 'tech', PYCR: 'tech', FB: 'tech', SQ: 'finance', MMC: 'finance', DFS: 'finance', BRP: 'finance', GBDC: 'finance', HTGC: 'finance',
  K: 'agriculture', AVB: 'realestate', WBA: 'healthcare', ITCI: 'healthcare', EXAS: 'healthcare', PXD: 'energy', CTRA: 'energy', CHX: 'energy', X: 'materials', GTLS: 'industrial',
  // Foreign ADRs / ordinary shares and obscure US names (2026-10 sweep of tickers EDGAR's list lacks).
  NSRGY: 'agriculture', HESAF: 'consumer', AJINF: 'agriculture', LVMUY: 'consumer', CFRUY: 'consumer', ADDYY: 'consumer', SSDOY: 'consumer', LRLCY: 'consumer', PRNDY: 'agriculture', UNICY: 'consumer', HSHCY: 'consumer', COLPAL: 'consumer', SKX: 'consumer', NTDOY: 'consumer', NTDOF: 'consumer', ANCTF: 'consumer',
  SSMXY: 'healthcare', RHHBY: 'healthcare', CHGCY: 'healthcare', CLPBY: 'healthcare', LZAGY: 'healthcare', SGIOY: 'healthcare', MTHRY: 'healthcare', HOLX: 'healthcare', AMED: 'healthcare', FNA: 'healthcare', TCNNF: 'healthcare',
  TCTZF: 'tech', TCEHY: 'tech', XIACF: 'tech', DASTY: 'tech', DSCSY: 'tech', TOELY: 'tech', ASMVY: 'tech', ANSS: 'tech', BRCM: 'tech', CNSWF: 'tech', SMCYY: 'tech', SFTBF: 'telecom', INST: 'tech', CMPO: 'tech', AMI: 'tech',
  MHVYF: 'defense', MHVIY: 'defense', SAFRY: 'defense',
  GBOOY: 'finance', DBSDY: 'finance', DBSDF: 'finance', ALIZY: 'finance', AZSEY: 'finance', UNCFF: 'finance', UNCRY: 'finance', BNPQF: 'finance', ISNPY: 'finance', SCGLY: 'finance', AAGIY: 'finance', HKXCY: 'finance', RSNHF: 'finance', BRKB: 'finance', FSSL: 'finance', ARINA: 'finance',
  FITZX: 'finance', LANFX: 'finance', LSYIX: 'finance', GIGB: 'finance', TFDXX: 'finance',
  SBGSF: 'industrial', SBGSY: 'industrial', SIEGY: 'industrial', FANUY: 'industrial', ATLKY: 'industrial', ASAZY: 'industrial', ALFVY: 'industrial', TTNDY: 'industrial', VCISY: 'industrial', DSDVY: 'transport', THR: 'industrial',
  IBDSF: 'utilities', ALE: 'utilities', AIQUY: 'materials', AHCHY: 'materials', BERY: 'materials', SEE: 'materials', BRY: 'energy', LRN: 'consumer', LOPE: 'consumer', ASHGY: 'industrial', ASHTY: 'industrial', APPL: 'consumer',
  HONAV: 'defense', SATS: 'telecom', LBRDK: 'telecom', TPX: 'consumer', ALEX: 'realestate', EQR: 'realestate', TPH: 'realestate', TMHC: 'realestate',
};
