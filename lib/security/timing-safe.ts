/**
 * Constant-time credential comparison helpers.
 *
 * Never compare secrets with === / includes(); those leak length and
 * prefix information through timing and are easy to misuse.
 */

import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison.
 * Returns false immediately for empty/undefined inputs (fail closed).
 */
export function timingSafeEqualString(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;

  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');

  // Pad to equal length so the comparison itself does not leak length.
  const maxLen = Math.max(bufA.length, bufB.length);
  const padA = Buffer.alloc(maxLen);
  const padB = Buffer.alloc(maxLen);
  bufA.copy(padA);
  bufB.copy(padB);

  const equal = timingSafeEqual(padA, padB);
  // Length must still match, otherwise equal-content-different-length passes.
  return equal && bufA.length === bufB.length;
}

/**
 * Check a provided secret against one or more expected secrets in constant time.
 * Any empty/undefined expected value is ignored (never treated as a valid credential).
 */
export function matchesAnySecret(provided: string | null | undefined, expected: Array<string | undefined | null>): boolean {
  if (!provided) return false;
  let matched = false;
  for (const candidate of expected) {
    if (!candidate) continue;
    const normalizedCandidate = candidate.trim();
    if (!normalizedCandidate) continue;
    if (timingSafeEqualString(provided.trim(), normalizedCandidate)) {
      matched = true;
      // keep looping so timing does not depend on which candidate matched
    }
  }
  return matched;
}

/**
 * Reject obviously weak machine keys. Used to make sure a misconfigured
 * short value cannot silently protect a production endpoint.
 */
export const MIN_MACHINE_KEY_LENGTH = 16;

export function isStrongEnoughKey(value: string): boolean {
  return value.trim().length >= MIN_MACHINE_KEY_LENGTH;
}
