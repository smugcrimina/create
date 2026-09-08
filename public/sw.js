// İş Takip — Service Worker v2 (Web Push + Offline bildirim)
// İçerik önbelleği YOK, bayat içerik olmaz

const CACHE_NAME = "ist-push-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Eski cache'leri temizle
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// ===== WEB PUSH: Uygulama kapalıyken sunucudan gelen bildirimler =====
self.addEventListener("push", (event) => {
  let data = { title: "İş Takip", body: "Yeni bildirim", url: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    // JSON parse hatası — varsayılanı kullan
  }

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || "istakip-" + Date.now(),
    renotify: true,
    requireInteraction: true, // Kullanıcı kapatana kadar bildirim kalır
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Aç" },
      { action: "dismiss", title: "Kapat" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "İş Takip", options));
});

// Bildirime tıklanınca uygulamayı öne getir / aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  if (action === "dismiss") return;

  const urlToOpen = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir pencere varsa odakla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICK", url: urlToOpen });
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

// Bildirim kapatıldığında (isteğe bağlı analitik)
self.addEventListener("notificationclose", (event) => {
  // İleride kullanım istatistikleri için
});

// Periyodik arka plan senkronizasyonu (destekleyen tarayıcılarda)
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
          body: `${data.pendingCount} bekleyen iş var`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "periodic-check",
          data: { url: "/" },
        });
      }
    }
  } catch {
    // Çevrimdışı veya hata — sessizce geç
  }
}

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
