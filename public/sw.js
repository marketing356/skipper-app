// AyeAyeSkipper Service Worker — handles web push notifications
const CACHE_VERSION = 'v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push notifications from marina
self.addEventListener('push', function(event) {
  let data = { title: 'New Message', body: 'You have a new message from your marina.', icon: '/skipper-avatar.jpg', badge: '/skipper-avatar.jpg', tag: 'marina-message' };
  try {
    const payload = event.data ? event.data.json() : {};
    if (payload.title) data.title = payload.title;
    if (payload.body) data.body = payload.body;
    if (payload.tag) data.tag = payload.tag;
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      requireInteraction: false,
    })
  );
});

// When notification is clicked, open/focus the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
