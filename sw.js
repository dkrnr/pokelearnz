/* Only public shell and visited sprite GETs. Never cache questions, audio or API responses. */
const CACHE = 'pokelearn-shell-__BUILD__';
const SPRITES = 'pokelearn-sprites-v3';
const SHELL = [
  '/', '/index.html', '/style.css', '/app.js', '/activities.js', '/art.js', '/buddy.js', '/buddy-catalog.json',
  '/pokemonPersonalities.json', '/locales.js', '/safety.js', '/manifest.webmanifest', '/assets/mark.svg',
  '/assets/fonts/ReadexPro-Regular.ttf', '/assets/fonts/ReadexPro-Bold.ttf',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/icons/maskable-512.png', '/assets/icons/apple-touch-icon.png',
  ...__BUDDY_ASSETS__,
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', e => e.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pokelearn-shell-') && key !== CACHE).map(key => caches.delete(key)))),
  self.clients.claim(),
])));
self.addEventListener('message', e => { if (e.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
let spriteWrites = Promise.resolve();
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/gh/PokeAPI/sprites@master/sprites/pokemon/') && /\.(gif|png)$/.test(url.pathname)) {
    e.respondWith(caches.open(SPRITES).then(async cache => {
      const hit = await cache.match(e.request); if (hit) return hit;
      const response = await fetch(e.request);
      // cors images expose status, opaque image requests expose status 0.
      if (response.ok || response.type === 'opaque') {
        const copy = response.clone();
        spriteWrites = spriteWrites.catch(() => {}).then(async () => {
          await cache.put(e.request, copy);
          const keys = await cache.keys();
          await Promise.all(keys.slice(0, Math.max(0, keys.length - 180)).map(key => cache.delete(key)));
        });
        e.waitUntil(spriteWrites.catch(() => {}));
      }
      return response;
    })); return;
  }
  if (url.origin !== self.location.origin || !SHELL.includes(url.pathname)) return;
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).catch(() => caches.match('/index.html'))); return; }
  e.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(e.request)));
});
