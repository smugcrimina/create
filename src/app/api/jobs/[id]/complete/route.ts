import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, jobCompletions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { pushToUsers } from "@/lib/push";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const jobId = parseInt(id);

  try {
    const body = await req.json();
    const [completion] = await db.insert(jobCompletions).values({
      jobId, completedBy: currentUser.id,
      techniques: body.techniques || null,
      completionNote: body.completionNote || null,
      imageUrl: body.imageUrl || null,
    }).returning();

    const techList: string[] = body.techniques ? JSON.parse(body.techniques) : [];
    const isKomple = techList.includes("Komple");

    // Komple = "Tamamlandı" status but job stays in list until admin deletes
    // Non-komple = "Devam Ediyor"
    const [updated] = await db.update(jobs).set({
      status: isKomple ? "Tamamlandı" : "Devam Ediyor",
      updatedAt: new Date(),
    }).where(eq(jobs.id, jobId)).returning();

    // Admin'lere bildirim gönder
    try {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      const adminIds = admins.map((a) => a.id).filter((aid) => aid !== currentUser.id);
      if (adminIds.length > 0) {
        const statusText = isKomple ? "tamamlandı ✅" : "devam ediyor 🔄";
        await pushToUsers(
          adminIds,
          isKomple ? "✅ İş Tamamlandı" : "🔄 İş Güncellendi",
          `${updated.companyName} — ${statusText}`,
          { type: "complete" }
        );
      }
    } catch {}

    return NextResponse.json(completion);
  } catch (error) {
    console.error("Complete job error:", error);
    return NextResponse.json({ error: "İş tamamlanamadı" }, { status: 500 });
  }
}
