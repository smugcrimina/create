import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "İş Takip Sistemi",
    short_name: "İş Takip",
    description: "Profesyonel İş Yönetim ve Takip Platformu",
    start_url: "/",
    scope: "/",
    lang: "tr",
    dir: "ltr",
    categories: ["business", "productivity"],
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#059669",
    prefer_related_applications: true,
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=app.vercel.create_five_gules.twa",
        id: "app.vercel.create_five_gules.twa",
      },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    screenshots: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: "İş Takip Ana Ekran",
      },
    ],
  };
}
