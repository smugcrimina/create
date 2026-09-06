import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, users, deletedJobs, jobCompletions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { pushToUsers, pushToEmployees } from "@/lib/push";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const upd: Record<string, unknown> = {};
    if (body.assignedTo !== undefined) upd.assignedTo = body.assignedTo;
    if (body.companyName !== undefined) upd.companyName = body.companyName;
    if (body.deadlineDays !== undefined) upd.deadlineDays = body.deadlineDays;
    if (body.deadlineDate !== undefined) upd.deadlineDate = body.deadlineDate;
    if (body.paymentStatus !== undefined) upd.paymentStatus = body.paymentStatus;
    if (body.jobType !== undefined) upd.jobType = body.jobType;
    if (body.technique !== undefined) upd.technique = body.technique;
    if (body.priority !== undefined) upd.priority = body.priority;
    if (body.imageUrl !== undefined) upd.imageUrl = body.imageUrl;
    if (body.notes !== undefined) upd.notes = body.notes;
    if (body.reminder !== undefined) {
      upd.reminder = body.reminder;
      // Yeni hatırlatma eklenirse veya değiştirilirse, firedAt'ı sıfırla
      upd.reminderFiredAt = null;
    }
    if (body.status !== undefined) upd.status = body.status;
    upd.updatedAt = new Date();
    const [updated] = await db.update(jobs).set(upd).where(eq(jobs.id, parseInt(id))).returning();

    // Hatırlatma eklendiğinde push bildirimi gönder
    if (body.reminder !== undefined) {
      if (body.reminder) {
        const title = "🔔 Hatırlatma Eklendi";
        const text = `${updated.companyName} — ${body.reminder}`;
        try {
          if (updated.assignedTo) {
            await pushToUsers([updated.assignedTo], title, text);
          } else {
            await pushToEmployees(title, text);
          }
        } catch (e) {
          console.error("Reminder push hatası:", e);
        }
      }
    }

    // Atanan kişi değiştiğinde bildirim gönder
    if (body.assignedTo !== undefined && body.assignedTo !== null) {
      try {
        await pushToUsers(
          [body.assignedTo],
          "📋 İş Atandı",
          `${updated.companyName} — ${updated.jobType}`
        );
      } catch (e) {
        console.error("Assignment push hatası:", e);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json({ error: "İş güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const { id } = await params;
  const jobId = parseInt(id);
  try {
    // Get job + assigned user
    const [job] = await db.select({
      id: jobs.id, companyName: jobs.companyName, jobType: jobs.jobType, technique: jobs.technique,
      priority: jobs.priority, paymentStatus: jobs.paymentStatus, notes: jobs.notes, reminder: jobs.reminder,
      imageUrl: jobs.imageUrl, status: jobs.status, createdAt: jobs.createdAt,
      assignedFullName: users.fullName,
    }).from(jobs).leftJoin(users, eq(jobs.assignedTo, users.id)).where(eq(jobs.id, jobId)).limit(1);

    if (job) {
      // Get completions before cascade delete
      const completions = await db.select({
        id: jobCompletions.id, techniques: jobCompletions.techniques,
        completionNote: jobCompletions.completionNote, imageUrl: jobCompletions.imageUrl,
        completedAt: jobCompletions.completedAt, completedByName: users.fullName,
      }).from(jobCompletions)
        .leftJoin(users, eq(jobCompletions.completedBy, users.id))
        .where(eq(jobCompletions.jobId, jobId));

      await db.insert(deletedJobs).values({
        originalId: job.id, companyName: job.companyName, jobType: job.jobType,
        technique: job.technique, priority: job.priority, paymentStatus: job.paymentStatus,
        assignedFullName: job.assignedFullName, notes: job.notes, reminder: job.reminder,
        imageUrl: job.imageUrl, status: job.status, jobCreatedAt: job.createdAt,
        completionsData: completions.length > 0 ? JSON.stringify(completions) : null,
        deletedBy: currentUser.id,
      });
    }
    await db.delete(jobs).where(eq(jobs.id, jobId));
    return NextResponse.json({ message: "İş silindi ve geçmişe kaydedildi" });
  } catch (error) {
    console.error("Delete job error:", error);
    return NextResponse.json({ error: "İş silinemedi" }, { status: 500 });
  }
}
