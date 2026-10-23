/**
 * Cloudflare cache purge for the R2 CDN (cdn.lmsy.space).
 *
 * The Asset Vault used to dodge a stale edge copy by re-keying an R2 object
 * under a brand new name, because there was no way to purge the old URL (no
 * Cloudflare API token). With LMSY_CLOUDFLARE_API_TOKEN + LMSY_CLOUDFLARE_ZONE_ID set,
 * an overwritten object can be purged in place and its key stays stable.
 *
 * Fail-safe by design: a purge failure must never break the caller's write.
 * When the token/zone are not configured this module is a logged no-op, so the
 * app keeps working (falling back to the old re-key behaviour) without them.
 *
 * The LMSY_ prefix is deliberate: a bare CLOUDFLARE_API_TOKEN collides easily
 * with another project's global token (and env loaders won't let .env.local
 * override an already-set variable), so this project owns its namespaced pair.
 *
 * Server-only. Reads process.env directly; never import from a client module.
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
/** Cloudflare caps the `files` array at 30 URLs per purge request. */
const MAX_FILES_PER_REQUEST = 30;

export interface PurgeResult {
  /** False when LMSY_CLOUDFLARE_API_TOKEN / LMSY_CLOUDFLARE_ZONE_ID are not set. */
  configured: boolean;
  /** Distinct URLs the caller asked to purge. */
  requested: number;
  /** URLs Cloudflare accepted. */
  purged: number;
  /** Human-readable failure reasons (empty on success). */
  errors: string[];
}

function cdnBase(): string {
  return (process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space').replace(/\/$/, '');
}

/**
 * Map an R2 key / path (or an already-full CDN URL) to its canonical CDN URL.
 * `lmsy/mag/2025/x.webp` and `https://cdn.lmsy.space/lmsy/mag/2025/x.webp`
 * both resolve to the full URL.
 */
export function cdnUrlForKey(keyOrUrl: string): string {
  const trimmed = keyOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${cdnBase()}/${trimmed.replace(/^\/+/, '')}`;
}

export function isPurgeConfigured(): boolean {
  return Boolean(process.env.LMSY_CLOUDFLARE_API_TOKEN && process.env.LMSY_CLOUDFLARE_ZONE_ID);
}

interface PurgeFilesResponse {
  success?: boolean;
  errors?: Array<{ message?: string }>;
}

async function purgeFiles(urls: string[]): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LMSY_CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.LMSY_CLOUDFLARE_ZONE_ID;

  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: urls }),
  });

  const json = (await res.json().catch(() => null)) as PurgeFilesResponse | null;
  if (!res.ok || !json?.success) {
    const message = json?.errors?.[0]?.message || `HTTP ${res.status}`;
    return { ok: false, error: message };
  }
  return { ok: true };
}

/**
 * Purge the given CDN objects. Accepts R2 keys/paths or full URLs, de-dupes,
 * and batches in groups of 30 (Cloudflare's per-request cap). Never throws;
 * failures are collected into the returned `errors`.
 */
export async function purgeCdnUrls(keysOrUrls: string[]): Promise<PurgeResult> {
  const urls = Array.from(new Set(keysOrUrls.map(cdnUrlForKey))).filter(Boolean);

  if (urls.length === 0) {
    return { configured: isPurgeConfigured(), requested: 0, purged: 0, errors: [] };
  }

  if (!isPurgeConfigured()) {
    console.warn(
      `[CDN_PURGE] LMSY_CLOUDFLARE_API_TOKEN / LMSY_CLOUDFLARE_ZONE_ID not set; skipping purge of ${urls.length} url(s)`
    );
    return { configured: false, requested: urls.length, purged: 0, errors: [] };
  }

  const errors: string[] = [];
  let purged = 0;

  for (let i = 0; i < urls.length; i += MAX_FILES_PER_REQUEST) {
    const batch = urls.slice(i, i + MAX_FILES_PER_REQUEST);
    try {
      const result = await purgeFiles(batch);
      if (result.ok) {
        purged += batch.length;
      } else {
        errors.push(result.error ?? 'unknown error');
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (errors.length > 0) {
    console.error('[CDN_PURGE] some purges failed:', errors);
  }

  return { configured: true, requested: urls.length, purged, errors };
}
