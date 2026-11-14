import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./rpg.css";
import "./profile.css";
import "./haven.css";
import "./journey.css";
import "./equipment.css";
import "./pixel.css";
import "./outfitters.css";
import "./story.css";

export const metadata: Metadata = {
  applicationName: "NowRift",
  title: "NowRift — Enter the Rift",
  description:
    "Enter NowRift as a guest. Explore the Whispering Forest in a pixel-art Bullet Heaven adventure. No account required.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NowRift",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#080e16",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
