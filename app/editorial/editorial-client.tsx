'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText } from '@/lib/localized-content';
import { titlePlateLabel } from '@/lib/editorial-meta';
import type { EditorialIssue } from '@/lib/editorial-issues';

/**
 * /editorial - door 2, restored to the rack it always was.
 *
 * Covers, catalog plates, one shelf per issue. The list is now rendered on the
 * server (the page passes it in) instead of being fetched after paint: the
 * door has to be readable by a crawler for the issues under it to be found.
 * Hover still tints the background per subject - that is only decoration.
 */

interface NebulaColors {
  primary: string;
  secondary: string;
}

const magazineThemes: Record<string, NebulaColors> = {
  lookmhee: {
    primary: 'rgba(245, 158, 11, 0.12)',
    secondary: 'rgba(251, 191, 36, 0.08)',
  },
  sonya: {
    primary: 'rgba(59, 130, 246, 0.12)',
    secondary: 'rgba(56, 189, 248, 0.08)',
  },
  both: {
    primary: 'rgba(139, 92, 246, 0.12)',
    secondary: 'rgba(167, 139, 250, 0.08)',
  },
  default: {
    primary: 'rgba(251, 191, 36, 0.08)',
    secondary: 'rgba(56, 189, 248, 0.06)',
  },
};

function themeOf(issue: EditorialIssue): NebulaColors {
  const title = issue.title.toLowerCase();
  const desc = issue.description?.toLowerCase() || '';

  if (title.includes('lookmhee') || desc.includes('lookmhee')) return magazineThemes.lookmhee;
  if (title.includes('sonya') || desc.includes('sonya')) return magazineThemes.sonya;
  if (title.includes('both') || title.includes('together')) return magazineThemes.both;
  return magazineThemes.default;
}

/**
 * Copy namespace per door. /editorial and /features render the same rack;
 * only the words and the link base differ.
 */
type RackNamespace = 'editorial' | 'features';

const RACK_KEYS: Record<RackNamespace, {
  title: TranslationKey;
  subtitle: TranslationKey;
  viewIssue: TranslationKey;
  artifacts: TranslationKey;
  noCover: TranslationKey;
  emptyTitle: TranslationKey;
  emptyDesc: TranslationKey;
  issueCount: TranslationKey;
}> = {
  editorial: {
    title: 'editorial.title',
    subtitle: 'editorial.subtitle',
    viewIssue: 'editorial.viewIssue',
    artifacts: 'editorial.artifacts',
    noCover: 'editorial.noCover',
    emptyTitle: 'editorial.emptyTitle',
    emptyDesc: 'editorial.emptyDesc',
    issueCount: 'editorial.issueCount',
  },
  features: {
    title: 'features.title',
    subtitle: 'features.subtitle',
    viewIssue: 'features.viewIssue',
    artifacts: 'features.artifacts',
    noCover: 'features.noCover',
    emptyTitle: 'features.emptyTitle',
    emptyDesc: 'features.emptyDesc',
    issueCount: 'features.issueCount',
  },
};

export function EditorialClient({
  issues,
  ns = 'editorial',
  basePath = '/editorial',
}: {
  issues: EditorialIssue[];
  ns?: RackNamespace;
  basePath?: string;
}) {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState<string | null>(null);
  const keys = RACK_KEYS[ns];

  const hoveredEntry = hovered ? issues.find((issue) => issue.id === hovered) : undefined;
  const theme = hoveredEntry ? themeOf(hoveredEntry) : magazineThemes.default;

  return (
    <div className="min-h-screen bg-background transition-colors duration-1000">
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        animate={{
          background: hovered
            ? `radial-gradient(ellipse at 50% 50%, ${theme.primary} 0%, ${theme.secondary} 40%, transparent 70%)`
            : 'radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, 0.05) 0%, rgba(56, 189, 248, 0.03) 40%, transparent 70%)',
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      <header className="relative z-10 px-6 pb-8 pt-10 md:px-12 md:pb-12 md:pt-14">
        <div className="mx-auto flex max-w-7xl items-start justify-end">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-right"
          >
            <h1 className="mb-2 font-serif text-4xl font-bold md:text-5xl">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, keys.title)}
              </span>
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-2">
              {t(language, keys.subtitle)}
            </p>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            {issues.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 text-center"
              >
                <p className="font-serif text-xl text-ink-2">
                  {t(language, keys.emptyTitle)}
                </p>
                <p className="mt-3 text-sm text-ink-2/70">
                  {t(language, keys.emptyDesc)}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="issues"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:grid-cols-4"
              >
                {issues.map((issue, index) => (
                  <IssueSlot
                    key={issue.id}
                    issue={issue}
                    index={index}
                    onHover={setHovered}
                    keys={keys}
                    basePath={basePath}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border px-6 py-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
            LMSY.SPACE · {t(language, keys.issueCount, { count: issues.length })}
          </p>
        </div>
      </footer>
    </div>
  );
}

function IssueSlot({
  issue,
  index,
  onHover,
  keys,
  basePath,
}: {
  issue: EditorialIssue;
  index: number;
  onHover: (id: string | null) => void;
  keys: (typeof RACK_KEYS)[RackNamespace];
  basePath: string;
}) {
  const { language } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

  const localizedTitle = getLocalizedText(issue.title_i18n, language, issue.title);
  // Stored covers may be a relative path (old rows) or an absolute CDN URL.
  const coverUrl = getImageUrl(issue.cover_url);
  const href = `${basePath}/${issue.slug || issue.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.4) }}
      onHoverStart={() => onHover(issue.id)}
      onHoverEnd={() => onHover(null)}
      className="group relative"
    >
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-lmsy-yellow/40" />
            <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-lmsy-blue/40" />
          </div>

          {coverUrl && !imageFailed ? (
            <Image
              src={coverUrl}
              alt={localizedTitle}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              placeholder="empty"
              unoptimized
              priority={index < 4}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center border border-white/10">
              <div className="relative mb-3">
                <div className="h-6 w-6 rotate-45 border border-white/20" />
                <div className="absolute inset-0 h-6 w-6 rotate-45 border border-white/10" />
              </div>
              <p className="px-4 text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-ink-2">
                {t(language, keys.noCover)}
              </p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="absolute right-3 top-3 rounded border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
              {issue.artifact_count} {t(language, keys.artifacts)}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-4 text-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
              {t(language, keys.viewIssue)} →
            </span>
          </div>
        </div>

        {issue.catalog_id ? (
          <div className="absolute -left-3 -top-3 rounded border border-white/10 bg-black/80 px-2 py-1 backdrop-blur-sm">
            <span className="font-mono text-[11px] tracking-wider text-lmsy-yellow/80">
              #{issue.catalog_id}
            </span>
          </div>
        ) : null}

        <div className="absolute -bottom-3 -right-3 rounded border border-white/10 bg-black/80 px-3 py-1.5 backdrop-blur-sm">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-2">
            {titlePlateLabel(localizedTitle)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
