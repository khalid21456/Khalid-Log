/**
 * A small in-memory sliding-window limiter, used to slow down login guessing.
 *
 * Deliberately process-local: this blog runs as a single Node server, and a
 * shared store would be a dependency for no benefit here. If it is ever deployed
 * across multiple instances, each gets its own window.
 */
const hits = new Map<string, number[]>();

/** Stop the map growing without bound on a long-running server. */
const MAX_TRACKED_KEYS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (hits.size > MAX_TRACKED_KEYS) hits.clear();

  const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);

  if (recent.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);

  return { ok: true, remaining: limit - recent.length, retryAfterSeconds: 0 };
}

/** Called after a successful login so a legitimate user is not held back. */
export function resetRateLimit(key: string): void {
  hits.delete(key);
}

/** Best-effort client identity for rate-limiting purposes. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}
