// Shared by the /construction service and its client chart.

export type ConstructionStatus = 'Proposed' | 'In Progress' | 'Completed';
export type ConstructionSector = 'power' | 'datacenter' | 'factory' | 'other';
export const CONSTRUCTION_YEARS = 10;
export type ConstructionBar = {
  id: number; title: string; href: string; start: string; end: string; status: ConstructionStatus;
  price: number | null; priceCurrency: string | null; city: string | null; country: string | null;
  thumbName: string | null; originalUrl: string | null;
  sector: ConstructionSector; megawatts: number | null; powerKind: 'generation' | 'usage' | 'storage' | null;
};
