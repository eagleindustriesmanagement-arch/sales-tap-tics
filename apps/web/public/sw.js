// Sales Taptics service worker: practice reminders only (decision 0022). Nothing is cached here.
self.addEventListener("push", (event) => {
  let data = { title: "Sales Taptics", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png", badge: "/mark-128.png", data: { url: data.url }, tag: "practice-reminder" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then((w) => (w || c).focus());
      return self.clients.openWindow(url);
    }),
  );
});
