import { useEffect, useMemo, useState } from "react";
import type { Catalog } from "@/lib/catalog-types";
import {
  AR_ANY,
  AR_ANY_BLUE,
  AR_NONE,
  AR_NO_PREFERENCE,
  coatingsInCategory,
  defaultQuery,
  tiersFor,
  type LensQuery,
} from "@/lib/search-lenses";

interface Props {
  catalog: Catalog;
  query: LensQuery;
  onChange: (next: LensQuery) => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-ink-soft">{children}</label>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const parsed = text.trim() === "" ? null : Number(text);
    if (parsed !== value && !(Number.isNaN(parsed) && value === null)) {
      setText(value === null ? "" : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className="field tabular-nums"
      type="text"
      inputMode="text"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next = event.target.value.replace(/[^0-9.+-]/g, "");
        setText(next);
        const parsed = Number(next);
        if (next.trim() === "") onChange(null);
        else if (!Number.isNaN(parsed)) onChange(parsed);
        else onChange(null);
      }}
    />
  );
}

export function LensSearchForm({ catalog, query, onChange }: Props) {
  const set = <K extends keyof LensQuery>(key: K, value: LensQuery[K]) =>
    onChange({ ...query, [key]: value });

  const materials = useMemo(() => {
    const used = new Set(catalog.lenses.map((lens) => lens.material));
    const ordered = catalog.materials.filter((material) => used.has(material));
    return ordered.length ? ordered : [...used].filter(Boolean);
  }, [catalog]);

  const vspCoatings = useMemo(
    () => catalog.coatings.filter((coating) => coating.vsp),
    [catalog],
  );
  const tiers = useMemo(
    () => tiersFor(catalog.coatings, query.vsp),
    [catalog, query.vsp],
  );
  const categoryCoatings = useMemo(() => {
    if (query.arCategory === AR_NONE || query.arCategory === AR_NO_PREFERENCE) return [];
    return coatingsInCategory(catalog.coatings, query.arCategory);
  }, [catalog, query.arCategory]);

  // Keep the AR selections valid when the VSP choice or category changes.
  useEffect(() => {
    if (query.arSpecific === AR_ANY) return;
    const stillValid = categoryCoatings.some(
      (coating) => coating.shorthand === query.arSpecific,
    );
    if (!stillValid) onChange({ ...query, arSpecific: AR_ANY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryCoatings]);

  const arDisabled =
    query.arCategory === AR_NONE || query.arCategory === AR_NO_PREFERENCE;

  return (
    <div className="glass shadow-glass rounded-2xl border border-glass-line p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Lens search</h2>
          <p className="text-[12px] text-ink-soft">Set parameters to match exact stock.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaultQuery(catalog))}
          className="shrink-0 rounded-full border border-glass-line bg-secondary px-3 py-1.5 text-[11px] font-medium text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium">VSP order</p>
            <p className="text-[11px] text-ink-faint">Searches the Plexus sheet only</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={query.vsp}
            aria-label="VSP order"
            onClick={() =>
              onChange({
                ...query,
                vsp: !query.vsp,
                asphericity: "any",
                arCategory: AR_NO_PREFERENCE,
                arSpecific: AR_ANY,
              })
            }
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              query.vsp ? "bg-brand" : "bg-ink-faint/50"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-popover shadow transition-all ${
                query.vsp ? "left-[1.375rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div>
          <Label>Material</Label>
          <div className="relative">
            <select
              className="field appearance-none pr-8"
              value={query.material}
              onChange={(event) => set("material", event.target.value)}
            >
              {materials.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint">
              ▾
            </span>
          </div>
        </div>

        {!query.vsp && (
          <div>
            <Label>Asphericity</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["spheric", "Spheric"],
                  ["aspheric", "Aspheric"],
                  ["any", "No preference"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("asphericity", value)}
                  className={`rounded-lg border py-2 text-[12px] transition-colors ${
                    query.asphericity === value
                      ? "border-brand bg-brand font-semibold text-brand-foreground shadow-md"
                      : "border-glass-line bg-secondary font-medium text-ink-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.vsp ? (
          <div>
            <Label>AR coating (VSP)</Label>
            <select
              className="field"
              value={query.arSpecific === AR_ANY ? query.arCategory : query.arSpecific}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === AR_NONE ||
                  value === AR_ANY ||
                  value === AR_NO_PREFERENCE
                ) {
                  onChange({ ...query, arCategory: value, arSpecific: AR_ANY });
                } else {
                  onChange({ ...query, arCategory: AR_ANY, arSpecific: value });
                }
              }}
            >
              <option value={AR_NO_PREFERENCE}>No preference</option>
              <option value={AR_ANY}>Any VSP AR</option>
              <option value={AR_NONE}>No AR</option>
              {vspCoatings.map((coating) => (
                <option key={coating.shorthand} value={coating.shorthand}>
                  {coating.name} · {coating.tier}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>AR category</Label>
              <select
                className="field"
                value={query.arCategory}
                onChange={(event) =>
                  onChange({
                    ...query,
                    arCategory: event.target.value,
                    arSpecific: AR_ANY,
                  })
                }
              >
                <option value={AR_NO_PREFERENCE}>No Preference</option>
                <option value={AR_NONE}>No AR</option>
                <option value={AR_ANY}>Any Tier</option>
                <option value={AR_ANY_BLUE}>Any Blue AR</option>
                {tiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>
            {!arDisabled && (
              <div>
                <Label>AR coating</Label>
                <select
                  className="field"
                  value={query.arSpecific}
                  onChange={(event) => set("arSpecific", event.target.value)}
                >
                  <option value={AR_ANY}>Any AR in Category</option>
                  {categoryCoatings.map((coating) => (
                    <option key={coating.shorthand} value={coating.shorthand}>
                      {coating.name} · {coating.tier}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sphere</Label>
            <NumberField
              placeholder="Any"
              value={query.sphere}
              onChange={(value) => set("sphere", value)}
            />
          </div>
          <div>
            <Label>Cyl</Label>
            <NumberField
              placeholder="Any"
              value={query.cylinder}
              onChange={(value) => set("cylinder", value)}
            />
          </div>
          <p className="col-span-2 -mt-1 text-[11px] text-ink-faint">
            Leave blank to ignore. Format: -2.25, -1.00…
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["blueFilterLens", "Blue filter lens"],
              ["photochromic", "Photochromic"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-glass-line bg-secondary px-3 py-2.5"
            >
              <span className="text-[12px] font-medium">{label}</span>
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={query[key]}
                  onChange={(event) => set(key, event.target.checked)}
                />
                <span className="block h-5 w-9 rounded-full bg-ink-faint/50 transition-colors peer-checked:bg-accent" />
                <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-popover shadow transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-glass-line bg-secondary px-3 py-2.5">
          <span className="text-[12px] font-medium">Tint</span>
          <span className="relative inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={query.tint}
              onChange={(event) => set("tint", event.target.checked)}
            />
            <span className="block h-5 w-9 rounded-full bg-ink-faint/50 transition-colors peer-checked:bg-accent" />
            <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-popover shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      </div>
    </div>
  );
}
