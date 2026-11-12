import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import {
  ASSETS,
  pixelAsset,
  validateManifest,
} from "../src/game/presentation/assets";
import { ITEMS } from "../src/game/rpg/content";
import { WEAPONS } from "../src/game/content/forest";

const publicRoot = resolve("public"),
  errors = validateManifest();
for (const asset of ASSETS) {
  try {
    const data = readFileSync(resolve(publicRoot, "." + asset.path));
    if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      errors.push(`Invalid PNG signature: ${asset.path}`);
    else if (
      data.readUInt32BE(16) !== asset.width ||
      data.readUInt32BE(20) !== asset.height
    )
      errors.push(`Stale PNG dimensions: ${asset.path}`);
    if (
      data.length !== asset.bytes ||
      createHash("sha256").update(data).digest("hex") !== asset.sha256
    )
      errors.push(`Stale asset revision: ${asset.path}`);
  } catch {
    errors.push(`Missing source file: ${asset.path}`);
  }
}
function sourcePaths(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory()
      ? sourcePaths(path)
      : entry.name.endsWith(".png")
        ? ["/" + relative(publicRoot, path).replaceAll("\\", "/")]
        : [];
  });
}
for (const path of sourcePaths(publicRoot))
  if (!pixelAsset(path)) errors.push(`Unregistered public PNG: ${path}`);
const icons = pixelAsset("items")!,
  weapons = pixelAsset("equipment-weapons")!;
for (const item of Object.values(ITEMS)) {
  if (
    !Number.isInteger(item.icon) ||
    item.icon < 0 ||
    item.icon >= icons.frameCount
  )
    errors.push(`Unresolved item icon: ${item.id}`);
  if (
    item.weapon &&
    (!Object.hasOwn(WEAPONS, item.weapon.attack) ||
      !Number.isInteger(item.weapon.frame) ||
      item.weapon.frame < 0 ||
      item.weapon.frame >= weapons.frameCount)
  )
    errors.push(`Unresolved equipment visual: ${item.id}`);
}
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else
  console.log(
    `Validated ${ASSETS.length} public PNGs, frame grids, animation tracks, texture keys and ${Object.keys(ITEMS).length} item references.`,
  );
