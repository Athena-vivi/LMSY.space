'use client';

import { motion } from 'framer-motion';
import { LocalizedLink as Link } from '@/components/localized-link';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/image-url';
import { HOME_CATEGORIES, categoryHref, type ProjectCategory } from '@/lib/category-registry';

interface PortalCover {
  imageUrl: string | null;
  blurData: string | null;
}

interface PortalEntry {
  value: ProjectCategory;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  gradient: string;
  /** Asymmetric 12-column spans, tuned for exactly five cards. */
  span: string;
  /** Copy for the entry, keyed per category. */
  image: PortalCover | null;
  count: number;
}

/**
 * Category-specific copy. The registry owns the label and the gradient; only
 * the one-line description belongs here because it is homepage voice, not a
 * category name.
 */
const ENTRY_COPY: Record<
  ProjectCategory,
  { titleKey: TranslationKey; descKey: TranslationKey; span: string }
> = {
  drama_work: { titleKey: 'portal.drama', descKey: 'portal.dramaDesc', span: 'lg:col-span-7' },
  editorial: { titleKey: 'portal.editorial', descKey: 'portal.editorialDesc', span: 'lg:col-span-5' },
  live_event: { titleKey: 'portal.live', descKey: 'portal.liveDesc', span: 'lg:col-span-4' },
  public_appearance: { titleKey: 'portal.appearance', descKey: 'portal.appearanceDesc', span: 'lg:col-span-3' },
  commercial: { titleKey: 'portal.commercial', descKey: 'portal.commercialDesc', span: 'lg:col-span-5' },
  // Not homepage entries today. They are listed so the record is total over
  // the registry type. The three below are reachable from /projects; the four
  // soul-resonance halls have their own doors and their own landing pages.
  interview: { titleKey: 'category.interview', descKey: 'category.interview', span: 'lg:col-span-6' },
  variety: { titleKey: 'category.variety', descKey: 'category.variety', span: 'lg:col-span-6' },
  radio: { titleKey: 'category.radio', descKey: 'category.radio', span: 'lg:col-span-6' },
  press: { titleKey: 'category.press', descKey: 'category.press', span: 'lg:col-span-6' },
  live_stream: { titleKey: 'category.liveStream', descKey: 'category.liveStream', span: 'lg:col-span-6' },
  behind_the_scenes: { titleKey: 'category.behindTheScenes', descKey: 'category.behindTheScenes', span: 'lg:col-span-6' },
  personal_travel: { titleKey: 'category.personalTravel', descKey: 'category.personalTravel', span: 'lg:col-span-6' },
  early_archive: { titleKey: 'category.earlyArchive', descKey: 'category.earlyArchive', span: 'lg:col-span-12' },
};

function PortalCard({ entry, index }: { entry: PortalEntry; index: number }) {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  // One shared treatment for every card. Size carries the hierarchy, so no
  // category gets its own accent colour.
  const titleGradient = 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)';
  const glowGradient =
    'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)';

  const imageUrl = entry.image?.imageUrl ? getImageUrl(entry.image.imageUrl) : null;
  const blurDataUrl = entry.image?.blurData || undefined;
  const isEmpty = !imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      {/* Every homepage entry owns a page of its own (2026-10-21); the card
          opens that page, not a filtered view of some shared index. */}
      <Link href={categoryHref(entry.value) ?? '/gallery'} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card/40">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={t(language, entry.titleKey)}
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoad={() => setImageLoaded(true)}
              unoptimized
              priority={index < 2}
              placeholder="blur"
              blurDataURL={
                blurDataUrl ||
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxYTFhMWEiLz48L3N2Zz4='
              }
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${entry.gradient} transition-transform duration-700 group-hover:scale-110`}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

          {/* A hall with nothing published yet still keeps its door; the badge
              says so instead of pretending the shelf is full. */}
          {isEmpty && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur">
                {t(language, 'home.collecting')}
              </span>
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <motion.h3
              className="font-serif text-3xl md:text-4xl font-bold text-ink mb-3"
              style={{
                background: titleGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t(language, entry.titleKey)}
            </motion.h3>

            <p className="text-ink text-base md:text-lg font-light leading-relaxed mb-4">
              {t(language, entry.descKey)}
            </p>

            <motion.div
              className="flex items-center gap-2 text-ink transition-colors"
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
            >
              <span className="text-xs tracking-[0.2em] uppercase md:text-sm">
                {t(language, 'home.explore')}
              </span>
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </div>

          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: glowGradient }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

export function PortalsSection() {
  const { language } = useLanguage();
  const [covers, setCovers] = useState<Record<string, PortalCover | null>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchPortals() {
      try {
        const response = await fetch('/api/home/portals');
        if (response.ok) {
          const data = await response.json();
          setCovers(data.covers ?? {});
          setCounts(data.counts ?? {});
        }
      } catch (error) {
        console.error('[PORTALS] Failed to fetch portal covers:', error);
      }
    }
    fetchPortals();
  }, []);

  // Always five entries, always in the same order. The list comes from the
  // registry; nothing here filters on whether a hall happens to be full.
  const entries: PortalEntry[] = HOME_CATEGORIES.map((definition) => ({
    value: definition.value,
    titleKey: ENTRY_COPY[definition.value].titleKey,
    descKey: ENTRY_COPY[definition.value].descKey,
    gradient: definition.gradient,
    span: ENTRY_COPY[definition.value].span,
    image: covers[definition.value] ?? null,
    count: counts[definition.value] ?? 0,
  }));

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {t(language, 'hero.portalsTitle')}
            </span>
          </h2>
          <p className="text-ink-2 text-lg md:text-xl font-light">
            {t(language, 'hero.portalsSubtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
          {entries.map((entry, index) => (
            <div key={entry.value} className={entry.span}>
              <PortalCard entry={entry} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
