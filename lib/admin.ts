/**
 * Server-only admin access control utilities.
 *
 * Server-only. Importing this from a 'use client' component would break the
 * build / leak state.
 *
 * The admin email is read from the server-only ADMIN_EMAIL variable.
 * NEXT_PUBLIC_ADMIN_EMAIL is still accepted as a transitional fallback so the
 * owner is not locked out before the server-side variable is configured in the
 * deployment environment.
 */

/**
 * Resolve the configured admin email, preferring the server-only variable.
 * Returns a normalized (trimmed, lowercased) value, or null when unset.
 */
function getAdminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
  const normalized = raw.trim().toLowerCase();
  return normalized || null;
}

/**
 * Check if a user email is the admin.
 * @param email - User email to check
 * @returns true if email matches the configured admin email. Fails closed.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL is not configured; admin check fails closed');
    return false;
  }

  // Case-insensitive comparison
  return email.trim().toLowerCase() === adminEmail;
}

/**
 * Check if the current environment has an admin email configured.
 * @returns true if ADMIN_EMAIL (or the NEXT_PUBLIC_ADMIN_EMAIL fallback) is set
 */
export function hasAdminConfigured(): boolean {
  return getAdminEmail() !== null;
}
