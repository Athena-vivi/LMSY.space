'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';
import { getImageDimensions } from '@/lib/image-dimensions';
import type { DoorAssetRow, DoorCategoryRow, DoorEntryRow } from '@/lib/door-data';

/**
 * Views shared by the four doors that own a page (homepage entries 2-5).
 *
 * Same three levels as door 1, and the same rule: a picture first, a line of
 * text second. An entry with no photograph keeps its frame and says so - a
 * missing card would read as "this never happened".
 *
 * Door 1 keeps its own components inside /dramas because it adds a fourth
 * level (six groups inside one series). These four doors are one level
 * shorter, so they share these.
 */

function yearOf(entry: { event_date: string | null; release_date: string | null }): string | null {
  return entry.event_date?.slice(0, 4) ?? entry.release_date?.slice(0, 4) ?? null;
}

/* -------------------------------------------------------------------------
 * Level 1 - the door: one picture card per sub-class
 * ---------------------------------------------------------------------- */

export interface DoorCategoryCard extends DoorCategoryRow {}

export function DoorCategoriesPage({
  titleKey,
  descriptionKey,
  cards,
  total,
}: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  cards: DoorCategoryCard[];
  total: number;
}) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, titleKey)}
        description={t(language, descriptionKey)}
        meta={
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
            {t(language, 'dramas.eventCount', { count: total })}
          </p>
        }
      />

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {cards.map((card, index) => (
              <CategoryCard key={card.key} card={card} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ card, index }: { card: DoorCategoryCard; index: number }) {
  const { language } = useLanguage();
  const cover = card.cover ? getImageUrl(card.cover) : null;
  const label = card.labelKey ? t(language, card.labelKey) : t(language, 'door.unfiled');
  const year = card.latestDate?.slice(0, 4) ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.1, 0.4) }}
      className="group relative"
    >
      <Link href={card.href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card/40">
          {cover ? (
            <Image
              src={cover}
              alt={label}
              fill
              unoptimized
              priority={index < 3}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-[900ms] group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/15 via-card to-lmsy-blue/15" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95" />

          {!cover && (
            <div className="absolute right-4 top-4">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur">
                {t(language, 'home.collecting')}
              </span>
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-7">
            <h2 className="font-serif text-2xl font-bold leading-tight text-ink md:text-3xl">
              {label}
            </h2>

            <p className="mb-4 mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/70">
              {year ?? '—'}
              <span className="mx-2">·</span>
              {t(language, 'dramas.eventCount', { count: card.count })}
            </p>

            <div className="flex items-center gap-2 text-ink transition-transform duration-300 group-hover:translate-x-1">
              <span className="text-xs uppercase tracking-[0.2em] md:text-sm">
                {t(language, 'door.viewCategory')}
              </span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
 * Level 2 - one sub-class: the entries filed under it
 * ---------------------------------------------------------------------- */

export function DoorEntriesPage({
  titleKey,
  doorTitleKey,
  doorHref,
  entries,
  intro,
}: {
  /** Already localised by the page from the sub-class definition. */
  titleKey: TranslationKey | null;
  doorTitleKey: TranslationKey;
  doorHref: string;
  entries: DoorEntryRow[];
  /** Optional one-line description under the title. */
  intro?: string | null;
}) {
  const { language } = useLanguage();
  const title = titleKey ? t(language, titleKey) : t(language, 'door.unfiled');

  return (
    <div className="min-h-screen">
      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={doorHref}
            className="mb-8 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-lmsy-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(language, doorTitleKey)}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
              {t(language, 'dramas.eventCount', { count: entries.length })}
            </p>
            {intro ? <p className="mt-5 max-w-2xl text-lg text-ink-2">{intro}</p> : null}
          </motion.div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {entries.map((entry, index) => (
                <EntryCard key={entry.id} entry={entry} index={index} />
              ))}
            </div>
          ) : (
            <EmptyShelf />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyShelf() {
  const { language } = useLanguage();
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-24 text-center">
      <p className="font-serif text-xl text-ink">{t(language, 'home.collecting')}</p>
      <p className="mt-3 text-sm text-ink-2">{t(language, 'project.emptyDesc')}</p>
    </div>
  );
}

function EntryCard({ entry, index }: { entry: DoorEntryRow; index: number }) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const cover = entry.cover_url ? getImageUrl(entry.cover_url) : null;
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language, {
    month: 'short',
    day: true,
  });
  const isVideo = entry.project_kind === 'video' || Boolean(entry.watch_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3) }}
      className="group"
    >
      <Link href={entry.href} className="block">
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border bg-card/40">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-lmsy-yellow/[0.07] via-card/60 to-lmsy-blue/[0.07]">
              <span className="rounded-full border border-border/70 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-2">
                {t(language, 'drama.noImages')}
              </span>
              {dateLabel ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/80">
                  {dateLabel}
                </span>
              ) : null}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/75">
              {dateLabel ?? '—'}
              {isVideo ? (
                <>
                  <span className="mx-2">·</span>
                  {t(language, 'door.video')}
                </>
              ) : entry.imageCount > 0 ? (
                <>
                  <span className="mx-2">·</span>
                  {t(language, 'drama.eventImages', { count: entry.imageCount })}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <h2 className="mt-3 font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-lmsy-blue md:text-xl">
          {title}
        </h2>
      </Link>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
 * Level 1 without a second level - a hall whose rows are the entries
 * (brand collaborations). Layout follows /projects: a portrait frame and its
 * text, side alternating.
 * ---------------------------------------------------------------------- */

export function DoorIndexPage({
  titleKey,
  descriptionKey,
  entries,
}: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  entries: DoorEntryRow[];
}) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, titleKey)}
        description={t(language, descriptionKey)}
        meta={
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
            {t(language, 'dramas.eventCount', { count: entries.length })}
          </p>
        }
      />

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {entries.length > 0 ? (
            <div className="space-y-10 md:space-y-14">
              {entries.map((entry, index) => (
                <IndexRow key={entry.id} entry={entry} index={index} />
              ))}
            </div>
          ) : (
            <EmptyShelf />
          )}
        </div>
      </section>
    </div>
  );
}

