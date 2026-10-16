/**
 * Search term sanitization (remediation B2-T3, audit P1-5).
 *
 * The search route builds PostgREST `.or()` filter strings. Raw caller input
 * inside that grammar allows a term containing `,` or `(` to inject or break
 * filter conditions. This sanitizer strips every character that carries
 * meaning in the filter grammar (separators, grouping, wildcards) and clamps
 * the length, so only plain word characters survive.
 */

export const MAX_SEARCH_TERM_LENGTH = 50;
export const MIN_SEARCH_TERM_LENGTH = 2;

export function sanitizeSearchTerm(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[,()[\]\\%*_]/g, '')
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}
