// Shared by the /construction service and its client chart.

export type ConstructionStatus = 'Proposed' | 'In Progress' | 'Completed';
export type ConstructionSector = 'power' | 'datacenter' | 'factory' | 'transport' | 'housing' | 'buildings' | 'other';
export const CONSTRUCTION_YEARS = 10;
// Years drawn (and scrollable) before and after the chosen window.
export const CONSTRUCTION_PAD_YEARS = 5;
export const CONSTRUCTION_YEAR_PX = 160;
export type ConstructionBar = {
  id: number; title: string; href: string; start: string; end: string; status: ConstructionStatus;
  price: number | null; priceCurrency: string | null; city: string | null; country: string | null;
  thumbName: string | null; originalUrl: string | null;
  sector: ConstructionSector; category: string | null; megawatts: number | null; powerKind: 'generation' | 'usage' | 'storage' | null;
};
