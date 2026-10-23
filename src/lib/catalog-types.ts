export type SheetName = "Plexus" | "OOGP";

export interface Lens {
  id: string;
  sheet: SheetName;
  material: string;
  materialRaw: string;
  manufacturer: string;
  name: string;
  components: string;
  aspheric: boolean;
  ar: string | null;
  photochromic: string | null;
  tint: string | null;
  blueLight: boolean;
  powerLow: number | null;
  powerHigh: number | null;
  cylMax: number | null;
  totalPowerLowerBound: number | null;
  lensCost: number | null;
  pairCost: number | null;
  notes: string | null;
  labStock: boolean;
  image: string | null;
}

export interface ArCoating {
  name: string;
  tier: string;
  shorthand: string;
  blueFilter: boolean;
  vsp: boolean;
}

export interface CatalogWords {
  title: string | null;
  titleImage: string | null;
}

export interface Catalog {
  fileName: string;
  loadedAt: string;
  materials: string[];
  lenses: Lens[];
  coatings: ArCoating[];
  words: CatalogWords;
}

export const TIER_RANK: Record<string, number> = {
  Standard: 1,
  T1: 2,
  T2: 3,
  T3: 4,
  "VSP C": 2,
  "VSP D": 3,
  "VSP D+UV": 4,
};

export function tierRank(tier: string | undefined): number {
  if (!tier) return 0;
  return TIER_RANK[tier] ?? 0;
}
