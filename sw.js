/* Service worker: deja la app disponible sin cobertura.
   Estrategia: la red primero (para que los cambios lleguen enseguida) y la
   caché como red de seguridad. Las llamadas a la hoja de Google nunca se
   cachean. Sube CACHE al publicar cambios para forzar la limpieza. */
var CACHE = 'cuaderno-de-fugas-v1';
var SHELL = [
  './',
  'index.html',
  'styles.css',
  'store.js',
  'app.js',
  'config.js',
  'manifest.webmanifest',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // los envíos a la hoja, a la red
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // fuentes y Apps Script, a la red

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
