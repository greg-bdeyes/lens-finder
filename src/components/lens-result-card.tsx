import type { LensMatch } from "@/lib/search-lenses";

function money(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

function shortMaterial(material: string) {
  const match = material.match(/[\d.]+/);
  if (match) return match[0];
  return material.slice(0, 5);
}

const MAT_CLASS: Record<string, string> = {
  plastic: "mat-plastic",
  poly: "mat-poly",
  trivex: "mat-trivex",
  "160": "mat-160",
  "167": "mat-167",
  "174": "mat-174",
};

const LIGHT_MATERIALS = new Set(["plastic", "trivex"]);

function matKey(material: string): string {
  const m = material.toLowerCase();
  if (m.includes("polycarb")) return "poly";
  if (m.includes("plastic")) return "plastic";
  if (m.includes("trivex")) return "trivex";
  if (m.includes("1.74")) return "174";
  if (m.includes("1.67")) return "167";
  if (m.includes("1.60")) return "160";
  return "";
}

function matLabel(material: string) {
  switch (matKey(material)) {
    case "plastic":
      return "CR-39";
    case "poly":
      return "Poly";
    case "trivex":
      return "Tvx";
    default:
      return shortMaterial(material);
  }
}

function range(low: number | null, high: number | null) {
  if (low === null && high === null) return "—";
  const a = Math.min(low ?? 0, high ?? 0);
  const b = Math.max(low ?? 0, high ?? 0);
  return `${a.toFixed(2)} to ${b > 0 ? "+" : ""}${b.toFixed(2)}`;
}

export function LensResultCard({ match }: { match: LensMatch }) {
  const { lens, coating, upgrades, kind } = match;
  const exact = kind === "exact";

  const details = [
    lens.aspheric ? "Aspheric" : "Spheric",
    coating ? coating.name : "No AR",
    lens.photochromic ? `Photochromic ${lens.photochromic}` : null,
    lens.tint ? `Tint ${lens.tint}` : null,
    lens.blueLight ? "Blue filter" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`glass rounded-xl border border-glass-line p-4 ${
        exact ? "shadow-glass" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div
            className={`grid size-12 place-items-center rounded-lg font-display text-sm font-bold ${
              exact
                ? mat
                  ? `${MAT_CLASS[mat]} ${
                      LIGHT_MATERIALS.has(mat) ? "text-ink" : "text-brand-foreground"
                    }`
                  : "gradient-brand text-brand-foreground"
                : mat
                  ? `${MAT_CLASS[mat]}-soft text-ink-soft`
                  : "bg-secondary text-ink-soft"
            }`}
          >
            {matLabel(lens.material)}
          </div>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              lens.sheet === "Plexus"
                ? "bg-sheet-plexus-soft text-sheet-plexus"
                : "bg-sheet-oogp-soft text-sheet-oogp"
            }`}
          >
            {lens.sheet}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{lens.name}</p>
          <p className="text-[12px] text-ink-soft">{details}</p>
          <p className="mt-1 text-[11px] text-ink-faint">
            <span className="font-bold text-ink">{lens.manufacturer}</span> · SPH{" "}
            {range(lens.powerLow, lens.powerHigh)} · Cyl to {lens.cylMax ?? "—"} · Total ≥{" "}
            {lens.totalPowerLowerBound ?? "—"}
          </p>
          {lens.components && (
            <p className="mt-1 text-[11px] text-ink-faint">Components: {lens.components}</p>
          )}
          {lens.notes && <p className="mt-1 text-[11px] text-ink-soft italic">{lens.notes}</p>}
          {upgrades.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {upgrades.map((upgrade) => (
                <span
                  key={upgrade}
                  className="rounded bg-flag-soft px-1.5 py-0.5 text-[10px] font-medium text-flag"
                >
                  {upgrade}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[16px] font-bold tabular-nums">
            {money(lens.pairCost)}
          </p>
          <p className="text-[11px] font-medium text-ink-soft tabular-nums">
            {money(lens.lensCost)} each
          </p>
        </div>
      </div>
    </div>
  );
}
