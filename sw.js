// Service worker: la app se abre sin internet; los simulacros se guardan al visitarlos.
const V = 'si-v7';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/util.js', 'js/store.js', 'js/sync.js', 'js/data.js',
  'js/exam.js', 'js/results.js', 'js/progress.js', 'js/tools.js', 'js/charts.js', 'js/dibujo.js',
  'js/tema.js', 'js/motivacion.js', 'js/tarjetas.js', 'js/audio.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;              // Firestore va siempre a la red

  // simulacros: primero la red (para traer los nuevos), con respaldo en caché
  if (url.pathname.includes('/simulacros/')) {
    e.respondWith(
      fetch(request).then((r) => { caches.open(V).then((c) => c.put(request, r.clone())); return r; })
        .catch(() => caches.match(request, { ignoreSearch: true }))
    );
    return;
  }

  // el resto: caché primero
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(request).then((r) => {
        if (r.ok) caches.open(V).then((c) => c.put(request, r.clone()));
        return r;
      }).catch(() => caches.match('index.html'))
    )
  );
});
