import sharp from "sharp";
import { mkdir, copyFile, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import process from "node:process";
import console from "node:console";

const output = "public/assets/landing";
await mkdir(output, { recursive: true });
await mkdir("art/landing", { recursive: true });
// Optional source arguments import the original generated masters without deleting them.
for (const [index, name] of ["forest", "foreground"].entries()) {
  if (process.argv[index + 2])
    await copyFile(process.argv[index + 2], `art/landing/${name}-source.png`);
}
const images = [
  {
    name: "forest",
    source: "art/landing/forest-source.png",
    width: 960,
    height: 540,
    palette: 256,
  },
  {
    name: "foreground",
    source: "art/landing/foreground-source.png",
    width: 960,
    height: 540,
  },
  {
    name: "haven",
    source: "docs/images/pixel-art/after-haven.png",
    crop: { left: 0, top: 130, width: 1280, height: 680 },
    width: 900,
  },
  {
    name: "story",
    source: "docs/images/pixel-art/boss.png",
    crop: { left: 240, top: 345, width: 900, height: 480 },
    width: 900,
  },
  {
    name: "exploration",
    source: "public/assets/worlds/desert/preview.png",
    width: 720,
  },
  {
    name: "progression",
    source: "docs/images/pixel-art/layered-inventory.png",
    crop: { left: 38, top: 430, width: 1200, height: 648 },
    width: 900,
  },
];
const manifest = [];
for (const asset of images) {
  let image = sharp(asset.source);
  if (asset.crop) image = image.extract(asset.crop);
  image = image.resize(asset.width, asset.height, {
    fit: "cover",
    kernel: "nearest",
    withoutEnlargement: true,
  });
  if (asset.palette)
    image = sharp(
      await image
        .png({ palette: true, colors: asset.palette, dither: 0 })
        .toBuffer(),
    );
  await image
    .webp({ nearLossless: true, quality: 90, effort: 6 })
    .toFile(`${output}/${asset.name}.webp`);
  const path = `${output}/${asset.name}.webp`,
    bytes = await readFile(path),
    metadata = await sharp(path).metadata();
  manifest.push({
    path: path.replace("public", ""),
    source: asset.source,
    width: metadata.width,
    height: metadata.height,
    bytes: (await stat(path)).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  "art/landing/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    manifest.map(({ path, bytes, width, height }) => ({
      path,
      bytes,
      width,
      height,
    })),
    null,
    2,
  ),
);
