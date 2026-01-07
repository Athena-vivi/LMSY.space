/**
 * Admin access control utilities
 */

/**
 * Check if a user email is the admin
 * @param email - User email to check
 * @returns true if email matches admin email from env
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('NEXT_PUBLIC_ADMIN_EMAIL not set in environment');
    return false;
  }

  // Case-insensitive comparison
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Check if current environment has admin email configured
 * @returns true if NEXT_PUBLIC_ADMIN_EMAIL is set
 */
export function hasAdminConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}
