const CACHE_NAME = "second-brain-command-center-v132";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/task-core.css",
  "/app.js",
  "/supabase-client.js",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/list-todo.svg",
  "/icons/notebook-pen.svg",
  "/icons/search.svg",
  "/icons/x.svg",
  "/icons/ellipsis.svg",
  "/icons/calendar-days.svg",
  "/icons/circle-check-big.svg",
  "/icons/timer.svg",
  "/icons/diamond.svg",
  "/icons/history.svg",
  "/icons/inbox.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
