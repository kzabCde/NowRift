import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { expect, test } from "vitest";
import {
  ASSETS,
  assetsForScene,
  pixelAsset,
  validateManifest,
  type PixelAsset,
} from "./assets";
import { ITEMS } from "../rpg/content";

test("every committed public PNG has one registry entry with its actual dimensions", () => {
  const root = resolve("public");
  function paths(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = resolve(dir, entry.name);
      return entry.isDirectory()
        ? paths(file)
        : entry.name.endsWith(".png")
          ? ["/" + relative(root, file).replaceAll("\\", "/")]
          : [];
    });
  }
  expect(ASSETS.map((asset) => asset.path).sort()).toEqual(paths(root).sort());
  expect(validateManifest()).toEqual([]);
  for (const asset of ASSETS) {
    const bytes = readFileSync(resolve(root, "." + asset.path));
    expect(bytes.readUInt32BE(16)).toBe(asset.width);
    expect(bytes.readUInt32BE(20)).toBe(asset.height);
  }
});
test("world bundles exclude other worlds and every unselected wardrobe layer", () => {
  const forest = assetsForScene("forest"),
    desert = assetsForScene("desert");
  expect(forest.some((asset) => asset.bundle === "desert")).toBe(false);
  expect(desert.some((asset) => asset.bundle === "haven")).toBe(false);
  expect(forest.some((asset) => asset.bundle === "appearance")).toBe(false);
  expect(forest.some((asset) => asset.category === "weapon")).toBe(true);
  const look = ASSETS.find(
    (asset) => asset.bundle === "appearance" && asset.audit !== "UNUSED",
  );
  if (look)
    expect(
      assetsForScene("haven", [look.path]).filter(
        (asset) => asset.bundle === "appearance",
      ),
    ).toEqual([look]);
  expect(
    assetsForScene("haven").some((asset) => asset.audit === "UNUSED"),
  ).toBe(false);
});
test("invalid frame bounds, duplicate keys and missing item atlas references are detected", () => {
  const source = pixelAsset("equipment-weapons")!;
  expect(validateManifest([{ ...source, width: source.width + 1 }])).toContain(
    `Partial frame: ${source.path}`,
  );
  expect(validateManifest([source, source])).toContain(
    `Duplicate texture key: ${source.key}`,
  );
  const bad = {
    ...source,
    animations: { broken: { frames: [999], fps: 0, loop: false } },
  } satisfies PixelAsset;
  expect(validateManifest([bad])).toContain(
    `Invalid broken animation: ${source.path}`,
  );
  expect(pixelAsset("/assets/does-not-exist.png")).toBeUndefined();
  const items = pixelAsset("items")!;
  for (const item of Object.values(ITEMS))
    expect(item.icon).toBeLessThan(items.frameCount);
});
