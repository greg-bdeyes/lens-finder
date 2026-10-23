import * as XLSX from "xlsx";
import { extractCellImages, removeBackground } from "./workbook-images";
import type { ArCoating, Catalog, CatalogWords, Lens, SheetName } from "./catalog-types";

type Row = (string | number | boolean | null)[];

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function bool(value: unknown): boolean {
  if (value === true) return true;
  const raw = text(value).toLowerCase();
  return raw === "true" || raw === "yes" || raw === "1" || raw === "x";
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function rowsOf(wb: XLSX.WorkBook, sheet: string): Row[] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: null, raw: true });
}

function readMaterials(wb: XLSX.WorkBook): string[] {
  const rows = rowsOf(wb, "Materials");
  const out: string[] = [];
  for (const row of rows) {
    const value = text(row?.[0]);
    if (value) out.push(value);
  }
  return out;
}

function readCoatings(wb: XLSX.WorkBook): ArCoating[] {
  const rows = rowsOf(wb, "Anti-reflective coatings");
  const firstRow = rows[0];
  if (!firstRow) return [];
  const header = firstRow.map((cell) => text(cell).toLowerCase().replace(/\?$/, ""));
  const idx = (needle: string) => header.findIndex((cell) => cell.startsWith(needle));
  const iName = idx("anti-reflective");
  const iTier = idx("tier");
  const iShort = idx("shorthand");
  const iBlue = idx("blue filter");
  const iVsp = idx("vsp");

  const out: ArCoating[] = [];
  for (const row of rows.slice(1)) {
    const name = text(row?.[iName]);
    const shorthand = text(row?.[iShort]);
    if (!name && !shorthand) continue;
    out.push({
      name: name || shorthand,
      tier: text(row?.[iTier]),
      shorthand: shorthand || name,
      blueFilter: bool(row?.[iBlue]),
      vsp: bool(row?.[iVsp]),
    });
  }
  return out;
}

function canonicalMaterial(raw: string, materials: string[]): string {
  const value = raw.trim();
  if (!value) return value;
  const lower = value.toLowerCase();
  const hit = materials.find((m) => {
    const ml = m.toLowerCase();
    return lower === ml || lower.startsWith(ml) || ml.startsWith(lower) || lower.includes(ml);
  });
  if (hit) return hit;
  if (lower.startsWith("plastic")) return materials[0] ?? value;
  return value;
}

function readLensSheet(
  wb: XLSX.WorkBook,
  sheet: SheetName,
  materials: string[],
  images: Record<string, Record<string, string>>,
): Lens[] {
  const rows = rowsOf(wb, sheet);
  const headerIndex = rows.findIndex((row) =>
    row?.some((cell) => text(cell).toLowerCase() === "manufacturer"),
  );
  const headerRow = headerIndex >= 0 ? rows[headerIndex] : undefined;
  if (!headerRow) return [];

  const header = headerRow.map((cell) => text(cell).toLowerCase());
  const col = (needle: string) => header.findIndex((cell) => cell === needle);
  const colStarts = (needle: string) => header.findIndex((cell) => cell.startsWith(needle));

  const iManufacturer = col("manufacturer");
  const iName = colStarts("oogp lens name");
  const iComponents = colStarts("components");
  const iAsph = colStarts("aspheric or spheric");
  const iAr = col("ar");
  const iPhoto = colStarts("photochromic");
  const iTint = colStarts("tint");
  const iBlue = colStarts("blue light");
  // The two unnamed columns right after "Blue Light" sit under the merged
  // "Power Range" label in the workbook.
  const iPowerLow = iBlue + 1;
  const iPowerHigh = iBlue + 2;
  const iCyl = colStarts("cyl max");
  const iTotal = colStarts("total power lower bound");
  const iCost = colStarts("lens cost");
  const iPair = col("pair");
  const iNotes = colStarts("notes");
  const iLab = colStarts("lab stock");
  const iImage = col("image");
  const sheetImages = images[sheet] ?? {};

  const lenses: Lens[] = [];
  let currentMaterial = "";

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (!row) return;
    const groupCell = text(row[0]);
    if (groupCell) currentMaterial = groupCell;
    const name = text(row[iName]);
    if (!name) return;
    const rowNumber = headerIndex + 1 + offset + 1;
    const imageRef = iImage >= 0 ? `${XLSX.utils.encode_col(iImage)}${rowNumber}` : "";

    lenses.push({
      id: `${sheet}-${headerIndex + 1 + offset}`,
      sheet,
      materialRaw: currentMaterial,
      material: canonicalMaterial(currentMaterial, materials),
      manufacturer: text(row[iManufacturer]),
      name,
      components: text(row[iComponents]),
      aspheric: bool(row[iAsph]),
      ar: text(row[iAr]) || null,
      photochromic: text(row[iPhoto]) || null,
      tint: iTint >= 0 ? text(row[iTint]) || null : null,
      blueLight: bool(row[iBlue]),
      powerLow: num(row[iPowerLow]),
      powerHigh: num(row[iPowerHigh]),
      cylMax: num(row[iCyl]),
      totalPowerLowerBound: num(row[iTotal]),
      lensCost: num(row[iCost]),
      pairCost: num(row[iPair]),
      notes: iNotes >= 0 ? text(row[iNotes]) || null : null,
      labStock: iLab >= 0 ? bool(row[iLab]) : false,
      image: sheetImages[imageRef] ?? null,
    });
  });

  return lenses;
}

function readWords(wb: XLSX.WorkBook, images: Record<string, Record<string, string>>): CatalogWords {
  const rows = rowsOf(wb, "Words");
  const sheetImages = images["Words"] ?? {};
  const out: CatalogWords = { title: null, titleImage: null };
  rows.forEach((row, index) => {
    if (!row) return;
    if (text(row[0]).toLowerCase() !== "title") return;
    out.title = text(row[1]) || null;
    const rowNumber = index + 1;
    out.titleImage = sheetImages[`C${rowNumber}`] ?? null;
  });
  return out;
}

export async function parseWorkbook(data: ArrayBuffer, fileName: string): Promise<Catalog> {
  const wb = XLSX.read(data, { type: "array" });
  const materials = readMaterials(wb);
  const raw = extractCellImages(data);
  const images: Record<string, Record<string, string>> = {};
  for (const [sheet, cells] of Object.entries(raw)) {
    const done: Record<string, string> = {};
    for (const [ref, src] of Object.entries(cells)) {
      try {
        done[ref] = await removeBackground(src);
      } catch {
        done[ref] = src;
      }
    }
    images[sheet] = done;
  }
  const lenses = [
    ...readLensSheet(wb, "Plexus", materials, images),
    ...readLensSheet(wb, "OOGP", materials, images),
  ];
  return {
    fileName,
    loadedAt: new Date().toISOString(),
    materials,
    lenses,
    coatings: readCoatings(wb),
    words: readWords(wb, images),
  };
}
