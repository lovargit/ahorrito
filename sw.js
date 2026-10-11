// Guarda la app en caché para que funcione sin internet, y muestra los recordatorios.
const CACHE = 'ahorrito-v2';
const FILES = [
  './', 'index.html', 'styles.css', 'pets.js', 'app.js', 'manifest.json',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para recibir actualizaciones), caché si no hay conexión.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Notificación que manda el servidor de recordatorios.
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Ahorrito 🐾', {
    body: data.body || '¡Es hora de ahorrar!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'ahorrito',
    data: { url: './' }
  }));
});

// Al tocar la notificación, abrir (o enfocar) la app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(e.notification.data.url);
    })
  );
});
