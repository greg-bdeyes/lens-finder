import type { ArCoating, Catalog, Lens } from "./catalog-types";
import { tierRank } from "./catalog-types";

export const AR_NONE = "__no_ar__";
export const AR_ANY = "__any__";
export const AR_ANY_BLUE = "__any_blue__";

export interface LensQuery {
  vsp: boolean;
  material: string;
  asphericity: "any" | "aspheric" | "spheric";
  arCategory: string; // AR_NONE | AR_ANY | AR_ANY_BLUE | tier name
  arSpecific: string; // AR_ANY | coating shorthand
  sphere: number | null;
  cylinder: number | null;
  blueFilterLens: boolean;
  photochromic: boolean;
  tint: boolean;
}

export interface LensMatch {
  lens: Lens;
  kind: "exact" | "close";
  upgrades: string[];
  coating: ArCoating | null;
}

export function coatingIndex(coatings: ArCoating[]): Map<string, ArCoating> {
  const map = new Map<string, ArCoating>();
  for (const coating of coatings) {
    map.set(coating.shorthand.trim().toLowerCase(), coating);
    map.set(coating.name.trim().toLowerCase(), coating);
  }
  return map;
}

function rxFits(lens: Lens, sphere: number | null, cylinder: number | null): boolean {
  if (sphere !== null && lens.powerLow !== null && lens.powerHigh !== null) {
    const low = Math.min(lens.powerLow, lens.powerHigh);
    const high = Math.max(lens.powerLow, lens.powerHigh);
    if (sphere < low || sphere > high) return false;
  }
  if (cylinder !== null && lens.cylMax !== null) {
    const low = Math.min(lens.cylMax, 0);
    const high = Math.max(lens.cylMax, 0);
    if (cylinder < low || cylinder > high) return false;
  }
  if (lens.totalPowerLowerBound !== null && (sphere !== null || cylinder !== null)) {
    const total = (sphere ?? 0) + (cylinder ?? 0);
    if (total < lens.totalPowerLowerBound) return false;
  }
  return true;
}

export function searchLenses(catalog: Catalog, query: LensQuery): LensMatch[] {
  const coatings = coatingIndex(catalog.coatings);
  const materialRank = (material: string) => {
    const index = catalog.materials.indexOf(material);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const wantedRank = materialRank(query.material);
  const targetCoating =
    query.arSpecific !== AR_ANY
      ? coatings.get(query.arSpecific.trim().toLowerCase()) ?? null
      : null;
  const targetTierRank =
    targetCoating ? tierRank(targetCoating.tier) : tierRank(query.arCategory);

  const matches: LensMatch[] = [];

  for (const lens of catalog.lenses) {
    if (query.vsp && lens.sheet !== "Plexus") continue;
    if (!rxFits(lens, query.sphere, query.cylinder)) continue;

    // Photochromic and tint must never differ from what was selected.
    if (query.photochromic !== Boolean(lens.photochromic)) continue;
    if (query.tint !== Boolean(lens.tint)) continue;

    const coating = lens.ar ? coatings.get(lens.ar.trim().toLowerCase()) ?? null : null;
    const upgrades: string[] = [];

    // Material: same or more premium only.
    const rank = materialRank(lens.material);
    if (query.material && rank !== wantedRank) {
      if (rank < wantedRank || rank === Number.MAX_SAFE_INTEGER) continue;
      upgrades.push(`${lens.material} (more premium material)`);
    }

    // Asphericity.
    if (!query.vsp && query.asphericity !== "any") {
      if (query.asphericity === "aspheric" && !lens.aspheric) continue;
      if (query.asphericity === "spheric" && lens.aspheric) upgrades.push("Aspheric design");
    }

    // Blue filter lens.
    if (query.blueFilterLens && !lens.blueLight) continue;
    if (!query.blueFilterLens && lens.blueLight) upgrades.push("Blue filter lens included");

    // AR coating.
    if (query.arCategory === AR_NONE) {
      if (lens.ar) continue;
    } else {
      if (!coating) continue;
      if (query.vsp && !coating.vsp) continue;
      if (query.arCategory === AR_ANY_BLUE && !coating.blueFilter) continue;
      if (targetCoating) {
        if (coating.shorthand !== targetCoating.shorthand) {
          if (tierRank(coating.tier) <= targetTierRank) continue;
          upgrades.push(`${coating.name} (higher AR tier)`);
        }
      } else if (query.arCategory !== AR_ANY && query.arCategory !== AR_ANY_BLUE) {
        if (coating.tier !== query.arCategory) {
          if (tierRank(coating.tier) <= targetTierRank) continue;
          upgrades.push(`${coating.name} (higher AR tier)`);
        }
      }
    }

    matches.push({ lens, coating, kind: upgrades.length ? "close" : "exact", upgrades });
  }

  return matches.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "exact" ? -1 : 1;
    if (a.upgrades.length !== b.upgrades.length) return a.upgrades.length - b.upgrades.length;
    return (a.lens.pairCost ?? Infinity) - (b.lens.pairCost ?? Infinity);
  });
}

/** Fixed display order for tiers, basic -> premium. */
const TIER_ORDER = ["Standard", "T1", "T2", "T3", "VSP C", "VSP D", "VSP D+UV"];

function tierOrder(tier: string): number {
  const index = TIER_ORDER.indexOf(tier);
  return index >= 0 ? index : TIER_ORDER.length + tierRank(tier);
}

/** Tiers present in the AR sheet, in the fixed display order, optionally VSP only. */
export function tiersFor(coatings: ArCoating[], vspOnly: boolean): string[] {
  const tiers = new Set<string>();
  for (const coating of coatings) {
    if (vspOnly && !coating.vsp) continue;
    if (coating.tier) tiers.add(coating.tier);
  }
  return [...tiers].sort((a, b) => tierOrder(a) - tierOrder(b) || a.localeCompare(b));
}

export function coatingsInCategory(coatings: ArCoating[], category: string): ArCoating[] {
  const list = coatings.filter((coating) => {
    if (category === AR_ANY) return true;
    if (category === AR_ANY_BLUE) return coating.blueFilter;
    return coating.tier === category;
  });
  return list.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name));
}
