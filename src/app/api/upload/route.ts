import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("source") as File;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    // Get API settings from DB
    const apiUrlRow = await db.select().from(settings).where(eq(settings.key, "image_api_url")).limit(1);
    const apiKeyRow = await db.select().from(settings).where(eq(settings.key, "image_api_key")).limit(1);

    const apiUrl = apiUrlRow[0]?.value || "https://imgcdn.dev/api/1/upload";
    const apiKey = apiKeyRow[0]?.value || "5386e05a3562c7a8f984e73401540836";

    const uploadForm = new FormData();
    uploadForm.append("source", file);
    uploadForm.append("key", apiKey);

    const response = await fetch(apiUrl, {
      method: "POST",
      body: uploadForm,
    });

    const result = await response.json();

    if (result.image) {
      return NextResponse.json({
        url: result.image.url || result.image.display_url,
        thumb: result.image?.thumb?.url,
      });
    }

    return NextResponse.json(
      { error: "Yükleme başarısız", details: result },
      { status: 500 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Yükleme hatası" }, { status: 500 });
  }
}
