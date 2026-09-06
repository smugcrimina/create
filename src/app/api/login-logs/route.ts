import { NextResponse } from "next/server";
import { db } from "@/db";
import { loginLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const logs = await db
      .select({
        id: loginLogs.id,
        userId: loginLogs.userId,
        loginAt: loginLogs.loginAt,
        ipAddress: loginLogs.ipAddress,
        fullName: users.fullName,
        username: users.username,
      })
      .from(loginLogs)
      .leftJoin(users, eq(loginLogs.userId, users.id))
      .orderBy(desc(loginLogs.loginAt))
      .limit(100);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get login logs error:", error);
    return NextResponse.json(
      { error: "Giriş kayıtları alınamadı" },
      { status: 500 }
    );
  }
}
