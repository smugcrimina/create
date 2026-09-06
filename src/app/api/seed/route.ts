import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, settings, jobs, jobCompletions, deletedJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, "admin")).limit(1);
    if (existing.length > 0) {
      await ensureSettings();
      return NextResponse.json({ message: "Veriler zaten mevcut", seeded: false });
    }

    const ah = await bcrypt.hash("admin123", 10);
    const eh = await bcrypt.hash("calisan123", 10);

    const [admin] = await db.insert(users).values({ username: "admin", password: ah, fullName: "Sistem Yöneticisi", role: "admin" }).returning();
    const [e1] = await db.insert(users).values({ username: "calisan1", password: eh, fullName: "Ahmet Yılmaz", role: "employee" as const }).returning();
    const [e2] = await db.insert(users).values({ username: "calisan2", password: eh, fullName: "Mehmet Demir", role: "employee" as const }).returning();
    const [e3] = await db.insert(users).values({ username: "calisan3", password: eh, fullName: "Ali Kaya", role: "employee" as const }).returning();

    await ensureSettings();

    const now = new Date();
    function addD(d: number) { const x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().split("T")[0]; }
    function subD(d: number) { const x = new Date(now); x.setDate(x.getDate() - d); return x; }

    // --- KUTU HARF İŞLERİ ---

    // 1. ACİL — 1 gün kaldı, kırmızı yanacak
    const [j1] = await db.insert(jobs).values({
      assignedTo: e1.id, companyName: "Özdemir Kuyumcu", deadlineDays: 1, deadlineDate: addD(1),
      jobType: "Kutu harf tabela 4 metre, krom kaplama, LED aydınlatma",
      technique: "Kutu Harf - Ahmet", priority: "Acil", paymentStatus: "Ödenmedi",
      notes: "Müşteri çok acele ediyor, yarın montaj", reminder: "Krom malzeme bekleniyor",
      imageUrl: "https://picsum.photos/id/1029/600/400",
      createdBy: admin.id,
    }).returning();

    // 2. NORMAL — 7 gün, kısmi tamamlama olacak
    const [j2] = await db.insert(jobs).values({
      assignedTo: e2.id, companyName: "Deniz Restaurant", deadlineDays: 7, deadlineDate: addD(7),
      jobType: "Kutu harf tabela 3 metre, paslanmaz çelik, RGB LED değişen renk",
      technique: "Kutu Harf - Mehmet, Montaj - Ahmet", priority: "Normal", paymentStatus: "Beklemede",
      imageUrl: "https://picsum.photos/id/1060/600/400",
      createdBy: admin.id,
    }).returning();

    // 3. YÜKSEK — 3 gün, kırmızı yanacak, komple tamamlanacak
    const [j3] = await db.insert(jobs).values({
      assignedTo: e3.id, companyName: "Gold Eczane", deadlineDays: 3, deadlineDate: addD(3),
      jobType: "Kutu harf eczane tabelası + haç logosu ışıklı, yeşil LED",
      technique: "Kutu Harf - Ali", priority: "Yüksek", paymentStatus: "Ödendi",
      notes: "Ödeme peşin alındı", reminder: "Haç logosu dosyası bekleniyor",
      imageUrl: "https://picsum.photos/id/1067/600/400",
      createdBy: admin.id,
    }).returning();

    // 4. DÜŞÜK — 20 gün
    await db.insert(jobs).values({
      assignedTo: e1.id, companyName: "Tekno Bilişim", deadlineDays: 20, deadlineDate: addD(20),
      jobType: "Kutu harf yönlendirme panosu 6 adet, alüminyum gövde, beyaz LED",
      technique: "Kutu Harf - Ahmet, Kesim - Ali", priority: "Düşük", paymentStatus: "Ödenmedi",
      createdBy: admin.id,
    });

    // 5. ACİL — bugün teslim! kırmızı yanıp sönecek
    await db.insert(jobs).values({
      assignedTo: null, companyName: "Yıldız Cafe", deadlineDays: 1, deadlineDate: addD(1),
      jobType: "Kutu harf cafe tabelası + cam folyo yazı, beyaz LED aydınlatma",
      technique: "Kutu Harf - Mehmet, Folyo - Ali", priority: "Acil", paymentStatus: "Ödenmedi",
      notes: "YARIN TESLİM! Çok acil", createdBy: admin.id,
    });

    // 6. NORMAL — 10 gün
    await db.insert(jobs).values({
      assignedTo: e2.id, companyName: "Mega Market", deadlineDays: 10, deadlineDate: addD(10),
      jobType: "Kutu harf market tabelası 5 metre, galvaniz gövde, mavi LED aydınlatma",
      technique: "Kutu Harf - Mehmet", priority: "Normal", paymentStatus: "Ödendi",
      createdBy: admin.id,
    });

    // 7. YÜKSEK — 5 gün
    await db.insert(jobs).values({
      assignedTo: e3.id, companyName: "Star Mobilya", deadlineDays: 5, deadlineDate: addD(5),
      jobType: "Kutu harf showroom tabelası + yönlendirme levhaları, kırmızı LED",
      technique: "Kutu Harf - Ali, Montaj - Ahmet", priority: "Yüksek", paymentStatus: "Beklemede",
      notes: "Renk örneği onaylanacak", createdBy: admin.id,
    });

    // --- TAMAMLAMA KAYITLARI ---
    // Deniz Restaurant kısmi tamamlama (turuncu buton)
    await db.insert(jobCompletions).values({
      jobId: j2.id, completedBy: e2.id,
      techniques: JSON.stringify(["Kutu Harf"]),
      completionNote: "Harf kesim tamamlandı, montaj bekleniyor",
    });
    await db.update(jobs).set({ status: "Devam Ediyor", updatedAt: new Date() }).where(eq(jobs.id, j2.id));

    // Gold Eczane komple tamamla (yeşil buton)
    await db.insert(jobCompletions).values({
      jobId: j3.id, completedBy: e3.id,
      techniques: JSON.stringify(["Komple"]),
      completionNote: "Tüm iş bitti, montaj dahil, müşteri memnun",
    });
    await db.update(jobs).set({ status: "Tamamlandı", updatedAt: new Date() }).where(eq(jobs.id, j3.id));

    // Özdemir kısmi
    await db.insert(jobCompletions).values({
      jobId: j1.id, completedBy: e1.id,
      techniques: JSON.stringify(["Kutu Harf"]),
      completionNote: "Harfler kesildi, krom kaplama yapılacak",
    });
    await db.update(jobs).set({ status: "Devam Ediyor", updatedAt: new Date() }).where(eq(jobs.id, j1.id));

    // --- GEÇMİŞ (silinmiş işler) ---
    await db.insert(deletedJobs).values({
      originalId: 999, companyName: "Bayrak Oto Galeri",
      jobType: "Kutu harf oto galeri tabelası 6 metre, krom kaplama, beyaz LED",
      technique: "Kutu Harf - Ahmet, Montaj - Mehmet", priority: "Acil", paymentStatus: "Ödendi",
      assignedFullName: "Ahmet Yılmaz", notes: "Montaj tamamlandı", reminder: "Fatura kesilecek",
      imageUrl: "https://picsum.photos/id/1060/400/300", status: "Tamamlandı",
      completionsData: JSON.stringify([
        { completedByName: "Ahmet Yılmaz", techniques: '["Kutu Harf"]', completionNote: "Harf kesim ve lehim bitti", imageUrl: "https://picsum.photos/id/1067/400/300", completedAt: subD(8).toISOString() },
        { completedByName: "Mehmet Demir", techniques: '["Komple"]', completionNote: "Montaj yapıldı, müşteri teslim aldı", imageUrl: "https://picsum.photos/id/1068/400/300", completedAt: subD(5).toISOString() },
      ]),
      jobCreatedAt: subD(15), deletedAt: subD(3), deletedBy: admin.id,
    });

    await db.insert(deletedJobs).values({
      originalId: 998, companyName: "Yanlışlıkla Silinen Kutu Harf",
      jobType: "Kutu harf berber tabelası, ahşap görünümlü, sıcak beyaz LED",
      technique: "Kutu Harf - Ali", priority: "Normal", paymentStatus: "Ödenmedi",
      assignedFullName: "Ali Kaya", notes: "Bu iş geri yüklenebilir", status: "Bekliyor",
      jobCreatedAt: subD(5), deletedAt: subD(1), deletedBy: admin.id,
    });

    return NextResponse.json({ message: "Seed tamamlandı", seeded: true });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed hatası", details: String(error) }, { status: 500 });
  }
}

async function ensureSettings() {
  const defaults: Record<string, string> = {
    techniques: "Komple",
    reminders: "Malzeme bekleniyor,Ölçü kontrolü gerekli,Müşteri onayı bekleniyor,Dosya eksik,Montaj planlanacak",
    image_api_url: "https://imgcdn.dev/api/1/upload",
    image_api_key: "5386e05a3562c7a8f984e73401540836",
  };
  for (const [key, value] of Object.entries(defaults)) {
    const exists = await db.select({ id: settings.id }).from(settings).where(eq(settings.key, key)).limit(1);
    if (exists.length === 0) await db.insert(settings).values({ key, value });
  }
}
