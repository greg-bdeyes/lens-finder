import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalog } from "@/lib/catalog-types";
import { parseWorkbook } from "@/lib/parse-workbook";
import { defaultQuery, searchLenses, type LensQuery } from "@/lib/search-lenses";
import { LensSearchForm } from "@/components/lens-search-form";
import { LensResultCard } from "@/components/lens-result-card";

type Theme = "light" | "dark" | "spooky";
const THEME_KEY = "stock-lens-theme";
const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "spooky", label: "Spooky" },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.classList.toggle("spooky", theme === "spooky");
}

function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("spooky");
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "spooky" || saved === "light") setTheme(saved);
  }, []);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-full border border-glass-line bg-secondary p-0.5">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={theme === t.value}
          onClick={() => {
            setTheme(t.value);
            localStorage.setItem(THEME_KEY, t.value);
          }}
          className={
            theme === t.value
              ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
              : "rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:text-ink"
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const STORAGE_KEY = "stock-lens-catalog-v2";
// Address of the workbook, relative to where the app is hosted. Put the
// workbook in the same folder as the app (or change this path/URL).
const WORKBOOK_URL = "file://192.168.1.81/Shares/Optician%20tools/Stock_lens_database.xlsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stock Lens Finder — optical stock lens lookup" },
      {
        name: "description",
        content:
          "Search the office stock lens workbook by material, AR coating, Rx power and lens options, with exact and close matches plus pricing.",
      },
      { property: "og:title", content: "Stock Lens Finder" },
      {
        property: "og:description",
        content:
          "Look up stock lenses and prices from the shared-drive workbook: material, AR tier, Rx bounds, photochromic and tint options.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState<LensQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCached = () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as Catalog;
        setCatalog(parsed);
        setQuery(defaultQuery(parsed));
      } catch {
        // ignore a corrupt cache
      }
    };
    (async () => {
      try {
        const res = await fetch(`${WORKBOOK_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const buffer = await res.arrayBuffer();
        const name = decodeURIComponent(WORKBOOK_URL.split("/").pop() || WORKBOOK_URL);
        const parsed = await parseWorkbook(buffer, name);
        if (cancelled || parsed.lenses.length === 0) throw new Error("empty");
        setCatalog(parsed);
        setQuery(defaultQuery(parsed));
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // cache is optional
        }
      } catch {
        if (!cancelled) loadCached();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFile = async (file: File) => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseWorkbook(buffer, file.name);
      if (parsed.lenses.length === 0) {
        setError("No lens rows found — check that the file has Plexus and OOGP sheets.");
        return;
      }
      setCatalog(parsed);
      setQuery(defaultQuery(parsed));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // cache is optional
      }
    } catch {
      setError("That file couldn't be read. Please pick the lens workbook (.xlsx).");
    }
  };

  const matches = useMemo(
    () => (catalog && query ? searchLenses(catalog, query) : []),
    [catalog, query],
  );
  const exact = matches.filter((match) => match.kind === "exact");
  const close = matches.filter((match) => match.kind === "close");

  return (
    <div className="min-h-screen w-full font-sans text-ink">
      <header className="glass-strong sticky top-0 z-20 border-b border-glass-line">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-0">
          <div aria-hidden="true" />
          <div className="flex items-center justify-center gap-4">
            {catalog?.words?.titleImage ? (
              <img
                src={catalog.words.titleImage}
                alt=""
                className="h-[90px] w-auto object-contain"
              />
            ) : (
              <div className="gradient-brand grid size-11 place-items-center rounded-xl font-display text-base font-bold text-brand-foreground shadow-lg">
                Lx
              </div>
            )}
            <div>
              <p className="font-display text-[23px] font-semibold leading-none">
                {catalog?.words?.title || "Stock Lens Finder"}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                {catalog
                  ? `${catalog.lenses.length} lenses · ${catalog.fileName}`
                  : "Load the lens workbook to begin"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-center gap-2">

            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-full border border-glass-line bg-secondary px-3 py-1.5 text-[11px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {catalog ? "Reload workbook" : "Open lens workbook"}
            </button>
            <ThemePicker />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-8">
        {!catalog || !query ? (
          <section className="col-span-12">
            <div className="glass shadow-glass mx-auto max-w-xl rounded-2xl border border-glass-line p-8 text-center">
              <h1 className="font-display text-xl font-semibold">Open the lens workbook</h1>
              <p className="mt-2 text-[13px] text-ink-soft">
                Pick the stock lens file from the shared drive. It stays on this computer — the
                app reads it directly and remembers it for next time.
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="gradient-brand mt-6 rounded-xl px-5 py-3 text-[14px] font-semibold text-brand-foreground shadow-lg"
              >
                Choose workbook
              </button>
              {error && <p className="mt-4 text-[12px] text-destructive">{error}</p>}
            </div>
          </section>
        ) : (
          <>
            <section className="col-span-12 lg:col-span-4">
              <LensSearchForm catalog={catalog} query={query} onChange={setQuery} />
              {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
            </section>

            <section className="col-span-12 space-y-6 lg:col-span-8">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">Exact matches</h3>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {exact.length} found
                  </span>
                </div>
                <div className="space-y-3">
                  {exact.length === 0 ? (
                    <div className="glass rounded-xl border border-glass-line p-4 text-[12px] text-ink-soft">
                      No lens matches every option. Check the close matches below.
                    </div>
                  ) : (
                    exact.map((match) => <LensResultCard key={match.lens.id} match={match} />)
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">Close matches</h3>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                    {close.length} near
                  </span>
                </div>
                <div className="space-y-3">
                  {close.length === 0 ? (
                    <div className="glass rounded-xl border border-glass-line p-4 text-[12px] text-ink-soft">
                      Nothing close with more or better features.
                    </div>
                  ) : (
                    close.map((match) => <LensResultCard key={match.lens.id} match={match} />)
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
