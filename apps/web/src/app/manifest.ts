import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidhan",
    short_name: "Vidhan",
    description: "Legal guidance chatbot for Nepal",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF7F3",
    theme_color: "#61211D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
