import assert from "node:assert/strict";
import { test } from "vitest";
import { readFileSync } from "node:fs";
import manifest from "../app/manifest";

test("manifest meets installation requirements", () => {
  const meta = manifest();
  assert.equal(meta.start_url, "/");
  assert.equal(meta.scope, "/");
  assert.equal(meta.display, "standalone");
  assert.equal(meta.background_color, "#000000");
  assert.ok(meta.icons?.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(meta.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(meta.icons?.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("service worker caches app shell but does not intercept API calls", () => {
  const source = readFileSync("public/sw.js", "utf8");
  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /\/manifest\.webmanifest/);
  assert.match(source, /\/_next\/static\//);
  assert.match(source, /caches\.open/);
  assert.match(source, /request\.method !== "GET"/);
});

test("official NowRift brand assets have accurate PNG sizes and maskable safe padding", () => {
  for (const [file, expected] of [
    ["public/branding/nowrift-logo-black.png", 384],
    ["public/branding/nowrift-logo-transparent.png", 384],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/icon-maskable-512.png", 512],
    ["public/icons/apple-touch-icon.png", 180],
    ["public/icons/favicon-48.png", 48],
  ] as const) {
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(bytes.readUInt32BE(16), expected, file);
    assert.equal(bytes.readUInt32BE(20), expected, file);
    assert.equal(bytes[25], 6, "Brand assets use RGBA color channels");
  }
  const black = readFileSync("public/branding/nowrift-logo-black.png");
  const transparent = readFileSync("public/branding/nowrift-logo-transparent.png");
  assert.notDeepEqual(black, transparent, "Both supplied logos remain distinct");
});