function IndexRow({ entry, index }: { entry: DoorEntryRow; index: number }) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const description = getLocalizedText(entry.description_i18n, language, entry.description);
  const cover = entry.cover_url ? getImageUrl(entry.cover_url) : null;
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language);
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="group overflow-hidden rounded-2xl border border-border bg-card/40"
    >
      <Link href={entry.href} className="block">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div
            className={`relative aspect-[4/5] overflow-hidden ${
              isEven ? 'md:order-1' : 'md:order-2'
            }`}
          >
            {cover ? (
              <Image
                src={cover}
                alt={title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-[50%_38%] transition-transform duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-lmsy-yellow/10 via-card to-lmsy-blue/10">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                  {t(language, 'drama.noImages')}
                </span>
              </div>
            )}
          </div>

          <div
            className={`flex flex-col justify-center p-6 md:p-10 ${
              isEven ? 'md:order-2' : 'md:order-1'
            }`}
          >
            {dateLabel ? (
              <time className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-ink-2">
                {dateLabel}
              </time>
            ) : null}

            <h2 className="font-serif text-2xl font-bold leading-tight text-ink md:text-3xl">
              {title}
            </h2>

            {description ? (
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2 line-clamp-4 md:text-base">
                {description}
              </p>
            ) : null}

            <div className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-lmsy-blue">
              {entry.imageCount > 0
                ? t(language, 'projects.photoCount', { count: entry.imageCount })
                : t(language, 'home.explore')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
 * Level 3 - one entry: the picture wall
 * ---------------------------------------------------------------------- */

export function DoorEntryPage({
  entry,
  assets,
  doorTitleKey,
  doorHref,
  shelfTitleKey,
  shelfHref,
}: {
  entry: DoorEntryRow;
  assets: DoorAssetRow[];
  doorTitleKey: TranslationKey;
  doorHref: string;
  shelfTitleKey: TranslationKey | null;
  shelfHref: string | null;
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const description = getLocalizedText(entry.description_i18n, language, entry.description);
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language, {
    month: 'long',
    day: true,
  });
  const isVideo = entry.project_kind === 'video' || Boolean(entry.watch_url);

  return (
    <div className="min-h-screen">
      <section className="pt-10 md:pt-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
            <Link
              href={doorHref}
              className="inline-flex items-center gap-2 transition-colors hover:text-lmsy-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              {t(language, doorTitleKey)}
            </Link>
            {shelfHref && shelfTitleKey ? (
              <>
                <span className="text-ink-2/40">/</span>
                <Link href={shelfHref} className="transition-colors hover:text-lmsy-blue">
                  {t(language, shelfTitleKey)}
                </Link>
              </>
            ) : null}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
              {dateLabel ?? '—'}
            </p>

            <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {title}
            </h1>

            {description ? (
              <p className="mt-5 max-w-2xl text-lg text-ink-2">{description}</p>
            ) : null}

            {isVideo ? (
              entry.watch_url ? (
                <div className="mt-6">
                  <a
                    href={entry.watch_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-lmsy-blue/40 bg-lmsy-blue/[0.08] px-5 py-2.5 text-sm text-lmsy-blue transition-colors hover:border-lmsy-blue hover:bg-lmsy-blue/[0.14]"
                  >
                    {t(language, 'drama.watchExternal')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="mt-3 max-w-xl font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                    {t(language, 'drama.watchNote')}
                  </p>
                </div>
              ) : (
                <p className="mt-6 inline-flex rounded-full border border-dashed border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                  {t(language, 'drama.linkPending')}
                </p>
              )
            ) : null}
          </motion.div>
        </div>
      </section>

      <section className="pt-12 pb-24 md:pt-16 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-baseline gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
              {t(language, 'drama.eventImages', { count: assets.length })}
            </span>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          {assets.length > 0 ? (
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
              {assets.map((asset, index) => (
                <WallImage key={asset.id} asset={asset} index={index} />
              ))}
            </div>
          ) : (
            <EmptyWall />
          )}
        </div>
      </section>
    </div>
  );
}

function WallImage({ asset, index }: { asset: DoorAssetRow; index: number }) {
  const imageUrl = getImageUrl(asset.image_url);
  const dimensions = getImageDimensions(asset.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3) }}
      className="mb-4 break-inside-avoid"
    >
      <Link href={`/gallery#${asset.id}`} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl || ''}
            alt={asset.caption || `Image ${index + 1}`}
            width={dimensions?.width ?? 1200}
            height={dimensions?.height ?? 1600}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
            placeholder="empty"
          />
          {asset.catalog_id ? (
            <div className="absolute bottom-2 right-2 opacity-70 transition-opacity group-hover:opacity-100">
              <span className="rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-lmsy-yellow/80 backdrop-blur-sm">
                {asset.catalog_id}
              </span>
            </div>
          ) : null}
        </div>
        {asset.caption ? (
          <p className="mt-2 text-sm text-ink-2 line-clamp-2">{asset.caption}</p>
        ) : null}
      </Link>
    </motion.div>
  );
}

/**
 * The frames this entry will fill. One placard instead of a row of grey boxes:
 * it reads as "this exhibit is still being hung", which is what it is.
 */
function EmptyWall() {
  const { language } = useLanguage();
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-24 text-center">
      <p className="font-serif text-xl text-ink">{t(language, 'drama.noImages')}</p>
      <p className="mt-3 text-sm text-ink-2">{t(language, 'project.emptyDesc')}</p>
    </div>
  );
}
