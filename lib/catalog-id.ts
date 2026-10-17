/**
 * Catalog ID generation utilities - Astra 馆长档案标准
 *
 * Format: LMSY-[CATEGORY]-[YYYYMMDD]-[XXX]
 *
 * Examples:
 *   - Magazine Cover: LMSY-MAG-20241023-000
 *   - Magazine Page 1: LMSY-MAG-20241023-001
 *   - Magazine Page 2: LMSY-MAG-20241023-002
 *   - Gallery Image: LMSY-G-20241023-001
 *
 * Rules:
 *   - Cover image is always sequence 000
 *   - Additional images start from 001
 *   - Date is extracted from event_date (YYYY-MM-DD format)
 *   - Sequence resets daily (starts from 001 for each new date)
 *   - Timezone-safe: uses local date interpretation
 */

export type CatalogCategory = 'MAG' | 'G' | 'P'; // Magazine, Gallery, Project

/**
 * Minimal structural type for the Supabase client used by these helpers.
 * Kept intentionally loose (any table/select chain) so the existing call sites
 * do not need to be re-typed, while still avoiding the bare `any` keyword.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogIdClient = any;

export interface CatalogIdOptions {
  category: CatalogCategory;
  eventDate: string; // YYYY-MM-DD format (local date)
  sequence?: number; // 000 for cover, 001+ for other images
}

export interface ParsedCatalogId {
  prefix: string;
  category: CatalogCategory;
  date: string; // YYYY-MM-DD
  sequence: number; // 0-999
  isCover: boolean;
}

/**
 * Convert YYYY-MM-DD to YYYYMMDD format
 * Timezone-safe: uses local date interpretation
 */
export function formatDateToCompact(dateString: string): string {
  // Remove hyphens: 2024-10-23 → 20241023
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }

  const [year, month, day] = parts;
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    throw new Error(`Invalid date components: ${dateString}. Expected YYYY-MM-DD`);
  }

  return `${year}${month}${day}`; // Returns: 20241023
}

/**
 * Convert YYYYMMDD to YYYY-MM-DD format
 */
