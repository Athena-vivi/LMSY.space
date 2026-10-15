/**
 * Machine-to-machine authorization for internal endpoints
 * (cron jobs, ingest pipeline, webhooks).
 *
 * Requirements enforced here:
 * - Fails CLOSED when the expected secret is missing or misconfigured.
 * - Constant-time comparison (never === / includes()).
 * - Accepts the secret from a header (preferred) or a query parameter
 *   (legacy support only, logged as deprecated).
 * - Never logs the secret value.
 *
 * This module deliberately depends only on the WHATWG Request/Response types
 * instead of 'next/server'. Route handlers accept a plain Response, and staying
 * framework-free means the guard can be unit tested without booting Next.js.
 */

import { matchesAnySecret, isStrongEnoughKey, MIN_MACHINE_KEY_LENGTH } from './timing-safe.ts';

/** Structural subset of NextRequest used by this module. */
export interface MachineAuthRequest {
  headers: { get(name: string): string | null };
  url?: string;
  nextUrl?: { searchParams: { get(name: string): string | null } };
}

export interface MachineAuthOptions {
  /** Environment variable names holding acceptable secrets (first is preferred). */
  envVars: string[];
  /** Header carrying the bearer token. Default: authorization. */
  bearerHeader?: string;
  /** Additional header carrying the raw secret (e.g. x-ingest-key). */
  secretHeader?: string | null;
  /** Legacy query parameter name. Deprecated, still supported when set. */
  queryParam?: string | null;
  /** Human readable name used in logs/errors (never includes the value). */
  label: string;
}

export interface MachineAuthSuccess {
  ok: true;
  via: 'bearer' | 'header' | 'query';
}

export interface MachineAuthFailure {
  ok: false;
  response: Response;
}

export type MachineAuthResult = MachineAuthSuccess | MachineAuthFailure;

function readQueryParam(request: MachineAuthRequest, name: string): string | null {
  const fromNextUrl = request.nextUrl?.searchParams?.get(name);
  if (fromNextUrl !== undefined && fromNextUrl !== null) return fromNextUrl;
  if (request.url) {
    try {
      return new URL(request.url).searchParams.get(name);
    } catch {
      return null;
    }
  }
  return null;
}

export function requireMachineKey(request: MachineAuthRequest, options: MachineAuthOptions): MachineAuthResult {
  const { envVars, bearerHeader = 'authorization', secretHeader = null, queryParam = null, label } = options;

  const configured = envVars
    .map(name => ({ name, value: (process.env[name] || '').trim() }))
    .filter(entry => entry.value.length > 0);

  if (configured.length === 0) {
    console.error(`[SECURITY] ${label}: no secret configured (${envVars.join(' / ')}). Refusing the request.`);
    return {
      ok: false,
      response: Response.json(
        { success: false, error: `${label} is not configured on the server` },
        { status: 503 }
      ),
    };
  }

  for (const entry of configured) {
    if (!isStrongEnoughKey(entry.value)) {
      console.error(
        `[SECURITY] ${label}: ${entry.name} is shorter than ${MIN_MACHINE_KEY_LENGTH} characters. ` +
        'Rotate it to a strong random value.'
      );
    }
  }

  const expected = configured.map(entry => entry.value);

  // 1. Bearer token
  const authHeader = request.headers.get(bearerHeader);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const provided = authHeader.slice('Bearer '.length).trim();
    if (matchesAnySecret(provided, expected)) {
      return { ok: true, via: 'bearer' };
    }
  }

  // 2. Explicit secret header
  if (secretHeader) {
    const providedHeader = request.headers.get(secretHeader);
    // Some callers send "Bearer <key>" in custom headers as well.
    const provided = providedHeader?.startsWith('Bearer ')
      ? providedHeader.slice('Bearer '.length).trim()
      : providedHeader?.trim();
    if (matchesAnySecret(provided, expected)) {
      return { ok: true, via: 'header' };
    }
  }

  // 3. Legacy query parameter (deprecated: secrets in URLs end up in logs)
  if (queryParam) {
    const providedQuery = readQueryParam(request, queryParam);
    if (providedQuery && matchesAnySecret(providedQuery, expected)) {
      console.warn(
        `[SECURITY] ${label}: accepted a secret passed as the "${queryParam}" query parameter. ` +
        'This is deprecated and leaks through access logs; switch the caller to the Authorization header.'
      );
      return { ok: true, via: 'query' };
    }
  }

  return {
    ok: false,
    response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  };
}
