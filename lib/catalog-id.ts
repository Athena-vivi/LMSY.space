/**
 * Asset catalog ID utilities - LMSY archive naming standard.
 *
 * CANONICAL SPEC: docs/architecture/20261021-asset-naming.md
 * Unification tracker: docs/architecture/20261022-naming-unification.md
 *
 *   LMSY-<DOOR>-<SUBJECT>[-<PERSON>]-<YYYYMMDD>-<NNN>
 *
 *   LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001
 *   LMSY-MAG-OAT-LM-20241211-012          (single-person event)
 *   LMSY-MAG-KAZZ217-YOUTHCHOICE-SY-20260731-001
 *   LMSY-DRAMA-AFFAIR-PROMO-20240815-003
 *   LMSY-FEAT-BACKVIEW-001            (special topic: no date by design)
 *
 * The first segment is the SITE (LMSY), not the person: this is a two-person
 * archive, so every id starts the same way. The person, when an event belongs
 * to one of them, is a tail code after the subject - see personTail(). Before
 * 2026-10-23 the first segment carried the person (LM- / SY-), which made the
 * same event address differently depending on who was in the picture.
 *
 * Rules (from the spec, do not invent new ones):
 *   - Uppercase ASCII, single '-' separator. No spaces, dots, underscores.
 *   - DOOR and the trailing NNN are always present, as is the leading LMSY;
 *     SUBJECT/THEME/PERSON segments vary in count, so the ID is read
 *     right-to-left.
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

/** First segment: the site. Every catalog id starts with it (2026-10-23). */
export const SITE_PREFIX = 'LMSY' as const;

/**
 * Who an event belongs to.
 *
 * Since 2026-10-23 this is a TAIL code, not the first segment: `LMSY` (duo)
 * adds nothing, `LM` / `SY` append `-LM` / `-SY` after the subject. The
 * values are still the same three, so parsing code keeps working; only the
 * position moved. `PERSON_CODES` stays as the accepted vocabulary because
 * old ids with a leading LM- / SY- still have to parse.
 */
export const PERSON_CODES = ['LMSY', 'LM', 'SY'] as const;
export type PersonCode = (typeof PERSON_CODES)[number];

/** `-LM` / `-SY` for a single-person event, empty string for a duo event. */
export function personTail(person?: string | null): string {
  const p = (person || '').trim().toUpperCase();
  return p === 'LM' || p === 'SY' ? `-${p}` : '';
}

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
  // The talks door stores its shelf as the project's category: a project is
  // an interview, a variety spot or a radio hour - never the door name.
  interview: 'TALK',
  variety: 'TALK',
  radio: 'TALK',
  live_stream: 'LIVE',
  behind_the_scenes: 'BTS',
  early_archive: 'EARLY',
};

/**
 * Kept as an alias so existing imports keep compiling. Prefer
 * CATEGORY_TO_DOOR_CODE in new code - it now returns a door code, not a prefix.
 */
export const CATEGORY_TO_CATALOG_PREFIX = CATEGORY_TO_DOOR_CODE;

// ---------------------------------------------------------------------------
// SUBJECT segments that are decided by a pick, never typed
// ---------------------------------------------------------------------------

/**
 * live_event subtype -> the first SUBJECT segment (spec section 4.3).
 *
 * The subject of an event asset is "which kind of room" + "which city":
 *   LMSY-EVENT-FANMEET-BKK-20250115-001
 * Both halves come from a field the curator picks (subtype / city), so the
 * wizard shows the result instead of asking for it. Typing this segment by
 * hand is how the archive ended up with FANMEETING, 1ST-FAN-MEETING and
 * BEINLOVE all describing the same kind of booking.
 */
export const LIVE_EVENT_SUBTYPE_CODES = {
  concert: 'CONCERT',
  fanmeeting: 'FANMEET',
  fansign: 'FANSIGN',
  brand_event: 'BRANDDAY',
  birthday: 'BIRTHDAY',
} as const;

/**
 * public_appearance subtype -> the first SUBJECT segment (spec section 4.4).
 *
 * Same idea as the live-event hall: the shelf plus the city is the subject,
 * both come from a dropdown, and the wizard shows the result instead of
 * asking for it.
 *   LMSY-APPEAR-AWARDS-BKK-20250515-001
 *   LMSY-APPEAR-FASHION-MNL-20260905-SY-003
 */