export function formatCompactToDate(compactDate: string): string {
  if (compactDate.length !== 8) {
    throw new Error(`Invalid compact date format: ${compactDate}. Expected YYYYMMDD`);
  }

  const year = compactDate.substring(0, 4);
  const month = compactDate.substring(4, 6);
  const day = compactDate.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Parse a catalog ID into its components
 * @param catalogId - Catalog ID string (e.g., "LMSY-MAG-20241023-000")
 * @returns Parsed components or null if invalid
 */
export function parseCatalogId(catalogId: string): ParsedCatalogId | null {
  // Match new format: LMSY-XXX-YYYYMMDD-NNN
  const match = catalogId.match(/^LMSY-([A-Z]+)-(\d{8})-(\d{3})$/);
  if (!match) return null;

  const category = match[1] as CatalogCategory;
  const compactDate = match[2];
  const sequence = parseInt(match[3], 10);

  try {
    const dateStr = formatCompactToDate(compactDate);

    return {
      prefix: 'LMSY',
      category,
      date: dateStr,
      sequence,
      isCover: sequence === 0,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a catalog ID with the specified components
 * @param options - Catalog ID options
 * @returns Formatted catalog ID string
 */
export function generateCatalogId(options: CatalogIdOptions): string {
  const compactDate = formatDateToCompact(options.eventDate);
  const sequence = options.sequence !== undefined ? options.sequence : 0;
  const paddedSequence = sequence.toString().padStart(3, '0');

  return `LMSY-${options.category}-${compactDate}-${paddedSequence}`;
}

/**
 * Get the next sequence number for a given category and date
 * This queries the database to find the highest existing sequence number for the specific date
 * @param supabase - Supabase admin client
 * @param category - Catalog category
 * @param eventDate - Event date in YYYY-MM-DD format
 * @param tableName - Table to query (default: 'gallery')
 * @returns Next sequence number (starts from 0 for cover, or increments from existing)
 */
export async function getNextCatalogSequence(
  supabase: CatalogIdClient,
  category: CatalogCategory,
  eventDate: string,
  tableName: string = 'gallery'
): Promise<number> {
  const compactDate = formatDateToCompact(eventDate);
  const prefix = `LMSY-${category}-${compactDate}`;

  // Query for the highest sequence number for this category and date
  const { data, error } = await supabase
    .from(tableName)
    .select('catalog_id')
    .like('catalog_id', `${prefix}-%`)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.catalog_id) {
    // No existing entries for this date, start from 0 (cover)
    return 0;
  }

  // Parse the highest catalog ID and increment
  const parsed = parseCatalogId(data.catalog_id);
  if (!parsed) {
    return 0;
  }

  return parsed.sequence + 1;
}

/**
 * Generate the next catalog ID for a magazine cover
 * Cover is always sequence 000
 * @param supabase - Supabase admin client
 * @param eventDate - Event date in YYYY-MM-DD format
 * @returns New catalog ID for cover (sequence 000)
 */
export async function generateMagazineCoverCatalogId(
  supabase: CatalogIdClient,
  eventDate: string
): Promise<string> {
  // Cover is always 000, no need to query
  return generateCatalogId({
    category: 'MAG',
    eventDate,
    sequence: 0,
  });
}

/**
 * Generate the next catalog ID for a magazine page
 * Automatically finds the next available sequence number
 * @param supabase - Supabase admin client
 * @param eventDate - Event date in YYYY-MM-DD format
 * @returns New catalog ID for page (sequence 001+)
 */
export async function generateMagazinePageCatalogId(
  supabase: CatalogIdClient,
  eventDate: string,
  tableName: string = 'gallery'
): Promise<string> {
  const nextSequence = await getNextCatalogSequence(supabase, 'MAG', eventDate, tableName);

  // If nextSequence is 0, it means no entries exist yet, start from 001 (cover is separate)
  // If nextSequence > 0, it means we have entries, use the next number
  const sequence = nextSequence === 0 ? 1 : nextSequence;

  return generateCatalogId({
    category: 'MAG',
    eventDate,
    sequence,
  });
}

/**
 * Generate the next catalog ID for a gallery item
 * @param supabase - Supabase admin client
 * @param eventDate - Event date in YYYY-MM-DD format
 * @returns New catalog ID
 */
export async function generateNextGalleryCatalogId(
  supabase: CatalogIdClient,
  eventDate: string
): Promise<string> {
  const nextSequence = await getNextCatalogSequence(supabase, 'G', eventDate, 'gallery');
  const sequence = nextSequence === 0 ? 1 : nextSequence;

  return generateCatalogId({
    category: 'G',
    eventDate,
    sequence,
  });
}

/**
 * Validate a catalog ID format
 * @param catalogId - Catalog ID string to validate
 * @returns True if valid format
 */
export function isValidCatalogId(catalogId: string): boolean {
  return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId);
}

/**
 * Check if a catalog ID represents a cover image
 * @param catalogId - Catalog ID string
 * @returns True if cover (sequence 000)
 */
export function isCoverCatalogId(catalogId: string): boolean {
  const parsed = parseCatalogId(catalogId);
  return parsed?.isCover ?? false;
}

/**
 * Get R2 storage path for a magazine image
 * @param catalogId - Catalog ID string
 * @returns R2 path (e.g., "magazines/2024/LMSY-MAG-20241023-000.webp")
 */
export function getR2PathForCatalogId(catalogId: string): string {
  const parsed = parseCatalogId(catalogId);
  if (!parsed) {
    throw new Error(`Invalid catalog ID: ${catalogId}`);
  }

  const year = parsed.date.substring(0, 4); // Extract year from YYYY-MM-DD
  return `magazines/${year}/${catalogId}.webp`;
}

/**
 * Legacy format support (for backward compatibility)
 * Old format: LMSY-G-2024-001
 * New format: LMSY-G-20241023-001
 */

export interface LegacyParsedCatalogId {
  prefix: string;
  type: string; // G, P, ED, etc.
  year: number;
  sequence: number;
}

/**
 * Parse legacy catalog ID format
 * @param catalogId - Legacy catalog ID string (e.g., "LMSY-G-2024-001")
 * @returns Parsed components or null if invalid
 */
export function parseLegacyCatalogId(catalogId: string): LegacyParsedCatalogId | null {
  const match = catalogId.match(/^LMSY-([A-Z]+)-(\d{4})-(\d{3})$/);
  if (!match) return null;

  return {
    prefix: 'LMSY',
    type: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

/**
 * Check if a catalog ID is in legacy format
 */
export function isLegacyCatalogId(catalogId: string): boolean {
  return /^LMSY-[A-Z]+-\d{4}-\d{3}$/.test(catalogId);
}

// ============================================================================
// Concurrent allocation support (phase 1 hardening)
// ============================================================================
// Catalog IDs are allocated with a read-max-then-add-one query, which is not
// atomic: two uploads of the same category and date can pick the same sequence.
// A partial unique index on catalog_id (see
// supabase/migrations/20261015_phase1_data_integrity.sql) makes the database
// the final authority; callers must treat the resulting conflict as retryable
// instead of a hard failure.
// ============================================================================

// ============================================================================
// Shared allocation used by BOTH manual upload and draft promotion
// (phase 2 content-model refactor, ADR-001 D5)
// ============================================================================
// Previously this read-max-then-add-one logic lived inline in
// app/api/admin/upload/route.ts only, so assets promoted from draft_items
// never received a catalog_id. The logic below is extracted verbatim from
// that verified implementation so both write paths share one code path.
// Uniqueness is ultimately enforced by the database (unique indexes on
// gallery_assets.catalog_id); callers must treat a 23505 conflict as
// retryable (see isCatalogIdConflict + CATALOG_ID_MAX_ATTEMPTS).

/**
 * Project category -> catalog prefix mapping shared by manual upload and
 * draft promotion. Values are the existing production mapping (AD / STAGE /
 * STILL / DAILY / TRV prefixes already occur in real data); do not change
 * them without a data-model decision.
 */
export const CATEGORY_TO_CATALOG_PREFIX: Record<string, string> = {
  series: 'STILL',      // TV/Drama
  editorial: 'MAG',     // Magazine
  appearance: 'STAGE',  // Event/Stage
  daily: 'DAILY',       // Daily (日常)
  travel: 'TRV',        // Travel (旅途)
  commercial: 'AD',     // Ad/Brand
};

/**
 * Allocate the next catalog_id for a category prefix and date.
 * Mirrors the manual-upload logic exactly: highest existing sequence + 1,
 * starting at 001 when no entry exists for that prefix/date.
 * Not atomic by itself — the unique index on catalog_id is the final
 * authority; retry on conflict via isCatalogIdConflict.
 */
export async function allocateNextCatalogId(
  supabase: CatalogIdClient,
  categoryPrefix: string,
  eventDate: string,
  tableName: string = 'gallery_assets'
): Promise<string> {
  const compactDate = formatDateToCompact(eventDate);
  const prefix = `LMSY-${categoryPrefix}-${compactDate}`;

  const { data, error } = await supabase
    .schema('lmsy_archive')
    .from(tableName)
    .select('catalog_id')
    .like('catalog_id', `${prefix}-%`)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSequence = 1;
  if (!error && data?.catalog_id) {
    const match = data.catalog_id.match(/-(\d{3})$/);
    if (match) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  return `LMSY-${categoryPrefix}-${compactDate}-${String(nextSequence).padStart(3, '0')}`;
}

/** How many times a caller should re-allocate an id before giving up. */
export const CATALOG_ID_MAX_ATTEMPTS = 5;

/**
 * True when a Postgres/Supabase error is a unique-constraint violation,
 * which for this codebase means "that catalog_id or file_hash is taken".
 */
export function isCatalogIdConflict(error: unknown): boolean {
  if (!error) return false;
  const code = (error as { code?: string }).code;
  if (code === '23505') return true;
  const message = (error as { message?: string }).message || '';
  return /duplicate key value|unique constraint|already exists/i.test(message);
}

/** True when the error is the file_hash deduplication index complaining. */
export function isDuplicateFileHash(error: unknown): boolean {
  if (!isCatalogIdConflict(error)) return false;
  const message = (error as { message?: string }).message || '';
  return /file_hash/i.test(message);
}
