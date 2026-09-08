import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["web-push"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // .well-known/assetlinks.json statik dosyasını sunmak için rewrite
  async rewrites() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        destination: "/.well-known/assetlinks.json",
      },
    ];
  },

  // .well-known klasörünün output'a kopyalanmasını sağla
  async headers() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;