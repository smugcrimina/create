// İş Takip — Service Worker v3
// Web Push + WhatsApp tarzı zengin bildirimler

const SW_VERSION = "v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ===== WEB PUSH: WhatsApp tarzı zengin bildirim =====
self.addEventListener("push", (event) => {
  let data = {
    title: "İş Takip",
    body: "Yeni bildirim",
    url: "/",
    type: "info", // info, job, complete, reminder
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {}

  // Bildirim tipine göre emoji ekle
  const typeEmojis = {
    job: "📋",
    complete: "✅",
    reminder: "⏰",
    info: "🔔",
  };
  const emoji = typeEmojis[data.type] || "🔔";
  const title = data.title || "İş Takip";

  const options = {
    body: data.body || "",
    // Android'de bildirim ikonu: monokrom küçük ikon (status bar)
    // badge = status bar'da görünen küçük ikon
    icon: "/icon-192.png",
    badge: "/icon-192.png",

    // WhatsApp tarzı: BÜYÜK İKON (genişletince görünür - kişi avatarı gibi)
    image: data.image || "/icon-512.png",

    // Titreşim pattern'i (WhatsApp benzeri)
    vibrate: [100, 50, 100, 50, 200],

    // Her bildirim benzersiz tag ile ayrı gösterilir
    tag: data.tag || `ist-${data.type}-${Date.now()}`,
    renotify: true,

    // Kullanıcı etkileşime girene kadar bildirim kalır
    requireInteraction: true,

    // Bildirim içinde gösterilecek aksiyonlar (WhatsApp: Yanıtla, Okundu)
    actions: [
      { action: "open", title: `${emoji} Görüntüle`, icon: "/icon-192.png" },
      { action: "dismiss", title: "Kapat" },
    ],

    // Bildirime tıklandığında açılacak URL
    data: {
      url: data.url || "/",
      type: data.type,
      timestamp: Date.now(),
    },

    // Bildirim zamanı
    timestamp: data.timestamp || Date.now(),

    // Sessiz bildirim değil
    silent: false,
  };

  // image undefined ise sil (undefined bırakmak hata verebilir)
  if (!options.image) delete options.image;

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca uygulamayı öne getir / aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir pencere varsa odakla ve yönlendir
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            url: urlToOpen,
            notificationType: event.notification.data?.type,
          });
          return client.focus();
        }
      }
      // Pencere yoksa yeni aç
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push aboneliği değiştiğinde otomatik yenile
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSub) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub),
        });
      })
      .catch(() => {})
  );
});

// Periyodik arka plan kontrolü
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-new-jobs") {
    event.waitUntil(checkForNewJobs());
  }
});

async function checkForNewJobs() {
  try {
    const response = await fetch("/api/status");
    if (response.ok) {
      const data = await response.json();
      if (data.pendingCount && data.pendingCount > 0) {
        await self.registration.showNotification("İş Takip", {
          body: `📋 ${data.pendingCount} bekleyen iş var`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "periodic-check",
          requireInteraction: false,
          data: { url: "/", type: "info" },
        });
      }
    }
  } catch {}
}
