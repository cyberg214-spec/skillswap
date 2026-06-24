const CACHE_NAME = "skillswap-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/discover",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") return;

  // Skip Firebase and API requests — always fetch fresh
  const url = event.request.url;
  if (
    url.includes("firestore.googleapis.com") ||
    url.includes("firebase") ||
    url.includes("googleapis.com")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a clone of the response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(event.request);
      })
  );
});