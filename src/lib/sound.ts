/** Bildirim sesi + sistem bildirimi yardımcıları. */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Mobil/iOS'ta sesi açmak için bir kullanıcı hareketinde (dokunma/tık) bir kez çağrılmalı. */
export function unlockAudio(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

export function playNotificationSound(): void {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("ist_sound_mute") === "true") return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      g.gain.value = 0.4;
      osc.start(ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.3);
    beep(1100, 0.35, 0.3);
  } catch {}
}

/** Bildirim iznini iste (kullanıcı hareketinde çağır). */
export async function requestNotifyPermission(): Promise<boolean> {
  try {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/** Sistem bildirimi göster (mobilde service worker üzerinden). Ses ÇALMAZ (ayrı çalınır). */
export function showSystemNotification(title: string, body: string): void {
  try {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const opts: NotificationOptions = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "istakip-" + Date.now(),
      requireInteraction: false,
    };
    if ("serviceWorker" in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, opts))
        .catch(() => {
          try {
            new Notification(title, opts);
          } catch {}
        });
    } else {
      new Notification(title, opts);
    }
  } catch {}
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Web Push aboneliği kur (izin verildiyse ve VAPID anahtarı varsa). */
export async function subscribePush(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) {
      console.warn("VAPID public key bulunamadı, push aboneliği yapılamadı");
      return;
    }

    // Service worker'ın hazır olmasını bekle
    const reg = await navigator.serviceWorker.ready;
    
    // Mevcut aboneliği kontrol et
    let sub = await reg.pushManager.getSubscription();
    
    if (sub) {
      // Mevcut aboneliği sunucuya kaydet
      await sendSubscriptionToServer(sub);
      return;
    }
    
    // Yeni abonelik oluştur
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(vapid) as unknown as BufferSource,
    });
    
    await sendSubscriptionToServer(sub);
  } catch (e) {
    console.error("Push abonelik hatası:", e);
  }
}

async function sendSubscriptionToServer(sub: PushSubscription): Promise<void> {
  try {
    const subData = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subData),
    });
  } catch (e) {
    console.error("Abonelik kaydedilemedi:", e);
  }
}

/** Push aboneliğini yeniden dene (hata durumlarında kullan) */
export async function retryPushSubscription(): Promise<void> {
  // Önce mevcut aboneliği iptal et, sonra yeniden oluştur
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }
    await subscribePush();
  } catch {}
}