export const APPEARANCE_SUBTYPE_CODES = {
  awards: 'AWARDS',
  fashion: 'FASHION',
  brand_stage: 'BRANDSTAGE',
  industry: 'INDUSTRY',
  charity: 'CHARITY',
  company: 'COMPANY',
} as const;

/**
 * drama_work subtype -> the second SUBJECT segment (spec section 4.1).
 *
 * The first segment is the WORK code, carried by the series row itself
 * (`LMSY-DRAMA-AFFAIR`), so a fourth series needs no entry here - it only
 * needs its own number. The event code after it says WHICH entry in that
 * group, because one work has several of each (Affair has four pieces of
 * footage):
 *
 *   LMSY-DRAMA-AFFAIR-PREMIERE                    (one screening per work)
 *   LMSY-DRAMA-AFFAIR-FINALEPISODE
 *   LMSY-DRAMA-AFFAIR-FOOTAGE-HIGHLIGHTS
 */
export const DRAMA_SUBTYPE_CODES = {
  // series_body folds straight into WORK-EVENTCODE (no SERIES segment): the
  // work already groups its entries, so a second "series" level is redundant.
  series_body: '',
  premiere: 'PREMIERE',
  promo: 'PROMO',
  footage: 'FOOTAGE',
  music: 'MUSIC',
  novel: 'NOVEL',
  award: 'AWARD',
} as const;

/**
 * SUBJECT of a drama event: `<WORK>-<PART>[-<EVENT CODE>]`.
 *
 * A part that holds exactly one entry per work (premiere) needs no event code;
 * everything else does, or two entries would claim the same number. Returns
 * null for an unknown subtype so the caller asks instead of inventing a code.
 */
export function dramaSubject(
  workCode: string | null | undefined,
  subtype: string | null | undefined,
  eventCode?: string | null
): string | null {
  const work = (workCode || '').trim().toUpperCase();
  if (!work) return null;
  const part = DRAMA_SUBTYPE_CODES[(subtype || '') as keyof typeof DRAMA_SUBTYPE_CODES];
  const tail = (eventCode || '').trim().toUpperCase();
  if (!tail) return null;
  return part ? `${work}-${part}-${tail}` : `${work}-${tail}`;
}

/**
 * Halls whose SUBJECT is decided by two picks. A hall that is not in this
 * table still types its subject by hand - the doors are being moved over one
 * at a time, and a value here is what makes the wizard read-only.
 */
const PICKED_SUBJECT_HALLS: Record<string, Record<string, string>> = {
  live_event: LIVE_EVENT_SUBTYPE_CODES,
  public_appearance: APPEARANCE_SUBTYPE_CODES,
};

/** City display name (projects.city) -> three-letter SUBJECT segment. */
export const CITY_CODES: Record<string, string> = {
  曼谷: 'BKK',
  澳门: 'MFM',
  香港: 'HKG',
  台北: 'TPE',
  高雄: 'KHH',
  南宁: 'NNG',
  天津: 'TSN',
  重庆: 'CKG',
  成都: 'CTU',
  上海: 'SHA',
  深圳: 'SZX',
  杭州: 'HGH',
  武汉: 'WUH',
  福州: 'FOC',
  胡志明市: 'SGN',
  马尼拉: 'MNL',
  金边: 'PNH',
  新加坡: 'SIN',
  首尔: 'SEL',
  墨西哥城: 'MEX',
  圣保罗: 'SAO',
};

/**
 * The SUBJECT segment for an asset in a hall whose subject is decided by
 * picks, or null when the picks do not decide it yet (unknown hall, unknown
 * subtype, or a city outside the table). Null means "caller must ask", never
 * "invent a value".
 */
export function pickedSubject(
  category: string | null | undefined,
  subtype: string | null | undefined,
  city: string | null | undefined
): string | null {
  const hall = category ? PICKED_SUBJECT_HALLS[category] : undefined;
  if (!hall) return null;
  const kind = subtype ? hall[subtype] : undefined;
  if (!kind) return null;
  const name = city?.trim();
  const place = name ? CITY_CODES[name] : undefined;
  return place ? `${kind}-${place}` : kind;
}

