import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import manifest from "../app/manifest";

test("manifest meets installation requirements", () => {
  const meta = manifest();
  assert.equal(meta.start_url, "/");
  assert.equal(meta.scope, "/");
  assert.equal(meta.display, "standalone");
  assert.equal(meta.background_color, "#080e16");
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
