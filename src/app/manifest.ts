import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inex Glass",
    short_name: "Inex Glass",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#267D70",
    // Brand mark: `src/app/icon.svg`; PNGs in `public/` are rendered from it.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
