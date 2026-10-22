/**
 * Asset catalog ID utilities - LMSY archive naming standard.
 *
 * CANONICAL SPEC: docs/architecture/20261021-asset-naming.md
 * Unification tracker: docs/architecture/20261022-naming-unification.md
 *
 *   <PERSON>-<DOOR>-<SUBJECT>[-<THEME>]-<YYYYMMDD>-<NNN>
 *
 *   LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001
 *   LM-MAG-OAT-20241211-012
 *   SY-MAG-KAZZ217-YOUTHCHOICE-20260731-001
 *   LMSY-DRAMA-AFFAIR-PROMO-20240815-003
 *   LMSY-FEAT-BACKVIEW-001            (special topic: no date by design)
 *
 * Rules (from the spec, do not invent new ones):
 *   - Uppercase ASCII, single '-' separator. No spaces, dots, underscores.
 *   - PERSON and DOOR and the trailing NNN are always present; SUBJECT/THEME
 *     segments vary in count, so the ID is read right-to-left.
 *   - A missing segment is omitted entirely - never write NA / 0000 placeholders.
 *   - YYYYMMDD is 8 digits; omitted as a whole when unknown.
 *   - FEAT topics omit the date on purpose: a topic is a long-lived
 *     collection whose images join over the years, so the sequence is
 *     append-only and no date can be pinned to the set.
 *   - NNN starts at 001. There is NO -000 cover segment: a cover is a POINTER
 *     (projects.cover_url / homepage_cover_url) to an existing asset in the
 *     same batch, never a separate numbered file.
 *
 * The old format `LMSY-<CATEGORY>-<YYYYMMDD>-<NNN>` with a -000 cover is dead.
 * It is still recognised by isLegacyCatalogId() for back-compat only; nothing
 * in this file produces it any more.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** First segment: who is in the picture. */
export const PERSON_CODES = ['LMSY', 'LM', 'SY'] as const;
export type PersonCode = (typeof PERSON_CODES)[number];

/** Second segment: which door the asset belongs to. */
export const DOOR_CODES = [
  'DRAMA',
  'MAG',
  'EVENT',
  'APPEAR',
  'BRAND',
  'TALK',
  'LIVE',
  'BTS',
  'EARLY',
  'FEAT',
] as const;
export type DoorCode = (typeof DOOR_CODES)[number];

/** person segment -> R2 directory segment. */
export const PERSON_DIR: Record<PersonCode, string> = {
  LMSY: 'lmsy',
  LM: 'lm',
  SY: 'sy',
};

/** door segment -> R2 directory segment. */
export const DOOR_DIR: Record<DoorCode, string> = {
  DRAMA: 'drama',
  MAG: 'mag',
  EVENT: 'event',
  APPEAR: 'appear',
  BRAND: 'brand',
  TALK: 'talk',
  LIVE: 'live',
  BTS: 'bts',
  EARLY: 'early',
  FEAT: 'feat',
};

/**
 * Project category -> door code.
 * Values come from the canonical spec section 3; the previous mapping
 * (STILL / MAG / STAGE / DAILY / TRV / AD) was a different, older scheme and
 * produced IDs that no page could read.
 */
export const CATEGORY_TO_DOOR_CODE: Record<string, DoorCode> = {
  drama_work: 'DRAMA',
  editorial: 'MAG',
  live_event: 'EVENT',
  public_appearance: 'APPEAR',
  commercial: 'BRAND',
  talks: 'TALK',
  live: 'LIVE',
  behind_the_scenes: 'BTS',
  early_archive: 'EARLY',
};

/**
 * Kept as an alias so existing imports keep compiling. Prefer
 * CATEGORY_TO_DOOR_CODE in new code - it now returns a door code, not a prefix.
 */
export const CATEGORY_TO_CATALOG_PREFIX = CATEGORY_TO_DOOR_CODE;

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

const SEG = '[A-Z0-9]+(?:-[A-Z0-9]+)*';
const ID_WITH_DATE = new RegExp(`^(LMSY|LM|SY)-(${DOOR_CODES.join('|')})-(${SEG})-(\\d{8})-(\\d{3})$`);
const ID_NO_DATE = new RegExp(`^(LMSY|LM|SY)-(${DOOR_CODES.join('|')})-(${SEG})-(\\d{3})$`);

