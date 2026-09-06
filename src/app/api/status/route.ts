import { NextResponse } from "next/server";
import { isSupabaseMode } from "@/db";

export async function GET() {
  return NextResponse.json({
    mode: isSupabaseMode() ? "online" : "offline",
    supabase: isSupabaseMode(),
  });
}
