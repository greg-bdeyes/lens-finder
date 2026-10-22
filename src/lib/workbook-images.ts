import { unzipSync, strFromU8 } from "fflate";

/**
 * Extracts Excel "Place in Cell" pictures. Returns sheetName -> cellRef -> raw image data URL.
 * Chain: cell vm -> valueMetadata -> futureMetadata rvb -> rich value -> richValueRel -> media file.
 */
export function extractCellImages(data: ArrayBuffer): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(data));
  } catch {
    return out;
  }
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : "");
  const meta = read("xl/metadata.xml");
  const rv = read("xl/richData/rdrichvalue.xml");
  const rel = read("xl/richData/richValueRel.xml");
  const relRels = read("xl/richData/_rels/richValueRel.xml.rels");
  if (!meta || !rv || !rel || !relRels) return out;

  const all = (s: string, re: RegExp) => Array.from(s.matchAll(re));
  const futureSection = meta.match(/<futureMetadata[^>]*name="XLRICHVALUE"[\s\S]*?<\/futureMetadata>/)?.[0] ?? "";
  const rvbIdx = all(futureSection, /<xlrd:rvb i="(\d+)"/g).map((m) => Number(m[1]));
  const valueSection = meta.match(/<valueMetadata[\s\S]*?<\/valueMetadata>/)?.[0] ?? "";
  const vmToFuture = all(valueSection, /<rc t="\d+" v="(\d+)"/g).map((m) => Number(m[1]));
  const rvFirst = all(rv, /<rv [^>]*>\s*<v>(\d+)<\/v>/g).map((m) => Number(m[1]));
  const relIds = all(rel, /r:id="([^"]+)"/g).map((m) => m[1]);
  const targets: Record<string, string> = {};
  for (const m of all(relRels, /<Relationship [^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const t = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && t) targets[id] = "xl/" + t.replace(/^\.\.\//, "");
  }

  // sheet name -> worksheet path
  const wb = read("xl/workbook.xml");
  const wbRels = read("xl/_rels/workbook.xml.rels");
  const relTarget: Record<string, string> = {};
  for (const m of all(wbRels, /<Relationship [^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const t = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && t) relTarget[id] = t.startsWith("/") ? t.slice(1) : "xl/" + t;
  }

  for (const m of all(wb, /<sheet [^>]*>/g)) {
    const name = m[0].match(/name="([^"]+)"/)?.[1];
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1];
    if (!name || !rid) continue;
    const xml = read(relTarget[rid] ?? "");
    for (const c of all(xml, /<c [^>]*vm="(\d+)"[^>]*>/g)) {
      const ref = c[0].match(/r="([A-Z]+\d+)"/)?.[1];
      const vm = Number(c[1]);
      const future = vmToFuture[vm - 1];
      const rvIndex = future === undefined ? undefined : rvbIdx[future];
      const relIndex = rvIndex === undefined ? undefined : rvFirst[rvIndex];
      const relId = relIndex === undefined ? undefined : relIds[relIndex];
      const path = relId ? targets[relId] : undefined;
      const bytes = path ? files[path] : undefined;
      if (!ref || !path || !bytes) continue;
      const mime = path.endsWith(".png") ? "image/png" : path.endsWith(".gif") ? "image/gif" : "image/jpeg";
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      (out[name] ??= {})[ref] = `data:${mime};base64,${btoa(bin)}`;
    }
  }
  return out;
}

/** Makes a black or white background transparent (flood fill from the edges), returns a small PNG. */
export async function removeBackground(src: string, size = 240): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, size / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  const px = d.data;
  const at = (i: number) => [px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!, px[i * 4 + 3]!] as const;
  const [r0, g0, b0] = at(0);
  const bright = (r0 + g0 + b0) / 3 > 127;
  const isBg = (i: number) => {
    const [r, g, b, a] = at(i);
    if (a < 20) return true;
    return bright ? Math.min(r, g, b) > 225 : Math.max(r, g, b) < 40;
  };
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !isBg(i)) continue;
    seen[i] = 1;
    px[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  ctx.putImageData(d, 0, 0);
  return canvas.toDataURL("image/png");
}