/** True when this hall's subject comes from picks rather than typing. */
export function hasPickedSubject(category: string | null | undefined): boolean {
  return Boolean(category && PICKED_SUBJECT_HALLS[category]);
}

/**
 * Kept as an alias so existing call sites keep compiling. Prefer
 * pickedSubject(category, subtype, city) - it covers every hall that has a
 * subject rule, not just the live-event one.
 */
export function liveEventSubject(
  subtype: string | null | undefined,
  city: string | null | undefined
): string | null {
  return pickedSubject('live_event', subtype, city);
}

// ---------------------------------------------------------------------------
// The other four halls: subject = registry code(s), plus one derived word
// ---------------------------------------------------------------------------

/**
 * Talks shelf -> the first SUBJECT segment (spec 4.6). The shelf is the project
 * category, so this is a pick the curator already makes.
 */
export const TALK_SHELF_CODES = {
  interview: 'INTERVIEW',
  variety: 'VARIETY',
  radio: 'RADIO',
} as const;

/** Live platforms (spec 4.7). The subject is the platform and nothing else. */
export const LIVE_PLATFORM_CODES = [
  { value: 'IG', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'WEIBO', label: 'Weibo' },
  { value: 'X', label: 'X' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'SHOPEE', label: 'Shopee Live' },
] as const;

/**
 * A word derived from a title, for the segments that are new every time:
 * a magazine theme (`YOUTHCHOICE`), a brand campaign (`COFFEE`).
 *
 * NFKC first, because the archive's titles are full of decorative Unicode
 * (`𝐋𝐌𝐒𝐘 𝐱 ...`) and a plain A-Z filter would return an empty string.
 * The tail after `in` / `at` / `@` is dropped: it is the venue, not the theme.
 */
