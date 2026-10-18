'use client';

import { motion } from 'framer-motion';

/**
 * Shared page intro for the archive surfaces (phase-6 batch 1).
 *
 * /projects and /gallery carried byte-identical header blocks (motion wrapper,
 * container padding, 5xl→7xl serif title, muted description) while /editorial
 * and /chronicle use their own deliberate layouts. Extracting only the shared
 * part keeps the two list pages from drifting apart on spacing and type scale
 * without forcing the magazine or the timeline into the same template.
 *
 * Note: these pages intentionally keep distinct content structures - this is
 * the title block only.
 *
 * The hub logo that used to sit above the title was removed: every page now
 * carries the global header, so a second return entry point only pushed the
 * title further down. Top padding is trimmed to match.
 */
interface PageIntroProps {
  title: string;
  description?: string;
  /** Optional slot rendered under the description (e.g. a live count). */
  meta?: React.ReactNode;
}

export function PageIntro({ title, description, meta }: PageIntroProps) {
  return (
    <section className="pt-14 pb-10 md:pt-20 md:pb-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="mb-6 font-serif text-5xl font-bold tracking-tight text-ink md:text-6xl lg:text-7xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-lg text-ink-2">{description}</p>
          )}
          {meta && <div className="mt-4">{meta}</div>}
        </motion.div>
      </div>
    </section>
  );
}
