import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deletedJobs, jobs, users } from "@/db/schema";
import { eq, desc, lte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  try {
    const all = await db.select().from(deletedJobs).orderBy(desc(deletedJobs.deletedAt));
    return NextResponse.json(all);
  } catch (error) {
    console.error("Get deleted jobs error:", error);
    return NextResponse.json({ error: "Silinmiş işler alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  try {
    const body = await req.json();

    // Restore
    if (body.action === "restore" && body.id) {
      const [del] = await db.select().from(deletedJobs).where(eq(deletedJobs.id, body.id)).limit(1);
      if (!del) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
      let assignedTo: number | null = null;
      if (del.assignedFullName) {
        const [u] = await db.select({ id: users.id }).from(users).where(eq(users.fullName, del.assignedFullName)).limit(1);
        if (u) assignedTo = u.id;
      }
      await db.insert(jobs).values({
        assignedTo, companyName: del.companyName, jobType: del.jobType,
        technique: del.technique,
        priority: (del.priority as "Düşük"|"Normal"|"Yüksek"|"Acil") || "Normal",
        paymentStatus: (del.paymentStatus as "Ödenmedi"|"Ödendi"|"Beklemede") || "Ödenmedi",
        notes: del.notes, imageUrl: del.imageUrl,
        status: (del.status as "Bekliyor"|"Devam Ediyor"|"Tamamlandı") || "Bekliyor",
        createdBy: currentUser.id,
      });
      await db.delete(deletedJobs).where(eq(deletedJobs.id, body.id));
      return NextResponse.json({ message: "İş geri yüklendi" });
    }

    // Delete by date — delete records with deletedAt <= given date
    if (body.action === "cleanup_before_date" && body.date) {
      const cutoff = new Date(body.date);
      cutoff.setHours(23, 59, 59, 999);
      const deleted = await db.delete(deletedJobs).where(lte(deletedJobs.deletedAt, cutoff)).returning();
      return NextResponse.json({ message: `${deleted.length} kayıt silindi` });
    }

    // Permanent delete single
    if (body.action === "permanent_delete" && body.id) {
      await db.delete(deletedJobs).where(eq(deletedJobs.id, body.id));
      return NextResponse.json({ message: "Kalıcı olarak silindi" });
    }

    // Cleanup all
    if (body.action === "cleanup_all") {
      const deleted = await db.delete(deletedJobs).returning();
      return NextResponse.json({ message: `${deleted.length} kayıt silindi` });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    console.error("Deleted jobs action error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
