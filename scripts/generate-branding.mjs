import { Buffer } from "node:buffer";
import { inflateSync, deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND_MASTERS } from "./branding-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const signature = Buffer.from("89504e470d0a1a0a", "hex");
const opened = Object.fromEntries(
  Object.entries(BRAND_MASTERS).map(([name, spec]) => {
    const pixels = inflateSync(Buffer.from(spec.encoded, "base64"));
    if (pixels.length !== spec.size * spec.size) throw new Error("Invalid brand image: " + name);
    return [name, { ...spec, pixels }];
  }),
);
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes = Buffer.alloc(0)) {
  const tag = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([tag, bytes])));
  return Buffer.concat([length, tag, bytes, tail]);
}
function png(width, height, pixelAt) {
  const scanlineLength = width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y++) {
    const row = y * scanlineLength;
    for (let x = 0; x < width; x++) {
      const rgba = pixelAt(x, y);
      const offset = row + 1 + x * 4;
      for (let channel = 0; channel < 4; channel++) raw[offset + channel] = rgba[channel];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // channel depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND")]);
}
function sample(source, x, y, outputSize) {
  const sx = Math.min(source.size - 1, Math.floor(x * source.size / outputSize));
  const sy = Math.min(source.size - 1, Math.floor(y * source.size / outputSize));
  return source.palette[source.pixels[sy * source.size + sx]];
}
function save(relative, size, pixelAt) {
  const file = resolve(root, "public", relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png(size, size, pixelAt));
}
const black = [0, 0, 0, 255];
// Delete legacy artwork if the generator runs in a previously built workspace.
rmSync(resolve(root, "public/branding/nowrift-logo-black.png"), { force: true });
save("branding/nowrift-logo-transparent.png", 384, (x,y) => sample(opened.transparent, x, y, 384));
for (const [path, size, artworkSize] of [
  ["icons/icon-192.png", 192, 174],
  ["icons/icon-512.png", 512, 448],
  ["icons/icon-maskable-512.png", 512, 332],
  ["icons/apple-touch-icon.png", 180, 156],
  ["icons/favicon-48.png", 48, 43],
]) {
  const offset = Math.floor((size - artworkSize) / 2);
  save(path, size, (x,y) => {
    if (x < offset || y < offset || x >= offset + artworkSize || y >= offset + artworkSize) return black;
    const [r,g,b,a] = sample(opened.transparent, x - offset, y - offset, artworkSize);
    return [Math.round(r * a / 255), Math.round(g * a / 255), Math.round(b * a / 255), 255];
  });
}
