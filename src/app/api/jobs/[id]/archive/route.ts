import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, users, deletedJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// Archive a completed job (move to deleted_jobs)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const jobId = parseInt(id);

  try {
    const [job] = await db.select({
      id: jobs.id, companyName: jobs.companyName, jobType: jobs.jobType, technique: jobs.technique,
      priority: jobs.priority, paymentStatus: jobs.paymentStatus, notes: jobs.notes,
      imageUrl: jobs.imageUrl, status: jobs.status, createdAt: jobs.createdAt,
      assignedFullName: users.fullName,
    }).from(jobs).leftJoin(users, eq(jobs.assignedTo, users.id)).where(eq(jobs.id, jobId)).limit(1);

    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });

    await db.insert(deletedJobs).values({
      originalId: job.id, companyName: job.companyName, jobType: job.jobType,
      technique: job.technique, priority: job.priority, paymentStatus: job.paymentStatus,
      assignedFullName: job.assignedFullName, notes: job.notes, imageUrl: job.imageUrl,
      status: job.status, jobCreatedAt: job.createdAt, deletedBy: currentUser.id,
    });

    await db.delete(jobs).where(eq(jobs.id, jobId));
    return NextResponse.json({ message: "İş arşivlendi" });
  } catch (error) {
    console.error("Archive error:", error);
    return NextResponse.json({ error: "Arşivleme hatası" }, { status: 500 });
  }
}
