export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<TKey, TValue> {
  private readonly store = new Map<TKey, CacheEntry<TValue>>();

  constructor(private readonly ttlMs: number) {}

  get(key: TKey): TValue | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: TKey, value: TValue): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(key?: TKey): void {
    if (typeof key === "undefined") {
      this.store.clear();
      return;
    }
    this.store.delete(key);
  }
}