export function codeFromTitle(title: string | null | undefined, maxLength = 48): string {
  const raw = (title || '').normalize('NFKC').replace(/\s+(?:in|at|@)\s+[\s\S]*$/i, '');
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

/** MAG subject: publication (issue folded in) + theme when the title gives one. */
export function magSubject(
  publicationCode: string | null | undefined,
  themeCode?: string | null
): string | null {
  const pub = (publicationCode || '').trim().toUpperCase();
  if (!pub) return null;
  const theme = (themeCode || '').trim().toUpperCase();
  return theme && theme !== pub ? `${pub}-${theme}` : pub;
}

/**
 * The theme after the title's separator.
 *
 * Magazine titles are written `<publication> · <theme>`, so the theme is what
 * follows the dot. Deriving it from the whole title instead would turn a title
 * that is only the publication (`KAZZ 2024-10`) into a second, nonsense
 * segment - and the spec already says an unknown theme is simply omitted.
 */
export function themeAfterSeparator(title: string | null | undefined): string {
  const parts = String(title || '').split(/[·|｜]/);
  if (parts.length < 2) return '';
  return codeFromTitle(parts.slice(1).join(' ')).replace(/-/g, '');
}

/** Words that describe the kind of entry rather than which one (spec 4.1). */
const GENERIC_EVENT_WORDS = new Set(['THE', 'A', 'AN', 'AWARD', 'AWARDS']);

/**
 * Event code out of a title: concatenated capitals, generic words dropped,
 * a trailing four-digit year shortened to two (spec 4.1).
 *
 *   "Affair Highlights"      + AFFAIR -> HIGHLIGHTS
 *   "Y Entertain Awards 2024"         -> YENTERTAIN24
 *   "Final Episode"                   -> FINALEPISODE
 *
 * `prefix` is the work / brand the title usually repeats; it is removed so the
 * code does not say the same thing twice.
 */
export function eventCodeFromTitle(
  title: string | null | undefined,
  prefix?: string | null
): string {
  const words = codeFromTitle(title).split('-').filter(Boolean);
  let rest = words.filter((word) => !GENERIC_EVENT_WORDS.has(word));
  const head = (prefix || '').replace(/-/g, '').toUpperCase();
  if (head && rest.length > 1 && rest[0] === head) rest = rest.slice(1);
  if (rest.length > 1 && /^\d{4}$/.test(rest[rest.length - 1])) {
    rest[rest.length - 1] = rest[rest.length - 1].slice(2);
  }
  return rest.join('');
}

/** BRAND subject: brand + campaign (spec 4.5). Campaign may be unknown. */
export function brandSubject(
  brandCode: string | null | undefined,
  campaignCode?: string | null
): string | null {
  const brand = (brandCode || '').trim().toUpperCase();
  if (!brand) return null;
  const campaign = (campaignCode || '').trim().toUpperCase();
  return campaign && campaign !== brand ? `${brand}-${campaign}` : brand;
}

/** TALK subject: shelf code + programme code (spec 4.6). */
export function talkSubject(
  category: string | null | undefined,
  programCode: string | null | undefined
): string | null {
  const shelf = TALK_SHELF_CODES[(category || '') as keyof typeof TALK_SHELF_CODES];
  if (!shelf) return null;
  const program = (programCode || '').trim().toUpperCase();
  return program ? `${shelf}-${program}` : shelf;
}

/** LIVE subject: the platform, which may be unknown (spec 4.7). */
export function liveSubject(platform: string | null | undefined): string | null {
  const value = (platform || '').trim().toUpperCase();
  return value || null;
}

/** FEAT subject: the topic code, and no date segment ever (spec 4.9). */
export function featSubject(topicCode: string | null | undefined): string | null {
  const topic = (topicCode || '').trim().toUpperCase();
  return topic || null;
}

/**
 * The door a project belongs to, which is not always its category.
 *
 * A theme is stored under `early_archive` because there is no `features`
 * category, and the category list is a database constraint we do not want to
 * widen just to hold one project kind. Reading `project_kind` first keeps the
 * door correct: a theme's pictures are FEAT, not EARLY (spec 4.9).
 */
export function doorCodeForProject(project: {
  category?: string | null;
  project_kind?: string | null;
}): DoorCode | null {
  if (project.project_kind === 'theme') return 'FEAT';
  return CATEGORY_TO_DOOR_CODE[project.category || ''] ?? null;
}

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
 * LMSY-EVENT-FANMEET-BKK). Full asset ids go through parseCatalogId instead.
 *
 * Note that EVENT and APPEAR event numbers also carry the date, and a
 * single-person event carries a `-LM` / `-SY` tail; use subjectFromProjectId
 * to get the bare subject for those two.
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

/**
 * SUBJECT segment of an event number, for any door.
 *
 * EVENT / APPEAR event numbers end with the date (and, for a single-person
 * event, a `-LM` / `-SY` tail). Feeding either back as an asset subject would
 * write the date twice - `LMSY-EVENT-FANMEET-BKK-20250115-20250115-001` - so
 * both are stripped here rather than at every call site. Every other door
 * carries only the person tail, which comes off the same way.
 */
export function subjectFromProjectId(head: string | null | undefined): string | null {
  const subject = parseCatalogHead(head);
  if (!subject) return null;
  const door = String(head).split('-')[1];
  let bare = subject;
  if (door === 'EVENT' || door === 'APPEAR') {
    bare = bare.replace(/-\d{8}(?:-(?:LM|SY))?$/, '');
  }
  bare = bare.replace(/-(?:LM|SY)$/, '');
  return bare || null;
}

/** Tail code of an event number: 'LM' / 'SY', or 'LMSY' when it has none. */
export function personFromProjectId(head: string | null | undefined): PersonCode {
  const parts = String(head || '').split('-');
  if (parts.length > 2) {
    const last = parts[parts.length - 1];
    if (last === 'LM' || last === 'SY') return last;
  }
  return 'LMSY';
}

