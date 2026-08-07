const DATABASE_NAME = "vehicleos-capture";
const DATABASE_VERSION = 1;
const STORE_NAME = "receipt-drafts";
const SHARED_RECEIPT_KEY = "shared-receipt";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

type StoredReceipt = {
  key: string;
  file: File;
  storedAt: number;
};

export type SharedReceipt = {
  file: File;
  storedAt: number;
};

export const failedReceiptDraftKey = (vehicleId: string) => `failed-receipt:${vehicleId}`;

export const isAcceptedReceiptFile = (file: Pick<File, "size" | "type">) =>
  file.size > 0 && file.size <= MAX_RECEIPT_BYTES && ACCEPTED_RECEIPT_TYPES.has(file.type);

const hasIndexedDb = () => typeof window !== "undefined" && "indexedDB" in window;

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("Browser storage failed.")));
  });

const openReceiptDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("Browser storage failed.")));
  });

const readReceipt = async (key: string): Promise<StoredReceipt | null> => {
  if (!hasIndexedDb()) return null;
  const database = await openReceiptDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));
    return record && typeof record === "object" && "file" in record ? (record as StoredReceipt) : null;
  } finally {
    database.close();
  }
};

const writeReceipt = async (record: StoredReceipt) => {
  if (!hasIndexedDb()) return;
  const database = await openReceiptDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestResult(transaction.objectStore(STORE_NAME).put(record));
  } finally {
    database.close();
  }
};

const removeReceipt = async (key: string) => {
  if (!hasIndexedDb()) return;
  const database = await openReceiptDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestResult(transaction.objectStore(STORE_NAME).delete(key));
  } finally {
    database.close();
  }
};

/** A failed upload is retained only on this device and only under its vehicle key. */
export const saveFailedReceiptDraft = (vehicleId: string, file: File) =>
  writeReceipt({ key: failedReceiptDraftKey(vehicleId), file, storedAt: Date.now() });

export const loadFailedReceiptDraft = async (vehicleId: string) => {
  const record = await readReceipt(failedReceiptDraftKey(vehicleId));
  return record?.file instanceof File && isAcceptedReceiptFile(record.file) ? record.file : null;
};

export const clearFailedReceiptDraft = (vehicleId: string) => removeReceipt(failedReceiptDraftKey(vehicleId));

/** Read-only access for the share-target handoff. The file remains local until the owner acts. */
export const readSharedReceipt = async (): Promise<SharedReceipt | null> => {
  const record = await readReceipt(SHARED_RECEIPT_KEY);
  if (!record || !(record.file instanceof File) || !isAcceptedReceiptFile(record.file)) return null;
  return { file: record.file, storedAt: record.storedAt };
};

export const clearSharedReceipt = () => removeReceipt(SHARED_RECEIPT_KEY);
