import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { ASSETS, pixelAsset } from "./assets";
import { wearableIcon } from "./wearables";

function rgba(path: string) {
  const png = readFileSync(path),
    width = png.readUInt32BE(16),
    height = png.readUInt32BE(20),
    chunks: Buffer[] = [];
  expect([png[24], png[25]]).toEqual([8, 6]);
  for (let off = 8; off < png.length; ) {
    const size = png.readUInt32BE(off);
    if (png.toString("ascii", off + 4, off + 8) === "IDAT")
      chunks.push(png.subarray(off + 8, off + 8 + size));
    off += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)),
    stride = width * 4,
    data = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < stride; x++) {
      const filter = raw[y * (stride + 1)],
        a = x >= 4 ? data[y * stride + x - 4] : 0,
        b = y ? data[(y - 1) * stride + x] : 0,
        c = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const predictor = [
        0,
        a,
        b,
        Math.floor((a + b) / 2),
        pa <= pb && pa <= pc ? a : pb <= pc ? b : c,
      ][filter];
      if (predictor === undefined) throw new Error("Unsupported PNG filter");
      data[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  return { width, height, data };
}
function cell(
  image: ReturnType<typeof rgba>,
  x: number,
  y: number,
  size: number,
) {
  const out = Buffer.alloc(size * size * 4);
  for (let row = 0; row < size; row++)
    image.data.copy(
      out,
      row * size * 4,
      ((y + row) * image.width + x) * 4,
      ((y + row) * image.width + x + size) * 4,
    );
  return out;
}
test("all 16 original catalog icons are registered, transparent, physically distinct and map to real definitions", () => {
  const image = rgba("public/assets/items/outfitters.png"),
    meta = pixelAsset("outfitters-items")!;
  expect([image.width, image.height, meta.frameCount]).toEqual([128, 128, 16]);
  expect(meta.category).toBe("item");
  expect(meta.bundle).toBe("common");
  const silhouettes = new Map<number, Set<string>>();
  for (const [row, world] of [
    "forest",
    "desert",
    "frozen",
    "infernal",
  ].entries())
    for (const [column, slot] of [
      "armor",
      "helmet",
      "pants",
      "boots",
    ].entries()) {
      expect(wearableIcon(`${world}-${slot}`)!.frame).toBe(row * 4 + column);
      const pixels = cell(image, column * 32, row * 32, 32),
        alpha = Buffer.alloc(1024);
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const a = pixels[(y * 32 + x) * 4 + 3];
          alpha[y * 32 + x] = a;
          expect([0, 255]).toContain(a);
          if (x === 0 || x === 31 || y === 0 || y === 31) expect(a).toBe(0);
        }
      const hashes = silhouettes.get(column) ?? new Set<string>();
      hashes.add(createHash("sha256").update(alpha).digest("hex"));
      silhouettes.set(column, hashes);
      expect(
        readFileSync(`art/outfitters/${world}-${slot}.svg`, "utf8"),
      ).toContain('shape-rendering="crispEdges"');
    }
  for (const hashes of silhouettes.values()) expect(hashes.size).toBe(4);
});
test("the first 44 legacy icon cells retain their exact pixels; pants occupy only the unused final four", () => {
  const legacy = rgba("public/assets/items/atlas.png"),
    icons = rgba("public/assets/items/outfitters.png");
  const preserved = Buffer.concat(
    Array.from({ length: 44 }, (_, i) =>
      cell(legacy, (i % 8) * 32, Math.floor(i / 8) * 32, 32),
    ),
  );
  expect(createHash("sha256").update(preserved).digest("hex")).toBe(
    "baa07e70deda68435dfd4c73a2ebd9f0f30e8a70afc65e91e94556a697f5f9db",
  );
  for (let row = 0; row < 4; row++)
    expect(
      cell(legacy, ((44 + row) % 8) * 32, Math.floor((44 + row) / 8) * 32, 32),
    ).toEqual(cell(icons, 64, row * 32, 32));
});
test("75 modular layers retain all 104 synchronized native frames with binary alpha and distinct biome construction", () => {
  const assets = ASSETS.filter((asset) =>
    /\/(?:pants-base|legwear-[a-z]+-[0-2]|outfit-boots-[a-z]+-[0-2])\.png$/.test(
      asset.path,
    ),
  );
  expect(assets).toHaveLength(75);
  const masks = new Map<string, Set<string>>();
  for (const asset of assets) {
    expect([
      asset.width,
      asset.height,
      asset.frameWidth,
      asset.frameHeight,
      asset.frameCount,
    ]).toEqual([1248, 192, 48, 48, 104]);
    expect(asset.pivot).toEqual([0.5, 0.75]);
    const image = rgba("public" + asset.path),
      counts = Array(104).fill(0);
    for (let i = 3; i < image.data.length; i += 4) {
      const a = image.data[i];
      if (a !== 0 && a !== 255)
        throw new Error("Non-pixel alpha in " + asset.path);
      if (a) {
        const pixel = Math.floor(i / 4),
          x = pixel % image.width,
          y = Math.floor(pixel / image.width);
        counts[Math.floor(y / 48) * 26 + Math.floor(x / 48)]++;
      }
    }
    expect(counts.every((n) => n > 0)).toBe(true);
    if (asset.path.endsWith("-0.png")) {
      const key = asset.path.includes("legwear") ? "pants" : "boots",
        character = asset.path.split("/")[4],
        pixels = cell(image, 0, 0, 48),
        alpha = Buffer.alloc(48 * 48);
      for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
      const group = character + key,
        set = masks.get(group) ?? new Set<string>();
      set.add(createHash("sha256").update(alpha).digest("hex"));
      masks.set(group, set);
    }
  }
  for (const set of masks.values()) expect(set.size).toBe(4);
});
