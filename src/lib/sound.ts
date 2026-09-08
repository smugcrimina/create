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
export async function requestNotifyPermission(): Promise<void> {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") await Notification.requestPermission();
  } catch {}
}

/** Sistem bildirimi göster (mobilde service worker üzerinden). Ses ÇALMAZ (ayrı çalınır). */
export function showSystemNotification(title: string, body: string): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const opts: NotificationOptions = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "istakip",
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

/** Web Push aboneliği kur (izin verildiyse ve VAPID anahtarı varsa). Kapalıyken bildirim için. */
export async function subscribePush(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid) as unknown as BufferSource,
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
  } catch {}
}
