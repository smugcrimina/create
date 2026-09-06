import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, jobs, jobCompletions, loginLogs, deletedJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  try {
    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı güncellenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  if (currentUser.id === userId) {
    return NextResponse.json(
      { error: "Kendi hesabınızı silemezsiniz" },
      { status: 400 }
    );
  }

  try {
    // Kullanıcıya bağlı kayıtları temizle, sonra kullanıcıyı sil.
    // (Bu tablolar users.id'ye foreign key ile bağlı; temizlenmezse silme başarısız olur.)
    await db.transaction(async (tx) => {
      await tx.delete(loginLogs).where(eq(loginLogs.userId, userId));
      await tx.delete(jobCompletions).where(eq(jobCompletions.completedBy, userId));
      await tx.update(jobs).set({ assignedTo: null }).where(eq(jobs.assignedTo, userId));
      await tx.update(jobs).set({ createdBy: null }).where(eq(jobs.createdBy, userId));
      await tx.update(deletedJobs).set({ deletedBy: null }).where(eq(deletedJobs.deletedBy, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    return NextResponse.json({ message: "Kullanıcı silindi" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Kullanıcı silinemedi" },
      { status: 500 }
    );
  }
}
