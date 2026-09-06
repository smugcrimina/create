import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { isNotNull, isNull, sql } from "drizzle-orm";
import { pushToUsers, pushToEmployees } from "@/lib/push";
import { getCurrentUser } from "@/lib/auth";

/**
 * Hatırlatması olan ama henüz bildirimi gönderilmemiş işleri bulur
 * ve push bildirimi gönderir. Bu endpoint client-side polling ile çağrılır.
 */
export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    // reminder'ı olan ama reminderFiredAt'ı null olan işleri bul
    const pendingReminders = await db
      .select({
        id: jobs.id,
        companyName: jobs.companyName,
        reminder: jobs.reminder,
        assignedTo: jobs.assignedTo,
      })
      .from(jobs)
      .where(
        sql`${jobs.reminder} IS NOT NULL AND ${jobs.reminder} != '' AND ${jobs.reminderFiredAt} IS NULL`
      );

    if (pendingReminders.length === 0) {
      return NextResponse.json({ fired: 0 });
    }

    let firedCount = 0;

    for (const job of pendingReminders) {
      const title = `🔔 Hatırlatma: ${job.companyName}`;
      const body = job.reminder || "";

      // Assigned kullanıcı varsa ona, yoksa tüm çalışanlara gönder
      if (job.assignedTo) {
        await pushToUsers([job.assignedTo], title, body);
      } else {
        await pushToEmployees(title, body);
      }

      // Reminder'ı fired olarak işaretle
      await db
        .update(jobs)
        .set({ reminderFiredAt: new Date() })
        .where(sql`${jobs.id} = ${job.id}`);

      firedCount++;
    }

    return NextResponse.json({ fired: firedCount, jobs: pendingReminders.map(j => j.companyName) });
  } catch (error) {
    console.error("Reminder check error:", error);
    return NextResponse.json({ error: "Hatırlatma kontrol edilemedi" }, { status: 500 });
  }
}

/** Bekleyen hatırlatma sayısını getir (bildirim göndermez) */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        sql`${jobs.reminder} IS NOT NULL AND ${jobs.reminder} != '' AND ${jobs.reminderFiredAt} IS NULL`
      );

    return NextResponse.json({ pending: result[0]?.count || 0 });
  } catch (error) {
    console.error("Reminder count error:", error);
    return NextResponse.json({ error: "Hatırlatma sayısı alınamadı" }, { status: 500 });
  }
}