export interface ParsedCatalogId {
  person: PersonCode;
  door: DoorCode;
  /** SUBJECT plus optional THEME, e.g. "KAZZ217-YOUTHCHOICE". */
  subject: string;
  /** YYYY-MM-DD, or null when the date segment was omitted. */
  date: string | null;
  sequence: number;
}

export interface CatalogIdParts {
  person: PersonCode;
  door: DoorCode;
  subject: string;
  /** YYYY-MM-DD or YYYYMMDD; omit entirely when unknown. */
  date?: string | null;
  sequence: number;
}

/**
 * Minimal structural type for the Supabase client used by these helpers.
 * Kept intentionally loose (any table/select chain) so the existing call sites
 * do not need to be re-typed, while still avoiding the bare `any` keyword.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogIdClient = any;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** YYYY-MM-DD -> YYYYMMDD. Timezone-safe (string split, no Date parsing). */
export function formatDateToCompact(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  const [year, month, day] = parts;
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    throw new Error(`Invalid date components: ${dateString}. Expected YYYY-MM-DD`);
  }
  return `${year}${month}${day}`;
}

/** YYYYMMDD -> YYYY-MM-DD. */
export function formatCompactToDate(compactDate: string): string {
  if (compactDate.length !== 8) {
    throw new Error(`Invalid compact date format: ${compactDate}. Expected YYYYMMDD`);
  }
  return `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
}

// ---------------------------------------------------------------------------
// Parse / build / validate
// ---------------------------------------------------------------------------

/**
 * Parse an asset catalog ID. Returns null when it does not match the spec.
 * Tries the dated shape first, then the date-less shape.
 */
export function parseCatalogId(catalogId: string): ParsedCatalogId | null {
  const full = ID_WITH_DATE.exec(catalogId);
  if (full) {
    const sequence = parseInt(full[5], 10);
    // Sequence starts at 001; -000 was the old "cover" segment and is dead.
    if (sequence < 1) return null;
    return {
      person: full[1] as PersonCode,
      door: full[2] as DoorCode,
      subject: full[3],
      date: formatCompactToDate(full[4]),
      sequence,
    };
  }

  const short = ID_NO_DATE.exec(catalogId);
  if (short) {
    const sequence = parseInt(short[4], 10);
    if (sequence < 1) return null;
    return {
      person: short[1] as PersonCode,
      door: short[2] as DoorCode,
      subject: short[3],
      date: null,
      sequence,
    };
  }

  return null;
}

/** True when the ID matches the canonical spec (dated or date-less). */
export function isValidCatalogId(catalogId: string): boolean {
  return parseCatalogId(catalogId) !== null;
}

/**
 * Build an ID from parts. A missing subject or date is omitted entirely -
 * never replaced with a placeholder.
 */
export function buildCatalogId(parts: CatalogIdParts): string {
  const sequence = String(parts.sequence).padStart(3, '0');
  const head = `${parts.person}-${parts.door}-${parts.subject}`;
  if (!parts.date) return `${head}-${sequence}`;
  const compact = parts.date.includes('-') ? formatDateToCompact(parts.date) : parts.date;
  return `${head}-${compact}-${sequence}`;
}

/**
 * Alias kept for older call sites. Produces the canonical shape; note there is
 * no cover sequence any more - sequence 001 is the first file of a batch.
 */
export function generateCatalogId(parts: CatalogIdParts): string {
  return buildCatalogId(parts);
}

/**
 * R2 object key for an asset: <person>/<door>/<year>/<id>.webp
 * Date-less IDs (FEAT topics: long-lived, images join over the years) carry
 * no year segment: <person>/<door>/<id>.webp
 */
export function r2KeyForCatalogId(catalogId: string): string {
  const parsed = parseCatalogId(catalogId);
  if (!parsed) {
    throw new Error(
      `Invalid catalog ID: ${catalogId}. Expected <PERSON>-<DOOR>-<SUBJECT>[-<THEME>]-<YYYYMMDD>-<NNN>`
    );
  }
  if (!parsed.date) {
    return `${PERSON_DIR[parsed.person]}/${DOOR_DIR[parsed.door]}/${catalogId}.webp`;
  }
  const year = parsed.date.substring(0, 4);
  return `${PERSON_DIR[parsed.person]}/${DOOR_DIR[parsed.door]}/${year}/${catalogId}.webp`;
}

/**
 * R2 storage path for an asset.
 * Kept under the historical name so existing call sites keep working; the
 * layout is now <person>/<door>/<year>/ instead of magazines/<year>/.
 */
export function getR2PathForCatalogId(catalogId: string): string {
  return r2KeyForCatalogId(catalogId);
}

/**
 * Parse a project catalog HEAD (`<PERSON>-<DOOR>-<SUBJECT>`, no date or
 * sequence - projects.catalog_id stores exactly that shape, e.g.
 * LMSY-EVENT-BEINLOVE). Full asset ids go through parseCatalogId instead.
 */
export function parseCatalogHead(head: string | null | undefined): string | null {
  if (!head) return null;
  const parts = head.split('-');
  if (parts.length < 3) return null;
  const [person, door] = parts;
  if (!(PERSON_CODES as readonly string[]).includes(person)) return null;
  if (!(DOOR_CODES as readonly string[]).includes(door)) return null;
  const subject = parts.slice(2).join('-');
  return subject || null;
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

/**
 * Highest existing sequence + 1 for a given prefix, starting at 001.
 * Not atomic by itself - the unique index on gallery_assets.catalog_id is the
 * final authority; callers must treat a 23505 conflict as retryable.
 */
export async function allocateNextCatalogId(
  supabase: CatalogIdClient,
  doorCode: string,
  eventDate: string,
  options: { person?: PersonCode; subject?: string; tableName?: string } = {}
): Promise<string> {
  const person = options.person ?? 'LMSY';
  const subject = options.subject;
  const tableName = options.tableName ?? 'gallery_assets';
  const compactDate = formatDateToCompact(eventDate);

  const head = subject
    ? `${person}-${doorCode}-${subject}-${compactDate}`
    : `${person}-${doorCode}-${compactDate}`;

  const { data, error } = await supabase
    .schema('lmsy_archive')
    .from(tableName)
    .select('catalog_id')
    .like('catalog_id', `${head}-%`)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSequence = 1;
  if (!error && data?.catalog_id) {
    const match = /-(\d{3})$/.exec(data.catalog_id);
    if (match) nextSequence = parseInt(match[1], 10) + 1;
  }

  return `${head}-${String(nextSequence).padStart(3, '0')}`;
}

/**
 * Allocate an ID for a magazine page. Sequence starts at 001 - a cover is a
 * pointer, not a -000 file, so the very first uploaded file of a batch is 001
 * and the cover_url points at one of these IDs.
 */
export async function generateMagazinePageCatalogId(
  supabase: CatalogIdClient,
  eventDate: string,
  tableName: string = 'gallery_assets',
  options: { person?: PersonCode; subject?: string } = {}
): Promise<string> {
  return allocateNextCatalogId(supabase, 'MAG', eventDate, {
    ...options,
    tableName,
  });
}

/** Allocate an ID for a non-magazine asset. Sequence starts at 001. */
export async function generateNextGalleryCatalogId(
  supabase: CatalogIdClient,
  eventDate: string,
  options: { person?: PersonCode; subject?: string; door?: DoorCode } = {}
): Promise<string> {
  return allocateNextCatalogId(supabase, options.door ?? 'BTS', eventDate, {
    person: options.person,
    subject: options.subject,
  });
}

// ---------------------------------------------------------------------------
// Legacy (old format, recognised but never produced)
// ---------------------------------------------------------------------------

export interface LegacyParsedCatalogId {
  prefix: string;
  type: string;
  year: number;
  sequence: number;
}

/** Old shape LMSY-<CATEGORY>-<YYYYMMDD>-<NNN> (and the even older 4-digit year form). */
export function isLegacyCatalogId(catalogId: string): boolean {
  return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId) || /^LMSY-[A-Z]+-\d{4}-\d{3}$/.test(catalogId);
}

export function parseLegacyCatalogId(catalogId: string): LegacyParsedCatalogId | null {
  const match = /^LMSY-([A-Z]+)-(\d{4})-(\d{3})$/.exec(catalogId);
  if (!match) return null;
  return {
    prefix: 'LMSY',
    type: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

// ---------------------------------------------------------------------------
// Conflict detection (unchanged)
// ---------------------------------------------------------------------------

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
