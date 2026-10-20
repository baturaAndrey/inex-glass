import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inex Glass",
    short_name: "Inex Glass",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#267D70",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
