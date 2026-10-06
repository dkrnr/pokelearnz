/* Public app resources only. No questions, recordings, API responses or background uploads. */
const CACHE = "pokelearn-shell-__BUILD__";
const SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/locales.js",
  "/safety.js",
  "/manifest.webmanifest",
  "/pokemonPersonalities.json",
  "/assets/mark.svg",
  "/assets/pokemon-index.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/maskable-512.png",
  "/assets/icons/apple-touch-icon.png",
  ...["25", "1", "4", "7", "133", "143", "25-shiny"].map(
    (id) => `/assets/buddies/${id}.png`,
  ),
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => key.startsWith("pokelearn-shell-") && key !== CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !SHELL.includes(url.pathname)
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html")),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(url.pathname);
      return hit || fetch(event.request);
    }),
  );
});
