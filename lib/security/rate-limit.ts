/**
 * In-memory sliding-window rate limiter for authentication attempts.
 *
 * Scope and limitations (documented on purpose):
 * - State lives in the Node process, so it is per-instance. On a
 *   multi-instance serverless deployment the effective limit is
 *   (limit x instances). It still stops sustained brute force from a single
 *   source, which is the realistic attack for a one-admin site.
 * - Upgrade path: swap `store` for a Redis/Upstash client or a Postgres table
 *   without changing call sites.
 *
 * The limiter is intentionally dependency-free and side-effect free.
 */

interface Bucket {
  hits: number[];
  blockedUntil: number;
}

const store = new Map<string, Bucket>();

// Keep memory bounded: drop buckets that have been idle for a while.
const IDLE_TTL_MS = 30 * 60 * 1000;

function prune(now: number) {
  if (store.size < 500) return;
  for (const [key, bucket] of store) {
    const last = bucket.hits.length ? bucket.hits[bucket.hits.length - 1] : 0;
    if (now - last > IDLE_TTL_MS && now > bucket.blockedUntil) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Max attempts inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Lockout applied once the limit is exceeded. */
  blockMs?: number;
}

/**
 * Record an attempt and report whether it is allowed.
 * Call this BEFORE doing expensive work (e.g. verifying a password).
 */
export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const blockMs = options.blockMs ?? options.windowMs;
  prune(now);

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { hits: [], blockedUntil: 0 };
    store.set(key, bucket);
  }

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  bucket.hits = bucket.hits.filter(ts => now - ts < options.windowMs);
  bucket.hits.push(now);

  if (bucket.hits.length > options.limit) {
    bucket.blockedUntil = now + blockMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - bucket.hits.length),
    retryAfterSeconds: 0,
  };
}

/** Clear the counters for a key (call after a successful login). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Test helper: inspect current state without consuming an attempt. */
export function peekRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket) return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  if (bucket.blockedUntil > now) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }
  return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
}

/** Test helper: wipe all state. */
export function clearAllRateLimits(): void {
  store.clear();
}
