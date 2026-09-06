// İş Takip — service worker (bildirimler için; içerik önbelleği YOK, bayat içerik olmaz)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push geldiyse (uygulama kapalıyken bile bildirim)
self.addEventListener("push", (event) => {
  let data = { title: "İş Takip", body: "Yeni bildirim" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || "İş Takip",
        body: parsed.body || "",
      };
    }
  } catch (e) {}
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "istakip-push",
      renotify: true,
      requireInteraction: false,
    })
  );
});

// Sistem bildirimi gösterildiğinde
self.addEventListener("notificationshow", (event) => {
  // Bildirim gösterildiğinde ekstra bir şey yapmaya gerek yok
});

// Bildirime tıklanınca uygulamayı öne getir / aç
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});

// Fetch event - cache yok, sadece network'ten
self.addEventListener("fetch", (event) => {
  // No caching - always go to network
});
