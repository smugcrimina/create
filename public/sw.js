// İş Takip — service worker (bildirimler için; içerik önbelleği YOK, bayat içerik olmaz)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// İleride sunucudan Web Push gelirse (uygulama kapalıyken bildirim) burada işlenir
self.addEventListener("push", (event) => {
  let data = { title: "İş Takip", body: "Yeni bildirim" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "İş Takip", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [120, 60, 120],
      tag: "istakip",
      renotify: true,
    })
  );
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
