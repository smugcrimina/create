import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const all = await db.select().from(settings);
    const obj: Record<string, string> = {};
    for (const s of all) {
      obj[s.key] = s.value;
    }
    return NextResponse.json(obj);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Ayarlar alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "Anahtar gerekli" }, { status: 400 });
    }

    // Upsert
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: String(value) });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json({ error: "Ayar kaydedilemedi" }, { status: 500 });
  }
}
