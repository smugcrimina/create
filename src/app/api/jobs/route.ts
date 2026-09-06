import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, users, jobCompletions } from "@/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { pushToUsers, pushToEmployees } from "@/lib/push";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const showCompleted = searchParams.get("completed") === "true";

  try {
    // Show ALL jobs (completed ones stay until admin deletes)
    // Employees see their own + unassigned jobs
    let conditions;
    if (currentUser.role === "employee") {
      conditions = sql`(${jobs.assignedTo} = ${currentUser.id} OR ${jobs.assignedTo} IS NULL)`;
    } else {
      conditions = undefined;
    }
    void showCompleted; // keep param for backwards compat

    const jobList = await db
      .select({
        id: jobs.id,
        assignedTo: jobs.assignedTo,
        companyName: jobs.companyName,
        deadlineDays: jobs.deadlineDays,
        deadlineDate: jobs.deadlineDate,
        paymentStatus: jobs.paymentStatus,
        jobType: jobs.jobType,
        technique: jobs.technique,
        priority: jobs.priority,
        imageUrl: jobs.imageUrl,
        notes: jobs.notes,
        reminder: jobs.reminder,
        reminderFiredAt: jobs.reminderFiredAt,
        status: jobs.status,
        createdBy: jobs.createdBy,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        assignedFullName: users.fullName,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.assignedTo, users.id))
      .where(conditions)
      .orderBy(
        showCompleted ? desc(jobs.updatedAt) : asc(sql`COALESCE(${jobs.deadlineDays}, 9999)`),
        desc(sql`CASE ${jobs.priority} WHEN 'Acil' THEN 0 WHEN 'Yüksek' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Düşük' THEN 3 END`),
        desc(jobs.createdAt)
      );

    const jobIds = jobList.map((j) => j.id);
    let completions: Array<{
      id: number;
      jobId: number;
      completedBy: number;
      techniques: string | null;
      completionNote: string | null;
      imageUrl: string | null;
      completedAt: Date;
      completedByName: string | null;
    }> = [];

    if (jobIds.length > 0) {
      const all = await db
        .select({
          id: jobCompletions.id,
          jobId: jobCompletions.jobId,
          completedBy: jobCompletions.completedBy,
          techniques: jobCompletions.techniques,
          completionNote: jobCompletions.completionNote,
          imageUrl: jobCompletions.imageUrl,
          completedAt: jobCompletions.completedAt,
          completedByName: users.fullName,
        })
        .from(jobCompletions)
        .leftJoin(users, eq(jobCompletions.completedBy, users.id));

      completions = all.filter((c) => jobIds.includes(c.jobId));
    }

    const result = jobList.map((job) => ({
      ...job,
      completions: completions.filter((c) => c.jobId === job.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get jobs error:", error);
    return NextResponse.json({ error: "İşler alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.companyName || !body.jobType) {
      return NextResponse.json({ error: "Firma adı ve iş türü zorunlu" }, { status: 400 });
    }

    // Calculate deadline date on server
    let deadlineDate: string | null = null;
    const days = body.deadlineDays ? parseInt(body.deadlineDays) : null;
    if (days !== null && !isNaN(days)) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      deadlineDate = d.toISOString().split("T")[0];
    }

    const [newJob] = await db
      .insert(jobs)
      .values({
        assignedTo: body.assignedTo || null,
        companyName: body.companyName,
        deadlineDays: days,
        deadlineDate,
        paymentStatus: body.paymentStatus || "Ödenmedi",
        jobType: body.jobType,
        technique: body.technique || null,
        priority: body.priority || "Normal",
        imageUrl: body.imageUrl || null,
        notes: body.notes || null,
        createdBy: currentUser.id,
      })
      .returning();

    // Push bildirimi gönder
    try {
      if (body.assignedTo) {
        // Belirli bir çalışana atandıysa sadece ona gönder
        await pushToUsers(
          [body.assignedTo],
          "📋 Yeni İş Atandı",
          `${body.companyName} — ${body.jobType}`
        );
      } else {
        // Kimseye atanmadıysa tüm çalışanlara gönder
        await pushToEmployees("📋 Yeni İş Eklendi", `${body.companyName} — ${body.jobType}`, currentUser.id);
      }
    } catch (e) {
      console.error("Push bildirim hatası:", e);
    }

    return NextResponse.json(newJob);
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "İş oluşturulamadı" }, { status: 500 });
  }
}
