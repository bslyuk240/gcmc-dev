export const STORE_UPDATED_EVENT = "hms-store-updated";

export function notifyStoreUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_UPDATED_EVENT));
  }
}
