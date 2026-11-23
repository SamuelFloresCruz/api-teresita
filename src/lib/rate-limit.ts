import "server-only";

type Entry = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  apiTeresitaRateLimits?: Map<string, Entry>;
};

const store = globalStore.apiTeresitaRateLimits ?? new Map<string, Entry>();
globalStore.apiTeresitaRateLimits = store;

export function allowRequest(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
