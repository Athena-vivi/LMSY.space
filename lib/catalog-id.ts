/**
 * Catalog ID generation utilities
 * Format: LMSY-{TYPE}-{YEAR}-{XXX}
 * Example: LMSY-G-2026-001
 */

export type CatalogType = 'G' | 'P' | 'C'; // Gallery, Project, Chronicle

export interface CatalogIdOptions {
  type: CatalogType;
  year?: number;
  sequence?: number;
}

/**
 * Parse a catalog ID into its components
 * @param catalogId - Catalog ID string (e.g., "LMSY-G-2026-001")
 * @returns Parsed components or null if invalid
 */
export function parseCatalogId(catalogId: string): {
  prefix: string;
  type: CatalogType;
  year: number;
  sequence: number;
} | null {
  const match = catalogId.match(/^LMSY-([GPC])-(\d{4})-(\d{3})$/);
  if (!match) return null;

  return {
    prefix: 'LMSY',
    type: match[1] as CatalogType,
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

/**
 * Generate a catalog ID with the specified components
 * @param options - Catalog ID options
 * @returns Formatted catalog ID string
 */
export function generateCatalogId(options: CatalogIdOptions): string {
  const year = options.year || new Date().getFullYear();
  const sequence = options.sequence || 1;
  const paddedSequence = sequence.toString().padStart(3, '0');

  return `LMSY-${options.type}-${year}-${paddedSequence}`;
}

/**
 * Get the next sequence number for a given type and year
 * This queries the database to find the highest existing sequence number
 * @param supabase - Supabase admin client
 * @param type - Catalog type
 * @param year - Year (defaults to current year)
 * @param tableName - Table to query (default: 'gallery')
 * @returns Next sequence number
 */
export async function getNextCatalogSequence(
  supabase: any,
  type: CatalogType,
  year?: number,
  tableName: string = 'gallery'
): Promise<number> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `LMSY-${type}-${currentYear}`;

  // Query for the highest sequence number for this type and year
  const { data, error } = await supabase
    .from(tableName)
    .select('catalog_id')
    .like('catalog_id', `${prefix}-%`)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.catalog_id) {
    // No existing entries, start from 1
    return 1;
  }

  // Parse the highest catalog ID and increment
  const parsed = parseCatalogId(data.catalog_id);
  if (!parsed) {
    return 1;
  }

  return parsed.sequence + 1;
}

/**
 * Generate the next catalog ID for a gallery item
 * @param supabase - Supabase admin client
 * @param year - Year (defaults to current year)
 * @returns New catalog ID
 */
export async function generateNextGalleryCatalogId(
  supabase: any,
  year?: number
): Promise<string> {
  const nextSequence = await getNextCatalogSequence(supabase, 'G', year, 'gallery');
  return generateCatalogId({ type: 'G', year, sequence: nextSequence });
}

/**
 * Validate a catalog ID format
 * @param catalogId - Catalog ID string to validate
 * @returns True if valid format
 */
export function isValidCatalogId(catalogId: string): boolean {
  return /^LMSY-[GPC]-\d{4}-\d{3}$/.test(catalogId);
}
