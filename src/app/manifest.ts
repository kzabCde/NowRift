import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NowRift — Survive the Rift",
    short_name: "NowRift",
    description: "An installable, offline-capable roguelike bullet heaven demo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080e16",
    theme_color: "#080e16",
    orientation: "any",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
