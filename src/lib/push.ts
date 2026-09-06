import { db } from "@/db";
import { pushSubscriptions, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// web-push dinamik yüklenir; kurulu değilse/yapılandırılmamışsa sessizce devre dışı kalır.
interface WebPushLike {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string
  ): Promise<unknown>;
}

let webpush: WebPushLike | null = null;
let configured: boolean | null = null;

async function getWebPush(): Promise<WebPushLike | null> {
  if (configured === false) return null;
  if (webpush) return webpush;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return null;
  }
  try {
    const mod = (await import("web-push")) as unknown as { default?: WebPushLike } & WebPushLike;
    const wp = (mod.default ?? mod) as WebPushLike;
    const email = process.env.VAPID_CONTACT_EMAIL || "admin@example.com";
    wp.setVapidDetails(email.startsWith("mailto:") ? email : `mailto:${email}`, pub, priv);
    webpush = wp;
    configured = true;
    return wp;
  } catch (e) {
    console.error("web-push yüklenemedi:", e);
    configured = false;
    return null;
  }
}

async function send(userIds: number[], title: string, body: string): Promise<void> {
  if (userIds.length === 0) return;
  const wp = await getWebPush();
  if (!wp) {
    console.warn("Push gönderilemedi: web-push yapılandırılmamış");
    return;
  }
  try {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));
    
    if (subs.length === 0) {
      console.log(`Push gönderilemedi: ${userIds.length} kullanıcı için abonelik yok`);
      return;
    }

    const payload = JSON.stringify({ title, body });
    
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await wp.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, s.endpoint))
              .catch(() => {});
          } else {
            console.error("Push gönderim hatası:", err);
          }
        }
      })
    );
  } catch (e) {
    console.error("Push gönderim hatası:", e);
  }
}

/** Belirli kullanıcı id'lerine push bildirimi gönder. */
export async function pushToUsers(userIds: number[], title: string, body: string): Promise<void> {
  await send(userIds, title, body);
}

/** Tüm çalışanlara push gönder (isteğe bağlı bir id hariç). */
export async function pushToEmployees(title: string, body: string, excludeId?: number): Promise<void> {
  try {
    const emps = await db.select({ id: users.id }).from(users).where(eq(users.role, "employee"));
    const ids = emps.map((e) => e.id).filter((id) => id !== excludeId);
    await send(ids, title, body);
  } catch (e) {
    console.error("pushToEmployees hatası:", e);
  }
}

/** Tüm kullanıcılara push gönder (admin dahil). */
export async function pushToAll(title: string, body: string): Promise<void> {
  try {
    const allUsers = await db.select({ id: users.id }).from(users);
    const ids = allUsers.map((u) => u.id);
    await send(ids, title, body);
  } catch (e) {
    console.error("pushToAll hatası:", e);
  }
}
