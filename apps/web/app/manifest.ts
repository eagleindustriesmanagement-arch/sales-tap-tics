import type { MetadataRoute } from "next";

/** Installable on a phone home screen (spec 5.1 item 1). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sales Taptics",
    short_name: "Taptics",
    description: "Voice roleplay practice for car sales, in English and Spanish.",
    start_url: "/today",
    display: "standalone",
    background_color: "#040407",
    theme_color: "#040407",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
