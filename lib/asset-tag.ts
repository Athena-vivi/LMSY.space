/**
 * Resolve the gallery_assets.tag value for an image promoted from draft_items.
 *
 * ADR-001 D3: the four classification concepts are distinct —
 *   projects.category       -> work category
 *   gallery_assets.tag      -> image classification
 *   gallery_assets.category_tag -> image usage sub-category
 *   source_*                -> provenance
 *
 * draft_items.tags stores source-channel words collected at ingest time
 * (platform names like "Telegram", raw hashtag text). Copying tags[0] into
 * the formal tag column leaked channel names into the content
 * classification (real data contained tag='Telegram' x3). Until the
 * webmaster ratifies the tag enum (pending product decision), promoted
 * assets keep tag NULL — the schema allows it and 15 existing rows already
 * use it. This function deliberately ignores its input; it exists so the
 * call site documents intent and unit tests can lock the behaviour in.
 */
export function resolveAssetTagFromDraft(draftTags: unknown): string | null {
  // The array guard is kept deliberately: once the webmaster ratifies the
  // tag enum, classification values will be matched against draft tags here.
  // For now ANY input — including source-channel words — resolves to no
  // classification (NULL), never a guess.
  if (Array.isArray(draftTags) && draftTags.length > 0) {
    return null;
  }
  return null;
}
