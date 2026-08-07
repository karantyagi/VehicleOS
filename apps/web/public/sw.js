// VehicleOS remains network-first. The one exception is an explicit PWA share
// handoff: the received receipt stays in IndexedDB until its owner chooses a
// vehicle and asks to upload it. It is never background-synced.
const RECEIPT_DATABASE = "vehicleos-capture";
const RECEIPT_STORE = "receipt-drafts";
const SHARED_RECEIPT_KEY = "shared-receipt";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const openReceiptDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(RECEIPT_DATABASE, 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(RECEIPT_STORE)) {
        request.result.createObjectStore(RECEIPT_STORE, { keyPath: "key" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not prepare local receipt storage.")));
  });

const storeSharedReceipt = async (file) => {
  const database = await openReceiptDatabase();
  try {
    await new Promise((resolve, reject) => {
      const request = database
        .transaction(RECEIPT_STORE, "readwrite")
        .objectStore(RECEIPT_STORE)
        .put({ key: SHARED_RECEIPT_KEY, file, storedAt: Date.now() });
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => reject(request.error ?? new Error("Could not hold the shared receipt.")));
    });
  } finally {
    database.close();
  }
};

const sharedReceiptRedirect = (state) =>
  Response.redirect(new URL(`/capture/receipt?shared=${state}`, self.location.origin), 303);

const receiveSharedReceipt = async (request) => {
  try {
    const formData = await request.formData();
    const file = formData.get("receipt");
    if (!(file instanceof File)) return sharedReceiptRedirect("missing");
    if (file.size === 0 || file.size > MAX_RECEIPT_BYTES || !RECEIPT_TYPES.has(file.type)) {
      return sharedReceiptRedirect("unsupported");
    }
    await storeSharedReceipt(file);
    return sharedReceiptRedirect("ready");
  } catch {
    return sharedReceiptRedirect("error");
  }
};

// A fetch listener is required for Chromium PWA installability. It otherwise
// leaves all requests untouched so owner records and API responses are never cached.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isReceiptShare =
    event.request.method === "POST" &&
    url.pathname === "/capture/receipt" &&
    event.request.headers.get("content-type")?.includes("multipart/form-data");
  if (isReceiptShare) event.respondWith(receiveSharedReceipt(event.request));
});
