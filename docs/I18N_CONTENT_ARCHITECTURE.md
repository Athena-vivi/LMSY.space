# LMSY Multilingual Content Architecture

## Goal

Split multilingual text into two clear layers:

- `i18n` for UI shell text
- database content blocks / multilingual fields for editorial content

This avoids mixing site copy, archive content, and UI labels in `lib/languages.ts`.

## Final Rule

### Keep in `lib/languages.ts`

Use `i18n` for stable interface text only:

- navigation
- buttons
- tabs
- status text
- empty states
- filter labels
- fixed UI labels

Examples:

- `nav.*`
- `gallery.title`
- `projects.title`
- `schedule.title`
- `hero.scroll`
- `hero.subtitle`

### Keep in database

Use database-backed multilingual content for anything editorial, curated, or operator-managed:

- project titles and descriptions
- editorial titles and homepage featured copy
- chronicle title/excerpt overrides
- gallery asset title/caption/excerpt
- homepage curated blocks

## Implemented Data Sources

### `projects`

Multilingual fields:

- `title_i18n`
- `description_i18n`
- `theme_statement_i18n`
- `homepage_excerpt_i18n`

Used by:

- `/projects`
- `/projects/[id]`
- `/editorial`
- `/editorial/[id]`
- homepage featured editorial entry

### `gallery_assets`

Multilingual fields:

- `title_i18n`
- `caption_i18n`
- `excerpt_i18n`

Used by:

- `/gallery`
- `Asset Vault -> All Assets`
- project asset display
- editorial asset display

### `draft_items`

Multilingual content:

- `title`
- `description`
- `chronicle_title_i18n`
- `chronicle_excerpt_i18n`

Used by:

- `/chronicle`
- `Asset Vault -> Chronicle`
- draft editing

### `site_content_blocks`

Homepage content blocks currently in use:

- `homepage_hero`
- `homepage_preface`
- `homepage_longform`
- `homepage_milestones`

Managed in:

- `/admin/settings`

## Homepage Ownership

### `homepage_hero`

Controls:

- hero preface
- hero universe title
- hero universe subtitle

### `homepage_preface`

Controls:

- Museum Preface block

### `homepage_longform`

Controls:

- Featured Interview outer copy
- fallback title
- fallback excerpt
- source
- read more label

### `homepage_milestones`

Controls:

- section title
- year labels for `2022 / 2023 / 2024 / 2025 / ongoing`
- bottom note

## Reading Strategy

All content readers should follow this order:

1. localized DB field for current language
2. localized DB field fallback to `en`
3. legacy scalar field
4. empty string or explicit default content block fallback

Shared helper:

- `lib/localized-content.ts`

## Current Settings Coverage

`/admin/settings` currently manages:

- Homepage Hero
- Homepage Preface
- Homepage Longform
- Homepage Milestones

## What Was Removed From `languages.ts`

These homepage content keys were intentionally removed from `lib/languages.ts`:

- `hero.preface`
- `hero.universeTitle`
- `hero.universeSubtitle`
- `longform.title`
- `longform.subtitle`
- `longform.excerpt`
- `longform.source`
- `longform.readMore`
- `chronicle.2022`
- `chronicle.2023`
- `chronicle.2024`
- `chronicle.2025`
- `chronicle.ongoing`

This prevents content from drifting back into UI translations.

## Remaining UI Text Still in `languages.ts`

These are still correctly treated as UI shell text:

- `hero.subtitle`
- `hero.scroll`
- `hero.portalsTitle`
- `hero.portalsSubtitle`
- `portal.*`
- `editorial.title`
- page titles / descriptions for sections like gallery, projects, schedule

## Remaining Work

### High priority

- improve admin multilingual editing UX
- clean up old malformed encoding text in older translation entries
- verify all public pages consistently use localized DB fields before scalar fallbacks

### Medium priority

- decide whether `projects.description`, `gallery.description`, and similar section shell copy should stay in `i18n` or move into `site_content_blocks`
- add a dedicated editorial/site-content audit page later if needed

## Practical Editing Rule

When changing homepage narrative copy:

- do not edit `lib/languages.ts`
- edit `/admin/settings`

When changing project/editorial/archive content:

- edit the corresponding backend content form
- store in DB multilingual fields

When changing buttons, tabs, navigation, and fixed labels:

- edit `lib/languages.ts`
