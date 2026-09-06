import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";

// Public endpoint — no auth needed, returns app branding only
export async function GET() {
  try {
    const all = await db.select().from(settings);
    const obj: Record<string, string> = {};
    for (const s of all) {
      if (["app_name", "app_desc", "app_logo"].includes(s.key)) obj[s.key] = s.value;
    }
    return NextResponse.json(obj);
  } catch {
    return NextResponse.json({});
  }
}
