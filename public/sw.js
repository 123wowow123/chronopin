// Chronopin's service worker: browser notifications about the pins a signed-in
// user watches (src/server/services/watchAlerts.ts). A push carries the alert
// as JSON - { title, body, url, image, tag } - and arrives whether or not the
// site is open; an open page hands its live-feed alerts here too, so both
// show the same way. It caches nothing and serves nothing.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function show(alert) {
  return self.registration.showNotification(alert.title, {
    body: alert.body,
    icon: '/favicon.ico',
    image: alert.image || undefined,
    // The same alert from a push and from an open page replaces itself.
    tag: alert.tag,
    data: { url: alert.url },
  });
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let alert;
  try {
    alert = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(show(alert));
});

// Opens the pin: in a tab of the site that is already open when there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus().then((w) => (w || open).navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
