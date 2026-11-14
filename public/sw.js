/* NowRift Phase 4 — same-origin app-shell cache; no backend data or login. */
const VERSION = "nowrift-pwa-v21-gameplay-qol";
const CORE_CACHE = VERSION + "-core";
const ASSET_CACHE = VERSION + "-assets";
const CORE_URLS = [
  "/assets/landing/forest.webp",
  "/assets/landing/foreground.webp",
  "/assets/pixel/interactions/portal.png",
  "/assets/characters/weapons.png",
  "/assets/characters/weapon-evolution.png",
  "/assets/haven/terrain.png",
  "/assets/haven/fountain.png",
  "/assets/haven/forge.png",
  "/assets/haven/workshop.png",
  "/assets/haven/wardrobe.png",
  "/assets/haven/market.png",
  "/assets/haven/inn.png",
  "/assets/haven/store.png",
  "/assets/haven/board.png",
  "/assets/haven/portal.png",
  "/assets/haven/dummy.png",
  "/assets/haven/chest.png",
  "/assets/haven/tree.png",
  "/assets/haven/npc.png",
  "/assets/haven/player-moss.png",
  "/assets/haven/player-ember.png",
  "/assets/haven/player-tide.png",
  "/assets/items/atlas.png",
  "/assets/items/outfitters.png",
  "/assets/worlds/forest/projectiles.png",
  "/assets/worlds/forest/tiles.png",
  "/assets/worlds/forest/tree.png",
  // The starter expedition must remain available after the first city is cached.
  // One foliage atlas is not an eager download of the Southern city bundle.
  "/assets/regions/south/city-trees.png",
  "/assets/worlds/forest/rock.png",
  "/assets/worlds/forest/slime.png",
  "/assets/worlds/forest/goblin.png",
  "/assets/worlds/forest/wolf.png",
  "/assets/worlds/forest/caster.png",
  "/assets/worlds/forest/elite.png",
  "/assets/worlds/forest/boss.png",
  "/assets/worlds/forest/preview.png",
  "/assets/worlds/desert/preview.png",
  "/assets/worlds/desert/tree.png",
  "/assets/worlds/frozen/preview.png",
  "/assets/worlds/infernal/preview.png",
  "/assets/forest/particles.png",
  "/assets/forest/projectiles.png",
  "/assets/forest/player.png",
  "/assets/forest/slime.png",
  "/assets/forest/goblin.png",
  "/assets/forest/wolf.png",
  "/assets/forest/caster.png",
  "/assets/forest/elite.png",
  "/assets/forest/boss.png",
  "/assets/forest/ground.png",
  "/assets/forest/tree.png",
  "/assets/forest/rock.png",
  "/assets/forest/icons.png",
  "/assets/forest/key-art.png",
  "/",
  "/manifest.webmanifest",
  "/manifest.th.webmanifest",
  "/branding/nowrift-logo-transparent.png",
  "/icons/favicon-48.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

function localUrl(input) {
  try {
    const url = new URL(input, self.location.origin);
    return url.origin === self.location.origin ? url : null;
  } catch {
    return null;
  }
}

async function cacheUrl(cache, url) {
  const local = localUrl(url);
  if (!local) return;
  try {
    const response = await fetch(local.href, { cache: "no-store" });
    if (response.ok && response.type !== "opaque")
      await cache.put(local.href, response);
  } catch {
    // Offline or unavailable assets can be cached on the next successful visit.
  }
}

async function warmShell() {
  const core = await caches.open(CORE_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  let html = "";
  try {
    const response = await fetch("/", { cache: "no-store" });
    if (response.ok) {
      html = await response.clone().text();
      await core.put("/", response);
    }
  } catch {
    // Keep cached app shell from a prior successful installation.
  }
  const paths = [...CORE_URLS];
  const assetPattern = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  for (const match of html.matchAll(assetPattern))
    paths.push(match[1].replace(/&amp;/g, "&"));
  await Promise.allSettled(
    [...new Set(paths)].map((path) =>
      cacheUrl(path.startsWith("/_next/") ? assets : core, path),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(warmShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("nowrift-pwa-") && !key.startsWith(VERSION),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "WARM_ASSETS" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        await Promise.allSettled(
          event.data.urls
            .slice(0, 100)
            .filter((input) => {
              const url = typeof input === "string" ? localUrl(input) : null;
              return url && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/"));
            })
            .map((url) => cacheUrl(cache, url)),
        );
      })(),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = localUrl(request.url);
  if (!url || request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const core = await caches.open(CORE_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await core.put("/", response.clone());
          return response;
        } catch {
          return (
            (await core.match("/")) ||
            new Response(
              "NowRift is offline. Connect once to download the game.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            )
          );
        }
      })(),
    );
    return;
  }
  if (
    !url.pathname.startsWith("/_next/static/") &&
    !url.pathname.startsWith("/assets/") &&
    !CORE_URLS.includes(url.pathname) &&
    url.pathname !== "/icons/favicon-48.png"
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(
        url.pathname.startsWith("/_next/static/") ? ASSET_CACHE : CORE_CACHE,
      );
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type !== "opaque")
        await cache.put(request, response.clone());
      return response;
    })(),
  );
});
