import profiles from '@/server/data/restaurantMenus.json';

export type RestaurantSpecial = {
  kind: 'lunch' | 'other';
  title: string;
  description: string;
  schedule?: string;
  conditions?: string[];
  sourceUrl: string;
  validFrom?: string;
  validThrough?: string;
};
export type RestaurantMenuProfile = {
  pinSourceUrl: string;
  name: string;
  checkedAt: string;
  menus: RestaurantMenu[];
  specials: RestaurantSpecial[];
  lunchNote?: { text: string; sourceUrl: string };
};

export type RestaurantMenu = {
  label: string;
  url: string;
  note?: string;
  coverage?: 'published' | 'sample' | 'link';
  documentUrl?: string;
  pages?: { src: string; width: number; height: number; label?: string }[];
  items: { name: string; category?: string; price?: number; priceLabel?: string; note?: string }[];
};

export function restaurantSourceKey(value: string): string {
  try {
    const url = new URL(value);
    // A roundup can source several venues, each identified by its anchor.
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

// Match the original opening source, rather than database IDs that differ
// between installations. Never borrow another branch's menu or promotions.
export function restaurantMenuFor(sourceUrl: string | null | undefined): RestaurantMenuProfile | undefined {
  if (!sourceUrl) return undefined;
  return (profiles as RestaurantMenuProfile[]).find((profile) => restaurantSourceKey(profile.pinSourceUrl) === restaurantSourceKey(sourceUrl));
}

export function restaurantMenuState(profile: RestaurantMenuProfile, today: string) {
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${profile.checkedAt}T00:00:00Z`)) / 86_400_000;
  // Age is a refresh signal only: keep the last verified information visible
  // until it is updated. An offer's published validity dates still apply.
  const rescrapeCandidate = !Number.isFinite(age) || age < 0 || age > 30;
  return {
    rescrapeCandidate,
    specials: profile.specials.filter((special) => (!special.validFrom || special.validFrom <= today) && (!special.validThrough || special.validThrough >= today)),
  };
}

export function restaurantMenuRescrapeCandidates(today: string): RestaurantMenuProfile[] {
  return (profiles as RestaurantMenuProfile[]).filter((profile) => restaurantMenuState(profile, today).rescrapeCandidate);
}
