import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BloomQuest Family",
    short_name: "BloomQuest",
    description: "A private reward space for our family.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#f59e0b",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
