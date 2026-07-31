// Installability worker only. VehicleOS intentionally remains network-first.
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch listener is required for Chromium PWA installability. It intentionally
// leaves requests untouched so owner records are never cached without consent.
self.addEventListener("fetch", () => {});