/** `YYYY-MM-DD` -> `YYYYMMDD`, or '' when the value is not a plain date. */
function compactDate(dateString: string | null | undefined): string {
  const value = (dateString || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replace(/-/g, '') : '';
}

/**
 * Event number (`projects.catalog_id`) for a project.
 *
 * EVENT / APPEAR carry the date because their subject is type + city, which is
 * not unique: fifteen Bangkok award nights would all be `APPEAR-AWARDS-BKK`.
 * The person tail always comes LAST, after the date, so personFromProjectId
 * reads it the same way for every door:
 *
 *   LMSY-EVENT-FANMEET-WUH-20251129-LM      (event, single person)
 *   LMSY-MAG-OAT-LM                          (magazine, single person)
 *   LMSY-EVENT-FANMEET-BKK-20250115          (event, duo - no tail)
 */
export function buildProjectCatalogId(
  doorCode: string,
  subject: string,
  eventDate: string | null | undefined,
  person?: string | null
): string | null {
  const tail = personTail(person);
  if (doorCode === 'EVENT' || doorCode === 'APPEAR') {
    const date = compactDate(eventDate);
    return date ? `${SITE_PREFIX}-${doorCode}-${subject}-${date}${tail}` : null;
  }
  return `${SITE_PREFIX}-${doorCode}-${subject}${tail}`;
}

/**
 * Canonical event number for a row that already has one.
 *
 * Two container rows predate the site prefix (`DRAMA-AFFAIR-STILL`,
 * `EARLY-MILESTONES`) while the pictures filed under them already start with
 * LMSY. Prepending it keeps a new batch in the same series instead of starting
 * a second, differently prefixed one. Returns null when the value is not an
 * event number at all, so callers can fall back to building one.
 */
export function normalizeEventNumber(head: string | null | undefined): string | null {
  const value = (head || '').trim();
  if (!value) return null;
  if (value.startsWith(`${SITE_PREFIX}-`)) return value;
  const first = value.split('-')[0];
  return (DOOR_CODES as readonly string[]).includes(first) ? `${SITE_PREFIX}-${value}` : null;
}

/**
 * Asset id prefix: the event number, plus the date when the number does not
 * already carry one.
 *
 * An asset id is "which event, then which picture in it", so the only thing
 * added to an event number is the date it lacks. EVENT / APPEAR have it inside;
 * FEAT omits the date on purpose (a topic is a long-lived set whose pictures
 * join over the years, so no single date can be pinned to it).
 *
 *   LMSY-EVENT-FANMEET-WUH-20251129-LM      -> + 001
 *   LMSY-MAG-OAT-LM          + 20241211     -> + 001
 *   LMSY-FEAT-BACKVIEW                      -> + 001
 */
export function assetIdPrefixFor(
  eventNumber: string,
  doorCode: string,
  eventDate: string | null | undefined
): string {
  if (doorCode === 'EVENT' || doorCode === 'APPEAR' || doorCode === 'FEAT') return eventNumber;
  const date = compactDate(eventDate);
  return date ? `${eventNumber}-${date}` : eventNumber;
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

/**
 * Highest existing sequence + 1 for a given prefix, starting at 001.
 * Not atomic by itself - the unique index on gallery_assets.catalog_id is the
 * final authority; callers must treat a 23505 conflict as retryable.
 *
 * `person` is the leading segment and stays LMSY: a single-person event puts
 * its `-LM` / `-SY` inside the subject instead (see personTail), so both
 * batches of one event share a prefix and one running sequence.
 *
 * Pass `head` when the prefix is already known (the promote path derives it
 * from the event number, tail and date order included); the other options only
 * exist so older call sites can keep composing it inline.
 */
export async function allocateNextCatalogId(
  supabase: CatalogIdClient,
  doorCode: string,
  eventDate: string | null,
  options: { person?: PersonCode; subject?: string; tableName?: string; head?: string } = {}
): Promise<string> {
  const person = options.person ?? 'LMSY';
  const subject = options.subject;
  const tableName = options.tableName ?? 'gallery_assets';
  // A FEAT topic carries no date by design (spec 4.9), so the date can be
  // absent here - formatting a null date threw and turned the whole preview
  // into a 500. The date segment is simply left out when there is none.
  const compacted = eventDate ? formatDateToCompact(eventDate) : null;
  const withDate = (base: string) => (compacted ? `${base}-${compacted}` : base);

  const head =
    options.head ??
    (subject
      ? withDate(`${person}-${doorCode}-${subject}`)
      : withDate(`${person}-${doorCode}`));

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
