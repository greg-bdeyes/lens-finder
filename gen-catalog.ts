import { parseWorkbook } from "@/lib/parse-workbook";
const buf = await Bun.file("/tmp/browser/reset-check/Stock_lens_database-2.xlsx").arrayBuffer();
const catalog = await parseWorkbook(buf, "Stock_lens_database-2.xlsx");
await Bun.write("/tmp/browser/reset-check/catalog.json", JSON.stringify(catalog));
console.log("lenses:", catalog.lenses.length, "materials:", catalog.materials.length, "coatings:", catalog.coatings.length);
