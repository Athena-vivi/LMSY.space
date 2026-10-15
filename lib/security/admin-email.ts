/**
 * Admin identity resolution (no side effects, no imports).
 *
 * Kept dependency-free so it can be unit tested directly and so the same rule
 * is applied everywhere:
 *   server routes  -> getAdminEmail()
 *   client checks  -> GET /api/auth/session (never the email itself)
 *
 * ADMIN_EMAIL is the intended variable (server-only). NEXT_PUBLIC_ADMIN_EMAIL is
 * still accepted as a transitional fallback so that removing it from the client
 * bundle cannot lock the owner out before the server-side variable is set in the
 * deployment environment. Remove the fallback once ADMIN_EMAIL is configured
 * everywhere.
 */

export function getAdminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
  const normalized = raw.trim().toLowerCase();
  return normalized || null;
}

/** True when the given email is the configured administrator. Fails closed. */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  if (!email) return false;
  return email.trim().toLowerCase() === adminEmail;
}
