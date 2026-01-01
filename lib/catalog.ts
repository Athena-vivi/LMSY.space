/**
 * Museum Catalog Number Generator
 * Generates unique catalog numbers in the format: LMSY-XX-YYYY-NNN
 *
 * Format breakdown:
 * - LMSY: Collection prefix
 * - XX: Category code (AR=Archive, PR=Project, SC=Schedule)
 * - YYYY: Year of creation
 * - NNN: Sequential number (001-999)
 */

export type CatalogCategory = 'AR' | 'PR' | 'SC';

export interface CatalogNumberParts {
  prefix: string;
  category: CatalogCategory;
  year: string;
  sequence: string;
}

/**
 * Generate a catalog number from components
 */
export function generateCatalogNumber(
  category: CatalogCategory,
  year: number = new Date().getFullYear(),
  sequence: number
): string {
  const sequenceStr = sequence.toString().padStart(3, '0');
  return `LMSY-${category}-${year}-${sequenceStr}`;
}

/**
 * Parse a catalog number into its components
 */
export function parseCatalogNumber(catalogNumber: string): CatalogNumberParts | null {
  const match = catalogNumber.match(/^LMSY-(AR|PR|SC)-(\d{4})-(\d{3})$/);
  if (!match) return null;

  return {
    prefix: 'LMSY',
    category: match[1] as CatalogCategory,
    year: match[2],
    sequence: match[3],
  };
}

/**
 * Generate catalog number for a gallery item
 */
export function generateGalleryCatalogNumber(
  id: string,
  createdAt: string,
  index: number
): string {
  const year = new Date(createdAt).getFullYear();
  return generateCatalogNumber('AR', year, index + 1);
}

/**
 * Generate catalog number for a project
 */
export function generateProjectCatalogNumber(
  id: string,
  createdAt: string,
  category: string,
  index: number
): string {
  const year = new Date(createdAt).getFullYear();
  return generateCatalogNumber('PR', year, index + 1);
}

/**
 * Generate catalog number for a schedule event
 */
export function generateScheduleCatalogNumber(
  id: string,
  createdAt: string,
  index: number
): string {
  const year = new Date(createdAt).getFullYear();
  return generateCatalogNumber('SC', year, index + 1);
}

/**
 * Format catalog number for display with typewriter font styling
 */
export function formatCatalogNumberDisplay(catalogNumber: string): string {
  return catalogNumber;
}

/**
 * Get category name from catalog number
 */
export function getCategoryName(catalogNumber: string): string {
  const parsed = parseCatalogNumber(catalogNumber);
  if (!parsed) return 'Unknown';

  const categoryNames: Record<CatalogCategory, string> = {
    AR: 'Archive',
    PR: 'Project',
    SC: 'Schedule',
  };

  return categoryNames[parsed.category];
}

/**
 * Validate catalog number format
 */
export function isValidCatalogNumber(catalogNumber: string): boolean {
  return /^LMSY-(AR|PR|SC)-\d{4}-\d{3}$/.test(catalogNumber);
}
