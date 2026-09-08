import { NextResponse } from "next/server";

// GET /.well-known/assetlinks.json → rewrites to /api/assetlinks
export async function GET() {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "app.vercel.create_five_gules.twa",
        sha256_cert_fingerprints: [
          "2E:0C:7A:23:4D:82:7D:8C:A5:65:B1:08:48:33:65:32:A2:18:76:75:A9:60:FB:62:B8:EF:7B:97:04:C0:E9:F8"
        ],
      },
    },
  ];

  return NextResponse.json(assetlinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}