/**
 * Bounded LRU cache of header search suggestions: normalized query → hits.
 *
 * Only successful answers are stored — a failed request must be retried the next time the
 * visitor types that query (review note of wave 6). The bound keeps a long typing session from
 * growing the map without limit; `Map` iteration order is the recency order (oldest first).
 */
export class SuggestCache<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError("SuggestCache: limit must be a positive integer");
    }
  }

  get size(): number {
    return this.entries.size;
  }

  /** Reads without changing the recency (safe during render). */
  peek(key: string): T | undefined {
    return this.entries.get(key);
  }

  /** Marks the entry as most recently used; `true` when it exists. */
  touch(key: string): boolean {
    const value = this.entries.get(key);
    if (value === undefined) return false;
    this.entries.delete(key);
    this.entries.set(key, value);
    return true;
  }

  /** Stores the entry as the most recent one and evicts the least recently used overflow. */
  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}
