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
          "92:73:FA:2A:CE:61:DA:BC:F8:A1:5B:E4:DF:67:4B:D2:23:7F:97:DB:D2:E8:DA:8C:19:CF:C7:41:79:63:72:49"
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