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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
