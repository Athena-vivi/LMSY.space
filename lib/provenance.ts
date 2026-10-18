/**
 * Provenance and date-semantics helpers (phase 3 batch 1).
 *
 * Pure functions only so the rules are unit-testable without a database.
 *
 * SEMANTICS (agreed with the site owner, 2026-10-16):
 *  - event_date      = when the depicted event actually happened. May be NULL;
 *                      NULL means "unknown", never "same as publish date".
 *  - raw_event_date  = the date string exactly as the original source stated
 *                      it (evidence). For telegram messages this is the
 *                      message send time, which is collection evidence, NOT
 *                      an event date.
 *  - source_url      = URL of the telegram post / original page. For telegram
 *                      forwards this identifies the TELEGRAM MESSAGE, which is
 *                      not necessarily the original content page; a forwarded
 *                      caption containing the true origin must be reviewed by
 *                      a human, never auto-promoted.
 */

export interface DraftProvenance {
  source_url: string | null;
  source_platform: string | null;
  source_account: string | null;
}

/**
 * Normalize provenance values coming from a draft row before they are written
 * into gallery_assets. Empty/whitespace-only values become NULL so the
 * "source unknown" state is represented consistently.
 */
export function buildProvenanceFields(
  draft: {
    source_url?: string | null;
    source_platform?: string | null;
    source_account?: string | null;
  } | null | undefined
): DraftProvenance {
  const url = draft?.source_url?.trim();
  const platform = draft?.source_platform?.trim();
  const account = draft?.source_account?.trim();
  return {
    source_url: url ? url : null,
    source_platform: platform ? platform : null,
    source_account: account ? account : null,
  };
}

/**
 * Date fields for a telegram message.
 *
 * The message send time is stored ONLY as raw_event_date (evidence of when
 * the message was posted). event_date stays NULL unless a human curator
 * confirms the real event date during review - the send time must never
 * impersonate the event date.
 */
export function deriveTelegramDraftDates(messageDate: Date): {
  event_date: null;
  raw_event_date: string;
} {
  return {
    event_date: null,
    raw_event_date: messageDate.toISOString(),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date fields for a generic ingest request (phase 6 batch 4).
 *
 * The bug this prevents: a collector that only knows "now" sent today's date
 * as event_date, so 35/35 weibo drafts were dated on their collection day and
 * one batch of 9 images reached the public chronicle as a 2026 event.
 *
 * Rule - no extra work for callers that supply a real date:
 *  - both fields present  -> event_date is a claim, raw_event_date is evidence
 *  - only a PAST date     -> accepted as the event date, copied to raw as well
 *  - only TODAY's date    -> that is the caller's clock, not an event; it goes
 *                            to raw_event_date and event_date stays NULL until
 *                            a curator confirms the real date
 *  - nothing              -> both NULL, needs curation
 */
export function deriveIngestDraftDates(input: {
  eventDate?: string | null;
  rawEventDate?: string | null;
  /** YYYY-MM-DD, defaults to the current UTC date. Injectable for tests. */
  today?: string;
}): {
  event_date: string | null;
  raw_event_date: string | null;
  date_needs_curation: boolean;
} {
  const event = typeof input.eventDate === 'string' ? input.eventDate.trim() : '';
  const raw = typeof input.rawEventDate === 'string' ? input.rawEventDate.trim() : '';
  const today = input.today || new Date().toISOString().split('T')[0];
  const validEvent = ISO_DATE.test(event) ? event : null;

  if (raw) {
    return {
      event_date: validEvent,
      raw_event_date: raw,
      date_needs_curation: validEvent === null,
    };
  }

  if (validEvent && validEvent !== today) {
    return {
      event_date: validEvent,
      raw_event_date: validEvent,
      date_needs_curation: false,
    };
  }

  if (validEvent) {
    // Exactly the collection day with no source timestamp: clock value only.
    return {
      event_date: null,
      raw_event_date: validEvent,
      date_needs_curation: true,
    };
  }

  return {
    event_date: null,
    raw_event_date: event ? event : null,
    date_needs_curation: true,
  };
}
