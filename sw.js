/* Service worker — "network-first": kad ima interneta uvek povuče NAJNOVIJU
 * verziju (pa osveži keš); kad nema interneta, igra radi iz keša (offline). */
const CACHE = 'koralu-v3';
const ASSETS = [
  '.', 'index.html', 'manifest.webmanifest', 'assets/icon.svg',
  'css/style.css',
  'js/config.js', 'js/utils.js', 'js/art.js', 'js/input.js', 'js/world.js',
  'js/entities.js', 'js/systems.js', 'js/ui.js', 'js/game.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network-first: probaj mrežu (najnovije), osveži keš; ako padne → keš → index.html
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
