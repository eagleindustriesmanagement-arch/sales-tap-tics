import type { MetadataRoute } from "next";

/** Installable on a phone home screen (spec 5.1 item 1). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sales Tap-tics",
    short_name: "Tap-tics",
    description: "Voice roleplay practice for car sales, in English and Spanish.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0b5cad",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
